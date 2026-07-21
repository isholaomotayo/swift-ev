export const HOLDING_AUCTION_LOT_STATUSES = ["pending", "active"] as const;

export type HoldingAuctionLotStatus = (typeof HOLDING_AUCTION_LOT_STATUSES)[number];
export type AuctionLotStatus = HoldingAuctionLotStatus | "sold" | "no_sale" | "passed";
export type AuctionStatus = "scheduled" | "live" | "paused" | "ended" | "cancelled";

export function isAuctionLotHoldingVehicleForPurchase(
  status: AuctionLotStatus
): status is HoldingAuctionLotStatus {
  return (HOLDING_AUCTION_LOT_STATUSES as readonly string[]).includes(status);
}

export function isPreAuctionBuyNowAvailable(
  lotStatus: AuctionLotStatus,
  auctionStatus: AuctionStatus
): boolean {
  return lotStatus === "pending" && auctionStatus === "scheduled";
}

export function calculateBidReserveAmountKobo(bidAmountNaira: number): number {
  return Math.ceil(bidAmountNaira * 10);
}

/** Max bid (Naira) supported by available wallet balance (kobo). */
export function buyingPowerFromWalletKobo(walletBalanceKobo: number): number {
  return walletBalanceKobo / 10;
}

/** Convert kobo reserve amount to Naira for order paidAmount. */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

/** Payment deadline: 72 hours from order creation. */
export const PAYMENT_DEADLINE_MS = 72 * 60 * 60 * 1000;

/**
 * Resolve Buy Now price for a vehicle/lot.
 * Falls back to reserve then starting bid so every listing remains instantly purchasable.
 */
export function resolveBuyNowPrice(pricing: {
  buyItNowPrice?: number | null;
  reservePrice?: number | null;
  startingBid?: number | null;
}): number | undefined {
  const candidates = [
    pricing.buyItNowPrice,
    pricing.reservePrice,
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

export function isVehicleBuyNowPurchasable(args: {
  vehicleStatus: string;
  buyItNowPrice?: number | null;
  reservePrice?: number | null;
  startingBid?: number | null;
  hasHoldingLot?: boolean;
}): boolean {
  if (args.hasHoldingLot) return false;
  if (args.vehicleStatus !== "approved" && args.vehicleStatus !== "unsold") {
    return false;
  }
  return resolveBuyNowPrice(args) !== undefined;
}

