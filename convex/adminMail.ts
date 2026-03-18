import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAuth, requireAdmin } from "./lib/auth";

// ============================================
// QUERIES
// ============================================

/**
 * List emails by folder with pagination
 */
export const listEmails = query({
  args: {
    token: v.string(),
    folder: v.union(
      v.literal("inbox"),
      v.literal("sent"),
      v.literal("drafts"),
      v.literal("trash"),
      v.literal("archive")
    ),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    let emails = await ctx.db
      .query("adminEmails")
      .withIndex("by_folder", (q) => q.eq("folder", args.folder))
      .collect();

    // Filter unread only
    if (args.unreadOnly) {
      emails = emails.filter((e) => !e.isRead);
    }

    // Sort newest first
    emails.sort((a, b) => b.createdAt - a.createdAt);

    const total = emails.length;
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const paginated = emails.slice(offset, offset + limit);

    return {
      emails: paginated,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Get a single email by ID
 */
export const getEmail = query({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }
    return email;
  },
});

/**
 * Get mail stats (unread counts per folder)
 */
export const getMailStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const allEmails = await ctx.db.query("adminEmails").collect();

    const stats = {
      inbox: 0,
      inboxUnread: 0,
      sent: 0,
      drafts: 0,
      trash: 0,
      archive: 0,
    };

    for (const email of allEmails) {
      if (email.folder === "inbox") {
        stats.inbox++;
        if (!email.isRead) stats.inboxUnread++;
      } else if (email.folder === "sent") {
        stats.sent++;
      } else if (email.folder === "drafts") {
        stats.drafts++;
      } else if (email.folder === "trash") {
        stats.trash++;
      } else if (email.folder === "archive") {
        stats.archive++;
      }
    }

    return stats;
  },
});

/**
 * Search emails by subject
 */
export const searchEmails = query({
  args: {
    token: v.string(),
    query: v.string(),
    folder: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("sent"),
        v.literal("drafts"),
        v.literal("trash"),
        v.literal("archive")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    if (!args.query.trim()) {
      return [];
    }

    let searchQuery = ctx.db
      .query("adminEmails")
      .withSearchIndex("search_emails", (q) => {
        let search = q.search("subject", args.query);
        if (args.folder) {
          search = search.eq("folder", args.folder);
        }
        return search;
      });

    const results = await searchQuery.take(50);
    return results;
  },
});

// ============================================
// MUTATIONS
// ============================================

/**
 * Save or update a draft email
 */
export const saveDraft = mutation({
  args: {
    token: v.string(),
    draftId: v.optional(v.id("adminEmails")),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    inReplyTo: v.optional(v.id("adminEmails")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);
    const from = process.env.EMAIL_FROM ?? "noreply@autoexports.live";

    if (args.draftId) {
      // Update existing draft
      const existing = await ctx.db.get(args.draftId);
      if (!existing || existing.folder !== "drafts") {
        throw new Error("Draft not found");
      }
      await ctx.db.patch(args.draftId, {
        to: args.to,
        cc: args.cc,
        bcc: args.bcc,
        subject: args.subject,
        bodyHtml: args.bodyHtml,
        bodyText: args.bodyText,
        snippet,
        inReplyTo: args.inReplyTo,
        updatedAt: now,
      });
      return args.draftId;
    }

    // Create new draft
    const draftId = await ctx.db.insert("adminEmails", {
      direction: "outbound",
      from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet,
      folder: "drafts",
      isRead: true,
      isStarred: false,
      inReplyTo: args.inReplyTo,
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
    });

    return draftId;
  },
});

/**
 * Mark email as read/unread
 */
export const markAsRead = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    await ctx.db.patch(args.emailId, {
      isRead: args.isRead,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Move email to a different folder
 */
export const moveToFolder = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
    folder: v.union(
      v.literal("inbox"),
      v.literal("sent"),
      v.literal("drafts"),
      v.literal("trash"),
      v.literal("archive")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    await ctx.db.patch(args.emailId, {
      folder: args.folder,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Toggle star on email
 */
export const starEmail = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    await ctx.db.patch(args.emailId, {
      isStarred: !email.isStarred,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete email (from trash only)
 */
export const deleteEmail = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    if (email.folder !== "trash") {
      throw new Error("Can only permanently delete emails from trash");
    }

    await ctx.db.delete(args.emailId);
  },
});

/**
 * Internal mutation to store an inbound email from webhook
 */
export const storeInboundEmail = internalMutation({
  args: {
    from: v.string(),
    fromName: v.optional(v.string()),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    await ctx.db.insert("adminEmails", {
      direction: "inbound",
      threadId: args.threadId,
      from: args.from,
      fromName: args.fromName,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet,
      folder: "inbox",
      isRead: false,
      isStarred: false,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal mutation to update delivery status from webhook
 */
export const updateDeliveryStatus = internalMutation({
  args: {
    resendEmailId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained")
    ),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db
      .query("adminEmails")
      .withIndex("by_resendEmailId", (q) =>
        q.eq("resendEmailId", args.resendEmailId)
      )
      .first();

    if (email) {
      await ctx.db.patch(email._id, {
        deliveryStatus: args.status,
        updatedAt: Date.now(),
      });
    }
  },
});

// ============================================
// ACTIONS (Node.js runtime)
// ============================================

/**
 * Send an email via Resend API, then store in adminEmails as sent
 */
export const sendEmailAction = internalAction({
  args: {
    userId: v.id("users"),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    inReplyTo: v.optional(v.id("adminEmails")),
    draftId: v.optional(v.id("adminEmails")),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM ?? "noreply@autoexports.live";

    if (!apiKey) {
      console.log("[EMAIL STUB — set RESEND_API_KEY to enable sending]", {
        to: args.to,
        from,
        subject: args.subject,
      });
      // Still store in DB for development
    }

    let resendEmailId: string | undefined;

    if (apiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: args.to,
          cc: args.cc,
          bcc: args.bcc,
          subject: args.subject,
          html: args.bodyHtml,
          text: args.bodyText,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Email send failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      resendEmailId = data.id;
    }

    // Determine threadId from parent if replying
    let threadId: string | undefined;
    if (args.inReplyTo) {
      const parent = await ctx.runQuery(
        internal.adminMail.getEmailInternal,
        { emailId: args.inReplyTo }
      );
      if (parent) {
        threadId = parent.threadId || args.inReplyTo;
      }
    }

    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    // Store sent email
    await ctx.runMutation(internal.adminMail.storeSentEmail, {
      from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet,
      threadId,
      inReplyTo: args.inReplyTo,
      resendEmailId,
      createdBy: args.userId,
      sentAt: now,
    });

    // Delete draft if sending from a draft
    if (args.draftId) {
      await ctx.runMutation(internal.adminMail.deleteDraft, {
        draftId: args.draftId,
      });
    }
  },
});

/**
 * Internal query to get email (for use in actions)
 */
export const getEmailInternal = internalQuery({
  args: { emailId: v.id("adminEmails") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.emailId);
  },
});

/**
 * Internal mutation to store a sent email
 */
export const storeSentEmail = internalMutation({
  args: {
    from: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    snippet: v.optional(v.string()),
    threadId: v.optional(v.string()),
    inReplyTo: v.optional(v.id("adminEmails")),
    resendEmailId: v.optional(v.string()),
    createdBy: v.id("users"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminEmails", {
      direction: "outbound",
      threadId: args.threadId,
      inReplyTo: args.inReplyTo,
      from: args.from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet: args.snippet,
      folder: "sent",
      isRead: true,
      isStarred: false,
      resendEmailId: args.resendEmailId,
      deliveryStatus: args.resendEmailId ? "sent" : undefined,
      sentAt: args.sentAt,
      createdAt: args.sentAt,
      updatedAt: args.sentAt,
      createdBy: args.createdBy,
    });
  },
});

/**
 * Internal mutation to delete a draft after sending
 */
export const deleteDraft = internalMutation({
  args: { draftId: v.id("adminEmails") },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (draft && draft.folder === "drafts") {
      await ctx.db.delete(args.draftId);
    }
  },
});

/**
 * Public mutation to trigger sending (calls internal action)
 */
export const sendEmail = mutation({
  args: {
    token: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    inReplyTo: v.optional(v.id("adminEmails")),
    draftId: v.optional(v.id("adminEmails")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    await ctx.scheduler.runAfter(0, internal.adminMail.sendEmailAction, {
      userId: user._id,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      inReplyTo: args.inReplyTo,
      draftId: args.draftId,
    });
  },
});

// ============================================
// WEBHOOK MUTATIONS (called from API route)
// ============================================

/**
 * Public mutation for webhook to store inbound emails.
 * Validates via a shared webhook secret.
 */
export const webhookStoreInbound = mutation({
  args: {
    webhookSecret: v.string(),
    from: v.string(),
    fromName: v.optional(v.string()),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    subject: v.string(),
    bodyHtml: v.string(),
    bodyText: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (expectedSecret && args.webhookSecret !== expectedSecret) {
      throw new Error("Invalid webhook secret");
    }

    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    await ctx.db.insert("adminEmails", {
      direction: "inbound",
      threadId: args.threadId,
      from: args.from,
      fromName: args.fromName,
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet,
      folder: "inbox",
      isRead: false,
      isStarred: false,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Public mutation for webhook to update delivery status.
 * Validates via a shared webhook secret.
 */
export const webhookUpdateStatus = mutation({
  args: {
    webhookSecret: v.string(),
    resendEmailId: v.string(),
    status: v.union(
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained")
    ),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (expectedSecret && args.webhookSecret !== expectedSecret) {
      throw new Error("Invalid webhook secret");
    }

    const email = await ctx.db
      .query("adminEmails")
      .withIndex("by_resendEmailId", (q) =>
        q.eq("resendEmailId", args.resendEmailId)
      )
      .first();

    if (email) {
      await ctx.db.patch(email._id, {
        deliveryStatus: args.status,
        updatedAt: Date.now(),
      });
    }
  },
});
