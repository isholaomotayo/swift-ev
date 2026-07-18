import { describe, expect, test } from "bun:test";

import {
  calculateBidReserveAmountKobo,
  isAuctionLotHoldingVehicleForPurchase,
  isPreAuctionBuyNowAvailable,
  resolveBuyNowPrice,
  isVehicleBuyNowPurchasable,
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

  test("resolves buy now price with reserve and starting bid fallbacks", () => {
    expect(resolveBuyNowPrice({ buyItNowPrice: 9_000_000 })).toBe(9_000_000);
    expect(resolveBuyNowPrice({ reservePrice: 8_000_000, startingBid: 5_000_000 })).toBe(
      8_000_000
    );
    expect(resolveBuyNowPrice({ startingBid: 5_000_000 })).toBe(5_000_000);
    expect(resolveBuyNowPrice({})).toBeUndefined();
  });

  test("marks approved vehicles without a holding lot as buy-now purchasable", () => {
    expect(
      isVehicleBuyNowPurchasable({
        vehicleStatus: "approved",
        startingBid: 5_000_000,
        hasHoldingLot: false,
      })
    ).toBe(true);

    expect(
      isVehicleBuyNowPurchasable({
        vehicleStatus: "approved",
        startingBid: 5_000_000,
        hasHoldingLot: true,
      })
    ).toBe(false);
  });

  test("soft-hold payment_pending is not buy-now purchasable", () => {
    expect(
      isVehicleBuyNowPurchasable({
        vehicleStatus: "payment_pending",
        buyItNowPrice: 9_000_000,
        hasHoldingLot: false,
      })
    ).toBe(false);
  });
});
