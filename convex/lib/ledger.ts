import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

/**
 * Wallet ledger: the only module that changes users.walletBalance / reservedBalance / buyingPower.
 *
 * - Every amount is in KOBO. Use nairaToKobo() at the boundary with Naira values (orders, payments).
 * - buyingPower (Naira) is always derived here: a 10% deposit supports a bid of 10x its Naira value,
 *   i.e. walletBalanceKobo / 10.
 * - Each entry carries a unique `reference`; replaying the same reference is a no-op returning the
 *   original transaction, so callers can retry safely.
 */

type TxType = Doc<"walletTransactions">["type"];

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function buyingPowerFromWalletKobo(walletBalanceKobo: number): number {
  return walletBalanceKobo / 10;
}

export interface LedgerEntry {
  userId: Id<"users">;
  amountKobo: number;
  type: TxType;
  reference: string;
  description: string;
  relatedOrderId?: Id<"orders">;
  relatedBidId?: Id<"bids">;
}

export interface LedgerResult {
  applied: boolean; // false when the reference was already recorded
  amountKobo: number;
  walletBalance: number;
  reservedBalance: number;
}

async function findByReference(ctx: MutationCtx, reference: string) {
  return await ctx.db
    .query("walletTransactions")
    .withIndex("by_reference", (q) => q.eq("reference", reference))
    .first();
}

function assertValidAmount(amountKobo: number) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    throw new ConvexError("Ledger amount must be a positive whole number of kobo");
  }
}

async function apply(
  ctx: MutationCtx,
  entry: LedgerEntry,
  next: (user: Doc<"users">) => { wallet: number; reserved: number }
): Promise<LedgerResult> {
  assertValidAmount(entry.amountKobo);

  const existing = await findByReference(ctx, entry.reference);
  if (existing) {
    const user = await ctx.db.get(existing.userId);
    return {
      applied: false,
      amountKobo: existing.amount,
      walletBalance: user?.walletBalance ?? 0,
      reservedBalance: user?.reservedBalance ?? 0,
    };
  }

  const user = await ctx.db.get(entry.userId);
  if (!user) throw new ConvexError("User not found");

  const { wallet, reserved } = next(user);
  const now = Date.now();

  await ctx.db.patch(entry.userId, {
    walletBalance: wallet,
    reservedBalance: reserved,
    buyingPower: buyingPowerFromWalletKobo(wallet),
    updatedAt: now,
  });

  await ctx.db.insert("walletTransactions", {
    userId: entry.userId,
    type: entry.type,
    amount: entry.amountKobo,
    currency: "NGN",
    status: "completed",
    reference: entry.reference,
    description: entry.description,
    relatedOrderId: entry.relatedOrderId,
    relatedBidId: entry.relatedBidId,
    createdAt: now,
    completedAt: now,
  });

  return { applied: true, amountKobo: entry.amountKobo, walletBalance: wallet, reservedBalance: reserved };
}

/** Add funds to the available balance (deposit, refund, sale payout). */
export function credit(ctx: MutationCtx, entry: LedgerEntry): Promise<LedgerResult> {
  return apply(ctx, entry, (u) => ({
    wallet: (u.walletBalance ?? 0) + entry.amountKobo,
    reserved: u.reservedBalance ?? 0,
  }));
}

/** Remove funds from the available balance (withdrawal, fee, payment). Never goes negative. */
export function debit(ctx: MutationCtx, entry: LedgerEntry): Promise<LedgerResult> {
  return apply(ctx, entry, (u) => {
    const wallet = u.walletBalance ?? 0;
    if (wallet < entry.amountKobo) throw new ConvexError("Insufficient wallet balance");
    return { wallet: wallet - entry.amountKobo, reserved: u.reservedBalance ?? 0 };
  });
}

/** Move funds from available to reserved (bid deposit). */
export function hold(ctx: MutationCtx, entry: LedgerEntry): Promise<LedgerResult> {
  return apply(ctx, entry, (u) => {
    const wallet = u.walletBalance ?? 0;
    if (wallet < entry.amountKobo) throw new ConvexError("Insufficient wallet balance");
    return { wallet: wallet - entry.amountKobo, reserved: (u.reservedBalance ?? 0) + entry.amountKobo };
  });
}

/**
 * Move funds from reserved back to available. Releases at most what is reserved;
 * the transaction records the amount actually released. Returns 0 applied if nothing to release.
 */
export async function release(ctx: MutationCtx, entry: LedgerEntry): Promise<LedgerResult> {
  const user = await ctx.db.get(entry.userId);
  const reserved = user?.reservedBalance ?? 0;
  const amountKobo = Math.min(entry.amountKobo, reserved);
  if (amountKobo <= 0) {
    return { applied: false, amountKobo: 0, walletBalance: user?.walletBalance ?? 0, reservedBalance: reserved };
  }
  const capped = { ...entry, amountKobo };
  return apply(ctx, capped, (u) => ({
    wallet: (u.walletBalance ?? 0) + amountKobo,
    reserved: (u.reservedBalance ?? 0) - amountKobo,
  }));
}

/**
 * Consume reserved funds (e.g. a winning bid's deposit applied to an order). Caps at what is
 * reserved and records the amount actually spent. The wallet balance is unchanged.
 */
export async function spendReserved(ctx: MutationCtx, entry: LedgerEntry): Promise<LedgerResult> {
  const user = await ctx.db.get(entry.userId);
  const reserved = user?.reservedBalance ?? 0;
  const amountKobo = Math.min(entry.amountKobo, reserved);
  if (amountKobo <= 0) {
    return { applied: false, amountKobo: 0, walletBalance: user?.walletBalance ?? 0, reservedBalance: reserved };
  }
  return apply(ctx, { ...entry, amountKobo }, (u) => ({
    wallet: u.walletBalance ?? 0,
    reserved: (u.reservedBalance ?? 0) - amountKobo,
  }));
}

/**
 * Complete a pending credit transaction (e.g. a verified deposit): marks it completed and adds
 * its amount to the wallet. A transaction that is not pending is left untouched (applied: false).
 */
export async function completePendingCredit(
  ctx: MutationCtx,
  transactionId: Id<"walletTransactions">,
  extra?: { paymentProvider?: string; paymentReference?: string }
): Promise<LedgerResult> {
  const tx = await ctx.db.get(transactionId);
  if (!tx) throw new ConvexError("Transaction not found");
  const user = await ctx.db.get(tx.userId);
  if (!user) throw new ConvexError("User not found");

  if (tx.status !== "pending") {
    return {
      applied: false,
      amountKobo: tx.amount,
      walletBalance: user.walletBalance ?? 0,
      reservedBalance: user.reservedBalance ?? 0,
    };
  }

  const now = Date.now();
  const wallet = (user.walletBalance ?? 0) + tx.amount;
  await ctx.db.patch(tx._id, { status: "completed", completedAt: now, ...extra });
  await ctx.db.patch(tx.userId, {
    walletBalance: wallet,
    buyingPower: buyingPowerFromWalletKobo(wallet),
    updatedAt: now,
  });
  return { applied: true, amountKobo: tx.amount, walletBalance: wallet, reservedBalance: user.reservedBalance ?? 0 };
}

/** Withdrawal request: moves funds from available to pending and records a pending transaction. */
export async function requestWithdrawal(
  ctx: MutationCtx,
  entry: LedgerEntry & { paymentProvider?: string }
): Promise<LedgerResult> {
  assertValidAmount(entry.amountKobo);
  const existing = await findByReference(ctx, entry.reference);
  if (existing) {
    const u = await ctx.db.get(existing.userId);
    return { applied: false, amountKobo: existing.amount, walletBalance: u?.walletBalance ?? 0, reservedBalance: u?.reservedBalance ?? 0 };
  }
  const user = await ctx.db.get(entry.userId);
  if (!user) throw new ConvexError("User not found");
  const available = user.walletBalance ?? 0;
  if (available < entry.amountKobo) throw new ConvexError("Insufficient funds for withdrawal");

  const now = Date.now();
  const wallet = available - entry.amountKobo;
  await ctx.db.patch(entry.userId, {
    walletBalance: wallet,
    pendingBalance: (user.pendingBalance ?? 0) + entry.amountKobo,
    buyingPower: buyingPowerFromWalletKobo(wallet),
    updatedAt: now,
  });
  await ctx.db.insert("walletTransactions", {
    userId: entry.userId,
    type: "withdrawal",
    amount: entry.amountKobo,
    currency: "NGN",
    status: "pending",
    reference: entry.reference,
    description: entry.description,
    paymentProvider: entry.paymentProvider,
    createdAt: now,
  });
  return { applied: true, amountKobo: entry.amountKobo, walletBalance: wallet, reservedBalance: user.reservedBalance ?? 0 };
}

/** Approve a pending withdrawal: marks it completed and clears it from the pending balance. */
export async function completeWithdrawal(
  ctx: MutationCtx,
  transactionId: Id<"walletTransactions">
): Promise<void> {
  const tx = await ctx.db.get(transactionId);
  if (!tx || tx.type !== "withdrawal" || tx.status !== "pending") {
    throw new ConvexError("Invalid transaction for withdrawal approval");
  }
  const user = await ctx.db.get(tx.userId);
  if (!user) throw new ConvexError("User not found");
  const now = Date.now();
  await ctx.db.patch(tx._id, { status: "completed", completedAt: now });
  await ctx.db.patch(tx.userId, {
    pendingBalance: Math.max(0, (user.pendingBalance ?? 0) - tx.amount),
    updatedAt: now,
  });
}

/** Reject a pending withdrawal: returns the funds from pending to available. */
export async function rejectWithdrawal(
  ctx: MutationCtx,
  transactionId: Id<"walletTransactions">
): Promise<void> {
  const tx = await ctx.db.get(transactionId);
  if (!tx || tx.type !== "withdrawal" || tx.status !== "pending") {
    throw new ConvexError("Invalid transaction for withdrawal rejection");
  }
  const user = await ctx.db.get(tx.userId);
  if (!user) throw new ConvexError("User not found");
  const now = Date.now();
  const wallet = (user.walletBalance ?? 0) + tx.amount;
  await ctx.db.patch(tx._id, { status: "failed", completedAt: now });
  await ctx.db.patch(tx.userId, {
    walletBalance: wallet,
    pendingBalance: Math.max(0, (user.pendingBalance ?? 0) - tx.amount),
    buyingPower: buyingPowerFromWalletKobo(wallet),
    updatedAt: now,
  });
}
