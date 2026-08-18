import { describe, expect, test, beforeEach } from "bun:test";
import {
  normalizeCurrency,
  selectEffectiveCurrency,
  useCurrencyStore,
} from "@/store/currency";

describe("currency store", () => {
  beforeEach(() => {
    useCurrencyStore.setState({
      settingsCurrency: "NGN",
      sessionOverride: null,
    });
  });

  test("normalizeCurrency accepts supported codes and falls back to NGN", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("GBP")).toBe("GBP");
    expect(normalizeCurrency("EUR")).toBe("NGN");
    expect(normalizeCurrency(undefined)).toBe("NGN");
  });

  test("selectEffectiveCurrency prefers session override over settings", () => {
    useCurrencyStore.setState({
      settingsCurrency: "USD",
      sessionOverride: "GBP",
    });

    expect(selectEffectiveCurrency(useCurrencyStore.getState())).toBe("GBP");
  });

  test("selectEffectiveCurrency uses settings when no session override", () => {
    useCurrencyStore.setState({
      settingsCurrency: "CNY",
      sessionOverride: null,
    });

    expect(selectEffectiveCurrency(useCurrencyStore.getState())).toBe("CNY");
  });

  test("setSettingsCurrency and clearSessionOverride reset display to saved preference", () => {
    const { setSettingsCurrency, setSessionOverride, clearSessionOverride } =
      useCurrencyStore.getState();

    setSettingsCurrency("USD");
    setSessionOverride("GBP");
    expect(selectEffectiveCurrency(useCurrencyStore.getState())).toBe("GBP");

    clearSessionOverride();
    expect(selectEffectiveCurrency(useCurrencyStore.getState())).toBe("USD");
  });
});
