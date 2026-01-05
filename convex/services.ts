import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth } from "./lib/auth";

/**
 * Get available additional services and their placeholder costs
 */
export const getAvailableServices = query({
    args: {},
    handler: async (ctx) => {
        return [
            {
                id: "shipping_container",
                name: "Container Shipping",
                description: "Full container shipping for maximum protection.",
                estimatedCost: 2_500_000,
                currency: "NGN",
            },
            {
                id: "shipping_roro",
                name: "RoRo Shipping",
                description: "Roll-on/Roll-off shipping - the most economical option.",
                estimatedCost: 1_200_000,
                currency: "NGN",
            },
            {
                id: "customs_clearing",
                name: "Customs Clearing",
                description: "Comprehensive clearing services at the destination port.",
                estimatedCost: 850_000,
                currency: "NGN",
            },
            {
                id: "registration",
                name: "Vehicle Registration",
                description: "License plate and local registration processing.",
                estimatedCost: 150_000,
                currency: "NGN",
            },
            {
                id: "inspection",
                name: "Post-Arrival Inspection",
                description: "Detailed technical inspection upon arrival.",
                estimatedCost: 45_000,
                currency: "NGN",
            },
            {
                id: "insurance",
                name: "Transit Insurance",
                description: "Comprehensive insurance coverage during transit.",
                estimatedCost: 250_000,
                currency: "NGN",
            },
            {
                id: "spare_parts",
                name: "Spare Parts Package",
                description: "Basic maintenance kit (filters, brake pads, etc.).",
                estimatedCost: 120_000,
                currency: "NGN",
            },
            {
                id: "financing",
                name: "Financing Support",
                description: "Assistance with securing local financing.",
                estimatedCost: 0,
                currency: "NGN",
            },
        ];
    },
});

/**
 * Add an additional service to an order
 */
export const selectService = mutation({
    args: {
        token: v.string(),
        orderId: v.id("orders"),
        serviceType: v.string(),
        cost: v.number(),
        currency: v.string(),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        // Verify order belongs to user
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");
        if (order.userId !== user._id) throw new Error("Unauthorized");

        // Check if this service type is already added to this order
        const existing = await ctx.db
            .query("additionalServices")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .filter((q) => q.eq(q.field("serviceType"), args.serviceType))
            .first();

        if (existing && existing.status !== "cancelled") {
            throw new Error(`Service ${args.serviceType} is already active for this order`);
        }

        const serviceId = await ctx.db.insert("additionalServices", {
            orderId: args.orderId,
            userId: user._id,
            serviceType: args.serviceType as any,
            status: "pending",
            cost: args.cost,
            currency: args.currency,
            notes: args.notes,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Update order total (optional - depends on if we want to update the main order total or keep services separate)
        // For now, let's keep them as separate line items in the ledger

        return serviceId;
    },
});

/**
 * Get services for a specific order
 */
export const getOrderServices = query({
    args: {
        token: v.string(),
        orderId: v.id("orders"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const services = await ctx.db
            .query("additionalServices")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .collect();

        // Verification
        if (services.length > 0 && services[0].userId !== user._id && user.role !== "admin") {
            throw new Error("Unauthorized");
        }

        return services;
    },
});

/**
 * Admin: Update service status
 */
export const updateServiceStatus = mutation({
    args: {
        token: v.string(),
        serviceId: v.id("additionalServices"),
        status: v.union(
            v.literal("pending"),
            v.literal("in_progress"),
            v.literal("completed"),
            v.literal("cancelled")
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        if (user.role !== "admin") throw new Error("Unauthorized - Admin only");

        await ctx.db.patch(args.serviceId, {
            status: args.status,
            notes: args.notes,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
