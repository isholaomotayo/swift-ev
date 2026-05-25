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
