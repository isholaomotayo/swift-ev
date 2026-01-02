import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Debug: Check what's actually in the database
 */
export const checkUser = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return { found: false, message: "User not found in database" };
    }

    return {
      found: true,
      email: user.email,
      passwordHashPrefix: user.passwordHash.substring(0, 7) + "...", // Only show prefix for security
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      hashAlgorithm: user.passwordHash.startsWith("$2a$") ? "bcrypt" : "unknown",
    };
  },
});
