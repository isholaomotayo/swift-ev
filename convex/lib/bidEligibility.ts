import type { Doc } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

/** Daily bid allowance per membership tier. */
export const DAILY_BID_LIMITS = {
  guest: 0,
  basic: 3,
  premier: 10,
  business: Infinity,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Individual (non-business) accounts cannot bid on salvage / export-only / rebuilt vehicles. */
export function assertVehicleBiddable(
  user: Pick<Doc<"users">, "membershipTier">,
  vehicle: Pick<Doc<"vehicles">, "condition" | "titleType">
): void {
  const isIndividual = user.membershipTier !== "business";
  const isDamaged =
    vehicle.condition === "salvage" ||
    vehicle.titleType === "salvage" ||
    vehicle.titleType === "export_only" ||
    vehicle.titleType === "rebuilt";

  if (isIndividual && isDamaged) {
    throw new ConvexError(
      "Restricted: Individual accounts cannot bid on salvage/export-only vehicles. Please upgrade to a Business account."
    );
  }
}

/** Bids used in the current 24h window (the counter resets once the window has passed). */
export function currentDailyBids(
  user: Pick<Doc<"users">, "lastBidResetAt" | "dailyBidsUsed">,
  now: number
): number {
  return user.lastBidResetAt < now - DAY_MS ? 0 : user.dailyBidsUsed;
}

export function assertWithinDailyBidLimit(
  user: Pick<Doc<"users">, "membershipTier" | "lastBidResetAt" | "dailyBidsUsed">,
  now: number
): void {
  if (currentDailyBids(user, now) >= DAILY_BID_LIMITS[user.membershipTier]) {
    throw new ConvexError("You've reached your daily bid limit. Upgrade your membership for more bids.");
  }
}
