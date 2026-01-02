import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

/**
 * Register a new user
 */
export const register = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Check if phone already exists (if provided)
    if (args.phone) {
      const existingPhone = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();

      if (existingPhone) {
        throw new Error("Phone number already registered");
      }
    }

    // Hash password using bcrypt
    const passwordHash = await hashPassword(args.password);

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      phone: args.phone,
      firstName: args.firstName,
      lastName: args.lastName,
      passwordHash,
      membershipTier: "guest",
      status: "pending",
      emailVerified: false,
      phoneVerified: false,
      kycStatus: "pending",
      buyingPower: 0,
      depositAmount: 0,
      dailyBidsUsed: 0,
      lastBidResetAt: Date.now(),
      role: "buyer",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // TODO: Send verification email via scheduler

    return { userId, message: "Registration successful. Please check your email to verify your account." };
  },
});

/**
 * Login user
 */
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await verifyPassword(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Check user status
    if (user.status === "suspended") {
      throw new Error("Account suspended. Please contact support.");
    }
    if (user.status === "banned") {
      throw new Error("Account has been banned.");
    }

    // Create session token
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Create session
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
      deviceInfo: "web", // TODO: Get from request headers
      ipAddress: "unknown", // TODO: Get from request
    });

    // Update last login
    await ctx.db.patch(user._id, {
      lastLoginAt: Date.now(),
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        membershipTier: user.membershipTier,
        emailVerified: user.emailVerified,
        kycStatus: user.kycStatus,
        buyingPower: user.buyingPower,
        status: user.status,
        role: user.role,
        vendorCompany: user.vendorCompany,
        vendorLicense: user.vendorLicense,
      },
    };
  },
});

/**
 * Logout user
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
 * Get current user from session token
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

    // Check if session expired
    if (session.expiresAt < Date.now()) {
      // Session expired - return null (cleanup will be handled by a scheduled job)
      return null;
    }

    // Get user
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
      membershipTier: user.membershipTier,
      emailVerified: user.emailVerified,
      kycStatus: user.kycStatus,
      buyingPower: user.buyingPower,
      status: user.status,
      role: user.role,
      vendorCompany: user.vendorCompany,
      vendorLicense: user.vendorLicense,
    };
  },
});

/**
 * Verify email
 */
export const verifyEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement email verification token lookup
    // For now, this is a placeholder
    throw new Error("Email verification not yet implemented");
  },
});

/**
 * Request password reset
 */
export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: "If the email exists, a reset link has been sent." };
    }

    // TODO: Generate reset token and send email via scheduler

    return { success: true, message: "If the email exists, a reset link has been sent." };
  },
});

/**
 * Reset password
 */
export const resetPassword = mutation({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Implement password reset token lookup and validation
    throw new Error("Password reset not yet implemented");
  },
});

/**
 * Update user profile
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
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(session.userId, args.updates);

    return { success: true };
  },
});

/**
 * Change password
 */
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await verifyPassword(args.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(args.newPassword);

    // Update password
    await ctx.db.patch(user._id, {
      passwordHash: newPasswordHash,
    });

    return { success: true };
  },
});

// Helper functions for password hashing and verification
async function hashPassword(password: string): Promise<string> {
  // Use bcrypt with salt rounds of 10 (industry standard)
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Verify password against bcrypt hash
  return await bcrypt.compare(password, hash);
}

function generateToken(): string {
  // Generate a random token
  return `token_${Math.random().toString(36).substring(2)}_${Date.now()}`;
}
