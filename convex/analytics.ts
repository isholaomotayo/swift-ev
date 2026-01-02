import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin } from "./lib/auth";

/**
 * Get platform-wide statistics
 * Admin/Superadmin only
 */
export const getPlatformStats = query({
  args: {
    token: v.string(),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const now = Date.now();
    const start = args.dateRange?.start || now - 30 * 24 * 60 * 60 * 1000; // Last 30 days
    const end = args.dateRange?.end || now;

    // Get all data
    const allUsers = await ctx.db.query("users").collect();
    const allVehicles = await ctx.db.query("vehicles").collect();
    const allOrders = await ctx.db.query("orders").collect();
    const allAuctions = await ctx.db.query("auctions").collect();

    // Filter by date range
    const usersInRange = allUsers.filter((u) => u.createdAt >= start && u.createdAt <= end);
    const ordersInRange = allOrders.filter(
      (o) => o._creationTime >= start && o._creationTime <= end
    );

    // Calculate revenue
    const totalRevenue = ordersInRange
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Vehicle stats
    const vehiclesListed = allVehicles.length;
    const vehiclesSold = allVehicles.filter((v) => v.status === "sold").length;
    const vehiclesInAuction = allVehicles.filter((v) => v.status === "in_auction").length;

    // User stats
    const totalUsers = allUsers.length;
    const newUsers = usersInRange.length;
    const activeUsers = allUsers.filter((u) => u.status === "active").length;

    // Auction stats
    const totalAuctions = allAuctions.length;
    const liveAuctions = allAuctions.filter((a) => a.status === "live").length;
    const completedAuctions = allAuctions.filter((a) => a.status === "ended").length;

    return {
      revenue: {
        total: totalRevenue,
        ordersCount: ordersInRange.length,
      },
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
      },
      vehicles: {
        listed: vehiclesListed,
        sold: vehiclesSold,
        inAuction: vehiclesInAuction,
      },
      auctions: {
        total: totalAuctions,
        live: liveAuctions,
        completed: completedAuctions,
      },
    };
  },
});

/**
 * Get revenue metrics with breakdown
 * Admin/Superadmin only
 */
export const getRevenueMetrics = query({
  args: {
    token: v.string(),
    dateRange: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const now = Date.now();
    const start = args.dateRange?.start || now - 30 * 24 * 60 * 60 * 1000;
    const end = args.dateRange?.end || now;
    const groupBy = args.groupBy || "day";

    // Get orders in range
    const orders = await ctx.db.query("orders").collect();
    const ordersInRange = orders.filter(
      (o) => o._creationTime >= start && o._creationTime <= end && o.status !== "cancelled"
    );

    // Group by time period
    const revenueByPeriod: { [key: string]: number } = {};

    for (const order of ordersInRange) {
      const date = new Date(order._creationTime);
      let key: string;

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!revenueByPeriod[key]) {
        revenueByPeriod[key] = 0;
      }
      revenueByPeriod[key] += order.totalAmount || 0;
    }

    // Convert to array and sort
    const chartData = Object.entries(revenueByPeriod)
      .map(([period, revenue]) => ({ period, revenue }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return chartData;
  },
});

/**
 * Get vehicle metrics and insights
 * Admin/Superadmin only
 */
export const getVehicleMetrics = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const allVehicles = await ctx.db.query("vehicles").collect();

    // Popular makes
    const makeCount: { [key: string]: number } = {};
    for (const vehicle of allVehicles) {
      if (!makeCount[vehicle.make]) {
        makeCount[vehicle.make] = 0;
      }
      makeCount[vehicle.make]++;
    }

    const topMakes = Object.entries(makeCount)
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average prices by make (for sold vehicles)
    const soldVehicles = allVehicles.filter((v) => v.status === "sold");
    const priceByMake: { [key: string]: { total: number; count: number } } = {};

    for (const vehicle of soldVehicles) {
      // Get auction lot to find selling price
      const lot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .filter((q) => q.eq(q.field("status"), "sold"))
        .first();

      if (lot && lot.winningBid) {
        if (!priceByMake[vehicle.make]) {
          priceByMake[vehicle.make] = { total: 0, count: 0 };
        }
        priceByMake[vehicle.make].total += lot.winningBid;
        priceByMake[vehicle.make].count++;
      }
    }

    const avgPriceByMake = Object.entries(priceByMake)
      .map(([make, data]) => ({
        make,
        avgPrice: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 10);

    // Status breakdown
    const statusBreakdown = {
      draft: allVehicles.filter((v) => v.status === "draft").length,
      pending: allVehicles.filter((v) => v.status === "pending_approval").length,
      approved: allVehicles.filter((v) => v.status === "approved").length,
      inAuction: allVehicles.filter((v) => v.status === "in_auction").length,
      sold: allVehicles.filter((v) => v.status === "sold").length,
      unsold: allVehicles.filter((v) => v.status === "unsold").length,
    };

    return {
      topMakes,
      avgPriceByMake,
      statusBreakdown,
      totalVehicles: allVehicles.length,
    };
  },
});

/**
 * Get user growth metrics
 * Admin/Superadmin only
 */
export const getUserMetrics = query({
  args: {
    token: v.string(),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const monthsBack = args.months || 6;
    const allUsers = await ctx.db.query("users").collect();

    // Group registrations by month
    const registrationsByMonth: { [key: string]: number } = {};

    for (const user of allUsers) {
      const date = new Date(user.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!registrationsByMonth[monthKey]) {
        registrationsByMonth[monthKey] = 0;
      }
      registrationsByMonth[monthKey]++;
    }

    const registrationTrend = Object.entries(registrationsByMonth)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-monthsBack);

    // Membership distribution
    const membershipDistribution = {
      guest: allUsers.filter((u) => u.membershipTier === "guest").length,
      basic: allUsers.filter((u) => u.membershipTier === "basic").length,
      premier: allUsers.filter((u) => u.membershipTier === "premier").length,
      business: allUsers.filter((u) => u.membershipTier === "business").length,
    };

    // KYC completion rate
    const kycApproved = allUsers.filter((u) => u.kycStatus === "approved").length;
    const kycCompletionRate = allUsers.length > 0 ? (kycApproved / allUsers.length) * 100 : 0;

    // Active vs inactive
    const activeUsers = allUsers.filter((u) => u.status === "active").length;
    const inactiveUsers = allUsers.length - activeUsers;

    return {
      registrationTrend,
      membershipDistribution,
      kycCompletionRate,
      activeVsInactive: {
        active: activeUsers,
        inactive: inactiveUsers,
      },
      totalUsers: allUsers.length,
    };
  },
});

/**
 * Get auction performance metrics
 * Admin/Superadmin only
 */
export const getAuctionMetrics = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const allAuctions = await ctx.db.query("auctions").collect();
    const allLots = await ctx.db.query("auctionLots").collect();
    const allBids = await ctx.db.query("bids").collect();

    // Calculate average lots per auction
    const avgLotsPerAuction =
      allAuctions.length > 0 ? allLots.length / allAuctions.length : 0;

    // Sell-through rate
    const soldLots = allLots.filter((l) => l.status === "sold").length;
    const completedLots = allLots.filter((l) =>
      ["sold", "no_sale"].includes(l.status)
    ).length;
    const sellThroughRate = completedLots > 0 ? (soldLots / completedLots) * 100 : 0;

    // Average bids per lot
    const avgBidsPerLot = allLots.length > 0 ? allBids.length / allLots.length : 0;

    // Average winning bid vs starting bid
    const soldLotsWithBids = allLots.filter((l) => l.status === "sold" && l.winningBid);
    let totalWinningBid = 0;
    let totalStartingBid = 0;

    for (const lot of soldLotsWithBids) {
      totalWinningBid += lot.winningBid || 0;
      totalStartingBid += lot.startingBid || 0;
    }

    const avgWinningBid = soldLotsWithBids.length > 0 ? totalWinningBid / soldLotsWithBids.length : 0;
    const avgStartingBid = soldLotsWithBids.length > 0 ? totalStartingBid / soldLotsWithBids.length : 0;
    const avgPremiumPercent =
      avgStartingBid > 0 ? ((avgWinningBid - avgStartingBid) / avgStartingBid) * 100 : 0;

    // Top performing auctions
    const auctionsWithRevenue = await Promise.all(
      allAuctions.slice(0, 10).map(async (auction) => {
        const lots = allLots.filter((l) => l.auctionId === auction._id);
        const revenue = lots.reduce((sum, l) => sum + (l.winningBid || 0), 0);
        return {
          name: auction.name,
          revenue,
          lotsCount: lots.length,
          soldCount: lots.filter((l) => l.status === "sold").length,
        };
      })
    );

    const topAuctions = auctionsWithRevenue
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalAuctions: allAuctions.length,
      avgLotsPerAuction,
      sellThroughRate,
      avgBidsPerLot,
      avgWinningBid,
      avgStartingBid,
      avgPremiumPercent,
      topAuctions,
    };
  },
});
