import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireAuth, requireAdmin } from "./lib/auth";

const SEND_AS_ALLOWED_ADDRESSES = [
  "hello@autoexports.live",
  "buy@autoexports.live",
] as const;

const DEFAULT_SEND_AS = "buy@autoexports.live";
const SEND_AS_SETTINGS_KEY = "mail.sendAsAliases";
const SEND_AS_DOMAIN = "autoexports.live";

function normalizeSendAs(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase();
}

function isValidSendAsEmail(email: string): boolean {
  if (!email.includes("@")) return false;
  const [, domain] = email.split("@");
  return domain === SEND_AS_DOMAIN;
}

async function getConfiguredSendAsAliases(
  ctx: QueryCtx | MutationCtx
): Promise<string[]> {
  const setting = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", SEND_AS_SETTINGS_KEY))
    .first();

  if (!setting) {
    return [...SEND_AS_ALLOWED_ADDRESSES];
  }

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [...SEND_AS_ALLOWED_ADDRESSES];
    const normalized = parsed
      .map((entry) => normalizeSendAs(String(entry)))
      .filter((entry): entry is string => Boolean(entry))
      .filter(isValidSendAsEmail);
    return Array.from(new Set(normalized));
  } catch {
    return [...SEND_AS_ALLOWED_ADDRESSES];
  }
}

export const getSendAsAliasesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getConfiguredSendAsAliases(ctx);
  },
});

function resolveAllowedSendAsOrThrow(value: string, allowedAliases: string[]): string {
  const normalized = normalizeSendAs(value);
  if (!normalized) {
    throw new Error("Missing send-as address");
  }
  if (!allowedAliases.includes(normalized)) {
    throw new Error("Invalid send-as address");
  }
  return normalized;
}

// ============================================
// QUERIES
// ============================================

/**
 * List emails by folder — uses by_folder_date index for efficient ordering.
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
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const limit = args.limit || 50;

    // Use the compound index for ordering — no .collect() needed
    let emails = await ctx.db
      .query("adminEmails")
      .withIndex("by_folder_date", (q) => q.eq("folder", args.folder))
      .order("desc")
      .take(limit * 2); // Take extra to accommodate unread filtering

    if (args.unreadOnly) {
      emails = emails.filter((e) => !e.isRead);
    }

    return {
      emails: emails.slice(0, limit),
      hasMore: emails.length > limit,
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
 * Get mail stats — uses indexed queries per folder instead of loading everything.
 */
export const getMailStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    // Query each folder separately using the index — much more efficient
    const [inboxEmails, sentEmails, draftEmails, trashEmails, archiveEmails] =
      await Promise.all([
        ctx.db
          .query("adminEmails")
          .withIndex("by_folder", (q) => q.eq("folder", "inbox"))
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_folder", (q) => q.eq("folder", "sent"))
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_folder", (q) => q.eq("folder", "drafts"))
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_folder", (q) => q.eq("folder", "trash"))
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_folder", (q) => q.eq("folder", "archive"))
          .collect(),
      ]);

    return {
      inbox: inboxEmails.length,
      inboxUnread: inboxEmails.filter((e) => !e.isRead).length,
      sent: sentEmails.length,
      drafts: draftEmails.length,
      trash: trashEmails.length,
      archive: archiveEmails.length,
    };
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

    const searchQuery = ctx.db
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

/**
 * Check if any addresses in the list are suppressed (bounced/complained).
 */
export const checkSuppressions = query({
  args: {
    token: v.string(),
    emails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const suppressed: Array<{ email: string; reason: string; bounceType?: string }> = [];

    for (const email of args.emails) {
      const record = await ctx.db
        .query("emailSuppressions")
        .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
        .first();
      if (record) {
        suppressed.push({
          email: record.email,
          reason: record.reason,
          bounceType: record.bounceType,
        });
      }
    }

    return suppressed;
  },
});

/**
 * Get allowed sender addresses for admin send-as.
 */
export const getSendAsOptions = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);
    const aliases = await getConfiguredSendAsAliases(ctx);
    const recentOutbound = await ctx.db
      .query("adminEmails")
      .withIndex("by_folder_date", (q) => q.eq("folder", "sent"))
      .order("desc")
      .take(100);
    const recentByUser = recentOutbound
      .filter((email) => email.createdBy === user._id)
      .map((email) => normalizeSendAs(email.from))
      .filter((email): email is string => Boolean(email))
      .filter((email) => aliases.includes(email));
    const options = Array.from(new Set([...aliases, ...recentByUser]));
    const defaultValue = options.includes(DEFAULT_SEND_AS)
      ? DEFAULT_SEND_AS
      : (options[0] ?? DEFAULT_SEND_AS);
    return {
      options,
      defaultValue,
    };
  },
});

export const updateSendAsOptions = mutation({
  args: {
    token: v.string(),
    aliases: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const normalizedAliases = Array.from(
      new Set(
        args.aliases
          .map((alias) => normalizeSendAs(alias))
          .filter((alias): alias is string => Boolean(alias))
      )
    );

    if (normalizedAliases.length === 0) {
      throw new Error("At least one send-as alias is required");
    }
    if (!normalizedAliases.every(isValidSendAsEmail)) {
      throw new Error(`All aliases must use @${SEND_AS_DOMAIN}`);
    }

    const defaultAlias = normalizeSendAs(DEFAULT_SEND_AS)!;
    if (!normalizedAliases.includes(defaultAlias)) {
      normalizedAliases.push(defaultAlias);
    }

    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", SEND_AS_SETTINGS_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: JSON.stringify(normalizedAliases),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: SEND_AS_SETTINGS_KEY,
        value: JSON.stringify(normalizedAliases),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return {
      options: normalizedAliases,
      defaultValue: normalizedAliases.includes(defaultAlias)
        ? defaultAlias
        : normalizedAliases[0],
    };
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
    sendAs: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);
    const aliases = await ctx.runQuery(internal.adminMail.getSendAsAliasesInternal, {});
    const from = resolveAllowedSendAsOrThrow(args.sendAs, aliases);

    if (args.draftId) {
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
        from,
        updatedAt: now,
      });
      return args.draftId;
    }

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
 * Retry fetching email body if it's empty.
 * Called by the client when a user opens an email with no body.
 */
export const retryFetchEmailBody = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    if (!email.bodyHtml && email.resendEmailId) {
      await ctx.scheduler.runAfter(0, internal.adminMail.fetchAndBackfillEmailBody, {
        emailId: args.emailId,
        resendEmailId: email.resendEmailId,
      });
    }
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

// ============================================
// INTERNAL MUTATIONS (webhook + actions)
// ============================================

/**
 * Store an inbound email from webhook. Returns the new record ID.
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
    mailAccountUserId: v.optional(v.id("users")),
    mailAccountEmail: v.optional(v.string()),
    resendEmailId: v.optional(v.string()),
    messageId: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          filename: v.string(),
          contentType: v.string(),
        })
      )
    ),
    hasAttachments: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    const id = await ctx.db.insert("adminEmails", {
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
      mailAccountUserId: args.mailAccountUserId,
      mailAccountEmail: args.mailAccountEmail,
      resendEmailId: args.resendEmailId,
      messageId: args.messageId,
      attachments: args.attachments?.map((a) => ({
        id: a.id,
        filename: a.filename,
        contentType: a.contentType,
      })),
      hasAttachments: args.hasAttachments,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

/**
 * Update delivery status from webhook
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
    bounceType: v.optional(v.string()),
    bounceSubType: v.optional(v.string()),
    bounceMessage: v.optional(v.string()),
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
        bounceType: args.bounceType,
        bounceSubType: args.bounceSubType,
        bounceMessage: args.bounceMessage,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Add an email address to the suppression list
 */
export const addSuppression = internalMutation({
  args: {
    email: v.string(),
    reason: v.union(v.literal("bounce"), v.literal("complaint")),
    bounceType: v.optional(v.string()),
    bounceMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already suppressed
    const existing = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!existing) {
      await ctx.db.insert("emailSuppressions", {
        email: args.email,
        reason: args.reason,
        bounceType: args.bounceType,
        bounceMessage: args.bounceMessage,
        createdAt: Date.now(),
      });
    }
  },
});

/**
 * Store a sent email record
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
    inReplyToMessageId: v.optional(v.string()),
    referencesMessageIds: v.optional(v.array(v.string())),
    mailAccountUserId: v.optional(v.id("users")),
    mailAccountEmail: v.optional(v.string()),
    resendEmailId: v.optional(v.string()),
    createdBy: v.id("users"),
    sentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminEmails", {
      direction: "outbound",
      threadId: args.threadId,
      inReplyTo: args.inReplyTo,
      inReplyToMessageId: args.inReplyToMessageId,
      referencesMessageIds: args.referencesMessageIds,
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
      mailAccountUserId: args.mailAccountUserId,
      mailAccountEmail: args.mailAccountEmail,
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
 * Backfill body content on an existing email record.
 */
export const backfillEmailBody = internalMutation({
  args: {
    emailId: v.id("adminEmails"),
    bodyHtml: v.string(),
    bodyText: v.string(),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await ctx.db.get(args.emailId);
    if (!email) return;

    const snippet =
      args.bodyText.slice(0, 120) ||
      args.bodyHtml.replace(/<[^>]*>/g, "").slice(0, 120);

    await ctx.db.patch(args.emailId, {
      bodyHtml: args.bodyHtml,
      bodyText: args.bodyText,
      snippet,
      messageId: args.messageId || email.messageId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a draft after sending
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
 * Internal query to get email (for use in actions)
 */
export const getEmailInternal = internalQuery({
  args: { emailId: v.id("adminEmails") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.emailId);
  },
});

// ============================================
// ACTIONS (Node.js runtime)
// ============================================

/**
 * Send an email via Resend API with proper threading headers, then store.
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
    sendAs: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    const catchAllFrom = process.env.EMAIL_FROM ?? "buy@autoexport.live";

    // If we can attribute this outgoing message to a specific platform account,
    // we set Resend's `from` to that in-domain address (otherwise we fall back).
    let mailAccountUserId: Id<"users"> | undefined = undefined;
    let mailAccountEmail: string | undefined = undefined;

    // Look up parent email for threading
    let threadId: string | undefined;
    let inReplyToMessageId: string | undefined;
    let referencesMessageIds: string[] | undefined;

    if (args.inReplyTo) {
      const parent = await ctx.runQuery(
        internal.adminMail.getEmailInternal,
        { emailId: args.inReplyTo }
      );
      if (parent) {
        threadId = parent.threadId || args.inReplyTo;
        inReplyToMessageId = parent.messageId;
        mailAccountUserId = parent.mailAccountUserId;
        mailAccountEmail = parent.mailAccountEmail;
        // Build References chain
        if (parent.referencesMessageIds && parent.messageId) {
          referencesMessageIds = [...parent.referencesMessageIds, parent.messageId];
        } else if (parent.messageId) {
          referencesMessageIds = [parent.messageId];
        }
      }
    }

    // If this isn't a reply, try using the draft's mapping first (if present).
    if (!mailAccountEmail && args.draftId) {
      const draft = await ctx.runQuery(
        internal.adminMail.getEmailInternal,
        { emailId: args.draftId }
      );
      if (draft) {
        mailAccountUserId = draft.mailAccountUserId;
        mailAccountEmail = draft.mailAccountEmail;
      }
    }

    // Otherwise, derive mapping from the outbound `to` list.
    if (!mailAccountEmail) {
      const platformDomain =
        process.env.MAIL_PLATFORM_DOMAIN ?? "autoexports.live";
      const platformDomainLower = platformDomain.toLowerCase().trim();

      const normalizedRecipients = args.to
        .map((addr) => addr?.toLowerCase().trim())
        .filter(Boolean);

      for (const recipient of normalizedRecipients) {
        if (!recipient.endsWith(`@${platformDomainLower}`)) continue;

        const user = await ctx.runQuery(internal.auth.getUserByEmail, {
          email: recipient,
        });

        if (user) {
          mailAccountUserId = user._id;
          mailAccountEmail = recipient;
          break;
        }
      }
    }

    const aliases = await ctx.runQuery(
      internal.adminMail.getSendAsAliasesInternal,
      {}
    );
    const validatedSendAs = args.sendAs
      ? resolveAllowedSendAsOrThrow(args.sendAs, aliases)
      : undefined;
    const from = validatedSendAs ?? mailAccountEmail ?? catchAllFrom;

    // Build threading headers for Resend API
    const headers: Record<string, string> = {};
    if (inReplyToMessageId) {
      headers["In-Reply-To"] = inReplyToMessageId;
    }
    if (referencesMessageIds && referencesMessageIds.length > 0) {
      headers["References"] = referencesMessageIds.join(" ");
    }

    let resendEmailId: string | undefined;
    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    if (apiKey) {
      try {
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
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
          }),
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`Email send failed (${res.status}): ${errorBody}`);
          // Still store as failed send so user can see it
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
            inReplyToMessageId,
            referencesMessageIds,
            mailAccountUserId,
            mailAccountEmail,
            createdBy: args.userId,
            sentAt: now,
          });
          return;
        }

        const data = await res.json();
        resendEmailId = data.id;
      } catch (err) {
        console.error("Email send error:", err);
        // Store as failed
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
          inReplyToMessageId,
          referencesMessageIds,
          mailAccountUserId,
          mailAccountEmail,
          createdBy: args.userId,
          sentAt: now,
        });
        return;
      }
    }

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
      inReplyToMessageId,
      referencesMessageIds,
      mailAccountUserId,
      mailAccountEmail,
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
 * Fetch full email content from Resend Receiving API and backfill the record.
 */
export const fetchAndBackfillEmailBody = internalAction({
  args: {
    emailId: v.id("adminEmails"),
    resendEmailId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not set — cannot fetch email body");
      return;
    }

    try {
      // Inbound emails use /emails/receiving/{id}, NOT /emails/{id}
      const res = await fetch(
        `https://api.resend.com/emails/receiving/${args.resendEmailId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!res.ok) {
        console.error(
          `Failed to fetch email ${args.resendEmailId}: ${res.status} ${await res.text()}`
        );
        return;
      }

      const emailData = await res.json();
      const bodyHtml = emailData.html || "";
      const bodyText = emailData.text || "";
      const messageId = emailData.message_id || undefined;

      await ctx.runMutation(internal.adminMail.backfillEmailBody, {
        emailId: args.emailId,
        bodyHtml,
        bodyText,
        messageId,
      });
    } catch (err) {
      console.error(`Error fetching email content from Resend:`, err);
    }
  },
});

// ============================================
// PUBLIC MUTATION — SEND EMAIL
// ============================================

/**
 * Public mutation to trigger sending (calls internal action via scheduler)
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
    sendAs: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const aliases = await getConfiguredSendAsAliases(ctx);
    const validatedSendAs = resolveAllowedSendAsOrThrow(args.sendAs, aliases);

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
      sendAs: validatedSendAs,
    });
  },
});
