import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { calculateBidReserveAmountKobo, buyingPowerFromWalletKobo } from "./lib/purchaseFlow";
import { internal } from "./_generated/api";

// Query limits - imported from constants would require client-side import
// Keeping local constants for server-side code
const MAX_BIDS_PER_LOT = 100;
const MAX_USER_BIDS = 50;

/**
 * Place a manual bid on an auction lot
 */
export const placeBid = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
    amount: v.number(),
    expectedCurrentBid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized - please log in");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check user status
    if (user.status !== "active") {
      throw new Error("Your account is not active. Please complete verification.");
    }

    // Get auction lot
    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Auction lot not found");
    }

    // Validate lot is active or pending (pre-bid)
    if (lot.status !== "active" && lot.status !== "pending") {
      throw new Error("This auction is not currently open for bidding");
    }

    const auction = await ctx.db.get(lot.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status === "paused") {
      throw new Error("Bidding is paused while the auction is paused");
    }
    if (lot.status === "active" && auction.status !== "live") {
      throw new Error("This auction is not currently live for bidding");
    }
    if (lot.status === "pending" && auction.status !== "scheduled" && auction.status !== "live") {
      throw new Error("This auction is not open for pre-bidding");
    }

    // Get vehicle to check restrictions
    const vehicle = await ctx.db.get(lot.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // 1. Role Restriction: Individual buyers cannot bid on salvage/damaged vehicles
    const isIndividual = user.membershipTier === "guest" || user.membershipTier === "basic" || user.membershipTier === "premier"; // Assuming business is the only 'business' tier
    const isDamaged =
      vehicle.condition === "salvage" ||
      vehicle.titleType === "salvage" ||
      vehicle.titleType === "export_only" ||
      vehicle.titleType === "rebuilt";

    if (isIndividual && isDamaged) {
      throw new Error(
        "Restricted: Individual accounts cannot bid on salvage/export-only vehicles. Please upgrade to a Business account."
      );
    }

    // Check if auction has ended (only for live auctions)
    if (lot.status === "active" && lot.endsAt && lot.endsAt < Date.now()) {
      throw new Error("This auction has already ended");
    }

    // Optimistic concurrency control to prevent race conditions
    if (args.expectedCurrentBid !== undefined && lot.currentBid !== args.expectedCurrentBid) {
      throw new Error("The current bid has changed. Please refresh and try again.");
    }

    // Validate bid amount
    const minimumBid = lot.currentBid + (lot.bidIncrement || 100);
    if (args.amount < minimumBid) {
      throw new Error(`Bid must be at least ${minimumBid}`);
    }

    // Check 10% wallet balance requirement (FEAT-001)
    const walletBalance = user.walletBalance ?? 0;
    const requiredReserve = calculateBidReserveAmountKobo(args.amount);
    if (walletBalance < requiredReserve) {
      throw new Error(
        `Insufficient wallet balance. Need ₦${(requiredReserve / 100).toLocaleString()} (10% of bid) but only have ₦${(walletBalance / 100).toLocaleString()}. Please fund your wallet.`
      );
    }

    // Check user's buying power derived from available wallet (Naira)
    const buyingPower = buyingPowerFromWalletKobo(walletBalance);
    if (args.amount > buyingPower) {
      throw new Error(
        `Bid exceeds your buying power of ₦${buyingPower.toLocaleString()}. Fund your wallet to increase buying power.`
      );
    }

    // Check daily bid limit
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Reset daily bids if last reset was more than 24 hours ago
    if (user.lastBidResetAt < oneDayAgo) {
      await ctx.db.patch(session.userId, {
        dailyBidsUsed: 0,
        lastBidResetAt: now,
      });
    }

    // Check bid limits based on membership tier
    const bidLimits = {
      guest: 0,
      basic: 3,
      premier: 10,
      business: Infinity,
    };

    const currentDailyBids = user.lastBidResetAt < oneDayAgo ? 0 : user.dailyBidsUsed;

    if (currentDailyBids >= bidLimits[user.membershipTier]) {
      throw new Error(`You've reached your daily bid limit. Upgrade your membership for more bids.`);
    }

    // Create bid
    const bidId = await ctx.db.insert("bids", {
      auctionLotId: args.lotId,
      userId: session.userId,
      bidAmount: args.amount,
      bidType: "live",
      status: "active",
      createdAt: Date.now(),
    });

    // Update lot with new current bid
    await ctx.db.patch(args.lotId, {
      currentBid: args.amount,
      currentBidderId: session.userId,
      bidCount: lot.bidCount + 1,
    });

    // Move funds from available to reserved (locking the 10% reserve)
    const newBalance = walletBalance - requiredReserve;
    const newReserved = (user.reservedBalance ?? 0) + requiredReserve;

    await ctx.db.patch(session.userId, {
      walletBalance: newBalance,
      reservedBalance: newReserved,
      buyingPower: buyingPowerFromWalletKobo(newBalance),
      updatedAt: Date.now(),
    });

    // Create transaction record for reserving funds
    const reference = `BR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await ctx.db.insert("walletTransactions", {
      userId: session.userId,
      type: "bid_reserve",
      amount: requiredReserve,
      currency: "NGN",
      status: "completed",
      reference,
      description: `Bid reserve for ₦${args.amount.toLocaleString()} bid`,
      relatedBidId: bidId,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Mark previous bids as outbid and release their reserved funds
    const previousBids = await ctx.db
      .query("bids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), bidId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    for (const bid of previousBids) {
      await ctx.db.patch(bid._id, { status: "outbid" });

      // Get user who was outbid
      const outbidUser = await ctx.db.get(bid.userId);
      if (outbidUser) {
        // Calculate the reserve that was held for this outbid amount
        const outbidReserve = calculateBidReserveAmountKobo(bid.bidAmount);
        const userReserved = outbidUser.reservedBalance ?? 0;

        // Release up to what was actually reserved
        const releaseAmount = Math.min(outbidReserve, userReserved);

        if (releaseAmount > 0) {
          // Return reserved funds to active wallet balance
          const restoredWallet = (outbidUser.walletBalance ?? 0) + releaseAmount;
          await ctx.db.patch(bid.userId, {
            walletBalance: restoredWallet,
            reservedBalance: userReserved - releaseAmount,
            buyingPower: buyingPowerFromWalletKobo(restoredWallet),
            updatedAt: Date.now(),
          });

          // Create transaction record for releasing funds
          const releaseReference = `RL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          await ctx.db.insert("walletTransactions", {
            userId: bid.userId,
            type: "bid_release",
            amount: releaseAmount,
            currency: "NGN",
            status: "completed",
            reference: releaseReference,
            description: `Funds released: Outbid on ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            relatedBidId: bid._id,
            createdAt: Date.now(),
            completedAt: Date.now(),
          });
        }

        // Send outbid email notification
        await ctx.scheduler.runAfter(0, internal.emails.sendOutbidEmail, {
          userId: bid.userId,
          email: outbidUser.email,
          firstName: outbidUser.firstName,
          vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          yourBid: bid.bidAmount,
          newBid: args.amount,
          lotId: args.lotId,
          auctionId: lot.auctionId,
        });
      }
    }

    // Increment user's daily bids
    await ctx.db.patch(session.userId, {
      dailyBidsUsed: currentDailyBids + 1,
    });

    // 3. 60-Second Rule (Sniper Protection)
    // If live auction and bid is within last 60 seconds, extend by 60 seconds from NOW
    if (lot.status === "active" && lot.endsAt) {
      const timeLeft = lot.endsAt - Date.now();
      if (timeLeft < 60 * 1000) {
        const newEndsAt = Date.now() + 60 * 1000;
        await ctx.db.patch(lot._id, {
          endsAt: newEndsAt,
        });
        await ctx.scheduler.runAt(newEndsAt, internal.auctions.closeLotAt, {
          lotId: lot._id,
        });
      }
    } else if (lot.status === "pending") {
      // Pre-bid logic: Mark as having bids
      // We don't change status to active yet, that happens when admin starts auction
      // But we might want to update startingBid if this pre-bid is higher?
      // Actually, currentBid is already updated above.
    }

    // TODO: Schedule proxy bid processing
    // TODO: Send outbid notifications

    return {
      success: true,
      bidId,
      newCurrentBid: args.amount,
      message: "Bid placed successfully!",
    };
  },
});

/**
 * Set or update maximum bid for proxy bidding
 */
export const setMaxBid = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
    maxAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized - please log in");
    }

    // Get auction lot
    const lot = await ctx.db.get(args.lotId);
    if (!lot) {
      throw new Error("Auction lot not found");
    }

    // Validate lot is active
    if (lot.status !== "active") {
      throw new Error("This auction is not currently active");
    }

    const auction = await ctx.db.get(lot.auctionId);
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status === "paused") {
      throw new Error("Bidding is paused while the auction is paused");
    }
    if (auction.status !== "live") {
      throw new Error("This auction is not currently live for bidding");
    }

    // Validate max bid amount
    const minimumBid = lot.currentBid + (lot.bidIncrement || 100);
    if (args.maxAmount < minimumBid) {
      throw new Error(`Max bid must be at least ${minimumBid}`);
    }

    // Check if user already has a max bid
    const existingMaxBid = await ctx.db
      .query("maxBids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    if (existingMaxBid) {
      // Update existing max bid
      await ctx.db.patch(existingMaxBid._id, {
        maxAmount: args.maxAmount,
        isActive: true,
        updatedAt: Date.now(),
      });
    } else {
      // Create new max bid
      await ctx.db.insert("maxBids", {
        auctionLotId: args.lotId,
        userId: session.userId,
        maxAmount: args.maxAmount,
        currentProxyBid: lot.currentBid,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // TODO: Trigger proxy bid processing

    return {
      success: true,
      message: `Max bid set to ${args.maxAmount}. We'll automatically bid on your behalf.`,
    };
  },
});

/**
 * Get all bids for a specific auction lot
 */
export const getBidsForLot = query({
  args: {
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .order("desc")
      .take(MAX_BIDS_PER_LOT);

    if (bids.length === 0) {
      return [];
    }

    // Batch fetch all unique user IDs
    const userIds = [...new Set(bids.map((bid) => bid.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter((u): u is NonNullable<typeof u> => u !== null).map((u) => [u._id, u])
    );

    // Map bids with pre-fetched user data
    const bidsWithUsers = bids.map((bid) => {
      const user = userMap.get(bid.userId);
      return {
        _id: bid._id,
        amount: bid.bidAmount,
        bidType: bid.bidType,
        status: bid.status,
        createdAt: bid._creationTime,
        user: user
          ? {
            firstName: user.firstName,
            lastName: user.lastName,
            membershipTier: user.membershipTier,
          }
          : null,
      };
    });

    return bidsWithUsers;
  },
});

/**
 * Get user's active and past bids
 */
export const getUserBids = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return [];
    }

    // Get all user's bids
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(MAX_USER_BIDS);

    if (bids.length === 0) {
      return [];
    }

    // Batch fetch all unique lot IDs
    const lotIds = [...new Set(bids.map((bid) => bid.auctionLotId))];
    const lots = await Promise.all(lotIds.map((id) => ctx.db.get(id)));
    const lotMap = new Map(
      lots.filter((l): l is NonNullable<typeof l> => l !== null).map((l) => [l._id, l])
    );

    // Batch fetch all unique vehicle IDs
    const vehicleIds = [...new Set(lots.filter(Boolean).map((l) => l!.vehicleId))];
    const vehicles = await Promise.all(vehicleIds.map((id) => ctx.db.get(id)));
    const vehicleMap = new Map(
      vehicles
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map((v) => [v._id, v])
    );

    // Batch fetch first image for each vehicle
    const imageQueries = vehicleIds.map((vehicleId) =>
      ctx.db
        .query("vehicleImages")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .order("asc")
        .first()
    );
    const images = await Promise.all(imageQueries);
    const imageMap = new Map(
      images
        .filter((img): img is NonNullable<typeof img> => img !== null)
        .map((img, i) => [vehicleIds[i], img])
    );

    // Map bids with pre-fetched data
    const bidsWithDetails = bids
      .map((bid) => {
        const lot = lotMap.get(bid.auctionLotId);
        if (!lot) {
          console.warn(`Lot ${bid.auctionLotId} not found for bid ${bid._id}`);
          return null;
        }

        const vehicle = vehicleMap.get(lot.vehicleId);
        if (!vehicle) {
          console.warn(`Vehicle ${lot.vehicleId} not found for lot ${lot._id}`);
          return null;
        }

        const image = imageMap.get(vehicle._id);

        return {
          _id: bid._id,
          bid: {
            _id: bid._id,
            amount: bid.bidAmount,
            status: bid.status,
            bidType: bid.bidType,
            createdAt: bid._creationTime,
          },
          lot: {
            _id: lot._id,
            status: lot.status,
            currentBid: lot.currentBid,
            endsAt: lot.endsAt,
            isUserHighBidder: lot.currentBidderId === session.userId,
            lotOrder: lot.lotOrder,
            bidCount: lot.bidCount,
            winningBid: lot.winningBid,
          },
          vehicle: {
            _id: vehicle._id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            lotNumber: vehicle.lotNumber,
            image: image?.imageUrl,
            startingBid: vehicle.startingBid,
          },
        };
      })
      .filter((bid): bid is NonNullable<typeof bid> => bid !== null);

    return bidsWithDetails;
  },
});

/**
 * Get user's max bid for a specific lot
 */
export const getUserMaxBid = query({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    const maxBid = await ctx.db
      .query("maxBids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    return maxBid;
  },
});

/**
 * Process proxy bids for a lot (called after each manual bid)
 * This is an internal mutation that will be triggered by schedulers
 */
export const processProxyBids = internalMutation({
  args: {
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    const lot = await ctx.db.get(args.lotId);
    if (!lot || lot.status !== "active") {
      return;
    }

    // Get all active max bids for this lot, ordered by amount
    const maxBids = await ctx.db
      .query("maxBids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (maxBids.length === 0) {
      return;
    }

    // Sort by max amount descending
    maxBids.sort((a, b) => b.maxAmount - a.maxAmount);

    const highestMaxBid = maxBids[0];
    const secondHighestMaxBid = maxBids[1];

    // If the highest max bid is from current high bidder, do nothing
    if (lot.currentBidderId === highestMaxBid.userId) {
      return;
    }

    // Calculate the new bid amount
    let newBidAmount: number;

    const bidIncrement = lot.bidIncrement || 100;
    if (secondHighestMaxBid) {
      // Beat the second highest by one increment, up to our max
      newBidAmount = Math.min(
        secondHighestMaxBid.maxAmount + bidIncrement,
        highestMaxBid.maxAmount
      );
    } else {
      // No competition, bid current + increment
      newBidAmount = lot.currentBid + bidIncrement;
    }

    // Don't bid if we can't beat the current bid
    if (newBidAmount <= lot.currentBid) {
      return;
    }

    // Place proxy bid
    const bidId = await ctx.db.insert("bids", {
      auctionLotId: args.lotId,
      userId: highestMaxBid.userId,
      bidAmount: newBidAmount,
      bidType: "proxy",
      status: "active",
      createdAt: Date.now(),
    });

    // Update lot
    await ctx.db.patch(args.lotId, {
      currentBid: newBidAmount,
      currentBidderId: highestMaxBid.userId,
      bidCount: lot.bidCount + 1,
    });

    // Mark previous bids as outbid
    const previousBids = await ctx.db
      .query("bids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) =>
        q.and(
          q.neq(q.field("_id"), bidId),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    for (const bid of previousBids) {
      await ctx.db.patch(bid._id, { status: "outbid" });
    }

    // Deactivate max bids that have been exceeded
    for (const maxBid of maxBids) {
      if (maxBid.maxAmount < newBidAmount) {
        await ctx.db.patch(maxBid._id, { isActive: false });
      }
    }
  },
});

/**
 * Cancel a max bid
 */
export const cancelMaxBid = mutation({
  args: {
    token: v.string(),
    lotId: v.id("auctionLots"),
  },
  handler: async (ctx, args) => {
    // Get user from session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const maxBid = await ctx.db
      .query("maxBids")
      .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", args.lotId))
      .filter((q) => q.eq(q.field("userId"), session.userId))
      .first();

    if (maxBid) {
      await ctx.db.patch(maxBid._id, { isActive: false });
    }

    return { success: true, message: "Max bid cancelled" };
  },
});
