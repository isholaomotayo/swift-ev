import "./setup-test-guard";
import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";


const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Auctions", () => {
  let adminToken: string;
  let vendorToken: string;
  let buyerToken: string;
  let testAuctionId: Id<"auctions">;

  beforeAll(async () => {
    // Login in parallel to prevent timeouts
    const [adminLogin, vendorLogin, buyerLogin] = await Promise.all([
      client.action(api.authActions.login, {
        email: "admin@voltbid.africa",
        password: "admin123",
      }),
      client.action(api.authActions.login, {
        email: "vendor@bydnigeria.com",
        password: "vendor123",
      }),
      client.action(api.authActions.login, {
        email: "john.doe@example.com",
        password: "buyer123",
      }),
    ]);
    adminToken = adminLogin.token;
    vendorToken = vendorLogin.token;
    buyerToken = buyerLogin.token;
  });

  describe("listAuctions", () => {
    test("returns all auctions", async () => {
      const auctions = await client.query(api.auctions.listAuctions, {});

      expect(Array.isArray(auctions)).toBe(true);
      if (auctions.length > 0) {
        const auction = auctions[0] as Doc<"auctions">;
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
      liveAuctions.forEach((auction: Doc<"auctions">) => {
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
      const auctions = await client.query(api.auctions.listAuctions, {});
      let fakeAuctionId = "j1234567890abcdef" as Id<"auctions">;
      if (auctions.length > 0) {
        const validId = auctions[0]._id;
        fakeAuctionId = (validId.substring(0, 15) + (validId[15] === "0" ? "1" : "0") + validId.substring(16)) as Id<"auctions">;
      }
      const result = await client.query(api.auctions.getAuctionById, {
        auctionId: fakeAuctionId,
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
      ).rejects.toThrow("Access denied");
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
      if (testAuctionId) {
        // Create and approve a new vehicle specifically for this auction test
        const suffix = `${Date.now()}-AUC`.slice(-17);
        const created = await client.mutation(api.vehicles.createVehicle, {
          token: vendorToken,
          vehicleData: {
            make: "Tesla",
            model: "Model 3",
            year: 2023,
            vin: suffix,
            odometer: 15000,
            exteriorColor: "Red",
            interiorColor: "Black",
            batteryCapacity: 75,
            batteryHealthPercent: 95,
            range: 400,
            batteryType: "Lithium-ion",
            chargingTypes: ["AC", "DC"],
            motorPower: 283,
            condition: "excellent",
            damageDescription: "No damage",
            locationCity: "Lagos",
            locationState: "Lagos",
            locationCountry: "Nigeria",
            startingBid: 5000000,
            reservePrice: 6000000,
            buyItNowPrice: 7000000,
            mediaUploads: [
              { storageId: "https://example.com/front.jpg", category: "Front View", isRequired: true },
              { storageId: "https://example.com/rear.jpg", category: "Rear View", isRequired: true },
              { storageId: "https://example.com/driver.jpg", category: "Driver Side", isRequired: true },
              { storageId: "https://example.com/interior.jpg", category: "Interior (Dashboard)", isRequired: true },
              { storageId: "https://example.com/engine.jpg", category: "Engine Bay", isRequired: true },
            ],
            videoWalkthroughStorageId: "https://example.com/walkthrough.mp4",
          },
        });

        await client.mutation(api.vehicles.approveVehicle, {
          token: adminToken,
          vehicleId: created.vehicleId,
        });

        const vehicleId = created.vehicleId;

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

        const vehicle = await client.query(api.vehicles.getVehicleById, {
          token: adminToken,
          vehicleId,
        });
        expect(vehicle?.status).toBe("scheduled");
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
        ).rejects.toThrow("Access denied");
      }
    });
  });

  describe("createAuctionWithLots", () => {
    test("admin can create auction with multiple lots in 1 atomic mutation", async () => {
      const createApprovedVehicle = async (vinSuffix: string) => {
        const created = await client.mutation(api.vehicles.createVehicle, {
          token: vendorToken,
          vehicleData: {
            make: "NIO",
            model: "ET7",
            year: 2024,
            vin: `${Date.now()}-${vinSuffix}`.slice(-17),
            odometer: 5000,
            exteriorColor: "Blue",
            interiorColor: "White",
            batteryCapacity: 100,
            batteryHealthPercent: 99,
            range: 580,
            batteryType: "Lithium-ion",
            chargingTypes: ["AC", "DC"],
            motorPower: 480,
            condition: "excellent",
            damageDescription: "None",
            locationCity: "Lagos",
            locationState: "Lagos",
            locationCountry: "Nigeria",
            startingBid: 8000000,
            reservePrice: 9000000,
            buyItNowPrice: 11000000,
            mediaUploads: [
              { storageId: "https://example.com/f.jpg", category: "Front View", isRequired: true },
              { storageId: "https://example.com/r.jpg", category: "Rear View", isRequired: true },
              { storageId: "https://example.com/d.jpg", category: "Driver Side", isRequired: true },
              { storageId: "https://example.com/i.jpg", category: "Interior (Dashboard)", isRequired: true },
              { storageId: "https://example.com/e.jpg", category: "Engine Bay", isRequired: true },
            ],
          },
        });
        await client.mutation(api.vehicles.approveVehicle, {
          token: adminToken,
          vehicleId: created.vehicleId,
        });
        return created.vehicleId;
      };

      const v1 = await createApprovedVehicle("BULK1");
      const v2 = await createApprovedVehicle("BULK2");

      const scheduledStart = Date.now() + 48 * 60 * 60 * 1000;
      const result = await client.mutation(api.auctions.createAuctionWithLots, {
        token: adminToken,
        name: "Bulk Test Auction",
        description: "Testing atomic batch auction creation",
        auctionType: "live",
        scheduledStart,
        bidIncrement: 20000,
        lots: [
          {
            vehicleId: v1,
            lotOrder: 1,
            lotDuration: 300000,
            startingBid: 8000000,
            reservePrice: 9000000,
            buyItNowPrice: 11000000,
          },
          {
            vehicleId: v2,
            lotOrder: 2,
            lotDuration: 300000,
            startingBid: 8500000,
            reservePrice: 9500000,
            buyItNowPrice: 12000000,
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.createdLotsCount).toBe(2);
      expect(result.lotIds.length).toBe(2);

      const auctionDetails = await client.query(api.auctions.getAuctionById, {
        auctionId: result.auctionId,
      });
      expect(auctionDetails?.auction.totalLots).toBe(2);

      const vehicle1 = await client.query(api.vehicles.getVehicleById, {
        token: adminToken,
        vehicleId: v1,
      });
      const vehicle2 = await client.query(api.vehicles.getVehicleById, {
        token: adminToken,
        vehicleId: v2,
      });
      expect(vehicle1?.status).toBe("scheduled");
      expect(vehicle2?.status).toBe("scheduled");
    });

    test("rejects duplicate lot orders in batch payload", async () => {
      const createApprovedVehicle = async (vinSuffix: string) => {
        const created = await client.mutation(api.vehicles.createVehicle, {
          token: vendorToken,
          vehicleData: {
            make: "BYD",
            model: "Han",
            year: 2024,
            vin: `${Date.now()}-${vinSuffix}`.slice(-17),
            odometer: 1000,
            exteriorColor: "Black",
            interiorColor: "Red",
            batteryCapacity: 85,
            batteryHealthPercent: 100,
            range: 600,
            batteryType: "Lithium-ion",
            chargingTypes: ["AC", "DC"],
            motorPower: 380,
            condition: "excellent",
            damageDescription: "None",
            locationCity: "Lagos",
            locationState: "Lagos",
            locationCountry: "Nigeria",
            startingBid: 7000000,
            reservePrice: 8000000,
            buyItNowPrice: 10000000,
            mediaUploads: [
              { storageId: "https://example.com/f.jpg", category: "Front View", isRequired: true },
              { storageId: "https://example.com/r.jpg", category: "Rear View", isRequired: true },
              { storageId: "https://example.com/d.jpg", category: "Driver Side", isRequired: true },
              { storageId: "https://example.com/i.jpg", category: "Interior (Dashboard)", isRequired: true },
              { storageId: "https://example.com/e.jpg", category: "Engine Bay", isRequired: true },
            ],
          },
        });
        await client.mutation(api.vehicles.approveVehicle, {
          token: adminToken,
          vehicleId: created.vehicleId,
        });
        return created.vehicleId;
      };

      const v1 = await createApprovedVehicle("DUP1");
      const v2 = await createApprovedVehicle("DUP2");

      const scheduledStart = Date.now() + 48 * 60 * 60 * 1000;

      await expect(
        client.mutation(api.auctions.createAuctionWithLots, {
          token: adminToken,
          name: "Invalid Duplicate Order Auction",
          auctionType: "live",
          scheduledStart,
          bidIncrement: 10000,
          lots: [
            { vehicleId: v1, lotOrder: 1, lotDuration: 300000, buyItNowPrice: 10000000 },
            { vehicleId: v2, lotOrder: 1, lotDuration: 300000, buyItNowPrice: 10000000 },
          ],
        })
      ).rejects.toThrow("Duplicate lot order");
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
        ).rejects.toThrow("Access denied");
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
        ).rejects.toThrow("Access denied");
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
        } catch {
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
        ).rejects.toThrow("Access denied");
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
        const auction = auctions[0] as Doc<"auctions"> & { vendorLots?: unknown[] };
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

  describe("deleteAuction and getAuctionDeletePreview", () => {
    test("non-admin cannot delete auction or preview deletion", async () => {
      const auctions = await client.query(api.auctions.listAuctions, {});
      if (auctions.length > 0) {
        const auctionId = auctions[0]._id;
        await expect(
          client.query(api.auctions.getAuctionDeletePreview, {
            token: buyerToken,
            auctionId,
          })
        ).rejects.toThrow();

        await expect(
          client.mutation(api.auctions.deleteAuction, {
            token: buyerToken,
            auctionId,
          })
        ).rejects.toThrow();
      }
    });

    test("admin can preview and safely delete an auction, resetting vehicle status", async () => {
      // 1. Create a test vehicle
      const createdVehicle = await client.mutation(api.vehicles.createVehicle, {
        token: vendorToken,
        vehicleData: {
          make: "NIO",
          model: "ET7",
          year: 2024,
          vin: `DELTEST-${Date.now()}`.slice(-17),
          odometer: 500,
          exteriorColor: "Blue",
          interiorColor: "Grey",
          batteryCapacity: 100,
          batteryHealthPercent: 100,
          range: 700,
          batteryType: "Solid State",
          chargingTypes: ["AC", "DC"],
          motorPower: 480,
          condition: "excellent",
          damageDescription: "None",
          locationCity: "Shanghai",
          locationState: "Shanghai",
          locationCountry: "China",
          startingBid: 12000000,
          reservePrice: 15000000,
          buyItNowPrice: 18000000,
          mediaUploads: [
            { storageId: "https://example.com/f.jpg", category: "Front View", isRequired: true },
            { storageId: "https://example.com/r.jpg", category: "Rear View", isRequired: true },
            { storageId: "https://example.com/d.jpg", category: "Driver Side", isRequired: true },
            { storageId: "https://example.com/i.jpg", category: "Interior (Dashboard)", isRequired: true },
            { storageId: "https://example.com/e.jpg", category: "Engine Bay", isRequired: true },
          ],
        },
      });



      await client.mutation(api.vehicles.approveVehicle, {
        token: adminToken,
        vehicleId: createdVehicle.vehicleId,
      });

      // 2. Create a test auction with this vehicle
      const auctionRes = await client.mutation(api.auctions.createAuctionWithLots, {
        token: adminToken,
        name: `Temporary Delete Test Auction ${Date.now()}`,
        description: "Testing safe deletion functionality",
        auctionType: "live",
        scheduledStart: Date.now() + 24 * 60 * 60 * 1000,
        bidIncrement: 50000,
        lots: [
          {
            vehicleId: createdVehicle.vehicleId,
            lotOrder: 1,
            lotDuration: 300000,
            startingBid: 12000000,
            reservePrice: 15000000,
            buyItNowPrice: 18000000,
          },
        ],
      });

      expect(auctionRes.success).toBe(true);

      // Verify vehicle status changed to scheduled
      const scheduledVehicle = await client.query(api.vehicles.getVehicleById, {
        token: adminToken,
        vehicleId: createdVehicle.vehicleId,
      });
      expect(scheduledVehicle?.status).toBe("scheduled");

      // 3. Preview auction deletion
      const preview = await client.query(api.auctions.getAuctionDeletePreview, {
        token: adminToken,
        auctionId: auctionRes.auctionId,
      });

      expect(preview.canDelete).toBe(true);
      expect(preview.lotCount).toBe(1);
      expect(preview.vehicleCount).toBe(1);

      // 4. Execute safe delete
      const deleteRes = await client.mutation(api.auctions.deleteAuction, {
        token: adminToken,
        auctionId: auctionRes.auctionId,
        resetVehicleStatusTo: "approved",
      });

      expect(deleteRes.success).toBe(true);
      expect(deleteRes.deletedAuctionId).toBe(auctionRes.auctionId);
      expect(deleteRes.deletedLotsCount).toBe(1);
      expect(deleteRes.resetVehiclesCount).toBe(1);

      // 5. Verify auction is gone
      const deletedAuction = await client.query(api.auctions.getAuctionById, {
        auctionId: auctionRes.auctionId,
      });
      expect(deletedAuction).toBeNull();

      // 6. Verify vehicle status was cleanly reset to approved
      const resetVehicle = await client.query(api.vehicles.getVehicleById, {
        token: adminToken,
        vehicleId: createdVehicle.vehicleId,
      });
      expect(resetVehicle?.status).toBe("approved");
    });
  });
});

