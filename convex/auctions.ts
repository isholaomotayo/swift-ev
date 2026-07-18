import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, requireAuth, requireSeller } from "./lib/auth";
import { generateUniqueOrderNumber, calculateServiceFee } from "./lib/orders";
import {
  assertVehicleStatusTransition,
  canTransitionVehicleStatus,
  isVehicleStatus,
  type VehicleStatus,
} from "./lib/vehicleLifecycle";
import {
  calculateBidReserveAmountKobo,
  isPreAuctionBuyNowAvailable,
  resolveBuyNowPrice,
} from "./lib/purchaseFlow";
import {
  applyBidReserveAsDepositPayment,
  createInAppNotification,
  paymentDeadlineFrom,
} from "./lib/payments";
import { calculateBuyNowPricing } from "./lib/buyNowPricing";
import { internal } from "./_generated/api";

function vehicleStatusOf(status: string): VehicleStatus {
  if (!isVehicleStatus(status)) {
    throw new Error(`Unknown vehicle status: ${status}`);
  }
  return status;
}

async function requireAdminUser(ctx: any, token: string) {
  const user = await requireAuth(ctx, token);
  requireAdmin(user);
  return user;
}

/** Live = sequential (one lot at a time). Timed = concurrent (all lots active together). */
function isSequentialAuction(auction: Doc<"auctions">): boolean {
  return auction.auctionType === "live";
}

function isConcurrentAuction(auction: Doc<"auctions">): boolean {
  return auction.auctionType === "timed";
}

/** Sequential auctions auto-advance by default unless explicitly disabled. */
function shouldAutoAdvanceLots(auction: Doc<"auctions">): boolean {
  return isSequentialAuction(auction) && auction.autoAdvanceLots !== false;
}

type ActivateLotResult =
  | { ok: true; lotId: Id<"auctionLots"> }
  | { ok: false; lotId: Id<"auctionLots">; reason: string };

/**
 * Prepare a vehicle for auction activation. Returns a failure reason when the
 * vehicle cannot enter in_auction (sold, payment hold, missing, etc.).
 */
async function prepareVehicleForLotActivation(
  ctx: MutationCtx,
  vehicleId: Id<"vehicles">,
  now: number
): Promise<{ ok: true; status: VehicleStatus } | { ok: false; reason: string }> {
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) {
    return { ok: false, reason: "Vehicle not found" };
  }

  let status = vehicleStatusOf(vehicle.status);

  if (status === "in_auction") {
    return { ok: true, status };
  }

  if (
    status === "sold" ||
    status === "withdrawn" ||
    status === "cancelled" ||
    status === "delivered" ||
    status === "in_transit" ||
    status === "draft" ||
    status === "pending_approval" ||
    status === "pending_inspection" ||
    status === "rejected"
  ) {
    return { ok: false, reason: `Vehicle status is ${status}` };
  }

  if (status === "payment_pending") {
    return {
      ok: false,
      reason: "Vehicle has a pending payment hold",
    };
  }

  // Unsold / approved must pass through scheduled before going live.
  if (status === "unsold" || status === "approved") {
    if (!canTransitionVehicleStatus(status, "scheduled")) {
      return { ok: false, reason: `Cannot schedule vehicle from ${status}` };
    }
    await ctx.db.patch(vehicleId, {
      status: "scheduled",
      updatedAt: now,
    });
    status = "scheduled";
  }

  if (!canTransitionVehicleStatus(status, "in_auction")) {
    return {
      ok: false,
      reason: `Cannot move vehicle from ${status} to in_auction`,
    };
  }

  return { ok: true, status };
}

async function activateLot(
  ctx: MutationCtx,
  lot: Doc<"auctionLots">,
  now = Date.now()
): Promise<ActivateLotResult> {
  if (lot.status === "active") {
    return { ok: true, lotId: lot._id };
  }
  if (lot.status !== "pending") {
    return {
      ok: false,
      lotId: lot._id,
      reason: `Lot #${lot.lotOrder} is ${lot.status}, not pending`,
    };
  }

  const prepared = await prepareVehicleForLotActivation(ctx, lot.vehicleId, now);
  if (!prepared.ok) {
    return {
      ok: false,
      lotId: lot._id,
      reason: `Lot #${lot.lotOrder}: ${prepared.reason}`,
    };
  }

  const lotDuration = lot.lotDuration ?? 5 * 60 * 1000;
  const endsAt = now + lotDuration;
  await ctx.db.patch(lot._id, {
    status: "active",
    startsAt: now,
    endsAt,
    pausedRemainingMs: undefined,
  });

  await ctx.db.patch(lot.vehicleId, {
    status: "in_auction",
    updatedAt: now,
  });

  await ctx.scheduler.runAt(endsAt, internal.auctions.closeLotAt, {
    lotId: lot._id,
  });

  return { ok: true, lotId: lot._id };
}

/**
 * Mark a pending lot as passed when its vehicle cannot be activated so the
 * auction can continue to the next runnable lot.
 */
async function passUnrunnableLot(
  ctx: MutationCtx,
  lot: Doc<"auctionLots">,
  _reason: string
) {
  if (lot.status !== "pending") return;
  await ctx.db.patch(lot._id, { status: "passed" });
}

/**
 * Walk pending lots in order until one activates. Unrunnable lots are passed.
 * Returns null when nothing could be activated.
 */
async function activateNextRunnablePendingLot(
  ctx: MutationCtx,
  auctionId: Id<"auctions">,
  now = Date.now()
): Promise<{ lotId: Id<"auctionLots">; skipped: string[] } | null> {
  const pendingLots = await getPendingLots(ctx, auctionId);
  const skipped: string[] = [];

  for (const lot of pendingLots) {
    const result = await activateLot(ctx, lot, now);
    if (result.ok) {
      return { lotId: result.lotId, skipped };
    }
    skipped.push(result.reason);
    await passUnrunnableLot(ctx, lot, result.reason);
  }

  return null;
}

/**
 * After a sequential lot closes (sold or no sale), optionally activate the next
 * runnable pending lot. Returns true when a next lot was activated.
 */
async function maybeAutoAdvanceSequentialLot(
  ctx: MutationCtx,
  auction: Doc<"auctions">,
  now = Date.now()
): Promise<boolean> {
  if (!shouldAutoAdvanceLots(auction)) {
    return false;
  }
  const activated = await activateNextRunnablePendingLot(ctx, auction._id, now);
  return activated !== null;
}

async function getLotsForAuction(ctx: MutationCtx, auctionId: Id<"auctions">) {
  const lots = await ctx.db
    .query("auctionLots")
    .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
    .collect();
  return lots.sort((a, b) => a.lotOrder - b.lotOrder);
}

async function getActiveLots(ctx: MutationCtx, auctionId: Id<"auctions">) {
  const lots = await getLotsForAuction(ctx, auctionId);
  return lots.filter((l) => l.status === "active");
}

async function getPendingLots(ctx: MutationCtx, auctionId: Id<"auctions">) {
  const lots = await getLotsForAuction(ctx, auctionId);
  return lots.filter((l) => l.status === "pending");
}

async function getNextPendingLot(ctx: MutationCtx, auctionId: Id<"auctions">) {
  const pendingLots = await getPendingLots(ctx, auctionId);
  return pendingLots[0] ?? null;
}

async function activateAllPendingLots(
  ctx: MutationCtx,
  auctionId: Id<"auctions">,
  now = Date.now()
) {
  const pendingLots = await getPendingLots(ctx, auctionId);
  let activated = 0;
  const failures: string[] = [];

  for (const lot of pendingLots) {
    const result = await activateLot(ctx, lot, now);
    if (result.ok) {
      activated += 1;
    } else {
      failures.push(result.reason);
      await passUnrunnableLot(ctx, lot, result.reason);
    }
  }

  if (activated === 0) {
    throw new Error(
      failures.length > 0
        ? `Could not activate any lots: ${failures.slice(0, 3).join("; ")}`
        : "No pending lots to activate"
    );
  }

  return { activated, failed: failures.length, failures };
}

async function pauseAllActiveLots(ctx: MutationCtx, auctionId: Id<"auctions">, now: number) {
  const activeLots = await getActiveLots(ctx, auctionId);
  for (const lot of activeLots) {
    if (lot.endsAt) {
      const remaining = Math.max(0, lot.endsAt - now);
      await ctx.db.patch(lot._id, {
        pausedRemainingMs: remaining,
        endsAt: undefined,
      });
    }
  }
  return activeLots.length;
}

async function resumeAllPausedLots(ctx: MutationCtx, auctionId: Id<"auctions">, now: number) {
  const activeLots = await getActiveLots(ctx, auctionId);
  let resumed = 0;
  for (const lot of activeLots) {
    if (lot.pausedRemainingMs !== undefined) {
      const endsAt = now + lot.pausedRemainingMs;
      await ctx.db.patch(lot._id, {
        endsAt,
        pausedRemainingMs: undefined,
      });
      await ctx.scheduler.runAt(endsAt, internal.auctions.closeLotAt, {
        lotId: lot._id,
      });
      resumed += 1;
    }
  }
  return resumed;
}

/**
 * If an auction has no pending or active lots left (e.g. all sold via Buy Now),
 * mark it ended so it does not go live empty.
 */
async function maybeEndAuctionIfNoRunnableLots(
  ctx: MutationCtx,
  auctionId: Id<"auctions">,
  now = Date.now()
): Promise<boolean> {
  const auction = await ctx.db.get(auctionId);
  if (!auction) return false;
  if (auction.status !== "scheduled" && auction.status !== "live") return false;

  const lots = await ctx.db
    .query("auctionLots")
    .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
    .collect();

  const hasRunnable = lots.some(
    (l) => l.status === "pending" || l.status === "active"
  );
  if (hasRunnable) return false;

  await ctx.db.patch(auctionId, {
    status: "ended",
    actualEnd: now,
  });

  return true;
}

async function cancelPreBidsAndReleaseReserves(
  ctx: MutationCtx,
  lot: Doc<"auctionLots">,
  now: number
) {
  const bids = await ctx.db
    .query("bids")
    .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
    .collect();

  for (const bid of bids) {
    if (bid.status !== "active" && bid.status !== "winning") {
      continue;
    }

    await ctx.db.patch(bid._id, { status: "cancelled" });

    const bidder = await ctx.db.get(bid.userId);
    if (!bidder) {
      continue;
    }

    const reservedBalance = bidder.reservedBalance ?? 0;
    const releaseAmount = Math.min(
      calculateBidReserveAmountKobo(bid.bidAmount),
      reservedBalance
    );

    if (releaseAmount <= 0) {
      continue;
    }

    await ctx.db.patch(bid.userId, {
      walletBalance: (bidder.walletBalance ?? 0) + releaseAmount,
      reservedBalance: reservedBalance - releaseAmount,
      updatedAt: now,
    });

    await ctx.db.insert("walletTransactions", {
      userId: bid.userId,
      type: "bid_release",
      amount: releaseAmount,
      currency: bidder.walletCurrency ?? "NGN",
      status: "completed",
      reference: `BIN_RELEASE_${now}_${bid._id}`,
      description: "Bid reserve released: vehicle purchased before auction start",
      relatedBidId: bid._id,
      createdAt: now,
      completedAt: now,
    });
  }
}

/**
 * List all auctions with optional status filter
 */
export const listAuctions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("paused"),
        v.literal("ended"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let auctions = await ctx.db.query("auctions").order("desc").collect();

    if (args.status) {
      const normalizedStatus = args.status === "completed" ? "ended" : args.status;
      auctions = auctions.filter((a) => a.status === normalizedStatus);
    }

    // Get lot counts and bid counts for each auction
    const auctionsWithCounts = await Promise.all(
      auctions.map(async (auction) => {
        const lots = await ctx.db
          .query("auctionLots")
          .withIndex("by_auction", (q) => q.eq("auctionId", auction._id))
          .collect();

        // Count total bids across all lots in this auction
        const totalBids = await Promise.all(
          lots.map(async (lot) => {
            const bids = await ctx.db
              .query("bids")
              .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
              .collect();
            return bids.length;
          })
        );

        const bidCount = totalBids.reduce((sum, count) => sum + count, 0);

        return {
          ...auction,
          totalLots: lots.length,
          lotCount: lots.length,
          soldLots: lots.filter((l) => l.status === "sold").length,
          activeLotCount: lots.filter((l) => l.status === "active").length,
          totalBids: bidCount,
        };
      })
    );

    return auctionsWithCounts;
  },
});

/**
 * Returns the best auction to promote on the homepage: live first, else next scheduled.
 */
export const getPromotedAuction = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const auctions = await ctx.db.query("auctions").collect();

    const withLotCounts = await Promise.all(
      auctions.map(async (auction) => {
        const lots = await ctx.db
          .query("auctionLots")
          .withIndex("by_auction", (q) => q.eq("auctionId", auction._id))
          .collect();
        return { ...auction, totalLots: lots.length };
      }),
    );

    const live = withLotCounts
      .filter((a) => a.status === "live")
      .sort((a, b) => b.scheduledStart - a.scheduledStart)[0];

    if (live) {
      return live;
    }

    const upcoming = withLotCounts
      .filter(
        (a) =>
          a.status === "scheduled" &&
          a.scheduledStart > now &&
          a.totalLots > 0,
      )
      .sort((a, b) => a.scheduledStart - b.scheduledStart)[0];

    if (upcoming) {
      return upcoming;
    }

    return (
      withLotCounts
        .filter((a) => a.status === "scheduled" && a.totalLots > 0)
        .sort((a, b) => a.scheduledStart - b.scheduledStart)[0] ?? null
    );
  },
});

/**
 * Get auction by ID with all lots
 */
export const getAuctionById = query({
  args: {
    auctionId: v.string(),
  },
  handler: async (ctx, args) => {
    const targetAuctionId = ctx.db.normalizeId("auctions", args.auctionId);
    if (!targetAuctionId) {
      return null;
    }

    const auction = await ctx.db.get(targetAuctionId);
    if (!auction) {
      return null;
    }

    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", targetAuctionId))
      .collect();
    lots.sort((a, b) => a.lotOrder - b.lotOrder);

    // Get vehicle info for each lot (winner first name only — no email/admin PII)
    const lotsWithVehicles = await Promise.all(
      lots.map(async (lot) => {
        const vehicle = await ctx.db.get(lot.vehicleId);
        if (!vehicle) return null;

        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .take(1);

        const image = images[0];
        let imageUrl = image?.imageUrl;
        if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("/")) {
          imageUrl = (await ctx.storage.getUrl(imageUrl as Id<"_storage">)) || imageUrl;
        }

        let winnerFirstName: string | undefined;
        if (lot.winnerId) {
          const winner = await ctx.db.get(lot.winnerId);
          winnerFirstName = winner?.firstName;
        }

        return {
          lot,
          vehicle: {
            ...vehicle,
            image: imageUrl,
          },
          winnerFirstName,
        };
      })
    );

    return {
      auction,
      lots: lotsWithVehicles.filter((l) => l !== null),
    };
  },
});

/**
 * Get currently active lot for an auction
 */
export const getCurrentLot = query({
  args: {
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    const lot = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!lot) {
      return null;
    }

    const vehicle = await ctx.db.get(lot.vehicleId);
    if (!vehicle) {
      return null;
    }

    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .order("asc")
      .collect();

    const imagesWithUrls = await Promise.all(
      images.map(async (img) => {
        let url = img.imageUrl;
        if (!url.startsWith("http") && !url.startsWith("/")) {
          url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
        }
        return {
          url,
          alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          type: img.imageType,
        };
      })
    );

    return {
      lot,
      vehicle: {
        ...vehicle,
        images: imagesWithUrls,
      },
    };
  },
});

/**
 * Public live auction room — privacy-safe projection of all lots for buyer UI.
 * Live = sequential (one activeLotId). Timed = concurrent (activeLotIds[]).
 */
export const getPublicLiveAuctionRoom = query({
  args: {
    auctionId: v.string(),
  },
  handler: async (ctx, args) => {
    const targetAuctionId = ctx.db.normalizeId("auctions", args.auctionId);
    if (!targetAuctionId) {
      return null;
    }

    const auction = await ctx.db.get(targetAuctionId);
    if (!auction) {
      return null;
    }

    const now = Date.now();
    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", targetAuctionId))
      .collect();
    lots.sort((a, b) => a.lotOrder - b.lotOrder);

    const publicLots = await Promise.all(
      lots.map(async (lot) => {
        const vehicle = await ctx.db.get(lot.vehicleId);
        if (!vehicle) return null;

        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .collect();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        let winnerFirstName: string | undefined;
        if (lot.winnerId) {
          const winner = await ctx.db.get(lot.winnerId);
          winnerFirstName = winner?.firstName;
        }

        return {
          lot: {
            _id: lot._id,
            lotOrder: lot.lotOrder,
            status: lot.status,
            currentBid: lot.currentBid,
            startingBid: lot.startingBid,
            bidIncrement: lot.bidIncrement,
            bidCount: lot.bidCount,
            winningBid: lot.winningBid,
            soldAt: lot.soldAt,
            startsAt: lot.startsAt,
            endsAt: lot.endsAt,
            buyItNowPrice: lot.buyItNowPrice,
            buyItNowEnabled: lot.buyItNowEnabled,
            remainingMs:
              lot.status === "active" && lot.endsAt
                ? Math.max(0, lot.endsAt - now)
                : null,
          },
          vehicle: {
            _id: vehicle._id,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            trim: vehicle.trim,
            condition: vehicle.condition,
            exteriorColor: vehicle.exteriorColor,
            interiorColor: vehicle.interiorColor,
            batteryHealthPercent: vehicle.batteryHealthPercent,
            batteryCapacity: vehicle.batteryCapacity,
            estimatedRange: vehicle.estimatedRange,
            odometer: vehicle.odometer,
            drivetrain: vehicle.drivetrain,
            titleType: vehicle.titleType,
            hasKeys: vehicle.hasKeys,
            motorPower: vehicle.motorPower,
            chargingType: vehicle.chargingType,
            damageDescription: vehicle.damageDescription,
            currentLocation: vehicle.currentLocation,
            image: imagesWithUrls[0]?.url,
            images: imagesWithUrls,
          },
          winnerFirstName,
        };
      })
    );

    const validLots = publicLots.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    const activeLots = validLots.filter((item) => item.lot.status === "active");
    const pendingLots = validLots.filter((item) => item.lot.status === "pending");
    const completedLots = validLots.filter((item) =>
      item.lot.status === "sold" ||
      item.lot.status === "no_sale" ||
      item.lot.status === "passed"
    );

    const isSequential = auction.auctionType === "live";
    const primaryActive = activeLots[0] ?? null;

    return {
      auction: {
        _id: auction._id,
        name: auction.name,
        description: auction.description,
        status: auction.status,
        auctionType: auction.auctionType,
        executionMode: isSequential ? "sequential" : "concurrent",
        autoAdvanceLots: isSequential ? auction.autoAdvanceLots !== false : false,
        scheduledStart: auction.scheduledStart,
        actualStart: auction.actualStart,
        actualEnd: auction.actualEnd,
        bidIncrement: auction.bidIncrement,
      },
      lots: validLots,
      activeLotIds: activeLots.map((item) => item.lot._id),
      activeLot: primaryActive,
      upcomingLots: pendingLots,
      completedLots: [...completedLots].sort(
        (a, b) => (b.lot.soldAt ?? b.lot.lotOrder) - (a.lot.soldAt ?? a.lot.lotOrder)
      ),
      counts: {
        total: validLots.length,
        active: activeLots.length,
        pending: pendingLots.length,
        completed: completedLots.length,
      },
      timing: {
        now,
        activeLotRemainingMs: primaryActive?.lot.remainingMs ?? null,
      },
    };
  },
});

/**
 * Admin: Update auction type while still scheduled (locks after start).
 */
export const updateAuctionType = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    auctionType: v.union(
      v.literal("live"),
      v.literal("timed"),
      v.literal("buy_it_now")
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "scheduled") {
      throw new Error(
        "Auction format can only be changed while the auction is scheduled"
      );
    }

    await ctx.db.patch(args.auctionId, {
      auctionType: args.auctionType,
      // Timed auctions never auto-advance; live defaults to on when switching format.
      autoAdvanceLots:
        args.auctionType === "live"
          ? auction.autoAdvanceLots !== false
          : false,
    });

    return {
      success: true,
      message:
        args.auctionType === "live"
          ? "Format set to Live — lots run one at a time"
          : args.auctionType === "timed"
            ? "Format set to Timed — all lots run together"
            : "Format updated",
    };
  },
});

/**
 * Admin: Toggle auto-advance for sequential (live) auctions while scheduled.
 */
export const updateAuctionAutoAdvance = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    autoAdvanceLots: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "scheduled") {
      throw new Error(
        "Auto-advance can only be changed while the auction is scheduled"
      );
    }
    if (auction.auctionType !== "live") {
      throw new Error(
        "Auto-advance applies only to live (sequential) auctions"
      );
    }

    await ctx.db.patch(args.auctionId, {
      autoAdvanceLots: args.autoAdvanceLots,
    });

    return {
      success: true,
      message: args.autoAdvanceLots
        ? "Next lot will open automatically when the current lot ends"
        : "Lots will wait for an admin to advance after each close",
    };
  },
});

/**
 * Purchase a vehicle via Buy It Now (pre-auction only).
 * Soft-holds the vehicle — remains in general inventory until payment is complete.
 */
export const purchaseBuyItNow = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
    destination: v.union(v.literal("lagos"), v.literal("port_harcourt")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }

    const vehicle = await ctx.db.get(lot.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (vehicle.sellerId && vehicle.sellerId === user._id) {
      throw new Error("You cannot purchase your own listing");
    }

    if (vehicle.status === "payment_pending") {
      if (vehicle.buyItNowPurchasedBy === user._id) {
        const mine = (
          await ctx.db
            .query("orders")
            .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
            .collect()
        ).find(
          (order) =>
            order.userId === user._id &&
            (order.status === "pending_payment" || order.status === "payment_partial")
        );
        if (mine) {
          return {
            success: true,
            orderId: mine._id,
            orderNumber: mine.orderNumber,
            resumed: true,
          };
        }
      }
      throw new Error("This vehicle is reserved pending payment by another buyer");
    }

    const purchasePrice = resolveBuyNowPrice({
      buyItNowPrice: lot.buyItNowPrice ?? vehicle.buyItNowPrice,
      reservePrice: lot.reservePrice ?? vehicle.reservePrice,
      startingBid: lot.startingBid ?? vehicle.startingBid,
    });

    if (!purchasePrice) {
      throw new Error("Buy It Now is not available for this vehicle");
    }

    const auction = await ctx.db.get(lot.auctionId);
    if (!auction || !isPreAuctionBuyNowAvailable(lot.status, auction.status)) {
      throw new Error("Buy It Now is only available for scheduled auctions");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "payment_pending");

    const now = Date.now();

    const existingOrder = (
      await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
        .collect()
    ).find(
      (order) =>
        order.auctionLotId === lot._id &&
        order.status !== "cancelled" &&
        order.status !== "refunded"
    );

    if (existingOrder) {
      throw new Error("Auction lot already has an active purchase order");
    }

    await cancelPreBidsAndReleaseReserves(ctx, lot, now);

    const pricing = calculateBuyNowPricing(purchasePrice, args.destination);

    // Soft-hold lot: mark passed-for-purchase intent without treating vehicle as sold inventory
    await ctx.db.patch(args.lotId, {
      status: "sold",
      buyItNowPrice: purchasePrice,
      buyItNowEnabled: true,
      buyItNowPurchasedAt: now,
      buyItNowPurchasedBy: user._id,
      winningBid: purchasePrice,
      winnerId: user._id,
      soldAt: now,
    });

    await ctx.db.patch(lot.vehicleId, {
      status: "payment_pending",
      buyItNowPrice: purchasePrice,
      buyItNowEnabled: true,
      buyItNowPurchasedAt: now,
      buyItNowPurchasedBy: user._id,
      updatedAt: now,
    });

    const orderNumber = await generateUniqueOrderNumber(ctx);
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: user._id,
      vehicleId: lot.vehicleId,
      auctionLotId: lot._id,
      orderType: "buy_it_now",
      winningBid: pricing.vehiclePrice,
      serviceFee: pricing.serviceFee,
      documentationFee: pricing.documentationFee,
      inspectionFee: pricing.inspectionFee,
      shippingCost: pricing.shippingCost,
      estimatedDuties: pricing.customsClearingFee,
      clearanceFee: pricing.customsClearingFee,
      registrationFee: pricing.registrationFee,
      destinationPort: pricing.destination,
      subtotal: pricing.vehiclePrice,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      balanceDue: pricing.totalAmount,
      status: "pending_payment",
      paymentDeadline: paymentDeadlineFrom(now),
      createdAt: now,
      updatedAt: now,
    });

     const deadlineStr = new Date(paymentDeadlineFrom(now)).toLocaleString();
    await createInAppNotification(ctx, {
      userId: user._id,
      type: "payment_reminder",
      title: "Complete payment to secure this vehicle",
      message: `Order ${orderNumber} created. Pay ₦${pricing.totalAmount.toLocaleString()} by ${deadlineStr} to secure the vehicle. The listing remains reserved until payment is complete.`,
      orderId,
      vehicleId: lot.vehicleId,
      auctionId: lot.auctionId,
    });

    // Send C1: Buy Now Order Created Email (Buyer)
    await ctx.scheduler.runAfter(0, internal.emails.sendBuyNowOrderEmail, {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      orderNumber,
      orderId,
      vehiclePrice: pricing.vehiclePrice,
      serviceFee: pricing.serviceFee,
      documentationFee: pricing.documentationFee,
      shippingCost: pricing.shippingCost,
      totalAmount: pricing.totalAmount,
      paymentDeadline: paymentDeadlineFrom(now),
      vehicleId: lot.vehicleId,
    });

    if (vehicle.sellerId) {
      await createInAppNotification(ctx, {
        userId: vehicle.sellerId,
        type: "system",
        title: "Buyer reserved your vehicle",
        message: `A buyer created order ${orderNumber} for ${vehicle.year} ${vehicle.make} ${vehicle.model} via Buy Now. Payment is due by ${deadlineStr}.`,
        orderId,
        vehicleId: lot.vehicleId,
        auctionId: lot.auctionId,
      });

      // Send C3: Seller Reserved Vehicle Email (Seller)
      const sellerUser = await ctx.db.get(vehicle.sellerId);
      if (sellerUser) {
        await ctx.scheduler.runAfter(0, internal.emails.sendSellerVehicleSoldEmail, {
          userId: sellerUser._id,
          email: sellerUser.email,
          firstName: sellerUser.firstName,
          vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          salePrice: pricing.vehiclePrice,
          paymentDeadline: paymentDeadlineFrom(now),
          orderNumber,
          saleType: "buy_now",
          vehicleId: lot.vehicleId,
        });
      }
    }

    if (auction) {
      await ctx.db.patch(lot.auctionId, {
        soldLots: auction.soldLots + 1,
      });
      await maybeEndAuctionIfNoRunnableLots(ctx, lot.auctionId, now);
    }

    return { success: true, orderId, orderNumber };
  },
});

/**
 * Admin: Create a new auction
 */
export const createAuction = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    auctionType: v.union(
      v.literal("live"),
      v.literal("timed"),
      v.literal("buy_it_now")
    ),
    scheduledStart: v.optional(v.number()),
    scheduledEnd: v.optional(v.number()),
    bidIncrement: v.number(),
    autoAdvanceLots: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate required fields first
    if (!args.scheduledStart) {
      throw new Error("scheduledStart is required to create an auction");
    }

    const user = await requireAdminUser(ctx, args.token);

    const autoAdvanceLots =
      args.auctionType === "live"
        ? args.autoAdvanceLots !== false
        : false;

    const auctionId = await ctx.db.insert("auctions", {
      name: args.name,
      description: args.description,
      auctionType: args.auctionType,
      status: "scheduled",
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      bidIncrement: args.bidIncrement,
      extendOnBid: false,
      autoAdvanceLots,
      totalLots: 0,
      soldLots: 0,
      totalBids: 0,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    return { success: true, auctionId };
  },
});

/**
 * Admin: Create a new auction with all lots in a single atomic transaction
 */
export const createAuctionWithLots = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    auctionType: v.union(
      v.literal("live"),
      v.literal("timed"),
      v.literal("buy_it_now")
    ),
    scheduledStart: v.optional(v.number()),
    scheduledEnd: v.optional(v.number()),
    bidIncrement: v.number(),
    autoAdvanceLots: v.optional(v.boolean()),
    lots: v.array(
      v.object({
        vehicleId: v.id("vehicles"),
        lotOrder: v.number(),
        estimatedStartTime: v.optional(v.number()),
        lotDuration: v.number(), // in milliseconds
        startingBid: v.optional(v.number()),
        reservePrice: v.optional(v.number()),
        buyItNowPrice: v.optional(v.number()),
        bidIncrement: v.optional(v.number()),
        buyItNowEnabled: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (!args.scheduledStart) {
      throw new Error("scheduledStart is required to create an auction");
    }

    const user = await requireAdminUser(ctx, args.token);

    const autoAdvanceLots =
      args.auctionType === "live"
        ? args.autoAdvanceLots !== false
        : false;

    const auctionId = await ctx.db.insert("auctions", {
      name: args.name,
      description: args.description,
      auctionType: args.auctionType,
      status: "scheduled",
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      bidIncrement: args.bidIncrement,
      extendOnBid: false,
      autoAdvanceLots,
      totalLots: 0,
      soldLots: 0,
      totalBids: 0,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    if (args.lots.length === 0) {
      return { success: true, auctionId, createdLotsCount: 0, lotIds: [] };
    }

    const vehicleSet = new Set<string>();
    const lotOrderSet = new Set<number>();
    for (const lot of args.lots) {
      if (vehicleSet.has(lot.vehicleId)) {
        throw new Error(`Duplicate vehicle ${lot.vehicleId} specified in lots list`);
      }
      vehicleSet.add(lot.vehicleId);

      if (lotOrderSet.has(lot.lotOrder)) {
        throw new Error(`Duplicate lot order ${lot.lotOrder} specified in lots list`);
      }
      lotOrderSet.add(lot.lotOrder);
    }

    const createdLotIds: Array<Id<"auctionLots">> = [];

    for (const lotInput of args.lots) {
      const vehicle = await ctx.db.get(lotInput.vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }
      if (vehicle.status !== "approved") {
        throw new Error(`Only approved vehicles can be added to auctions. Current status: ${vehicle.status}`);
      }

      const duplicateVehicleLot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lotInput.vehicleId))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (duplicateVehicleLot) {
        throw new Error("Vehicle already has an active or pending auction lot");
      }

      const startingBid = lotInput.startingBid ?? vehicle.startingBid ?? 0;
      const reservePrice = lotInput.reservePrice ?? vehicle.reservePrice;
      const buyItNowPrice = lotInput.buyItNowPrice ?? vehicle.buyItNowPrice;
      const bidIncrement = lotInput.bidIncrement ?? args.bidIncrement;

      if (startingBid < 0 || bidIncrement <= 0) {
        throw new Error("Starting bid and bid increment must be positive values");
      }
      if (reservePrice !== undefined && reservePrice < startingBid) {
        throw new Error("Reserve price must be greater than or equal to starting bid");
      }
      if (buyItNowPrice === undefined || buyItNowPrice <= 0) {
        throw new Error("Buy It Now price is required for all auction lots");
      }
      if (reservePrice !== undefined && buyItNowPrice < reservePrice) {
        throw new Error("Buy It Now price must be greater than or equal to reserve price");
      }

      const lotId = await ctx.db.insert("auctionLots", {
        auctionId,
        vehicleId: lotInput.vehicleId,
        lotOrder: lotInput.lotOrder,
        status: "pending",
        currentBid: startingBid,
        startingBid,
        reservePrice,
        bidIncrement,
        bidCount: 0,
        reserveMet: false,
        estimatedStartTime: lotInput.estimatedStartTime,
        lotDuration: lotInput.lotDuration,
        buyItNowPrice,
        buyItNowEnabled: true,
      });

      assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "scheduled");

      await ctx.db.patch(lotInput.vehicleId, {
        status: "scheduled",
        updatedAt: Date.now(),
      });

      createdLotIds.push(lotId);
    }

    await ctx.db.patch(auctionId, {
      totalLots: createdLotIds.length,
    });

    return { success: true, auctionId, createdLotsCount: createdLotIds.length, lotIds: createdLotIds };
  },
});

/**
 * Admin: Add a lot to an auction
 */
export const addLotToAuction = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    vehicleId: v.id("vehicles"),
    lotOrder: v.number(),
    estimatedStartTime: v.optional(v.number()),
    lotDuration: v.number(), // in milliseconds
    startingBid: v.optional(v.number()),
    reservePrice: v.optional(v.number()),
    buyItNowPrice: v.optional(v.number()),
    bidIncrement: v.optional(v.number()),
    buyItNowEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    // Get auction to get bid increment
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "scheduled") {
      throw new Error("Lots can only be added to scheduled auctions");
    }

    // Get vehicle to get starting bid
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    if (vehicle.status !== "approved") {
      throw new Error(`Only approved vehicles can be added to auctions. Current status: ${vehicle.status}`);
    }

    const duplicateVehicleLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (duplicateVehicleLot) {
      throw new Error("Vehicle already has an active or pending auction lot");
    }

    const duplicateLotOrder = (await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .collect()).find((lot) => lot.lotOrder === args.lotOrder);

    if (duplicateLotOrder) {
      throw new Error(`Auction already has a lot at order ${args.lotOrder}`);
    }

    const startingBid = args.startingBid ?? vehicle.startingBid ?? 0;
    const reservePrice = args.reservePrice ?? vehicle.reservePrice;
    const buyItNowPrice = args.buyItNowPrice ?? vehicle.buyItNowPrice;
    const bidIncrement = args.bidIncrement ?? auction.bidIncrement;

    if (startingBid < 0 || bidIncrement <= 0) {
      throw new Error("Starting bid and bid increment must be positive values");
    }
    if (reservePrice !== undefined && reservePrice < startingBid) {
      throw new Error("Reserve price must be greater than or equal to starting bid");
    }
    if (buyItNowPrice === undefined || buyItNowPrice <= 0) {
      throw new Error("Buy It Now price is required for all auction lots");
    }
    if (reservePrice !== undefined && buyItNowPrice < reservePrice) {
      throw new Error("Buy It Now price must be greater than or equal to reserve price");
    }

    const lotId = await ctx.db.insert("auctionLots", {
      auctionId: args.auctionId,
      vehicleId: args.vehicleId,
      lotOrder: args.lotOrder,
      status: "pending",
      currentBid: startingBid,
      startingBid,
      reservePrice,
      bidIncrement,
      bidCount: 0,
      reserveMet: false,
      estimatedStartTime: args.estimatedStartTime,
      lotDuration: args.lotDuration,
      buyItNowPrice,
      buyItNowEnabled: true,
    });

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "scheduled");

    // Update vehicle status
    await ctx.db.patch(args.vehicleId, {
      status: "scheduled",
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.auctionId, {
      totalLots: auction.totalLots + 1,
    });

    return { success: true, lotId };
  },
});

/**
 * Admin: Add multiple lots to an existing scheduled auction in a single transaction
 */
export const addLotsToAuctionBulk = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    lots: v.array(
      v.object({
        vehicleId: v.id("vehicles"),
        lotOrder: v.number(),
        estimatedStartTime: v.optional(v.number()),
        lotDuration: v.number(), // in milliseconds
        startingBid: v.optional(v.number()),
        reservePrice: v.optional(v.number()),
        buyItNowPrice: v.optional(v.number()),
        bidIncrement: v.optional(v.number()),
        buyItNowEnabled: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "scheduled") {
      throw new Error("Lots can only be added to scheduled auctions");
    }

    if (args.lots.length === 0) {
      return { success: true, auctionId: args.auctionId, createdLotsCount: 0, lotIds: [] };
    }

    const existingAuctionLots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .collect();
    const existingOrders = new Set(existingAuctionLots.map((l) => l.lotOrder));

    const vehicleSet = new Set<string>();
    const lotOrderSet = new Set<number>();

    for (const lot of args.lots) {
      if (vehicleSet.has(lot.vehicleId)) {
        throw new Error(`Duplicate vehicle ${lot.vehicleId} specified in lots list`);
      }
      vehicleSet.add(lot.vehicleId);

      if (lotOrderSet.has(lot.lotOrder) || existingOrders.has(lot.lotOrder)) {
        throw new Error(`Auction already has a lot at order ${lot.lotOrder}`);
      }
      lotOrderSet.add(lot.lotOrder);
    }

    const createdLotIds: Array<Id<"auctionLots">> = [];

    for (const lotInput of args.lots) {
      const vehicle = await ctx.db.get(lotInput.vehicleId);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }
      if (vehicle.status !== "approved") {
        throw new Error(`Only approved vehicles can be added to auctions. Current status: ${vehicle.status}`);
      }

      const duplicateVehicleLot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lotInput.vehicleId))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "active")
          )
        )
        .first();

      if (duplicateVehicleLot) {
        throw new Error("Vehicle already has an active or pending auction lot");
      }

      const startingBid = lotInput.startingBid ?? vehicle.startingBid ?? 0;
      const reservePrice = lotInput.reservePrice ?? vehicle.reservePrice;
      const buyItNowPrice = lotInput.buyItNowPrice ?? vehicle.buyItNowPrice;
      const bidIncrement = lotInput.bidIncrement ?? auction.bidIncrement;

      if (startingBid < 0 || bidIncrement <= 0) {
        throw new Error("Starting bid and bid increment must be positive values");
      }
      if (reservePrice !== undefined && reservePrice < startingBid) {
        throw new Error("Reserve price must be greater than or equal to starting bid");
      }
      if (buyItNowPrice === undefined || buyItNowPrice <= 0) {
        throw new Error("Buy It Now price is required for all auction lots");
      }
      if (reservePrice !== undefined && buyItNowPrice < reservePrice) {
        throw new Error("Buy It Now price must be greater than or equal to reserve price");
      }

      const lotId = await ctx.db.insert("auctionLots", {
        auctionId: args.auctionId,
        vehicleId: lotInput.vehicleId,
        lotOrder: lotInput.lotOrder,
        status: "pending",
        currentBid: startingBid,
        startingBid,
        reservePrice,
        bidIncrement,
        bidCount: 0,
        reserveMet: false,
        estimatedStartTime: lotInput.estimatedStartTime,
        lotDuration: lotInput.lotDuration,
        buyItNowPrice,
        buyItNowEnabled: true,
      });

      assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "scheduled");

      await ctx.db.patch(lotInput.vehicleId, {
        status: "scheduled",
        updatedAt: Date.now(),
      });

      createdLotIds.push(lotId);
    }

    await ctx.db.patch(args.auctionId, {
      totalLots: auction.totalLots + createdLotIds.length,
    });

    return { success: true, auctionId: args.auctionId, createdLotsCount: createdLotIds.length, lotIds: createdLotIds };
  },
});

/**
 * Admin: Start an auction (also recovers a live auction stuck with no active lot)
 */
export const startAuction = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    const now = Date.now();
    const activeLots = await getActiveLots(ctx, args.auctionId);
    const pendingLots = await getPendingLots(ctx, args.auctionId);

    // Recovery: ended with active lots still open (premature end)
    if (auction.status === "ended" && activeLots.length > 0) {
      await ctx.db.patch(args.auctionId, {
        status: "live",
        actualEnd: undefined,
      });
      return {
        success: true,
        message: `Reopened auction — ${activeLots.length} active lot(s) still bidding`,
      };
    }

    // Recovery: live auction with no active lot (failed advance / bad vehicle skip)
    if (auction.status === "live") {
      if (activeLots.length > 0) {
        return {
          success: true,
          message: "Auction is already live with an active lot",
        };
      }
      if (isConcurrentAuction(auction)) {
        const result = await activateAllPendingLots(ctx, args.auctionId, now);
        return {
          success: true,
          message: `Recovered timed auction — activated ${result.activated} lot(s)`,
        };
      }
      const activated = await activateNextRunnablePendingLot(
        ctx,
        args.auctionId,
        now
      );
      if (!activated) {
        await maybeEndAuctionIfNoRunnableLots(ctx, args.auctionId, now);
        throw new Error(
          "No runnable pending lots left to activate. Check vehicle statuses."
        );
      }
      const skippedNote =
        activated.skipped.length > 0
          ? ` (skipped ${activated.skipped.length} unrunnable lot(s))`
          : "";
      return {
        success: true,
        message: `Recovered live auction — next lot activated${skippedNote}`,
      };
    }

    if (auction.status !== "scheduled" && auction.status !== "paused") {
      throw new Error(
        `Auction cannot be started from status: ${auction.status}`
      );
    }

    if (activeLots.length === 0 && pendingLots.length === 0) {
      throw new Error("Cannot start auction without pending lots");
    }

    const wasPaused = auction.status === "paused";

    // Activate first, then mark live — avoids live-with-no-lot if activation fails
    if (wasPaused && activeLots.length > 0) {
      await resumeAllPausedLots(ctx, args.auctionId, now);
    } else if (isConcurrentAuction(auction)) {
      await activateAllPendingLots(ctx, args.auctionId, now);
    } else {
      const activated = await activateNextRunnablePendingLot(
        ctx,
        args.auctionId,
        now
      );
      if (!activated && activeLots.length === 0) {
        throw new Error(
          "Could not activate any lot. Check that lot vehicles are approved/scheduled/unsold."
        );
      }
    }

    await ctx.db.patch(args.auctionId, {
      status: "live",
      actualStart: auction.actualStart ?? now,
    });

    return { success: true, message: "Auction started successfully" };
  },
});

/**
 * Admin: Pause an auction
 */
export const pauseAuction = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "live") {
      throw new Error(`Only live auctions can be paused. Current status: ${auction.status}`);
    }

    const now = Date.now();
    // Pause every active lot (covers both sequential and concurrent)
    await pauseAllActiveLots(ctx, args.auctionId, now);

    await ctx.db.patch(args.auctionId, {
      status: "paused",
    });

    return { success: true, message: "Auction paused" };
  },
});

/**
 * Admin: Advance to next lot (live/sequential auctions only)
 */
export const advanceLot = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "live") {
      throw new Error(`Lots can only be advanced on live auctions. Current status: ${auction.status}`);
    }
    if (!isSequentialAuction(auction)) {
      throw new Error(
        "Advance lot is only available for live (sequential) auctions. Timed auctions close lots independently."
      );
    }

    const activeLots = await getActiveLots(ctx, args.auctionId);
    for (const currentLot of activeLots) {
      await endLot(ctx, currentLot._id);
    }

    const activated = await activateNextRunnablePendingLot(
      ctx,
      args.auctionId
    );

    if (activated) {
      const skippedNote =
        activated.skipped.length > 0
          ? ` (skipped ${activated.skipped.length} unrunnable)`
          : "";
      return {
        success: true,
        message: `Advanced to next lot${skippedNote}`,
      };
    }

    await ctx.db.patch(args.auctionId, {
      status: "ended",
      actualEnd: Date.now(),
    });

    return { success: true, message: "Auction completed - no more lots" };
  },
});


/**
 * Resolve the high bidder for a lot.
 * Highest amount wins; earliest createdAt breaks ties ("speed").
 */
async function resolveLotWinner(
  ctx: MutationCtx,
  lot: Doc<"auctionLots">
): Promise<{
  userId: Id<"users">;
  amount: number;
  bidId?: Id<"bids">;
} | null> {
  const bids = await ctx.db
    .query("bids")
    .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
    .collect();

  const eligible = bids.filter(
    (b) =>
      b.status === "active" ||
      b.status === "winning" ||
      b.status === "outbid" ||
      b.status === "won"
  );

  if (eligible.length > 0) {
    eligible.sort((a, b) => {
      if (b.bidAmount !== a.bidAmount) return b.bidAmount - a.bidAmount;
      return a.createdAt - b.createdAt;
    });

    if (
      lot.currentBidderId &&
      lot.currentBid > 0 &&
      eligible.some(
        (b) =>
          b.userId === lot.currentBidderId && b.bidAmount === lot.currentBid
      )
    ) {
      const pointed = eligible.find(
        (b) =>
          b.userId === lot.currentBidderId && b.bidAmount === lot.currentBid
      )!;
      return {
        userId: pointed.userId,
        amount: pointed.bidAmount,
        bidId: pointed._id,
      };
    }

    const top = eligible[0];
    return {
      userId: top.userId,
      amount: top.bidAmount,
      bidId: top._id,
    };
  }

  if (lot.currentBidderId && lot.bidCount > 0 && lot.currentBid > 0) {
    return {
      userId: lot.currentBidderId,
      amount: lot.currentBid,
    };
  }

  return null;
}

type EndLotResult = {
  outcome: "sold" | "no_sale";
  winningBid?: number;
  winnerId?: Id<"users">;
  reserveMet: boolean;
};

/**
 * Internal: End a lot and create order if sold.
 * When time runs out (or the lot is force-closed), the highest bidder is
 * automatically awarded if any eligible bids exist.
 */
async function endLot(
  ctx: MutationCtx,
  lotId: Id<"auctionLots">
): Promise<EndLotResult | null> {
  const lot = await ctx.db.get(lotId);
  if (!lot) return null;
  if (lot.status !== "active") return null;

  const vehicle = await ctx.db.get(lot.vehicleId);
  if (!vehicle) return null;

  const reservePrice = lot.reservePrice ?? vehicle.reservePrice;
  const winner = await resolveLotWinner(ctx, lot);
  const reserveMet =
    !reservePrice || (winner !== null && winner.amount >= reservePrice);
  const now = Date.now();

  // Award the high bidder whenever there is a winning bid on close.
  // Reserve status is recorded for reporting; unmet reserve no longer
  // blocks the automatic hammer award at lot end.
  if (winner) {
    await ctx.db.patch(lotId, {
      status: "sold",
      currentBid: winner.amount,
      currentBidderId: winner.userId,
      winningBid: winner.amount,
      winnerId: winner.userId,
      reserveMet,
      soldAt: now,
    });

    const bids = await ctx.db
      .query("bids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lotId))
      .collect();

    let winningBidId: Id<"bids"> | undefined = winner.bidId;
    let markedWinner = false;
    for (const bid of bids) {
      const isWinningBid =
        bid.userId === winner.userId && bid.bidAmount === winner.amount;
      if (isWinningBid && !markedWinner) {
        winningBidId = bid._id;
        markedWinner = true;
        await ctx.db.patch(bid._id, { status: "won" });
      } else if (bid.status === "active" || bid.status === "winning") {
        await ctx.db.patch(bid._id, { status: "outbid" });
      }
    }

    const orderNumber = await generateUniqueOrderNumber(ctx);
    const serviceFee = calculateServiceFee(winner.amount);
    const documentationFee = 50_000;
    const subtotal = winner.amount;
    const totalAmount = subtotal + serviceFee + documentationFee;

    const existingOrder = (
      await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
        .collect()
    ).find(
      (order) =>
        order.auctionLotId === lotId &&
        order.status !== "cancelled" &&
        order.status !== "refunded"
    );

    if (!existingOrder) {
      const orderId = await ctx.db.insert("orders", {
        orderNumber,
        userId: winner.userId,
        vehicleId: lot.vehicleId,
        auctionLotId: lotId,
        orderType: "auction_win",
        winningBid: winner.amount,
        serviceFee,
        documentationFee,
        subtotal,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        status: "pending_payment",
        paymentDeadline: paymentDeadlineFrom(now),
        createdAt: now,
        updatedAt: now,
      });

      const { depositNaira, order } = await applyBidReserveAsDepositPayment(ctx, {
        orderId,
        userId: winner.userId,
        winningBidNaira: winner.amount,
        relatedBidId: winningBidId,
      });

      const deadlineStr = new Date(order.paymentDeadline).toLocaleString();
      await createInAppNotification(ctx, {
        userId: winner.userId,
        type: "auction_won",
        title: "You won the auction!",
        message: `You won lot for ${vehicle.year} ${vehicle.make} ${vehicle.model}. Deposit of ₦${depositNaira.toLocaleString()} applied. Pay remaining ₦${order.balanceDue.toLocaleString()} by ${deadlineStr} or your deposit will be forfeited and the vehicle re-listed.`,
        orderId,
        vehicleId: lot.vehicleId,
        auctionId: lot.auctionId,
      });

      const winnerUser = await ctx.db.get(winner.userId);
      if (winnerUser) {
        await ctx.scheduler.runAfter(0, internal.emails.sendAuctionWonEmail, {
          userId: winnerUser._id,
          email: winnerUser.email,
          firstName: winnerUser.firstName,
          vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          winningBid: winner.amount,
          depositApplied: depositNaira * 100,
          balanceDue: order.balanceDue,
          paymentDeadline: order.paymentDeadline,
          orderId,
          orderNumber,
          vehicleId: lot.vehicleId,
          auctionId: lot.auctionId,
        });
      }

      if (vehicle.sellerId) {
        const sellerUser = await ctx.db.get(vehicle.sellerId);
        if (sellerUser) {
          await ctx.scheduler.runAfter(0, internal.emails.sendSellerVehicleSoldEmail, {
            userId: sellerUser._id,
            email: sellerUser.email,
            firstName: sellerUser.firstName,
            vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            salePrice: winner.amount,
            paymentDeadline: order.paymentDeadline,
            orderNumber,
            saleType: "auction",
            vehicleId: lot.vehicleId,
          });
        }
      }
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "payment_pending");

    await ctx.db.patch(lot.vehicleId, {
      status: "payment_pending",
      buyItNowPurchasedBy: winner.userId,
      buyItNowPurchasedAt: now,
      updatedAt: now,
    });

    const auction = await ctx.db.get(lot.auctionId);
    if (auction) {
      await ctx.db.patch(lot.auctionId, {
        soldLots: auction.soldLots + 1,
      });
    }

    return {
      outcome: "sold",
      winningBid: winner.amount,
      winnerId: winner.userId,
      reserveMet,
    };
  }

  await ctx.db.patch(lotId, {
    status: "no_sale",
    reserveMet: false,
  });

  assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "unsold");

  await ctx.db.patch(lot.vehicleId, {
    status: "unsold",
    updatedAt: now,
  });

  return {
    outcome: "no_sale",
    reserveMet: false,
  };
}

/**
 * Scheduled close for a lot at endsAt (idempotent).
 */
export const closeLotAt = internalMutation({
  args: {
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    const lot = await ctx.db.get(args.lotId);
    if (!lot || lot.status !== "active") return;
    if (!lot.endsAt || lot.endsAt > Date.now()) return;

    const auction = await ctx.db.get(lot.auctionId);
    if (auction?.status === "paused") return;

    await endLot(ctx, args.lotId);

    const now = Date.now();

    // Live/sequential: auto-advance to next pending lot (sold or no sale) when enabled.
    // Timed/concurrent: do not advance.
    if (auction) {
      const advanced = await maybeAutoAdvanceSequentialLot(ctx, auction, now);
      if (advanced) {
        return;
      }
    }

    await maybeEndAuctionIfNoRunnableLots(ctx, lot.auctionId, now);
  },
});


/**
 * Internal: Start scheduled auctions
 */
export const startScheduledAuctions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const scheduledAuctions = await ctx.db
      .query("auctions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.lte(q.field("scheduledStart"), now)
        )
      )
      .collect();

    for (const auction of scheduledAuctions) {
      const pendingLots = await getPendingLots(ctx, auction._id);
      if (pendingLots.length === 0) {
        await maybeEndAuctionIfNoRunnableLots(ctx, auction._id, now);
        continue;
      }

      try {
        if (isConcurrentAuction(auction)) {
          await activateAllPendingLots(ctx, auction._id, now);
        } else {
          const activated = await activateNextRunnablePendingLot(
            ctx,
            auction._id,
            now
          );
          if (!activated) {
            await maybeEndAuctionIfNoRunnableLots(ctx, auction._id, now);
            continue;
          }
        }

        await ctx.db.patch(auction._id, {
          status: "live",
          actualStart: now,
        });
      } catch {
        // Leave auction scheduled so the next cron tick can retry
        continue;
      }
    }

    // Heal live auctions stuck with no active lot (failed activation / skip)
    const liveAuctions = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();

    for (const auction of liveAuctions) {
      const activeLots = await getActiveLots(ctx, auction._id);
      if (activeLots.length > 0) continue;

      try {
        if (isConcurrentAuction(auction)) {
          const pending = await getPendingLots(ctx, auction._id);
          if (pending.length === 0) {
            await maybeEndAuctionIfNoRunnableLots(ctx, auction._id, now);
            continue;
          }
          await activateAllPendingLots(ctx, auction._id, now);
        } else {
          const activated = await activateNextRunnablePendingLot(
            ctx,
            auction._id,
            now
          );
          if (!activated) {
            await maybeEndAuctionIfNoRunnableLots(ctx, auction._id, now);
          }
        }
      } catch {
        continue;
      }
    }

    // Heal auctions marked ended while lots are still active (premature end / race)
    const endedAuctions = await ctx.db
      .query("auctions")
      .withIndex("by_status", (q) => q.eq("status", "ended"))
      .collect();

    for (const auction of endedAuctions) {
      const activeLots = await getActiveLots(ctx, auction._id);
      if (activeLots.length === 0) continue;

      await ctx.db.patch(auction._id, {
        status: "live",
        actualEnd: undefined,
      });
    }
  },
});

/**
 * Internal: End expired lots
 */
export const endExpiredLots = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const expiredLots = await ctx.db
      .query("auctionLots")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("endsAt"), now)
        )
      )
      .collect();

    // Group by auction so concurrent auctions only end once all lots are done
    const byAuction = new Map<Id<"auctions">, Doc<"auctionLots">[]>();
    for (const lot of expiredLots) {
      const auction = await ctx.db.get(lot.auctionId);
      if (auction?.status === "paused") {
        continue;
      }
      const list = byAuction.get(lot.auctionId) ?? [];
      list.push(lot);
      byAuction.set(lot.auctionId, list);
    }

    for (const [auctionId, lots] of byAuction) {
      const auction = await ctx.db.get(auctionId);
      if (!auction) continue;

      for (const lot of lots) {
        await endLot(ctx, lot._id);
      }

      const advanced = await maybeAutoAdvanceSequentialLot(ctx, auction, now);
      if (advanced) {
        continue;
      }

      await maybeEndAuctionIfNoRunnableLots(ctx, auctionId, now);
    }
  },
});


/**
 * Get vendor auctions - auctions containing vendor's vehicles
 * Seller only
 */
export const getVendorAuctions = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireSeller(user);

    // Get all auctions
    const auctions = await ctx.db.query("auctions").collect();

    // Filter auctions that have vendor's vehicles
    const vendorAuctions = [];

    for (const auction of auctions) {
      // Get lots for this auction
      const lots = await ctx.db
        .query("auctionLots")
        .filter((q) => q.eq(q.field("auctionId"), auction._id))
        .collect();

      // Check if any lots contain vendor's vehicles
      const vendorLots = [];
      for (const lot of lots) {
        const vehicle = await ctx.db.get(lot.vehicleId);
        if (vehicle && vehicle.sellerId === user._id) {
          vendorLots.push({
            ...lot,
            vehicle: {
              _id: vehicle._id,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              lotNumber: vehicle.lotNumber,
            },
          });
        }
      }

      // If auction has vendor's vehicles, include it
      if (vendorLots.length > 0) {
        vendorAuctions.push({
          ...auction,
          vendorLots,
        });
      }
    }

    // Sort by scheduled start (newest first)
    vendorAuctions.sort((a, b) => b.scheduledStart - a.scheduledStart);

    return vendorAuctions;
  },
});

/**
 * Get comprehensive live control center data for admin dashboard
 */
export const getLiveControlCenterData = query({
  args: {
    token: v.string(),
    auctionId: v.optional(v.id("auctions")),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const now = Date.now();
    let targetAuction: Doc<"auctions"> | null = null;

    if (args.auctionId) {
      targetAuction = await ctx.db.get(args.auctionId);
    } else {
      // Find currently live auction first, else scheduled, else most recent
      const allAuctions = await ctx.db.query("auctions").collect();
      targetAuction =
        allAuctions.find((a) => a.status === "live") ||
        allAuctions.find((a) => a.status === "scheduled") ||
        allAuctions.sort((a, b) => b.createdAt - a.createdAt)[0] ||
        null;
    }

    if (!targetAuction) {
      return null;
    }

    const auctionId = targetAuction._id;

    // Get all lots for this auction
    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
      .collect();

    lots.sort((a, b) => a.lotOrder - b.lotOrder);

    // Active lot
    const activeLotDoc = lots.find((l) => l.status === "active") || null;

    let activeLot = null;
    if (activeLotDoc) {
      const vehicle = await ctx.db.get(activeLotDoc.vehicleId);
      if (vehicle) {
        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .collect();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        let currentBidder = null;
        if (activeLotDoc.currentBidderId) {
          const bidderUser = await ctx.db.get(activeLotDoc.currentBidderId);
          if (bidderUser) {
            let avatarUrl = bidderUser.avatar;
            if (avatarUrl && !avatarUrl.startsWith("http") && !avatarUrl.startsWith("/")) {
              avatarUrl = (await ctx.storage.getUrl(avatarUrl as Id<"_storage">)) || undefined;
            }
            currentBidder = {
              _id: bidderUser._id,
              firstName: bidderUser.firstName,
              lastName: bidderUser.lastName,
              email: bidderUser.email,
              avatar: avatarUrl,
              membershipTier: bidderUser.membershipTier,
            };
          }
        }

        // Fetch recent bids for active lot
        const rawBids = await ctx.db
          .query("bids")
          .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", activeLotDoc._id))
          .order("desc")
          .take(15);

        const recentBids = await Promise.all(
          rawBids.map(async (bid) => {
            const bidder = await ctx.db.get(bid.userId);
            return {
              _id: bid._id,
              bidAmount: bid.bidAmount,
              bidType: bid.bidType,
              createdAt: bid.createdAt,
              status: bid.status,
              bidderName: bidder ? `${bidder.firstName} ${bidder.lastName.charAt(0)}.` : "Unknown",
              bidderEmailMasked: bidder ? bidder.email.replace(/(.{2})(.*)(?=@)/, "$1***") : "***",
            };
          })
        );

        activeLot = {
          lot: activeLotDoc,
          vehicle: {
            ...vehicle,
            images: imagesWithUrls,
          },
          currentBidder,
          recentBids,
          winner: null,
          order: null,
        };
      }
    }

    // Pending lots in current auction
    const pendingLotsDocs = lots.filter((l) => l.status === "pending");

    // Hydrate pending lots
    const validPendingLots = (
      await Promise.all(
        pendingLotsDocs.map(async (lot) => {
          const vehicle = await ctx.db.get(lot.vehicleId);
          if (!vehicle) return null;

          const images = await ctx.db
            .query("vehicleImages")
            .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
            .order("asc")
            .take(1);

          let imgUrl = images[0]?.imageUrl || "";
          if (imgUrl && !imgUrl.startsWith("http") && !imgUrl.startsWith("/")) {
            imgUrl = (await ctx.storage.getUrl(imgUrl as Id<"_storage">)) || "";
          }

          return {
            lot,
            vehicle: {
              ...vehicle,
              image: imgUrl,
            },
            isAssignedLot: true,
          };
        })
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    // Get all vehicles in system ready/approved for auction that are not yet in an active or pending lot
    const allVehicles = await ctx.db.query("vehicles").collect();
    const availableVehiclesDocs = allVehicles.filter(
      (v) =>
        v.status === "approved" ||
        v.status === "ready_for_auction" ||
        v.status === "scheduled"
    );

    const assignedVehicleIds = new Set(lots.map((l) => l.vehicleId));
    const unassignedVehicles = availableVehiclesDocs.filter(
      (v) => !assignedVehicleIds.has(v._id)
    );

    const hydratedUnassignedVehicles = await Promise.all(
      unassignedVehicles.map(async (vehicle, idx) => {
        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .take(1);

        let imgUrl = images[0]?.imageUrl || "";
        if (imgUrl && !imgUrl.startsWith("http") && !imgUrl.startsWith("/")) {
          imgUrl = (await ctx.storage.getUrl(imgUrl as Id<"_storage">)) || "";
        }

        return {
          lot: {
            _id: vehicle._id as unknown as Id<"auctionLots">,
            auctionId,
            vehicleId: vehicle._id,
            lotOrder: validPendingLots.length + idx + 1,
            status: "pending" as const,
            currentBid: vehicle.startingBid,
            startingBid: vehicle.startingBid,
            reservePrice: vehicle.reservePrice,
            bidIncrement: targetAuction.bidIncrement,
            bidCount: 0,
            reserveMet: false,
            lotDuration: 5 * 60 * 1000,
          },
          vehicle: {
            ...vehicle,
            image: imgUrl,
          },
          isAssignedLot: false,
        };
      })
    );

    // Combine assigned pending lots only for Up Next / queue.
    // Unassigned inventory stays available for quick-add, not as fake queue slots.
    const upcomingLots = validPendingLots;
    const nextLot = upcomingLots[0] || null;
    const nextLotAfter = upcomingLots[1] || null;

    // Hydrate ALL lots in this auction for historical & full navigation view
    const allHydratedLots = await Promise.all(
      lots.map(async (lot) => {
        const vehicle = await ctx.db.get(lot.vehicleId);
        if (!vehicle) return null;

        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .collect();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        let winner = null;
        if (lot.winnerId) {
          const winnerUser = await ctx.db.get(lot.winnerId);
          if (winnerUser) {
            let avatarUrl = winnerUser.avatar;
            if (avatarUrl && !avatarUrl.startsWith("http") && !avatarUrl.startsWith("/")) {
              avatarUrl = (await ctx.storage.getUrl(avatarUrl as Id<"_storage">)) || undefined;
            }
            winner = {
              _id: winnerUser._id,
              firstName: winnerUser.firstName,
              lastName: winnerUser.lastName,
              email: winnerUser.email,
              avatar: avatarUrl,
            };
          }
        }

        let currentBidder = null;
        if (lot.currentBidderId) {
          const bidderUser = await ctx.db.get(lot.currentBidderId);
          if (bidderUser) {
            let avatarUrl = bidderUser.avatar;
            if (avatarUrl && !avatarUrl.startsWith("http") && !avatarUrl.startsWith("/")) {
              avatarUrl = (await ctx.storage.getUrl(avatarUrl as Id<"_storage">)) || undefined;
            }
            currentBidder = {
              _id: bidderUser._id,
              firstName: bidderUser.firstName,
              lastName: bidderUser.lastName,
              email: bidderUser.email,
              avatar: avatarUrl,
            };
          }
        }

        const rawBids = await ctx.db
          .query("bids")
          .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
          .order("desc")
          .take(15);

        const recentBids = await Promise.all(
          rawBids.map(async (bid) => {
            const bidder = await ctx.db.get(bid.userId);
            return {
              _id: bid._id,
              bidAmount: bid.bidAmount,
              bidType: bid.bidType,
              createdAt: bid.createdAt,
              status: bid.status,
              bidderName: bidder ? `${bidder.firstName} ${bidder.lastName.charAt(0)}.` : "Unknown",
              bidderEmailMasked: bidder ? bidder.email.replace(/(.{2})(.*)(?=@)/, "$1***") : "***",
            };
          })
        );

        let order = null;
        if (lot.status === "sold") {
          const orders = await ctx.db
            .query("orders")
            .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
            .collect();
          const lotOrder = orders.find((o) => o.auctionLotId === lot._id);
          if (lotOrder) {
            order = {
              orderNumber: lotOrder.orderNumber,
              status: lotOrder.status,
              totalAmount: lotOrder.totalAmount,
            };
          }
        }

        return {
          lot,
          vehicle: {
            ...vehicle,
            images: imagesWithUrls,
            image: imagesWithUrls[0]?.url || "",
          },
          winner,
          currentBidder,
          recentBids,
          order,
        };
      })
    );

    const validAllHydratedLots = allHydratedLots.filter((item): item is NonNullable<typeof item> => item !== null);

    // Calculate timing stats
    const actualStart = targetAuction.actualStart || targetAuction.scheduledStart;
    const auctionElapsedMs =
      targetAuction.status === "live" || targetAuction.status === "paused"
        ? Math.max(0, now - actualStart)
        : targetAuction.actualEnd && targetAuction.actualStart
        ? targetAuction.actualEnd - targetAuction.actualStart
        : 0;

    let activeLotRemainingMs = 0;
    let activeLotElapsedMs = 0;
    if (activeLotDoc) {
      if (activeLotDoc.endsAt) {
        activeLotRemainingMs = Math.max(0, activeLotDoc.endsAt - now);
      } else if (activeLotDoc.pausedRemainingMs !== undefined) {
        activeLotRemainingMs = activeLotDoc.pausedRemainingMs;
      }
      if (activeLotDoc.startsAt) {
        activeLotElapsedMs = Math.max(0, now - activeLotDoc.startsAt);
      }
    }

    const completedLots = validAllHydratedLots.filter(
      (item) =>
        item.lot.status === "sold" ||
        item.lot.status === "no_sale" ||
        item.lot.status === "passed"
    );

    const activeLots = validAllHydratedLots.filter((item) => item.lot.status === "active");

    return {
      auction: targetAuction,
      activeLot,
      activeLots,
      nextLot,
      nextLotAfter,
      upcomingLots,
      unassignedVehicles: hydratedUnassignedVehicles,
      completedLots,
      allHydratedLots: validAllHydratedLots,
      pendingLotsCount: validPendingLots.length,
      allLotsCount: lots.length,
      unassignedInventoryCount: hydratedUnassignedVehicles.length,
      needsLotRecovery:
        ((targetAuction.status === "live" ||
          targetAuction.status === "paused") &&
          !activeLotDoc &&
          validPendingLots.length > 0) ||
        (targetAuction.status === "ended" && activeLots.length > 0),
      timing: {
        now,
        auctionElapsedMs,
        activeLotRemainingMs,
        activeLotElapsedMs,
      },
    };
  },
});

/**
 * Admin: Set a specific lot as the active live lot (live/sequential auctions only)
 */
export const setCurrentActiveLot = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) throw new Error("Auction not found");
    if (!isSequentialAuction(auction)) {
      throw new Error(
        "Setting the active lot is only available for live (sequential) auctions."
      );
    }

    const lot = await ctx.db.get(args.lotId);
    if (!lot) throw new Error("Lot not found");
    if (lot.auctionId !== args.auctionId) {
      throw new Error("Lot does not belong to this auction");
    }
    if (lot.status === "sold" || lot.status === "no_sale" || lot.status === "passed") {
      throw new Error("Cannot activate a completed lot");
    }

    const now = Date.now();

    // Properly close any other active lots before activating the requested one
    const activeLots = await getActiveLots(ctx, args.auctionId);
    for (const activeLotItem of activeLots) {
      if (activeLotItem._id !== args.lotId) {
        await endLot(ctx, activeLotItem._id);
      }
    }

    if (lot.status !== "active") {
      // Pending lots that were passed need to be pending again to activate
      if (lot.status === "passed") {
        throw new Error("Cannot activate a completed lot");
      }
      const result = await activateLot(ctx, lot, now);
      if (!result.ok) {
        throw new Error(result.reason);
      }
    }

    if (auction.status !== "live") {
      await ctx.db.patch(args.auctionId, {
        status: "live",
        actualStart: auction.actualStart ?? now,
      });
    }

    return {
      success: true,
      message: `Set Lot #${lot.lotOrder} as active lot`,
    };
  },
});

/**
 * Admin: Quick add an available vehicle to the current auction as a new lot
 */
export const quickAddVehicleToAuction = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) throw new Error("Auction not found");

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const existingLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (existingLot) {
      throw new Error("Vehicle is already in an active or pending auction lot");
    }

    const existingLots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .collect();

    const maxLotOrder = existingLots.reduce(
      (max, lot) => Math.max(max, lot.lotOrder),
      0
    );

    const lotOrder = maxLotOrder + 1;
    const startingBid = vehicle.startingBid || 1000;
    const reservePrice = vehicle.reservePrice;
    const buyItNowPrice = vehicle.buyItNowPrice || startingBid * 1.5;

    const lotId = await ctx.db.insert("auctionLots", {
      auctionId: args.auctionId,
      vehicleId: args.vehicleId,
      lotOrder,
      status: "pending",
      currentBid: startingBid,
      startingBid,
      reservePrice,
      bidIncrement: auction.bidIncrement || 100,
      bidCount: 0,
      reserveMet: false,
      lotDuration: 5 * 60 * 1000,
      buyItNowPrice,
      buyItNowEnabled: true,
    });

    await ctx.db.patch(args.vehicleId, {
      status: "scheduled",
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.auctionId, {
      totalLots: auction.totalLots + 1,
    });

    return {
      success: true,
      lotId,
      message: `Added ${vehicle.year} ${vehicle.make} ${vehicle.model} as Lot #${lotOrder}`,
    };
  },
});

/**
 * Admin: Extend active lot duration by N seconds
 */
export const extendLotTime = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
    seconds: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }
    if (lot.status !== "active") {
      throw new Error("Only active lots can have their timer extended");
    }

    const now = Date.now();
    const currentEndsAt = lot.endsAt && lot.endsAt > now ? lot.endsAt : now;
    const newEndsAt = currentEndsAt + args.seconds * 1000;

    await ctx.db.patch(args.lotId, {
      endsAt: newEndsAt,
      pausedRemainingMs: undefined,
    });

    // Reschedule close timer
    await ctx.scheduler.runAt(newEndsAt, internal.auctions.closeLotAt, {
      lotId: args.lotId,
    });

    return {
      success: true,
      newEndsAt,
      message: `Extended lot #${lot.lotOrder} by ${args.seconds} seconds`,
    };
  },
});

/**
 * Admin: Force close active lot immediately
 */
export const forceCloseLot = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }
    if (lot.status !== "active") {
      throw new Error("Only active lots can be force closed");
    }

    const auction = await ctx.db.get(lot.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.lotId, { endsAt: now });

    const result = await endLot(ctx, args.lotId);

    // Live/sequential: auto-advance when enabled (sold or no sale). Timed: leave other lots alone.
    const advanced = await maybeAutoAdvanceSequentialLot(ctx, auction, now);
    if (!advanced) {
      await maybeEndAuctionIfNoRunnableLots(ctx, lot.auctionId, now);
    }

    if (result?.outcome === "sold") {
      return {
        success: true,
        outcome: "sold" as const,
        message: `Lot #${lot.lotOrder} sold for ₦${(result.winningBid ?? 0).toLocaleString()} — high bidder awarded${advanced ? "; next lot opened" : ""}.`,
      };
    }

    return {
      success: true,
      outcome: "no_sale" as const,
      message: `Lot #${lot.lotOrder} closed with no sale (no bids)${advanced ? "; next lot opened" : ""}.`,
    };
  },
});

/**
 * Admin: Manually trigger / re-send winner notification for a completed lot
 */
export const notifyAuctionWinner = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx, args.token);

    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }
    if (lot.status !== "sold" || !lot.winnerId || !lot.winningBid) {
      throw new Error("No winning bid record found for this lot");
    }

    const vehicle = await ctx.db.get(lot.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const winnerUser = await ctx.db.get(lot.winnerId);
    if (!winnerUser) {
      throw new Error("Winner user account not found");
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
      .collect();
    const order = orders.find((o) => o.auctionLotId === lot._id);

    await createInAppNotification(ctx, {
      userId: winnerUser._id,
      type: "auction_won",
      title: "Auction Winner Notification",
      message: `Reminder: You won the auction for ${vehicle.year} ${vehicle.make} ${vehicle.model} with a bid of ₦${lot.winningBid.toLocaleString()}.${order ? ` Order ${order.orderNumber}.` : ""}`,
      orderId: order?._id,
      vehicleId: lot.vehicleId,
      auctionId: lot.auctionId,
    });

    if (order) {
      await ctx.scheduler.runAfter(0, internal.emails.sendAuctionWonEmail, {
        userId: winnerUser._id,
        email: winnerUser.email,
        firstName: winnerUser.firstName,
        vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        winningBid: lot.winningBid,
        depositApplied: 0,
        balanceDue: order.balanceDue,
        paymentDeadline: order.paymentDeadline,
        orderId: order._id,
        orderNumber: order.orderNumber,
        vehicleId: lot.vehicleId,
        auctionId: lot.auctionId,
      });
    }

    return {
      success: true,
      message: `Winner notification sent to ${winnerUser.firstName} ${winnerUser.lastName} (${winnerUser.email})`,
    };
  },
});

/**
 * Admin: Preview deletion impact of an auction before confirming
 */
export const getAuctionDeletePreview = query({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    // Validate admin auth
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    // Get all lots
    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .collect();

    let totalBids = 0;
    let totalMaxBids = 0;
    const blockingOrders: Array<{ orderId: Id<"orders">; orderNumber: string; status: string }> = [];
    const affectedVehicleIds = new Set<string>();

    for (const lot of lots) {
      affectedVehicleIds.add(lot.vehicleId);

      // Bids count
      const bids = await ctx.db
        .query("bids")
        .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
        .collect();
      totalBids += bids.length;

      // Max bids count
      const maxBids = await ctx.db
        .query("maxBids")
        .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
        .collect();
      totalMaxBids += maxBids.length;

      // Check orders table for linked active orders
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
        .collect();

      for (const order of orders) {
        if (order.auctionLotId === lot._id && order.status !== "cancelled") {
          blockingOrders.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: order.status,
          });
        }
      }
    }

    return {
      auctionId: auction._id,
      auctionName: auction.name,
      status: auction.status,
      lotCount: lots.length,
      bidsCount: totalBids,
      maxBidsCount: totalMaxBids,
      vehicleCount: affectedVehicleIds.size,
      blockingOrders,
      canDelete: blockingOrders.length === 0,
    };
  },
});

/**
 * Admin: Safely delete an auction and all associated test data (lots, bids, maxBids).
 * Resets linked vehicles' statuses so they are not left orphaned.
 */
export const deleteAuction = mutation({
  args: {
    token: v.string(),
    auctionId: v.id("auctions"),
    resetVehicleStatusTo: v.optional(
      v.union(
        v.literal("approved"),
        v.literal("ready_for_auction"),
        v.literal("draft")
      )
    ),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireAdminUser(ctx, args.token);

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .collect();

    // 1. Safety Check: Verify no active / non-cancelled orders exist for lots in this auction
    const activeOrderNumbers: string[] = [];
    for (const lot of lots) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
        .collect();

      for (const order of orders) {
        if (order.auctionLotId === lot._id && order.status !== "cancelled") {
          activeOrderNumbers.push(order.orderNumber);
        }
      }
    }

    if (activeOrderNumbers.length > 0) {
      throw new Error(
        `Cannot delete auction: Lot(s) have active order(s) [${activeOrderNumbers.join(", ")}]. Cancel or process these orders before deleting the auction.`
      );
    }

    const targetVehicleStatus = args.resetVehicleStatusTo || "approved";
    let deletedBidsCount = 0;
    let deletedMaxBidsCount = 0;
    let resetVehiclesCount = 0;

    // 2. Cascade cleanup per lot
    for (const lot of lots) {
      // Delete bids
      const bids = await ctx.db
        .query("bids")
        .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
        .collect();
      for (const bid of bids) {
        await ctx.db.delete(bid._id);
        deletedBidsCount++;
      }

      // Delete maxBids
      const maxBids = await ctx.db
        .query("maxBids")
        .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lot._id))
        .collect();
      for (const maxBid of maxBids) {
        await ctx.db.delete(maxBid._id);
        deletedMaxBidsCount++;
      }

      // Reset linked vehicle status if it's currently in auction or scheduled
      const vehicle = await ctx.db.get(lot.vehicleId);
      if (
        vehicle &&
        (vehicle.status === "scheduled" ||
          vehicle.status === "in_auction" ||
          vehicle.status === "ready_for_auction")
      ) {
        await ctx.db.patch(lot.vehicleId, {
          status: targetVehicleStatus,
          updatedAt: Date.now(),
        });
        resetVehiclesCount++;
      }

      // Delete lot
      await ctx.db.delete(lot._id);
    }

    // 3. Clean up notifications referencing this auction
    const notifications = await ctx.db
      .query("notifications")
      .collect();
    for (const notification of notifications) {
      if (notification.auctionId === args.auctionId) {
        await ctx.db.patch(notification._id, { auctionId: undefined });
      }
    }

    // 4. Clean up transactional emails referencing this auction
    const transactionalEmails = await ctx.db
      .query("transactionalEmails")
      .collect();
    for (const email of transactionalEmails) {
      if (email.relatedAuctionId === args.auctionId) {
        await ctx.db.patch(email._id, { relatedAuctionId: undefined });
      }
    }

    // 5. Create audit log entry
    await ctx.db.insert("auditLog", {
      userId: adminUser._id,
      action: "auction_deleted",
      entityType: "auctions",
      entityId: args.auctionId,
      changes: JSON.stringify({
        auctionName: auction.name,
        lotsDeleted: lots.length,
        bidsDeleted: deletedBidsCount,
        maxBidsDeleted: deletedMaxBidsCount,
        vehiclesReset: resetVehiclesCount,
        targetVehicleStatus,
      }),
      timestamp: Date.now(),
    });

    // 6. Delete auction record
    await ctx.db.delete(args.auctionId);

    return {
      success: true,
      message: `Auction '${auction.name}' and all associated test data safely deleted.`,
      deletedAuctionId: args.auctionId,
      deletedLotsCount: lots.length,
      deletedBidsCount,
      deletedMaxBidsCount,
      resetVehiclesCount,
    };
  },
});


