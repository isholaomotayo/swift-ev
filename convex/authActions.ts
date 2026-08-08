"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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
  handler: async (ctx, args): Promise<{ userId: Id<"users">; message: string }> => {
    const { password, email, phone, ...rest } = args;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || undefined;

    // bcrypt with cost factor 12 — strong but within reason for a Node.js action
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      return await ctx.runMutation(internal.auth.createUser, {
        ...rest,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
      });
    } catch (err: any) {
      if (err instanceof ConvexError) {
        throw err;
      }
      if (err?.data?.message) {
        throw new ConvexError({ message: err.data.message });
      }
      throw err;
    }
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
  handler: async (
    ctx,
    args
  ): Promise<{
    token: string;
    user: {
      id: Id<"users">;
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      accountType?: string;
      membershipTier: string;
      emailVerified: boolean;
      kycStatus: string;
      walletBalance: number;
      buyingPower: number;
      status: string;
      role: string;
      vendorCompany?: string;
      vendorLicense?: string;
      verificationFeeStatus?: string;
    };
  }> => {
    const user = await ctx.runQuery(internal.auth.getUserByEmail, {
      email: args.email,
    }) as { _id: Id<"users">; passwordHash: string; status: string } | null;

    // Use a constant-time response to avoid user-enumeration via timing
    if (!user) {
      throw new ConvexError({ message: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    if (!isValid) {
      throw new ConvexError({ message: "Invalid email or password" });
    }

    if (user.status === "suspended") {
      throw new ConvexError({ message: "Account suspended. Please contact support." });
    }
    if (user.status === "banned") {
      throw new ConvexError({ message: "Account has been banned." });
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
      throw new ConvexError({
        message: "Invalid or expired password reset link. Please request a new one.",
      });
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
      throw new ConvexError({ message: "Unauthorized" });
    }

    const isValid = await bcrypt.compare(
      args.currentPassword,
      sessionData.passwordHash
    );
    if (!isValid) {
      throw new ConvexError({ message: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(args.newPassword, 12);
    await ctx.runMutation(internal.auth.updatePasswordHash, {
      userId: sessionData.userId,
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});
