import { describe, it, expect } from "bun:test";
import {
  FUEL_TYPES,
  normalizeFuelType as normalizeFuelTypeConstants,
  isEVFuelType,
} from "../lib/constants";
import {
  CANONICAL_FUEL_TYPES,
  normalizeFuelType as normalizeFuelTypeConvex,
  getFuelTypeSearchValues,
} from "../convex/lib/fuelTypes";

describe("Fuel Type Normalization and Backward Compatibility", () => {
  it("normalizes legacy EV strings properly in both constants and convex helpers", () => {
    const legacyEVs = ["EV (Electric)", "Electric", "EV", "BEV", "bev", "ev (electric)"];
    for (const legacy of legacyEVs) {
      expect(normalizeFuelTypeConstants(legacy)).toBe("Battery Electric Vehicle (BEV / EV)");
      expect(normalizeFuelTypeConvex(legacy)).toBe("Battery Electric Vehicle (BEV / EV)");
      expect(isEVFuelType(legacy)).toBe(true);
    }
  });

  it("normalizes legacy hybrid strings properly", () => {
    expect(normalizeFuelTypeConstants("Hybrid")).toBe("Full Hybrid (HEV)");
    expect(normalizeFuelTypeConvex("Hybrid")).toBe("Full Hybrid (HEV)");
    expect(isEVFuelType("Hybrid")).toBe(true);

    expect(normalizeFuelTypeConstants("Plug-in Hybrid")).toBe("Plug-in Hybrid (PHEV)");
    expect(normalizeFuelTypeConvex("Plug-in Hybrid")).toBe("Plug-in Hybrid (PHEV)");
    expect(isEVFuelType("Plug-in Hybrid")).toBe(true);

    expect(normalizeFuelTypeConstants("Mild Hybrid")).toBe("Mild Hybrid (MHEV)");
    expect(normalizeFuelTypeConvex("Mild Hybrid")).toBe("Mild Hybrid (MHEV)");
    expect(isEVFuelType("Mild Hybrid")).toBe(true);
  });

  it("normalizes legacy ICE / Gas / Petrol strings properly", () => {
    const legacyICEs = ["Gas/Petrol", "Gas", "Petrol", "Diesel", "ICE", "internal combustion engine (ice)"];
    for (const legacy of legacyICEs) {
      expect(normalizeFuelTypeConstants(legacy)).toBe("Internal Combustion Engine (ICE)");
      expect(normalizeFuelTypeConvex(legacy)).toBe("Internal Combustion Engine (ICE)");
      expect(isEVFuelType(legacy)).toBe(false);
    }
  });

  it("identifies all canonical fuel types as valid", () => {
    for (const fuelType of FUEL_TYPES) {
      expect(normalizeFuelTypeConstants(fuelType)).toBe(fuelType);
      expect(normalizeFuelTypeConvex(fuelType)).toBe(fuelType);
    }
  });

  it("returns search alias lists including legacy values for query matching", () => {
    const bevSearchValues = getFuelTypeSearchValues("Battery Electric Vehicle (BEV / EV)");
    expect(bevSearchValues).toContain("Battery Electric Vehicle (BEV / EV)");
    expect(bevSearchValues).toContain("EV (Electric)");

    const iceSearchValues = getFuelTypeSearchValues("Internal Combustion Engine (ICE)");
    expect(iceSearchValues).toContain("Internal Combustion Engine (ICE)");
    expect(iceSearchValues).toContain("Gas/Petrol");
  });
});
