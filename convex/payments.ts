import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAuth, requireAdmin, createAuditLog } from "./lib/auth";
import { verifyFlutterwaveTransaction } from "./lib/flutterwave";
import {
  applySuccessfulPaymentToOrder,
  createInAppNotification,
  getPlatformBankDetails,
  requirePlatformBankDetails,
  insertPayment,
  nextPaymentReferenceForOrder,
  buyingPowerFromWalletBalance,
  releaseUnpaidSoftHold,
} from "./lib/payments";

/**
 * Order payment state for checkout UI
 */
export const getOrderPaymentState = query({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isBuyer = order.userId === user._id;
    const vehicle = await ctx.db.get(order.vehicleId);
    const isSeller = !!vehicle?.sellerId && vehicle.sellerId === user._id;
    if (!isBuyer && !isAdmin && !isSeller) {
      throw new Error("Unauthorized");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    const bank = await getPlatformBankDetails(ctx);
    const walletUser = await ctx.db.get(order.userId);
    const walletAvailable = walletUser?.walletBalance ?? 0;

    const pendingBank = payments.find(
      (p) => p.provider === "bank_transfer" && p.status === "pending"
    );

    return {
      order,
      payments: payments.sort((a, b) => b.createdAt - a.createdAt),
      bank,
      bankConfigured: !!bank,
      walletAvailableKobo: isBuyer || isAdmin ? walletAvailable : 0,
      pendingBankTransfer: pendingBank ?? null,
      canPay:
        isBuyer &&
        order.balanceDue > 0 &&
        order.status !== "cancelled" &&
        order.status !== "refunded",
      viewerRole: isBuyer || isAdmin ? "buyer_or_admin" : "seller",
    };
  },
});

/**
 * Buyer initiates bank transfer — creates pending payment with unique reference
 */
export const initiateBankTransferPayment = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    amount: v.optional(v.number()),
    buyerNote: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== user._id) throw new Error("Unauthorized");
    if (order.balanceDue <= 0) throw new Error("Order is already paid");
    if (order.status === "cancelled" || order.status === "refunded") {
      throw new Error("Order cannot accept payments");
    }

    const bank = await requirePlatformBankDetails(ctx);

    const existingPending = (
      await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
        .collect()
    ).find((p) => p.provider === "bank_transfer" && p.status === "pending");

    if (existingPending) {
      return {
        paymentId: existingPending._id,
        reference: existingPending.providerReference,
        amount: existingPending.amount,
        bank,
        message: "Existing pending bank transfer found",
      };
    }

    const amount = args.amount ?? order.balanceDue;
    if (amount <= 0 || amount > order.balanceDue) {
      throw new Error("Invalid payment amount");
    }

    const reference = await nextPaymentReferenceForOrder(
      ctx,
      order._id,
      order.orderNumber
    );
    const paymentId = await insertPayment(ctx, {
      orderId: order._id,
      userId: user._id,
      amount,
      provider: "bank_transfer",
      paymentType: "vehicle",
      status: "pending",
      providerReference: reference,
      buyerNote: args.buyerNote,
      receiptStorageId: args.receiptStorageId,
    });

    return {
      paymentId,
      reference,
      amount,
      bank,
      message: "Transfer the exact amount using the reference as narration",
    };
  },
});

/**
 * Pay remaining balance from wallet
 */
export const payOrderFromWallet = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== user._id) throw new Error("Unauthorized");
    if (order.balanceDue <= 0) throw new Error("Order is already paid");
    if (order.status === "cancelled" || order.status === "refunded") {
      throw new Error("Order cannot accept payments");
    }

    const amountNaira = args.amount ?? order.balanceDue;
    if (amountNaira <= 0 || amountNaira > order.balanceDue) {
      throw new Error("Invalid payment amount");
    }

    const walletUser = await ctx.db.get(user._id);
    if (!walletUser) throw new Error("User not found");

    const amountKobo = Math.round(amountNaira * 100);
    const available = walletUser.walletBalance ?? 0;
    if (available < amountKobo) {
      throw new Error(
        `Insufficient wallet balance. Need ₦${amountNaira.toLocaleString()} but only have ₦${(available / 100).toLocaleString()}`
      );
    }

    const now = Date.now();
    const newBalance = available - amountKobo;
    await ctx.db.patch(user._id, {
      walletBalance: newBalance,
      buyingPower: buyingPowerFromWalletBalance(newBalance),
      updatedAt: now,
    });

    const reference = await nextPaymentReferenceForOrder(
      ctx,
      order._id,
      order.orderNumber
    );
    await ctx.db.insert("walletTransactions", {
      userId: user._id,
      type: "payment",
      amount: amountKobo,
      currency: "NGN",
      status: "completed",
      reference,
      description: `Payment for order ${order.orderNumber}`,
      relatedOrderId: order._id,
      createdAt: now,
      completedAt: now,
    });

    await insertPayment(ctx, {
      orderId: order._id,
      userId: user._id,
      amount: amountNaira,
      provider: "wallet",
      paymentType: "vehicle",
      status: "successful",
      providerReference: reference,
      completedAt: now,
    });

    const updated = await applySuccessfulPaymentToOrder(ctx, order._id, amountNaira, now);

    await createInAppNotification(ctx, {
      userId: user._id,
      type: "payment_received",
      title: "Payment received",
      message: `₦${amountNaira.toLocaleString()} applied to order ${order.orderNumber}. Balance due: ₦${updated.balanceDue.toLocaleString()}.`,
      orderId: order._id,
      vehicleId: order.vehicleId,
    });

    return { success: true, order: updated };
  },
});

/**
 * Initiate Flutterwave card payment for order balance
 */
export const initiateCardPayment = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== user._id) throw new Error("Unauthorized");
    if (order.balanceDue <= 0) throw new Error("Order is already paid");

    const amountNaira = args.amount ?? order.balanceDue;
    if (amountNaira <= 0 || amountNaira > order.balanceDue) {
      throw new Error("Invalid payment amount");
    }

    const reference = await nextPaymentReferenceForOrder(
      ctx,
      order._id,
      order.orderNumber
    );

    await insertPayment(ctx, {
      orderId: order._id,
      userId: user._id,
      amount: amountNaira,
      provider: "flutterwave",
      paymentType: "vehicle",
      status: "pending",
      providerReference: reference,
    });

    return {
      success: true,
      txRef: reference,
      amount: amountNaira,
      currency: "NGN",
      email: user.email,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
      phone: (await ctx.db.get(user._id))?.phone,
    };
  },
});

/**
 * Confirm Flutterwave card payment for an order
 */
export const confirmCardPayment = mutation({
  args: {
    token: v.string(),
    txRef: v.string(),
    transactionId: v.union(v.number(), v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    return await processOrderCardPayment(ctx, args.txRef, args.transactionId, user._id);
  },
});

export const processOrderCardPaymentWebhook = internalMutation({
  args: {
    txRef: v.string(),
    transactionId: v.union(v.number(), v.string()),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_provider_reference", (q) => q.eq("providerReference", args.txRef))
      .first();
    if (!payment) throw new Error("Payment not found");
    return await processOrderCardPayment(ctx, args.txRef, args.transactionId, payment.userId);
  },
});

async function processOrderCardPayment(
  ctx: any,
  txRef: string,
  transactionId: number | string,
  expectedUserId: string
) {
  const payment = await ctx.db
    .query("payments")
    .withIndex("by_provider_reference", (q: any) => q.eq("providerReference", txRef))
    .first();

  if (!payment || payment.userId !== expectedUserId) {
    throw new Error("Payment not found");
  }

  if (payment.status === "successful") {
    return { success: true, message: "Payment already confirmed" };
  }

  if (payment.provider !== "flutterwave") {
    throw new Error("Not a card payment");
  }

  const verification = await verifyFlutterwaveTransaction(transactionId);

  if (verification.tx_ref !== txRef) {
    throw new Error("Flutterwave reference mismatch");
  }

  if (verification.status !== "successful") {
    await ctx.db.patch(payment._id, {
      status: "failed",
      failureReason: "Payment not successful",
      completedAt: Date.now(),
    });
    throw new Error("Payment not successful");
  }

  if (verification.currency !== "NGN") {
    await ctx.db.patch(payment._id, {
      status: "failed",
      failureReason: "Invalid payment currency",
      completedAt: Date.now(),
    });
    throw new Error("Invalid payment currency");
  }

  const paidAmount = verification.charged_amount ?? verification.amount;
  if (paidAmount + 0.01 < payment.amount) {
    throw new Error("Payment amount is insufficient");
  }

  const now = Date.now();
  let updated;
  try {
    updated = await applySuccessfulPaymentToOrder(
      ctx,
      payment.orderId,
      payment.amount,
      now,
      payment._id
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment could not be applied";
    await ctx.db.patch(payment._id, {
      status: "rejected",
      rejectionReason: message,
      failureReason: message,
      completedAt: now,
    });
    throw error;
  }

  await ctx.db.patch(payment._id, {
    status: "successful",
    completedAt: now,
    rejectionReason: undefined,
    failureReason: undefined,
  });

  await createInAppNotification(ctx, {
    userId: payment.userId,
    type: "payment_received",
    title: "Card payment received",
    message: `₦${payment.amount.toLocaleString()} applied to your order. Balance due: ₦${updated.balanceDue.toLocaleString()}.`,
    orderId: payment.orderId,
    vehicleId: updated.vehicleId,
  });

  return { success: true, order: updated };
}

/**
 * Admin: list payments (pending verification queue)
 */
export const listPayments = query({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("successful"),
        v.literal("failed"),
        v.literal("refunded"),
        v.literal("rejected")
      )
    ),
    provider: v.optional(
      v.union(
        v.literal("paystack"),
        v.literal("flutterwave"),
        v.literal("bank_transfer"),
        v.literal("deposit"),
        v.literal("wallet")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    let payments = args.status
      ? await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("payments").collect();

    if (args.provider) {
      payments = payments.filter((p) => p.provider === args.provider);
    }

    payments.sort((a, b) => b.createdAt - a.createdAt);
    const limit = args.limit ?? 100;
    const sliced = payments.slice(0, limit);

    const enriched = await Promise.all(
      sliced.map(async (payment) => {
        const order = await ctx.db.get(payment.orderId);
        const payer = await ctx.db.get(payment.userId);
        return {
          ...payment,
          orderNumber: order?.orderNumber,
          orderBalanceDue: order?.balanceDue,
          orderStatus: order?.status,
          userEmail: payer?.email,
          userName: payer
            ? `${payer.firstName ?? ""} ${payer.lastName ?? ""}`.trim()
            : undefined,
          receiptUrl: payment.receiptStorageId
            ? await ctx.storage.getUrl(payment.receiptStorageId)
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Admin: verify a pending bank transfer
 */
export const verifyPayment = mutation({
  args: {
    token: v.string(),
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAuth(ctx, args.token);
    requireAdmin(admin);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.provider !== "bank_transfer") {
      throw new Error("Only bank transfer payments can be manually verified");
    }
    if (payment.status !== "pending" && payment.status !== "processing") {
      throw new Error(`Payment cannot be verified from status: ${payment.status}`);
    }

    const now = Date.now();
    let updated;
    try {
      updated = await applySuccessfulPaymentToOrder(
        ctx,
        payment.orderId,
        payment.amount,
        now,
        args.paymentId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment could not be applied";
      await ctx.db.patch(args.paymentId, {
        status: "rejected",
        rejectionReason: message,
        failureReason: message,
        verifiedBy: admin._id,
        verifiedAt: now,
        completedAt: now,
      });
      throw error;
    }

    await ctx.db.patch(args.paymentId, {
      status: "successful",
      verifiedBy: admin._id,
      verifiedAt: now,
      completedAt: now,
      rejectionReason: undefined,
      failureReason: undefined,
    });

    await createInAppNotification(ctx, {
      userId: payment.userId,
      type: "payment_received",
      title: "Payment verified",
      message: `Your bank transfer of ₦${payment.amount.toLocaleString()} was verified. Balance due: ₦${updated.balanceDue.toLocaleString()}.`,
      orderId: payment.orderId,
      vehicleId: updated.vehicleId,
    });

    await createAuditLog(ctx, {
      userId: admin._id,
      action: "verify_payment",
      entityType: "payment",
      entityId: args.paymentId,
      changes: { amount: payment.amount, orderId: payment.orderId },
    });

    return { success: true, order: updated };
  },
});

/**
 * Admin: reject a pending bank transfer
 */
export const rejectPayment = mutation({
  args: {
    token: v.string(),
    paymentId: v.id("payments"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAuth(ctx, args.token);
    requireAdmin(admin);

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.provider !== "bank_transfer") {
      throw new Error("Only bank transfer payments can be manually rejected");
    }
    if (payment.status !== "pending" && payment.status !== "processing") {
      throw new Error(`Payment cannot be rejected from status: ${payment.status}`);
    }

    const reason = args.reason.trim();
    if (reason.length < 3) throw new Error("Rejection reason is required");

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: "rejected",
      rejectionReason: reason,
      verifiedBy: admin._id,
      verifiedAt: now,
      completedAt: now,
      failureReason: reason,
    });

    await createInAppNotification(ctx, {
      userId: payment.userId,
      type: "payment_reminder",
      title: "Payment rejected",
      message: `Your bank transfer of ₦${payment.amount.toLocaleString()} was rejected: ${reason}. Please submit a new payment.`,
      orderId: payment.orderId,
    });

    await createAuditLog(ctx, {
      userId: admin._id,
      action: "reject_payment",
      entityType: "payment",
      entityId: args.paymentId,
      changes: { reason },
    });

    return { success: true };
  },
});

/**
 * Cron: forfeit deposits on overdue unpaid orders
 */
export const processOverdueOrders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pending_payment"))
      .collect();
    const partial = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "payment_partial"))
      .collect();

    const overdue = [...pending, ...partial].filter(
      (o) => o.paymentDeadline < now && o.balanceDue > 0
    );

    let forfeited = 0;
    let escalated = 0;

    for (const order of overdue) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();

      // Safety: verified non-deposit payments or pending bank transfers need admin review.
      const hasNonDepositPayment = payments.some(
        (p) => p.status === "successful" && p.provider !== "deposit"
      );
      const hasPendingBankTransfer = payments.some(
        (p) => p.provider === "bank_transfer" && p.status === "pending"
      );
      if (hasNonDepositPayment || hasPendingBankTransfer) {
        // Leave for admin review (pending bank queue / partial settlement).
        escalated += 1;
        continue;
      }

      // Applied deposits were already deducted from reservedBalance at apply time.
      // Do not wipe the buyer's entire reservedBalance (other active bids may depend on it).
      const depositPayments = payments.filter(
        (p) => p.provider === "deposit" && p.status === "successful"
      );
      const forfeitedDepositNaira = depositPayments.reduce((sum, p) => sum + p.amount, 0);

      const vehicle = await ctx.db.get(order.vehicleId);
      await releaseUnpaidSoftHold(ctx, {
        order,
        reason: "Order forfeited due to payment deadline",
        now,
      });
      forfeited += 1;

      await createInAppNotification(ctx, {
        userId: order.userId,
        type: "system",
        title: "Order cancelled — deposit forfeited",
        message:
          forfeitedDepositNaira > 0
            ? `Order ${order.orderNumber} was cancelled because payment was not completed by the deadline. Your deposit of ₦${forfeitedDepositNaira.toLocaleString()} has been forfeited and the vehicle is available again.`
            : `Order ${order.orderNumber} was cancelled because payment was not completed by the deadline. The reservation has been released.`,
        orderId: order._id,
        vehicleId: order.vehicleId,
      });

      if (vehicle?.sellerId) {
        await createInAppNotification(ctx, {
          userId: vehicle.sellerId,
          type: "system",
          title: "Buyer payment forfeited",
          message: `The buyer for ${vehicle.year} ${vehicle.make} ${vehicle.model} failed to pay. Reservation released — vehicle available again.`,
          vehicleId: order.vehicleId,
        });
      }
    }

    return { processed: forfeited, escalated, overdue: overdue.length };
  },
});
