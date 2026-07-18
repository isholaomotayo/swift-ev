import { describe, expect, test } from "bun:test";

import {
  calculateBuyNowPricing,
  calculateServiceFee,
  CUSTOMS_CLEARING_FEE_NAIRA,
  DOCUMENTATION_FEE_NAIRA,
  INSPECTION_FEE_NAIRA,
  REGISTRATION_FEE_NAIRA,
  SHIPPING_BY_DESTINATION,
} from "../lib/buy-now-pricing";
import { calculateBuyNowPricing as calculateBuyNowPricingConvex } from "../convex/lib/buyNowPricing";

describe("buy now pricing", () => {
  test("sums all-in fees for Lagos destination", () => {
    const vehiclePrice = 10_000_000;
    const pricing = calculateBuyNowPricing(vehiclePrice, "lagos");

    expect(pricing.serviceFee).toBe(calculateServiceFee(vehiclePrice));
    expect(pricing.documentationFee).toBe(DOCUMENTATION_FEE_NAIRA);
    expect(pricing.inspectionFee).toBe(INSPECTION_FEE_NAIRA);
    expect(pricing.shippingCost).toBe(SHIPPING_BY_DESTINATION.lagos);
    expect(pricing.customsClearingFee).toBe(CUSTOMS_CLEARING_FEE_NAIRA);
    expect(pricing.registrationFee).toBe(REGISTRATION_FEE_NAIRA);
    expect(pricing.totalAmount).toBe(
      vehiclePrice +
        pricing.serviceFee +
        DOCUMENTATION_FEE_NAIRA +
        INSPECTION_FEE_NAIRA +
        SHIPPING_BY_DESTINATION.lagos +
        CUSTOMS_CLEARING_FEE_NAIRA +
        REGISTRATION_FEE_NAIRA
    );
  });

  test("uses higher shipping for Port Harcourt", () => {
    const lagos = calculateBuyNowPricing(5_000_000, "lagos");
    const ph = calculateBuyNowPricing(5_000_000, "port_harcourt");
    expect(ph.shippingCost).toBe(SHIPPING_BY_DESTINATION.port_harcourt);
    expect(ph.totalAmount - lagos.totalAmount).toBe(
      SHIPPING_BY_DESTINATION.port_harcourt - SHIPPING_BY_DESTINATION.lagos
    );
  });

  test("client and convex helpers stay in sync", () => {
    const a = calculateBuyNowPricing(7_500_000, "lagos");
    const b = calculateBuyNowPricingConvex(7_500_000, "lagos");
    expect(a).toEqual(b);
  });

  test("tiered service fee matches order creation bands", () => {
    expect(calculateServiceFee(500_000)).toBe(75_000);
    expect(calculateServiceFee(2_000_000)).toBe(2_000_000 * 0.07);
    expect(calculateServiceFee(10_000_000)).toBe(10_000_000 * 0.06);
    expect(calculateServiceFee(20_000_000)).toBe(20_000_000 * 0.05);
  });
});
