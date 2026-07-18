import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { requireAuth, requireAdmin, createAuditLog } from "./lib/auth";

/** Internal query to fetch email for action execution. */
export const getTransactionalEmailInternal = internalQuery({
  args: { emailId: v.id("transactionalEmails") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.emailId);
  },
});

/** Internal mutation to update email status after sending approval action. */
export const updateTransactionalEmailStatusInternal = internalMutation({
  args: {
    emailId: v.id("transactionalEmails"),
    status: v.union(
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped_suppressed"),
      v.literal("skipped_dev")
    ),
    resendEmailId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.emailId, {
      status: args.status,
      resendEmailId: args.resendEmailId,
      errorMessage: args.errorMessage,
      reviewedBy: args.reviewedBy,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// =============================================
// OUTGOING EMAIL REVIEW ADMIN APIs
// =============================================

/** Get master setting for whether outgoing email review is enabled. */
export const getEmailReviewSetting = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "email.requireReview"))
      .first();

    if (!setting) return { requireReview: true };
    try {
      return { requireReview: Boolean(JSON.parse(setting.value)) };
    } catch {
      return { requireReview: setting.value === "true" };
    }
  },
});

/** Toggle master setting for outgoing email review. */
export const setEmailReviewSetting = mutation({
  args: {
    token: v.string(),
    requireReview: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "email.requireReview"))
      .first();

    if (setting) {
      await ctx.db.patch(setting._id, {
        value: JSON.stringify(args.requireReview),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: "email.requireReview",
        value: JSON.stringify(args.requireReview),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    await createAuditLog(ctx, {
      userId: user._id,
      action: "setting.update",
      entityType: "systemSettings",
      entityId: "email.requireReview",
      metadata: { userEmail: user.email, details: `Updated email.requireReview to ${args.requireReview}` },
    });

    return { success: true, requireReview: args.requireReview };
  },
});

/** List transactional emails filtered by status/type/search for admin review. */
export const listTransactionalEmails = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()), // "all", "pending_review", "approved", "rejected", "sent", "failed"
    emailType: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    let emails = await ctx.db.query("transactionalEmails").order("desc").collect();

    // Stats
    const pendingCount = emails.filter((e) => e.status === "pending_review").length;

    if (args.status && args.status !== "all") {
      emails = emails.filter((e) => e.status === args.status);
    }

    if (args.emailType && args.emailType !== "all") {
      emails = emails.filter((e) => e.emailType === args.emailType);
    }

    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      emails = emails.filter(
        (e) =>
          e.recipientEmail.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.emailType.toLowerCase().includes(q)
      );
    }

    const limit = args.limit ?? 100;

    return {
      emails: emails.slice(0, limit),
      pendingCount,
      totalCount: emails.length,
    };
  },
});

/** Get single transactional email details for review. */
export const getTransactionalEmail = query({
  args: {
    token: v.string(),
    emailId: v.id("transactionalEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Transactional email record not found");
    }

    return email;
  },
});

/** Update subject and bodyHtml of a transactional email before sending. */
export const updateTransactionalEmail = mutation({
  args: {
    token: v.string(),
    emailId: v.id("transactionalEmails"),
    subject: v.string(),
    bodyHtml: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Transactional email not found");
    }

    await ctx.db.patch(args.emailId, {
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "email.update",
      entityType: "transactionalEmails",
      entityId: args.emailId,
      metadata: { userEmail: user.email, details: `Updated transactional email content for ${email.recipientEmail}` },
    });

    return { success: true };
  },
});

/** Reject a pending transactional email. */
export const rejectTransactionalEmail = mutation({
  args: {
    token: v.string(),
    emailId: v.id("transactionalEmails"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Transactional email not found");
    }

    await ctx.db.patch(args.emailId, {
      status: "rejected",
      errorMessage: args.reason ?? "Rejected by admin review",
      reviewedBy: user._id,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "email.reject",
      entityType: "transactionalEmails",
      entityId: args.emailId,
      metadata: { userEmail: user.email, details: `Rejected outgoing email (${email.emailType}) to ${email.recipientEmail}` },
    });

    return { success: true };
  },
});
