import { GenericMutationCtx, GenericDatabaseReader } from "convex/server";
import { DataModel, Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  assertVehicleStatusTransition,
  getVehicleStatusForOrderStatus,
  isVehicleStatus,
  restoreStatusAfterSoftHoldRelease,
  softHoldReleaseKindFromOrder,
  type OrderStatus,
  type SoftHoldReleaseKind,
  type VehicleStatus,
} from "./vehicleLifecycle";
import { koboToNaira, PAYMENT_DEADLINE_MS } from "./purchaseFlow";

type MutationCtx = GenericMutationCtx<DataModel>;

export type PlatformBankDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  currency: string;
};

const PLACEHOLDER_ACCOUNT_NUMBERS = new Set(["0000000000", "0", ""]);

export function isValidPlatformBankDetails(
  bank: Partial<PlatformBankDetails> | null | undefined
): bank is PlatformBankDetails {
  if (!bank) return false;
  const bankName = bank.bankName?.trim() ?? "";
  const accountName = bank.accountName?.trim() ?? "";
  const accountNumber = (bank.accountNumber?.trim() ?? "").replace(/\s+/g, "");
  if (bankName.length < 2 || accountName.length < 2) return false;
  if (!/^\d{10}$/.test(accountNumber)) return false;
  if (PLACEHOLDER_ACCOUNT_NUMBERS.has(accountNumber)) return false;
  return true;
}

export function normalizePlatformBankDetails(
  bank: Partial<PlatformBankDetails>
): PlatformBankDetails | null {
  const normalized: PlatformBankDetails = {
    bankName: bank.bankName?.trim() ?? "",
    accountName: bank.accountName?.trim() ?? "",
    accountNumber: (bank.accountNumber?.trim() ?? "").replace(/\s+/g, ""),
    bankCode: bank.bankCode?.trim() || undefined,
    currency: bank.currency?.trim() || "NGN",
  };
  return isValidPlatformBankDetails(normalized) ? normalized : null;
}

export async function getPlatformBankDetails(
  ctx: { db: GenericDatabaseReader<DataModel> }
): Promise<PlatformBankDetails | null> {
  const setting = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", "platform.escrowBank"))
    .first();

  if (!setting) return null;

  try {
    const parsed = JSON.parse(setting.value) as Partial<PlatformBankDetails>;
    return normalizePlatformBankDetails(parsed);
  } catch {
    return null;
  }
}

export async function requirePlatformBankDetails(
  ctx: { db: GenericDatabaseReader<DataModel> }
): Promise<PlatformBankDetails> {
  const bank = await getPlatformBankDetails(ctx);
  if (!bank) {
    throw new Error(
      "Platform escrow bank account is not configured. Please contact support."
    );
  }
  return bank;
}

function vehicleStatusOf(status: string): VehicleStatus {
  if (!isVehicleStatus(status)) {
    throw new Error(`Unknown vehicle status: ${status}`);
  }
  return status;
}

export async function syncVehicleFromOrderStatus(
  ctx: MutationCtx,
  order: Doc<"orders">,
  nextOrderStatus: OrderStatus
) {
  const vehicle = await ctx.db.get(order.vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle ${order.vehicleId} not found for order ${order._id}`);
  }

  const nextVehicleStatus = getVehicleStatusForOrderStatus(nextOrderStatus);
  if (vehicle.status === nextVehicleStatus) return nextVehicleStatus;

  assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), nextVehicleStatus);

  await ctx.db.patch(order.vehicleId, {
    status: nextVehicleStatus,
    updatedAt: Date.now(),
  });

  return nextVehicleStatus;
}

/**
 * Apply a successful payment amount (Naira) to an order and sync vehicle status.
 * Credits at most the remaining balanceDue to prevent over-credit from concurrent payments.
 */
export async function applySuccessfulPaymentToOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  amountNaira: number,
  now = Date.now(),
  exceptPaymentId?: Id<"payments">
): Promise<Doc<"orders">> {
  const order = await ctx.db.get(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    throw new Error("Cannot apply payment to a cancelled or refunded order");
  }

  if (order.status === "payment_complete" || order.balanceDue <= 0) {
    throw new Error("Order is already fully paid");
  }

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const creditNaira = Math.min(amountNaira, order.balanceDue);
  const paidAmount = Math.min(order.totalAmount, order.paidAmount + creditNaira);
  const balanceDue = Math.max(0, order.totalAmount - paidAmount);
  const status: OrderStatus =
    balanceDue <= 0
      ? "payment_complete"
      : paidAmount > 0
        ? "payment_partial"
        : "pending_payment";

  const patch: Partial<Doc<"orders">> = {
    paidAmount,
    balanceDue,
    status,
    updatedAt: now,
  };

  if (status === "payment_complete") {
    patch.paidAt = now;
  }

  await ctx.db.patch(orderId, patch);

  // Close out competing pending payment attempts once the order is settled.
  if (status === "payment_complete") {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    for (const payment of payments) {
      if (exceptPaymentId && payment._id === exceptPaymentId) continue;
      if (payment.status === "pending" || payment.status === "processing") {
        await ctx.db.patch(payment._id, {
          status: "rejected",
          rejectionReason: "Order already paid via another method",
          completedAt: now,
        });
      }
    }
  }

  const updated = (await ctx.db.get(orderId))!;
  await syncVehicleFromOrderStatus(ctx, updated, status);

  // Send D5: Payment Complete Email if the order is fully paid
  if (status === "payment_complete") {
    const user = await ctx.db.get(updated.userId);
    const vehicle = await ctx.db.get(updated.vehicleId);
    if (user && vehicle) {
      await ctx.scheduler.runAfter(0, internal.emails.sendPaymentCompleteEmail, {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        totalAmount: updated.totalAmount,
        orderNumber: updated.orderNumber,
        orderId: updated._id,
        relatedOrderId: updated._id,
        vehicleId: vehicle._id,
      });
    }
  }

  return updated;
}

export type CreateOrderPaymentArgs = {
  orderId: Id<"orders">;
  userId: Id<"users">;
  amount: number;
  currency?: string;
  provider: Doc<"payments">["provider"];
  paymentType?: Doc<"payments">["paymentType"];
  status?: Doc<"payments">["status"];
  providerReference?: string;
  buyerNote?: string;
  receiptStorageId?: Id<"_storage">;
  verifiedBy?: Id<"users">;
  verifiedAt?: number;
  completedAt?: number;
};

export async function insertPayment(
  ctx: MutationCtx,
  args: CreateOrderPaymentArgs
): Promise<Id<"payments">> {
  const now = Date.now();
  return ctx.db.insert("payments", {
    orderId: args.orderId,
    userId: args.userId,
    amount: args.amount,
    currency: args.currency ?? "NGN",
    provider: args.provider,
    providerReference: args.providerReference,
    paymentType: args.paymentType ?? "vehicle",
    status: args.status ?? "pending",
    buyerNote: args.buyerNote,
    receiptStorageId: args.receiptStorageId,
    verifiedBy: args.verifiedBy,
    verifiedAt: args.verifiedAt,
    completedAt: args.completedAt,
    createdAt: now,
  });
}

/**
 * Convert the winner's bid reserve (kobo) into an order deposit payment.
 * Deducts from reservedBalance (does not return to wallet).
 */
export async function applyBidReserveAsDepositPayment(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    userId: Id<"users">;
    winningBidNaira: number;
    relatedBidId?: Id<"bids">;
  }
): Promise<{ depositNaira: number; order: Doc<"orders"> }> {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new Error("Winner user not found");
  }

  const reserveKobo = Math.ceil(args.winningBidNaira * 10);
  const reserved = user.reservedBalance ?? 0;
  const applyKobo = Math.min(reserveKobo, reserved);
  const depositNaira = koboToNaira(applyKobo);
  const now = Date.now();

  if (applyKobo > 0) {
    await ctx.db.patch(args.userId, {
      reservedBalance: reserved - applyKobo,
      updatedAt: now,
    });

    const reference = `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await ctx.db.insert("walletTransactions", {
      userId: args.userId,
      type: "payment",
      amount: applyKobo,
      currency: "NGN",
      status: "completed",
      reference,
      description: `Deposit applied to order (10% of ₦${args.winningBidNaira.toLocaleString()})`,
      relatedOrderId: args.orderId,
      relatedBidId: args.relatedBidId,
      createdAt: now,
      completedAt: now,
    });

    await insertPayment(ctx, {
      orderId: args.orderId,
      userId: args.userId,
      amount: depositNaira,
      provider: "deposit",
      paymentType: "deposit",
      status: "successful",
      providerReference: reference,
      completedAt: now,
    });

    const order = await applySuccessfulPaymentToOrder(ctx, args.orderId, depositNaira, now);
    return { depositNaira, order };
  }

  const order = (await ctx.db.get(args.orderId))!;
  return { depositNaira: 0, order };
}

/**
 * Release a bidder's reserved funds back to available wallet (outbid / no_sale).
 */
export async function releaseUserBidReserve(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    bidAmountNaira: number;
    reason: string;
    bidId?: Id<"bids">;
  }
): Promise<number> {
  const user = await ctx.db.get(args.userId);
  if (!user) return 0;

  const reserveKobo = Math.ceil(args.bidAmountNaira * 10);
  const reserved = user.reservedBalance ?? 0;
  const releaseAmount = Math.min(reserveKobo, reserved);
  if (releaseAmount <= 0) return 0;

  const now = Date.now();
  const newWallet = (user.walletBalance ?? 0) + releaseAmount;
  await ctx.db.patch(args.userId, {
    walletBalance: newWallet,
    reservedBalance: reserved - releaseAmount,
    buyingPower: buyingPowerFromWalletBalance(newWallet),
    updatedAt: now,
  });

  await ctx.db.insert("walletTransactions", {
    userId: args.userId,
    type: "bid_release",
    amount: releaseAmount,
    currency: "NGN",
    status: "completed",
    reference: `RL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    description: `Funds released: ${args.reason}`,
    relatedBidId: args.bidId,
    createdAt: now,
    completedAt: now,
  });

  return releaseAmount;
}

/** buyingPower is max bid in Naira derived from wallet kobo. */
export function buyingPowerFromWalletBalance(walletBalanceKobo: number): number {
  return walletBalanceKobo / 10;
}

export function paymentDeadlineFrom(now = Date.now()): number {
  return now + PAYMENT_DEADLINE_MS;
}

export async function nextPaymentReferenceForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  orderNumber: string
): Promise<string> {
  const existing = await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  const n = existing.length + 1;
  return `ORD-${orderNumber}-${n}`;
}

export async function createInAppNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: Doc<"notifications">["type"];
    title: string;
    message: string;
    orderId?: Id<"orders">;
    vehicleId?: Id<"vehicles">;
    auctionId?: Id<"auctions">;
  }
) {
  await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    title: args.title,
    message: args.message,
    orderId: args.orderId,
    vehicleId: args.vehicleId,
    auctionId: args.auctionId,
    channels: ["in_app"],
    read: false,
    emailSent: false,
    smsSent: false,
    createdAt: Date.now(),
  });
}

/**
 * Cancel an unpaid soft-hold order and restore vehicle/lot to inventory.
 * Does not wipe unrelated bid reserves.
 *
 * @param refundDeposits - Admin revoke/cancel: return applied deposit to wallet.
 *   Deadline forfeit keeps deposits forfeited (default false).
 */
export async function releaseUnpaidSoftHold(
  ctx: MutationCtx,
  args: {
    order: Doc<"orders">;
    reason: string;
    now?: number;
    refundDeposits?: boolean;
  }
): Promise<{
  vehicleStatus: VehicleStatus;
  kind: SoftHoldReleaseKind;
  refundedDepositNaira: number;
}> {
  const now = args.now ?? Date.now();
  const order = args.order;
  const kind = softHoldReleaseKindFromOrder(order);
  const restoreStatus = restoreStatusAfterSoftHoldRelease(kind);

  const payments = await ctx.db
    .query("payments")
    .withIndex("by_order", (q) => q.eq("orderId", order._id))
    .collect();

  let refundedDepositNaira = 0;
  if (args.refundDeposits) {
    refundedDepositNaira = await refundAppliedDepositsToWallet(ctx, {
      order,
      payments,
      now,
      reason: args.reason,
    });
  }

  for (const p of payments) {
    if (p.status === "pending") {
      await ctx.db.patch(p._id, {
        status: "rejected",
        rejectionReason: args.reason,
        completedAt: now,
      });
    }
  }

  if (order.status !== "cancelled") {
    await ctx.db.patch(order._id, {
      status: "cancelled",
      paidAmount: args.refundDeposits ? 0 : order.paidAmount,
      balanceDue: args.refundDeposits ? order.totalAmount : order.balanceDue,
      updatedAt: now,
    });
  }

  const vehicle = await ctx.db.get(order.vehicleId);
  if (vehicle && vehicle.status === "payment_pending") {
    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), restoreStatus);
    await ctx.db.patch(order.vehicleId, {
      status: restoreStatus,
      buyItNowPurchasedAt: undefined,
      buyItNowPurchasedBy: undefined,
      updatedAt: now,
    });
  }

  if (order.auctionLotId) {
    const lot = await ctx.db.get(order.auctionLotId);
    if (lot && lot.status === "sold") {
      const nextLotStatus = kind === "auction_win" ? "no_sale" : "pending";
      await ctx.db.patch(order.auctionLotId, {
        status: nextLotStatus,
        winnerId: undefined,
        winningBid: undefined,
        soldAt: undefined,
        buyItNowPurchasedAt: undefined,
        buyItNowPurchasedBy: undefined,
      });

      const auction = await ctx.db.get(lot.auctionId);
      if (auction && auction.soldLots > 0) {
        await ctx.db.patch(lot.auctionId, {
          soldLots: Math.max(0, auction.soldLots - 1),
        });
      }
    }
  }

  return { vehicleStatus: restoreStatus, kind, refundedDepositNaira };
}

/**
 * Return successful deposit payments on an order to the buyer's available wallet.
 */
export async function refundAppliedDepositsToWallet(
  ctx: MutationCtx,
  args: {
    order: Doc<"orders">;
    payments: Doc<"payments">[];
    now: number;
    reason: string;
  }
): Promise<number> {
  const deposits = args.payments.filter(
    (p) => p.provider === "deposit" && p.status === "successful"
  );
  if (deposits.length === 0) return 0;

  let refundedNaira = 0;
  for (const dep of deposits) {
    const kobo = Math.round(dep.amount * 100);
    if (kobo <= 0) continue;

    const user = await ctx.db.get(args.order.userId);
    if (!user) continue;

    const newWallet = (user.walletBalance ?? 0) + kobo;
    await ctx.db.patch(args.order.userId, {
      walletBalance: newWallet,
      buyingPower: buyingPowerFromWalletBalance(newWallet),
      updatedAt: args.now,
    });

    await ctx.db.insert("walletTransactions", {
      userId: args.order.userId,
      type: "refund",
      amount: kobo,
      currency: "NGN",
      status: "completed",
      reference: `REV_DEP_${dep._id}_${args.now}`,
      description: `Deposit refunded: ${args.reason}`,
      relatedOrderId: args.order._id,
      createdAt: args.now,
      completedAt: args.now,
    });

    await ctx.db.patch(dep._id, {
      status: "refunded",
      completedAt: args.now,
      rejectionReason: args.reason,
    });

    refundedNaira += dep.amount;
  }

  return refundedNaira;
}
