import { describe, test, expect } from "bun:test";
import { api, internal } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle } from "../helpers/convex-test-harness";

describe("Backend Live Auction & Bidding Engine (In-Memory Hermetic)", () => {
  test("complete live sequential auction lifecycle: create, add lots, start, live bids, proxy bids, auto-advance, winning order", async () => {
    const t = createTestHarness();

    // 1. Seed users
    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
    const buyer1 = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });
    const buyer2 = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 });

    // 2. Seed vehicles
    const vehicle1 = await seedTestVehicle(t, vendor.userId, {
      make: "Tesla",
      model: "Model Y",
      year: 2023,
      startingBid: 20_000_000,
      reservePrice: 25_000_000,
      buyNowPrice: 30_000_000,
    });
    const vehicle2 = await seedTestVehicle(t, vendor.userId, {
      make: "Porsche",
      model: "Taycan 4S",
      year: 2024,
      startingBid: 40_000_000,
      reservePrice: 50_000_000,
      buyNowPrice: 60_000_000,
    });

    // 3. Admin creates Live Sequential Auction with lots
    const now = Date.now();
    const auctionResult = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Weekly Premium EV Auction",
      description: "Live auction event for electric SUVs and sedans",
      auctionType: "live",
      bidIncrement: 500_000,
      scheduledStart: now + 3600_000,
      scheduledEnd: now + 7200_000,
      lots: [
        {
          vehicleId: vehicle1,
          lotOrder: 1,
          startingBid: 20_000_000,
          reservePrice: 25_000_000,
          buyItNowPrice: 30_000_000,
          bidIncrement: 500_000,
          lotDuration: 600_000,
        },
        {
          vehicleId: vehicle2,
          lotOrder: 2,
          startingBid: 40_000_000,
          reservePrice: 50_000_000,
          buyItNowPrice: 60_000_000,
          bidIncrement: 1_000_000,
          lotDuration: 600_000,
        },
      ],
    });

    expect(auctionResult).toHaveProperty("auctionId");
    expect(auctionResult.createdLotsCount).toBe(2);

    const auctionId = auctionResult.auctionId;

    // 4. Admin starts auction -> in live sequential mode, only Lot 1 becomes active
    const startResult = await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId,
    });

    expect(startResult.success).toBe(true);

    // Query active lot
    const activeLotRes = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(activeLotRes).not.toBeNull();
    expect(activeLotRes?.lot.lotOrder).toBe(1);
    expect(activeLotRes?.lot.status).toBe("active");
    expect(activeLotRes?.lot.vehicleId).toBe(vehicle1);

    const lot1Id = activeLotRes!.lot._id;

    // 5. Buyer 1 places initial opening bid (₦20.5M)
    const bid1 = await t.mutation(api.bids.placeBid, {
      token: buyer1.token,
      lotId: lot1Id,
      amount: 20_500_000,
    });

    expect(bid1.success).toBe(true);
    expect(bid1.newCurrentBid).toBe(20_500_000);

    const lotAfterBid1 = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lotAfterBid1?.lot.currentBid).toBe(20_500_000);
    expect(lotAfterBid1?.lot.currentBidderId).toBe(buyer1.userId);

    // 6. Buyer 2 places next increment bid (₦21M)
    const bid2 = await t.mutation(api.bids.placeBid, {
      token: buyer2.token,
      lotId: lot1Id,
      amount: 21_000_000,
    });

    expect(bid2.success).toBe(true);
    expect(bid2.newCurrentBid).toBe(21_000_000);

    const lotAfterBid2 = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lotAfterBid2?.lot.currentBid).toBe(21_000_000);
    expect(lotAfterBid2?.lot.currentBidderId).toBe(buyer2.userId);

    // 7. Buyer 1 sets a Proxy Max Bid of ₦27M (exceeds reserve of ₦25M)
    const maxBidResult = await t.mutation(api.bids.setMaxBid, {
      token: buyer1.token,
      lotId: lot1Id,
      maxAmount: 27_000_000,
    });

    expect(maxBidResult.success).toBe(true);
    // Execute proxy bid processing
    await t.mutation(internal.bids.processProxyBids, { lotId: lot1Id });

    // Proxy engine raised current bid to beat Buyer 2 (₦21.5M)
    const lotAfterProxy = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lotAfterProxy?.lot.currentBid).toBe(21_500_000);
    expect(lotAfterProxy?.lot.currentBidderId).toBe(buyer1.userId);

    // 8. Buyer 2 bids ₦24M -> Proxy engine automatically counters for Buyer 1 up to ₦24.5M
    const bid3 = await t.mutation(api.bids.placeBid, {
      token: buyer2.token,
      lotId: lot1Id,
      amount: 24_000_000,
    });

    expect(bid3.success).toBe(true);
    await t.mutation(internal.bids.processProxyBids, { lotId: lot1Id });

    const lotAfterCounter = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lotAfterCounter?.lot.currentBid).toBe(24_500_000);
    expect(lotAfterCounter?.lot.currentBidderId).toBe(buyer1.userId);

    // Buyer 2 bids ₦26M (meets reserve) -> Proxy counters at ₦26.5M
    await t.mutation(api.bids.placeBid, {
      token: buyer2.token,
      lotId: lot1Id,
      amount: 26_000_000,
    });

    await t.mutation(internal.bids.processProxyBids, { lotId: lot1Id });

    const lotFinal = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lotFinal?.lot.currentBid).toBe(26_500_000);
    expect(lotFinal?.lot.currentBidderId).toBe(buyer1.userId);

    // 9. Admin closes Lot 1 and advances to Lot 2
    const advanceResult = await t.mutation(api.auctions.advanceLot, {
      token: admin.token,
      auctionId,
    });

    expect(advanceResult.success).toBe(true);

    // Verify Lot 1 is sold and won by Buyer 1
    const lot1Doc = await t.run(async (ctx) => ctx.db.get(lot1Id));
    expect(lot1Doc?.status).toBe("sold");
    expect(lot1Doc?.winnerId).toBe(buyer1.userId);
    expect(lot1Doc?.currentBid).toBe(26_500_000);

    // Verify winning order was generated for Buyer 1
    const buyer1Orders = await t.query(api.orders.getUserOrders, { token: buyer1.token });
    expect(buyer1Orders.length).toBeGreaterThanOrEqual(1);
    const wonOrder = buyer1Orders.find((o) => o.vehicleId === vehicle1);
    expect(wonOrder).toBeDefined();
    expect(wonOrder?.winningBid).toBe(26_500_000);
    expect(wonOrder?.serviceFee).toBe(1_325_000);
    expect(wonOrder?.totalAmount).toBe(27_875_000);
    expect(wonOrder?.orderType).toBe("auction_win");

    // Verify Lot 2 is now the active lot
    const lot2Active = await t.query(api.auctions.getCurrentLot, { auctionId });
    expect(lot2Active?.lot.lotOrder).toBe(2);
    expect(lot2Active?.lot.status).toBe("active");
  });

  test("timed concurrent auction mode activates all lots in parallel", async () => {
    const t = createTestHarness();

    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller" });
    const buyer = await seedTestUser(t, { role: "buyer" });

    const vehicle1 = await seedTestVehicle(t, vendor.userId, {
      startingBid: 10_000_000,
      reservePrice: 12_000_000,
      buyNowPrice: 15_000_000,
    });
    const vehicle2 = await seedTestVehicle(t, vendor.userId, {
      startingBid: 12_000_000,
      reservePrice: 15_000_000,
      buyNowPrice: 18_000_000,
    });

    const now = Date.now();
    const auctionResult = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Timed Weekend Auction",
      description: "Timed concurrent bidding",
      auctionType: "timed",
      bidIncrement: 500_000,
      scheduledStart: now + 1000,
      scheduledEnd: now + 86400_000,
      lots: [
        {
          vehicleId: vehicle1,
          lotOrder: 1,
          startingBid: 10_000_000,
          reservePrice: 12_000_000,
          buyItNowPrice: 15_000_000,
          bidIncrement: 500_000,
          lotDuration: 7200_000,
        },
        {
          vehicleId: vehicle2,
          lotOrder: 2,
          startingBid: 12_000_000,
          reservePrice: 15_000_000,
          buyItNowPrice: 18_000_000,
          bidIncrement: 500_000,
          lotDuration: 7200_000,
        },
      ],
    });

    const auctionId = auctionResult.auctionId;

    // Start timed concurrent auction
    await t.mutation(api.auctions.startAuction, {
      token: admin.token,
      auctionId,
    });

    const activeLots = await t.run(async (ctx) => {
      return await ctx.db
        .query("auctionLots")
        .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
        .collect();
    });

    expect(activeLots.length).toBe(2);
    expect(activeLots.every((l) => l.status === "active")).toBe(true);

    // Buyer can bid on both lots independently (must meet minimum startingBid + increment)
    const bidLot1 = await t.mutation(api.bids.placeBid, {
      token: buyer.token,
      lotId: activeLots[0]._id,
      amount: 10_500_000,
    });
    expect(bidLot1.success).toBe(true);

    const bidLot2 = await t.mutation(api.bids.placeBid, {
      token: buyer.token,
      lotId: activeLots[1]._id,
      amount: 12_500_000,
    });
    expect(bidLot2.success).toBe(true);
  });

  test("unsold lot transitions vehicle status to unsold and handles no bids", async () => {
    const t = createTestHarness();

    const admin = await seedTestUser(t, { role: "admin" });
    const vendor = await seedTestUser(t, { role: "seller" });

    const vehicle = await seedTestVehicle(t, vendor.userId, {
      startingBid: 15_000_000,
      reservePrice: 20_000_000,
      buyNowPrice: 25_000_000,
    });

    const auctionResult = await t.mutation(api.auctions.createAuctionWithLots, {
      token: admin.token,
      name: "Single Lot Auction",
      auctionType: "live",
      bidIncrement: 500_000,
      scheduledStart: Date.now() + 1000,
      scheduledEnd: Date.now() + 3600_000,
      lots: [
        {
          vehicleId: vehicle,
          lotOrder: 1,
          startingBid: 15_000_000,
          reservePrice: 20_000_000,
          buyItNowPrice: 25_000_000,
          lotDuration: 600_000,
        },
      ],
    });

    const auctionId = auctionResult.auctionId;
    await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });

    // Close lot with 0 bids -> declared unsold
    await t.mutation(api.auctions.advanceLot, { token: admin.token, auctionId });

    const vehicleDoc = await t.run(async (ctx) => ctx.db.get(vehicle));
    expect(vehicleDoc?.status).toBe("unsold");
  });
});
