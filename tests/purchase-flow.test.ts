import { describe, expect, test } from "bun:test";

import {
  calculateBidReserveAmountKobo,
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

  test("calculates the 10 percent bid reserve in kobo from a naira bid", () => {
    expect(calculateBidReserveAmountKobo(1_000_000)).toBe(10_000_000);
    expect(calculateBidReserveAmountKobo(1_000_001)).toBe(10_000_010);
  });
});
