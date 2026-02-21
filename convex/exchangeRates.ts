import { query } from "./_generated/server";

/**
 * Fetch the current platform exchange rates (NGN base).
 *
 * Priority (highest → lowest):
 *  1. Live rates in the `exchangeRates` table (fetched < 1 hour ago)
 *  2. Admin-managed rates in `systemSettings` (currency.usdToNgn / currency.cnyToNgn)
 *  3. Hardcoded defaults defined in lib/utils.ts (applied client-side as fallback)
 *
 * Returns { usdToNgn, cnyToNgn, gbpToNgn } — same shape that formatCurrency expects.
 */
export const getCurrentRates = query({
  args: {},
  handler: async (ctx) => {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    // Start with systemSettings values (admin-managed)
    const [usdSetting, cnySetting] = await Promise.all([
      ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "currency.usdToNgn"))
        .first(),
      ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "currency.cnyToNgn"))
        .first(),
    ]);

    const result = {
      usdToNgn: usdSetting ? parseFloat(usdSetting.value) : null,
      cnyToNgn: cnySetting ? parseFloat(cnySetting.value) : null,
      gbpToNgn: null as number | null,
    };

    // Override with live exchangeRates table entries if fresh (< 1 hour)
    const [liveUsd, liveCny, liveGbp] = await Promise.all([
      ctx.db
        .query("exchangeRates")
        .withIndex("by_currencies", (q) =>
          q.eq("fromCurrency", "USD").eq("toCurrency", "NGN")
        )
        .order("desc")
        .first(),
      ctx.db
        .query("exchangeRates")
        .withIndex("by_currencies", (q) =>
          q.eq("fromCurrency", "CNY").eq("toCurrency", "NGN")
        )
        .order("desc")
        .first(),
      ctx.db
        .query("exchangeRates")
        .withIndex("by_currencies", (q) =>
          q.eq("fromCurrency", "GBP").eq("toCurrency", "NGN")
        )
        .order("desc")
        .first(),
    ]);

    // exchangeRates.rate = how many NGN per 1 unit of fromCurrency
    if (liveUsd && now - liveUsd.fetchedAt < ONE_HOUR) {
      result.usdToNgn = liveUsd.rate;
    }
    if (liveCny && now - liveCny.fetchedAt < ONE_HOUR) {
      result.cnyToNgn = liveCny.rate;
    }
    if (liveGbp && now - liveGbp.fetchedAt < ONE_HOUR) {
      result.gbpToNgn = liveGbp.rate;
    }

    return result;
  },
});
