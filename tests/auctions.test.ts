import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Auctions", () => {
  let adminToken: string;
  let vendorToken: string;
  let buyerToken: string;
  let testAuctionId: Id<"auctions">;
  let testVehicleId: Id<"vehicles">;
  let testLotId: Id<"auctionLots">;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await client.mutation(api.auth.login, {
      email: "admin@autoexports.live",
      password: "admin123",
    });
    adminToken = adminLogin.token;

    // Login as vendor
    const vendorLogin = await client.mutation(api.auth.login, {
      email: "vendor@bydnigeria.com",
      password: "vendor123",
    });
    vendorToken = vendorLogin.token;

    // Login as buyer
    const buyerLogin = await client.mutation(api.auth.login, {
      email: "john.doe@example.com",
      password: "buyer123",
    });
    buyerToken = buyerLogin.token;
  });

  describe("listAuctions", () => {
    test("returns all auctions", async () => {
      const auctions = await client.query(api.auctions.listAuctions, {});

      expect(Array.isArray(auctions)).toBe(true);
      if (auctions.length > 0) {
        const auction = auctions[0];
        expect(auction).toHaveProperty("_id");
        expect(auction).toHaveProperty("name");
        expect(auction).toHaveProperty("status");
        expect(auction).toHaveProperty("totalLots");
        expect(auction).toHaveProperty("soldLots");
        expect(typeof auction.totalLots).toBe("number");
        expect(typeof auction.soldLots).toBe("number");
      }
    });

    test("filters by status", async () => {
      const liveAuctions = await client.query(api.auctions.listAuctions, {
        status: "live",
      });

      expect(Array.isArray(liveAuctions)).toBe(true);
      liveAuctions.forEach((auction) => {
        expect(auction.status).toBe("live");
      });
    });
  });

  describe("getAuctionById", () => {
    test("returns auction with lots", async () => {
      // First get an auction ID from list
      const auctions = await client.query(api.auctions.listAuctions, {});

      if (auctions.length > 0) {
        const auctionId = auctions[0]._id;
        const auction = await client.query(api.auctions.getAuctionById, {
          auctionId,
        });

        expect(auction).not.toBeNull();
        if (auction) {
          expect(auction).toHaveProperty("auction");
          expect(auction).toHaveProperty("lots");
          expect(Array.isArray(auction.lots)).toBe(true);
          expect(auction.auction._id).toBe(auctionId);
        }
      }
    });

    test("returns null for non-existent auction", async () => {
      const result = await client.query(api.auctions.getAuctionById, {
        auctionId: "j1234567890abcdef" as any,
      });

      expect(result).toBeNull();
    });
  });

  describe("getCurrentLot", () => {
    test("returns current active lot for auction", async () => {
      // Get a live auction
      const auctions = await client.query(api.auctions.listAuctions, {
        status: "live",
      });

      if (auctions.length > 0) {
        const auctionId = auctions[0]._id;
        const currentLot = await client.query(api.auctions.getCurrentLot, {
          auctionId,
        });

        // May be null if no active lot
        if (currentLot) {
          expect(currentLot).toHaveProperty("lot");
          expect(currentLot).toHaveProperty("vehicle");
          expect(currentLot.lot.status).toBe("active");
          expect(currentLot.vehicle).toHaveProperty("images");
        }
      }
    });
  });

  describe("createAuction", () => {
    test("admin can create auction", async () => {
      const scheduledStart = Date.now() + 24 * 60 * 60 * 1000; // Tomorrow
      const scheduledEnd = scheduledStart + 2 * 60 * 60 * 1000; // 2 hours later

      const result = await client.mutation(api.auctions.createAuction, {
        token: adminToken,
        name: "Test Auction",
        description: "Test auction description",
        auctionType: "live",
        scheduledStart,
        scheduledEnd,
        bidIncrement: 10000,
      });

      expect(result).toHaveProperty("success");
      expect(result.success).toBe(true);
      expect(result).toHaveProperty("auctionId");
      testAuctionId = result.auctionId;
    });

    test("requires scheduledStart", async () => {
      await expect(
        client.mutation(api.auctions.createAuction, {
          token: adminToken,
          name: "Test Auction",
          auctionType: "live",
          bidIncrement: 10000,
        })
      ).rejects.toThrow("scheduledStart is required");
    });

    test("non-admin cannot create auction", async () => {
      const scheduledStart = Date.now() + 24 * 60 * 60 * 1000;

      await expect(
        client.mutation(api.auctions.createAuction, {
          token: buyerToken,
          name: "Test Auction",
          auctionType: "live",
          scheduledStart,
          bidIncrement: 10000,
        })
      ).rejects.toThrow("Admin access required");
    });

    test("requires valid session token", async () => {
      const scheduledStart = Date.now() + 24 * 60 * 60 * 1000;

      await expect(
        client.mutation(api.auctions.createAuction, {
          token: "invalid_token",
          name: "Test Auction",
          auctionType: "live",
          scheduledStart,
          bidIncrement: 10000,
        })
      ).rejects.toThrow();
    });
  });

  describe("addLotToAuction", () => {
    test("admin can add lot to auction", async () => {
      // First get a vehicle
      const vehicles = await client.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 1,
      });

      if (vehicles.vehicles.length > 0 && testAuctionId) {
        const vehicleId = vehicles.vehicles[0]._id;
        testVehicleId = vehicleId;

        const result = await client.mutation(api.auctions.addLotToAuction, {
          token: adminToken,
          auctionId: testAuctionId,
          vehicleId,
          lotOrder: 1,
          lotDuration: 300000, // 5 minutes
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
        expect(result).toHaveProperty("lotId");
        testLotId = result.lotId;
      }
    });

    test("non-admin cannot add lot", async () => {
      const vehicles = await client.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 1,
      });

      if (vehicles.vehicles.length > 0 && testAuctionId) {
        const vehicleId = vehicles.vehicles[0]._id;

        await expect(
          client.mutation(api.auctions.addLotToAuction, {
            token: buyerToken,
            auctionId: testAuctionId,
            vehicleId,
            lotOrder: 1,
            lotDuration: 300000,
          })
        ).rejects.toThrow("Admin access required");
      }
    });
  });

  describe("startAuction", () => {
    test("admin can start auction", async () => {
      if (testAuctionId) {
        const result = await client.mutation(api.auctions.startAuction, {
          token: adminToken,
          auctionId: testAuctionId,
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
        expect(result).toHaveProperty("message");
      }
    });

    test("non-admin cannot start auction", async () => {
      if (testAuctionId) {
        await expect(
          client.mutation(api.auctions.startAuction, {
            token: buyerToken,
            auctionId: testAuctionId,
          })
        ).rejects.toThrow("Admin access required");
      }
    });
  });

  describe("pauseAuction", () => {
    test("admin can pause auction", async () => {
      if (testAuctionId) {
        const result = await client.mutation(api.auctions.pauseAuction, {
          token: adminToken,
          auctionId: testAuctionId,
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
        expect(result).toHaveProperty("message");
      }
    });

    test("non-admin cannot pause auction", async () => {
      if (testAuctionId) {
        await expect(
          client.mutation(api.auctions.pauseAuction, {
            token: buyerToken,
            auctionId: testAuctionId,
          })
        ).rejects.toThrow("Admin access required");
      }
    });
  });

  describe("advanceLot", () => {
    test("admin can advance to next lot", async () => {
      if (testAuctionId) {
        // First start the auction if not already started
        try {
          await client.mutation(api.auctions.startAuction, {
            token: adminToken,
            auctionId: testAuctionId,
          });
        } catch (e) {
          // Auction might already be started
        }

        const result = await client.mutation(api.auctions.advanceLot, {
          token: adminToken,
          auctionId: testAuctionId,
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
        expect(result).toHaveProperty("message");
      }
    });

    test("non-admin cannot advance lot", async () => {
      if (testAuctionId) {
        await expect(
          client.mutation(api.auctions.advanceLot, {
            token: buyerToken,
            auctionId: testAuctionId,
          })
        ).rejects.toThrow("Admin access required");
      }
    });
  });

  describe("getVendorAuctions", () => {
    test("vendor can get their auctions", async () => {
      const auctions = await client.query(api.auctions.getVendorAuctions, {
        token: vendorToken,
      });

      expect(Array.isArray(auctions)).toBe(true);
      if (auctions.length > 0) {
        const auction = auctions[0];
        expect(auction).toHaveProperty("_id");
        expect(auction).toHaveProperty("name");
        expect(auction).toHaveProperty("vendorLots");
        expect(Array.isArray(auction.vendorLots)).toBe(true);
      }
    });

    test("non-vendor cannot get vendor auctions", async () => {
      await expect(
        client.query(api.auctions.getVendorAuctions, {
          token: buyerToken,
        })
      ).rejects.toThrow();
    });
  });
});
