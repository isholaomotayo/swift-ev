import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle } from "../helpers/convex-test-harness";

describe("Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic)", () => {
  test("seller uploads vehicle -> pending_approval -> admin approves -> status is approved", async () => {
    const t = createTestHarness();

    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const admin = await seedTestUser(t, { role: "admin" });

    // 1. Seller creates vehicle with all required media categories
    const vehicleData = {
      make: "Hyundai",
      model: "Ioniq 5",
      year: 2024,
      vin: "KM8K13AB7PU123456",
      odometer: 1200,
      exteriorColor: "Atlas White",
      interiorColor: "Dark Pebble Gray",
      fuelType: "Battery Electric Vehicle (BEV / EV)",
      batteryCapacity: 77.4,
      batteryHealthPercent: 99,
      range: 480,
      batteryType: "NMC",
      chargingTypes: ["type2", "ccs2"],
      motorPower: 168,
      condition: "excellent",
      damageDescription: "None, showroom condition",
      locationCity: "Victoria Island",
      locationState: "Lagos",
      locationCountry: "Nigeria",
      startingBid: 25_000_000,
      reservePrice: 30_000_000,
      buyItNowPrice: 35_000_000,
      buyItNowEnabled: true,
      initialStatus: "pending_approval" as const,
      mediaUploads: [
        { storageId: "storage_front", category: "Front View", isRequired: true },
        { storageId: "storage_rear", category: "Rear View", isRequired: true },
        { storageId: "storage_driver", category: "Driver Side", isRequired: true },
        { storageId: "storage_dashboard", category: "Interior (Dashboard)", isRequired: true },
        { storageId: "storage_engine", category: "Engine Bay", isRequired: true },
      ],
    };

    const createResult = await t.mutation(api.vehicles.createVehicle, {
      token: seller.token,
      vehicleData,
    });

    expect(createResult).toHaveProperty("vehicleId");

    const vehicleId = createResult.vehicleId;
    const initialDoc = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(initialDoc?.status).toBe("pending_approval");

    // 2. Non-admin cannot approve vehicle
    let nonAdminError: unknown = null;
    try {
      await t.mutation(api.vehicles.approveVehicle, {
        token: seller.token,
        vehicleId,
      });
    } catch (e: any) {
      nonAdminError = e;
    }
    expect(nonAdminError).not.toBeNull();

    // 3. Admin approves vehicle
    const approveResult = await t.mutation(api.vehicles.approveVehicle, {
      token: admin.token,
      vehicleId,
    });
    expect(approveResult.success).toBe(true);

    const vehicleDoc = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicleDoc?.status).toBe("approved");
    expect(vehicleDoc?.buyItNowEnabled).toBe(true);
  });

  test("buyer cannot upload vehicle (seller role required)", async () => {
    const t = createTestHarness();

    const buyer = await seedTestUser(t, { role: "buyer" });

    let caughtError: unknown = null;
    try {
      await t.mutation(api.vehicles.createVehicle, {
        token: buyer.token,
        vehicleData: {
          make: "Tesla",
          model: "Model 3",
          year: 2023,
          odometer: 15000,
          exteriorColor: "Black",
          interiorColor: "White",
          fuelType: "Battery Electric Vehicle (BEV / EV)",
          condition: "good",
          damageDescription: "Minor scratch on bumper",
          locationCity: "Lekki",
          locationState: "Lagos",
          locationCountry: "Nigeria",
          startingBid: 18_000_000,
          reservePrice: 22_000_000,
          buyItNowPrice: 26_000_000,
          mediaUploads: [],
        },
      });
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).not.toBeNull();
  });

  test("admin rejects pending vehicle with reason", async () => {
    const t = createTestHarness();

    const seller = await seedTestUser(t, { role: "seller" });
    const admin = await seedTestUser(t, { role: "admin" });

    const vehicleId = await seedTestVehicle(t, seller.userId, {
      status: "pending_approval",
    });

    const rejectResult = await t.mutation(api.vehicles.rejectVehicle, {
      token: admin.token,
      vehicleId,
      reason: "Missing battery health report document",
    });

    expect(rejectResult.success).toBe(true);

    const vehicleDoc = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicleDoc?.status).toBe("rejected");
  });

  test("catalog management and deduplication allows adding novel make and models with collision prevention", async () => {
    const t = createTestHarness();
    const admin = await seedTestUser(t, { role: "admin" });

    // 1. Query catalog makes
    const catalog = await t.query(api.vehicleCatalog.getCatalog, {});
    expect(Array.isArray(catalog)).toBe(true);

    // 2. Admin adds brand new Make (e.g. HyperionVolt)
    const addMakeResult = await t.mutation(api.vehicleCatalog.addMake, {
      token: admin.token,
      make: "HyperionVolt",
      initialModels: ["Spectre", "Phantom", "Aether"],
    });

    expect(addMakeResult).toHaveProperty("makeId");
    expect(addMakeResult.make.toLowerCase()).toBe("hyperionvolt");

    // 3. Admin adds model to make
    const addModelResult = await t.mutation(api.vehicleCatalog.addModel, {
      token: admin.token,
      make: "HyperionVolt",
      model: "Apex",
    });

    expect(addModelResult.model).toBe("Apex");
    expect(addModelResult.allModels).toContain("Apex");

    // 4. Duplicate make check detects duplicate
    const checkDup = await t.query(api.vehicleCatalog.checkMakeAvailability, {
      make: "hyperionvolt",
    });
    expect(checkDup.isDuplicate).toBe(true);
  });
});
