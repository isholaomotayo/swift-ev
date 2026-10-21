import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
} from "../helpers/convex-test-harness";
import { calculateBuyNowPricing } from "../../lib/buy-now-pricing";

describe("E2E Comprehensive Journey: All Roles, All Account Types & Full Platform Lifecycle", () => {
  test("orchestrates end-to-end multi-actor workflow across superadmin, admin, all seller types, and all buyer types", async () => {
    const t = createTestHarness();

    // =========================================================================
    // 1. INITIALIZE ACTORS ACROSS ALL 4 ROLES & ALL 6 ACCOUNT TYPES
    // =========================================================================
    // Role 1 & 2: Superadmin and Admin
    const superadmin = await seedTestUser(t, {
      role: "superadmin",
      firstName: "Super",
      lastName: "Admin",
    });

    const admin = await seedTestUser(t, {
      role: "admin",
      firstName: "Operations",
      lastName: "Admin",
    });

    // Role 3: Sellers across all 3 vendor account types
    const sellerFleet = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_fleet",
      firstName: "EcoFleet",
      lastName: "Logistics",
      kycStatus: "approved",
    });

    const sellerDealer = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_dealer",
      firstName: "Premier",
      lastName: "EV Motors",
      kycStatus: "approved",
    });

    const sellerIndividual = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_individual",
      firstName: "Tayo",
      lastName: "PrivateSeller",
      kycStatus: "approved",
    });

    // Role 4: Buyers across all 3 buyer account types
    const buyerCorporate = await seedTestUser(t, {
      role: "buyer",
      accountType: "corporate",
      firstName: "Apex",
      lastName: "Holdings",
      kycStatus: "pending", // Starts pending KYC
      walletBalance: 120_000_000_00, // ₦120M in kobo
      buyingPower: 120_000_000,
    });

    const buyerDealer = await seedTestUser(t, {
      role: "buyer",
      accountType: "dealer",
      firstName: "Metro",
      lastName: "AutoHub",
      kycStatus: "approved",
      walletBalance: 90_000_000_00, // ₦90M in kobo
      buyingPower: 90_000_000,
    });

    const buyerIndividual = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      firstName: "Chidi",
      lastName: "Buyer",
      kycStatus: "approved",
      walletBalance: 40_000_000_00, // ₦40M in kobo
      buyingPower: 40_000_000,
    });

    const badActor = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      firstName: "Suspended",
      lastName: "Actor",
      status: "active",
      walletBalance: 10_000_000_00,
    });

    // =========================================================================
    // 2. RBAC BOUNDARIES, CORPORATE KYC & USER SUSPENSION
    // =========================================================================
    // A. Regular admin cannot escalate roles or promote to superadmin
    let adminEscalateErr: unknown = null;
    try {
      await t.mutation(api.users.updateUserRole, {
        token: admin.token,
        userId: buyerIndividual.userId,
        role: "superadmin",
      });
    } catch (e: unknown) {
      adminEscalateErr = e;
    }
    expect(adminEscalateErr).not.toBeNull();

    // B. Superadmin elevates corporate buyer's membership tier to "business"
    const tierRes = await t.mutation(api.users.updateMembershipTier, {
      token: superadmin.token,
      userId: buyerCorporate.userId,
      tier: "business",
    });
    expect(tierRes.success).toBe(true);

    // C. Admin reviews and approves Corporate KYC
    const kycRes = await t.mutation(api.users.updateKYCStatus, {
      token: admin.token,
      userId: buyerCorporate.userId,
      kycStatus: "approved",
      notes: "Corporate CAC documents and board resolution verified",
    });
    expect(kycRes.success).toBe(true);
    const approvedCorp = await t.run(async (ctx) => ctx.db.get(buyerCorporate.userId));
    expect(approvedCorp?.kycStatus).toBe("approved");

    // D. Superadmin suspends the bad actor
    await t.mutation(api.users.updateUserStatus, {
      token: superadmin.token,
      userId: badActor.userId,
      status: "suspended",
    });
    const suspendedUser = await t.run(async (ctx) => ctx.db.get(badActor.userId));
    expect(suspendedUser?.status).toBe("suspended");

    // E. Superadmin self-demotion protection
    let selfDemoteErr: unknown = null;
    try {
      await t.mutation(api.users.updateUserRole, {
        token: superadmin.token,
        userId: superadmin.userId,
        role: "buyer",
      });
    } catch (e: unknown) {
      selfDemoteErr = e;
    }
    expect(selfDemoteErr).not.toBeNull();

    // =========================================================================
    // 3. SELLER INVENTORY LIFECYCLE: SUBMISSION, REJECTION & APPROVAL
    // =========================================================================
    // Vehicle 1: Fleet Seller uploads commercial EV
    const fleetVehicleRes = await t.mutation(api.vehicles.createVehicle, {
      token: sellerFleet.token,
      vehicleData: {
        make: "BYD",
        model: "Atto 3",
        year: 2024,
        vin: "BYDATTO3FLEET001",
        odometer: 3200,
        exteriorColor: "Skiing White",
        interiorColor: "Eclipse Blue",
        fuelType: "Battery Electric Vehicle (BEV / EV)",
        batteryCapacity: 60.48,
        batteryHealthPercent: 99,
        range: 420,
        condition: "like_new",
        damageDescription: "Corporate fleet maintained, immaculate",
        locationCity: "Ikeja",
        locationState: "Lagos",
        locationCountry: "Nigeria",
        startingBid: 22_000_000,
        reservePrice: 26_000_000,
        buyItNowPrice: 30_000_000,
        buyItNowEnabled: true,
        initialStatus: "pending_approval",
        mediaUploads: [
          { storageId: "byd_front", category: "Front View", isRequired: true },
          { storageId: "byd_rear", category: "Rear View", isRequired: true },
          { storageId: "byd_driver", category: "Driver Side", isRequired: true },
          { storageId: "byd_dash", category: "Interior (Dashboard)", isRequired: true },
          { storageId: "byd_engine", category: "Engine Bay", isRequired: true },
        ],
      },
    });
    const fleetVehicleId = fleetVehicleRes.vehicleId;

    // Admin rejects vehicle with feedback reason
    await t.mutation(api.vehicles.rejectVehicle, {
      token: admin.token,
      vehicleId: fleetVehicleId,
      reason: "Please verify battery certificate attachment",
    });
    const rejectedVehicleDoc = await t.run(async (ctx) => ctx.db.get(fleetVehicleId));
    expect(rejectedVehicleDoc?.status).toBe("rejected");

    // Fleet seller updates vehicle and re-submits
    await t.mutation(api.vehicles.updateVehicle, {
      token: sellerFleet.token,
      vehicleId: fleetVehicleId,
      updates: {
        damageDescription: "Corporate fleet maintained. Certified battery diagnostic report verified.",
      },
    });

    // Admin approves the vehicle
    await t.mutation(api.vehicles.approveVehicle, {
      token: admin.token,
      vehicleId: fleetVehicleId,
    });
    const approvedFleetDoc = await t.run(async (ctx) => ctx.db.get(fleetVehicleId));
    expect(approvedFleetDoc?.status).toBe("approved");

    // Vehicle 2: Individual Seller lists personal luxury EV
    const personalVehicleRes = await t.mutation(api.vehicles.createVehicle, {
      token: sellerIndividual.token,
      vehicleData: {
        make: "Tesla",
        model: "Model 3",
        year: 2023,
        vin: "5YJ3E1EB8PF123456",
        odometer: 12000,
        exteriorColor: "Solid Black",
        interiorColor: "All Black",
        fuelType: "Battery Electric Vehicle (BEV / EV)",
        batteryCapacity: 75.0,
        batteryHealthPercent: 97,
        range: 530,
        condition: "excellent",
        damageDescription: "Private owner, garage kept, home charging only",
        locationCity: "Victoria Island",
        locationState: "Lagos",
        locationCountry: "Nigeria",
        startingBid: 28_000_000,
        reservePrice: 34_000_000,
        buyItNowPrice: 38_000_000,
        buyItNowEnabled: true,
        initialStatus: "pending_approval",
        mediaUploads: [
          { storageId: "t3_front", category: "Front View", isRequired: true },
          { storageId: "t3_rear", category: "Rear View", isRequired: true },
          { storageId: "t3_driver", category: "Driver Side", isRequired: true },
          { storageId: "t3_dash", category: "Interior (Dashboard)", isRequired: true },
          { storageId: "t3_engine", category: "Engine Bay", isRequired: true },
        ],
      },
    });
    const personalVehicleId = personalVehicleRes.vehicleId;

    await t.mutation(api.vehicles.approveVehicle, {
      token: admin.token,
      vehicleId: personalVehicleId,
    });
    const approvedPersonalDoc = await t.run(async (ctx) => ctx.db.get(personalVehicleId));
    expect(approvedPersonalDoc?.status).toBe("approved");

    // =========================================================================
    // 4. TIMED CONCURRENT AUCTION WITH DUAL LOTS & RESERVE MET / UNMET RESOLUTION
    // =========================================================================
    const now = Date.now();
    const auctionRes = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Q4 Premium EV Timed Showcase",
      description: "Concurrent timed lots: Commercial Fleet EV & Luxury Sedan",
      auctionType: "timed", // Timed concurrent auction
      scheduledStart: now + 60_000,
      bidIncrement: 500_000,
      lots: [
        {
          vehicleId: fleetVehicleId,
          lotOrder: 1,
          lotDuration: 300_000,
          startingBid: 22_000_000,
          reservePrice: 26_000_000,
          buyItNowPrice: 30_000_000,
          bidIncrement: 500_000,
        },
        {
          vehicleId: personalVehicleId,
          lotOrder: 2,
          lotDuration: 300_000,
          startingBid: 28_000_000,
          reservePrice: 34_000_000,
          buyItNowPrice: 38_000_000,
          bidIncrement: 500_000,
        },
      ],
    });

    const auctionId = auctionRes.auctionId;
    const lot1Id = auctionRes.lotIds[0];
    const lot2Id = auctionRes.lotIds[1];

    // Admin starts timed auction -> ALL lots become active concurrently
    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId,
    });

    const lot1State = await t.run(async (ctx) => ctx.db.get(lot1Id));
    const lot2State = await t.run(async (ctx) => ctx.db.get(lot2Id));
    expect(lot1State?.status).toBe("active");
    expect(lot2State?.status).toBe("active");

    // Bidding on Lot 1 (Reserve is ₦26.0M):
    // Buyer Individual bids ₦23.0M -> below reserve
    const bid1Res = await t.mutation(api.bids.placeBid, {
      token: buyerIndividual.token,
      lotId: lot1Id,
      amount: 23_000_000,
    });
    expect(bid1Res.success).toBe(true);

    // Buyer Dealer outbids on Lot 1 at ₦27.0M -> reserve MET!
    const bid2Res = await t.mutation(api.bids.placeBid, {
      token: buyerDealer.token,
      lotId: lot1Id,
      amount: 27_000_000,
    });
    expect(bid2Res.success).toBe(true);

    // Verify Buyer Individual's reserved balance was released upon being outbid
    const buyerIndivDoc = await t.run(async (ctx) => ctx.db.get(buyerIndividual.userId));
    expect(buyerIndivDoc?.reservedBalance).toBe(0);

    // Lot 2 has no bids -> Admin force-closes Lot 2 -> NO SALE
    const forceClose2Res = await t.mutation(api.auctions.forceCloseLot, {
      token: admin.token,
      lotId: lot2Id,
    });
    expect(forceClose2Res.outcome).toBe("no_sale");

    const closedLot2 = await t.run(async (ctx) => ctx.db.get(lot2Id));
    expect(closedLot2?.status).toBe("no_sale");
    expect(closedLot2?.winnerId).toBeUndefined();

    // Verify Vehicle 2 transitions to "unsold" (available for Buy Now or future auction)
    const vehicle2Restored = await t.run(async (ctx) => ctx.db.get(personalVehicleId));
    expect(vehicle2Restored?.status).toBe("unsold");

    // Admin force-closes Lot 1: Above reserve -> WINNER AWARDED
    const forceClose1Res = await t.mutation(api.auctions.forceCloseLot, {
      token: admin.token,
      lotId: lot1Id,
    });
    expect(forceClose1Res.outcome).toBe("sold");

    const closedLot1 = await t.run(async (ctx) => ctx.db.get(lot1Id));
    expect(closedLot1?.status).toBe("sold");
    expect(closedLot1?.winnerId).toBe(buyerDealer.userId);

    // Verify winning order created for Buyer Dealer
    const dealerOrders = await t.query(api.orders.getUserOrders, {
      token: buyerDealer.token,
    });
    expect(dealerOrders.length).toBe(1);
    const auctionWinOrder = dealerOrders[0];
    expect(auctionWinOrder.status).toBe("pending_payment");
    expect(auctionWinOrder.winningBid).toBe(27_000_000);

    // =========================================================================
    // 5. DIRECT BUY-NOW PURCHASE WITH WHOLE-NAIRA INVARIANTS ON RESTORED VEHICLE 2
    // =========================================================================
    // Buyer Corporate purchases Vehicle 2 directly via Buy Now with Port Harcourt destination
    const buyNowRes = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyerCorporate.token,
      vehicleId: personalVehicleId,
      destination: "port_harcourt",
    });

    const buyNowOrder = await t.run(async (ctx) => ctx.db.get(buyNowRes.orderId));
    expect(buyNowOrder).not.toBeNull();
    expect(buyNowOrder?.status).toBe("pending_payment");
    expect(buyNowOrder?.orderType).toBe("buy_it_now");

    // Verify all money amounts are whole integers
    const pricingRef = calculateBuyNowPricing(38_000_000, "port_harcourt");
    expect(buyNowOrder?.winningBid).toBe(38_000_000);
    expect(buyNowOrder?.serviceFee).toBe(pricingRef.serviceFee);
    expect(buyNowOrder?.shippingCost).toBe(pricingRef.shippingCost);
    expect(buyNowOrder?.totalAmount).toBe(pricingRef.totalAmount);
    expect(Number.isInteger(buyNowOrder!.totalAmount)).toBe(true);

    // Buyer Corporate settles Buy Now order from wallet
    const corpPayRes = await t.mutation(api.payments.payOrderFromWallet, {
      token: buyerCorporate.token,
      orderId: buyNowRes.orderId,
    });
    expect(corpPayRes.success).toBe(true);

    const paidBuyNowOrder = await t.run(async (ctx) => ctx.db.get(buyNowRes.orderId));
    expect(paidBuyNowOrder?.status).toBe("payment_complete");

    // =========================================================================
    // 6. ORDER FULFILLMENT, LOGISTICS TRACKING & SECURITY GATE PASS SCAN
    // =========================================================================
    // Buyer Dealer settles auction win order from wallet
    const dealerPayRes = await t.mutation(api.payments.payOrderFromWallet, {
      token: buyerDealer.token,
      orderId: auctionWinOrder._id,
    });
    expect(dealerPayRes.success).toBe(true);

    // Admin updates shipping tracking
    await t.mutation(api.orders.addShippingTracking, {
      token: admin.token,
      orderId: auctionWinOrder._id,
      carrier: "SwiftEV Logistics & Freight",
      trackingNumber: "SWIFT-EV-FLT-2026-99",
      notes: "Cleared customs, dispatched for terminal pickup",
    });

    const shippedOrder = await t.run(async (ctx) => ctx.db.get(auctionWinOrder._id));
    expect(shippedOrder?.status).toBe("shipped");

    // Buyer Dealer generates Gate Pass
    const gatePassRes = await t.mutation(api.logistics.generateGatePass, {
      token: buyerDealer.token,
      orderId: auctionWinOrder._id,
    });
    expect(gatePassRes.code).toBeDefined();

    // Security Officer / Admin scans and validates Gate Pass
    const scanRes = await t.mutation(api.logistics.scanGatePass, {
      token: admin.token,
      code: gatePassRes.code,
    });
    expect(scanRes.success).toBe(true);

    const deliveredOrder = await t.run(async (ctx) => ctx.db.get(auctionWinOrder._id));
    expect(deliveredOrder?.status).toBe("delivered");

    // =========================================================================
    // 7. DISPUTE ARBITRATION, RESOLUTION REFUND & VENDOR REVENUE ISOLATION
    // =========================================================================
    // Buyer Dealer files dispute on delivered vehicle for missing Level 2 mobile charger
    const disputeId = await t.mutation(api.disputes.createDispute, {
      token: buyerDealer.token,
      orderId: auctionWinOrder._id,
      disputeType: "not_as_described",
      description: "OEM Level 2 fast charging cable absent from vehicle trunk",
      evidenceUrls: ["https://example.com/photos/empty_cable_compartment.jpg"],
    });

    // Admin arbitrates and approves refund of ₦350,000 for replacement charger
    const dealerWalletBefore = (await t.run(async (ctx) => ctx.db.get(buyerDealer.userId)))!.walletBalance!;
    await t.mutation(api.disputes.resolveDispute, {
      token: admin.token,
      disputeId,
      resolution: "repair_credit",
      refundAmount: 350_000,
      resolutionNotes: "Approved credit for OEM Level 2 fast charger purchase",
    });

    // Verify Buyer Dealer wallet is credited with whole-Naira converted to kobo
    const dealerWalletAfter = (await t.run(async (ctx) => ctx.db.get(buyerDealer.userId)))!.walletBalance!;
    expect(dealerWalletAfter - dealerWalletBefore).toBe(350_000 * 100);

    // =========================================================================
    // 8. VENDOR STATS, REVENUE HISTORY & CROSS-TENANT PRIVACY
    // =========================================================================
    // Seller Fleet stats must reflect their sold vehicle
    const fleetStats = await t.query(api.vehicles.getVendorStats, {
      token: sellerFleet.token,
    });
    expect(fleetStats.totalVehicles).toBeGreaterThanOrEqual(1);
    expect(fleetStats.totalRevenue).toBeGreaterThan(0);

    const fleetHistory = await t.query(api.vehicles.getVendorRevenueHistory, {
      token: sellerFleet.token,
    });
    expect(fleetHistory.length).toBeGreaterThanOrEqual(1);
    expect(fleetHistory[0].revenue).toBe(fleetStats.totalRevenue);

    // Seller Individual stats must reflect their Buy Now sold vehicle
    const individualSellerStats = await t.query(api.vehicles.getVendorStats, {
      token: sellerIndividual.token,
    });
    expect(individualSellerStats.totalRevenue).toBe(pricingRef.totalAmount); // Buy Now order total

    // Seller Dealer stats with no listings returns 0 vehicles
    const dealerSellerStats = await t.query(api.vehicles.getVendorStats, {
      token: sellerDealer.token,
    });
    expect(dealerSellerStats.totalVehicles).toBe(0);
    expect(dealerSellerStats.totalRevenue).toBe(0);

    // Non-vendor is blocked from vendor stats
    let unauthorizedStatsErr: unknown = null;
    try {
      await t.query(api.vehicles.getVendorStats, {
        token: buyerIndividual.token,
      });
    } catch (e: unknown) {
      unauthorizedStatsErr = e;
    }
    expect(unauthorizedStatsErr).not.toBeNull();
  });
});
