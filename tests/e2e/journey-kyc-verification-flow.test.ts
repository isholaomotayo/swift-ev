import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("E2E Journey: KYC Document Verification, Admin Approval & Gated Bidding Flow", () => {
  test("unfunded / suspended user is blocked from bidding -> submits KYC -> admin approves -> funds wallet -> bidding enabled", async () => {
    const t = createTestHarness();

    // 1. Seed Actors
    const buyer = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      kycStatus: "not_started",
      walletBalance: 0, // ₦0
      buyingPower: 0,
    });

    const seller = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_individual",
      kycStatus: "approved",
    });

    const admin = await seedTestUser(t, { role: "admin" });

    // 2. Seed Approved Vehicle & Live Auction
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      make: "Mercedes-Benz",
      model: "EQE 350+",
      year: 2024,
      startingBid: 30_000_000,
      reservePrice: 35_000_000,
      buyNowPrice: 40_000_000,
      status: "approved",
    });

    const now = Date.now();
    const auctionRes = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Luxury EV Showcase",
      auctionType: "live",
      scheduledStart: now + 60_000,
      bidIncrement: 500_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          lotDuration: 120_000,
          startingBid: 30_000_000,
          reservePrice: 35_000_000,
          buyItNowPrice: 40_000_000,
          bidIncrement: 500_000,
        },
      ],
    });

    const auctionId = auctionRes.auctionId;
    const lotId = auctionRes.lotIds[0];

    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId,
    });

    // 3. Buyer checks bidding power for ₦30.5M bid -> Blocked by 10% reserve requirement
    const preCheck = await t.query(api.kyc.canUserBid, {
      token: buyer.token,
      bidAmount: 30_500_000,
    });

    expect(preCheck.canBid).toBe(false);
    expect(preCheck.reason).toBe("insufficient_balance");

    // 4. User Submits KYC Status -> Transitions to Pending
    await t.mutation(api.users.updateKYCStatus, {
      token: admin.token,
      userId: buyer.userId,
      kycStatus: "pending",
      notes: "Uploaded Nigerian International Passport and utility bill",
    });

    const pendingUser = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(pendingUser?.kycStatus).toBe("pending");

    // 5. Admin Approves KYC in Dashboard
    const approveKycRes = await t.mutation(api.users.updateKYCStatus, {
      token: admin.token,
      userId: buyer.userId,
      kycStatus: "approved",
    });

    expect(approveKycRes.success).toBe(true);

    const verifiedUser = await t.run(async (ctx) => ctx.db.get(buyer.userId));
    expect(verifiedUser?.kycStatus).toBe("approved");

    // 6. User Funds Wallet with required reserve (₦5,000,000 in kobo)
    const fundResult = await t.mutation(api.wallet.initiateWalletFunding, {
      token: buyer.token,
      amount: 5_000_000_00,
    });

    const reference = fundResult.txRef;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (String(url).includes("api.flutterwave.com")) {
        return new Response(
          JSON.stringify({
            status: "success",
            message: "Transaction fetched",
            data: {
              id: 998877,
              tx_ref: reference,
              flw_ref: "FLW_KYC_TEST",
              amount: 5_000_000,
              charged_amount: 5_000_000,
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
      await t.mutation(api.wallet.confirmWalletFunding, {
        token: buyer.token,
        txRef: reference,
        transactionId: "998877",
      });

      // 7. canUserBid is now TRUE
      const postCheck = await t.query(api.kyc.canUserBid, {
        token: buyer.token,
        bidAmount: 30_500_000,
      });
      expect(postCheck.canBid).toBe(true);

      // 8. User Places Successful Live Bid
      const bidSuccess = await t.mutation(api.bids.placeBid, {
        token: buyer.token,
        lotId,
        amount: 30_500_000,
      });

      expect(bidSuccess.success).toBe(true);
      expect(bidSuccess.newCurrentBid).toBe(30_500_000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
