import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const getVehicleRegistrationForm = query({
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

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    if (order.userId !== user._id && !isAdmin) {
      // Check if seller of vehicle
      const vehicle = await ctx.db.get(order.vehicleId);
      if (!vehicle || vehicle.sellerId !== user._id) {
        throw new Error("Unauthorized to access registration details for this order");
      }
    }

    const forms = await ctx.db
      .query("vehicleRegistrationForms")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    return forms[0] || null;
  },
});

export const submitVehicleRegistrationForm = mutation({
  args: {
    token: v.string(),
    orderId: v.id("orders"),
    ownerFullName: v.string(),
    ownerAddress: v.string(),
    registrationState: v.string(),
    identityDocType: v.optional(v.string()),
    identityNumber: v.optional(v.string()),
    preferredPlateText: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId !== user._id) {
      throw new Error("Unauthorized: Only the buyer can submit vehicle registration details");
    }

    const existingForms = await ctx.db
      .query("vehicleRegistrationForms")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    const now = Date.now();

    if (existingForms.length > 0) {
      const existing = existingForms[0];
      await ctx.db.patch(existing._id, {
        ownerFullName: args.ownerFullName,
        ownerAddress: args.ownerAddress,
        registrationState: args.registrationState,
        identityDocType: args.identityDocType,
        identityNumber: args.identityNumber,
        preferredPlateText: args.preferredPlateText,
        notes: args.notes,
        status: "submitted",
        updatedAt: now,
      });
      return existing._id;
    }

    const formId = await ctx.db.insert("vehicleRegistrationForms", {
      orderId: args.orderId,
      userId: user._id,
      vehicleId: order.vehicleId,
      ownerFullName: args.ownerFullName,
      ownerAddress: args.ownerAddress,
      registrationState: args.registrationState,
      identityDocType: args.identityDocType,
      identityNumber: args.identityNumber,
      preferredPlateText: args.preferredPlateText,
      notes: args.notes,
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });

    return formId;
  },
});
