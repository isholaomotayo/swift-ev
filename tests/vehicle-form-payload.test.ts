import { describe, expect, test } from "bun:test";

import { sanitizeVehicleFormDataForSubmit } from "../lib/vehicle-form-payload";

describe("vehicle form payload sanitizer", () => {
  test("resolves custom display fields and removes form-only fields", () => {
    const sanitized = sanitizeVehicleFormDataForSubmit({
      make: "Other",
      makeCustom: "Xiaomi",
      model: "YU7",
      year: 2025,
      vin: "",
      fuelType: "Battery Electric Vehicle (BEV / EV)",
      batteryCapacity: 96,
      batteryHealthPercent: 100,
      range: 760,
      batteryType: "Other",
      batteryTypeCustom: "Blade LFP",
      chargingTypes: ["DC CCS2"],
      motorPower: 508,
      condition: "like_new",
      odometer: 50000,
      exteriorColor: "Green",
      interiorColor: "black",
      damageDescription: "",
      startingBid: 4000000,
      reservePrice: 4500000,
      buyItNowPrice: 4500000,
      locationCity: "Shenzhen",
      locationState: "Guangdong",
      locationCountry: "Other",
      locationCountryCustom: "China",
    });

    expect(sanitized.make).toBe("Xiaomi");
    expect(sanitized.batteryType).toBe("Blade LFP");
    expect(sanitized.locationCountry).toBe("China");
    expect(sanitized.model).toBe("YU7");
    expect("makeCustom" in sanitized).toBe(false);
    expect("batteryTypeCustom" in sanitized).toBe(false);
    expect("locationCountryCustom" in sanitized).toBe(false);
  });
});
