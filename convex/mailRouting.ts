import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const PLATFORM_DOMAIN_DEFAULT = "autoexports.live";

/**
 * Resolve which in-app account should own an email, based on recipient matching.
 *
 * Current iteration rule:
 *  - Consider only recipients whose domain matches MAIL_PLATFORM_DOMAIN
 *  - Match exact (lowercased) email to `users.email`
 *  - If multiple match, pick the first recipient in the incoming `to` array
 *
 * NOTE: This function accesses `ctx.db` directly and can only be called from
 * mutations / queries — NOT from httpAction.  For httpAction contexts use the
 * `resolveMailAccount` internal query below.
 */
export async function resolveMailAccountFromRecipients(ctx: any, to: string[]) {
  const platformDomainLower = PLATFORM_DOMAIN_DEFAULT.toLowerCase();

  const normalizedRecipients = to
    .map((addr) => addr?.toLowerCase().trim())
    .filter(Boolean);

  for (const recipient of normalizedRecipients) {
    if (!recipient.endsWith(`@${platformDomainLower}`)) continue;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", recipient))
      .first();

    if (user) {
      return {
        mailAccountUserId: user._id as Id<"users">,
        mailAccountEmail: recipient,
      };
    }
  }

  return null;
}

/**
 * Internal query version — callable via ctx.runQuery from httpAction / actions.
 * Returns { mailAccountUserId, mailAccountEmail } or null.
 */
export const resolveMailAccount = internalQuery({
  args: { to: v.array(v.string()) },
  handler: async (ctx, args) => {
    const platformDomainLower = PLATFORM_DOMAIN_DEFAULT.toLowerCase();

    const normalizedRecipients = args.to
      .map((addr) => addr?.toLowerCase().trim())
      .filter(Boolean);

    for (const recipient of normalizedRecipients) {
      if (!recipient.endsWith(`@${platformDomainLower}`)) continue;

      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", recipient))
        .first();

      if (user) {
        return {
          mailAccountUserId: user._id,
          mailAccountEmail: recipient,
        };
      }
    }

    return null;
  },
});
