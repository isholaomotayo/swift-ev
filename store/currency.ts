import { create } from "zustand";
import { persist } from "zustand/middleware";

const SUPPORTED_CURRENCIES = ["NGN", "USD", "CNY", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

interface CurrencyStore {
  currency: SupportedCurrency;
  setCurrency: (currency: SupportedCurrency) => void;
}

/**
 * Persisted Zustand store for the user's preferred display currency.
 *
 * - Defaults to "NGN" (the platform's base currency).
 * - Persisted to localStorage as "ae-currency" so the selection survives page
 *   refreshes before the user object has loaded.
 * - When the user profile contains a `preferredCurrency`, AuthProvider should
 *   call `useCurrencyStore.getState().setCurrency(user.preferredCurrency)` after
 *   successful login to sync the store with the server-side preference.
 */
export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: "NGN",
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "ae-currency" }
  )
);
