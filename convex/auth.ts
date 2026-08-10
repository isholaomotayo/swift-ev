import { v, ConvexError } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserOrNull } from "./lib/auth";

export const getUserFromTokenQuery = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await getAuthUserOrNull(ctx, args.token);
  },
});

// ============================================================
// INTERNAL HELPERS (called by authActions.ts via Node.js actions)
// ============================================================

/**
 * Internal query — returns the full user record including passwordHash.
 * Only accessible from other Convex functions (e.g. the login action).
 */
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
  },
});

/**
 * Internal mutation — inserts a new user row with a pre-computed passwordHash.
 * Called by the register action after bcrypt.hash() completes in Node.js.
 */
export const createUser = internalMutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    passwordHash: v.string(),
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
    acceptedTerms: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.acceptedTerms) {
      throw new ConvexError({ message: "You must accept the terms and conditions" });
    }
    const cleanEmail = args.email.trim().toLowerCase();
    const cleanPhone = args.phone?.trim() || undefined;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    if (existingUser) {
      throw new ConvexError({ message: "Email already registered" });
    }

    if (cleanPhone) {
      const existingPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
        .first();
      if (existingPhone) {
        throw new ConvexError({ message: "Phone number already registered" });
      }
    }

    const isSeller = args.accountType?.startsWith("seller_");
    const role: "buyer" | "seller" = isSeller ? "seller" : "buyer";

    const userId = await ctx.db.insert("users", {
      email: cleanEmail,
      phone: cleanPhone,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      passwordHash: args.passwordHash,
      accountType: args.accountType ?? "individual",
      membershipTier: "guest",
      status: "pending",
      emailVerified: false,
      phoneVerified: false,
      kycStatus: "not_started",
      walletBalance: 0,
      pendingBalance: 0,
      reservedBalance: 0,
      walletCurrency: "NGN",
      preferredCurrency: args.preferredCurrency ?? "NGN",
      // FIX: was incorrectly hardcoded "paid" — now correctly starts as "not_paid"
      verificationFeeStatus: "not_paid",
      buyingPower: 0,
      depositAmount: 0,
      dailyBidsUsed: 0,
      lastBidResetAt: Date.now(),
      role,
      termsAcceptedAt: Date.now(),
      termsVersion: "2026-01",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule the verification email — runs in a Node.js action outside this mutation
    await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
      userId,
      email: cleanEmail,
      firstName: args.firstName.trim(),
    });

    return { userId, message: "Registration successful. Please check your email to verify your account." };
  },
});

/**
 * Internal mutation — creates a session for an already-verified user and
 * returns the session token along with the user's public profile data.
 */
export const createSession = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ message: "User not found" });
    }

    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId: args.userId,
      token,
      expiresAt,
      createdAt: now,
      deviceInfo: "web",
      ipAddress: "unknown",
    });

    await ctx.db.patch(args.userId, { lastLoginAt: now });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        accountType: user.accountType,
        membershipTier: user.membershipTier,
        emailVerified: user.emailVerified,
        kycStatus: user.kycStatus,
        walletBalance: user.walletBalance ?? 0,
        buyingPower: user.buyingPower,
        status: user.status,
        role: user.role,
        vendorCompany: user.vendorCompany,
        vendorLicense: user.vendorLicense,
        verificationFeeStatus: user.verificationFeeStatus,
      },
    };
  },
});

/**
 * Internal query — returns session + user passwordHash for the changePassword action.
 */
export const getSessionWithUser = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    return {
      userId: user._id,
      passwordHash: user.passwordHash,
    };
  },
});

/**
 * Internal mutation — updates only the passwordHash field.
 */
export const updatePasswordHash = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Internal mutation — stores an email verification token, invalidating prior ones.
 */
export const createEmailVerificationToken = internalMutation({
  args: { userId: v.id("users"), token: v.string() },
  handler: async (ctx, args) => {
    // Invalidate any existing unused tokens for this user
    const existing = await ctx.db
      .query("emailVerifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.insert("emailVerifications", {
      userId: args.userId,
      token: args.token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation — stores a password-reset token, invalidating prior ones.
 */
export const createPasswordResetToken = internalMutation({
  args: { userId: v.id("users"), token: v.string() },
  handler: async (ctx, args) => {
    // Invalidate any existing tokens for this user
    const existing = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    await ctx.db.insert("passwordResets", {
      userId: args.userId,
      token: args.token,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal query — validates a password-reset token and returns its metadata.
 * Returns null if the token is expired, used, or not found.
 */
export const getPasswordResetToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!record) return null;
    if (record.expiresAt < Date.now()) return null;
    if (record.usedAt) return null;

    return { userId: record.userId, tokenId: record._id };
  },
});

/**
 * Internal mutation — marks a reset token as used and applies the new password hash.
 */
export const consumePasswordResetToken = internalMutation({
  args: {
    tokenId: v.id("passwordResets"),
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, { usedAt: Date.now() });
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Logout user — deletes the session token from the database.
 */
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

/**
 * Get current user from session token — used by AuthProvider and server layouts.
 */
export const getCurrentUser = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      accountType: user.accountType,
      membershipTier: user.membershipTier,
      emailVerified: user.emailVerified,
      kycStatus: user.kycStatus,
      walletBalance: user.walletBalance ?? 0,
      buyingPower: user.buyingPower,
      status: user.status,
      role: user.role,
      vendorCompany: user.vendorCompany,
      vendorLicense: user.vendorLicense,
      preferredCurrency: user.preferredCurrency ?? "NGN",
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
    };
  },
});

/**
 * Update user profile (name/phone — no password change needed here).
 */
export const updateProfile = mutation({
  args: {
    token: v.string(),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new ConvexError({ message: "Unauthorized" });
    }

    await ctx.db.patch(session.userId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Verify email — validates the one-time token from the verification email and
 * marks the user's email as verified and their account as active.
 */
export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!record) {
      throw new ConvexError({ message: "Invalid or expired verification link." });
    }
    if (record.expiresAt < Date.now()) {
      throw new ConvexError({ message: "Verification link has expired. Please request a new one." });
    }
    if (record.usedAt) {
      throw new ConvexError({ message: "This verification link has already been used." });
    }

    await ctx.db.patch(record._id, { usedAt: Date.now() });
    await ctx.db.patch(record.userId, {
      emailVerified: true,
      status: "active",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Request password reset — always returns success to prevent user enumeration.
 * Schedules a Node.js action that generates the token and sends the email.
 */
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (user) {
      // Schedule immediately — runs in a Node.js action outside this mutation
      await ctx.scheduler.runAfter(0, internal.emails.sendPasswordResetEmail, {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
      });
    }

    // Always return the same response to prevent email enumeration
    return {
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    };
  },
});

/**
 * Resend verification email — for users with pending status and unverified email.
 * Always returns success to prevent email enumeration.
 */
export const resendVerificationEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (user && user.status === "pending" && !user.emailVerified) {
      await ctx.scheduler.runAfter(0, internal.emails.sendVerificationEmail, {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
      });
    }

    return {
      success: true,
      message:
        "If an account exists and is pending verification, we've sent a new link.",
    };
  },
});
