import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

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

        const gatePassId = await ctx.db.insert("gatePasses", {
            orderId: args.orderId,
            vehicleId: order.vehicleId,
            userId: user._id,
            code,
            status: "active",
            issuedAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        });

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

        // Mark as used
        await ctx.db.patch(pass._id, {
            status: "used",
            gateKeeperId: user._id,
            usedAt: Date.now()
        });

        // Update vehicle/order status?
        await ctx.db.patch(pass.orderId, {
            status: "delivered", // Or 'out_for_delivery' if shipping?
            deliveredAt: Date.now()
        });
        await ctx.db.patch(pass.vehicleId, {
            status: "delivered"
        });

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
