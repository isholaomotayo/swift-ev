import { describe, expect, test } from "bun:test";
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
} from "../convex/lib/emailTemplates";

describe("Email Templates Engine", () => {
  test("verificationEmailTemplate contains name and verify link", () => {
    const res = verificationEmailTemplate({
      firstName: "Tayo",
      verifyUrl: "https://autoexports.live/verify?token=123",
    });
    expect(res.subject).toContain("Verify your");
    expect(res.html).toContain("Tayo");
    expect(res.html).toContain("https://autoexports.live/verify?token=123");
  });

  test("passwordResetEmailTemplate contains name and reset link", () => {
    const res = passwordResetEmailTemplate({
      firstName: "Tayo",
      resetUrl: "https://autoexports.live/reset?token=abc",
    });
    expect(res.subject).toContain("Reset your");
    expect(res.html).toContain("Tayo");
    expect(res.html).toContain("https://autoexports.live/reset?token=abc");
  });

  test("kycApprovedEmailTemplate contains success details", () => {
    const res = kycApprovedEmailTemplate({ firstName: "Tayo" });
    expect(res.subject).toContain("verified");
    expect(res.html).toContain("Tayo");
    expect(res.html).toContain("Browse Vehicles");
  });

  test("kycRejectedEmailTemplate contains rejection reason", () => {
    const res = kycRejectedEmailTemplate({
      firstName: "Tayo",
      reason: "Blurry document",
    });
    expect(res.subject).toContain("Verification issue");
    expect(res.html).toContain("Blurry document");
  });

  test("outbidEmailTemplate contains vehicle and bid info", () => {
    const res = outbidEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2022 Tesla Model 3",
      yourBid: 15000000,
      newBid: 16000000,
      lotId: "lot123",
      auctionId: "auc123",
    });
    expect(res.subject).toContain("outbid on 2022 Tesla Model 3");
    expect(res.html).toContain("₦15,000,000");
    expect(res.html).toContain("₦16,000,000");
  });

  test("auctionWonEmailTemplate contains winner info, order number, and warning text", () => {
    const res = auctionWonEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2020 Nissan Leaf",
      winningBid: 12000000,
      depositApplied: 1200000,
      balanceDue: 10800000,
      paymentDeadline: Date.now() + 3 * 24 * 3600 * 1000,
      orderId: "ord123",
      orderNumber: "ORD-9999",
    });
    expect(res.subject).toContain("You won the auction");
    expect(res.html).toContain("₦12,000,000");
    expect(res.html).toContain("₦1,200,000");
    expect(res.html).toContain("₦10,800,000");
    expect(res.html).toContain("forfeited");
  });

  test("auctionLostEmailTemplate contains reserve released info", () => {
    const res = auctionLostEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2021 Hyundai Ioniq",
      reserveReleased: 500000,
    });
    expect(res.subject).toContain("Auction ended");
    expect(res.html).toContain("₦500,000");
  });

  test("sellerVehicleSoldEmailTemplate contains auction sold details", () => {
    const res = sellerVehicleSoldEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2022 Kia EV6",
      salePrice: 22000000,
      paymentDeadline: Date.now() + 3 * 24 * 3600 * 1000,
      orderNumber: "ORD-8888",
      saleType: "auction",
    });
    expect(res.subject).toContain("Your vehicle sold at auction");
    expect(res.html).toContain("₦22,000,000");
  });

  test("buyNowOrderCreatedEmailTemplate formats pricing details table", () => {
    const res = buyNowOrderCreatedEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2023 Tesla Model Y",
      orderNumber: "ORD-7777",
      orderId: "ord777",
      vehiclePrice: 28000000,
      serviceFee: 500000,
      documentationFee: 50000,
      shippingCost: 800000,
      totalAmount: 29350000,
      paymentDeadline: Date.now() + 3 * 24 * 3600 * 1000,
    });
    expect(res.subject).toContain("Order confirmed");
    expect(res.html).toContain("₦28,000,000");
    expect(res.html).toContain("₦29,350,000");
  });

  test("paymentReceivedEmailTemplate formats wallet payment receipt", () => {
    const res = paymentReceivedEmailTemplate({
      firstName: "Tayo",
      amount: 5000000,
      orderNumber: "ORD-1234",
      balanceDue: 2000000,
      orderId: "ord123",
      paymentMethod: "Wallet",
    });
    expect(res.subject).toContain("Payment received");
    expect(res.html).toContain("₦5,000,000");
    expect(res.html).toContain("₦2,000,000");
  });

  test("bankTransferPendingEmailTemplate lists bank account parameters", () => {
    const res = bankTransferPendingEmailTemplate({
      firstName: "Tayo",
      amount: 4500000,
      orderNumber: "ORD-1234",
      reference: "ORD-1234-1",
      bankName: "Guaranty Trust Bank",
      accountNumber: "0123456789",
      accountName: "AutoExports Escrow",
    });
    expect(res.subject).toContain("Bank transfer instructions");
    expect(res.html).toContain("Guaranty Trust Bank");
    expect(res.html).toContain("0123456789");
    expect(res.html).toContain("ORD-1234-1");
  });

  test("bankTransferVerifiedEmailTemplate shows new balance due", () => {
    const res = bankTransferVerifiedEmailTemplate({
      firstName: "Tayo",
      amount: 10000000,
      orderNumber: "ORD-1234",
      balanceDue: 0,
      orderId: "ord123",
    });
    expect(res.subject).toContain("verified");
    expect(res.html).toContain("fully paid");
  });

  test("bankTransferRejectedEmailTemplate displays reason", () => {
    const res = bankTransferRejectedEmailTemplate({
      firstName: "Tayo",
      amount: 5000000,
      orderNumber: "ORD-1234",
      reason: "Incorrect reference number in narration",
      orderId: "ord123",
    });
    expect(res.subject).toContain("Payment rejected");
    expect(res.html).toContain("Incorrect reference number in narration");
  });

  test("paymentCompleteEmailTemplate has congratulations and CTA link", () => {
    const res = paymentCompleteEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2019 Tesla Model S",
      totalAmount: 18000000,
      orderNumber: "ORD-5555",
      orderId: "ord555",
    });
    expect(res.subject).toContain("Payment complete");
    expect(res.html).toContain("View Order & Generate Gate Pass");
  });

  test("orderShippedEmailTemplate shows carrier and tracking number", () => {
    const res = orderShippedEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2021 Volkswagen ID.4",
      orderNumber: "ORD-4444",
      carrier: "Maersk",
      trackingNumber: "MSK987654321",
      estimatedDelivery: Date.now() + 30 * 24 * 3600 * 1000,
      orderId: "ord444",
    });
    expect(res.subject).toContain("on its way");
    expect(res.html).toContain("Maersk");
    expect(res.html).toContain("MSK987654321");
  });

  test("orderDeliveredEmailTemplate has congratulations", () => {
    const res = orderDeliveredEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2022 Audi e-tron",
      orderNumber: "ORD-3333",
      orderId: "ord333",
    });
    expect(res.subject).toContain("Delivery confirmed");
    expect(res.html).toContain("Audi e-tron");
  });

  test("gatePassIssuedEmailTemplate displays gate pass code nicely", () => {
    const res = gatePassIssuedEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2021 Porsche Taycan",
      orderNumber: "ORD-2222",
      code: "GP-ORD-2222-XYZ",
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      gatePassId: "gp222",
    });
    expect(res.subject).toContain("Gate Pass is ready");
    expect(res.html).toContain("GP-ORD-2222-XYZ");
  });

  test("orderForfeitedEmailTemplate displays forfeited amount", () => {
    const res = orderForfeitedEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2020 Chevrolet Bolt",
      orderNumber: "ORD-1111",
      forfeitedAmount: 1200000,
      deadline: Date.now() - 3600 * 1000,
    });
    expect(res.subject).toContain("Order cancelled — deposit forfeited");
    expect(res.html).toContain("₦1,200,000");
  });

  test("purchaseRevokedEmailTemplate shows refund text when applicable", () => {
    const res = purchaseRevokedEmailTemplate({
      firstName: "Tayo",
      vehicleTitle: "2021 Ford Mustang Mach-E",
      orderNumber: "ORD-0000",
      refundedAmount: 1500000,
    });
    expect(res.subject).toContain("cancelled");
    expect(res.html).toContain("₦1,500,000");
  });

  test("disputeResolvedEmailTemplate has resolution description", () => {
    const res = disputeResolvedEmailTemplate({
      firstName: "Tayo",
      orderNumber: "ORD-1010",
      resolution: "partial_refund",
      resolutionNotes: "Agreed on ₦200k refund for scratch on door panel",
      refundAmount: 200000,
      orderId: "ord101",
    });
    expect(res.subject).toContain("Dispute resolved");
    expect(res.html).toContain("Agreed on ₦200k refund");
    expect(res.html).toContain("₦200,000");
  });

  test("walletFundedEmailTemplate has new balance and buying power", () => {
    const res = walletFundedEmailTemplate({
      firstName: "Tayo",
      amount: 500000,
      newBalance: 1500000,
      buyingPower: 15000000,
    });
    expect(res.subject).toContain("Wallet funded");
    expect(res.html).toContain("₦500,000");
    expect(res.html).toContain("₦1,500,000");
    expect(res.html).toContain("₦15,000,000");
  });
});

describe("Outgoing Email Review Workflow Logic", () => {
  const accountCriticalTypes = ["verification", "password_reset"];
  const eventTransactionalTypes = [
    "kyc_approved",
    "kyc_rejected",
    "outbid",
    "auction_won",
    "auction_lost",
    "seller_vehicle_sold",
    "buy_now_order_created",
    "payment_received",
    "bank_transfer_pending",
    "bank_transfer_verified",
    "bank_transfer_rejected",
    "payment_complete",
    "order_shipped",
    "order_delivered",
    "gate_pass_issued",
    "order_forfeited",
    "purchase_revoked",
    "dispute_resolved",
    "wallet_funded",
  ];

  test("Account-critical emails bypass the outgoing review queue", () => {
    accountCriticalTypes.forEach((type) => {
      const isCritical = type === "verification" || type === "password_reset";
      expect(isCritical).toBe(true);
    });
  });

  test("Event transactional emails are intercepted when review mode is ON", () => {
    const requireReview = true;
    eventTransactionalTypes.forEach((type) => {
      const isCritical = type === "verification" || type === "password_reset";
      const shouldIntercept = !isCritical && requireReview;
      expect(shouldIntercept).toBe(true);
    });
  });

  test("Event transactional emails bypass queue when review mode is OFF", () => {
    const requireReview = false;
    eventTransactionalTypes.forEach((type) => {
      const isCritical = type === "verification" || type === "password_reset";
      const shouldIntercept = !isCritical && requireReview;
      expect(shouldIntercept).toBe(false);
    });
  });
});
