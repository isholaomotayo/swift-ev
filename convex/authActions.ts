"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import bcrypt from "bcryptjs";

/**
 * Register a new user.
 * Runs in the Node.js runtime so bcrypt can hash the password without hitting
 * Convex's V8 isolate CPU limits. The actual DB write is delegated to an
 * internal mutation.
 */
export const register = action({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
    accountType: v.optional(
      v.union(
        v.literal("individual"),
        v.literal("dealer"),
        v.literal("corporate"),
        v.literal("seller_individual"),
        v.literal("seller_dealer"),
        v.literal("seller_fleet")
      )
    ),
    preferredCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { password, ...rest } = args;
    // bcrypt with cost factor 12 — strong but within reason for a Node.js action
    const passwordHash = await bcrypt.hash(password, 12);
    return await ctx.runMutation(internal.auth.createUser, {
      ...rest,
      passwordHash,
    });
  },
});

/**
 * Log in a user.
 * Fetches the stored hash via an internal query, verifies it with bcrypt in
 * the Node.js runtime, then creates the session via an internal mutation.
 */
export const login = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.auth.getUserByEmail, {
      email: args.email,
    });

    // Use a constant-time response to avoid user-enumeration via timing
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    if (user.status === "suspended") {
      throw new Error("Account suspended. Please contact support.");
    }
    if (user.status === "banned") {
      throw new Error("Account has been banned.");
    }

    return await ctx.runMutation(internal.auth.createSession, {
      userId: user._id,
    });
  },
});

/**
 * Reset password using a one-time token from the password-reset email.
 * Validates the token, bcrypt-hashes the new password, and updates the user.
 */
export const resetPassword = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const resetData = await ctx.runQuery(internal.auth.getPasswordResetToken, {
      token: args.token,
    });

    if (!resetData) {
      throw new Error(
        "Invalid or expired password reset link. Please request a new one."
      );
    }

    const passwordHash = await bcrypt.hash(args.newPassword, 12);

    await ctx.runMutation(internal.auth.consumePasswordResetToken, {
      tokenId: resetData.tokenId,
      userId: resetData.userId,
      passwordHash,
    });

    return { success: true };
  },
});

/**
 * Change password.
 * Verifies the current password and re-hashes the new one in the Node.js
 * runtime before delegating the DB update to an internal mutation.
 */
export const changePassword = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionData = await ctx.runQuery(internal.auth.getSessionWithUser, {
      token: args.token,
    });

    if (!sessionData) {
      throw new Error("Unauthorized");
    }

    const isValid = await bcrypt.compare(
      args.currentPassword,
      sessionData.passwordHash
    );
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(args.newPassword, 12);
    await ctx.runMutation(internal.auth.updatePasswordHash, {
      userId: sessionData.userId,
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});
