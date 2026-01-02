import { Id } from "@/convex/_generated/dataModel";

/**
 * Type definitions for API responses
 * These types match the structure returned by Convex queries
 */

export interface UserBid {
  _id: string;
  bid: {
    _id: Id<"bids">;
    amount: number;
    status: "active" | "winning" | "outbid" | "won" | "cancelled";
    bidType: "live" | "max_bid" | "proxy";
    createdAt: number;
  };
  lot: {
    _id: Id<"auctionLots">;
    status: string;
    currentBid: number;
    endsAt?: number;
    isUserHighBidder: boolean;
    lotOrder?: number;
    winningBid?: number;
    bidCount?: number;
  };
  vehicle: {
    _id: Id<"vehicles">;
    make: string;
    model: string;
    year: number;
    lotNumber: string;
    image?: string;
    startingBid?: number;
  };
}

export interface WatchlistItem {
  _id: Id<"watchlist">;
  addedAt: number;
  vehicle: {
    _id: Id<"vehicles">;
    year: number;
    make: string;
    model: string;
    condition: string;
    batteryHealthPercent?: number;
    startingBid?: number;
    image?: string;
    auctionLot?: {
      _id: Id<"auctionLots">;
      currentBid: number;
      bidCount: number;
      endsAt?: number;
    } | null;
  };
}

export interface UserOrder {
  _id: Id<"orders">;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: number;
  vehicleId: Id<"vehicles">;
}

export interface BidHistoryItem {
  _id: Id<"bids">;
  userId: Id<"users">;
  bidAmount: number;
  createdAt: number;
  bidType: "live" | "max_bid" | "proxy";
  status: "active" | "winning" | "outbid" | "won" | "cancelled";
}

