import { Id } from "../_generated/dataModel";

/**
 * Centralized authorization utilities for Convex functions
 * These helpers ensure consistent security across all mutations and queries
 */

export type UserRole = "buyer" | "seller" | "admin" | "superadmin";
export type UserStatus = "pending" | "active" | "suspended" | "banned";

export interface AuthenticatedUser {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  membershipTier: "guest" | "basic" | "premier" | "business";
  vendorCompany?: string;
  vendorLicense?: string;
}

/**
 * Validate session token and return authenticated user
 * Throws error if token is invalid or expired
 */
export async function requireAuth(
  ctx: any,
  token: string
): Promise<AuthenticatedUser> {
  // Validate session exists
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session) {
    throw new Error("Unauthorized - please log in");
  }

  // Check if session is expired
  if (session.expiresAt < Date.now()) {
    throw new Error("Session expired - please log in again");
  }

  // Get user
  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user as AuthenticatedUser;
}

/**
 * Require user to have one of the specified roles
 * Throws error if user doesn't have required role
 */
export function requireRole(
  user: AuthenticatedUser,
  allowedRoles: UserRole | UserRole[]
): void {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    throw new Error(
      `Access denied. Required role: ${roles.join(" or ")}, but user has role: ${user.role}`
    );
  }
}

/**
 * Require user to be an admin or superadmin
 * Throws error if user is not an admin
 */
export function requireAdmin(user: AuthenticatedUser): void {
  requireRole(user, ["admin", "superadmin"]);
}

/**
 * Require user to be a superadmin
 * Throws error if user is not a superadmin
 */
export function requireSuperadmin(user: AuthenticatedUser): void {
  requireRole(user, "superadmin");
}

/**
 * Require user to be a seller (vendor)
 * Throws error if user is not a seller
 */
export function requireSeller(user: AuthenticatedUser): void {
  requireRole(user, "seller");
}

/**
 * Require user account to be active
 * Throws error if user is suspended or banned
 */
export function requireActiveStatus(user: AuthenticatedUser): void {
  if (user.status !== "active") {
    throw new Error(
      `Account is ${user.status}. Please contact support or complete verification.`
    );
  }
}

/**
 * Validate that user owns a resource
 * Throws error if user doesn't own the resource and isn't an admin
 */
export function requireOwnership(
  user: AuthenticatedUser,
  resourceOwnerId: Id<"users">
): void {
  const isOwner = user._id === resourceOwnerId;
  const isAdmin = user.role === "admin" || user.role === "superadmin";

  if (!isOwner && !isAdmin) {
    throw new Error("You don't have permission to access this resource");
  }
}

/**
 * Check if user has permission without throwing
 * Returns true if user has permission, false otherwise
 */
export function hasRole(
  user: AuthenticatedUser,
  allowedRoles: UserRole | UserRole[]
): boolean {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(user.role);
}

/**
 * Check if user is an admin (admin or superadmin)
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "admin" || user.role === "superadmin";
}

/**
 * Check if user is a superadmin
 */
export function isSuperadmin(user: AuthenticatedUser): boolean {
  return user.role === "superadmin";
}

/**
 * Check if user is a seller (vendor)
 */
export function isSeller(user: AuthenticatedUser): boolean {
  return user.role === "seller";
}

/**
 * Check if user owns a resource or is an admin
 */
export function hasOwnershipOrAdmin(
  user: AuthenticatedUser,
  resourceOwnerId: Id<"users">
): boolean {
  return user._id === resourceOwnerId || isAdmin(user);
}

/**
 * Validate user has active status without throwing
 */
export function isActiveUser(user: AuthenticatedUser): boolean {
  return user.status === "active";
}

/**
 * Get user's membership tier limits
 */
export function getMembershipLimits(tier: "guest" | "basic" | "premier" | "business") {
  return {
    dailyBidLimit: tier === "guest" ? 0 : tier === "basic" ? 3 : tier === "premier" ? 10 : Infinity,
    uploadLimit: tier === "guest" ? 0 : tier === "basic" ? 5 : tier === "premier" ? 20 : Infinity,
    features: {
      bidding: tier !== "guest",
      uploads: tier !== "guest",
      analytics: tier === "premier" || tier === "business",
      prioritySupport: tier === "business",
    },
  };
}

/**
 * Create audit log entry
 * Used for tracking critical operations
 */
export async function createAuditLog(
  ctx: any,
  data: {
    userId: Id<"users">;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    metadata?: any;
  }
): Promise<void> {
  await ctx.db.insert("auditLog", {
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    changes: data.changes ? JSON.stringify(data.changes) : undefined,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    timestamp: Date.now(),
    ipAddress: "unknown", // TODO: Get from request context
  });
}
