import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { requireAuth, requireAdmin, hasOwnershipOrAdmin, createAuditLog } from "./lib/auth";

/**
 * List all orders with filtering
 * Admin/Superadmin can see all orders, users can see only their own
 */
export const listOrders = query({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending_payment"),
        v.literal("payment_complete"),
        v.literal("shipped"),
        v.literal("in_transit"),
        v.literal("customs_clearance"),
        v.literal("delivered"),
        v.literal("cancelled")
      )
    ),
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
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Validate user can view this order
    if (!hasOwnershipOrAdmin(user, order.userId)) {
      throw new Error("You don't have permission to view this order");
    }

    // Get related data
    const buyer = await ctx.db.get(order.userId);
    const vehicle = await ctx.db.get(order.vehicleId);
    const auctionLot = order.auctionLotId ? await ctx.db.get(order.auctionLotId) : null;

    // Get payment records
    const payments = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .collect();

    // Get shipping records
    const shipments = await ctx.db
      .query("shipments")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .collect();

    return {
      order,
      buyer: buyer
        ? {
            _id: buyer._id,
            firstName: buyer.firstName,
            lastName: buyer.lastName,
            email: buyer.email,
            phone: buyer.phone,
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
 * Update order status
 * Admin only
 */
export const updateOrderStatus = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("payment_complete"),
      v.literal("shipped"),
      v.literal("in_transit"),
      v.literal("customs_clearance"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const oldStatus = order.status;

    // Update order
    await ctx.db.patch(args.orderId, {
      status: args.status,
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "update_order_status",
      entityType: "order",
      entityId: args.orderId,
      changes: { oldStatus, newStatus: args.status, notes: args.notes },
    });

    // TODO: Create notification for buyer

    return { success: true };
  },
});

/**
 * Add shipping tracking information
 * Admin only
 */
export const addShippingTracking = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    carrier: v.string(),
    trackingNumber: v.string(),
    estimatedDelivery: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Get order
    const order = await ctx.db.get(args.orderId);
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
      orderId: args.orderId,
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

    // Update order status if not already shipped
    if (order.status === "payment_complete" || order.status === "pending_payment") {
      await ctx.db.patch(args.orderId, {
        status: "shipped",
      });
    }

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "add_shipping_tracking",
      entityType: "order",
      entityId: args.orderId,
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
