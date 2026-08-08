"use node";

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth, requireAdmin, createAuditLog } from "./lib/auth";
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  kycApprovedEmailTemplate,
  kycRejectedEmailTemplate,
  outbidEmailTemplate,
  auctionWonEmailTemplate,
  auctionLostEmailTemplate,
  sellerVehicleSoldEmailTemplate,
  buyNowOrderCreatedEmailTemplate,
  paymentReceivedEmailTemplate,
  bankTransferPendingEmailTemplate,
  bankTransferVerifiedEmailTemplate,
  bankTransferRejectedEmailTemplate,
  paymentCompleteEmailTemplate,
  orderShippedEmailTemplate,
  orderDeliveredEmailTemplate,
  gatePassIssuedEmailTemplate,
  orderForfeitedEmailTemplate,
  purchaseRevokedEmailTemplate,
  disputeResolvedEmailTemplate,
  walletFundedEmailTemplate,
} from "./lib/emailTemplates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://autoexports.live";

// =============================================
// CORE: Send + Log
// =============================================

/**
 * Send a transactional email via Resend and log the result.
 *
 * - Checks the emailSuppressions table before sending.
 * - If RESEND_API_KEY is not set, logs to console (dev mode).
 * - Always logs to the transactionalEmails table.
 */
async function sendAndLogEmail(
  ctx: any,
  args: {
    emailType: string;
    to: string;
    subject: string;
    html: string;
    recipientUserId?: Id<"users">;
    relatedOrderId?: Id<"orders">;
    relatedVehicleId?: Id<"vehicles">;
    relatedAuctionId?: Id<"auctions">;
  }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@autoexports.live";

  // Check suppression list
  const suppression = await ctx.runQuery(
    internal.userMail.checkSuppressionQuery,
    { email: args.to.toLowerCase().trim() }
  );

  if (suppression) {
    await ctx.runMutation(internal.userMail.logTransactionalEmail, {
      emailType: args.emailType,
      recipientEmail: args.to,
      recipientUserId: args.recipientUserId,
      subject: args.subject,
      bodyHtml: args.html,
      status: "skipped_suppressed",
      errorMessage: `Suppressed: ${suppression.reason}`,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.relatedVehicleId,
      relatedAuctionId: args.relatedAuctionId,
    });
    console.log(`[EMAIL SKIPPED — suppressed] ${args.to}: ${args.subject}`);
    return;
  }

  // ─── Template Manager Override ───────────────────────────
  // If the admin has customised this template in the Email Template Manager,
  // use their saved subject/HTML instead of the code-generated version.
  let effectiveSubject = args.subject;
  let effectiveHtml = args.html;

  const storedTemplate: { subject: string; html: string; isCustomized: boolean } | null =
    await ctx.runQuery(internal.emailTemplates.getOrFallbackTemplate, {
      emailType: args.emailType,
    });

  if (storedTemplate?.isCustomized) {
    effectiveSubject = storedTemplate.subject;
    effectiveHtml = storedTemplate.html;
    console.log(`[EMAIL TEMPLATE OVERRIDE] Using customised template for: ${args.emailType}`);
  }

  // Account-critical emails bypass the outgoing email review queue
  const isCriticalEmail =
    args.emailType === "verification" || args.emailType === "password_reset";

  if (!isCriticalEmail) {
    const isReviewRequired = await ctx.runQuery(
      internal.userMail.checkReviewRequiredQuery,
      {}
    );

    if (isReviewRequired) {
      await ctx.runMutation(internal.userMail.logTransactionalEmail, {
        emailType: args.emailType,
        recipientEmail: args.to,
        recipientUserId: args.recipientUserId,
        subject: effectiveSubject,
        bodyHtml: effectiveHtml,
        status: "pending_review",
        relatedOrderId: args.relatedOrderId,
        relatedVehicleId: args.relatedVehicleId,
        relatedAuctionId: args.relatedAuctionId,
      });
      console.log(
        `[EMAIL INTERCEPTED FOR REVIEW] ${args.to}: ${effectiveSubject} (type: ${args.emailType})`
      );
      return;
    }
  }

  const isTestEmail =
    args.to.endsWith("@example.com") ||
    args.to.endsWith("@test.live") ||
    args.to.endsWith("@test.com") ||
    args.to.endsWith("@test.local") ||
    args.to.endsWith("@example.org") ||
    args.to.endsWith("@example.net") ||
    args.to.endsWith("@invalid") ||
    args.to.toLowerCase().includes("test_") ||
    args.to.toLowerCase().startsWith("e2e_") ||
    args.to.toLowerCase().startsWith("dup_") ||
    process.env.DISABLE_TEST_EMAILS === "true";

  if (!apiKey || isTestEmail) {
    // Development / Test fallback — preserve Resend quota by stubbing test emails
    console.log(`[EMAIL STUB — ${isTestEmail ? "test recipient" : "no RESEND_API_KEY"}]`, {
      to: args.to,
      from,
      subject: effectiveSubject,
      type: args.emailType,
    });
    await ctx.runMutation(internal.userMail.logTransactionalEmail, {
      emailType: args.emailType,
      recipientEmail: args.to,
      recipientUserId: args.recipientUserId,
      subject: effectiveSubject,
      bodyHtml: effectiveHtml,
      status: "skipped_dev",
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.relatedVehicleId,
      relatedAuctionId: args.relatedAuctionId,
    });
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: effectiveSubject,
        html: effectiveHtml,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Email send failed (${res.status}): ${body}`);
      await ctx.runMutation(internal.userMail.logTransactionalEmail, {
        emailType: args.emailType,
        recipientEmail: args.to,
        recipientUserId: args.recipientUserId,
        subject: effectiveSubject,
        bodyHtml: effectiveHtml,
        status: "failed",
        errorMessage: `HTTP ${res.status}: ${body}`,
        relatedOrderId: args.relatedOrderId,
        relatedVehicleId: args.relatedVehicleId,
        relatedAuctionId: args.relatedAuctionId,
      });
      return;
    }

    const data = await res.json();
    await ctx.runMutation(internal.userMail.logTransactionalEmail, {
      emailType: args.emailType,
      recipientEmail: args.to,
      recipientUserId: args.recipientUserId,
      subject: effectiveSubject,
      bodyHtml: effectiveHtml,
      status: "sent",
      resendEmailId: (data as any).id,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.relatedVehicleId,
      relatedAuctionId: args.relatedAuctionId,
    });
  } catch (err: any) {
    console.error("Email send error:", err);
    await ctx.runMutation(internal.userMail.logTransactionalEmail, {
      emailType: args.emailType,
      recipientEmail: args.to,
      recipientUserId: args.recipientUserId,
      subject: effectiveSubject,
      bodyHtml: effectiveHtml,
      status: "failed",
      errorMessage: err?.message ?? "Unknown error",
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.relatedVehicleId,
      relatedAuctionId: args.relatedAuctionId,
    });
  }
}





// =============================================
// A1: Verification Email
// =============================================

export const sendVerificationEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();

    await ctx.runMutation(internal.auth.createEmailVerificationToken, {
      userId: args.userId,
      token,
    });

    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
    const { subject, html } = verificationEmailTemplate({
      firstName: args.firstName,
      verifyUrl,
    });

    await sendAndLogEmail(ctx, {
      emailType: "verification",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// A2: Password Reset Email
// =============================================

export const sendPasswordResetEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();

    await ctx.runMutation(internal.auth.createPasswordResetToken, {
      userId: args.userId,
      token,
    });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmailTemplate({
      firstName: args.firstName,
      resetUrl,
    });

    await sendAndLogEmail(ctx, {
      emailType: "password_reset",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// A3: KYC Result Email
// =============================================

export const sendKycResultEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    approved: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = args.approved
      ? kycApprovedEmailTemplate({ firstName: args.firstName })
      : kycRejectedEmailTemplate({
          firstName: args.firstName,
          reason: args.reason ?? "Document verification failed",
        });

    await sendAndLogEmail(ctx, {
      emailType: args.approved ? "kyc_approved" : "kyc_rejected",
      to: args.email,
      subject: template.subject,
      html: template.html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// B1: Outbid Email
// =============================================

export const sendOutbidEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    yourBid: v.number(),
    newBid: v.number(),
    lotId: v.string(),
    auctionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = outbidEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      yourBid: args.yourBid,
      newBid: args.newBid,
      lotId: args.lotId,
      auctionId: args.auctionId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "outbid",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// B2: Auction Won Email
// =============================================

export const sendAuctionWonEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    winningBid: v.number(),
    depositApplied: v.number(),
    balanceDue: v.number(),
    paymentDeadline: v.number(),
    orderId: v.string(),
    orderNumber: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    auctionId: v.optional(v.id("auctions")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = auctionWonEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      winningBid: args.winningBid,
      depositApplied: args.depositApplied,
      balanceDue: args.balanceDue,
      paymentDeadline: args.paymentDeadline,
      orderId: args.orderId,
      orderNumber: args.orderNumber,
    });

    await sendAndLogEmail(ctx, {
      emailType: "auction_won",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedVehicleId: args.vehicleId,
      relatedAuctionId: args.auctionId,
    });
  },
});

// =============================================
// B3: Auction Lost (No Sale) Email
// =============================================

export const sendAuctionLostEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    reserveReleased: v.number(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = auctionLostEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      reserveReleased: args.reserveReleased,
    });

    await sendAndLogEmail(ctx, {
      emailType: "auction_lost",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// B5: Seller Vehicle Sold Email
// =============================================

export const sendSellerVehicleSoldEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    salePrice: v.number(),
    paymentDeadline: v.number(),
    orderNumber: v.string(),
    saleType: v.union(v.literal("auction"), v.literal("buy_now")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = sellerVehicleSoldEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      salePrice: args.salePrice,
      paymentDeadline: args.paymentDeadline,
      orderNumber: args.orderNumber,
      saleType: args.saleType,
    });

    await sendAndLogEmail(ctx, {
      emailType: "seller_vehicle_sold",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// C1/C2: Buy Now Order Created Email
// =============================================

export const sendBuyNowOrderEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    orderId: v.string(),
    vehiclePrice: v.number(),
    serviceFee: v.number(),
    documentationFee: v.number(),
    shippingCost: v.number(),
    totalAmount: v.number(),
    paymentDeadline: v.number(),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = buyNowOrderCreatedEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      orderId: args.orderId,
      vehiclePrice: args.vehiclePrice,
      serviceFee: args.serviceFee,
      documentationFee: args.documentationFee,
      shippingCost: args.shippingCost,
      totalAmount: args.totalAmount,
      paymentDeadline: args.paymentDeadline,
    });

    await sendAndLogEmail(ctx, {
      emailType: "buy_now_order",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// D1: Payment Received Email
// =============================================

export const sendPaymentReceivedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    amount: v.number(),
    orderNumber: v.string(),
    balanceDue: v.number(),
    orderId: v.string(),
    paymentMethod: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = paymentReceivedEmailTemplate({
      firstName: args.firstName,
      amount: args.amount,
      orderNumber: args.orderNumber,
      balanceDue: args.balanceDue,
      orderId: args.orderId,
      paymentMethod: args.paymentMethod,
    });

    await sendAndLogEmail(ctx, {
      emailType: "payment_received",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// D2: Bank Transfer Pending Email
// =============================================

export const sendBankTransferPendingEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    amount: v.number(),
    orderNumber: v.string(),
    reference: v.string(),
    bankName: v.string(),
    accountNumber: v.string(),
    accountName: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = bankTransferPendingEmailTemplate({
      firstName: args.firstName,
      amount: args.amount,
      orderNumber: args.orderNumber,
      reference: args.reference,
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
    });

    await sendAndLogEmail(ctx, {
      emailType: "bank_transfer_pending",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
    });
  },
});

// =============================================
// D3: Bank Transfer Verified Email
// =============================================

export const sendBankTransferVerifiedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    amount: v.number(),
    orderNumber: v.string(),
    balanceDue: v.number(),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = bankTransferVerifiedEmailTemplate({
      firstName: args.firstName,
      amount: args.amount,
      orderNumber: args.orderNumber,
      balanceDue: args.balanceDue,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "bank_transfer_verified",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
    });
  },
});

// =============================================
// D4: Bank Transfer Rejected Email
// =============================================

export const sendBankTransferRejectedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    amount: v.number(),
    orderNumber: v.string(),
    reason: v.string(),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = bankTransferRejectedEmailTemplate({
      firstName: args.firstName,
      amount: args.amount,
      orderNumber: args.orderNumber,
      reason: args.reason,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "bank_transfer_rejected",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
    });
  },
});

// =============================================
// D5: Payment Complete Email
// =============================================

export const sendPaymentCompleteEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    totalAmount: v.number(),
    orderNumber: v.string(),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = paymentCompleteEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      totalAmount: args.totalAmount,
      orderNumber: args.orderNumber,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "payment_complete",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// E1: Order Shipped Email
// =============================================

export const sendOrderShippedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    carrier: v.string(),
    trackingNumber: v.string(),
    estimatedDelivery: v.optional(v.number()),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = orderShippedEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      carrier: args.carrier,
      trackingNumber: args.trackingNumber,
      estimatedDelivery: args.estimatedDelivery,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "order_shipped",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// E2: Order Delivered Email
// =============================================

export const sendOrderDeliveredEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = orderDeliveredEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "order_delivered",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
    });
  },
});

// =============================================
// E3: Gate Pass Issued Email
// =============================================

export const sendGatePassIssuedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    gatePassId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = gatePassIssuedEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      code: args.code,
      expiresAt: args.expiresAt,
      gatePassId: args.gatePassId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "gate_pass_issued",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// F1: Order Forfeited Email
// =============================================

export const sendOrderForfeitedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    forfeitedAmount: v.number(),
    deadline: v.number(),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = orderForfeitedEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      forfeitedAmount: args.forfeitedAmount,
      deadline: args.deadline,
    });

    await sendAndLogEmail(ctx, {
      emailType: "order_forfeited",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// F2: Purchase Revoked Email
// =============================================

export const sendPurchaseRevokedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    vehicleTitle: v.string(),
    orderNumber: v.string(),
    refundedAmount: v.optional(v.number()),
    relatedOrderId: v.optional(v.id("orders")),
    vehicleId: v.optional(v.id("vehicles")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = purchaseRevokedEmailTemplate({
      firstName: args.firstName,
      vehicleTitle: args.vehicleTitle,
      orderNumber: args.orderNumber,
      refundedAmount: args.refundedAmount,
    });

    await sendAndLogEmail(ctx, {
      emailType: "purchase_revoked",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
      relatedVehicleId: args.vehicleId,
    });
  },
});

// =============================================
// G1: Dispute Resolved Email
// =============================================

export const sendDisputeResolvedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    orderNumber: v.string(),
    resolution: v.string(),
    resolutionNotes: v.string(),
    refundAmount: v.optional(v.number()),
    orderId: v.string(),
    relatedOrderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const { subject, html } = disputeResolvedEmailTemplate({
      firstName: args.firstName,
      orderNumber: args.orderNumber,
      resolution: args.resolution,
      resolutionNotes: args.resolutionNotes,
      refundAmount: args.refundAmount,
      orderId: args.orderId,
    });

    await sendAndLogEmail(ctx, {
      emailType: "dispute_resolved",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
      relatedOrderId: args.relatedOrderId,
    });
  },
});

// =============================================
// H1: Wallet Funded Email
// =============================================

export const sendWalletFundedEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    amount: v.number(),
    newBalance: v.number(),
    buyingPower: v.number(),
  },
  handler: async (ctx, args) => {
    const { subject, html } = walletFundedEmailTemplate({
      firstName: args.firstName,
      amount: args.amount,
      newBalance: args.newBalance,
      buyingPower: args.buyingPower,
    });

    await sendAndLogEmail(ctx, {
      emailType: "wallet_funded",
      to: args.email,
      subject,
      html,
      recipientUserId: args.userId,
    });
  },
});

// =============================================
// OUTGOING EMAIL REVIEW ADMIN APIs
// Functions moved to convex/emailAdmin.ts to comply with Convex Node.js action isolation rules.
// =============================================

/** Approve and send a pending transactional email via Resend. */
export const approveTransactionalEmail = action({
  args: {
    token: v.string(),
    emailId: v.id("transactionalEmails"),
  },
  handler: async (ctx, args) => {
    // Check auth via user query
    const user: any = await ctx.runQuery(internal.auth.getUserFromTokenQuery, {
      token: args.token,
    });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      throw new Error("Unauthorized - Admin access required");
    }

    const email: any = await ctx.runQuery(
      internal.emailAdmin.getTransactionalEmailInternal,
      { emailId: args.emailId }
    );
    if (!email) {
      throw new Error("Transactional email not found");
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "noreply@autoexports.live";

    if (!apiKey) {
      console.log("[EMAIL APPROVED — STUB DEV MODE]", {
        to: email.recipientEmail,
        subject: email.subject,
      });
      await ctx.runMutation(
        internal.emailAdmin.updateTransactionalEmailStatusInternal,
        {
          emailId: args.emailId,
          status: "skipped_dev",
          reviewedBy: user._id,
        }
      );
      return { success: true, status: "skipped_dev" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: email.recipientEmail,
          subject: email.subject,
          html: email.bodyHtml ?? "<p>No content</p>",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`Email approval send failed (${res.status}): ${body}`);
        await ctx.runMutation(
          internal.emailAdmin.updateTransactionalEmailStatusInternal,
          {
            emailId: args.emailId,
            status: "failed",
            errorMessage: body,
            reviewedBy: user._id,
          }
        );
        return { success: false, error: body };
      }

      const data = (await res.json()) as { id?: string };
      await ctx.runMutation(
        internal.emailAdmin.updateTransactionalEmailStatusInternal,
        {
          emailId: args.emailId,
          status: "sent",
          resendEmailId: data.id,
          reviewedBy: user._id,
        }
      );

      return { success: true, status: "sent", resendEmailId: data.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(
        internal.emailAdmin.updateTransactionalEmailStatusInternal,
        {
          emailId: args.emailId,
          status: "failed",
          errorMessage: msg,
          reviewedBy: user._id,
        }
      );
      return { success: false, error: msg };
    }
  },
});
