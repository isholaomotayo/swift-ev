import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireAdmin } from "./lib/auth";

/**
 * Create a new dispute
 */
export const createDispute = mutation({
    args: {
        token: v.string(),
        orderId: v.id("orders"),
        disputeType: v.union(
            v.literal("not_as_described"),
            v.literal("documents_missing"),
            v.literal("seller_failed_release"),
            v.literal("shipping_delay"),
            v.literal("damage_in_transit"),
            v.literal("other")
        ),
        description: v.string(),
        evidenceUrls: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        // Verify order exists and belongs to user
        const order = await ctx.db.get(args.orderId);
        if (!order) throw new Error("Order not found");
        if (order.userId !== user._id) throw new Error("Unauthorized - You can only dispute your own orders");

        // Check for existing open dispute on this order
        const existingDispute = await ctx.db
            .query("disputes")
            .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
            .filter((q) => q.neq(q.field("status"), "resolved"))
            .filter((q) => q.neq(q.field("status"), "rejected"))
            .first();

        if (existingDispute) {
            throw new Error("An active dispute already exists for this order");
        }

        // Get seller as respondent
        const vehicle = await ctx.db.get(order.vehicleId);
        const respondentId = vehicle?.sellerId;

        const disputeId = await ctx.db.insert("disputes", {
            orderId: args.orderId,
            reporterId: user._id,
            respondentId,
            disputeType: args.disputeType,
            description: args.description,
            evidenceUrls: args.evidenceUrls || [],
            status: "open",
            createdAt: Date.now(),
        });

        return disputeId;
    },
});

/**
 * Get dispute by ID
 */
export const getDisputeById = query({
    args: {
        token: v.string(),
        disputeId: v.id("disputes"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const dispute = await ctx.db.get(args.disputeId);
        if (!dispute) throw new Error("Dispute not found");

        // Check authorization
        const isAdmin = user.role === "admin" || user.role === "superadmin";
        const isReporter = dispute.reporterId === user._id;
        const isRespondent = dispute.respondentId === user._id;

        if (!isAdmin && !isReporter && !isRespondent) {
            throw new Error("Unauthorized");
        }

        // Enrich with order and user data
        const order = await ctx.db.get(dispute.orderId);
        const reporter = await ctx.db.get(dispute.reporterId);
        const respondent = dispute.respondentId ? await ctx.db.get(dispute.respondentId) : null;
        const vehicle = order ? await ctx.db.get(order.vehicleId) : null;

        return {
            ...dispute,
            order: order ? {
                _id: order._id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                status: order.status,
            } : null,
            reporter: reporter ? {
                _id: reporter._id,
                firstName: reporter.firstName,
                lastName: reporter.lastName,
                email: reporter.email,
            } : null,
            respondent: respondent ? {
                _id: respondent._id,
                firstName: respondent.firstName,
                lastName: respondent.lastName,
                email: respondent.email,
            } : null,
            vehicle: vehicle ? {
                _id: vehicle._id,
                year: vehicle.year,
                make: vehicle.make,
                model: vehicle.model,
            } : null,
        };
    },
});

/**
 * Get user's disputes
 */
export const getUserDisputes = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const disputes = await ctx.db
            .query("disputes")
            .withIndex("by_reporter", (q) => q.eq("reporterId", user._id))
            .collect();

        // Enrich with order data
        const enriched = await Promise.all(
            disputes.map(async (dispute) => {
                const order = await ctx.db.get(dispute.orderId);
                const vehicle = order ? await ctx.db.get(order.vehicleId) : null;
                return {
                    ...dispute,
                    order: order ? { orderNumber: order.orderNumber } : null,
                    vehicle: vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model } : null,
                };
            })
        );

        return enriched.sort((a, b) => b.createdAt - a.createdAt);
    },
});

/**
 * Admin: Get all disputes with optional filtering
 */
export const getAllDisputes = query({
    args: {
        token: v.string(),
        status: v.optional(v.union(
            v.literal("open"),
            v.literal("under_review"),
            v.literal("resolved"),
            v.literal("rejected")
        )),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        requireAdmin(user);

        let disputes;
        if (args.status) {
            disputes = await ctx.db
                .query("disputes")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .collect();
        } else {
            disputes = await ctx.db.query("disputes").collect();
        }

        // Enrich with order and user data
        const enriched = await Promise.all(
            disputes.map(async (dispute) => {
                const order = await ctx.db.get(dispute.orderId);
                const reporter = await ctx.db.get(dispute.reporterId);
                return {
                    ...dispute,
                    order: order ? { orderNumber: order.orderNumber } : null,
                    reporter: reporter ? { firstName: reporter.firstName, lastName: reporter.lastName } : null,
                };
            })
        );

        return enriched.sort((a, b) => b.createdAt - a.createdAt);
    },
});

/**
 * Admin: Update dispute status
 */
export const updateDisputeStatus = mutation({
    args: {
        token: v.string(),
        disputeId: v.id("disputes"),
        status: v.union(
            v.literal("open"),
            v.literal("under_review"),
            v.literal("resolved"),
            v.literal("rejected")
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        requireAdmin(user);

        await ctx.db.patch(args.disputeId, { status: args.status });
        return { success: true };
    },
});

/**
 * Admin: Resolve a dispute
 */
export const resolveDispute = mutation({
    args: {
        token: v.string(),
        disputeId: v.id("disputes"),
        resolution: v.union(
            v.literal("full_refund"),
            v.literal("partial_refund"),
            v.literal("repair_credit"),
            v.literal("rejected"),
            v.literal("other")
        ),
        resolutionNotes: v.string(),
        refundAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);
        requireAdmin(user);

        const dispute = await ctx.db.get(args.disputeId);
        if (!dispute) throw new Error("Dispute not found");

        await ctx.db.patch(args.disputeId, {
            status: args.resolution === "rejected" ? "rejected" : "resolved",
            resolution: args.resolution,
            resolutionNotes: args.resolutionNotes,
            refundAmount: args.refundAmount,
            resolvedAt: Date.now(),
            resolvedBy: user._id,
        });

        // TODO: Handle actual refund via wallet if applicable

        return { success: true };
    },
});

/**
 * Add evidence to a dispute
 */
export const addEvidence = mutation({
    args: {
        token: v.string(),
        disputeId: v.id("disputes"),
        evidenceUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.token);

        const dispute = await ctx.db.get(args.disputeId);
        if (!dispute) throw new Error("Dispute not found");

        // Only reporter or respondent can add evidence
        if (dispute.reporterId !== user._id && dispute.respondentId !== user._id) {
            throw new Error("Unauthorized");
        }

        // Can only add evidence to open or under_review disputes
        if (dispute.status === "resolved" || dispute.status === "rejected") {
            throw new Error("Cannot add evidence to a closed dispute");
        }

        const updatedEvidence = [...dispute.evidenceUrls, args.evidenceUrl];
        await ctx.db.patch(args.disputeId, { evidenceUrls: updatedEvidence });

        return { success: true };
    },
});
