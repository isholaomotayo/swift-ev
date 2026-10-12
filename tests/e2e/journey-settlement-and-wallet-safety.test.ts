import { describe, test, expect } from "bun:test";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
  type TestHarness,
} from "../helpers/convex-test-harness";
import { nairaToKobo } from "../../convex/lib/ledger";

async function rejects(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
}

const walletOf = async (t: TestHarness, userId: Id<"users">) =>
  (await t.run(async (ctx) => ctx.db.get(userId)))!.walletBalance!;

const payoutTxs = (t: TestHarness, sellerId: Id<"users">) =>
  t.run(async (ctx) =>
    (
      await ctx.db
        .query("walletTransactions")
        .withIndex("by_user", (q) => q.eq("userId", sellerId))
        .collect()
    ).filter((tx) => tx.type === "sale_payout")
  );

/** Buy Now purchase paid in full from the buyer's wallet. */
async function paidOrder(t: TestHarness) {
  const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual", walletBalance: 0 });
  const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
  const admin = await seedTestUser(t, { role: "admin" });
  const vehicleId = await seedTestVehicle(t, seller.userId, {
    startingBid: 15_000_000,
    reservePrice: 18_000_000,
    buyNowPrice: 20_000_000,
    status: "approved",
  });
  const { orderId } = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
    token: buyer.token,
    vehicleId,
    destination: "lagos",
  });
  await t.mutation(api.payments.payOrderFromWallet, { token: buyer.token, orderId });
  const order = (await t.run(async (ctx) => ctx.db.get(orderId)))!;
  return { seller, buyer, admin, vehicleId, orderId, order };
}

describe("E2E Journey: delivery settlement pays the seller exactly once", () => {
  test("buyer confirms delivery -> seller paid subtotal minus 5% commission in kobo; admin payout and re-confirm cannot pay again", async () => {
    const t = createTestHarness();
    const { seller, buyer, admin, vehicleId, orderId, order } = await paidOrder(t);

    await t.mutation(api.orders.confirmDelivery, { token: buyer.token, orderId });

    const expectedKobo = nairaToKobo(order.subtotal * 0.95);
    expect(await walletOf(t, seller.userId)).toBe(expectedKobo);

    const payouts = await payoutTxs(t, seller.userId);
    expect(payouts.length).toBe(1);
    expect(payouts[0].amount).toBe(expectedKobo);
    expect(payouts[0].relatedOrderId).toBe(orderId);

    const seller1 = await t.run(async (ctx) => ctx.db.get(seller.userId));
    expect(seller1?.buyingPower).toBe(expectedKobo / 10);

    expect((await t.run(async (ctx) => ctx.db.get(orderId)))?.status).toBe("delivered");
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("delivered");

    // Admin payout after delivery must be rejected, not paid a second time.
    expect(await rejects(() => t.mutation(api.orders.triggerSellerPayout, { token: admin.token, orderId }))).not.toBeNull();
    // Confirming again must be rejected too.
    expect(await rejects(() => t.mutation(api.orders.confirmDelivery, { token: buyer.token, orderId }))).not.toBeNull();

    expect(await walletOf(t, seller.userId)).toBe(expectedKobo);
    expect((await payoutTxs(t, seller.userId)).length).toBe(1);
  });

  test("gate pass scan marks delivered and pays the seller; a later confirmDelivery does not pay again", async () => {
    const t = createTestHarness();
    const { seller, buyer, admin, orderId, order } = await paidOrder(t);

    await t.mutation(api.orders.addShippingTracking, {
      token: admin.token,
      orderId,
      carrier: "GIG Logistics",
      trackingNumber: "GIG-1",
      estimatedDelivery: Date.now() + 86400_000,
    });
    const { code } = await t.mutation(api.logistics.generateGatePass, { token: buyer.token, orderId });
    await t.mutation(api.logistics.scanGatePass, { token: admin.token, code });

    const expectedKobo = nairaToKobo(order.subtotal * 0.95);
    expect((await t.run(async (ctx) => ctx.db.get(orderId)))?.status).toBe("delivered");
    expect(await walletOf(t, seller.userId)).toBe(expectedKobo);

    expect(await rejects(() => t.mutation(api.orders.confirmDelivery, { token: buyer.token, orderId }))).not.toBeNull();
    expect(await walletOf(t, seller.userId)).toBe(expectedKobo);
    expect((await payoutTxs(t, seller.userId)).length).toBe(1);
  });

  test("configured seller commission percentage is used", async () => {
    const t = createTestHarness();
    const { seller, buyer, orderId, order } = await paidOrder(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "seller_commission_percentage",
        value: "10",
        updatedAt: Date.now(),
      } as any);
    });

    await t.mutation(api.orders.confirmDelivery, { token: buyer.token, orderId });
    expect(await walletOf(t, seller.userId)).toBe(nairaToKobo(order.subtotal * 0.9));
  });

  test("full-refund dispute credits the buyer in kobo and returns the sold vehicle to approved", async () => {
    const t = createTestHarness();
    const { buyer, admin, vehicleId, orderId, order } = await paidOrder(t);
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("sold");

    const walletBefore = await walletOf(t, buyer.userId);
    const disputeId = await t.mutation(api.disputes.createDispute, {
      token: buyer.token,
      orderId,
      disputeType: "not_as_described",
      description: "Vehicle does not match the listing",
      evidenceUrls: ["https://example.com/e.jpg"],
    } as any);

    await t.mutation(api.disputes.resolveDispute, {
      token: admin.token,
      disputeId,
      resolution: "full_refund",
      resolutionNotes: "Refunded in full",
    });

    expect(await walletOf(t, buyer.userId)).toBe(walletBefore + nairaToKobo(order.paidAmount));
    expect((await t.run(async (ctx) => ctx.db.get(orderId)))?.status).toBe("refunded");
    expect((await t.run(async (ctx) => ctx.db.get(vehicleId)))?.status).toBe("approved");
  });
});

describe("E2E Journey: withdrawals", () => {
  test("rejected withdrawal returns funds to the available balance and buying power", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const user = await seedTestUser(t, { role: "buyer", walletBalance: 10_000_000 });

    const { reference } = await t.mutation(api.wallet.initiateWithdrawal, {
      token: user.token,
      amount: 4_000_000,
      bankCode: "058",
      accountNumber: "0123456789",
    });
    const tx = await t.run(async (ctx) =>
      ctx.db.query("walletTransactions").withIndex("by_reference", (q) => q.eq("reference", reference)).first()
    );
    let u = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(u?.walletBalance).toBe(6_000_000);
    expect(u?.pendingBalance).toBe(4_000_000);

    await t.mutation(api.wallet.rejectWithdrawal, { token: admin.token, transactionId: tx!._id, reason: "Bank details invalid" });

    u = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(u?.walletBalance).toBe(10_000_000);
    expect(u?.pendingBalance).toBe(0);
    expect(u?.buyingPower).toBe(1_000_000);
    expect((await t.run(async (ctx) => ctx.db.get(tx!._id)))?.status).toBe("failed");

    // Cannot be rejected or approved again.
    expect(await rejects(() => t.mutation(api.wallet.rejectWithdrawal, { token: admin.token, transactionId: tx!._id }))).not.toBeNull();
    expect(await rejects(() => t.mutation(api.wallet.approveWithdrawal, { token: admin.token, transactionId: tx!._id }))).not.toBeNull();
  });

  test("non-admins cannot approve or reject withdrawals; superadmins can approve", async () => {
    const t = createTestHarness();
    const superadmin = await seedTestUser(t, { role: "superadmin" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 10_000_000 });
    const { reference } = await t.mutation(api.wallet.initiateWithdrawal, {
      token: buyer.token,
      amount: 1_000_000,
      bankCode: "058",
      accountNumber: "0123456789",
    });
    const tx = await t.run(async (ctx) =>
      ctx.db.query("walletTransactions").withIndex("by_reference", (q) => q.eq("reference", reference)).first()
    );

    expect(await rejects(() => t.mutation(api.wallet.approveWithdrawal, { token: buyer.token, transactionId: tx!._id }))).not.toBeNull();
    expect(await rejects(() => t.mutation(api.wallet.rejectWithdrawal, { token: buyer.token, transactionId: tx!._id }))).not.toBeNull();
    const ok = await t.mutation(api.wallet.approveWithdrawal, { token: superadmin.token, transactionId: tx!._id });
    expect(ok.success).toBe(true);
  });
});

describe("E2E Journey: auctions keep money and rules consistent", () => {
  async function scheduledAuction(t: TestHarness, vehicleOverrides?: Parameters<typeof seedTestVehicle>[2]) {
    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const vehicleId = await seedTestVehicle(t, vendor.userId, {
      startingBid: 20_000_000,
      reservePrice: 25_000_000,
      buyNowPrice: 30_000_000,
      ...vehicleOverrides,
    });
    const now = Date.now();
    const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Safety auction",
      auctionType: "live",
      bidIncrement: 500_000,
      scheduledStart: now + 3600_000,
      scheduledEnd: now + 7200_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          startingBid: 20_000_000,
          reservePrice: 25_000_000,
          buyItNowPrice: 30_000_000,
          bidIncrement: 500_000,
          lotDuration: 600_000,
        },
      ],
    });
    return { admin, vehicleId, auctionId };
  }

  test("deleting an auction releases pre-bid reserves back to bidders", async () => {
    const t = createTestHarness();
    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "auction.enforceMinimumDeposit",
        value: "true",
        updatedAt: Date.now(),
      } as any);
    });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const { admin, auctionId } = await scheduledAuction(t);
    const lot = await t.run(async (ctx) =>
      ctx.db.query("auctionLots").withIndex("by_auction", (q) => q.eq("auctionId", auctionId)).first()
    );

    await t.mutation(api.bids.placeBid, { token: buyer.token, lotId: lot!._id, amount: 20_500_000 });
    let u = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(u?.reservedBalance).toBe(20_500_000 * 10);

    await t.mutation(api.auctions.deleteAuction, { token: admin.token, auctionId } as any);

    u = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(u?.reservedBalance).toBe(0);
    expect(u?.walletBalance).toBe(100_000_000_00);
    expect(u?.buyingPower).toBe(100_000_000_00 / 10);
  });

  test("individual accounts cannot set a max bid on salvage vehicles", async () => {
    const t = createTestHarness();
    const buyer = await seedTestUser(t, { role: "buyer" });
    const { admin, vehicleId, auctionId } = await scheduledAuction(t);
    await t.run(async (ctx) => ctx.db.patch(vehicleId, { titleType: "salvage" } as any));
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    const current = await t.query(api.auctions.getCurrentLot, { auctionId });

    const err = await rejects(() =>
      t.mutation(api.bids.setMaxBid, { token: buyer.token, lotId: current!.lot._id, maxAmount: 28_000_000 })
    );
    expect(err).not.toBeNull();
    const maxBids = await t.run(async (ctx) => ctx.db.query("maxBids").collect());
    expect(maxBids.length).toBe(0);
  });

  test("quick-add only accepts approved vehicles with a Buy It Now price", async () => {
    const t = createTestHarness();
    const { admin, auctionId } = await scheduledAuction(t);
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });

    const draft = await seedTestVehicle(t, vendor.userId, { status: "draft" });
    expect(await rejects(() => t.mutation(api.auctions.quickAddVehicleToAuction, { token: admin.token, auctionId, vehicleId: draft }))).not.toBeNull();

    const noBin = await seedTestVehicle(t, vendor.userId, { status: "approved" });
    await t.run(async (ctx) => ctx.db.patch(noBin, { buyItNowPrice: undefined } as any));
    expect(await rejects(() => t.mutation(api.auctions.quickAddVehicleToAuction, { token: admin.token, auctionId, vehicleId: noBin }))).not.toBeNull();

    const good = await seedTestVehicle(t, vendor.userId, { status: "approved" });
    const res = await t.mutation(api.auctions.quickAddVehicleToAuction, { token: admin.token, auctionId, vehicleId: good });
    expect(res.success).toBe(true);
    expect((await t.run(async (ctx) => ctx.db.get(good)))?.status).toBe("scheduled");
  });
});

describe("E2E Journey: Buy Now availability is decided by the backend", () => {
  test("canBuyNow follows the same rules as the purchase mutations", async () => {
    const t = createTestHarness();
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const admin = await seedTestUser(t, { role: "admin" });
    const buyer = await seedTestUser(t, { role: "buyer" });
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      startingBid: 20_000_000,
      reservePrice: 25_000_000,
      buyNowPrice: 30_000_000,
    });

    // Plain approved vehicle: purchasable.
    expect((await t.query(api.vehicles.getVehicleById, { vehicleId, token: buyer.token } as any))?.canBuyNow).toBe(true);

    // Pending lot in a scheduled auction: pre-auction Buy Now is allowed.
    const now = Date.now();
    const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Buy now availability",
      auctionType: "live",
      bidIncrement: 500_000,
      scheduledStart: now + 3600_000,
      scheduledEnd: now + 7200_000,
      lots: [{ vehicleId, lotOrder: 1, startingBid: 20_000_000, reservePrice: 25_000_000, buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000 }],
    });
    expect((await t.query(api.vehicles.getVehicleById, { vehicleId, token: buyer.token } as any))?.canBuyNow).toBe(true);

    // Once the auction is live, the lot is no longer buyable.
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    expect((await t.query(api.vehicles.getVehicleById, { vehicleId, token: buyer.token } as any))?.canBuyNow).toBe(false);
  });
});

describe("E2E Journey: homepage promoted auction", () => {
  test("prefers a live auction, then the next scheduled one with lots, else null", async () => {
    const t = createTestHarness();
    expect(await t.query(api.auctions.getPromotedAuction, {})).toBeNull();

    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const make = async (name: string, startOffset: number) => {
      const vehicleId = await seedTestVehicle(t, vendor.userId, { buyNowPrice: 30_000_000 });
      const start = Date.now() + startOffset;
      const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
        token: admin.token,
        name,
        auctionType: "live",
        bidIncrement: 500_000,
        scheduledStart: start,
        scheduledEnd: start + 3600_000,
        lots: [{ vehicleId, lotOrder: 1, startingBid: 20_000_000, reservePrice: 25_000_000, buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000 }],
      });
      return auctionId;
    };

    const later = await make("Later", 10 * 3600_000);
    const sooner = await make("Sooner", 2 * 3600_000);
    await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token, name: "Empty", auctionType: "live", bidIncrement: 500_000,
      scheduledStart: Date.now() + 3600_000, scheduledEnd: Date.now() + 7200_000, lots: [],
    });

    // Next scheduled auction that has lots, not the empty one that starts earlier.
    expect((await t.query(api.auctions.getPromotedAuction, {}))?._id).toBe(sooner);

    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId: later });
    const promoted = await t.query(api.auctions.getPromotedAuction, {});
    expect(promoted?._id).toBe(later);
    expect(promoted?.totalLots).toBe(1);
  });
});

describe("E2E Journey: pre-auction Buy Now on a lot", () => {
  test("buying a pending lot releases pre-bid reserves, holds the vehicle, and a repeat call resumes the order", async () => {
    const t = createTestHarness();
    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", { key: "auction.enforceMinimumDeposit", value: "true", updatedAt: Date.now() } as any);
    });
    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const bidder = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, vendor.userId, { buyNowPrice: 30_000_000 });
    const now = Date.now();
    const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token, name: "Pre-auction BIN", auctionType: "live", bidIncrement: 500_000,
      scheduledStart: now + 3600_000, scheduledEnd: now + 7200_000,
      lots: [{ vehicleId, lotOrder: 1, startingBid: 20_000_000, reservePrice: 25_000_000, buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000 }],
    });
    const lot = (await t.run(async (ctx) =>
      ctx.db.query("auctionLots").withIndex("by_auction", (q) => q.eq("auctionId", auctionId)).first()
    ))!;

    await t.mutation(api.bids.placeBid, { token: bidder.token, lotId: lot._id, amount: 20_500_000 });
    expect((await t.run(async (ctx) => ctx.db.get(bidder.userId)))?.reservedBalance).toBe(20_500_000 * 10);

    const res = await t.mutation(api.auctions.purchaseBuyItNow, { token: buyer.token, lotId: lot._id, destination: "lagos" });
    expect(res.success).toBe(true);

    const order = (await t.run(async (ctx) => ctx.db.get(res.orderId)))!;
    expect(order.auctionLotId).toBe(lot._id);
    expect(order.subtotal).toBe(30_000_000);
    expect(order.status).toBe("pending_payment");

    const vehicle = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicle?.status).toBe("payment_pending");
    expect(vehicle?.buyItNowPurchasedBy).toBe(buyer.userId);
    expect((await t.run(async (ctx) => ctx.db.get(lot._id)))?.status).toBe("sold");
    expect((await t.run(async (ctx) => ctx.db.get(auctionId)))?.soldLots).toBe(1);

    // The pre-bidder got their deposit back.
    const bidderAfter = await t.run(async (ctx) => ctx.db.get(bidder.userId));
    expect(bidderAfter?.reservedBalance).toBe(0);
    expect(bidderAfter?.walletBalance).toBe(100_000_000_00);

    // Buyer calling again resumes; someone else is refused.
    const again = await t.mutation(api.auctions.purchaseBuyItNow, { token: buyer.token, lotId: lot._id, destination: "lagos" });
    expect((again as any).resumed).toBe(true);
    expect(again.orderId).toBe(res.orderId);
    expect(await rejects(() => t.mutation(api.auctions.purchaseBuyItNow, { token: bidder.token, lotId: lot._id, destination: "lagos" }))).not.toBeNull();
    const orders = await t.run(async (ctx) => ctx.db.query("orders").collect());
    expect(orders.length).toBe(1);
  });
});

describe("E2E Journey: index-backed reads keep their results", () => {
  test("filter options only reflect buyer-visible vehicles and lot prices", async () => {
    const t = createTestHarness();
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    await seedTestVehicle(t, vendor.userId, { make: "BYD", year: 2022, status: "approved" });
    await seedTestVehicle(t, vendor.userId, { make: "Tesla", year: 2024, status: "approved" });
    await seedTestVehicle(t, vendor.userId, { make: "Hidden", year: 1999, status: "draft" });

    const opts = await t.query(api.vehicles.getFilterOptions, {});
    expect(opts.makes).toEqual(["BYD", "Tesla"]);
    expect(opts.yearRange).toEqual({ min: 2022, max: 2024 });
  });

  test("vendor auctions list only auctions containing that vendor's vehicles", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const vendorA = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const vendorB = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const vA = await seedTestVehicle(t, vendorA.userId, {});
    const vB = await seedTestVehicle(t, vendorB.userId, {});
    const mk = async (name: string, vehicleId: any, offset: number) =>
      (
        await t.mutation(api.auctions.createAuctionWithLots, {
          token: admin.token, name, auctionType: "live", bidIncrement: 500_000,
          scheduledStart: Date.now() + offset, scheduledEnd: Date.now() + offset + 3600_000,
          lots: [{ vehicleId, lotOrder: 1, startingBid: 20_000_000, reservePrice: 25_000_000, buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000 }],
        })
      ).auctionId;
    const a1 = await mk("A-first", vA, 3600_000);
    const a2 = await mk("A-second", vA, 7200_000).catch(() => null); // same vehicle cannot be in two open lots
    await mk("B-only", vB, 5400_000);

    const list = await t.query(api.auctions.getVendorAuctions, { token: vendorA.token });
    expect(a2).toBeNull();
    expect(list.map((a: any) => a._id)).toEqual([a1]);
    expect(list[0].vendorLots.length).toBe(1);
    expect(list[0].vendorLots[0].vehicle._id).toBe(vA);
  });

  test("scheduled auctions start and expired lots end via the cron entry points", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const vehicleId = await seedTestVehicle(t, vendor.userId, {});
    const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token, name: "Cron", auctionType: "live", bidIncrement: 500_000,
      scheduledStart: Date.now() + 3600_000, scheduledEnd: Date.now() + 7200_000,
      lots: [{ vehicleId, lotOrder: 1, startingBid: 20_000_000, reservePrice: 25_000_000, buyItNowPrice: 30_000_000, bidIncrement: 500_000, lotDuration: 600_000 }],
    });

    // Not due yet.
    await t.mutation(internal.auctions.startScheduledAuctions, {});
    expect((await t.run(async (ctx) => ctx.db.get(auctionId)))?.status).toBe("scheduled");

    // Make it due.
    await t.run(async (ctx) => ctx.db.patch(auctionId, { scheduledStart: Date.now() - 1000 }));
    await t.mutation(internal.auctions.startScheduledAuctions, {});
    expect((await t.run(async (ctx) => ctx.db.get(auctionId)))?.status).toBe("live");

    const lot = (await t.run(async (ctx) =>
      ctx.db.query("auctionLots").withIndex("by_auction", (q) => q.eq("auctionId", auctionId)).first()
    ))!;
    expect(lot.status).toBe("active");

    // Expire the lot and run the sweeper.
    await t.run(async (ctx) => ctx.db.patch(lot._id, { endsAt: Date.now() - 1000 }));
    await t.mutation(internal.auctions.endExpiredLots, {});
    expect((await t.run(async (ctx) => ctx.db.get(lot._id)))?.status).not.toBe("active");
  });
});
