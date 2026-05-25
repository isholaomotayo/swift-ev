import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, requireAuth, requireSeller } from "./lib/auth";
import { generateUniqueOrderNumber, calculateServiceFee } from "./lib/orders";
import {
  assertVehicleStatusTransition,
  isVehicleStatus,
  type VehicleStatus,
} from "./lib/vehicleLifecycle";
import {
  calculateBidReserveAmountKobo,
  isPreAuctionBuyNowAvailable,
} from "./lib/purchaseFlow";

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

async function getNextPendingLot(ctx: MutationCtx, auctionId: Id<"auctions">) {
  const pendingLots = await ctx.db
    .query("auctionLots")
    .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .collect();

  return pendingLots.sort((a, b) => a.lotOrder - b.lotOrder)[0] ?? null;
}

async function activateLot(ctx: MutationCtx, lot: Doc<"auctionLots">, now = Date.now()) {
  const vehicle = await ctx.db.get(lot.vehicleId);
  if (!vehicle) {
    throw new Error("Vehicle not found for auction lot");
  }

  assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "in_auction");

  const lotDuration = lot.lotDuration ?? 5 * 60 * 1000;
  await ctx.db.patch(lot._id, {
    status: "active",
    startsAt: now,
    endsAt: now + lotDuration,
  });

  await ctx.db.patch(lot.vehicleId, {
    status: "in_auction",
    updatedAt: now,
  });
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
    auctionId: v.id("auctions"),
  },
  handler: async (ctx, args) => {
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      return null;
    }

    // Get all lots for this auction
    const lots = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .order("asc")
      .collect();

    // Get vehicle info for each lot
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

        return {
          lot,
          vehicle: {
            ...vehicle,
            image: imageUrl,
          },
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
 * Purchase a vehicle via Buy It Now (FEAT-004)
 */
export const purchaseBuyItNow = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    // 1. Get user from session
    const user = await requireAuth(ctx, args.token);

    // 2. Get lot and check if Buy It Now is available
    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Lot not found");
    }

    if (!lot.buyItNowPrice || !lot.buyItNowEnabled) {
      throw new Error("Buy It Now is not available for this vehicle");
    }

    const auction = await ctx.db.get(lot.auctionId);
    if (!auction || !isPreAuctionBuyNowAvailable(lot.status, auction.status)) {
      throw new Error("Buy It Now is only available for scheduled auctions");
    }

    const vehicle = await ctx.db.get(lot.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "payment_pending");

    const now = Date.now();

    const existingOrder = (await ctx.db
      .query("orders")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
      .collect()).find((order) =>
        order.auctionLotId === lot._id &&
        order.status !== "cancelled" &&
        order.status !== "refunded"
      );

    if (existingOrder) {
      throw new Error("Auction lot already has an active purchase order");
    }

    await cancelPreBidsAndReleaseReserves(ctx, lot, now);

    // 3. Mark lot as sold and vehicle as awaiting payment
    await ctx.db.patch(args.lotId, {
      status: "sold",
      buyItNowPurchasedAt: now,
      buyItNowPurchasedBy: user._id,
      winningBid: lot.buyItNowPrice,
      winnerId: user._id,
      soldAt: now,
    });

    await ctx.db.patch(lot.vehicleId, {
      status: "payment_pending",
      buyItNowPurchasedAt: now,
      buyItNowPurchasedBy: user._id,
      updatedAt: now,
    });

    await ctx.db.patch(lot.auctionId, {
      soldLots: auction.soldLots + 1,
    });

    // 4. Create Order
    const orderNumber = await generateUniqueOrderNumber(ctx);
    const serviceFee = calculateServiceFee(lot.buyItNowPrice);
    const documentationFee = 50_000;
    const totalAmount = lot.buyItNowPrice + serviceFee + documentationFee;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: user._id,
      vehicleId: lot.vehicleId,
      auctionLotId: lot._id,
      orderType: "buy_it_now",
      winningBid: lot.buyItNowPrice,
      serviceFee,
      documentationFee,
      subtotal: lot.buyItNowPrice,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      status: "pending_payment",
      paymentDeadline: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now,
    });

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
  },
  handler: async (ctx, args) => {
    // Validate required fields first
    if (!args.scheduledStart) {
      throw new Error("scheduledStart is required to create an auction");
    }

    const user = await requireAdminUser(ctx, args.token);

    const auctionId = await ctx.db.insert("auctions", {
      name: args.name,
      description: args.description,
      auctionType: args.auctionType,
      status: "scheduled",
      scheduledStart: args.scheduledStart,
      scheduledEnd: args.scheduledEnd,
      bidIncrement: args.bidIncrement,
      extendOnBid: false,
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
      buyItNowEnabled: args.buyItNowEnabled ?? vehicle.buyItNowEnabled ?? false,
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
 * Admin: Start an auction
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
    if (auction.status !== "scheduled" && auction.status !== "paused") {
      throw new Error(`Auction cannot be started from status: ${auction.status}`);
    }

    const activeLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const nextLot = activeLot ? null : await getNextPendingLot(ctx, args.auctionId);
    if (!activeLot && !nextLot) {
      throw new Error("Cannot start auction without pending lots");
    }

    // Update auction status
    const now = Date.now();
    await ctx.db.patch(args.auctionId, {
      status: "live",
      actualStart: auction.actualStart ?? now,
    });

    if (nextLot) {
      await activateLot(ctx, nextLot, now);
    }

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

    await ctx.db.patch(args.auctionId, {
      status: "paused",
    });

    return { success: true, message: "Auction paused" };
  },
});

/**
 * Admin: Advance to next lot
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

    // Get current active lot
    const currentLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (currentLot) {
      // End current lot
      await endLot(ctx, currentLot._id);
    }

    const nextLot = await getNextPendingLot(ctx, args.auctionId);

    if (nextLot) {
      await activateLot(ctx, nextLot);

      return { success: true, message: "Advanced to next lot" };
    } else {
      // No more lots, end auction
      await ctx.db.patch(args.auctionId, {
        status: "ended",
        actualEnd: Date.now(),
      });

      return { success: true, message: "Auction completed - no more lots" };
    }
  },
});


/**
 * Internal: End a lot and create order if sold
 */
async function endLot(ctx: MutationCtx, lotId: Id<"auctionLots">) {
  const lot = await ctx.db.get(lotId);
  if (!lot) return;
  if (lot.status !== "active") return;

  const vehicle = await ctx.db.get(lot.vehicleId);
  if (!vehicle) return;

  // Check if reserve was met
  const reservePrice = lot.reservePrice ?? vehicle.reservePrice;
  const reserveMet = !reservePrice || lot.currentBid >= reservePrice;
  const now = Date.now();

  if (reserveMet && lot.currentBidderId) {
    // Mark as sold
    await ctx.db.patch(lotId, {
      status: "sold",
      winningBid: lot.currentBid,
      winnerId: lot.currentBidderId,
      soldAt: now,
    });

    const bids = await ctx.db
      .query("bids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", lotId))
      .collect();

    await Promise.all(
      bids.map((bid) => {
        if (bid.userId === lot.currentBidderId && bid.bidAmount === lot.currentBid) {
          return ctx.db.patch(bid._id, { status: "won" });
        }
        if (bid.status === "active" || bid.status === "winning") {
          return ctx.db.patch(bid._id, { status: "outbid" });
        }
        return Promise.resolve();
      })
    );

    // Generate unique order number
    const orderNumber = await generateUniqueOrderNumber(ctx);

    // Calculate fees
    const serviceFee = calculateServiceFee(lot.currentBid);
    const documentationFee = 50_000; // Standard documentation fee
    const subtotal = lot.currentBid;
    const totalAmount = subtotal + serviceFee + documentationFee;

    const existingOrder = (await ctx.db
      .query("orders")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", lot.vehicleId))
      .collect()).find((order) => order.auctionLotId === lotId);

    if (!existingOrder) {
      // Create order with all required fields
      await ctx.db.insert("orders", {
        orderNumber,
        userId: lot.currentBidderId,
        vehicleId: lot.vehicleId,
        auctionLotId: lotId,
        orderType: "auction_win",
        winningBid: lot.currentBid,
        serviceFee,
        documentationFee,
        subtotal,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        status: "pending_payment",
        paymentDeadline: now + 7 * 24 * 60 * 60 * 1000, // 7 days
        createdAt: now,
        updatedAt: now,
      });
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "payment_pending");

    // Update vehicle status
    await ctx.db.patch(lot.vehicleId, {
      status: "payment_pending",
      updatedAt: now,
    });

    const auction = await ctx.db.get(lot.auctionId);
    if (auction) {
      await ctx.db.patch(lot.auctionId, {
        soldLots: auction.soldLots + 1,
      });
    }
  } else {
    // No sale
    await ctx.db.patch(lotId, {
      status: "no_sale",
    });

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "unsold");

    await ctx.db.patch(lot.vehicleId, {
      status: "unsold",
      updatedAt: now,
    });
  }
}


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
      const firstLot = await getNextPendingLot(ctx, auction._id);
      if (!firstLot) {
        continue;
      }

      await ctx.db.patch(auction._id, {
        status: "live",
        actualStart: now,
      });

      await activateLot(ctx, firstLot, now);
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

    for (const lot of expiredLots) {
      await endLot(ctx, lot._id);

      // Advance to next lot in the same auction
      const nextLot = await getNextPendingLot(ctx, lot.auctionId);

      if (nextLot) {
        await activateLot(ctx, nextLot, now);
      } else {
        // No more lots, end auction
        await ctx.db.patch(lot.auctionId, {
          status: "ended",
          actualEnd: now,
        });
      }
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
