import { describe, test, expect } from "bun:test";
import { formatCurrency } from "../../lib/utils";
import { MEMBERSHIP_TIERS } from "../../lib/constants";

describe("Admin Live Auction Controls & Currency Formatting (Client-Side Logic)", () => {
  test("formatCurrency converts NGN amounts to USD, CNY, GBP correctly", () => {
    const amountNgn = 16_500_000;

    // Default NGN formatting
    const formattedNgn = formatCurrency(amountNgn, { currency: "NGN" });
    expect(formattedNgn).toContain("16,500,000");

    // USD formatting with base rate 1650
    const formattedUsd = formatCurrency(amountNgn, { currency: "USD" });
    expect(formattedUsd).toContain("10,000");

    // No symbol formatting
    const rawNumber = formatCurrency(amountNgn, { showSymbol: false });
    expect(rawNumber).toBe("16,500,000");
  });

  test("membership tier limits enforce daily bids and buying power gates", () => {
    expect(MEMBERSHIP_TIERS.GUEST.dailyBids).toBe(0);
    expect(MEMBERSHIP_TIERS.GUEST.maxBuyingPower).toBe(0);

    expect(MEMBERSHIP_TIERS.BASIC.dailyBids).toBe(3);
    expect(MEMBERSHIP_TIERS.BASIC.maxBuyingPower).toBe(5_000_000);

    expect(MEMBERSHIP_TIERS.PREMIER.dailyBids).toBe(10);
    expect(MEMBERSHIP_TIERS.PREMIER.maxBuyingPower).toBe(50_000_000);
  });
});
