import { describe, test, expect, afterEach } from "bun:test";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
  type TestHarness,
} from "../helpers/convex-test-harness";

async function expireSessions(t: TestHarness, userId: Id<"users">) {
  await t.run(async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.patch(s._id, { expiresAt: Date.now() - 1000 });
    }
  });
}

async function rejects(fn: () => Promise<unknown>) {
  let error: unknown = null;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  return error;
}

describe("Session expiry and destructive-function gating (In-Memory Hermetic)", () => {
  const originalSeedSecret = process.env.SEED_SECRET;
  afterEach(() => {
    if (originalSeedSecret === undefined) delete process.env.SEED_SECRET;
    else process.env.SEED_SECRET = originalSeedSecret;
  });

  test("expired session cannot place a bid", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const vehicleId = await seedTestVehicle(t, vendor.userId, {
      startingBid: 20_000_000,
      reservePrice: 25_000_000,
      buyNowPrice: 30_000_000,
    });

    const now = Date.now();
    const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Session expiry auction",
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
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });
    const current = await t.query(api.auctions.getCurrentLot, { auctionId });
    const lotId = current!.lot._id;

    await expireSessions(t, buyer.userId);

    const error = await rejects(() =>
      t.mutation(api.bids.placeBid, { token: buyer.token, lotId, amount: 20_500_000 })
    );
    expect(error).not.toBeNull();

    const lot = await t.run(async (ctx) => ctx.db.get(lotId));
    expect(lot?.currentBidderId).toBeUndefined();
  });

  test("expired session cannot withdraw or read wallet", async () => {
    const t = createTestHarness();
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 10_000_000_00 });

    // Valid session works first, so the later failure is about expiry.
    expect(await t.query(api.wallet.getWalletBalance, { token: buyer.token })).not.toBeNull();

    await expireSessions(t, buyer.userId);

    expect(await t.query(api.wallet.getWalletBalance, { token: buyer.token })).toBeNull();
    expect(await t.query(api.wallet.getTransactionHistory, { token: buyer.token })).toEqual([]);

    const error = await rejects(() =>
      t.mutation(api.wallet.initiateWithdrawal, {
        token: buyer.token,
        amount: 1_000_000,
        bankCode: "058",
        accountNumber: "0123456789",
      })
    );
    expect(error).not.toBeNull();

    const user = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(user?.walletBalance).toBe(10_000_000_00);
  });

  test("expired session cannot update profile", async () => {
    const t = createTestHarness();
    const buyer = await seedTestUser(t, { role: "buyer", firstName: "Original" });
    await expireSessions(t, buyer.userId);

    const error = await rejects(() =>
      t.mutation(api.auth.updateProfile, { token: buyer.token, updates: { firstName: "Hijacked" } })
    );
    expect(error).not.toBeNull();

    const user = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(user?.firstName).toBe("Original");
  });

  test("seed functions require SEED_SECRET", async () => {
    const t = createTestHarness();
    const buyer = await seedTestUser(t, { role: "buyer" });

    delete process.env.SEED_SECRET;
    expect(await rejects(() => t.mutation(api.seedData.seedDatabase, { secret: "", clearExisting: true }))).not.toBeNull();

    process.env.SEED_SECRET = "correct-secret";
    expect(await rejects(() => t.mutation(api.seedData.seedDatabase, { secret: "wrong", clearExisting: true }))).not.toBeNull();
    expect(await rejects(() => t.mutation(api.seedData.generateSeedUploadUrl, { secret: "wrong" }))).not.toBeNull();
    expect(
      await rejects(() => t.mutation(api.seedData.saveImageStorageId, { secret: "wrong", key: "k", storageId: "s" }))
    ).not.toBeNull();

    // Nothing was wiped.
    expect(await t.run(async (ctx) => ctx.db.get(buyer.userId))).not.toBeNull();
  });
});
