import { Id } from "./_generated/dataModel";

/**
 * Resolve which in-app account should own an email, based on recipient matching.
 *
 * Current iteration rule:
 *  - Consider only recipients whose domain matches MAIL_PLATFORM_DOMAIN
 *  - Match exact (lowercased) email to `users.email`
 *  - If multiple match, pick the first recipient in the incoming `to` array
 */
export async function resolveMailAccountFromRecipients(ctx: any, to: string[]) {
  const platformDomain = process.env.MAIL_PLATFORM_DOMAIN ?? "autoexports.live";
  const platformDomainLower = platformDomain.toLowerCase().trim();

  const normalizedRecipients = to
    .map((addr) => addr?.toLowerCase().trim())
    .filter(Boolean);

  for (const recipient of normalizedRecipients) {
    // Basic domain check to ensure we only map platform-domain recipients.
    if (!recipient.endsWith(`@${platformDomainLower}`)) continue;

    // `users.email` is stored lowercased in auth flows; match exact equality.
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

