import { describe, test, expect } from "bun:test";
import { api, internal } from "../../convex/_generated/api";
import { calculateServiceFee } from "../../lib/buy-now-pricing";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("Reliability: order money and access", () => {
  test("Buy Now order stores whole-naira amounts and totals", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      startingBid: 19_999_999,
      reservePrice: 21_000_000,
      buyNowPrice: 22_000_003,
      status: "approved",
    });

    const purchase = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    const order = await t.run(async (ctx) => ctx.db.get(purchase.orderId));
    expect(order).not.toBeNull();

    const moneyFields = [
      "winningBid",
      "serviceFee",
      "documentationFee",
      "inspectionFee",
      "shippingCost",
      "estimatedDuties",
      "clearanceFee",
      "registrationFee",
      "subtotal",
      "totalAmount",
      "paidAmount",
      "balanceDue",
    ] as const;

    for (const field of moneyFields) {
      const value = order![field];
      if (value === undefined) continue;
      if (!Number.isInteger(value)) {
        throw new Error(`${field} must be whole naira`);
      }
    }

    expect(order!.winningBid).toBe(22_000_003);
    expect(order!.serviceFee).toBe(calculateServiceFee(22_000_003));
    expect(order!.subtotal).toBe(22_000_003);
    expect(order!.balanceDue).toBe(order!.totalAmount);
    expect(order!.paidAmount).toBe(0);
    expect(order!.totalAmount).toBe(
      order!.winningBid +
        order!.serviceFee +
        order!.documentationFee +
        (order!.inspectionFee ?? 0) +
        (order!.shippingCost ?? 0) +
        (order!.clearanceFee ?? 0) +
        (order!.registrationFee ?? 0)
    );
  });

  test("auction win order stores whole-naira amounts", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      startingBid: 20_000_000,
      reservePrice: 20_000_000,
      buyNowPrice: 30_000_000,
    });

    const now = Date.now();
    const auction = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Reliability auction",
      description: "Whole-naira auction order check",
      auctionType: "live",
      bidIncrement: 100_000,
      scheduledStart: now + 60_000,
      scheduledEnd: now + 3_600_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          startingBid: 20_000_000,
          reservePrice: 20_000_000,
          buyItNowPrice: 30_000_000,
          bidIncrement: 100_000,
          lotDuration: 600_000,
        },
      ],
    });

    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId: auction.auctionId,
    });

    const current = await t.query(api.auctions.getCurrentLot, { auctionId: auction.auctionId });
    expect(current?.lot.status).toBe("active");

    await t.mutation(api.bids.placeBid, {
      token: buyer.token,
      lotId: current!.lot._id,
      amount: 23_333_333,
    });

    await t.mutation(api.auctions.advanceLot, {
      token: admin.token,
      auctionId: auction.auctionId,
    });

    const order = await t.run(async (ctx) =>
      ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .first()
    );

    expect(order).not.toBeNull();
    expect(order!.winningBid).toBe(23_333_333);
    expect(order!.serviceFee).toBe(calculateServiceFee(23_333_333));
    expect(order!.totalAmount).toBe(
      order!.winningBid + order!.serviceFee + order!.documentationFee
    );
    expect(Number.isInteger(order!.totalAmount)).toBe(true);
  });

  test("fractional bids are rejected", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      startingBid: 20_000_000,
      reservePrice: 20_000_000,
    });
    const now = Date.now();
    const auction = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Fractional bid guard",
      description: "Reject fractional bids",
      auctionType: "timed",
      bidIncrement: 100_000,
      scheduledStart: now + 60_000,
      scheduledEnd: now + 3_600_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          startingBid: 20_000_000,
          reservePrice: 20_000_000,
          bidIncrement: 100_000,
          lotDuration: 600_000,
        },
      ],
    });
    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId: auction.auctionId,
    });
    const current = await t.query(api.auctions.getCurrentLot, { auctionId: auction.auctionId });

    await expect(
      t.mutation(api.bids.placeBid, {
        token: buyer.token,
        lotId: current!.lot._id,
        amount: 20_500_000.5,
      })
    ).rejects.toThrow("whole naira");
  });

  test("admins can open a buyer's order", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const admin = await seedTestUser(t, { role: "admin" });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      buyNowPrice: 12_000_000,
      reservePrice: 10_000_000,
      startingBid: 9_000_000,
      status: "approved",
    });

    const purchase = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    const asAdmin = await t.query(api.orders.getOrderDetails, {
      token: admin.token,
      orderId: purchase.orderId,
    });
    expect(asAdmin?.order.orderNumber).toBe(purchase.orderNumber);
    expect(asAdmin?.viewerRole).toBe("buyer_or_admin");

    const outsider = await seedTestUser(t, { role: "buyer" });
    await expect(
      t.query(api.orders.getOrderDetails, {
        token: outsider.token,
        orderId: purchase.orderId,
      })
    ).rejects.toThrow();
  });
});

describe("Reliability: auction lifecycle", () => {
  test("a lot that closes without bids becomes no-sale and creates no order", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      startingBid: 18_000_000,
      reservePrice: 20_000_000,
    });
    const now = Date.now();
    const auction = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "No sale auction",
      description: "Lot closes with no bids",
      auctionType: "timed",
      bidIncrement: 100_000,
      scheduledStart: now + 60_000,
      scheduledEnd: now + 3_600_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          startingBid: 18_000_000,
          reservePrice: 20_000_000,
          bidIncrement: 100_000,
          lotDuration: 600_000,
        },
      ],
    });
    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId: auction.auctionId,
    });
    const current = await t.query(api.auctions.getCurrentLot, { auctionId: auction.auctionId });

    await t.run(async (ctx) => {
      await ctx.db.patch(current!.lot._id, { endsAt: Date.now() - 1_000 });
    });
    await t.mutation(internal.auctions.closeLotAt, { lotId: current!.lot._id });

    const lot = await t.run(async (ctx) => ctx.db.get(current!.lot._id));
    expect(lot?.status).toBe("no_sale");
    const vehicle = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicle?.status).toBe("unsold");

    const orders = await t.run(async (ctx) =>
      ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .collect()
    );
    expect(orders).toEqual([]);

    const closedAuction = await t.run(async (ctx) => ctx.db.get(auction.auctionId));
    expect(closedAuction?.status).toBe("ended");
  });
});

describe("Reliability: vendor analytics", () => {
  test("vendor revenue includes Buy Now orders and matches revenue history", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      buyNowPrice: 14_321_987,
      reservePrice: 12_000_000,
      startingBid: 11_000_000,
      status: "approved",
    });

    const purchase = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });
    const order = await t.run(async (ctx) => ctx.db.get(purchase.orderId));

    const stats = await t.query(api.vehicles.getVendorStats, { token: seller.token });
    expect(stats.totalRevenue).toBe(order!.totalAmount);
    expect(stats.averageSalePrice).toBe(order!.totalAmount);

    const history = await t.query(api.vehicles.getVendorRevenueHistory, {
      token: seller.token,
      months: 6,
    });
    const historyTotal = history.reduce((sum, entry) => sum + entry.revenue, 0);
    expect(historyTotal).toBe(order!.totalAmount);
  });

  test("vendor dashboard resolves stored image ids to URLs", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const vehicleId = await seedTestVehicle(t, seller.userId, { status: "approved" });

    const storageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["hero-image-bytes"], { type: "image/png" }))
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("vehicleImages", {
        vehicleId,
        imageUrl: storageId,
        imageType: "hero",
        order: 0,
        uploadedAt: Date.now(),
      });
    });

    const overview = await t.query(api.analytics.getVendorDashboardOverview, {
      token: seller.token,
    });
    const vehicle = overview?.sneakPeeks.recentVehicles.find((v: any) => v._id === vehicleId);
    expect(vehicle?.heroImage).toBeTruthy();
    expect(vehicle?.heroImage).not.toBe(storageId);
    expect(vehicle?.heroImage?.startsWith("http")).toBe(true);
  });

  test("vendor inventory breakdown covers every status and reconciles with totalInventory", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const statuses = [
      "draft",
      "pending_inspection",
      "pending_approval",
      "approved",
      "ready_for_auction",
      "scheduled",
      "in_auction",
      "sold",
      "unsold",
      "withdrawn",
      "rejected",
      "payment_pending",
      "in_transit",
      "delivered",
      "cancelled",
    ] as const;
    for (const status of statuses) {
      await seedTestVehicle(t, seller.userId, { status });
    }

    const overview = await t.query(api.analytics.getVendorDashboardOverview, {
      token: seller.token,
    });
    const counts = overview!.charts.vehicleStatusBreakdown;
    expect(counts.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      overview!.kpis.totalInventory
    );
    expect(overview!.kpis.totalInventory).toBe(statuses.length);
    expect(counts.every((bucket) => bucket.count > 0)).toBe(true);

    const stats = await t.query(api.vehicles.getVendorStats, { token: seller.token });
    expect(overview!.kpis.sold).toBe(stats.sold);
  });

  test("admin inventory breakdown reconciles with the platform vehicle total", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "superadmin" });
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const statuses = ["draft", "approved", "in_auction", "sold", "unsold", "cancelled"] as const;
    for (const status of statuses) {
      await seedTestVehicle(t, seller.userId, { status });
    }

    const overview = await t.query(api.analytics.getAdminDashboardOverview, {
      token: admin.token,
    });
    const counts = overview!.charts.vehicleStatusBreakdown;
    expect(counts.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(
      overview!.kpis.vehicles.total
    );
  });
});
