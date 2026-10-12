import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle, type TestHarness } from "../helpers/convex-test-harness";

/**
 * In-memory ports of the write-path suites that used to be skipped against the live deployment
 * (tests/*.test.ts "[convex writes blocked]"). They run hermetically through convex-test.
 */

async function rejects(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
}

async function liveAuction(t: TestHarness, opts?: { lots?: number }) {
  const admin = await seedTestUser(t, { role: "admin" });
  const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
  const now = Date.now();
  const lots = [];
  const vehicleIds = [];
  for (let i = 1; i <= (opts?.lots ?? 2); i++) {
    const vehicleId = await seedTestVehicle(t, vendor.userId, { buyNowPrice: 30_000_000 });
    vehicleIds.push(vehicleId);
    lots.push({
      vehicleId, lotOrder: i, startingBid: 20_000_000, reservePrice: 25_000_000,
      buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000,
    });
  }
  const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
    token: admin.token, name: "Ops auction", auctionType: "live", bidIncrement: 500_000,
    scheduledStart: now + 3600_000, scheduledEnd: now + 7200_000, lots,
  });
  return { admin, vendor, auctionId, vehicleIds };
}

describe("Auction operations", () => {
  test("pause then advance: only admins, status follows, advancing moves to the next lot", async () => {
    const t = createTestHarness();
    const { admin, auctionId } = await liveAuction(t);
    const buyer = await seedTestUser(t, { role: "buyer" });
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });

    expect(await rejects(() => t.mutation(api.auctions.pauseAuction, { token: buyer.token, auctionId }))).not.toBeNull();
    await t.mutation(api.auctions.pauseAuction, { token: admin.token, auctionId });
    expect((await t.run(async (ctx) => ctx.db.get(auctionId)))?.status).toBe("paused");

    // Bids are refused while paused.
    const lot1 = (await t.query(api.auctions.getCurrentLot, { auctionId }))?.lot;
    expect(await rejects(() => t.mutation(api.bids.placeBid, { token: buyer.token, lotId: lot1!._id, amount: 20_500_000 }))).not.toBeNull();
  });

  test("advanceLot closes the current lot and activates the next", async () => {
    const t = createTestHarness();
    const { admin, auctionId } = await liveAuction(t);
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    const first = (await t.query(api.auctions.getCurrentLot, { auctionId }))!.lot;
    expect(first.lotOrder).toBe(1);

    await t.mutation(api.auctions.advanceLot, { token: admin.token, auctionId });

    const current = (await t.query(api.auctions.getCurrentLot, { auctionId }))!.lot;
    expect(current.lotOrder).toBe(2);
    expect((await t.run(async (ctx) => ctx.db.get(first._id)))?.status).not.toBe("active");
  });

  test("delete preview reports counts and is admin-only; non-admin cannot delete", async () => {
    const t = createTestHarness();
    const { admin, auctionId } = await liveAuction(t);
    const buyer = await seedTestUser(t, { role: "buyer" });

    const preview = await t.query(api.auctions.getAuctionDeletePreview, { token: admin.token, auctionId });
    expect(preview.lotCount).toBe(2);
    expect(preview.vehicleCount).toBe(2);
    expect(preview.canDelete).toBe(true);

    expect(await rejects(async () => t.query(api.auctions.getAuctionDeletePreview, { token: buyer.token, auctionId }))).not.toBeNull();
    expect(await rejects(() => t.mutation(api.auctions.deleteAuction, { token: buyer.token, auctionId } as any))).not.toBeNull();
    expect(await t.run(async (ctx) => ctx.db.get(auctionId))).not.toBeNull();
  });
});

describe("Max bid operations", () => {
  test("cancelMaxBid deactivates the max bid and releases its reserve (deposit enforced)", async () => {
    const t = createTestHarness();
    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", { key: "auction.enforceMinimumDeposit", value: "true", updatedAt: Date.now() } as any);
    });
    const { admin, auctionId } = await liveAuction(t);
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    const lotId = (await t.query(api.auctions.getCurrentLot, { auctionId }))!.lot._id;

    await t.mutation(api.bids.setMaxBid, { token: buyer.token, lotId, maxAmount: 28_000_000 });
    let u = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(u?.reservedBalance).toBe(28_000_000 * 10);

    await t.mutation(api.bids.cancelMaxBid, { token: buyer.token, lotId });

    u = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(u?.reservedBalance).toBe(0);
    expect(u?.walletBalance).toBe(100_000_000_00);
    const maxBid = await t.run(async (ctx) => ctx.db.query("maxBids").first());
    expect(maxBid?.isActive).toBe(false);
  });

  test("a proxy max bid outbids a lower manual bid up to its limit", async () => {
    const t = createTestHarness();
    const { admin, auctionId } = await liveAuction(t);
    const proxy = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const manual = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    const lotId = (await t.query(api.auctions.getCurrentLot, { auctionId }))!.lot._id;

    await t.mutation(api.bids.setMaxBid, { token: proxy.token, lotId, maxAmount: 23_000_000 });
    await t.mutation(api.bids.placeBid, { token: manual.token, lotId, amount: 21_000_000 });
    await t.finishAllScheduledFunctions(() => {});

    const lot = await t.run(async (ctx) => ctx.db.get(lotId));
    expect(lot?.currentBidderId).toBe(proxy.userId);
    expect(lot!.currentBid).toBeGreaterThan(21_000_000);
    expect(lot!.currentBid).toBeLessThanOrEqual(23_000_000);
  });
});

describe("Order operations", () => {
  test("admin updates order status; vehicle follows; non-admin refused", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const admin = await seedTestUser(t, { role: "admin" });
    const vehicleId = await seedTestVehicle(t, seller.userId, { buyNowPrice: 20_000_000 });
    const { orderId } = await t.mutation(api.vehicles.purchaseVehicleDirectly, { token: buyer.token, vehicleId, destination: "lagos" });
    await t.mutation(api.payments.payOrderFromWallet, { token: buyer.token, orderId });

    expect(await rejects(() => t.mutation(api.orders.updateOrderStatus, { token: buyer.token, orderId, status: "processing" }))).not.toBeNull();

    await t.mutation(api.orders.updateOrderStatus, { token: admin.token, orderId, status: "shipped" });
    expect((await t.run(async (ctx) => ctx.db.get(orderId)))?.status).toBe("shipped");
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("in_transit");
  });

  test("cancelling an unpaid order puts the vehicle back on the market", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer" });
    const admin = await seedTestUser(t, { role: "admin" });
    const vehicleId = await seedTestVehicle(t, seller.userId, { buyNowPrice: 20_000_000 });
    const { orderId } = await t.mutation(api.vehicles.purchaseVehicleDirectly, { token: buyer.token, vehicleId, destination: "lagos" });
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("payment_pending");

    await t.mutation(api.orders.updateOrderStatus, { token: admin.token, orderId, status: "cancelled" });

    expect((await t.run(async (ctx) => ctx.db.get(orderId)))?.status).toBe("cancelled");
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("approved");
  });
});

describe("User administration", () => {
  test("KYC status and membership tier updates are admin-only and persisted", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const user = await seedTestUser(t, { role: "buyer", kycStatus: "pending" });

    expect(await rejects(() => t.mutation(api.users.updateKYCStatus, { token: user.token, userId: user.userId, kycStatus: "approved" }))).not.toBeNull();
    await t.mutation(api.users.updateKYCStatus, { token: admin.token, userId: user.userId, kycStatus: "approved", notes: "docs ok" });
    await t.mutation(api.users.updateMembershipTier, { token: admin.token, userId: user.userId, tier: "business" });

    const u = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(u?.kycStatus).toBe("approved");
    expect(u?.membershipTier).toBe("business");
  });

  test("autoApproveAllPendingUsers activates pending users, skips suspended ones, and is admin-only", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const pending = await seedTestUser(t, { role: "buyer", status: "pending", kycStatus: "not_started" });
    const suspended = await seedTestUser(t, { role: "buyer", status: "suspended" });

    expect(await rejects(() => t.mutation(api.users.autoApproveAllPendingUsers, { token: pending.token }))).not.toBeNull();
    const res = await t.mutation(api.users.autoApproveAllPendingUsers, { token: admin.token });
    expect(res.success).toBe(true);

    const p = await t.run(async (ctx) => ctx.db.get(pending.userId));
    expect(p?.status).toBe("active");
    expect(p?.kycStatus).toBe("approved");
    expect(p?.buyingPower).toBe((p!.walletBalance ?? 0) / 10);
    expect((await t.run(async (ctx) => ctx.db.get(suspended.userId)))?.status).toBe("suspended");
  });

  test("logout deletes the session so the token stops working", async () => {
    const t = createTestHarness();
    const user = await seedTestUser(t, { role: "buyer" });
    expect(await t.query(api.wallet.getWalletBalance, { token: user.token })).not.toBeNull();

    await t.mutation(api.auth.logout, { token: user.token });

    expect(await t.query(api.wallet.getWalletBalance, { token: user.token })).toBeNull();
    expect(await t.query(api.auth.getCurrentUser, { token: user.token })).toBeNull();
  });
});

describe("Vehicle approval workflow", () => {
  test("only admins approve; requires Buy Now >= reserve; sets approved fields", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const vehicleId = await seedTestVehicle(t, seller.userId, { status: "pending_approval", reservePrice: 18_000_000, buyNowPrice: 22_000_000 });

    expect(await rejects(() => t.mutation(api.vehicles.approveVehicle, { token: seller.token, vehicleId }))).not.toBeNull();
    const ok = await t.mutation(api.vehicles.approveVehicle, { token: admin.token, vehicleId });
    expect(ok.success).toBe(true);
    const v = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(v?.status).toBe("approved");
    expect(v?.approvedBy).toBe(admin.userId);
    expect(await rejects(() => t.mutation(api.vehicles.approveVehicle, { token: admin.token, vehicleId }))).not.toBeNull();

    // Buy Now below reserve is refused.
    const bad = await seedTestVehicle(t, seller.userId, { status: "pending_approval", reservePrice: 18_000_000, buyNowPrice: 17_000_000 });
    expect(await rejects(() => t.mutation(api.vehicles.approveVehicle, { token: admin.token, vehicleId: bad }))).not.toBeNull();
    expect((await t.run(async (ctx) => ctx.db.get(bad)))?.status).toBe("pending_approval");
  });

  test("a seller can update their own vehicle but not someone else's", async () => {
    const t = createTestHarness();
    const owner = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const other = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const vehicleId = await seedTestVehicle(t, owner.userId, { status: "draft" });

    expect(await rejects(() => t.mutation(api.vehicles.updateVehicle, { token: other.token, vehicleId, updates: { odometer: 1 } } as any))).not.toBeNull();
    await t.mutation(api.vehicles.updateVehicle, { token: owner.token, vehicleId, updates: { odometer: 12_345 } } as any);
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.odometer).toBe(12_345);
  });
});
