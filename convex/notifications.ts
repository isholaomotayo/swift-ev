import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Get user's notifications, ordered by descending creation time
 */
export const getUserNotifications = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    let q = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");
      
    if (args.limit) {
      return await q.take(args.limit);
    }
    
    return await q.collect();
  },
});

/**
 * Get the count of unread notifications for a user
 */
export const getUnreadCount = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    return unreadNotifications.length;
  },
});

/**
 * Mark one or all notifications as read
 */
export const markAsRead = mutation({
  args: {
    token: v.string(),
    notificationId: v.optional(v.id("notifications")),
    markAll: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    if (args.markAll) {
      const unreadNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("read"), false))
        .collect();

      for (const notification of unreadNotifications) {
        await ctx.db.patch(notification._id, {
          read: true,
        });
      }
    } else if (args.notificationId) {
      const notification = await ctx.db.get(args.notificationId);
      if (!notification) throw new Error("Notification not found");
      if (notification.userId !== user._id) {
        throw new Error("Unauthorized");
      }
      
      await ctx.db.patch(args.notificationId, {
        read: true,
      });
    } else {
      throw new Error("Either notificationId or markAll must be provided");
    }

    return { success: true };
  },
});
