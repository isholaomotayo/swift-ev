import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAuth } from "./lib/auth";
import {
    assertVehicleStatusTransition,
    isVehicleStatus,
    type VehicleStatus,
} from "./lib/vehicleLifecycle";
import { createInAppNotification } from "./lib/payments";

function vehicleStatusOf(status: string): VehicleStatus {
    if (!isVehicleStatus(status)) {
        throw new Error(`Unknown vehicle status: ${status}`);
    }
    return status;
}

/**
 * Generate a Gate Pass for a fully paid and cleared order.
 * Only allows generation if:
 * 1. Order is paid.
 * 2. Order is cleared (if applicable).
 * 3. User is the owner or authorized.
 */
export const generateGatePass = mutation({
    args: {
        token: v.string(),
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Order not found");
        }

        if (order.userId !== user._id) {
            // Check if user is admin?
            if (user.role !== "admin" && user.role !== "superadmin") {
                throw new Error("Unauthorized");
            }
        }

        // Strict Validation
        if (order.status !== "payment_complete" && order.status !== "cleared" && order.status !== "delivered") {
            // Allow 'delivered' to regenerate pass? Maybe not.
            // Allow 'payment_complete' if local pickup?
            // The plan says "After full payment... You are issued a gate pass".
            // And "Only a gate pass allows a vehicle to leave".
            if (order.balanceDue > 0) {
                throw new Error("Cannot generate Gate Pass: Outstanding balance remaining.");
            }
        }

        // Check if pass already exists
        const existingPass = await ctx.db
            .query("gatePasses")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .filter((q) => q.eq(q.field("status"), "active"))
            .first();

        if (existingPass) {
            return { gatePassId: existingPass._id, code: existingPass.code };
        }

        // Generate specific Code (QR payload)
        const code = `GP-${order.orderNumber}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // Valid for 7 days
        const gatePassId = await ctx.db.insert("gatePasses", {
            orderId: args.orderId,
            vehicleId: order.vehicleId,
            userId: user._id,
            code,
            status: "active",
            issuedAt: Date.now(),
            expiresAt,
        });

        // Send E3: Gate Pass Issued Email
        const vehicle = await ctx.db.get(order.vehicleId);
        if (vehicle) {
            await ctx.scheduler.runAfter(0, internal.emails.sendGatePassIssuedEmail, {
                userId: user._id,
                email: user.email,
                firstName: user.firstName,
                vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                orderNumber: order.orderNumber,
                code,
                expiresAt,
                gatePassId,
                relatedOrderId: order._id,
                vehicleId: vehicle._id,
            });
        }

        return { gatePassId, code };
    },
});

/**
 * Verify/Scan a Gate Pass (For Security/Gate Keepers)
 */
export const scanGatePass = mutation({
    args: {
        token: v.string(),
        code: v.string()
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        // Maybe restrict to 'admin' or specific 'security' role if it existed.
        if (user.role !== "admin" && user.role !== "superadmin") { // Assuming admins act as gatekeepers for now
            throw new Error("Unauthorized to scan gate passes");
        }

        const pass = await ctx.db
            .query("gatePasses")
            .withIndex("by_code", (q) => q.eq("code", args.code))
            .first();

        if (!pass) {
            throw new Error("Invalid Gate Pass Code");
        }

        if (pass.status !== "active") {
            throw new Error(`Gate Pass is ${pass.status}`);
        }

        if (pass.expiresAt < Date.now()) {
            throw new Error("Gate Pass has expired");
        }

        const vehicle = await ctx.db.get(pass.vehicleId);
        if (!vehicle) {
            throw new Error("Vehicle not found");
        }

        assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "delivered");

        const now = Date.now();

        // Mark as used
        await ctx.db.patch(pass._id, {
            status: "used",
            gateKeeperId: user._id,
            usedAt: now
        });

        // Update vehicle/order status.
        await ctx.db.patch(pass.orderId, {
            status: "delivered", // Or 'out_for_delivery' if shipping?
            deliveredAt: now,
            updatedAt: now
        });
        await ctx.db.patch(pass.vehicleId, {
            status: "delivered",
            updatedAt: now
        });

        // Send E2: Order Delivered Email (Buyer)
        const buyerUser = await ctx.db.get(pass.userId);
        const orderRecord = await ctx.db.get(pass.orderId);
        if (buyerUser && orderRecord) {
            await ctx.scheduler.runAfter(0, internal.emails.sendOrderDeliveredEmail, {
                userId: buyerUser._id,
                email: buyerUser.email,
                firstName: buyerUser.firstName,
                vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                orderNumber: orderRecord.orderNumber,
                orderId: pass.orderId,
                relatedOrderId: pass.orderId,
            });
        }

        return { success: true, message: "Gate Pass Validated. Vehicle Released." };
    }
});

/**
 * Get Gate Pass details by ID.
 * Returns nested vehicle and order info.
 */
export const getGatePass = query({
    args: {
        passId: v.id("gatePasses")
    },
    handler: async (ctx, args) => {
        const pass = await ctx.db.get(args.passId);
        if (!pass) return null;

        const vehicle = await ctx.db.get(pass.vehicleId);
        const order = await ctx.db.get(pass.orderId);
        const user = await ctx.db.get(pass.userId);

        return {
            ...pass,
            vehicle,
            order,
            user: {
                firstName: user?.firstName,
                lastName: user?.lastName,
                email: user?.email
            }
        };
    }
});

/**
 * Add a shipment milestone update.
 * Admin or Seller only.
 */
export const addShipmentUpdate = mutation({
    args: {
        token: v.string(),
        shipmentId: v.id("shipments"),
        status: v.string(),
        location: v.optional(v.string()),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const shipment = await ctx.db.get(args.shipmentId);
        if (!shipment) throw new Error("Shipment not found");

        const order = await ctx.db.get(shipment.orderId);
        if (!order) throw new Error("Order not found");
        
        const vehicle = await ctx.db.get(shipment.vehicleId);
        if (!vehicle) throw new Error("Vehicle not found");

        if (user.role !== "admin" && user.role !== "superadmin") {
            if (vehicle.sellerId !== user._id) {
                throw new Error("Unauthorized");
            }
        }

        const now = Date.now();
        await ctx.db.insert("shipmentUpdates", {
            shipmentId: args.shipmentId,
            status: args.status,
            location: args.location,
            description: args.description,
            timestamp: now,
            source: user.role === "admin" || user.role === "superadmin" ? "system" : "manual"
        });

        // Potentially transition order status
        let newOrderStatus = order.status;
        if (args.status === "in_transit" || args.status === "departed") {
            newOrderStatus = "in_transit";
        } else if (args.status === "at_customs") {
            newOrderStatus = "customs_clearance";
        } else if (args.status === "cleared") {
            newOrderStatus = "cleared";
        }

        if (newOrderStatus !== order.status) {
            await ctx.db.patch(order._id, { status: newOrderStatus, updatedAt: now });
        }

        // Notify Buyer
        await createInAppNotification(ctx, {
            userId: order.userId,
            type: "shipment_update",
            title: "Shipment Update",
            message: `Your vehicle shipment has a new update: ${args.description}`,
            orderId: order._id,
            vehicleId: vehicle._id,
        });

        return { success: true };
    }
});

/**
 * Get all shipment updates for a given shipment ID
 */
export const getShipmentUpdates = query({
    args: {
        token: v.string(),
        shipmentId: v.id("shipments"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        
        const shipment = await ctx.db.get(args.shipmentId);
        if (!shipment) return [];

        const order = await ctx.db.get(shipment.orderId);
        const vehicle = await ctx.db.get(shipment.vehicleId);

        // Security check: must be admin, seller, or buyer
        if (user.role !== "admin" && user.role !== "superadmin") {
            if (order?.userId !== user._id && vehicle?.sellerId !== user._id) {
                throw new Error("Unauthorized");
            }
        }

        const updates = await ctx.db
            .query("shipmentUpdates")
            .withIndex("by_shipment", (q) => q.eq("shipmentId", args.shipmentId))
            .collect();
            
        return updates.sort((a, b) => b.timestamp - a.timestamp);
    }
});
