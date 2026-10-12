import { describe, test, expect } from "bun:test";
import { createTestHarness, seedTestUser } from "../helpers/convex-test-harness";
import { credit, debit, hold, release, spendReserved, completePendingCredit, requestWithdrawal, completeWithdrawal, nairaToKobo } from "../../convex/lib/ledger";

const entry = (userId: any, amountKobo: number, reference: string, type: any = "deposit") => ({
  userId,
  amountKobo,
  type,
  reference,
  description: "test",
});

describe("Wallet ledger module (In-Memory Hermetic)", () => {
  test("credit adds kobo, derives buyingPower, writes one transaction", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 0 });
    await t.run(async (ctx) => credit(ctx as any, entry(u.userId, 1_000_000, "r1")));
    const { user, txs } = await t.run(async (ctx) => ({
      user: await ctx.db.get(u.userId),
      txs: await ctx.db.query("walletTransactions").withIndex("by_user", (q) => q.eq("userId", u.userId)).collect(),
    }));
    expect(user?.walletBalance).toBe(1_000_000);
    expect(user?.buyingPower).toBe(100_000);
    expect(txs.length).toBe(1);
  });

  test("replaying a reference is a no-op (idempotent)", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 0 });
    const first = await t.run(async (ctx) => credit(ctx as any, entry(u.userId, 500_000, "payout_order_X", "sale_payout")));
    const second = await t.run(async (ctx) => credit(ctx as any, entry(u.userId, 500_000, "payout_order_X", "sale_payout")));
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    const user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(500_000);
  });

  test("debit and hold reject overdraw and leave state untouched", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 1000 });
    await expect(t.run(async (ctx) => debit(ctx as any, entry(u.userId, 2000, "d1", "withdrawal")))).rejects.toThrow();
    await expect(t.run(async (ctx) => hold(ctx as any, entry(u.userId, 2000, "h1", "bid_reserve")))).rejects.toThrow();
    const user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(1000);
    expect(user?.reservedBalance).toBe(0);
  });

  test("hold then release moves funds; release is capped at reserved", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 10_000 });
    await t.run(async (ctx) => hold(ctx as any, entry(u.userId, 4_000, "h1", "bid_reserve")));
    const rel = await t.run(async (ctx) => release(ctx as any, entry(u.userId, 9_999, "rl1", "bid_release")));
    expect(rel.amountKobo).toBe(4_000);
    const user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(10_000);
    expect(user?.reservedBalance).toBe(0);
    const none = await t.run(async (ctx) => release(ctx as any, entry(u.userId, 1, "rl2", "bid_release")));
    expect(none.applied).toBe(false);
  });

  test("rejects non-integer / non-positive amounts; nairaToKobo converts", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 0 });
    await expect(t.run(async (ctx) => credit(ctx as any, entry(u.userId, 0, "z")))).rejects.toThrow();
    await expect(t.run(async (ctx) => credit(ctx as any, entry(u.userId, 1.5, "f")))).rejects.toThrow();
    expect(nairaToKobo(2_200_000)).toBe(220_000_000);
  });

  test("spendReserved consumes reserve without touching the wallet, capped at reserved", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 10_000 });
    await t.run(async (ctx) => hold(ctx as any, entry(u.userId, 3_000, "h1", "bid_reserve")));
    const r = await t.run(async (ctx) => spendReserved(ctx as any, entry(u.userId, 9_000, "dep1", "payment")));
    expect(r.amountKobo).toBe(3_000);
    const user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(7_000);
    expect(user?.reservedBalance).toBe(0);
  });

  test("completePendingCredit credits once and ignores a second call", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 0 });
    const txId = await t.run(async (ctx) =>
      ctx.db.insert("walletTransactions", {
        userId: u.userId, type: "deposit", amount: 5_000, currency: "NGN", status: "pending",
        reference: "dep_pending", description: "d", createdAt: Date.now(),
      })
    );
    const a = await t.run(async (ctx) => completePendingCredit(ctx as any, txId));
    const b = await t.run(async (ctx) => completePendingCredit(ctx as any, txId));
    expect(a.applied).toBe(true);
    expect(b.applied).toBe(false);
    const user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(5_000);
    expect(user?.buyingPower).toBe(500);
  });

  test("withdrawal moves funds to pending, updates buyingPower, and clears on approval", async () => {
    const t = createTestHarness();
    const u = await seedTestUser(t, { walletBalance: 10_000 });
    await t.run(async (ctx) => requestWithdrawal(ctx as any, entry(u.userId, 4_000, "wd1", "withdrawal")));
    let user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.walletBalance).toBe(6_000);
    expect(user?.pendingBalance).toBe(4_000);
    expect(user?.buyingPower).toBe(600);
    await expect(t.run(async (ctx) => requestWithdrawal(ctx as any, entry(u.userId, 99_000, "wd2", "withdrawal")))).rejects.toThrow();
    const tx = await t.run(async (ctx) =>
      ctx.db.query("walletTransactions").withIndex("by_reference", (q) => q.eq("reference", "wd1")).first()
    );
    await t.run(async (ctx) => completeWithdrawal(ctx as any, tx!._id));
    user = await t.run(async (ctx) => ctx.db.get(u.userId));
    expect(user?.pendingBalance).toBe(0);
    await expect(t.run(async (ctx) => completeWithdrawal(ctx as any, tx!._id))).rejects.toThrow();
  });
});
