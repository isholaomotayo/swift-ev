import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireActiveStatus } from "./lib/auth";
import { resolveMailAccountFromRecipients } from "./mailRouting";

const mailFolderSchema = v.union(
  v.literal("inbox"),
  v.literal("sent"),
  v.literal("drafts"),
  v.literal("trash"),
  v.literal("archive")
);

export const listEmails = query({
  args: {
    token: v.string(),
    folder: mailFolderSchema,
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const limit = args.limit || 50;

    let emails = await ctx.db
      .query("adminEmails")
      .withIndex("by_mailAccountUserId_folder_date", (q) =>
        q.eq("mailAccountUserId", user._id).eq("folder", args.folder)
      )
      .order("desc")
      .take(limit * 2);

    if (args.unreadOnly) {
      emails = emails.filter((e) => !e.isRead);
    }

    return {
      emails: emails.slice(0, limit),
      hasMore: emails.length > limit,
    };
  },
});

export const getEmail = query({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");

    if (email.mailAccountUserId !== user._id) {
      throw new Error("Not authorized to view this email");
    }

    return email;
  },
});

export const getMailStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const [inboxEmails, sentEmails, draftEmails, trashEmails, archiveEmails] =
      await Promise.all([
        ctx.db
          .query("adminEmails")
          .withIndex("by_mailAccountUserId_folder_date", (q) =>
            q.eq("mailAccountUserId", user._id).eq("folder", "inbox")
          )
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_mailAccountUserId_folder_date", (q) =>
            q.eq("mailAccountUserId", user._id).eq("folder", "sent")
          )
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_mailAccountUserId_folder_date", (q) =>
            q.eq("mailAccountUserId", user._id).eq("folder", "drafts")
          )
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_mailAccountUserId_folder_date", (q) =>
            q.eq("mailAccountUserId", user._id).eq("folder", "trash")
          )
          .collect(),
        ctx.db
          .query("adminEmails")
          .withIndex("by_mailAccountUserId_folder_date", (q) =>
            q.eq("mailAccountUserId", user._id).eq("folder", "archive")
          )
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

export const searchEmails = query({
  args: {
    token: v.string(),
    query: v.string(),
    folder: v.optional(mailFolderSchema),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    if (!args.query.trim()) return [];

    const searchQuery = ctx.db
      .query("adminEmails")
      .withSearchIndex("search_emails", (q) => {
        let search = q.search("subject", args.query);
        search = search.eq("mailAccountUserId", user._id);
        if (args.folder) search = search.eq("folder", args.folder);
        return search;
      });

    const results = await searchQuery.take(50);
    return results;
  },
});

export const markAsRead = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    if (email.mailAccountUserId !== user._id) {
      throw new Error("Not authorized to update this email");
    }

    await ctx.db.patch(args.emailId, {
      isRead: args.isRead,
      updatedAt: Date.now(),
    });
  },
});

export const moveToFolder = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
    folder: mailFolderSchema,
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    if (email.mailAccountUserId !== user._id) {
      throw new Error("Not authorized to move this email");
    }

    await ctx.db.patch(args.emailId, {
      folder: args.folder,
      updatedAt: Date.now(),
    });
  },
});

export const starEmail = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    if (email.mailAccountUserId !== user._id) {
      throw new Error("Not authorized to update this email");
    }

    await ctx.db.patch(args.emailId, {
      isStarred: !email.isStarred,
      updatedAt: Date.now(),
    });
  },
});

export const retryFetchEmailBody = mutation({
  args: {
    token: v.string(),
    emailId: v.id("adminEmails"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireActiveStatus(user);

    const email = await ctx.db.get(args.emailId);
    if (!email) throw new Error("Email not found");
    if (email.mailAccountUserId !== user._id) {
      throw new Error("Not authorized to retry this email");
    }

    if (!email.bodyHtml && email.resendEmailId) {
      await ctx.scheduler.runAfter(0, internal.adminMail.fetchAndBackfillEmailBody, {
        emailId: args.emailId,
        resendEmailId: email.resendEmailId,
      });
    }
  },
});

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
    requireActiveStatus(user);

    const now = Date.now();
    const snippet = (args.bodyText || "").slice(0, 120);

    // Determine the mapping for this draft so it appears in the correct user inbox.
    let mailAccountUserId: Id<"users"> | undefined = undefined;
    let mailAccountEmail: string | undefined = undefined;

    if (args.inReplyTo) {
      const parent = await ctx.db.get(args.inReplyTo);
      if (parent?.mailAccountUserId === user._id) {
        mailAccountUserId = parent.mailAccountUserId;
        mailAccountEmail = parent.mailAccountEmail;
      }
    }

    if (!mailAccountEmail) {
      const mapping = await resolveMailAccountFromRecipients(ctx, args.to);
      mailAccountUserId = mapping?.mailAccountUserId;
      mailAccountEmail = mapping?.mailAccountEmail;
    }

    const from = mailAccountEmail ?? "buy@autoexport.live";

    if (args.draftId) {
      const existing = await ctx.db.get(args.draftId);
      if (!existing || existing.folder !== "drafts") {
        throw new Error("Draft not found");
      }
      if (existing.mailAccountUserId !== user._id) {
        throw new Error("Not authorized to edit this draft");
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
        from,
        mailAccountUserId,
        mailAccountEmail,
      });

      return args.draftId;
    }

    const draftId = await ctx.db.insert("adminEmails", {
      direction: "outbound",
      threadId: undefined,
      inReplyTo: args.inReplyTo,
      from,
      mailAccountUserId,
      mailAccountEmail,
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
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
    });

    return draftId;
  },
});

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
    requireActiveStatus(user);

    // Basic ownership checks to prevent cross-user access.
    if (args.inReplyTo) {
      const parent = await ctx.db.get(args.inReplyTo);
      if (!parent || parent.mailAccountUserId !== user._id) {
        throw new Error("Not authorized to reply to this thread");
      }
    }
    if (args.draftId) {
      const draft = await ctx.db.get(args.draftId);
      if (!draft || draft.mailAccountUserId !== user._id) {
        throw new Error("Not authorized to send this draft");
      }
    }

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

