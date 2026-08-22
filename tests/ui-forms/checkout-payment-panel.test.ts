import { describe, test, expect } from "bun:test";
import {
  calculateBuyNowPricing,
  calculateServiceFee,
  destinationFromUiLabel,
  SHIPPING_BY_DESTINATION,
  DOCUMENTATION_FEE_NAIRA,
  INSPECTION_FEE_NAIRA,
  REGISTRATION_FEE_NAIRA,
} from "../../lib/buy-now-pricing";

describe("Checkout Payment Panel & Pricing Logic (Client-Side Logic)", () => {
  test("tiered platform service fee calculations", () => {
    // Under 1M -> Flat ₦75,000
    expect(calculateServiceFee(800_000)).toBe(75_000);
    expect(calculateServiceFee(1_000_000)).toBe(75_000);

    // 1M to 5M -> 7%
    expect(calculateServiceFee(4_000_000)).toBe(280_000);

    // 5M to 15M -> 6%
    expect(calculateServiceFee(10_000_000)).toBe(600_000);

    // Over 15M -> 5%
    expect(calculateServiceFee(20_000_000)).toBe(1_000_000);
    expect(calculateServiceFee(50_000_000)).toBe(2_500_000);
  });

  test("calculates comprehensive Buy Now all-in checkout breakdown", () => {
    const vehiclePrice = 30_000_000;
    const pricing = calculateBuyNowPricing(vehiclePrice, "lagos");

    expect(pricing.vehiclePrice).toBe(vehiclePrice);
    expect(pricing.serviceFee).toBe(1_500_000); // 5% of 30M
    expect(pricing.documentationFee).toBe(DOCUMENTATION_FEE_NAIRA);
    expect(pricing.inspectionFee).toBe(INSPECTION_FEE_NAIRA);
    expect(pricing.registrationFee).toBe(REGISTRATION_FEE_NAIRA);
    expect(pricing.shippingCost).toBe(SHIPPING_BY_DESTINATION.lagos);
    expect(pricing.customsClearingFee).toBeGreaterThan(6_000_000);

    // Mathematical sum verification
    const expectedSum =
      pricing.vehiclePrice +
      pricing.serviceFee +
      pricing.documentationFee +
      pricing.inspectionFee +
      pricing.shippingCost +
      pricing.customsClearingFee +
      pricing.registrationFee;

    expect(pricing.totalAmount).toBe(expectedSum);
  });

  test("destination label parser extracts valid port keys", () => {
    expect(destinationFromUiLabel("Lagos (Tincan/Apapa)")).toBe("lagos");
    expect(destinationFromUiLabel("Port Harcourt Port")).toBe("port_harcourt");
    expect(destinationFromUiLabel("port_harcourt")).toBe("port_harcourt");
    expect(destinationFromUiLabel("unknown_port")).toBe("lagos");
  });
});
