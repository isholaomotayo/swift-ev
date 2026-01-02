/**
 * Type-safe enum validation utilities
 */

type UserRole = "buyer" | "seller" | "admin" | "superadmin";
type UserStatus = "pending" | "active" | "suspended" | "banned";
type KYCStatus = "not_started" | "pending" | "approved" | "rejected";
type OrderStatus =
  | "pending_payment"
  | "payment_complete"
  | "shipped"
  | "in_transit"
  | "customs_clearance"
  | "delivered"
  | "cancelled";

const VALID_ROLES: UserRole[] = ["buyer", "seller", "admin", "superadmin"];
const VALID_STATUSES: UserStatus[] = ["pending", "active", "suspended", "banned"];
const VALID_KYC_STATUSES: KYCStatus[] = ["not_started", "pending", "approved", "rejected"];
const VALID_ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "payment_complete",
  "shipped",
  "in_transit",
  "customs_clearance",
  "delivered",
  "cancelled",
];

/**
 * Validates and returns a valid user role or undefined
 */
export function validateUserRole(value: string | undefined): UserRole | undefined {
  if (!value) return undefined;
  return VALID_ROLES.includes(value as UserRole) ? (value as UserRole) : undefined;
}

/**
 * Validates and returns a valid user status or undefined
 */
export function validateUserStatus(value: string | undefined): UserStatus | undefined {
  if (!value) return undefined;
  return VALID_STATUSES.includes(value as UserStatus) ? (value as UserStatus) : undefined;
}

/**
 * Validates and returns a valid KYC status or undefined
 */
export function validateKYCStatus(value: string | undefined): KYCStatus | undefined {
  if (!value) return undefined;
  return VALID_KYC_STATUSES.includes(value as KYCStatus) ? (value as KYCStatus) : undefined;
}

/**
 * Validates and returns a valid order status or undefined
 */
export function validateOrderStatus(value: string | undefined): OrderStatus | undefined {
  if (!value) return undefined;
  return VALID_ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : undefined;
}

