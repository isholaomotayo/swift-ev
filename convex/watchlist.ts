import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

/**
 * Add a vehicle to user's watchlist
 */
export const addToWatchlist = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const user = await requireAuth(ctx, args.token);

    // Validate vehicle exists
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if already in watchlist
    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
      .first();

    if (existing) {
      return { success: true, message: "Already in watchlist", watchlistId: existing._id };
    }

    // Add to watchlist
    const watchlistId = await ctx.db.insert("watchlist", {
      userId: user._id,
      vehicleId: args.vehicleId,
      addedAt: Date.now(),
    });

    return { success: true, watchlistId };
  },
});

/**
 * Remove a vehicle from user's watchlist
 */
export const removeFromWatchlist = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    const user = await requireAuth(ctx, args.token);

    // Find watchlist item
    const watchlistItem = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
      .first();

    if (!watchlistItem) {
      throw new Error("Vehicle not in watchlist");
    }

    // Remove from watchlist
    await ctx.db.delete(watchlistItem._id);

    return { success: true };
  },
});

/**
 * Get user's watchlist with vehicle details
 * Optimized to avoid N+1 queries by batching all database operations
 */
export const getWatchlist = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authentication (returns empty array if invalid instead of throwing)
    let userId: Id<"users">;
    try {
      const user = await requireAuth(ctx, args.token);
      userId = user._id;
    } catch {
      return [];
    }

    // Get watchlist items
    const watchlistItems = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    if (watchlistItems.length === 0) {
      return [];
    }

    // Batch fetch all vehicles (O(1) operation)
    const vehicleIds = watchlistItems.map((item) => item.vehicleId);
    const vehicles = await Promise.all(
      vehicleIds.map((id) => ctx.db.get(id))
    );
    const vehicleMap = new Map(
      vehicles
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map((v) => [v._id, v])
    );

    // Batch fetch first image for each vehicle (O(n) but parallel)
    const imagePromises = vehicleIds.map((vehicleId) =>
      ctx.db
        .query("vehicleImages")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .order("asc")
        .first()
    );
    const images = await Promise.all(imagePromises);
    const imageMap = new Map<Id<"vehicles">, { imageUrl: string | Id<"_storage"> }>();
    images.forEach((img, i) => {
      if (img !== null && vehicleIds[i]) {
        imageMap.set(vehicleIds[i], img);
      }
    });

    // Batch fetch active auction lots (O(n) but parallel)
    const lotPromises = vehicleIds.map((vehicleId) =>
      ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first()
    );
    const lots = await Promise.all(lotPromises);
    const lotMap = new Map<Id<"vehicles">, NonNullable<typeof lots[0]>>();
    lots.forEach((lot, i) => {
      if (lot !== null && vehicleIds[i]) {
        lotMap.set(vehicleIds[i], lot);
      }
    });

    // Map results (O(n) in-memory operation)
    return watchlistItems
      .map((item) => {
        const vehicle = vehicleMap.get(item.vehicleId);
        if (!vehicle) return null;

        const image = imageMap.get(vehicle._id);
        const auctionLot = lotMap.get(vehicle._id);

        return {
          _id: item._id,
          addedAt: item.addedAt,
          vehicle: {
            ...vehicle,
            image: image?.imageUrl,
            auctionLot: auctionLot
              ? {
                  _id: auctionLot._id,
                  currentBid: auctionLot.currentBid,
                  bidCount: auctionLot.bidCount,
                  endsAt: auctionLot.endsAt,
                }
              : null,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  },
});

/**
 * Check if vehicle is in user's watchlist
 */
export const isInWatchlist = query({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Validate authentication
    let userId: Id<"users">;
    try {
      const user = await requireAuth(ctx, args.token);
      userId = user._id;
    } catch {
      return false;
    }

    // Check if in watchlist
    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
      .first();

    return !!existing;
  },
});

