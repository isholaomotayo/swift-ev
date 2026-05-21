import { describe, expect, test } from "bun:test";
import {
  CAR_MAKES,
  getModelsForMake,
  isValidMakeModel,
  isValidVehicleMakeModel,
  normalizeMake,
  resolveMakeModelForForm,
} from "@/lib/vehicle-catalog";

describe("vehicle-catalog", () => {
  test("exports sorted makes from catalog", () => {
    expect(CAR_MAKES.length).toBeGreaterThan(80);
    expect(CAR_MAKES).toContain("BYD");
    expect(CAR_MAKES).toContain("Tesla");
    const sorted = [...CAR_MAKES].sort((a, b) => a.localeCompare(b));
    expect(CAR_MAKES).toEqual(sorted);
  });

  test("normalizeMake resolves legacy aliases", () => {
    expect(normalizeMake("XPeng")).toBe("XPENG");
    expect(normalizeMake("GAC Aion")).toBe("GAC");
    expect(normalizeMake("Hozon (Neta)")).toBe("Neta");
  });

  test("getModelsForMake returns models for catalog make", () => {
    const models = getModelsForMake("BYD");
    expect(models).toContain("Atto 3");
    expect(models).toContain("Seal");
  });

  test("isValidMakeModel accepts catalog pairs", () => {
    expect(isValidMakeModel("BYD", "Seal")).toBe(true);
    expect(isValidMakeModel("BYD", "Not A Model")).toBe(false);
  });

  test("isValidVehicleMakeModel allows Other make with custom model", () => {
    expect(
      isValidVehicleMakeModel("Other", "Custom Model X", { allowOtherMake: true })
    ).toBe(true);
    expect(isValidVehicleMakeModel("BYD", "Seal", { allowOtherMake: true })).toBe(true);
    expect(isValidVehicleMakeModel("BYD", "", { allowOtherMake: true })).toBe(false);
  });

  test("resolveMakeModelForForm maps legacy make to catalog", () => {
    expect(resolveMakeModelForForm("XPeng", "P7")).toEqual({
      make: "XPENG",
      model: "P7",
      isOtherMake: false,
    });
  });

  test("resolveMakeModelForForm keeps unknown makes as Other", () => {
    expect(resolveMakeModelForForm("Changan", "CS55")).toEqual({
      make: "Other",
      model: "CS55",
      isOtherMake: true,
    });
  });
});
