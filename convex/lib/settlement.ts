import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { credit, nairaToKobo } from "./ledger";
import { createInAppNotification, syncVehicleFromOrderStatus } from "./payments";

/**
 * Order settlement: the single place that decides seller commission, pays the seller,
 * and marks an order delivered. All amounts here are Naira (order currency); the ledger
 * receives kobo.
 */

const DEFAULT_SELLER_COMMISSION_RATE = 0.05;

export async function getSellerCommissionRate(ctx: QueryCtx | MutationCtx): Promise<number> {
  const setting = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", "seller_commission_percentage"))
    .first();
  const parsed = setting?.value ? parseFloat(setting.value) : NaN;
  return Number.isNaN(parsed) ? DEFAULT_SELLER_COMMISSION_RATE : parsed / 100;
}

export interface CommissionInput {
  subtotal: number;
  isChinaImport?: boolean;
  facilitatorPercent?: number;
  fractionalReps?: { repId: Id<"users">; role: string; sharePercent: number }[];
}

/** China import lead (3%), sales facilitator and fractional rep shares of an order subtotal. */
export function computeOrderCommissions(input: CommissionInput) {
  const chinaImportLeadCommission = (input.isChinaImport ?? true) ? Math.round(input.subtotal * 0.03) : 0;
  const facilitatorCommissionPercent = input.facilitatorPercent ?? 0;
  const facilitatorCommissionAmount = Math.round(input.subtotal * (facilitatorCommissionPercent / 100));
  const fractionalCommissions = (input.fractionalReps ?? []).map((rep) => ({
    repId: rep.repId,
    role: rep.role,
    sharePercent: rep.sharePercent,
    amount: Math.round(input.subtotal * (rep.sharePercent / 100)),
  }));
  const totalCommissions =
    chinaImportLeadCommission +
    facilitatorCommissionAmount +
    fractionalCommissions.reduce((sum, r) => sum + r.amount, 0);
  return {
    subtotal: input.subtotal,
    chinaImportLeadCommission,
    facilitatorCommissionPercent,
    facilitatorCommissionAmount,
    fractionalCommissions,
    totalCommissions,
  };
}

export function sellerPayoutReference(order: Doc<"orders">): string {
  return `payout_order_${order.orderNumber}`;
}

export interface PayoutResult {
  applied: boolean; // false when the seller was already paid for this order
  payoutNaira: number;
  commissionNaira: number;
}

/**
 * Pay the seller for an order: subtotal minus the seller commission. Idempotent per order.
 * Returns null when the vehicle has no seller to pay.
 */
export async function settleSellerPayout(
  ctx: MutationCtx,
  order: Doc<"orders">
): Promise<PayoutResult | null> {
  const vehicle = await ctx.db.get(order.vehicleId);
  if (!vehicle?.sellerId) return null;

  const rate = await getSellerCommissionRate(ctx);
  const commissionNaira = order.subtotal * rate;
  const payoutNaira = order.subtotal - commissionNaira;

  const result = await credit(ctx, {
    userId: vehicle.sellerId,
    amountKobo: nairaToKobo(payoutNaira),
    type: "sale_payout",
    reference: sellerPayoutReference(order),
    description: `Sale payout for order ${order.orderNumber}`,
    relatedOrderId: order._id,
  });

  if (result.applied) {
    await createInAppNotification(ctx, {
      userId: vehicle.sellerId,
      type: "system",
      title: "Funds Released",
      message: `Order ${order.orderNumber} completed. ₦${payoutNaira.toLocaleString()} has been added to your wallet balance (after ₦${commissionNaira.toLocaleString()} platform commission).`,
      orderId: order._id,
      vehicleId: vehicle._id,
    });
  }

  return { applied: result.applied, payoutNaira, commissionNaira };
}

/**
 * Mark an order delivered: order + vehicle status, seller payout, buyer notification and email.
 * Safe to call again for an already-delivered order (payout is idempotent, status is unchanged).
 */
export async function markOrderDelivered(
  ctx: MutationCtx,
  order: Doc<"orders">,
  opts: { fulfillGuarantee?: boolean } = {}
): Promise<{ payout: PayoutResult | null }> {
  const now = Date.now();
  const alreadyDelivered = order.status === "delivered";

  if (!alreadyDelivered) {
    await ctx.db.patch(order._id, {
      status: "delivered",
      deliveredAt: now,
      ...(opts.fulfillGuarantee ? { guaranteeStatus: "fulfilled" as const } : {}),
      updatedAt: now,
    });
    await syncVehicleFromOrderStatus(ctx, order, "delivered");
  }

  const payout = await settleSellerPayout(ctx, order);

  if (!alreadyDelivered) {
    const vehicle = await ctx.db.get(order.vehicleId);
    const buyer = await ctx.db.get(order.userId);
    if (vehicle && buyer) {
      await createInAppNotification(ctx, {
        userId: buyer._id,
        type: "system",
        title: "Delivery Confirmed",
        message: opts.fulfillGuarantee
          ? "You have successfully confirmed delivery of your vehicle. The Money-Back Guarantee has been marked as fulfilled."
          : `Your vehicle for order ${order.orderNumber} has been released and marked delivered.`,
        orderId: order._id,
        vehicleId: vehicle._id,
      });
      await ctx.scheduler.runAfter(0, internal.emails.sendOrderDeliveredEmail, {
        userId: buyer._id,
        email: buyer.email,
        firstName: buyer.firstName,
        vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        orderNumber: order.orderNumber,
        orderId: order._id,
        relatedOrderId: order._id,
      });
    }
  }

  return { payout };
}
