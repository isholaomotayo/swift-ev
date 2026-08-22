import { describe, test, expect } from "bun:test";
import {
  sanitizeVehicleFormDataForSubmit,
  type VehicleFormData,
} from "../../lib/vehicle-form-payload";
import {
  isValidVehicleMakeModel,
  resolveMakeModelForForm,
  appendCatalogPatch,
  type DynamicCatalogEntry,
} from "../../lib/vehicle-catalog";

describe("Vendor Vehicle Listing Wizard Form Actions (Client-Side Logic)", () => {
  test("sanitizes standard EV vehicle submission payload", () => {
    const formData: VehicleFormData = {
      make: "Tesla",
      model: " Model Y Long Range ",
      year: 2023,
      vin: " 5YJ3E1EB8NF123456 ",
      fuelType: "EV (Electric)",
      batteryCapacity: 75,
      batteryHealthPercent: 96,
      range: 533,
      batteryType: "NMC",
      chargingTypes: ["type2", "ccs2"],
      motorPower: 378,
      condition: "excellent",
      odometer: 24000,
      exteriorColor: "Pearl White",
      interiorColor: "All Black",
      damageDescription: "No cosmetic or mechanical defects",
      startingBid: 28_000_000,
      reservePrice: 32_000_000,
      buyItNowPrice: 38_000_000,
      locationCity: "Ikeja",
      locationState: "Lagos",
      locationCountry: "Nigeria",
    };

    const sanitized = sanitizeVehicleFormDataForSubmit(formData);

    expect(sanitized.make).toBe("Tesla");
    expect(sanitized.model).toBe("Model Y Long Range");
    expect(sanitized.batteryCapacity).toBe(75);
    expect(sanitized.batteryHealthPercent).toBe(96);
    expect(sanitized.fuelType).toBe("EV (Electric)");
    expect(sanitized.reservePrice).toBe(32_000_000);
    expect(sanitized.buyItNowPrice).toBe(38_000_000);
  });

  test("handles custom make and custom battery type fields when 'Other' selected", () => {
    const formData: VehicleFormData = {
      make: "Other",
      makeCustom: " Apex Motors ",
      model: " Photon GT ",
      year: 2025,
      fuelType: "EV (Electric)",
      batteryType: "Other",
      batteryTypeCustom: " Solid-State Lithium ",
      condition: "mint",
      odometer: 500,
      exteriorColor: "Midnight Cyan",
      interiorColor: "Cognac Leather",
      damageDescription: "Brand new prototype",
      startingBid: 50_000_000,
      reservePrice: 60_000_000,
      buyItNowPrice: 70_000_000,
      locationCity: "Maitama",
      locationState: "Abuja",
      locationCountry: "Other",
      locationCountryCustom: " Ghana ",
    };

    const sanitized = sanitizeVehicleFormDataForSubmit(formData);

    expect(sanitized.make).toBe("Apex Motors");
    expect(sanitized.model).toBe("Photon GT");
    expect(sanitized.batteryType).toBe("Solid-State Lithium");
    expect(sanitized.locationCountry).toBe("Ghana");
  });

  test("validates newly added models dynamically without static catalog mismatch", () => {
    const make = "Zeekr";
    const novelModel = "001 FR Performance"; // Newly launched model not in static seed JSON

    // 1. Static validation alone would fail
    const staticCheck = isValidVehicleMakeModel(make, novelModel);
    expect(staticCheck).toBe(false);

    // 2. User adds model in UI -> dynamic patch created
    const initialDbCatalog: DynamicCatalogEntry[] = [
      { make: "Zeekr", models: ["001", "007", "X"] },
    ];
    const patchedCatalog = appendCatalogPatch(initialDbCatalog, { make, model: novelModel });

    // 3. Merged validation with dynamic entries MUST pass
    const mergedCheck = isValidVehicleMakeModel(make, novelModel, {
      allowOtherMake: true,
      dynamicEntries: patchedCatalog,
    });
    expect(mergedCheck).toBe(true);

    // 4. resolveMakeModelForForm maintains canonical make/model without false "Other" fallback
    const resolved = resolveMakeModelForForm(make, novelModel, patchedCatalog);
    expect(resolved.make).toBe("Zeekr");
    expect(resolved.model).toBe("001 FR Performance");
    expect(resolved.isOtherMake).toBe(false);
  });
});
