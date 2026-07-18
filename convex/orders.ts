import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAuth, requireAdmin, requireSeller, hasOwnershipOrAdmin, createAuditLog, getAuthUserOrNull } from "./lib/auth";
import {
  assertVehicleStatusTransition,
  getVehicleStatusForOrderStatus,
  isVehicleStatus,
  type OrderStatus,
  type VehicleStatus,
} from "./lib/vehicleLifecycle";
import { createInAppNotification, releaseUnpaidSoftHold } from "./lib/payments";

const orderStatusValidator = v.union(
  v.literal("pending_payment"),
  v.literal("payment_partial"),
  v.literal("payment_complete"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("in_transit"),
  v.literal("customs_clearance"),
  v.literal("cleared"),
  v.literal("out_for_delivery"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("refunded")
);

function vehicleStatusOf(status: string): VehicleStatus {
  if (!isVehicleStatus(status)) {
    throw new Error(`Unknown vehicle status: ${status}`);
  }
  return status;
}

async function syncVehicleStatusFromOrder(
  ctx: any,
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
 * Buyer's pending/partial order for a reserved vehicle (Complete payment CTA).
 * Returns null when unauthenticated or no matching order — safe on public VDPs.
 */
export const getMyPendingOrderForVehicle = query({
  args: {
    token: v.optional(v.string()),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx, args.token);
    if (!user) return null;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    const mine = orders.find(
      (o) =>
        o.userId === user._id &&
        (o.status === "pending_payment" || o.status === "payment_partial")
    );

    if (!mine) return null;
    return { orderId: mine._id, orderNumber: mine.orderNumber, status: mine.status };
  },
});

/**
 * List all orders with filtering
 * Admin/Superadmin can see all orders, users can see only their own
 */
export const listOrders = query({
  args: {
    token: v.string(),
    status: v.optional(orderStatusValidator),
    orderType: v.optional(v.union(v.literal("auction_win"), v.literal("buy_it_now"), v.literal("make_offer"))),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    // Helper function to build orders query
    const buildOrdersQuery = async (): Promise<Doc<"orders">[]> => {
      const isAdmin = user.role === "admin" || user.role === "superadmin";
      if (args.userId && args.userId !== user._id && !isAdmin) {
        throw new Error("Unauthorized: Non-admin users cannot query other users' orders");
      }
      const targetUserId = isAdmin ? args.userId : user._id;

      if (targetUserId) {
        return ctx.db
          .query("orders")
          .withIndex("by_user", (q) => q.eq("userId", targetUserId))
          .collect();
      }

      if (!isAdmin) {
        throw new Error("Unauthorized: Non-admin users must query their own orders");
      }

      // Admin seeing all orders
      return ctx.db.query("orders").collect();
    };

    let orders = await buildOrdersQuery();

    // Apply filters
    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }
    if (args.orderType) {
      orders = orders.filter((o) => o.orderType === args.orderType);
    }

    // Sort by creation time (newest first)
    orders.sort((a, b) => b._creationTime - a._creationTime);

    // Get total count
    const total = orders.length;

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const paginatedOrders = orders.slice(offset, offset + limit);

    // Enrich with user and vehicle data
    const enrichedOrders = await Promise.all(
      paginatedOrders.map(async (order) => {
        const buyer = await ctx.db.get(order.userId);
        const vehicle = await ctx.db.get(order.vehicleId);

        return {
          ...order,
          buyer: buyer
            ? {
              _id: buyer._id,
              firstName: buyer.firstName,
              lastName: buyer.lastName,
              email: buyer.email,
            }
            : null,
          vehicle: vehicle
            ? {
              _id: vehicle._id,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
              vin: vehicle.vin,
            }
            : null,
        };
      })
    );

    return {
      orders: enrichedOrders,
      total,
      offset,
      limit,
    };
  },
});

/**
 * Get detailed order information
 * Admin or order owner only
 */
export const getOrderDetails = query({
  args: {
    token: v.string(),
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    // Normalize and validate ID
    const targetOrderId = ctx.db.normalizeId("orders", args.orderId);
    if (!targetOrderId) {
      throw new Error("Order not found");
    }

    // Get order
    const order = await ctx.db.get(targetOrderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Buyer, admin, or listing seller (read-only for seller)
    const vehicle = await ctx.db.get(order.vehicleId);
    const isSeller =
      !!vehicle?.sellerId && vehicle.sellerId === user._id;
    if (!hasOwnershipOrAdmin(user, order.userId) && !isSeller) {
      throw new Error("You don't have permission to view this order");
    }

    // Get related data
    const buyer = await ctx.db.get(order.userId);
    const auctionLot = order.auctionLotId ? await ctx.db.get(order.auctionLotId) : null;

    // Get payment records
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", targetOrderId))
      .collect();

    // Get shipping records
    const shipments = await ctx.db
      .query("shipments")
      .filter((q) => q.eq(q.field("orderId"), targetOrderId))
      .collect();

    // Get additional services
    const additionalServices = await ctx.db
      .query("additionalServices")
      .withIndex("by_order", (q) => q.eq("orderId", targetOrderId))
      .collect();

    return {
      order,
      buyer: buyer
        ? {
          _id: buyer._id,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          email: isSeller && !hasOwnershipOrAdmin(user, order.userId) ? undefined : buyer.email,
          phone: isSeller && !hasOwnershipOrAdmin(user, order.userId) ? undefined : buyer.phone,
        }
        : null,
      vehicle: vehicle
        ? {
          _id: vehicle._id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vin: vehicle.vin,
          lotNumber: vehicle.lotNumber,
        }
        : null,
      auctionLot,
      payments,
      shipments,
      additionalServices,
      viewerRole: hasOwnershipOrAdmin(user, order.userId)
        ? "buyer_or_admin"
        : isSeller
          ? "seller"
          : "unknown",
    };
  },
});

/**
 * Get user's orders
 * For buyer order tracking
 */
export const getUserOrders = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    // Get user's orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with vehicle data
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const vehicle = await ctx.db.get(order.vehicleId);

        return {
          ...order,
          vehicle: vehicle
            ? {
              _id: vehicle._id,
              year: vehicle.year,
              make: vehicle.make,
              model: vehicle.model,
            }
            : null,
        };
      })
    );

    // Sort by creation time (newest first)
    enrichedOrders.sort((a, b) => b._creationTime - a._creationTime);

    return enrichedOrders;
  },
});

/**
 * Seller: pending/partial payment orders for their listed vehicles (read-only).
 */
export const getVendorPendingOrders = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireSeller(user);

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
      .collect();

    const results = [];

    for (const vehicle of vehicles) {
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .collect();

      for (const order of orders) {
        if (order.status !== "pending_payment" && order.status !== "payment_partial") {
          continue;
        }
        results.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          orderType: order.orderType,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          balanceDue: order.balanceDue,
          paymentDeadline: order.paymentDeadline,
          createdAt: order.createdAt,
          vehicle: {
            _id: vehicle._id,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            lotNumber: vehicle.lotNumber,
            status: vehicle.status,
          },
        });
      }
    }

    results.sort((a, b) => b.createdAt - a.createdAt);
    return { orders: results, count: results.length };
  },
});

/**
 * Update order status
 * Admin only
 */
export const updateOrderStatus = mutation({
  args: {
    token: v.string(),
    orderId: v.string(),
    status: orderStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Normalize and validate ID
    const targetOrderId = ctx.db.normalizeId("orders", args.orderId);
    if (!targetOrderId) {
      throw new Error("Order not found");
    }

    // Get order
    const order = await ctx.db.get(targetOrderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const oldStatus = order.status;

    // Unpaid soft-hold cancel must restore inventory (not terminal vehicle cancelled)
    if (
      args.status === "cancelled" &&
      (order.status === "pending_payment" || order.status === "payment_partial")
    ) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      const hasNonDepositPayment = payments.some(
        (p) => p.status === "successful" && p.provider !== "deposit"
      );
      if (hasNonDepositPayment) {
        throw new Error(
          "Cannot cancel via status update: order has successful non-deposit payment. Use refund/manual handling."
        );
      }

      const { vehicleStatus } = await releaseUnpaidSoftHold(ctx, {
        order,
        reason: args.notes || "Order cancelled by admin",
        refundDeposits: true,
      });

      await createAuditLog(ctx, {
        userId: user._id,
        action: "update_order_status",
        entityType: "order",
        entityId: targetOrderId,
        changes: {
          oldStatus,
          newStatus: "cancelled",
          vehicleStatus,
          notes: args.notes,
          via: "soft_hold_release",
        },
      });

      return { success: true };
    }

    if (args.status === "payment_complete" && order.balanceDue > 0) {
      throw new Error(
        "Cannot mark payment complete while balanceDue > 0. Verify payments instead."
      );
    }

    const nextVehicleStatus = await syncVehicleStatusFromOrder(ctx, order, args.status);

    // Update order
    await ctx.db.patch(targetOrderId, {
      status: args.status,
      updatedAt: Date.now(),
      paidAt: args.status === "payment_complete" ? Date.now() : order.paidAt,
      deliveredAt: args.status === "delivered" ? Date.now() : order.deliveredAt,
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "update_order_status",
      entityType: "order",
      entityId: targetOrderId,
      changes: {
        oldStatus,
        newStatus: args.status,
        vehicleStatus: nextVehicleStatus,
        notes: args.notes,
      },
    });

    // TODO: Create notification for buyer

    return { success: true };
  },
});

/**
 * Admin: revoke a pending/unpaid Buy Now (or auction-win) purchase.
 * Returns the vehicle to inventory. Blocked if any successful non-deposit payment exists.
 */
export const revokePurchase = mutation({
  args: {
    token: v.string(),
    orderId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Normalize and validate ID
    const targetOrderId = ctx.db.normalizeId("orders", args.orderId);
    if (!targetOrderId) {
      throw new Error("Order not found");
    }

    const order = await ctx.db.get(targetOrderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending_payment" && order.status !== "payment_partial") {
      throw new Error("Only pending or partially paid orders can be revoked");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();

    const hasNonDepositPayment = payments.some(
      (p) => p.status === "successful" && p.provider !== "deposit"
    );
    if (hasNonDepositPayment) {
      throw new Error(
        "Cannot revoke: this order has a successful bank/card/wallet payment. Handle manually."
      );
    }

    const now = Date.now();
    const { vehicleStatus: restoreStatus, refundedDepositNaira } =
      await releaseUnpaidSoftHold(ctx, {
        order,
        reason: args.reason || "Purchase revoked by admin",
        now,
        refundDeposits: true,
      });

    const refundNote =
      refundedDepositNaira > 0
        ? ` Your deposit of ₦${refundedDepositNaira.toLocaleString()} has been returned to your wallet.`
        : "";

    await createInAppNotification(ctx, {
      userId: order.userId,
      type: "system",
      title: "Purchase revoked",
      message: `Your reservation for order ${order.orderNumber} was revoked. The vehicle is available again.${refundNote}`,
      orderId: order._id,
      vehicleId: order.vehicleId,
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "revoke_purchase",
      entityType: "order",
      entityId: args.orderId,
      changes: {
        oldStatus: order.status,
        newStatus: "cancelled",
        vehicleStatus: restoreStatus,
        reason: args.reason,
        refundedDepositNaira,
      },
    });

    return { success: true, vehicleStatus: restoreStatus, refundedDepositNaira };
  },
});

/**
 * Add shipping tracking information
 * Admin only
 */
export const addShippingTracking = mutation({
  args: {
    token: v.string(),
    orderId: v.string(),
    carrier: v.string(),
    trackingNumber: v.string(),
    estimatedDelivery: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Normalize and validate ID
    const targetOrderId = ctx.db.normalizeId("orders", args.orderId);
    if (!targetOrderId) {
      throw new Error(`Order ${args.orderId} not found`);
    }

    // Get order
    const order = await ctx.db.get(targetOrderId);
    if (!order) {
      throw new Error(`Order ${args.orderId} not found`);
    }

    // Get vehicle to determine origin port
    const vehicle = await ctx.db.get(order.vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${order.vehicleId} not found for order ${args.orderId}`);
    }

    // Check for duplicate tracking number
    if (args.trackingNumber) {
      const existingTracking = await ctx.db
        .query("shipments")
        .withIndex("by_tracking_number", (q) => q.eq("trackingNumber", args.trackingNumber))
        .first();

      if (existingTracking) {
        throw new Error(`Tracking number ${args.trackingNumber} is already in use`);
      }
    }

    // Create shipment record
    await ctx.db.insert("shipments", {
      orderId: targetOrderId,
      vehicleId: order.vehicleId,
      shippingLine: args.carrier,
      trackingNumber: args.trackingNumber,
      status: "pending",
      originPort: vehicle.currentLocation.city || "Unknown",
      destinationPort: order.deliveryAddress?.city || "Unknown",
      estimatedArrival: args.estimatedDelivery,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (order.status === "cancelled" || order.status === "refunded" || order.status === "delivered") {
      throw new Error(`Cannot add shipping tracking to an order in status: ${order.status}`);
    }

    await syncVehicleStatusFromOrder(ctx, order, "shipped");

    // Update order status once tracking is assigned.
    await ctx.db.patch(targetOrderId, {
      status: "shipped",
      updatedAt: Date.now(),
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "add_shipping_tracking",
      entityType: "order",
      entityId: targetOrderId,
      metadata: { carrier: args.carrier, trackingNumber: args.trackingNumber },
    });

    // TODO: Create notification for buyer

    return { success: true };
  },
});

/**
 * Get order statistics for admin dashboard
 * Admin only
 */
export const getOrderStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Get all orders
    const allOrders = await ctx.db.query("orders").collect();

    // Calculate stats
    const total = allOrders.length;
    const pendingPayment = allOrders.filter((o) => o.status === "pending_payment").length;
    const inTransit = allOrders.filter((o) => o.status === "in_transit" || o.status === "shipped").length;
    const delivered = allOrders.filter((o) => o.status === "delivered").length;

    // Calculate revenue
    const totalRevenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      total,
      pendingPayment,
      inTransit,
      delivered,
      totalRevenue,
    };
  },
});
