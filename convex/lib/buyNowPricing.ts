/**
 * Server-side re-export of Buy Now pricing (Convex cannot import from @/lib).
 * Keep in sync with lib/buy-now-pricing.ts
 */

export type DestinationPort = "lagos" | "port_harcourt";

export const DOCUMENTATION_FEE_NAIRA = 50_000;
export const INSPECTION_FEE_NAIRA = 50_000;
export const REGISTRATION_FEE_NAIRA = 150_000;

const USD_TO_NGN = 1650;

export const SHIPPING_BY_DESTINATION: Record<DestinationPort, number> = {
  lagos: 2500 * USD_TO_NGN,
  port_harcourt: 2500 * USD_TO_NGN,
};

export function calculateCustomsFee(vehiclePriceNaira: number): number {
  const randomFactor = (vehiclePriceNaira % 997) / 997;
  const feeUsd = 4000 + randomFactor * 200;
  return feeUsd * USD_TO_NGN;
}

export function calculateServiceFee(vehiclePriceNaira: number): number {
  if (vehiclePriceNaira <= 1_000_000) {
    return 75_000;
  }
  if (vehiclePriceNaira <= 5_000_000) {
    return vehiclePriceNaira * 0.07;
  }
  if (vehiclePriceNaira <= 15_000_000) {
    return vehiclePriceNaira * 0.06;
  }
  return vehiclePriceNaira * 0.05;
}

export type BuyNowPricingBreakdown = {
  vehiclePrice: number;
  serviceFee: number;
  documentationFee: number;
  inspectionFee: number;
  shippingCost: number;
  customsClearingFee: number;
  registrationFee: number;
  destination: DestinationPort;
  totalAmount: number;
};

export function calculateBuyNowPricing(
  vehiclePriceNaira: number,
  destination: DestinationPort = "lagos"
): BuyNowPricingBreakdown {
  const serviceFee = calculateServiceFee(vehiclePriceNaira);
  const shippingCost = SHIPPING_BY_DESTINATION[destination];
  const documentationFee = DOCUMENTATION_FEE_NAIRA;
  const inspectionFee = INSPECTION_FEE_NAIRA;
  const customsClearingFee = calculateCustomsFee(vehiclePriceNaira);
  const registrationFee = REGISTRATION_FEE_NAIRA;

  const totalAmount =
    vehiclePriceNaira +
    serviceFee +
    documentationFee +
    inspectionFee +
    shippingCost +
    customsClearingFee +
    registrationFee;

  return {
    vehiclePrice: vehiclePriceNaira,
    serviceFee,
    documentationFee,
    inspectionFee,
    shippingCost,
    customsClearingFee,
    registrationFee,
    destination,
    totalAmount,
  };
}
