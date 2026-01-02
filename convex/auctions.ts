import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * List all auctions with optional status filter
 */
export const listAuctions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("live"),
        v.literal("paused"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  handler: async (ctx, args) => {
    let auctions = await ctx.db.query("auctions").order("desc").collect();

    if (args.status) {
      auctions = auctions.filter((a) => a.status === args.status);
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
          soldLots: lots.filter((l) => l.status === "sold").length,
          totalBids: bidCount,
        };
      })
    );

    return auctionsWithCounts;
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

    // Check admin authentication
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized: Invalid session token");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Admin access required: Only administrators can create auctions");
    }

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
  },
  handler: async (ctx, args) => {
    // TODO: Check admin authentication
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Admin access required");
    }

    // Get auction to get bid increment
    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    // Get vehicle to get starting bid
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const lotId = await ctx.db.insert("auctionLots", {
      auctionId: args.auctionId,
      vehicleId: args.vehicleId,
      lotOrder: args.lotOrder,
      status: "pending",
      currentBid: vehicle.startingBid || 0,
      bidIncrement: auction.bidIncrement,
      bidCount: 0,
      reserveMet: false,
      estimatedStartTime: args.estimatedStartTime,
      lotDuration: args.lotDuration,
    });

    // Update vehicle status
    await ctx.db.patch(args.vehicleId, {
      status: "scheduled",
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
    // Check admin authentication
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Admin access required");
    }

    const auction = await ctx.db.get(args.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }

    // Update auction status
    await ctx.db.patch(args.auctionId, {
      status: "live",
      actualStart: Date.now(),
    });

    // Activate first lot
    const firstLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .order("asc")
      .first();

    if (firstLot && firstLot.lotDuration) {
      const endsAt = Date.now() + firstLot.lotDuration;
      await ctx.db.patch(firstLot._id, {
        status: "active",
        startsAt: Date.now(),
        endsAt,
      });

      // Update vehicle status
      await ctx.db.patch(firstLot.vehicleId, {
        status: "in_auction",
      });
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
    // Check admin authentication
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Admin access required");
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
    // Check admin authentication
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Admin access required");
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

    // Get next lot
    const nextLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_auction", (q) => q.eq("auctionId", args.auctionId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("asc")
      .first();

    if (nextLot && nextLot.lotDuration) {
      const endsAt = Date.now() + nextLot.lotDuration;
      await ctx.db.patch(nextLot._id, {
        status: "active",
        startsAt: Date.now(),
        endsAt,
      });

      // Update vehicle status
      await ctx.db.patch(nextLot.vehicleId, {
        status: "in_auction",
      });

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
 * Generate a unique order number
 */
async function generateUniqueOrderNumber(ctx: any): Promise<string> {
  let orderNumber: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  // Generate order number and check for duplicates
  while (exists && attempts < maxAttempts) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    orderNumber = `VB-${timestamp}-${random}`;

    const existing = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q: any) => q.eq("orderNumber", orderNumber))
      .first();

    exists = !!existing;
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate unique order number after multiple attempts");
  }

  return orderNumber!;
}

/**
 * Internal: End a lot and create order if sold
 */
async function endLot(ctx: any, lotId: Id<"auctionLots">) {
  const lot = await ctx.db.get(lotId);
  if (!lot) return;

  const vehicle = await ctx.db.get(lot.vehicleId);
  if (!vehicle) return;

  // Check if reserve was met
  const reserveMet = !vehicle.reservePrice || lot.currentBid >= vehicle.reservePrice;

  if (reserveMet && lot.currentBidderId) {
    // Mark as sold
    await ctx.db.patch(lotId, {
      status: "sold",
      winningBid: lot.currentBid,
      winnerId: lot.currentBidderId,
      soldAt: Date.now(),
    });

    // Generate unique order number
    const orderNumber = await generateUniqueOrderNumber(ctx);

    // Calculate fees
    const serviceFee = calculateServiceFee(lot.currentBid);
    const documentationFee = 50_000; // Standard documentation fee
    const subtotal = lot.currentBid;
    const totalAmount = subtotal + serviceFee + documentationFee;

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
      paymentDeadline: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update vehicle status
    await ctx.db.patch(lot.vehicleId, {
      status: "sold",
    });
  } else {
    // No sale
    await ctx.db.patch(lotId, {
      status: "no_sale",
    });

    await ctx.db.patch(lot.vehicleId, {
      status: "unsold",
    });
  }
}

/**
 * Calculate service fee
 */
function calculateServiceFee(bidAmount: number): number {
  if (bidAmount <= 1_000_000) {
    return 75_000;
  } else if (bidAmount <= 5_000_000) {
    return bidAmount * 0.07; // 7%
  } else if (bidAmount <= 15_000_000) {
    return bidAmount * 0.06; // 6%
  } else {
    return bidAmount * 0.05; // 5%
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
      await ctx.db.patch(auction._id, {
        status: "live",
        actualStart: now,
      });

      // Activate first lot
      const firstLot = await ctx.db
        .query("auctionLots")
        .withIndex("by_auction", (q) => q.eq("auctionId", auction._id))
        .order("asc")
        .first();

      if (firstLot && firstLot.lotDuration) {
        const endsAt = now + firstLot.lotDuration;
        await ctx.db.patch(firstLot._id, {
          status: "active",
          startsAt: now,
          endsAt,
        });

        await ctx.db.patch(firstLot.vehicleId, {
          status: "in_auction",
        });
      }
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
      const nextLot = await ctx.db
        .query("auctionLots")
        .withIndex("by_auction", (q) => q.eq("auctionId", lot.auctionId))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .order("asc")
        .first();

      if (nextLot && nextLot.lotDuration) {
        const endsAt = now + nextLot.lotDuration;
        await ctx.db.patch(nextLot._id, {
          status: "active",
          startsAt: now,
          endsAt,
        });

        await ctx.db.patch(nextLot.vehicleId, {
          status: "in_auction",
        });
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
    // Import auth helpers
    const { requireAuth, requireSeller } = await import("./lib/auth");

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
