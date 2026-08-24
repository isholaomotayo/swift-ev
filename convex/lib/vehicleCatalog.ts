import { ConvexError } from "convex/values";
import carMakeCatalogJson from "../../store/car-make.json";
import { toNormalizedKey, formatCanonicalName } from "./vehicleDedup";

type CarMakeEntry = {
  Make: string;
  Models: string[];
};

const CAR_MAKE_CATALOG = carMakeCatalogJson as CarMakeEntry[];

const makeToModels = new Map<string, string[]>(
  CAR_MAKE_CATALOG.map((entry) => [entry.Make, entry.Models])
);

const normalizedMakeToEntry = new Map<string, CarMakeEntry>(
  CAR_MAKE_CATALOG.map((entry) => [toNormalizedKey(entry.Make), entry])
);

const MAKE_ALIASES: Record<string, string> = {
  XPeng: "XPENG",
  "GAC Aion": "GAC",
  "Hozon (Neta)": "Neta",
};

const OTHER_MAKE_VALUE = "Other";

export const normalizeMake = (make: string): string => {
  const trimmed = make.trim();
  if (!trimmed) return "";
  if (makeToModels.has(trimmed)) return trimmed;
  if (MAKE_ALIASES[trimmed]) return MAKE_ALIASES[trimmed];
  const normKey = toNormalizedKey(trimmed);
  const matched = normalizedMakeToEntry.get(normKey);
  return matched ? matched.Make : trimmed;
};

export const isValidMakeModel = (make: string, model: string): boolean => {
  const normalizedMake = normalizeMake(make);
  const trimmedModel = model.trim();
  if (!normalizedMake || !trimmedModel) return false;
  const models = makeToModels.get(normalizedMake);
  if (!models) return true; // Custom dynamic make allowed in DB
  const normModelKey = toNormalizedKey(trimmedModel);
  return (
    models.includes(trimmedModel) ||
    models.some((m) => toNormalizedKey(m) === normModelKey)
  );
};

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

