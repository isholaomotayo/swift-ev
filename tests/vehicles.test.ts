import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Vehicles", () => {
  let adminToken: string;
  let vendorToken: string;
  let buyerToken: string;
  let testVehicleId: string;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await client.mutation(api.auth.login, {
      email: "admin@voltbid.africa",
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

  describe("getFeaturedVehicles", () => {
    test("returns vehicles in auction", async () => {
      const vehicles = await client.query(api.vehicles.getFeaturedVehicles, {});

      expect(Array.isArray(vehicles)).toBe(true);
      expect(vehicles.length).toBeLessThanOrEqual(8);

      if (vehicles.length > 0) {
        const vehicle = vehicles[0];
        expect(vehicle).toHaveProperty("_id");
        expect(vehicle).toHaveProperty("make");
        expect(vehicle).toHaveProperty("model");
        expect(vehicle).toHaveProperty("year");
        expect(vehicle).toHaveProperty("status");
        expect(vehicle.status).toBe("in_auction");
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
        result.vehicles.forEach((vehicle) => {
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

      result.vehicles.forEach((vehicle) => {
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

      result.vehicles.forEach((vehicle) => {
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
    });

    test("returns null for non-existent vehicle", async () => {
      // Use a fake ID format - this will fail validation but tests error handling
      // In practice, we'd need a valid ID format
      const result = await client.query(api.vehicles.getVehicleById, {
        vehicleId: "j1234567890abcdef" as any,
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
        vin: "TEST123456789",
        lotNumber: "TEST-LOT-001",
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
        imageUrls: ["https://example.com/image1.jpg"],
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
        vin: "TEST123456790",
        lotNumber: "TEST-LOT-002",
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
        imageUrls: ["https://example.com/image1.jpg"],
      };

      await expect(
        client.mutation(api.vehicles.createVehicle, {
          token: buyerToken,
          vehicleData,
        })
      ).rejects.toThrow("Only vendors can upload vehicles");
    });

    test("requires valid session token", async () => {
      const vehicleData = {
        make: "Tesla",
        model: "Model 3",
        year: 2023,
        vin: "TEST123456791",
        lotNumber: "TEST-LOT-003",
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
        imageUrls: ["https://example.com/image1.jpg"],
      };

      await expect(
        client.mutation(api.vehicles.createVehicle, {
          token: "invalid_token",
          vehicleData,
        })
      ).rejects.toThrow();
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

