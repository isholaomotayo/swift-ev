import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle } from "../helpers/convex-test-harness";

describe("Backend Wallet, Double-Entry Ledger & Dispute Refunds (In-Memory Hermetic)", () => {
  test("wallet funding lifecycle -> initiate, confirm webhook, buying power derivation, withdrawal", async () => {
    const t = createTestHarness();

    // 1. Seed user with 0 balance
    const buyer = await seedTestUser(t, {
      role: "buyer",
      walletBalance: 0,
      buyingPower: 0,
    });
    const admin = await seedTestUser(t, { role: "admin" });

    // Initial query
    const initialBalance = await t.query(api.wallet.getWalletBalance, {
      token: buyer.token,
    });
    expect(initialBalance?.available).toBe(0);
    expect(initialBalance?.biddingPower).toBe(0);

    // 2. Initiate wallet deposit of ₦50,000 (5,000,000 kobo)
    const depositAmountKobo = 5_000_000; // ₦50,000 in kobo
    const fundResult = await t.mutation(api.wallet.initiateWalletFunding, {
      token: buyer.token,
      amount: depositAmountKobo,
    });

    expect(fundResult).toHaveProperty("txRef");
    expect(fundResult.amount).toBe(depositAmountKobo);

    const reference = fundResult.txRef;

    // 3. Mock external Flutterwave API verification response for hermetic testing
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (String(url).includes("api.flutterwave.com")) {
        return new Response(
          JSON.stringify({
            status: "success",
            message: "Transaction fetched",
            data: {
              id: 987654321,
              tx_ref: reference,
              flw_ref: "FLW_MOCK_REF_123",
              amount: 50_000,
              charged_amount: 50_000,
              currency: "NGN",
              status: "successful",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url, init);
    }) as any;

    try {
      // Confirm deposit
      const confirmResult = await t.mutation(api.wallet.confirmWalletFunding, {
        token: buyer.token,
        txRef: reference,
        transactionId: "987654321",
      });

      expect(confirmResult.success).toBe(true);

      // Verify balance & derived bidding power updated
      const balanceAfterDeposit = await t.query(api.wallet.getWalletBalance, {
        token: buyer.token,
      });
      expect(balanceAfterDeposit?.available).toBe(depositAmountKobo);
      expect(balanceAfterDeposit?.biddingPower).toBe(depositAmountKobo * 10);

      // 4. Request payout / withdrawal of ₦10,000 (1,000,000 kobo)
      const withdrawResult = await t.mutation(api.wallet.initiateWithdrawal, {
        token: buyer.token,
        amount: 1_000_000, // in kobo
        bankCode: "044",
        accountNumber: "0123456789",
      });

      expect(withdrawResult.success).toBe(true);
      expect(withdrawResult).toHaveProperty("reference");

      const withdrawTx = await t.run(async (ctx) => {
        return await ctx.db
          .query("walletTransactions")
          .withIndex("by_reference", (q) => q.eq("reference", withdrawResult.reference))
          .first();
      });

      expect(withdrawTx).not.toBeNull();

      // 5. Admin approves withdrawal
      const approveResult = await t.mutation(api.wallet.approveWithdrawal, {
        token: admin.token,
        transactionId: withdrawTx!._id,
      });

      expect(approveResult.success).toBe(true);

      // Verify final ledger balance
      const finalBalance = await t.query(api.wallet.getWalletBalance, {
        token: buyer.token,
      });
      expect(finalBalance?.available).toBe(4_000_000);

      // 6. Check transaction history records
      const history = await t.query(api.wallet.getTransactionHistory, {
        token: buyer.token,
      });
      expect(history.length).toBeGreaterThanOrEqual(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("buyer files dispute on damaged order -> admin resolves with refund", async () => {
    const t = createTestHarness();

    const seller = await seedTestUser(t, { role: "seller" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 50_000_000_00 });
    const admin = await seedTestUser(t, { role: "admin" });

    const vehicleId = await seedTestVehicle(t, seller.userId, {
      buyNowPrice: 20_000_000,
      status: "approved",
    });

    // Buyer creates direct order and completes payment
    const buyResult = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    const orderId = buyResult.orderId;

    await t.mutation(api.payments.payOrderFromWallet, {
      token: buyer.token,
      orderId,
    });

    // Buyer files dispute (e.g. undisclosed battery fault)
    const disputeId = await t.mutation(api.disputes.createDispute, {
      token: buyer.token,
      orderId,
      disputeType: "not_as_described",
      description: "Battery health reported 98% but diagnostics report 72%",
      evidenceUrls: ["https://example.com/battery_diag.pdf"],
    });

    expect(typeof disputeId).toBe("string");

    // Admin arbitrates and resolves dispute with partial refund
    const resolveResult = await t.mutation(api.disputes.resolveDispute, {
      token: admin.token,
      disputeId,
      resolution: "partial_refund",
      refundAmount: 5_000_000,
      resolutionNotes: "Agreed partial battery replacement compensation",
    });

    expect(resolveResult).toBeDefined();

    const disputeDoc = await t.query(api.disputes.getDisputeById, {
      token: buyer.token,
      disputeId,
    });
    expect(disputeDoc?.status).toBe("resolved");
    expect(disputeDoc?.resolution).toBe("partial_refund");
  });
});
