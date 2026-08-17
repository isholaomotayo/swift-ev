import { describe, expect, test } from "bun:test";
import {
  toNormalizedKey,
  cleanText,
  formatCanonicalName,
  calculateLevenshteinDistance,
  calculateStringSimilarity,
  checkDuplicateMake,
  checkDuplicateModel,
} from "@/lib/vehicle-dedup";

describe("vehicle-dedup", () => {
  describe("toNormalizedKey", () => {
    test("normalizes uppercase, lowercase, punctuation, accents, and whitespace", () => {
      expect(toNormalizedKey("Mercedes-Benz")).toBe("mercedesbenz");
      expect(toNormalizedKey("Mercedes Benz ")).toBe("mercedesbenz");
      expect(toNormalizedKey("MERCEDES   BENZ")).toBe("mercedesbenz");
      expect(toNormalizedKey("B.Y.D.")).toBe("byd");
      expect(toNormalizedKey("Citroën")).toBe("citroen");
      expect(toNormalizedKey("Model 3 (Long-Range)")).toBe("model3longrange");
    });
  });

  describe("formatCanonicalName", () => {
    test("preserves known acronyms", () => {
      expect(formatCanonicalName("byd")).toBe("BYD");
      expect(formatCanonicalName("bmw")).toBe("BMW");
      expect(formatCanonicalName("nio")).toBe("NIO");
      expect(formatCanonicalName("gac")).toBe("GAC");
    });

    test("formats standard title case names", () => {
      expect(formatCanonicalName("tesla")).toBe("Tesla");
      expect(formatCanonicalName("TESLA")).toBe("Tesla");
      expect(formatCanonicalName("mercedes-benz")).toBe("Mercedes-Benz");
      expect(formatCanonicalName("rolls-royce")).toBe("Rolls-Royce");
      expect(formatCanonicalName("lucid motors")).toBe("Lucid Motors");
    });

    test("formats alphanumeric model codes", () => {
      expect(formatCanonicalName("su7")).toBe("SU7");
      expect(formatCanonicalName("p7")).toBe("P7");
      expect(formatCanonicalName("model 3")).toBe("Model 3");
      expect(formatCanonicalName("ioniq 5")).toBe("Ioniq 5");
    });
  });

  describe("calculateLevenshteinDistance & similarity", () => {
    test("calculates distance correctly", () => {
      expect(calculateLevenshteinDistance("toyota", "toyota")).toBe(0);
      expect(calculateLevenshteinDistance("toyota", "toyoda")).toBe(1);
      expect(calculateLevenshteinDistance("volkswagen", "volkswagon")).toBe(1);
    });

    test("calculates high similarity for minor typos and reorderings", () => {
      expect(calculateStringSimilarity("volkswagon", "volkswagen")).toBeGreaterThan(0.85);
      expect(calculateStringSimilarity("toyoda", "toyota")).toBeGreaterThan(0.8);
      expect(calculateStringSimilarity("mercedes benz", "benz mercedes")).toBeGreaterThan(0.85);
    });
  });

  describe("checkDuplicateMake", () => {
    const existingMakes = [
      { make: "Mercedes-Benz", aliases: ["Merc", "Mercedes"] },
      { make: "BYD", aliases: ["Build Your Dreams"] },
      { make: "Tesla" },
      { make: "XPENG", aliases: ["XPeng"] },
      { make: "Toyota" },
      { make: "Volkswagen" },
    ];

    test("detects exact and case-insensitive duplicates", () => {
      const res1 = checkDuplicateMake("Tesla", existingMakes);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("exact");

      const res2 = checkDuplicateMake("TESLA", existingMakes);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchType).toBe("case_insensitive");

      const res3 = checkDuplicateMake("byd", existingMakes);
      expect(res3.isDuplicate).toBe(true);
      expect(res3.matchType).toBe("case_insensitive");
    });

    test("detects punctuation & normalized whitespace duplicates", () => {
      const res1 = checkDuplicateMake("Mercedes Benz", existingMakes);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("normalized");
      expect(res1.matchedItem).toBe("Mercedes-Benz");

      const res2 = checkDuplicateMake("mercedesbenz", existingMakes);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchType).toBe("normalized");

      const res3 = checkDuplicateMake("B.Y.D.", existingMakes);
      expect(res3.isDuplicate).toBe(true);
      expect(res3.matchType).toBe("normalized");
    });

    test("detects known aliases", () => {
      const res1 = checkDuplicateMake("Merc", existingMakes);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("alias");
      expect(res1.matchedItem).toBe("Mercedes-Benz");

      const res2 = checkDuplicateMake("XPeng", existingMakes);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchedItem).toBe("XPENG");
    });

    test("detects fuzzy typo pattern duplicates", () => {
      const res1 = checkDuplicateMake("Volkswagon", existingMakes);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("fuzzy");
      expect(res1.matchedItem).toBe("Volkswagen");

      const res2 = checkDuplicateMake("Toyoda", existingMakes);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchType).toBe("fuzzy");
      expect(res2.matchedItem).toBe("Toyota");
    });

    test("allows distinct genuine new makes", () => {
      const res1 = checkDuplicateMake("Lucid", existingMakes);
      expect(res1.isDuplicate).toBe(false);

      const res2 = checkDuplicateMake("Rivian", existingMakes);
      expect(res2.isDuplicate).toBe(false);

      const res3 = checkDuplicateMake("Zeekr", existingMakes);
      expect(res3.isDuplicate).toBe(false);

      const res4 = checkDuplicateMake("Xiaomi", existingMakes);
      expect(res4.isDuplicate).toBe(false);
    });
  });

  describe("checkDuplicateModel", () => {
    const existingModels = ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"];

    test("detects exact and case-insensitive model duplicates", () => {
      const res1 = checkDuplicateModel("Model 3", existingModels);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("exact");

      const res2 = checkDuplicateModel("model 3", existingModels);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchType).toBe("case_insensitive");

      const res3 = checkDuplicateModel("cybertruck", existingModels);
      expect(res3.isDuplicate).toBe(true);
      expect(res3.matchType).toBe("case_insensitive");
    });

    test("detects punctuation & spacing variations", () => {
      const res1 = checkDuplicateModel("Model-3", existingModels);
      expect(res1.isDuplicate).toBe(true);
      expect(res1.matchType).toBe("normalized");

      const res2 = checkDuplicateModel("Model3", existingModels);
      expect(res2.isDuplicate).toBe(true);
      expect(res2.matchType).toBe("normalized");

      const res3 = checkDuplicateModel("Cyber-Truck", existingModels);
      expect(res3.isDuplicate).toBe(true);
      expect(res3.matchType).toBe("normalized");
    });

    test("allows new distinct models", () => {
      const res1 = checkDuplicateModel("Roadster", existingModels);
      expect(res1.isDuplicate).toBe(false);

      const res2 = checkDuplicateModel("Semi", existingModels);
      expect(res2.isDuplicate).toBe(false);
    });
  });
});
