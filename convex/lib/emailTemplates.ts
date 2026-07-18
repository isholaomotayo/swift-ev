/**
 * Shared email template engine for AutoExports transactional emails.
 *
 * All templates return { subject, html, preheader } and use the branded
 * dark-mode layout with consistent styling.
 */

const APP_URL = "https://autoexports.live";
const BRAND_NAME = "AutoExports";
const BRAND_COLOR = "#0066FF";
const BRAND_COLOR_DARK = "#0052CC";

// =============================================
// LAYOUT HELPERS
// =============================================

export function emailButton(label: string, url: string): string {
  return `<a href="${url}"
    style="display:inline-block;margin:24px 0 16px;padding:14px 32px;background:${BRAND_COLOR};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;text-align:center;"
  >${label}</a>`;
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid #222;margin:24px 0;" />`;
}

export function emailKeyValue(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#888;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#eee;font-size:14px;font-weight:600;">${value}</td>
  </tr>`;
}

export function emailOrderSummaryTable(
  items: Array<{ label: string; value: string; bold?: boolean }>
): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
      <td style="padding:8px 12px;color:${item.bold ? "#fff" : "#ccc"};font-size:14px;border-bottom:1px solid #1a1a1a;font-weight:${item.bold ? "bold" : "normal"};">${item.label}</td>
      <td style="padding:8px 12px;color:${item.bold ? "#fff" : "#ccc"};font-size:14px;border-bottom:1px solid #1a1a1a;text-align:right;font-weight:${item.bold ? "bold" : "normal"};">${item.value}</td>
    </tr>`
    )
    .join("");

  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#111;border-radius:8px;overflow:hidden;margin:16px 0;">
    ${rows}
  </table>`;
}

function emailWarning(text: string): string {
  return `<div style="background:#1a1000;border:1px solid #665500;border-radius:8px;padding:12px 16px;margin:16px 0;">
    <p style="color:#ffcc00;font-size:13px;margin:0;">⚠️ ${text}</p>
  </div>`;
}

/**
 * Wraps email body content in the branded layout.
 */
export function wrapInEmailLayout(bodyHtml: string, preheader?: string): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#0a0a0a;">${preheader}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,Helvetica,sans-serif;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#000;">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0a0a;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #1a1a1a;">
        <h1 style="margin:0;font-size:22px;font-weight:bold;color:${BRAND_COLOR};letter-spacing:-0.5px;">${BRAND_NAME}</h1>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:28px 32px;">
        ${bodyHtml}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #1a1a1a;">
        <p style="color:#555;font-size:11px;margin:0 0 8px;">This email was sent by ${BRAND_NAME}. You are receiving this because you have an account at <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">autoexports.live</a>.</p>
        <p style="color:#444;font-size:11px;margin:0;">© ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// =============================================
// HELPER: Format currency
// =============================================

function naira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// =============================================
// CATEGORY A: AUTH & ACCOUNT
// =============================================

export function verificationEmailTemplate(args: {
  firstName: string;
  verifyUrl: string;
}) {
  const subject = `Verify your ${BRAND_NAME} email address`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Welcome to ${BRAND_NAME}!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Hi ${args.firstName}, thanks for registering. Please verify your email address to activate your account.</p>
    ${emailButton("Verify Email Address", args.verifyUrl)}
    <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    <p style="color:#555;font-size:11px;word-break:break-all;">Or paste this link into your browser: ${args.verifyUrl}</p>`,
    `Verify your email to get started with ${BRAND_NAME}`
  );
  return { subject, html };
}

export function passwordResetEmailTemplate(args: {
  firstName: string;
  resetUrl: string;
}) {
  const subject = `Reset your ${BRAND_NAME} password`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Password Reset Request</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Hi ${args.firstName}, we received a request to reset your password. Click the button below to choose a new one.</p>
    ${emailButton("Reset Password", args.resetUrl)}
    <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
    <p style="color:#555;font-size:11px;word-break:break-all;">Or paste this link into your browser: ${args.resetUrl}</p>`,
    "Reset your password"
  );
  return { subject, html };
}

export function kycApprovedEmailTemplate(args: { firstName: string }) {
  const subject = `Your ${BRAND_NAME} account is verified ✅`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Account Verified!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Congratulations ${args.firstName}! Your identity has been verified and your account is now fully active.</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">You can now:</p>
    <ul style="color:#ccc;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>Bid on live auctions</li>
      <li>Purchase vehicles via Buy Now</li>
      <li>Access all platform features</li>
    </ul>
    ${emailButton("Browse Vehicles", `${APP_URL}/vehicles`)}`,
    "Your account is verified — start bidding"
  );
  return { subject, html };
}

export function kycRejectedEmailTemplate(args: {
  firstName: string;
  reason: string;
}) {
  const subject = "Action required: Verification issue";
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Verification Issue</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Hi ${args.firstName}, we were unable to verify your identity.</p>
    <p style="color:#ccc;font-size:14px;">Reason: <strong style="color:#ff6b6b;">${args.reason}</strong></p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Please resubmit your documents to complete verification.</p>
    ${emailButton("Resubmit Documents", `${APP_URL}/profile`)}`,
    "We need additional information for verification"
  );
  return { subject, html };
}

// =============================================
// CATEGORY B: AUCTION LIFECYCLE
// =============================================

export function outbidEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  yourBid: number;
  newBid: number;
  lotId: string;
  auctionId: string;
}) {
  const subject = `You've been outbid on ${args.vehicleTitle}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">You've Been Outbid</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Another bidder placed a higher bid on <strong style="color:#fff;">${args.vehicleTitle}</strong>.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${emailKeyValue("Your bid", naira(args.yourBid))}
      ${emailKeyValue("Current bid", naira(args.newBid))}
    </table>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Your bid reserve has been released back to your wallet. Place a new bid before the lot closes!</p>
    ${emailButton("Place New Bid", `${APP_URL}/auctions`)}`,
    `Outbid on ${args.vehicleTitle} — place a new bid`
  );
  return { subject, html };
}

export function auctionWonEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  winningBid: number;
  depositApplied: number;
  balanceDue: number;
  paymentDeadline: number;
  orderId: string;
  orderNumber: string;
}) {
  const deadlineStr = formatDate(args.paymentDeadline);
  const subject = `🎉 You won the auction — ${args.vehicleTitle}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Congratulations — You Won!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">You've won the auction for <strong style="color:#fff;">${args.vehicleTitle}</strong>.</p>
    ${emailOrderSummaryTable([
      { label: "Winning Bid", value: naira(args.winningBid) },
      { label: "Deposit Applied", value: `- ${naira(args.depositApplied)}` },
      { label: "Balance Due", value: naira(args.balanceDue), bold: true },
    ])}
    <p style="color:#ccc;font-size:14px;">Order: <strong style="color:#fff;">#${args.orderNumber}</strong></p>
    <p style="color:#ccc;font-size:14px;">Payment deadline: <strong style="color:#fff;">${deadlineStr}</strong></p>
    ${emailButton("Complete Payment", `${APP_URL}/orders/${args.orderId}`)}
    ${emailWarning(`If payment is not completed by ${deadlineStr}, your deposit will be forfeited and the vehicle will be re-listed.`)}`,
    `You won! Complete payment for ${args.vehicleTitle}`
  );
  return { subject, html };
}

export function auctionLostEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  reserveReleased: number;
}) {
  const subject = `Auction ended — ${args.vehicleTitle}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Auction Ended</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">The auction for <strong style="color:#fff;">${args.vehicleTitle}</strong> has ended without meeting the reserve price.</p>
    ${args.reserveReleased > 0
      ? `<p style="color:#ccc;font-size:14px;">Your bid reserve of <strong style="color:#fff;">${naira(args.reserveReleased)}</strong> has been released back to your wallet.</p>`
      : ""
    }
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Browse more vehicles and join upcoming auctions.</p>
    ${emailButton("Browse Vehicles", `${APP_URL}/vehicles`)}`,
    `Auction ended for ${args.vehicleTitle}`
  );
  return { subject, html };
}

export function sellerVehicleSoldEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  salePrice: number;
  paymentDeadline: number;
  orderNumber: string;
  saleType: "auction" | "buy_now";
}) {
  const deadlineStr = formatDate(args.paymentDeadline);
  const saleLabel = args.saleType === "auction" ? "at auction" : "via Buy Now";
  const subject = `Your vehicle sold ${saleLabel} — ${args.vehicleTitle}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Vehicle Sold!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Great news, ${args.firstName}! Your <strong style="color:#fff;">${args.vehicleTitle}</strong> sold ${saleLabel}.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${emailKeyValue("Sale Price", naira(args.salePrice))}
      ${emailKeyValue("Order", `#${args.orderNumber}`)}
      ${emailKeyValue("Buyer Deadline", deadlineStr)}
    </table>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">The buyer has until ${deadlineStr} to complete payment. We'll notify you when payment is confirmed.</p>`,
    `Your ${args.vehicleTitle} has been sold`
  );
  return { subject, html };
}

// =============================================
// CATEGORY C: BUY NOW
// =============================================

export function buyNowOrderCreatedEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  orderId: string;
  vehiclePrice: number;
  serviceFee: number;
  documentationFee: number;
  shippingCost: number;
  totalAmount: number;
  paymentDeadline: number;
}) {
  const deadlineStr = formatDate(args.paymentDeadline);
  const subject = `Order confirmed — ${args.vehicleTitle} | #${args.orderNumber}`;
  const summaryItems: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: "Vehicle Price", value: naira(args.vehiclePrice) },
  ];
  if (args.serviceFee > 0) summaryItems.push({ label: "Service Fee", value: naira(args.serviceFee) });
  if (args.documentationFee > 0) summaryItems.push({ label: "Documentation Fee", value: naira(args.documentationFee) });
  if (args.shippingCost > 0) summaryItems.push({ label: "Shipping", value: naira(args.shippingCost) });
  summaryItems.push({ label: "Total", value: naira(args.totalAmount), bold: true });

  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Order Confirmed</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Hi ${args.firstName}, your order <strong style="color:#fff;">#${args.orderNumber}</strong> has been created for <strong style="color:#fff;">${args.vehicleTitle}</strong>.</p>
    ${emailOrderSummaryTable(summaryItems)}
    ${emailButton(`Complete Payment — ${naira(args.totalAmount)}`, `${APP_URL}/orders/${args.orderId}`)}
    ${emailWarning(`Payment deadline: ${deadlineStr}. The vehicle is reserved for you until then.`)}`,
    `Order #${args.orderNumber} confirmed — complete payment`
  );
  return { subject, html };
}

// =============================================
// CATEGORY D: PAYMENTS
// =============================================

export function paymentReceivedEmailTemplate(args: {
  firstName: string;
  amount: number;
  orderNumber: string;
  balanceDue: number;
  orderId: string;
  paymentMethod: string;
}) {
  const subject = `Payment received — ${naira(args.amount)} | Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Payment Received</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">We've received your ${args.paymentMethod} payment of <strong style="color:#fff;">${naira(args.amount)}</strong> for order <strong style="color:#fff;">#${args.orderNumber}</strong>.</p>
    ${emailOrderSummaryTable([
      { label: "Amount Paid", value: naira(args.amount) },
      { label: "Remaining Balance", value: naira(args.balanceDue), bold: true },
    ])}
    ${args.balanceDue > 0
      ? emailButton("Pay Remaining Balance", `${APP_URL}/orders/${args.orderId}`)
      : `<p style="color:#4ade80;font-size:15px;font-weight:bold;">✅ Your order is fully paid!</p>`
    }`,
    `${naira(args.amount)} received for Order #${args.orderNumber}`
  );
  return { subject, html };
}

export function bankTransferPendingEmailTemplate(args: {
  firstName: string;
  amount: number;
  orderNumber: string;
  reference: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const subject = `Bank transfer instructions — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Bank Transfer Instructions</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Hi ${args.firstName}, please transfer the amount below to complete your payment.</p>
    ${emailOrderSummaryTable([
      { label: "Amount", value: naira(args.amount), bold: true },
      { label: "Bank", value: args.bankName },
      { label: "Account Number", value: args.accountNumber },
      { label: "Account Name", value: args.accountName },
      { label: "Reference/Narration", value: args.reference, bold: true },
    ])}
    ${emailWarning("Use the reference above as your transfer narration. Without it we cannot match your payment.")}
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Your order is reserved while we await confirmation. Verification typically takes 1–4 hours.</p>`,
    `Transfer ${naira(args.amount)} to complete Order #${args.orderNumber}`
  );
  return { subject, html };
}

export function bankTransferVerifiedEmailTemplate(args: {
  firstName: string;
  amount: number;
  orderNumber: string;
  balanceDue: number;
  orderId: string;
}) {
  const subject = `Bank transfer verified ✅ — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Transfer Verified</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your bank transfer of <strong style="color:#fff;">${naira(args.amount)}</strong> for order <strong style="color:#fff;">#${args.orderNumber}</strong> has been verified and applied.</p>
    ${emailOrderSummaryTable([
      { label: "Amount Verified", value: naira(args.amount) },
      { label: "Remaining Balance", value: naira(args.balanceDue), bold: true },
    ])}
    ${args.balanceDue > 0
      ? emailButton("Pay Remaining Balance", `${APP_URL}/orders/${args.orderId}`)
      : `<p style="color:#4ade80;font-size:15px;font-weight:bold;">✅ Your order is fully paid!</p>`
    }`,
    `Transfer verified for Order #${args.orderNumber}`
  );
  return { subject, html };
}

export function bankTransferRejectedEmailTemplate(args: {
  firstName: string;
  amount: number;
  orderNumber: string;
  reason: string;
  orderId: string;
}) {
  const subject = `Payment rejected — Action required | Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Payment Rejected</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your bank transfer of <strong style="color:#fff;">${naira(args.amount)}</strong> for order <strong style="color:#fff;">#${args.orderNumber}</strong> was rejected.</p>
    <p style="color:#ccc;font-size:14px;">Reason: <strong style="color:#ff6b6b;">${args.reason}</strong></p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Please submit a new payment to secure your vehicle.</p>
    ${emailButton("Submit New Payment", `${APP_URL}/orders/${args.orderId}`)}`,
    `Payment rejected for Order #${args.orderNumber}`
  );
  return { subject, html };
}

export function paymentCompleteEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  totalAmount: number;
  orderNumber: string;
  orderId: string;
}) {
  const subject = `🎉 Payment complete — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Payment Complete!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your payment for <strong style="color:#fff;">${args.vehicleTitle}</strong> is complete!</p>
    ${emailOrderSummaryTable([
      { label: "Total Paid", value: naira(args.totalAmount), bold: true },
      { label: "Order", value: `#${args.orderNumber}` },
    ])}
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Your vehicle is now being prepared for delivery. You can generate your Gate Pass to collect it.</p>
    ${emailButton("View Order & Generate Gate Pass", `${APP_URL}/orders/${args.orderId}`)}`,
    `Payment complete for ${args.vehicleTitle}`
  );
  return { subject, html };
}

// =============================================
// CATEGORY E: ORDER LIFECYCLE
// =============================================

export function orderShippedEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  estimatedDelivery?: number;
  orderId: string;
}) {
  const estDelivery = args.estimatedDelivery
    ? `<p style="color:#ccc;font-size:14px;">Estimated delivery: <strong style="color:#fff;">${formatDate(args.estimatedDelivery)}</strong></p>`
    : "";
  const subject = `Your vehicle is on its way — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Vehicle Shipped!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your <strong style="color:#fff;">${args.vehicleTitle}</strong> has been shipped!</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${emailKeyValue("Carrier", args.carrier)}
      ${emailKeyValue("Tracking #", args.trackingNumber)}
    </table>
    ${estDelivery}
    ${emailButton("Track Shipment", `${APP_URL}/orders/${args.orderId}`)}`,
    `${args.vehicleTitle} shipped — tracking #${args.trackingNumber}`
  );
  return { subject, html };
}

export function orderDeliveredEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  orderId: string;
}) {
  const subject = `Delivery confirmed ✅ — ${args.vehicleTitle}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Vehicle Delivered!</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your <strong style="color:#fff;">${args.vehicleTitle}</strong> has been successfully delivered and released.</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Thank you for choosing ${BRAND_NAME}! If you notice any issues with the vehicle, you can file a dispute within 7 days.</p>
    ${emailButton("View Order", `${APP_URL}/orders/${args.orderId}`)}`,
    `Your ${args.vehicleTitle} has been delivered`
  );
  return { subject, html };
}

export function gatePassIssuedEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  code: string;
  expiresAt: number;
  gatePassId: string;
}) {
  const expiryStr = formatDate(args.expiresAt);
  const subject = `Your Gate Pass is ready — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Gate Pass Issued</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your Gate Pass has been issued for <strong style="color:#fff;">${args.vehicleTitle}</strong>.</p>
    <div style="background:#111;border:2px solid ${BRAND_COLOR};border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
      <p style="color:#888;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Gate Pass Code</p>
      <p style="color:#fff;font-size:28px;font-weight:bold;margin:0;letter-spacing:2px;font-family:monospace;">${args.code}</p>
    </div>
    <p style="color:#ccc;font-size:14px;">This pass is valid for 7 days — expires <strong style="color:#fff;">${expiryStr}</strong>.</p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">Present this code or the QR from your dashboard at the gate to release your vehicle.</p>
    ${emailButton("View Gate Pass", `${APP_URL}/gate-pass/${args.gatePassId}`)}`,
    `Gate Pass ${args.code} ready for ${args.vehicleTitle}`
  );
  return { subject, html };
}

// =============================================
// CATEGORY F: CANCELLATIONS & REFUNDS
// =============================================

export function orderForfeitedEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  forfeitedAmount: number;
  deadline: number;
}) {
  const deadlineStr = formatDate(args.deadline);
  const subject = `Order cancelled — deposit forfeited | #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Order Cancelled</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your order <strong style="color:#fff;">#${args.orderNumber}</strong> for <strong style="color:#fff;">${args.vehicleTitle}</strong> has been cancelled because payment was not completed by the deadline (${deadlineStr}).</p>
    ${args.forfeitedAmount > 0
      ? `<p style="color:#ff6b6b;font-size:14px;font-weight:bold;">Your deposit of ${naira(args.forfeitedAmount)} has been forfeited.</p>`
      : `<p style="color:#ccc;font-size:14px;">The reservation has been released.</p>`
    }
    <p style="color:#ccc;font-size:14px;line-height:1.6;">The vehicle has been re-listed and is available again.</p>
    ${emailButton("Browse Vehicles", `${APP_URL}/vehicles`)}`,
    `Order #${args.orderNumber} cancelled — deposit forfeited`
  );
  return { subject, html };
}

export function purchaseRevokedEmailTemplate(args: {
  firstName: string;
  vehicleTitle: string;
  orderNumber: string;
  refundedAmount?: number;
}) {
  const subject = `Order #${args.orderNumber} has been cancelled`;
  const refundText = args.refundedAmount && args.refundedAmount > 0
    ? ` Your deposit of <strong style="color:#4ade80;">${naira(args.refundedAmount)}</strong> has been returned to your wallet.`
    : "";
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Purchase Revoked</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your reservation for <strong style="color:#fff;">${args.vehicleTitle}</strong> (order <strong style="color:#fff;">#${args.orderNumber}</strong>) has been revoked.${refundText}</p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;">The vehicle is available again for purchase.</p>
    ${emailButton("Browse Vehicles", `${APP_URL}/vehicles`)}`,
    `Order #${args.orderNumber} has been cancelled`
  );
  return { subject, html };
}

// =============================================
// CATEGORY G: DISPUTES
// =============================================

export function disputeResolvedEmailTemplate(args: {
  firstName: string;
  orderNumber: string;
  resolution: string;
  resolutionNotes: string;
  refundAmount?: number;
  orderId: string;
}) {
  const refundText = args.refundAmount && args.refundAmount > 0
    ? `<p style="color:#4ade80;font-size:14px;font-weight:bold;">A refund of ${naira(args.refundAmount)} has been issued.</p>`
    : "";
  const subject = `Dispute resolved — Order #${args.orderNumber}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Dispute Resolved</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">Your dispute for order <strong style="color:#fff;">#${args.orderNumber}</strong> has been resolved.</p>
    <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${emailKeyValue("Resolution", args.resolution.replace(/_/g, " "))}
      ${emailKeyValue("Notes", args.resolutionNotes)}
    </table>
    ${refundText}
    ${emailButton("View Order", `${APP_URL}/orders/${args.orderId}`)}`,
    `Dispute resolved for Order #${args.orderNumber}`
  );
  return { subject, html };
}

// =============================================
// CATEGORY H: WALLET
// =============================================

export function walletFundedEmailTemplate(args: {
  firstName: string;
  amount: number;
  newBalance: number;
  buyingPower: number;
}) {
  const subject = `Wallet funded — ${naira(args.amount)}`;
  const html = wrapInEmailLayout(
    `<h2 style="color:#fff;font-size:20px;margin:0 0 12px;">Wallet Funded</h2>
    <p style="color:#ccc;font-size:16px;line-height:1.6;">${naira(args.amount)} has been added to your ${BRAND_NAME} wallet.</p>
    ${emailOrderSummaryTable([
      { label: "Amount Added", value: naira(args.amount) },
      { label: "New Balance", value: naira(args.newBalance), bold: true },
      { label: "Buying Power", value: naira(args.buyingPower) },
    ])}
    ${emailButton("Browse Vehicles", `${APP_URL}/vehicles`)}`,
    `${naira(args.amount)} added to your wallet`
  );
  return { subject, html };
}
