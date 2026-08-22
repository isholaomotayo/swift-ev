import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("E2E Journey: Buyer Dispute Filing, Evidence Submission & Admin Arbitration", () => {
  test("complete dispute lifecycle: order delivery -> dispute filing -> admin evidence review -> resolution refund", async () => {
    const t = createTestHarness();

    // 1. Seed Actors
    const seller = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_individual",
    });

    const buyer = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      walletBalance: 60_000_000_00, // ₦60M in kobo
      buyingPower: 60_000_000,
    });

    const admin = await seedTestUser(t, { role: "admin" });

    // 2. Direct Purchase & Full Settlement
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      make: "Polestar",
      model: "2 Long Range Dual Motor",
      year: 2024,
      startingBid: 28_000_000,
      reservePrice: 32_000_000,
      buyNowPrice: 35_000_000,
      status: "approved",
    });

    const buyRes = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    const orderId = buyRes.orderId;

    await t.mutation(api.payments.payOrderFromWallet, {
      token: buyer.token,
      orderId,
    });

    // 3. Buyer Discovers Damage Upon Pickup & Files Dispute
    const disputeId = await t.mutation(api.disputes.createDispute, {
      token: buyer.token,
      orderId,
      disputeType: "damage_in_transit",
      description: "Front left quarter panel dented during offloading at terminal",
      evidenceUrls: [
        "https://example.com/photos/dent_left_front.jpg",
        "https://example.com/photos/inspection_doc.pdf",
      ],
    });

    expect(typeof disputeId).toBe("string");

    // 4. Buyer Adds Supplemental Repair Estimate Evidence
    await t.mutation(api.disputes.addEvidence, {
      token: buyer.token,
      disputeId,
      evidenceUrl: "https://example.com/quotes/panel_beating_quote.pdf",
    });

    // 5. Admin Inspects Dispute
    const disputeDetails = await t.query(api.disputes.getDisputeById, {
      token: admin.token,
      disputeId,
    });

    expect(disputeDetails).not.toBeNull();
    expect(disputeDetails?.status).toBe("open");
    expect(disputeDetails?.disputeType).toBe("damage_in_transit");
    expect(disputeDetails?.evidenceUrls?.length).toBeGreaterThanOrEqual(3);

    // 6. Admin Resolves Dispute with Repair Credit
    await t.mutation(api.disputes.resolveDispute, {
      token: admin.token,
      disputeId,
      resolution: "repair_credit",
      refundAmount: 2_200_000,
      resolutionNotes: "Repair estimate verified and approved. Credited ₦2.2M repair cost.",
    });

    // 7. Verify Resolved Dispute State
    const resolvedDispute = await t.query(api.disputes.getDisputeById, {
      token: buyer.token,
      disputeId,
    });

    expect(resolvedDispute?.status).toBe("resolved");
    expect(resolvedDispute?.resolution).toBe("repair_credit");
    expect(resolvedDispute?.refundAmount).toBe(2_200_000);
  });
});
