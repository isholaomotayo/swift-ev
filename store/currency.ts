import { create } from "zustand";
import { persist } from "zustand/middleware";

const SUPPORTED_CURRENCIES = ["NGN", "USD", "CNY", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function normalizeCurrency(value: string | undefined | null): SupportedCurrency {
  const upper = (value ?? "NGN").toUpperCase();
  if (SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)) {
    return upper as SupportedCurrency;
  }
  return "NGN";
}

interface CurrencyStore {
  /** Saved preference from profile/settings (server-side source of truth). */
  settingsCurrency: SupportedCurrency;
  /** Temporary on-page override from the header selector; null uses settings. */
  sessionOverride: SupportedCurrency | null;
  setSettingsCurrency: (currency: SupportedCurrency) => void;
  setSessionOverride: (currency: SupportedCurrency) => void;
  clearSessionOverride: () => void;
}

/**
 * Persisted Zustand store for display currency.
 *
 * Priority (highest → lowest):
 *  1. Explicit per-component `currency` prop / `overrideCurrency` arg
 *  2. `sessionOverride` — set by the header CurrencySelector (on-page override)
 *  3. `settingsCurrency` — synced from `users.preferredCurrency` via AuthProvider
 *     or updated when the user saves currency in Settings
 */
export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      settingsCurrency: "NGN",
      sessionOverride: null,
      setSettingsCurrency: (currency) => set({ settingsCurrency: currency }),
      setSessionOverride: (currency) => set({ sessionOverride: currency }),
      clearSessionOverride: () => set({ sessionOverride: null }),
    }),
    {
      name: "ae-currency",
      version: 1,
      partialize: (state) => ({ sessionOverride: state.sessionOverride }),
      migrate: (persistedState) => {
        const legacy = persistedState as { currency?: string; sessionOverride?: SupportedCurrency | null };
        if (legacy?.currency && !legacy.sessionOverride) {
          return {
            settingsCurrency: "NGN" as SupportedCurrency,
            sessionOverride: normalizeCurrency(legacy.currency),
          };
        }
        return persistedState as CurrencyStore;
      },
    }
  )
);

/** Effective display currency: session override wins over saved settings. */
export const selectEffectiveCurrency = (state: CurrencyStore): SupportedCurrency =>
  state.sessionOverride ?? state.settingsCurrency;

export function useEffectiveCurrency(): SupportedCurrency {
  return useCurrencyStore(selectEffectiveCurrency);
}
