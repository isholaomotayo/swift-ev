import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, getAuthUserOrNull } from "./lib/auth";

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

/**
 * Get comprehensive Admin Dashboard Overview stats, sneak peeks, pending action queues, and analytics.
 * Admin/Superadmin only.
 */
export const getAdminDashboardOverview = query({
  args: {
    token: v.string(),
    timeRange: v.optional(v.string()), // "7d" | "30d" | "90d" | "1y"
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx, args.token);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return null;
    }

    const now = Date.now();
    const rangeStr = args.timeRange || "30d";
    let daysBack = 30;
    if (rangeStr === "7d") daysBack = 7;
    if (rangeStr === "90d") daysBack = 90;
    if (rangeStr === "1y") daysBack = 365;
    const startTime = now - daysBack * 24 * 60 * 60 * 1000;

    // Collect data across all tables
    const allVehicles = await ctx.db.query("vehicles").collect();
    const allAuctions = await ctx.db.query("auctions").collect();
    const allOrders = await ctx.db.query("orders").collect();
    const allUsers = await ctx.db.query("users").collect();
    const allPayments = await ctx.db.query("payments").collect();
    const allEmails = await ctx.db.query("transactionalEmails").collect();
    const exchangeRates = await ctx.db.query("exchangeRates").collect();

    // 1. Vehicle KPIs & Sneak Peek
    const pendingVehicles = allVehicles.filter((v) => v.status === "pending_approval");
    const approvedVehicles = allVehicles.filter((v) => v.status === "approved");
    const inAuctionVehicles = allVehicles.filter((v) => v.status === "in_auction");
    const soldVehicles = allVehicles.filter((v) => v.status === "sold");
    const draftVehicles = allVehicles.filter((v) => v.status === "draft");

    const pendingVehiclesSneak = pendingVehicles
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .map((v) => ({
        id: v._id,
        title: `${v.year} ${v.make} ${v.model}`,
        make: v.make,
        model: v.model,
        year: v.year,
        price: v.startingBid,
        buyNowPrice: v.buyItNowPrice,
        status: v.status,
        createdAt: v.createdAt,
        mainImage: null,
      }));

    // 2. Auction KPIs & Sneak Peek
    const liveAuctions = allAuctions.filter((a) => a.status === "live");
    const endedAuctions = allAuctions.filter((a) => a.status === "ended");
    const scheduledAuctions = allAuctions.filter((a) => a.status === "scheduled");
    const totalBidsCount = allAuctions.reduce((sum, a) => sum + (a.totalBids || 0), 0);
    
    // Period specific filters for auctions
    const periodCompletedAuctions = endedAuctions.filter((a) => (a.scheduledEnd || 0) >= startTime);
    const periodBidsCount = allAuctions
      .filter(a => a._creationTime >= startTime || (a.scheduledStart || 0) >= startTime)
      .reduce((sum, a) => sum + (a.totalBids || 0), 0); // Note: ideally we'd filter bids by time, but this is a rough approx for the period based on auction creation/start time.

    const liveAuctionsSneak = liveAuctions.map((a) => ({
      id: a._id,
      title: a.name,
      status: a.status,
      startTime: a.scheduledStart,
      endTime: a.scheduledEnd,
      totalLots: a.totalLots || 0,
      totalBids: a.totalBids || 0,
    }));

    const completedAuctionsSneak = endedAuctions
      .sort((a, b) => (b.scheduledEnd || 0) - (a.scheduledEnd || 0))
      .slice(0, 4)
      .map((a) => ({
        id: a._id,
        title: a.name,
        status: a.status,
        endTime: a.scheduledEnd,
        totalLots: a.totalLots || 0,
        totalBids: a.totalBids || 0,
      }));

    // 3. Orders KPIs & Sneak Peek
    const ordersInRange = allOrders.filter((o) => o._creationTime >= startTime);
    const pendingOrders = allOrders.filter((o) =>
      ["pending_payment", "payment_partial", "payment_complete", "processing"].includes(o.status)
    );
    const completedOrders = allOrders.filter((o) =>
      ["shipped", "in_transit", "customs_clearance", "cleared", "out_for_delivery", "delivered"].includes(o.status)
    );
    const totalRevenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const recentOrdersSneak = allOrders
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5)
      .map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber || o._id,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: "USD",
        createdAt: o._creationTime,
        vehicleDetails: `Order ${o.orderNumber}`,
      }));

    // 4. User KPIs & KYC Sneak Peek
    const pendingKycUsers = allUsers.filter((u) => u.kycStatus === "pending");
    const activeUsersCount = allUsers.filter((u) => u.status === "active").length;
    const buyerCount = allUsers.filter((u) => u.role === "buyer").length;
    const sellerCount = allUsers.filter((u) => u.role === "seller").length;
    const adminCount = allUsers.filter((u) => u.role === "admin" || u.role === "superadmin").length;

    const pendingKycSneak = pendingKycUsers
      .sort((a, b) => (b.kycSubmittedAt || b.createdAt) - (a.kycSubmittedAt || a.createdAt))
      .slice(0, 4)
      .map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        submittedAt: u.kycSubmittedAt || u.createdAt,
      }));

    // 5. Payment KPIs & Sneak Peek
    const pendingBankPayments = allPayments.filter(
      (p) => p.provider === "bank_transfer" && p.status === "pending"
    );
    const pendingBankAmount = pendingBankPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const pendingPaymentsSneak = pendingBankPayments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .map((p) => ({
        id: p._id,
        reference: p.providerReference || p._id,
        amount: p.amount,
        currency: p.currency || "NGN",
        paymentMethod: p.provider,
        paymentType: p.paymentType,
        createdAt: p.createdAt,
      }));

    // 6. Emails Sneak Peek
    const pendingEmails = allEmails.filter((e) => e.status === "pending_review");
    const pendingEmailsSneak = pendingEmails
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .map((e) => ({
        id: e._id,
        emailType: e.emailType,
        recipientEmail: e.recipientEmail,
        createdAt: e.createdAt,
        status: e.status,
      }));

    // 7. Time-series chart revenue data
    const revenueTrend: { period: string; revenue: number; ordersCount: number }[] = [];
    const points = daysBack <= 7 ? 7 : daysBack <= 30 ? 30 : 12;
    const intervalMs = (daysBack * 24 * 60 * 60 * 1000) / points;
    for (let i = points - 1; i >= 0; i--) {
      const bucketStart = now - (i + 1) * intervalMs;
      const bucketEnd = now - i * intervalMs;
      const bucketOrders = allOrders.filter(
        (o) => o._creationTime >= bucketStart && o._creationTime < bucketEnd && o.status !== "cancelled"
      );
      const bucketRev = bucketOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const labelDate = new Date(bucketEnd);
      const label =
        daysBack <= 30
          ? `${labelDate.getMonth() + 1}/${labelDate.getDate()}`
          : `${labelDate.getFullYear()}-${String(labelDate.getMonth() + 1).padStart(2, "0")}`;

      revenueTrend.push({
        period: label,
        revenue: bucketRev,
        ordersCount: bucketOrders.length,
      });
    }

    return {
      timeframe: rangeStr,
      kpis: {
        vehicles: {
          total: allVehicles.length,
          periodAdded: allVehicles.filter(v => v.createdAt >= startTime).length,
          pendingApproval: pendingVehicles.length,
          approved: approvedVehicles.length,
          inAuction: inAuctionVehicles.length,
          sold: soldVehicles.length,
          draft: draftVehicles.length,
        },
        auctions: {
          total: allAuctions.length,
          live: liveAuctions.length,
          completed: endedAuctions.length,
          scheduled: scheduledAuctions.length,
          totalBids: totalBidsCount,
          periodCompleted: periodCompletedAuctions.length,
          periodBids: periodBidsCount,
        },
        orders: {
          total: allOrders.length,
          periodTotal: ordersInRange.length,
          pending: pendingOrders.length,
          completed: completedOrders.length,
          totalRevenue,
          periodRevenue: ordersInRange
            .filter((o) => o.status !== "cancelled")
            .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        },
        users: {
          total: allUsers.length,
          periodNew: allUsers.filter(u => u.createdAt >= startTime).length,
          active: activeUsersCount,
          pendingKyc: pendingKycUsers.length,
          buyers: buyerCount,
          sellers: sellerCount,
          admins: adminCount,
        },
        payments: {
          pendingCount: pendingBankPayments.length,
          pendingAmount: pendingBankAmount,
        },
        emails: {
          pendingReviewCount: pendingEmails.length,
        },
        exchangeRates: exchangeRates.map((r) => ({
          pair: `${r.fromCurrency}/${r.toCurrency}`,
          rate: r.rate,
        })),
      },
      sneakPeeks: {
        pendingVehicles: pendingVehiclesSneak,
        liveAuctions: liveAuctionsSneak,
        completedAuctions: completedAuctionsSneak,
        recentOrders: recentOrdersSneak,
        pendingPayments: pendingPaymentsSneak,
        pendingKycUsers: pendingKycSneak,
        pendingEmails: pendingEmailsSneak,
      },
      charts: {
        revenueTrend,
        vehicleStatusBreakdown: [
          { name: "Approved", count: approvedVehicles.length, color: "bg-emerald-500" },
          { name: "In Auction", count: inAuctionVehicles.length, color: "bg-electric-blue" },
          { name: "Sold", count: soldVehicles.length, color: "bg-purple-500" },
          { name: "Pending", count: pendingVehicles.length, color: "bg-warning-amber" },
          { name: "Draft", count: draftVehicles.length, color: "bg-slate-400" },
        ],
      },
    };
  },
});

/**
 * Get comprehensive Vendor Dashboard Overview stats, sneak peeks, pending action queues, and analytics.
 * Seller only.
 */
export const getVendorDashboardOverview = query({
  args: {
    token: v.string(),
    timeRange: v.optional(v.string()), // "7d" | "30d" | "90d" | "1y"
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx, args.token);
    if (!user || user.role !== "seller") {
      return null;
    }

    const now = Date.now();
    const rangeStr = args.timeRange || "30d";
    let daysBack = 30;
    if (rangeStr === "7d") daysBack = 7;
    if (rangeStr === "90d") daysBack = 90;
    if (rangeStr === "1y") daysBack = 365;
    const startTime = now - daysBack * 24 * 60 * 60 * 1000;

    // Filter tables by sellerId
    const vendorVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
      .collect();

    // To get auctions for the vendor, we can find lots related to their vehicles
    const vehicleIds = vendorVehicles.map(v => v._id);
    const vendorLots = [];
    const vendorAuctions = new Set();
    const vendorOrders = [];

    // Since we don't have an index directly mapping user to lots they sell, we will do a scan or use the index by_vehicle
    for (const vid of vehicleIds) {
      const lots = await ctx.db.query("auctionLots").withIndex("by_vehicle", q => q.eq("vehicleId", vid)).collect();
      for (const lot of lots) {
        vendorLots.push(lot);
        vendorAuctions.add(lot.auctionId);
      }
      
      const orders = await ctx.db.query("orders").withIndex("by_vehicle", q => q.eq("vehicleId", vid)).collect();
      vendorOrders.push(...orders);
    }

    // KPIs
    const pendingVehicles = vendorVehicles.filter(v => v.status === "pending_approval");
    const approvedVehicles = vendorVehicles.filter(v => v.status === "approved");
    const inAuctionVehicles = vendorVehicles.filter(v => v.status === "in_auction");
    const soldVehicles = vendorVehicles.filter(v => v.status === "sold");
    const draftVehicles = vendorVehicles.filter(v => v.status === "draft");

    // Sneak Peek: Vehicles
    const recentVehicles = await Promise.all(
      vendorVehicles
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(async (v) => {
          const images = await ctx.db.query("vehicleImages").withIndex("by_vehicle", q => q.eq("vehicleId", v._id)).collect();
          const heroImage = images.find(img => img.imageType === "hero")?.imageUrl || images[0]?.imageUrl;
          return { ...v, heroImage };
        })
    );

    // Sneak Peek: Orders
    const recentOrders = vendorOrders
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);

    const pendingOrders = vendorOrders.filter((o) =>
      ["pending_payment", "payment_partial"].includes(o.status)
    );
    const completedOrders = vendorOrders.filter((o) =>
      ["shipped", "in_transit", "customs_clearance", "cleared", "out_for_delivery", "delivered"].includes(o.status)
    );
    const totalRevenue = vendorOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // Time-series chart revenue data
    const revenueTrend: { period: string; revenue: number; ordersCount: number }[] = [];
    const points = daysBack <= 7 ? 7 : daysBack <= 30 ? 30 : 12;
    const intervalMs = (daysBack * 24 * 60 * 60 * 1000) / points;
    for (let i = points - 1; i >= 0; i--) {
      const bucketStart = now - (i + 1) * intervalMs;
      const bucketEnd = now - i * intervalMs;
      const bucketOrders = vendorOrders.filter(
        (o) => o._creationTime >= bucketStart && o._creationTime < bucketEnd && o.status !== "cancelled"
      );
      const bucketRev = bucketOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const labelDate = new Date(bucketEnd);
      const label =
        daysBack <= 30
          ? `${labelDate.getMonth() + 1}/${labelDate.getDate()}`
          : `${labelDate.getFullYear()}-${String(labelDate.getMonth() + 1).padStart(2, "0")}`;

      revenueTrend.push({
        period: label,
        revenue: bucketRev,
        ordersCount: bucketOrders.length,
      });
    }

    return {
      timeframe: rangeStr,
      kpis: {
        totalInventory: vendorVehicles.length,
        pendingApproval: pendingVehicles.length,
        activeInAuction: inAuctionVehicles.length,
        sold: soldVehicles.length,
        totalRevenue,
        pendingPayments: pendingOrders.length,
      },
      sneakPeeks: {
        recentVehicles,
        recentOrders,
      },
      charts: {
        revenueTrend,
        vehicleStatusBreakdown: [
          { name: "Approved", count: approvedVehicles.length, color: "bg-emerald-500" },
          { name: "In Auction", count: inAuctionVehicles.length, color: "bg-electric-blue" },
          { name: "Sold", count: soldVehicles.length, color: "bg-purple-500" },
          { name: "Pending", count: pendingVehicles.length, color: "bg-warning-amber" },
          { name: "Draft", count: draftVehicles.length, color: "bg-slate-400" },
        ],
      },
    };
  },
});

/**
 * Get comprehensive Buyer Dashboard Overview stats, sneak peeks, pending action queues.
 * Buyer only.
 */
export const getBuyerDashboardOverview = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx, args.token);
    if (!user) {
      return null; // Both buyer and seller/admin might use the dashboard
    }

    // Get bids
    const userBids = await ctx.db
      .query("bids")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    
    // Sort and get unique lots for active bids
    const activeBidsCount = userBids.filter(b => b.status === "active" || b.status === "winning").length;

    // We can enrich bids with vehicles for the sneak peek
    const recentBids = await Promise.all(
      userBids
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(async (bid) => {
          const lot = await ctx.db.get(bid.auctionLotId);
          let vehicle = null;
          if (lot) {
            vehicle = await ctx.db.get(lot.vehicleId);
            if (vehicle) {
              const images = await ctx.db.query("vehicleImages").withIndex("by_vehicle", q => q.eq("vehicleId", vehicle!._id)).collect();
              const heroImage = images.find(img => img.imageType === "hero")?.imageUrl || images[0]?.imageUrl;
              (vehicle as any).heroImage = heroImage;
            }
          }
          return { bid, lot, vehicle };
        })
    );

    // Get Watchlist
    const watchlist = await ctx.db
      .query("watchlist")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const recentWatchlist = await Promise.all(
      watchlist
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 5)
        .map(async (item) => {
          const vehicle = await ctx.db.get(item.vehicleId);
          if (vehicle) {
            const images = await ctx.db.query("vehicleImages").withIndex("by_vehicle", q => q.eq("vehicleId", vehicle._id)).collect();
            const heroImage = images.find(img => img.imageType === "hero")?.imageUrl || images[0]?.imageUrl;
            (vehicle as any).heroImage = heroImage;
          }
          // Check for active lot
          let lot = null;
          if (vehicle) {
            lot = await ctx.db
              .query("auctionLots")
              .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
              .filter((q) =>
                q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "active"))
              )
              .first();
          }
          return { item, vehicle, lot };
        })
    );

    // Get Orders
    const userOrders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeOrders = userOrders.filter(o => !["delivered", "cancelled", "refunded"].includes(o.status));
    
    const recentOrders = userOrders
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);

    const pendingPaymentOrders = userOrders.filter(o => ["pending_payment", "payment_partial"].includes(o.status));
    
    const totalSpent = userOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.paidAmount || 0), 0);

    return {
      kpis: {
        walletBalance: user.walletBalance || 0,
        walletReserved: user.reservedBalance || 0,
        activeBids: activeBidsCount,
        totalBids: userBids.length,
        watchlistCount: watchlist.length,
        activeOrders: activeOrders.length,
        totalSpent,
      },
      sneakPeeks: {
        recentBids,
        recentWatchlist,
        recentOrders,
      },
      actionRequired: {
        missingKyc: false,
        pendingPayments: pendingPaymentOrders.length,
      },
    };
  },
});

