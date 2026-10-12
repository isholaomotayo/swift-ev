import { ConvexError } from "convex/values";
import { toNormalizedKey, formatCanonicalName } from "./vehicleDedup";
import { CAR_MAKE_CATALOG, OTHER_MAKE_VALUE, normalizeMake, isValidMakeModel } from "../../lib/vehicle-catalog";

// Catalog data and make/model matching are defined once in lib/vehicle-catalog.ts.
export { normalizeMake, isValidMakeModel };

export const assertValidVehicleMakeModel = (make: string, model: string): void => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();

  if (!trimmedMake || !trimmedModel) {
    throw new ConvexError("Make and model are required.");
  }

  if (trimmedMake === OTHER_MAKE_VALUE) {
    if (trimmedModel.length < 1) {
      throw new ConvexError("Model is required when using a custom make.");
    }
    return;
  }

  // Non-empty custom or catalog make & model is allowed
  if (trimmedMake.length < 1 || trimmedModel.length < 1) {
    throw new ConvexError("Invalid make and model combination.");
  }
};

/**
 * Ensures that a make and model (e.g. uploaded during vehicle creation by a seller)
 * are stored in the vehicleCatalog table so other buyers and sellers can immediately find and use them.
 */
export const ensureMakeModelInCatalog = async (
  ctx: any,
  make: string,
  model: string,
  userId?: any,
  userRole?: string
): Promise<{ make: string; model: string }> => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();
  if (!trimmedMake || !trimmedModel || trimmedMake === OTHER_MAKE_VALUE) {
    return { make: trimmedMake, model: trimmedModel };
  }

  const canonicalMake = formatCanonicalName(trimmedMake);
  const normalizedMake = toNormalizedKey(canonicalMake);
  const canonicalModel = formatCanonicalName(trimmedModel);
  const normalizedModel = toNormalizedKey(canonicalModel);

  const existing = await ctx.db
    .query("vehicleCatalog")
    .withIndex("by_normalized_make", (q: any) => q.eq("normalizedMake", normalizedMake))
    .first();

  const now = Date.now();

  if (!existing) {
    const seed = CAR_MAKE_CATALOG.find(
      (s) => toNormalizedKey(s.Make) === normalizedMake
    );
    const initialModels = seed ? [...seed.Models] : [];
    if (!initialModels.some((m) => toNormalizedKey(m) === normalizedModel)) {
      initialModels.push(canonicalModel);
    }
    initialModels.sort((a, b) => a.localeCompare(b));

    await ctx.db.insert("vehicleCatalog", {
      make: seed ? seed.Make : canonicalMake,
      normalizedMake,
      models: initialModels,
      normalizedModels: initialModels.map(toNormalizedKey),
      aliases: [],
      createdBy: userId,
      creatorRole: (userRole as any) || "seller",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  } else {
    if (!existing.models.some((m: string) => toNormalizedKey(m) === normalizedModel)) {
      const updatedModels = [...existing.models, canonicalModel].sort((a: string, b: string) =>
        a.localeCompare(b)
      );
      await ctx.db.patch(existing._id, {
        models: updatedModels,
        normalizedModels: updatedModels.map(toNormalizedKey),
        updatedAt: now,
      });
    }
  }

  return { make: canonicalMake, model: canonicalModel };
};

