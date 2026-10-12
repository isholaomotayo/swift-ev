import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { calculateBuyNowPricing, type DestinationPort } from "./buyNowPricing";
import { generateUniqueOrderNumber } from "./orders";
import { createInAppNotification, paymentDeadlineFrom } from "./payments";
import { transitionVehicle } from "./vehicleTransition";

/**
 * Buy Now orders: the shared steps of buying a vehicle outright, whether it is a plain listing
 * (vehicles.purchaseVehicleDirectly) or a pre-auction lot (auctions.purchaseBuyItNow).
 * Callers keep their own eligibility checks and any lot-specific side effects.
 */

/** The caller's own unpaid reservation for this vehicle, if they are resuming one. */
export async function findResumableBuyNowOrder(
  ctx: MutationCtx,
  userId: Id<"users">,
  vehicle: Doc<"vehicles">
) {
  if (vehicle.status !== "payment_pending" || vehicle.buyItNowPurchasedBy !== userId) {
    return null;
  }
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
    .collect();
  return (
    orders.find(
      (o) => o.userId === userId && (o.status === "pending_payment" || o.status === "payment_partial")
    ) ?? null
  );
}

/**
 * Put the vehicle on soft hold (payment_pending), create the pending-payment order, and send
 * the buyer and seller notifications and emails.
 */
export async function placeBuyNowOrder(
  ctx: MutationCtx,
  args: {
    user: Pick<Doc<"users">, "_id" | "email" | "firstName">;
    vehicle: Doc<"vehicles">;
    priceNaira: number;
    destination: DestinationPort;
    lot?: Doc<"auctionLots">;
    now: number;
  }
): Promise<{ orderId: Id<"orders">; orderNumber: string }> {
  const { user, vehicle, lot, now } = args;
  const pricing = calculateBuyNowPricing(args.priceNaira, args.destination);
  const deadline = paymentDeadlineFrom(now);
  const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  await transitionVehicle(ctx, vehicle._id, "payment_pending", {
    buyItNowPrice: args.priceNaira,
    buyItNowEnabled: true,
    buyItNowPurchasedAt: now,
    buyItNowPurchasedBy: user._id,
  });

  const orderNumber = await generateUniqueOrderNumber(ctx);
  const orderId = await ctx.db.insert("orders", {
    orderNumber,
    userId: user._id,
    vehicleId: vehicle._id,
    ...(lot ? { auctionLotId: lot._id } : {}),
    orderType: "buy_it_now",
    winningBid: pricing.vehiclePrice,
    serviceFee: pricing.serviceFee,
    documentationFee: pricing.documentationFee,
    inspectionFee: pricing.inspectionFee,
    shippingCost: pricing.shippingCost,
    estimatedDuties: pricing.customsClearingFee,
    clearanceFee: pricing.customsClearingFee,
    registrationFee: pricing.registrationFee,
    destinationPort: pricing.destination,
    subtotal: pricing.vehiclePrice,
    totalAmount: pricing.totalAmount,
    paidAmount: 0,
    balanceDue: pricing.totalAmount,
    status: "pending_payment",
    paymentDeadline: deadline,
    guaranteeStatus: "active",
    guaranteeActivatedAt: now,
    guaranteePolicyNumber: `MBG-${orderNumber}`,
    createdAt: now,
    updatedAt: now,
  });

  const deadlineStr = new Date(deadline).toLocaleString();
  const auctionId = lot?.auctionId;

  await createInAppNotification(ctx, {
    userId: user._id,
    type: "payment_reminder",
    title: "Complete payment to secure this vehicle",
    message: `Order ${orderNumber} created. Pay ₦${pricing.totalAmount.toLocaleString()} by ${deadlineStr} to secure the vehicle. The listing remains reserved until payment is complete.`,
    orderId,
    vehicleId: vehicle._id,
    auctionId,
  });

  await ctx.scheduler.runAfter(0, internal.emails.sendBuyNowOrderEmail, {
    userId: user._id,
    email: user.email,
    firstName: user.firstName,
    vehicleTitle,
    orderNumber,
    orderId,
    vehiclePrice: pricing.vehiclePrice,
    serviceFee: pricing.serviceFee,
    documentationFee: pricing.documentationFee,
    shippingCost: pricing.shippingCost,
    totalAmount: pricing.totalAmount,
    paymentDeadline: deadline,
    vehicleId: vehicle._id,
  });

  if (vehicle.sellerId) {
    await createInAppNotification(ctx, {
      userId: vehicle.sellerId,
      type: "system",
      title: "Buyer reserved your vehicle",
      message: `A buyer created order ${orderNumber} for ${vehicleTitle}${lot ? " via Buy Now" : ""}. Payment is due by ${deadlineStr}.`,
      orderId,
      vehicleId: vehicle._id,
      auctionId,
    });

    const seller = await ctx.db.get(vehicle.sellerId);
    if (seller) {
      await ctx.scheduler.runAfter(0, internal.emails.sendSellerVehicleSoldEmail, {
        userId: seller._id,
        email: seller.email,
        firstName: seller.firstName,
        vehicleTitle,
        salePrice: pricing.vehiclePrice,
        paymentDeadline: deadline,
        orderNumber,
        saleType: "buy_now",
        vehicleId: vehicle._id,
      });
    }
  }

  return { orderId, orderNumber };
}
