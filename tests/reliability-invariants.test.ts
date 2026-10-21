import { describe, test, expect } from "bun:test";
import {
  calculateBuyNowPricing,
  calculateCustomsFee,
  calculateServiceFee,
  toWholeNaira,
} from "../lib/buy-now-pricing";
import { calculateServiceFee as legacyServiceFee } from "../lib/utils";
import { calculateServiceFee as backendServiceFee } from "../convex/lib/orders";
import { formatLotNumber, formatStatusLabel } from "../lib/utils";

describe("Money invariants", () => {
  const prices = [
    500_000,
    1_000_000,
    1_234_567,
    4_999_999,
    5_000_001,
    7_777_777,
    14_999_999,
    15_000_001,
    26_500_001,
  ];

  test("every Buy Now charge is a whole naira amount", () => {
    for (const price of prices) {
      for (const destination of ["lagos", "port_harcourt"] as const) {
        const pricing = calculateBuyNowPricing(price, destination);
        for (const [key, value] of Object.entries(pricing)) {
          if (typeof value !== "number") continue;
          if (!Number.isInteger(value)) {
            throw new Error(`${key} must be whole naira for ${price}`);
          }
        }
        expect(pricing.totalAmount).toBe(
          pricing.vehiclePrice +
            pricing.serviceFee +
            pricing.documentationFee +
            pricing.inspectionFee +
            pricing.shippingCost +
            pricing.customsClearingFee +
            pricing.registrationFee
        );
      }
    }
  });

  test("fractional input prices are normalized before charging", () => {
    const pricing = calculateBuyNowPricing(10_000_000.4, "lagos");
    expect(pricing.vehiclePrice).toBe(10_000_000);
    expect(Number.isInteger(pricing.totalAmount)).toBe(true);
  });

  test("service fee tiers round percentage charges", () => {
    expect(calculateServiceFee(999_999)).toBe(75_000);
    expect(calculateServiceFee(1_000_000)).toBe(75_000);
    expect(calculateServiceFee(1_000_001)).toBe(70_000);
    expect(calculateServiceFee(2_000_003)).toBe(140_000);
    expect(calculateServiceFee(5_000_001)).toBe(300_000);
    expect(calculateServiceFee(15_000_001)).toBe(750_000);
    expect(Number.isInteger(calculateServiceFee(3_333_333))).toBe(true);
  });

  test("customs fee rounds to whole naira", () => {
    for (const price of prices) {
      expect(Number.isInteger(calculateCustomsFee(price))).toBe(true);
    }
  });

  test("all service fee copies agree with the shared pricing module", () => {
    for (const price of prices) {
      expect(legacyServiceFee(price)).toBe(calculateServiceFee(price));
      expect(backendServiceFee(price)).toBe(calculateServiceFee(price));
    }
  });

  test("toWholeNaira rounds to the nearest naira", () => {
    expect(toWholeNaira(1.4)).toBe(1);
    expect(toWholeNaira(1.5)).toBe(2);
    expect(toWholeNaira(-1.5)).toBe(-1);
  });
});

describe("Display identifiers", () => {
  test("formatLotNumber preserves stored lot numbers", () => {
    expect(formatLotNumber("VB-20261012-X0BLJ")).toBe("VB-20261012-X0BLJ");
    expect(formatLotNumber("AE-20261012-ABCDE")).toBe("AE-20261012-ABCDE");
  });

  test("formatLotNumber prefixes bare sequence numbers once", () => {
    expect(formatLotNumber("000001")).toBe("VB-000001");
    expect(formatLotNumber(42)).toBe("VB-000042");
  });

  test("formatLotNumber is idempotent", () => {
    for (const value of ["000001", 42, "VB-123", "AE-999"]) {
      const once = formatLotNumber(value);
      expect(formatLotNumber(once)).toBe(once);
    }
  });

  test("formatStatusLabel humanizes every underscore", () => {
    expect(formatStatusLabel("pending_payment")).toBe("Pending Payment");
    expect(formatStatusLabel("buy_it_now")).toBe("Buy It Now");
    expect(formatStatusLabel("in_transit")).toBe("In Transit");
    expect(formatStatusLabel("")).toBe("");
  });
});
