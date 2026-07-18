import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth, requireAdmin } from "./lib/auth";
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

// =========================================================
// CANONICAL TEMPLATE REGISTRY
// Contains every email type with metadata + sample data
// =========================================================

const SAMPLE_ORDER_ID = "ord_sample123";
const SAMPLE_VEHICLE_ID = "veh_sample456";
const SAMPLE_AUCTION_ID = "auc_sample789";
const SAMPLE_DEADLINE = Date.now() + 3 * 24 * 3600 * 1000;

interface TemplateDefinition {
  emailType: string;
  category: string;
  displayName: string;
  description: string;
  render: () => { subject: string; html: string };
  sampleData: Record<string, unknown>;
}

const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  // ─── Auth & Account ────────────────────────────────────────
  {
    emailType: "verification",
    category: "Auth & Account",
    displayName: "Email Verification",
    description: "Sent when a user registers or requests a new verification link.",
    render: () =>
      verificationEmailTemplate({
        firstName: "Tayo",
        verifyUrl: "https://autoexports.live/verify-email?token=sample_token_123",
      }),
    sampleData: {
      firstName: "Tayo",
      verifyUrl: "https://autoexports.live/verify-email?token=sample_token_123",
    },
  },
  {
    emailType: "password_reset",
    category: "Auth & Account",
    displayName: "Password Reset",
    description: "Sent when a user requests a password reset link.",
    render: () =>
      passwordResetEmailTemplate({
        firstName: "Tayo",
        resetUrl: "https://autoexports.live/reset-password?token=sample_reset_abc",
      }),
    sampleData: {
      firstName: "Tayo",
      resetUrl: "https://autoexports.live/reset-password?token=sample_reset_abc",
    },
  },
  {
    emailType: "kyc_approved",
    category: "Auth & Account",
    displayName: "KYC Approved",
    description: "Sent when an admin approves a user's identity verification.",
    render: () => kycApprovedEmailTemplate({ firstName: "Tayo" }),
    sampleData: { firstName: "Tayo" },
  },
  {
    emailType: "kyc_rejected",
    category: "Auth & Account",
    displayName: "KYC Rejected",
    description: "Sent when identity verification fails or is rejected by admin.",
    render: () =>
      kycRejectedEmailTemplate({
        firstName: "Tayo",
        reason: "The uploaded government ID was blurry and unreadable.",
      }),
    sampleData: {
      firstName: "Tayo",
      reason: "The uploaded government ID was blurry and unreadable.",
    },
  },

  // ─── Auction Lifecycle ──────────────────────────────────────
  {
    emailType: "outbid",
    category: "Auction Lifecycle",
    displayName: "Outbid Notification",
    description: "Sent when a bidder is outbid on a vehicle lot.",
    render: () =>
      outbidEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        yourBid: 15_000_000,
        newBid: 16_500_000,
        lotId: "lot_sample1",
        auctionId: SAMPLE_AUCTION_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      yourBid: 15000000,
      newBid: 16500000,
      lotId: "lot_sample1",
      auctionId: SAMPLE_AUCTION_ID,
    },
  },
  {
    emailType: "auction_won",
    category: "Auction Lifecycle",
    displayName: "Auction Won",
    description: "Sent to the winning bidder when an auction lot closes.",
    render: () =>
      auctionWonEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        winningBid: 16_500_000,
        depositApplied: 1_650_000,
        balanceDue: 14_850_000,
        paymentDeadline: SAMPLE_DEADLINE,
        orderId: SAMPLE_ORDER_ID,
        orderNumber: "ORD-9999",
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      winningBid: 16500000,
      depositApplied: 1650000,
      balanceDue: 14850000,
      paymentDeadline: SAMPLE_DEADLINE,
      orderId: SAMPLE_ORDER_ID,
      orderNumber: "ORD-9999",
    },
  },
  {
    emailType: "auction_lost",
    category: "Auction Lifecycle",
    displayName: "Auction Lost / Reserve Not Met",
    description: "Sent when a bidder loses an auction or the reserve price isn't met.",
    render: () =>
      auctionLostEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2021 Hyundai Ioniq 5",
        reserveReleased: 500_000,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2021 Hyundai Ioniq 5",
      reserveReleased: 500000,
    },
  },
  {
    emailType: "seller_vehicle_sold",
    category: "Auction Lifecycle",
    displayName: "Vehicle Sold (Seller)",
    description: "Sent to the seller when their listed vehicle is sold at auction or Buy Now.",
    render: () =>
      sellerVehicleSoldEmailTemplate({
        firstName: "Amaka",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        salePrice: 16_500_000,
        paymentDeadline: SAMPLE_DEADLINE,
        orderNumber: "ORD-9999",
        saleType: "auction",
      }),
    sampleData: {
      firstName: "Amaka",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      salePrice: 16500000,
      paymentDeadline: SAMPLE_DEADLINE,
      orderNumber: "ORD-9999",
      saleType: "auction",
    },
  },

  // ─── Buy Now ───────────────────────────────────────────────
  {
    emailType: "buy_now_order_created",
    category: "Buy Now",
    displayName: "Buy Now Order Created",
    description: "Sent to the buyer when they place a Buy Now order.",
    render: () =>
      buyNowOrderCreatedEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2023 Kia EV6 GT-Line",
        orderNumber: "ORD-7777",
        orderId: SAMPLE_ORDER_ID,
        vehiclePrice: 28_000_000,
        serviceFee: 560_000,
        documentationFee: 50_000,
        shippingCost: 800_000,
        totalAmount: 29_410_000,
        paymentDeadline: SAMPLE_DEADLINE,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2023 Kia EV6 GT-Line",
      orderNumber: "ORD-7777",
      orderId: SAMPLE_ORDER_ID,
      vehiclePrice: 28000000,
      serviceFee: 560000,
      documentationFee: 50000,
      shippingCost: 800000,
      totalAmount: 29410000,
      paymentDeadline: SAMPLE_DEADLINE,
    },
  },

  // ─── Payments ──────────────────────────────────────────────
  {
    emailType: "payment_received",
    category: "Payments",
    displayName: "Payment Received",
    description: "Sent when a partial or full payment is received for an order.",
    render: () =>
      paymentReceivedEmailTemplate({
        firstName: "Tayo",
        amount: 10_000_000,
        orderNumber: "ORD-9999",
        balanceDue: 4_850_000,
        orderId: SAMPLE_ORDER_ID,
        paymentMethod: "Wallet",
      }),
    sampleData: {
      firstName: "Tayo",
      amount: 10000000,
      orderNumber: "ORD-9999",
      balanceDue: 4850000,
      orderId: SAMPLE_ORDER_ID,
      paymentMethod: "Wallet",
    },
  },
  {
    emailType: "bank_transfer_pending",
    category: "Payments",
    displayName: "Bank Transfer Instructions",
    description: "Sent when a buyer chooses bank transfer, with payment details.",
    render: () =>
      bankTransferPendingEmailTemplate({
        firstName: "Tayo",
        amount: 14_850_000,
        orderNumber: "ORD-9999",
        reference: "ORD-9999-BT1",
        bankName: "Guaranty Trust Bank",
        accountNumber: "0123456789",
        accountName: "AutoExports Escrow Limited",
      }),
    sampleData: {
      firstName: "Tayo",
      amount: 14850000,
      orderNumber: "ORD-9999",
      reference: "ORD-9999-BT1",
      bankName: "Guaranty Trust Bank",
      accountNumber: "0123456789",
      accountName: "AutoExports Escrow Limited",
    },
  },
  {
    emailType: "bank_transfer_verified",
    category: "Payments",
    displayName: "Bank Transfer Verified",
    description: "Sent when admin verifies a bank transfer payment.",
    render: () =>
      bankTransferVerifiedEmailTemplate({
        firstName: "Tayo",
        amount: 14_850_000,
        orderNumber: "ORD-9999",
        balanceDue: 0,
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      amount: 14850000,
      orderNumber: "ORD-9999",
      balanceDue: 0,
      orderId: SAMPLE_ORDER_ID,
    },
  },
  {
    emailType: "bank_transfer_rejected",
    category: "Payments",
    displayName: "Bank Transfer Rejected",
    description: "Sent when admin rejects a bank transfer (wrong reference, amount, etc.).",
    render: () =>
      bankTransferRejectedEmailTemplate({
        firstName: "Tayo",
        amount: 14_850_000,
        orderNumber: "ORD-9999",
        reason: "Incorrect reference in transfer narration.",
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      amount: 14850000,
      orderNumber: "ORD-9999",
      reason: "Incorrect reference in transfer narration.",
      orderId: SAMPLE_ORDER_ID,
    },
  },
  {
    emailType: "payment_complete",
    category: "Payments",
    displayName: "Payment Complete",
    description: "Sent when an order is fully paid.",
    render: () =>
      paymentCompleteEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        totalAmount: 16_500_000,
        orderNumber: "ORD-9999",
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      totalAmount: 16500000,
      orderNumber: "ORD-9999",
      orderId: SAMPLE_ORDER_ID,
    },
  },

  // ─── Order Lifecycle ───────────────────────────────────────
  {
    emailType: "order_shipped",
    category: "Order Lifecycle",
    displayName: "Vehicle Shipped",
    description: "Sent when a vehicle order is marked as shipped.",
    render: () =>
      orderShippedEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        orderNumber: "ORD-9999",
        carrier: "DHL Express Nigeria",
        trackingNumber: "DHL-8765432100",
        estimatedDelivery: SAMPLE_DEADLINE,
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      orderNumber: "ORD-9999",
      carrier: "DHL Express Nigeria",
      trackingNumber: "DHL-8765432100",
      estimatedDelivery: SAMPLE_DEADLINE,
      orderId: SAMPLE_ORDER_ID,
    },
  },
  {
    emailType: "order_delivered",
    category: "Order Lifecycle",
    displayName: "Vehicle Delivered",
    description: "Sent when a vehicle is marked as delivered.",
    render: () =>
      orderDeliveredEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        orderNumber: "ORD-9999",
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      orderNumber: "ORD-9999",
      orderId: SAMPLE_ORDER_ID,
    },
  },
  {
    emailType: "gate_pass_issued",
    category: "Order Lifecycle",
    displayName: "Gate Pass Issued",
    description: "Sent when a gate pass is generated for vehicle collection.",
    render: () =>
      gatePassIssuedEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        orderNumber: "ORD-9999",
        code: "AEX-7K2M",
        expiresAt: SAMPLE_DEADLINE,
        gatePassId: "gp_sample001",
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      orderNumber: "ORD-9999",
      code: "AEX-7K2M",
      expiresAt: SAMPLE_DEADLINE,
      gatePassId: "gp_sample001",
    },
  },

  // ─── Cancellations & Refunds ───────────────────────────────
  {
    emailType: "order_forfeited",
    category: "Cancellations & Refunds",
    displayName: "Order Forfeited",
    description: "Sent when an order is cancelled due to missed payment deadline and deposit is forfeited.",
    render: () =>
      orderForfeitedEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        orderNumber: "ORD-9999",
        forfeitedAmount: 1_650_000,
        deadline: SAMPLE_DEADLINE - 3 * 24 * 3600 * 1000,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      orderNumber: "ORD-9999",
      forfeitedAmount: 1650000,
      deadline: SAMPLE_DEADLINE - 3 * 24 * 3600 * 1000,
    },
  },
  {
    emailType: "purchase_revoked",
    category: "Cancellations & Refunds",
    displayName: "Purchase Revoked (Admin)",
    description: "Sent when an admin revokes a purchase and optionally refunds the deposit.",
    render: () =>
      purchaseRevokedEmailTemplate({
        firstName: "Tayo",
        vehicleTitle: "2022 Tesla Model 3 Long Range",
        orderNumber: "ORD-9999",
        refundedAmount: 1_650_000,
      }),
    sampleData: {
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3 Long Range",
      orderNumber: "ORD-9999",
      refundedAmount: 1650000,
    },
  },

  // ─── Disputes ──────────────────────────────────────────────
  {
    emailType: "dispute_resolved",
    category: "Disputes",
    displayName: "Dispute Resolved",
    description: "Sent when an admin resolves a dispute on an order.",
    render: () =>
      disputeResolvedEmailTemplate({
        firstName: "Tayo",
        orderNumber: "ORD-9999",
        resolution: "partial_refund",
        resolutionNotes: "Agreed on a partial refund of ₦200,000 for the documented scratch on the rear bumper.",
        refundAmount: 200_000,
        orderId: SAMPLE_ORDER_ID,
      }),
    sampleData: {
      firstName: "Tayo",
      orderNumber: "ORD-9999",
      resolution: "partial_refund",
      resolutionNotes: "Agreed on a partial refund of ₦200,000 for the documented scratch on the rear bumper.",
      refundAmount: 200000,
      orderId: SAMPLE_ORDER_ID,
    },
  },

  // ─── Wallet ────────────────────────────────────────────────
  {
    emailType: "wallet_funded",
    category: "Wallet",
    displayName: "Wallet Funded",
    description: "Sent when funds are successfully credited to a user's wallet.",
    render: () =>
      walletFundedEmailTemplate({
        firstName: "Tayo",
        amount: 5_000_000,
        newBalance: 8_500_000,
        buyingPower: 85_000_000,
      }),
    sampleData: {
      firstName: "Tayo",
      amount: 5000000,
      newBalance: 8500000,
      buyingPower: 85000000,
    },
  },
];

// =========================================================
// MUTATIONS & QUERIES
// =========================================================

/**
 * Seed / refresh all email templates in the database.
 * Safe to re-run — upserts based on emailType.
 * Superadmin only.
 */
export const seedEmailTemplates = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const now = Date.now();
    let created = 0;
    let updated = 0;

    for (const tpl of TEMPLATE_REGISTRY) {
      const { subject, html } = tpl.render();
      const existing = await ctx.db
        .query("emailTemplates")
        .withIndex("by_emailType", (q) => q.eq("emailType", tpl.emailType))
        .first();

      if (existing) {
        // Always refresh defaults; also sync current HTML when not admin-customised
        await ctx.db.patch(existing._id, {
          category: tpl.category,
          displayName: tpl.displayName,
          description: tpl.description,
          defaultSubject: subject,
          defaultBodyHtml: html,
          sampleDataJson: JSON.stringify(tpl.sampleData),
          updatedAt: now,
          ...(!existing.isCustomized
            ? { currentSubject: subject, currentBodyHtml: html }
            : {}),
        });
        updated++;
      } else {
        await ctx.db.insert("emailTemplates", {
          emailType: tpl.emailType,
          category: tpl.category,
          displayName: tpl.displayName,
          description: tpl.description,
          defaultSubject: subject,
          defaultBodyHtml: html,
          currentSubject: subject,
          currentBodyHtml: html,
          sampleDataJson: JSON.stringify(tpl.sampleData),
          isCustomized: false,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { success: true, created, updated, total: TEMPLATE_REGISTRY.length };
  },
});

/**
 * List all email templates grouped by category.
 * Admin only.
 */
export const listEmailTemplates = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const templates = await ctx.db.query("emailTemplates").collect();

    // Group by category preserving registry order
    const grouped: Record<string, typeof templates> = {};
    for (const tpl of templates) {
      if (!grouped[tpl.category]) grouped[tpl.category] = [];
      grouped[tpl.category].push(tpl);
    }

    // Return as ordered array matching TEMPLATE_REGISTRY category order
    const categoryOrder = [
      "Auth & Account",
      "Auction Lifecycle",
      "Buy Now",
      "Payments",
      "Order Lifecycle",
      "Cancellations & Refunds",
      "Disputes",
      "Wallet",
    ];

    const result = categoryOrder
      .filter((cat) => grouped[cat])
      .map((cat) => ({ category: cat, templates: grouped[cat] }));

    return {
      groups: result,
      totalCount: templates.length,
      customizedCount: templates.filter((t) => t.isCustomized).length,
      isSeeded: templates.length > 0,
    };
  },
});

/**
 * Get a single email template by emailType.
 * Admin only.
 */
export const getEmailTemplate = query({
  args: {
    token: v.string(),
    emailType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_emailType", (q) => q.eq("emailType", args.emailType))
      .first();

    if (!template) return null;
    return template;
  },
});

/**
 * Save admin edits to a template's subject and HTML body.
 * Marks the template as customised.
 * Admin only.
 */
export const updateEmailTemplate = mutation({
  args: {
    token: v.string(),
    emailType: v.string(),
    currentSubject: v.string(),
    currentBodyHtml: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_emailType", (q) => q.eq("emailType", args.emailType))
      .first();

    if (!template) throw new Error(`Template not found: ${args.emailType}`);

    const isChanged =
      args.currentSubject !== template.defaultSubject ||
      args.currentBodyHtml !== template.defaultBodyHtml;

    await ctx.db.patch(template._id, {
      currentSubject: args.currentSubject,
      currentBodyHtml: args.currentBodyHtml,
      isCustomized: isChanged,
      lastEditedBy: user._id,
      lastEditedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, isCustomized: isChanged };
  },
});

/**
 * Revert a template to its code-generated default.
 * Clears customisation flag.
 * Admin only.
 */
export const revertEmailTemplate = mutation({
  args: {
    token: v.string(),
    emailType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_emailType", (q) => q.eq("emailType", args.emailType))
      .first();

    if (!template) throw new Error(`Template not found: ${args.emailType}`);

    await ctx.db.patch(template._id, {
      currentSubject: template.defaultSubject,
      currentBodyHtml: template.defaultBodyHtml,
      isCustomized: false,
      lastEditedBy: user._id,
      lastEditedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Re-render the code-generated default HTML for a template (without saving).
 * Used for showing the "original" preview before any admin edits.
 * Admin only.
 */
export const renderDefaultPreview = query({
  args: {
    token: v.string(),
    emailType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const tplDef = TEMPLATE_REGISTRY.find((t) => t.emailType === args.emailType);
    if (!tplDef) return null;

    const { subject, html } = tplDef.render();
    return { subject, html, sampleData: tplDef.sampleData };
  },
});

/**
 * Internal query used by sendAndLogEmail to retrieve the Convex-stored
 * subject and HTML for a given emailType, or return null to fall back to code.
 */
export const getOrFallbackTemplate = internalQuery({
  args: { emailType: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_emailType", (q) => q.eq("emailType", args.emailType))
      .first();

    if (!template) return null;

    return {
      subject: template.currentSubject,
      html: template.currentBodyHtml,
      isCustomized: template.isCustomized,
    };
  },
});
