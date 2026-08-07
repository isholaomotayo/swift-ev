"use client";

import { useCurrencyStore } from "@/store/currency";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { formatCurrency } from "@/lib/utils";

/**
 * Custom hook that returns a currency formatter bound to the user's
 * active selected currency from `useCurrencyStore` and latest exchange rates.
 *
 * @example
 * const formatPrice = useFormatPrice();
 * return <span>{formatPrice(amountInNgn)}</span>;
 */
export function useFormatPrice() {
  const currency = useCurrencyStore((s) => s.currency);
  const exchangeRates = useExchangeRates();

  return (amount: number, overrideCurrency?: string) =>
    formatCurrency(amount, {
      currency: overrideCurrency ?? currency,
      exchangeRates,
    });
}
