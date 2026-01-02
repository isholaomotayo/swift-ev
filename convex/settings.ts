import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, isSuperadmin, createAuditLog } from "./lib/auth";

/**
 * Get all system settings
 * Admin/Superadmin only
 */
export const getSettings = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Get all settings
    const settings = await ctx.db.query("systemSettings").collect();

    // Convert to key-value object
    const settingsObject: { [key: string]: any } = {};
    for (const setting of settings) {
      try {
        settingsObject[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsObject[setting.key] = setting.value;
      }
    }

    return settingsObject;
  },
});

/**
 * Get a specific setting by key
 * Admin/Superadmin only
 */
export const getSetting = query({
  args: {
    token: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!setting) {
      return null;
    }

    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  },
});

/**
 * Update a system setting
 * Superadmin only
 */
export const updateSetting = mutation({
  args: {
    token: v.string(),
    key: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    if (!isSuperadmin(user)) {
      throw new Error("Only superadmin can update system settings");
    }

    // Check if setting exists
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const oldValue = existing?.value;

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      // Create new
      await ctx.db.insert("systemSettings", {
        key: args.key,
        value: args.value,
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "update_system_setting",
      entityType: "systemSettings",
      entityId: args.key,
      changes: { oldValue, newValue: args.value },
    });

    return { success: true };
  },
});

/**
 * Bulk update multiple settings
 * Superadmin only
 */
export const bulkUpdateSettings = mutation({
  args: {
    token: v.string(),
    settings: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    if (!isSuperadmin(user)) {
      throw new Error("Only superadmin can update system settings");
    }

    // Update each setting
    for (const setting of args.settings) {
      const existing = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: setting.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemSettings", {
          key: setting.key,
          value: setting.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    // Create audit log
    await createAuditLog(ctx, {
      userId: user._id,
      action: "bulk_update_settings",
      entityType: "systemSettings",
      entityId: "bulk",
      metadata: { count: args.settings.length },
    });

    return { success: true };
  },
});

/**
 * Initialize default settings if they don't exist
 * Superadmin only
 */
export const initializeDefaultSettings = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);

    if (!isSuperadmin(user)) {
      throw new Error("Only superadmin can initialize settings");
    }

    const defaults = [
      // Auction settings
      { key: "auction.defaultBidIncrement", value: "1000", description: "Default bid increment in currency" },
      { key: "auction.defaultLotDuration", value: "300000", description: "Default lot duration in ms (5 min)" },
      { key: "auction.minimumReservePrice", value: "10000", description: "Minimum reserve price" },
      { key: "auction.autoExtendMinutes", value: "2", description: "Auto-extend time on last-minute bids" },

      // Platform settings
      { key: "platform.serviceFeePercent", value: "5", description: "Service fee percentage" },
      { key: "platform.documentationFee", value: "500", description: "Documentation fee" },
      { key: "platform.companyName", value: "VoltBid Africa", description: "Company name" },
      { key: "platform.supportEmail", value: "support@voltbid.africa", description: "Support email" },

      // Membership settings
      { key: "membership.basic.price", value: "0", description: "Basic membership price" },
      { key: "membership.premier.price", value: "9900", description: "Premier membership price" },
      { key: "membership.business.price", value: "49900", description: "Business membership price" },
      { key: "membership.basic.dailyBidLimit", value: "3", description: "Basic tier daily bid limit" },
      { key: "membership.premier.dailyBidLimit", value: "10", description: "Premier tier daily bid limit" },
    ];

    let created = 0;

    for (const setting of defaults) {
      const existing = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", setting.key))
        .first();

      if (!existing) {
        await ctx.db.insert("systemSettings", {
          key: setting.key,
          value: setting.value,
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
        created++;
      }
    }

    return { success: true, created };
  },
});
