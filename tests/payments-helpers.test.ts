import { describe, expect, test } from "bun:test";

import {
  isValidPlatformBankDetails,
  normalizePlatformBankDetails,
  buyingPowerFromWalletBalance,
  paymentDeadlineFrom,
} from "../convex/lib/payments";
import { PAYMENT_DEADLINE_MS } from "../convex/lib/purchaseFlow";

describe("platform bank validation", () => {
  test("rejects missing or placeholder escrow accounts", () => {
    expect(isValidPlatformBankDetails(null)).toBe(false);
    expect(
      isValidPlatformBankDetails({
        bankName: "Access Bank",
        accountName: "autoexports.live Escrow",
        accountNumber: "0000000000",
        currency: "NGN",
      })
    ).toBe(false);
    expect(
      isValidPlatformBankDetails({
        bankName: "A",
        accountName: "Escrow",
        accountNumber: "0123456789",
        currency: "NGN",
      })
    ).toBe(false);
  });

  test("accepts a valid 10-digit Nigerian account", () => {
    const bank = normalizePlatformBankDetails({
      bankName: "  Access Bank ",
      accountName: " autoexports.live Escrow ",
      accountNumber: "0123 456789",
      bankCode: "044",
      currency: "NGN",
    });
    expect(bank).toEqual({
      bankName: "Access Bank",
      accountName: "autoexports.live Escrow",
      accountNumber: "0123456789",
      bankCode: "044",
      currency: "NGN",
    });
  });
});

describe("payment helpers", () => {
  test("derives buying power from wallet kobo", () => {
    expect(buyingPowerFromWalletBalance(1_000_000)).toBe(100_000);
  });

  test("uses a 72-hour payment deadline", () => {
    const now = 1_700_000_000_000;
    expect(PAYMENT_DEADLINE_MS).toBe(72 * 60 * 60 * 1000);
    expect(paymentDeadlineFrom(now)).toBe(now + PAYMENT_DEADLINE_MS);
  });
});
