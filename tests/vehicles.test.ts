import "./setup-test-guard";
import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";


const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Vehicles", () => {
  let adminToken: string;
  let vendorToken: string;
  let buyerToken: string;
  let testVehicleId: Id<"vehicles"> | undefined;

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

  describe("getFeaturedVehicles", () => {
    test("returns up to 3 buyer-visible vehicles", async () => {
      const vehicles = await client.query(api.vehicles.getFeaturedVehicles, {});

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeLessThanOrEqual(3);

      if (vehicles.length > 0) {
        const vehicle = vehicles[0];
        expect(vehicle).toHaveProperty("_id");
        expect(vehicle).toHaveProperty("make");
        expect(vehicle).toHaveProperty("model");
        expect(vehicle).toHaveProperty("year");
        expect(vehicle).toHaveProperty("status");
        expect(["approved", "scheduled", "in_auction", "sold"]).toContain(
          vehicle.status
        );
        expect(vehicle).toHaveProperty("images");
        expect(Array.isArray(vehicle.images)).toBe(true);
      }
    });
  });

  describe("getVehicleStats", () => {
    test("returns vehicle statistics", async () => {
      const stats = await client.query(api.vehicles.getVehicleStats, {});

      expect(stats).toHaveProperty("totalListings");
      expect(stats).toHaveProperty("totalSold");
      expect(stats).toHaveProperty("activeAuctions");
      expect(typeof stats.totalListings).toBe("number");
      expect(typeof stats.totalSold).toBe("number");
      expect(typeof stats.activeAuctions).toBe("number");
      expect(stats.totalListings).toBeGreaterThanOrEqual(0);
      expect(stats.totalSold).toBeGreaterThanOrEqual(0);
      expect(stats.activeAuctions).toBeGreaterThanOrEqual(0);
    });
  });

  describe("listVehicles", () => {
    test("returns paginated vehicles", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 10,
      });

      expect(result).toHaveProperty("vehicles");
      expect(result).toHaveProperty("pagination");
      expect(Array.isArray(result.vehicles)).toBe(true);
      expect(result.pagination).toHaveProperty("page");
      expect(result.pagination).toHaveProperty("limit");
      expect(result.pagination).toHaveProperty("total");
      expect(result.pagination).toHaveProperty("totalPages");
      expect(result.pagination).toHaveProperty("hasMore");
    });

    test("filters by make", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        make: "BYD",
        page: 0,
        limit: 10,
      });

      if (result.vehicles.length > 0) {
        result.vehicles.forEach((vehicle: Doc<"vehicles">) => {
          expect(vehicle.make).toBe("BYD");
        });
      }
    });

    test("filters by year range", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        yearMin: 2020,
        yearMax: 2024,
        page: 0,
        limit: 10,
      });

      result.vehicles.forEach((vehicle: Doc<"vehicles">) => {
        expect(vehicle.year).toBeGreaterThanOrEqual(2020);
        expect(vehicle.year).toBeLessThanOrEqual(2024);
      });
    });

    test("filters by condition", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        condition: "excellent",
        page: 0,
        limit: 10,
      });

      result.vehicles.forEach((vehicle: Doc<"vehicles">) => {
        expect(vehicle.condition).toBe("excellent");
      });
    });

    test("sorts by price ascending", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        sortBy: "price_asc",
        page: 0,
        limit: 10,
      });

      if (result.vehicles.length > 1) {
        for (let i = 1; i < result.vehicles.length; i++) {
          const prevPrice = result.vehicles[i - 1].auctionLot?.currentBid || result.vehicles[i - 1].startingBid || 0;
          const currPrice = result.vehicles[i].auctionLot?.currentBid || result.vehicles[i].startingBid || 0;
          expect(currPrice).toBeGreaterThanOrEqual(prevPrice);
        }
      }
    });

    test("sorts by ending soon", async () => {
      const result = await client.query(api.vehicles.listVehicles, {
        sortBy: "ending_soon",
        page: 0,
        limit: 10,
      });

      if (result.vehicles.length > 1) {
        for (let i = 1; i < result.vehicles.length; i++) {
          const prevEnd = result.vehicles[i - 1].auctionLot?.endsAt || Infinity;
          const currEnd = result.vehicles[i].auctionLot?.endsAt || Infinity;
          expect(currEnd).toBeGreaterThanOrEqual(prevEnd);
        }
      }
    });
  });

  describe("searchVehicles", () => {
    test("searches vehicles by text", async () => {
      const result = await client.query(api.vehicles.searchVehicles, {
        searchTerm: "BYD",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const vehicle = result[0];
        expect(vehicle).toHaveProperty("make");
        expect(vehicle).toHaveProperty("model");
        expect(vehicle).toHaveProperty("images");
      }
    });

    test("returns empty array for non-matching search", async () => {
      const result = await client.query(api.vehicles.searchVehicles, {
        searchTerm: "NonExistentVehicleXYZ123",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getVehicleById", () => {
    test("returns vehicle details with related data", async () => {
      // First get a vehicle ID from list
      const listResult = await client.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 1,
      });

      if (listResult.vehicles.length > 0) {
        const vehicleId = listResult.vehicles[0]._id;
        const vehicle = await client.query(api.vehicles.getVehicleById, {
          vehicleId,
        });

        expect(vehicle).not.toBeNull();
        if (vehicle) {
          expect(vehicle).toHaveProperty("_id");
          expect(vehicle).toHaveProperty("make");
          expect(vehicle).toHaveProperty("model");
          expect(vehicle).toHaveProperty("year");
          expect(vehicle).toHaveProperty("images");
          expect(Array.isArray(vehicle.images)).toBe(true);
          expect(vehicle).toHaveProperty("bids");
          expect(Array.isArray(vehicle.bids)).toBe(true);
          expect(vehicle).toHaveProperty("documents");
          expect(Array.isArray(vehicle.documents)).toBe(true);
        }
      }
    });

    test("returns null for non-existent vehicle", async () => {
      // First get a vehicle ID from list to get a valid ID structure
      const listResult = await client.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 1,
      });

      let fakeVehicleId = "j1234567890abcdef" as Id<"vehicles">;
      if (listResult.vehicles.length > 0) {
        const validId = listResult.vehicles[0]._id;
        fakeVehicleId = (validId.substring(0, 15) + (validId[15] === "a" ? "b" : "a") + validId.substring(16)) as Id<"vehicles">;
      }

      const result = await client.query(api.vehicles.getVehicleById, {
        vehicleId: fakeVehicleId,
      });

      // Should return null or throw error
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe("getFilterOptions", () => {
    test("returns available filter options", async () => {
      const options = await client.query(api.vehicles.getFilterOptions, {});

      expect(options).toHaveProperty("makes");
      expect(options).toHaveProperty("yearRange");
      expect(options).toHaveProperty("priceRange");
      expect(Array.isArray(options.makes)).toBe(true);
      expect(options.yearRange).toHaveProperty("min");
      expect(options.yearRange).toHaveProperty("max");
      expect(options.priceRange).toHaveProperty("min");
      expect(options.priceRange).toHaveProperty("max");
    });
  });

  describe("createVehicle", () => {
    test("vendor can create a vehicle", async () => {
      const vehicleData = {
        make: "Tesla",
        model: "Model 3",
        year: 2023,
        vin: `T12345${Date.now().toString().slice(-10)}1`.slice(0, 17),
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
      };

      const result = await client.mutation(api.vehicles.createVehicle, {
        token: vendorToken,
        vehicleData,
      });

      expect(result).toHaveProperty("vehicleId");
      testVehicleId = result.vehicleId;
    });

    test("non-vendor cannot create vehicle", async () => {
      const vehicleData = {
        make: "Tesla",
        model: "Model 3",
        year: 2023,
        vin: `T12345${Date.now().toString().slice(-10)}2`.slice(0, 17),
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
      };

      await expect(
        client.mutation(api.vehicles.createVehicle, {
          token: buyerToken,
          vehicleData,
        })
      ).rejects.toThrow("Only vendors or admins can upload vehicles");
    });

    test("requires valid session token", async () => {
      const vehicleData = {
        make: "Tesla",
        model: "Model 3",
        year: 2023,
        vin: `T12345${Date.now().toString().slice(-10)}3`.slice(0, 17),
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
      };

      await expect(
        client.mutation(api.vehicles.createVehicle, {
          token: "invalid_token",
          vehicleData,
        })
      ).rejects.toThrow();
    });
  });

  describe("approveVehicle", () => {
    const buildPendingVehicleData = (suffix: string) => ({
      make: "Tesla",
      model: "Model 3",
      year: 2023,
      vin: `APPROVE${suffix}`.slice(-17),
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
    });

    test("admin can approve a pending vehicle", async () => {
      const suffix = `${Date.now()}-A`;
      const created = await client.mutation(api.vehicles.createVehicle, {
        token: vendorToken,
        vehicleData: buildPendingVehicleData(suffix),
      });

      const result = await client.mutation(api.vehicles.approveVehicle, {
        token: adminToken,
        vehicleId: created.vehicleId,
      });

      expect(result).toEqual({ success: true });

      const vehicle = await client.query(api.vehicles.getVehicleById, {
        vehicleId: created.vehicleId,
      });
      expect(vehicle?.status).toBe("approved");
    });

    test("vendor cannot approve a vehicle", async () => {
      const suffix = `${Date.now()}-V`;
      const created = await client.mutation(api.vehicles.createVehicle, {
        token: vendorToken,
        vehicleData: buildPendingVehicleData(suffix),
      });

      await expect(
        client.mutation(api.vehicles.approveVehicle, {
          token: vendorToken,
          vehicleId: created.vehicleId,
        })
      ).rejects.toThrow("Access denied");
    });

    test("admin cannot approve a vehicle that is not pending approval", async () => {
      const suffix = `${Date.now()}-D`;
      const created = await client.mutation(api.vehicles.createVehicle, {
        token: vendorToken,
        vehicleData: buildPendingVehicleData(suffix),
      });

      await client.mutation(api.vehicles.approveVehicle, {
        token: adminToken,
        vehicleId: created.vehicleId,
      });

      await expect(
        client.mutation(api.vehicles.approveVehicle, {
          token: adminToken,
          vehicleId: created.vehicleId,
        })
      ).rejects.toThrow("Only pending approval vehicles can be approved");
    });
  });

  describe("updateVehicle", () => {
    test("vendor can update vehicle with legacy image URLs", async () => {
      if (!testVehicleId) {
        const listResult = await client.query(api.vehicles.listVehicles, {
          page: 0,
          limit: 1,
        });
        if (listResult.vehicles.length === 0) return;
        testVehicleId = listResult.vehicles[0]._id;
      }

      const result = await client.mutation(api.vehicles.updateVehicle, {
        token: vendorToken,
        vehicleId: testVehicleId,
        updates: {
          exteriorColor: "Blue",
          imageUrls: ["https://example.com/updated-hero.jpg"],
        },
      });

      expect(result).toEqual({ success: true });

      const vehicle = await client.query(api.vehicles.getVehicleById, {
        token: vendorToken,
        vehicleId: testVehicleId,
      });
      expect(vehicle?.exteriorColor).toBe("Blue");
      expect(vehicle?.images?.[0]?.storageRef).toBe("https://example.com/updated-hero.jpg");
    });

  });

  describe("getVendorStats", () => {
    test("vendor can get their statistics", async () => {
      const stats = await client.query(api.vehicles.getVendorStats, {
        token: vendorToken,
      });

      expect(stats).toHaveProperty("totalVehicles");
      expect(stats).toHaveProperty("inAuction");
      expect(stats).toHaveProperty("sold");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("totalRevenue");
      expect(stats).toHaveProperty("averageSalePrice");
      expect(typeof stats.totalVehicles).toBe("number");
      expect(typeof stats.inAuction).toBe("number");
      expect(typeof stats.sold).toBe("number");
      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.totalRevenue).toBe("number");
      expect(typeof stats.averageSalePrice).toBe("number");
    });

    test("non-vendor cannot get vendor stats", async () => {
      await expect(
        client.query(api.vehicles.getVendorStats, {
          token: buyerToken,
        })
      ).rejects.toThrow();
    });
  });

  describe("getVendorRevenueHistory", () => {
    test("vendor can get revenue history", async () => {
      const history = await client.query(api.vehicles.getVendorRevenueHistory, {
        token: vendorToken,
        months: 6,
      });

      expect(Array.isArray(history)).toBe(true);
      if (history.length > 0) {
        const entry = history[0];
        expect(entry).toHaveProperty("month");
        expect(entry).toHaveProperty("revenue");
        expect(typeof entry.revenue).toBe("number");
      }
    });
  });
});
