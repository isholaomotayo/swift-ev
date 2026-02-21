"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Hardcoded defaults — same values as lib/utils.ts, used when Convex hasn't responded yet. */
const DEFAULTS = {
  usdToNgn: 1650,
  cnyToNgn: 230,
  gbpToNgn: 2100,
};

export interface ExchangeRates {
  usdToNgn: number;
  cnyToNgn: number;
  gbpToNgn: number;
}

/**
 * Returns live exchange rates from the Convex backend.
 * Falls back to hardcoded defaults while loading or if a rate is missing.
 *
 * Shape matches the `exchangeRates` option of `formatCurrency()` in lib/utils.ts.
 */
export function useExchangeRates(): ExchangeRates {
  const data = useQuery(api.exchangeRates.getCurrentRates);

  return {
    usdToNgn: data?.usdToNgn ?? DEFAULTS.usdToNgn,
    cnyToNgn: data?.cnyToNgn ?? DEFAULTS.cnyToNgn,
    gbpToNgn: data?.gbpToNgn ?? DEFAULTS.gbpToNgn,
  };
}
