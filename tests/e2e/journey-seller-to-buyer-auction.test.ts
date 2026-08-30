import { describe, test, expect } from "bun:test";
import { api, internal } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("E2E Journey: Seller Listing to Live Auction Bidding to Checkout & Gate Pass Release", () => {
  test("end-to-end multi-actor lifecycle across Seller, Buyer 1, Buyer 2, Admin, and Security Officer", async () => {
    const t = createTestHarness();

    // -------------------------------------------------------------
    // 1. ACTORS ONBOARDING
    // -------------------------------------------------------------
    const seller = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_dealer",
      kycStatus: "approved",
    });

    const buyer1 = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      kycStatus: "approved",
      walletBalance: 80_000_000_00, // ₦80M in kobo
      buyingPower: 80_000_000,
    });

    const buyer2 = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      kycStatus: "approved",
      walletBalance: 80_000_000_00, // ₦80M in kobo
      buyingPower: 80_000_000,
    });

    const admin = await seedTestUser(t, { role: "admin" });

    // -------------------------------------------------------------
    // 2. SELLER UPLOADS VEHICLE & ADMIN APPROVES
    // -------------------------------------------------------------
    const vehicleData = {
      make: "Porsche",
      model: "Taycan 4S",
      year: 2024,
      vin: "WP0AA2Y12PSA12345",
      odometer: 4500,
      exteriorColor: "Frozen Blue Metallic",
      interiorColor: "Black / Chalk",
      fuelType: "Battery Electric Vehicle (BEV / EV)",
      batteryCapacity: 93.4,
      batteryHealthPercent: 98,
      range: 460,
      condition: "excellent",
      damageDescription: "Immaculate condition, single owner",
      locationCity: "Victoria Island",
      locationState: "Lagos",
      locationCountry: "Nigeria",
      startingBid: 40_000_000,
      reservePrice: 48_000_000,
      buyItNowPrice: 55_000_000,
      buyItNowEnabled: true,
      initialStatus: "pending_approval" as const,
      mediaUploads: [
        { storageId: "img_front", category: "Front View", isRequired: true },
        { storageId: "img_rear", category: "Rear View", isRequired: true },
        { storageId: "img_driver", category: "Driver Side", isRequired: true },
        { storageId: "img_dash", category: "Interior (Dashboard)", isRequired: true },
        { storageId: "img_engine", category: "Engine Bay", isRequired: true },
      ],
    };

    const uploadRes = await t.mutation(api.vehicles.createVehicle, {
      token: seller.token,
      vehicleData,
    });
    const vehicleId = uploadRes.vehicleId;

    // Admin approves vehicle
    await t.mutation(api.vehicles.approveVehicle, {
      token: admin.token,
      vehicleId,
    });

    const vehicleDoc = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicleDoc?.status).toBe("approved");

    // -------------------------------------------------------------
    // 3. ADMIN CREATES AUCTION WITH LOT & STARTS AUCTION
    // -------------------------------------------------------------
    const now = Date.now();
    const auctionRes = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Supercar & Luxury EV Prestige Auction",
      description: "Curated performance EVs and luxury sports sedans",
      auctionType: "live",
      scheduledStart: now + 60_000,
      bidIncrement: 500_000,
      lots: [
        {
          vehicleId,
          lotOrder: 1,
          lotDuration: 120_000,
          startingBid: 40_000_000,
          reservePrice: 48_000_000,
          buyItNowPrice: 55_000_000,
          bidIncrement: 500_000,
        },
      ],
    });

    const auctionId = auctionRes.auctionId;
    const lotId = auctionRes.lotIds[0];

    // Admin starts the auction
    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId,
    });

    // -------------------------------------------------------------
    // 4. LIVE BIDDING FLOOR (BUYER 1 & BUYER 2)
    // -------------------------------------------------------------
    // Buyer 1 places opening bid ₦40.5M
    const bid1 = await t.mutation(api.bids.placeBid, {
      token: buyer1.token,
      lotId,
      amount: 40_500_000,
    });
    expect(bid1.success).toBe(true);

    // Buyer 2 places counter bid ₦41.0M
    const bid2 = await t.mutation(api.bids.placeBid, {
      token: buyer2.token,
      lotId,
      amount: 41_000_000,
    });
    expect(bid2.success).toBe(true);

    // Buyer 1 configures Proxy Bid max ceiling of ₦50.0M
    const proxyRes = await t.mutation(api.bids.setMaxBid, {
      token: buyer1.token,
      lotId,
      maxAmount: 50_000_000,
    });
    expect(proxyRes.success).toBe(true);

    // Buyer 2 bids ₦42.0M -> triggers Buyer 1 Proxy counter to ₦42.5M
    await t.mutation(api.bids.placeBid, {
      token: buyer2.token,
      lotId,
      amount: 42_000_000,
    });
    await t.mutation(internal.bids.processProxyBids, { lotId });

    const activeLotState = await t.run(async (ctx) => ctx.db.get(lotId));
    expect(activeLotState?.currentBid).toBe(42_500_000);
    expect(activeLotState?.currentBidderId).toBe(buyer1.userId);

    // -------------------------------------------------------------
    // 5. LOT CLOSURE & WINNING ORDER AWARD
    // -------------------------------------------------------------
    // Advance and end lot
    const advanceRes = await t.mutation(api.auctions.advanceLot, {
      token: admin.token,
      auctionId,
    });
    expect(advanceRes.success).toBe(true);

    const buyerOrders = await t.query(api.orders.getUserOrders, {
      token: buyer1.token,
    });
    expect(buyerOrders.length).toBe(1);

    const wonOrder = buyerOrders[0];
    const orderId = wonOrder._id;
    expect(wonOrder.status).toBe("pending_payment");
    expect(wonOrder.winningBid).toBe(42_500_000);

    // -------------------------------------------------------------
    // 6. BUYER COMPLETES PAYMENT FROM WALLET
    // -------------------------------------------------------------
    const payRes = await t.mutation(api.payments.payOrderFromWallet, {
      token: buyer1.token,
      orderId,
    });
    expect(payRes.success).toBe(true);

    const paidOrder = await t.query(api.orders.getOrderDetails, {
      token: buyer1.token,
      orderId,
    });
    expect(paidOrder?.order.status).toBe("payment_complete");

    // -------------------------------------------------------------
    // 7. LOGISTICS, TRACKING & GATE PASS ISSUE/SCAN
    // -------------------------------------------------------------
    // Admin adds shipping tracking
    await t.mutation(api.orders.addShippingTracking, {
      token: admin.token,
      orderId,
      carrier: "DHL Express Freight",
      trackingNumber: "DHL-EV-887711",
      notes: "Prepared for pickup at Victoria Island hub",
    });

    // Generate Gate Pass for Buyer
    const passRes = await t.mutation(api.logistics.generateGatePass, {
      token: buyer1.token,
      orderId,
    });
    expect(passRes).toHaveProperty("code");

    // Security scans gate pass
    const scanRes = await t.mutation(api.logistics.scanGatePass, {
      token: admin.token,
      code: passRes.code,
    });
    expect(scanRes.success).toBe(true);

    // Final order status
    const finalOrder = await t.query(api.orders.getOrderDetails, {
      token: buyer1.token,
      orderId,
    });
    expect(finalOrder?.order.status).toBe("delivered");
  });
});
