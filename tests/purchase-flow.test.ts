import { describe, expect, test } from "bun:test";

import {
  calculateBidReserveAmount,
  isAuctionLotHoldingVehicleForPurchase,
  isPreAuctionBuyNowAvailable,
} from "../convex/lib/purchaseFlow";

describe("purchase flow helpers", () => {
  test("treats only pending and active lots as holding a vehicle", () => {
    expect(isAuctionLotHoldingVehicleForPurchase("pending")).toBe(true);
    expect(isAuctionLotHoldingVehicleForPurchase("active")).toBe(true);

    expect(isAuctionLotHoldingVehicleForPurchase("sold")).toBe(false);
    expect(isAuctionLotHoldingVehicleForPurchase("no_sale")).toBe(false);
    expect(isAuctionLotHoldingVehicleForPurchase("passed")).toBe(false);
  });

  test("allows auction buy now only before a scheduled auction starts", () => {
    expect(isPreAuctionBuyNowAvailable("pending", "scheduled")).toBe(true);

    expect(isPreAuctionBuyNowAvailable("active", "live")).toBe(false);
    expect(isPreAuctionBuyNowAvailable("pending", "live")).toBe(false);
    expect(isPreAuctionBuyNowAvailable("sold", "scheduled")).toBe(false);
  });

  test("calculates the same 10 percent reserve used when bids are placed", () => {
    expect(calculateBidReserveAmount(1_000_000)).toBe(100_000);
    expect(calculateBidReserveAmount(1_000_001)).toBe(100_001);
  });
});
