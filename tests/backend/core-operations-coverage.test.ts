import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle, type TestHarness } from "../helpers/convex-test-harness";

async function rejects(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  return null;
}

describe("Core Operations Hermetic In-Memory Coverage", () => {
  describe("User Role & Status Governance", () => {
    test("superadmin can update user role, while admin and regular users cannot", async () => {
      const t = createTestHarness();
      const superadmin = await seedTestUser(t, { role: "superadmin" });
      const admin = await seedTestUser(t, { role: "admin" });
      const targetUser = await seedTestUser(t, { role: "buyer" });

      // Admin attempt must fail
      const adminAttempt = await rejects(() =>
        t.mutation(api.users.updateUserRole, {
          token: admin.token,
          userId: targetUser.userId,
          role: "seller",
        })
      );
      expect(adminAttempt).not.toBeNull();

      // Superadmin updating own role must fail
      const selfAttempt = await rejects(() =>
        t.mutation(api.users.updateUserRole, {
          token: superadmin.token,
          userId: superadmin.userId,
          role: "buyer",
        })
      );
      expect(selfAttempt).not.toBeNull();

      // Non-existent user must fail
      const badUserAttempt = await rejects(() =>
        t.mutation(api.users.updateUserRole, {
          token: superadmin.token,
          userId: "invalid_id_format_000",
          role: "seller",
        })
      );
      expect(badUserAttempt).not.toBeNull();

      // Superadmin promoting targetUser to seller succeeds
      const successRes = await t.mutation(api.users.updateUserRole, {
        token: superadmin.token,
        userId: targetUser.userId,
        role: "seller",
      });
      expect(successRes.success).toBe(true);

      const updated = await t.run(async (ctx) => ctx.db.get(targetUser.userId));
      expect(updated?.role).toBe("seller");
    });

    test("admin can update user status and suspension deletes active sessions", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const buyer = await seedTestUser(t, { role: "buyer" });

      // Buyer cannot update user status
      const buyerAttempt = await rejects(() =>
        t.mutation(api.users.updateUserStatus, {
          token: buyer.token,
          userId: buyer.userId,
          status: "active",
        })
      );
      expect(buyerAttempt).not.toBeNull();

      // Admin cannot change own status
      const selfAttempt = await rejects(() =>
        t.mutation(api.users.updateUserStatus, {
          token: admin.token,
          userId: admin.userId,
          status: "suspended",
        })
      );
      expect(selfAttempt).not.toBeNull();

      // Check session exists before suspension
      const sessionsBefore = await t.run(async (ctx) =>
        ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", buyer.userId))
          .collect()
      );
      expect(sessionsBefore.length).toBeGreaterThanOrEqual(1);

      // Admin suspends buyer
      const suspendRes = await t.mutation(api.users.updateUserStatus, {
        token: admin.token,
        userId: buyer.userId,
        status: "suspended",
        reason: "Suspected compliance violation",
      });
      expect(suspendRes).toBeDefined();

      const userAfter = await t.run(async (ctx) => ctx.db.get(buyer.userId));
      expect(userAfter?.status).toBe("suspended");

      // Active sessions must be invalidated upon suspension
      const sessionsAfter = await t.run(async (ctx) =>
        ctx.db
          .query("sessions")
          .withIndex("by_user", (q) => q.eq("userId", buyer.userId))
          .collect()
      );
      expect(sessionsAfter.length).toBe(0);
    });
  });

  describe("Order Shipping & Tracking", () => {
    test("admin can add shipping tracking; rejects non-admins and duplicate tracking numbers", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 50_000_000_00 });
      const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });

      const vehicleId = await seedTestVehicle(t, seller.userId, {
        buyNowPrice: 20_000_000,
        status: "approved",
      });

      const { orderId } = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
        token: buyer.token,
        vehicleId,
        destination: "lagos",
      });
      await t.mutation(api.payments.payOrderFromWallet, { token: buyer.token, orderId });

      // Non-admin buyer cannot add shipping tracking
      const buyerAttempt = await rejects(() =>
        t.mutation(api.orders.addShippingTracking, {
          token: buyer.token,
          orderId,
          carrier: "Cosco Shipping",
          trackingNumber: "COSCO123456789",
        })
      );
      expect(buyerAttempt).not.toBeNull();

      // Admin adds shipping tracking
      const addRes = await t.mutation(api.orders.addShippingTracking, {
        token: admin.token,
        orderId,
        carrier: "Cosco Shipping",
        trackingNumber: "COSCO123456789",
        estimatedDelivery: Date.now() + 86400000 * 25,
        notes: "Container loaded at Guangzhou Port",
      });
      const orderDoc = await t.run(async (ctx) => ctx.db.get(orderId));
      expect(orderDoc?.status).toBe("shipped");

      const shipmentDoc = await t.run(async (ctx) =>
        ctx.db
          .query("shipments")
          .withIndex("by_order", (q) => q.eq("orderId", orderId))
          .first()
      );
      expect(shipmentDoc?.trackingNumber).toBe("COSCO123456789");
      expect(shipmentDoc?.shippingLine).toBe("Cosco Shipping");

      // Duplicate tracking number must be rejected
      const dupAttempt = await rejects(() =>
        t.mutation(api.orders.addShippingTracking, {
          token: admin.token,
          orderId,
          carrier: "Maersk",
          trackingNumber: "COSCO123456789",
        })
      );
      expect(dupAttempt).not.toBeNull();
    });
  });

  describe("Batch Auction Lot Creation & Lot Order Validation", () => {
    test("createAuctionWithLots atomically creates lots and enforces unique lot orders", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const seller = await seedTestUser(t, { role: "seller", accountType: "seller_fleet" });
      const now = Date.now();

      const v1 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 25_000_000 });
      const v2 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 35_000_000 });

      // Duplicate lotOrder must throw
      const dupOrderAttempt = await rejects(() =>
        t.mutation(api.auctions.createAuctionWithLots, {
          token: admin.token,
          name: "Duplicate Order Auction",
          auctionType: "live",
          bidIncrement: 500_000,
          scheduledStart: now + 3600_000,
          lots: [
            { vehicleId: v1, lotOrder: 1, lotDuration: 600_000, startingBid: 15_000_000 },
            { vehicleId: v2, lotOrder: 1, lotDuration: 600_000, startingBid: 25_000_000 },
          ],
        })
      );
      expect(dupOrderAttempt).not.toBeNull();

      // Non-admin cannot create
      const buyer = await seedTestUser(t, { role: "buyer" });
      const nonAdminAttempt = await rejects(() =>
        t.mutation(api.auctions.createAuctionWithLots, {
          token: buyer.token,
          name: "Buyer Auction",
          auctionType: "live",
          bidIncrement: 500_000,
          scheduledStart: now + 3600_000,
          lots: [
            { vehicleId: v1, lotOrder: 1, lotDuration: 600_000, startingBid: 15_000_000 },
          ],
        })
      );
      expect(nonAdminAttempt).not.toBeNull();

      // Valid atomic creation
      const result = await t.mutation(api.auctions.createAuctionWithLots, {
        token: admin.token,
        name: "Valid Batch Auction",
        auctionType: "live",
        bidIncrement: 500_000,
        scheduledStart: now + 3600_000,
        lots: [
          { vehicleId: v1, lotOrder: 1, lotDuration: 600_000, startingBid: 15_000_000, reservePrice: 20_000_000 },
          { vehicleId: v2, lotOrder: 2, lotDuration: 600_000, startingBid: 25_000_000, reservePrice: 30_000_000 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.createdLotsCount).toBe(2);

      const auction = await t.run(async (ctx) => ctx.db.get(result.auctionId));
      expect(auction?.totalLots).toBe(2);
      expect(auction?.status).toBe("scheduled");
    });
  });

  describe("Execution Modes: Live Sequential vs Timed Concurrent", () => {
    test("live sequential activates only the first lot upon start; advanceLot advances in sequence", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const seller = await seedTestUser(t, { role: "seller", accountType: "seller_dealer" });
      const now = Date.now();

      const v1 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 20_000_000 });
      const v2 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 25_000_000 });

      const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
        token: admin.token,
        name: "Live Sequential Test",
        auctionType: "live",
        bidIncrement: 500_000,
        scheduledStart: now + 1000,
        lots: [
          { vehicleId: v1, lotOrder: 1, lotDuration: 600_000, startingBid: 10_000_000 },
          { vehicleId: v2, lotOrder: 2, lotDuration: 600_000, startingBid: 15_000_000 },
        ],
      });

      // Start live sequential auction
      await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });

      const lots = await t.run(async (ctx) =>
        ctx.db
          .query("auctionLots")
          .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
          .collect()
      );

      const lot1 = lots.find((l) => l.lotOrder === 1);
      const lot2 = lots.find((l) => l.lotOrder === 2);

      // In live mode, only lot 1 is active, lot 2 remains pending
      expect(lot1?.status).toBe("active");
      expect(lot2?.status).toBe("pending");

      // Advance to next lot
      const advanceRes = await t.mutation(api.auctions.advanceLot, { token: admin.token, auctionId });
      expect(advanceRes.success).toBe(true);

      const lot1After = await t.run(async (ctx) => ctx.db.get(lot1!._id));
      const lot2After = await t.run(async (ctx) => ctx.db.get(lot2!._id));

      expect(lot1After?.status).toBe("no_sale");
      expect(lot2After?.status).toBe("active");
    });

    test("timed concurrent activates all lots concurrently upon start; advanceLot is rejected", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const seller = await seedTestUser(t, { role: "seller", accountType: "seller_fleet" });
      const now = Date.now();

      const v1 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 18_000_000 });
      const v2 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 22_000_000 });

      const { auctionId } = await t.mutation(api.auctions.createAuctionWithLots, {
        token: admin.token,
        name: "Timed Concurrent Test",
        auctionType: "timed",
        bidIncrement: 200_000,
        scheduledStart: now + 1000,
        lots: [
          { vehicleId: v1, lotOrder: 1, lotDuration: 3600_000, startingBid: 12_000_000 },
          { vehicleId: v2, lotOrder: 2, lotDuration: 3600_000, startingBid: 14_000_000 },
        ],
      });

      // Start timed auction
      await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });

      const lots = await t.run(async (ctx) =>
        ctx.db
          .query("auctionLots")
          .withIndex("by_auction", (q) => q.eq("auctionId", auctionId))
          .collect()
      );

      // In timed mode, every lot is active simultaneously
      for (const lot of lots) {
        expect(lot.status).toBe("active");
      }

      // advanceLot must be rejected for timed auctions
      const advanceAttempt = await rejects(() =>
        t.mutation(api.auctions.advanceLot, { token: admin.token, auctionId })
      );
      expect(advanceAttempt).not.toBeNull();
    });
  });

  describe("Bidding Validation Invariants", () => {
    test("rejects bids below minimum, bids on inactive lots, and bids from suspended users", async () => {
      const t = createTestHarness();
      const admin = await seedTestUser(t, { role: "admin" });
      const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
      const activeBuyer = await seedTestUser(t, {
        role: "buyer",
        walletBalance: 50_000_000_00,
        kycStatus: "approved",
      });
      const suspendedBuyer = await seedTestUser(t, {
        role: "buyer",
        status: "suspended",
        walletBalance: 50_000_000_00,
        kycStatus: "approved",
      });

      const now = Date.now();
      const v1 = await seedTestVehicle(t, seller.userId, { buyNowPrice: 20_000_000 });

      const { auctionId, lotIds } = await t.mutation(api.auctions.createAuctionWithLots, {
        token: admin.token,
        name: "Bidding Validation Auction",
        auctionType: "live",
        bidIncrement: 500_000,
        scheduledStart: now + 1000,
        lots: [
          { vehicleId: v1, lotOrder: 1, lotDuration: 600_000, startingBid: 10_000_000 },
        ],
      });

      const lotId = lotIds[0];

      // Bidding on scheduled (pre-start) lot with status pending without start
      // Attempting to place bid below minimum
      const belowMinAttempt = await rejects(() =>
        t.mutation(api.bids.placeBid, {
          token: activeBuyer.token,
          lotId,
          amount: 5_000_000, // starting is 10_000_000
        })
      );
      expect(belowMinAttempt).not.toBeNull();

      // Start auction
      await t.mutation(api.auctions.startAuction, { token: admin.token, auctionId });

      // Suspended buyer attempt must be rejected
      const suspendedAttempt = await rejects(() =>
        t.mutation(api.bids.placeBid, {
          token: suspendedBuyer.token,
          lotId,
          amount: 10_500_000,
        })
      );
      expect(suspendedAttempt).not.toBeNull();

      // Active buyer placing valid bid succeeds
      const bidRes = await t.mutation(api.bids.placeBid, {
        token: activeBuyer.token,
        lotId,
        amount: 10_500_000,
      });
      expect(bidRes.success).toBe(true);

      const lotDoc = await t.run(async (ctx) => ctx.db.get(lotId));
      expect(lotDoc?.currentBid).toBe(10_500_000);
      expect(lotDoc?.currentBidderId).toBe(activeBuyer.userId);
    });
  });
});
