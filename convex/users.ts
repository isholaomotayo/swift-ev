import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, createAuditLog } from "./lib/auth";

/**
 * List all users with filtering and pagination
 * Admin/Superadmin only
 */
export const listUsers = query({
  args: {
    token: v.string(),
    role: v.optional(v.union(v.literal("buyer"), v.literal("seller"), v.literal("admin"), v.literal("superadmin"))),
    status: v.optional(v.union(v.literal("pending"), v.literal("active"), v.literal("suspended"), v.literal("banned"))),
    membershipTier: v.optional(v.union(v.literal("guest"), v.literal("basic"), v.literal("premier"), v.literal("business"))),
    kycStatus: v.optional(v.union(v.literal("not_started"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Build query
    let query = ctx.db.query("users");

    // Apply filters
    if (args.role) {
      query = query.filter((q) => q.eq(q.field("role"), args.role));
    }
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    if (args.membershipTier) {
      query = query.filter((q) => q.eq(q.field("membershipTier"), args.membershipTier));
    }
    if (args.kycStatus) {
      query = query.filter((q) => q.eq(q.field("kycStatus"), args.kycStatus));
    }

    // Get all matching users
    let users = await query.collect();

    // Apply search filter (case-insensitive search on name and email)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter((u) => {
        const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = u.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Get total count
    const total = users.length;

    // Apply pagination
    const offset = args.offset || 0;
    const limit = args.limit || 25;
    const paginatedUsers = users.slice(offset, offset + limit);

    // Sanitize data (remove sensitive fields)
    const sanitizedUsers = paginatedUsers.map((u) => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      role: u.role,
      status: u.status,
      membershipTier: u.membershipTier,
      kycStatus: u.kycStatus,
      emailVerified: u.emailVerified,
      phoneVerified: u.phoneVerified,
      vendorCompany: u.vendorCompany,
      vendorLicense: u.vendorLicense,
      buyingPower: u.buyingPower,
      depositAmount: u.depositAmount,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    return {
      users: sanitizedUsers,
      total,
      offset,
      limit,
    };
  },
});

/**
 * Get detailed user information
 * Admin/Superadmin only
 */
export const getUserDetails = query({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const currentUser = await requireAuth(ctx, args.token);
    requireAdmin(currentUser);

    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get user documents
    const documents = await ctx.db
      .query("userDocuments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get user orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get user bids
    const bids = await ctx.db
      .query("bids")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get audit log
    const auditLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    // Sanitize user data (remove password hash)
    const { passwordHash, ...sanitizedUser } = user;

    return {
      user: sanitizedUser,
      documents: documents.map((d) => ({
        _id: d._id,
        documentType: d.documentType,
        documentUrl: d.documentUrl,
        status: d.status,
        rejectionReason: d.rejectionReason,
        uploadedAt: d.uploadedAt,
        reviewedAt: d.reviewedAt,
        reviewedBy: d.reviewedBy,
      })),
      stats: {
        totalOrders: orders.length,
        totalBids: bids.length,
        totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      },
      recentOrders: orders.slice(0, 10),
      recentBids: bids.slice(0, 10),
      auditLogs,
    };
  },
});

/**
 * Update user role
 * Superadmin only
 */
export const updateUserRole = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("buyer"), v.literal("seller"), v.literal("admin"), v.literal("superadmin")),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const currentUser = await requireAuth(ctx, args.token);

    // Only superadmin can change roles
    if (currentUser.role !== "superadmin") {
      throw new Error("Only superadmin can change user roles");
    }

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Don't allow changing own role
    if (currentUser._id === args.userId) {
      throw new Error("Cannot change your own role");
    }

    const oldRole = targetUser.role;

    // Update role
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: currentUser._id,
      action: "update_user_role",
      entityType: "user",
      entityId: args.userId,
      changes: { oldRole, newRole: args.role },
    });

    // TODO: Create notification for user

    return { success: true };
  },
});

/**
 * Update user status (activate, suspend, ban)
 * Admin/Superadmin
 */
export const updateUserStatus = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("suspended"), v.literal("banned")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const currentUser = await requireAuth(ctx, args.token);
    requireAdmin(currentUser);

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Don't allow changing own status
    if (currentUser._id === args.userId) {
      throw new Error("Cannot change your own status");
    }

    const oldStatus = targetUser.status;

    // Update status
    await ctx.db.patch(args.userId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: currentUser._id,
      action: "update_user_status",
      entityType: "user",
      entityId: args.userId,
      changes: { oldStatus, newStatus: args.status, reason: args.reason },
    });

    // TODO: Create notification for user
    // TODO: If suspended/banned, invalidate all active sessions

    return { success: true };
  },
});

/**
 * Update KYC status for a user
 * Admin/Superadmin
 */
export const updateKYCStatus = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    kycStatus: v.union(v.literal("not_started"), v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const currentUser = await requireAuth(ctx, args.token);
    requireAdmin(currentUser);

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const oldStatus = targetUser.kycStatus;

    // Update KYC status
    await ctx.db.patch(args.userId, {
      kycStatus: args.kycStatus,
      updatedAt: Date.now(),
    });

    // Update all user documents to match KYC status
    const documents = await ctx.db
      .query("userDocuments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const doc of documents) {
      if (args.kycStatus === "approved") {
        await ctx.db.patch(doc._id, {
          status: "approved",
          reviewedAt: Date.now(),
          reviewedBy: currentUser._id,
        });
      } else if (args.kycStatus === "rejected") {
        await ctx.db.patch(doc._id, {
          status: "rejected",
          rejectionReason: args.notes,
          reviewedAt: Date.now(),
          reviewedBy: currentUser._id,
        });
      }
    }

    // Create audit log
    await createAuditLog(ctx, {
      userId: currentUser._id,
      action: "update_kyc_status",
      entityType: "user",
      entityId: args.userId,
      changes: { oldStatus, newStatus: args.kycStatus, notes: args.notes },
    });

    // TODO: Create notification for user

    return { success: true };
  },
});

/**
 * Update user's membership tier
 * Admin/Superadmin
 */
export const updateMembershipTier = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    tier: v.union(v.literal("guest"), v.literal("basic"), v.literal("premier"), v.literal("business")),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const currentUser = await requireAuth(ctx, args.token);
    requireAdmin(currentUser);

    // Get target user
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const oldTier = targetUser.membershipTier;

    // Update membership tier
    await ctx.db.patch(args.userId, {
      membershipTier: args.tier,
      dailyBidsUsed: 0, // Reset daily bids on tier change
      lastBidResetAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create audit log
    await createAuditLog(ctx, {
      userId: currentUser._id,
      action: "update_membership_tier",
      entityType: "user",
      entityId: args.userId,
      changes: { oldTier, newTier: args.tier },
    });

    // TODO: Create notification for user

    return { success: true };
  },
});

/**
 * Get user statistics for admin dashboard
 * Admin/Superadmin
 */
export const getUserStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Get all users
    const allUsers = await ctx.db.query("users").collect();

    // Calculate stats
    const total = allUsers.length;
    const active = allUsers.filter((u) => u.status === "active").length;
    const pending = allUsers.filter((u) => u.status === "pending").length;
    const suspended = allUsers.filter((u) => u.status === "suspended").length;
    const kycPending = allUsers.filter((u) => u.kycStatus === "pending").length;
    const kycApproved = allUsers.filter((u) => u.kycStatus === "approved").length;

    // Membership breakdown
    const membershipBreakdown = {
      guest: allUsers.filter((u) => u.membershipTier === "guest").length,
      basic: allUsers.filter((u) => u.membershipTier === "basic").length,
      premier: allUsers.filter((u) => u.membershipTier === "premier").length,
      business: allUsers.filter((u) => u.membershipTier === "business").length,
    };

    // Role breakdown
    const roleBreakdown = {
      buyer: allUsers.filter((u) => u.role === "buyer").length,
      seller: allUsers.filter((u) => u.role === "seller").length,
      admin: allUsers.filter((u) => u.role === "admin").length,
      superadmin: allUsers.filter((u) => u.role === "superadmin").length,
    };

    return {
      total,
      active,
      pending,
      suspended,
      kycPending,
      kycApproved,
      membershipBreakdown,
      roleBreakdown,
    };
  },
});
