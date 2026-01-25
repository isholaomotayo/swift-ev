import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import numeral from "numeral";
import { format, formatDistance } from "date-fns";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Nigerian Naira
 */
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
  }
): string {
  const {
    currency = "NGN",
    locale = "en-NG",
    showSymbol = true,
  } = options || {};

  if (!showSymbol) {
    return numeral(amount).format("0,0");
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(
  date: number | Date,
  formatStr: string = "PPP"
): string {
  const dateObj = typeof date === "number" ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: number | Date): string {
  const dateObj = typeof date === "number" ? new Date(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Calculate time remaining until a future timestamp
 * Returns formatted string (e.g., "2d 5h", "3h 45m", "30m")
 */
export function calculateTimeRemaining(endTime: number): string {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Get color class based on time remaining
 * Returns Tailwind color class
 */
export function getTimeRemainingColor(endTime: number): string {
  const now = Date.now();
  const diff = endTime - now;
  const oneHour = 60 * 60 * 1000;
  const fiveMinutes = 5 * 60 * 1000;

  if (diff <= 0) return "text-muted-foreground";
  if (diff < fiveMinutes) return "text-error-red";
  if (diff < oneHour) return "text-warning-amber";
  return "text-volt-green";
}

/**
 * Format battery health percentage with badge color
 */
export function getBatteryHealthBadge(healthPercent: number): {
  label: string;
  variant: "excellent" | "good" | "fair" | "poor";
  color: string;
} {
  if (healthPercent >= 95) {
    return {
      label: "Excellent",
      variant: "excellent",
      color: "bg-volt-green text-white",
    };
  }
  if (healthPercent >= 85) {
    return {
      label: "Good",
      variant: "good",
      color: "bg-electric-blue text-white",
    };
  }
  if (healthPercent >= 70) {
    return {
      label: "Fair",
      variant: "fair",
      color: "bg-warning-amber text-carbon-black",
    };
  }
  return {
    label: "Poor",
    variant: "poor",
    color: "bg-error-red text-white",
  };
}

/**
 * Calculate service fee based on AutoExports fee structure
 */
export function calculateServiceFee(bidAmount: number): number {
  if (bidAmount <= 1_000_000) {
    return 75_000;
  } else if (bidAmount <= 5_000_000) {
    return bidAmount * 0.07; // 7%
  } else if (bidAmount <= 15_000_000) {
    return bidAmount * 0.06; // 6%
  } else {
    return bidAmount * 0.05; // 5%
  }
}

/**
 * Format VIN number (add spacing for readability)
 */
export function formatVIN(vin: string): string {
  if (vin.length !== 17) return vin;
  return `${vin.slice(0, 3)} ${vin.slice(3, 9)} ${vin.slice(9)}`;
}

/**
 * Format lot number with leading zeros
 */
export function formatLotNumber(lotNumber: string | number): string {
  const num = typeof lotNumber === "string" ? lotNumber : String(lotNumber);
  return `VB-${num.padStart(6, "0")}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Check if user can bid based on membership tier
 */
export function canBid(
  membershipTier: "guest" | "basic" | "premier" | "business",
  dailyBidsUsed: number
): boolean {
  const limits = {
    guest: 0,
    basic: 3,
    premier: 10,
    business: Infinity,
  };

  return dailyBidsUsed < limits[membershipTier];
}

/**
 * Get membership tier color
 */
export function getMembershipColor(
  tier: "guest" | "basic" | "premier" | "business"
): string {
  const colors = {
    guest: "bg-muted text-muted-foreground",
    basic: "bg-electric-blue text-white",
    premier: "bg-volt-green text-white",
    business: "bg-warning-amber text-carbon-black",
  };

  return colors[tier];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate Nigerian phone number
 */
export function isValidNigerianPhone(phone: string): boolean {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Check if it matches Nigerian phone patterns
  // Should be 11 digits starting with 0, or 13 digits starting with 234
  return (
    (cleaned.length === 11 && cleaned.startsWith("0")) ||
    (cleaned.length === 13 && cleaned.startsWith("234"))
  );
}

/**
 * Format Nigerian phone number
 */
export function formatNigerianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    // 0 803 456 7890
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }

  if (cleaned.length === 13 && cleaned.startsWith("234")) {
    // +234 803 456 7890
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return phone;
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
