import carMakeCatalogJson from "@/store/car-make.json";
import { toNormalizedKey, formatCanonicalName } from "@/lib/vehicle-dedup";

export type CarMakeEntry = {
  Make: string;
  Models: string[];
};

export const CAR_MAKE_CATALOG = carMakeCatalogJson as CarMakeEntry[];

export const CAR_MAKES = CAR_MAKE_CATALOG.map((entry) => entry.Make).sort((a, b) =>
  a.localeCompare(b)
);

/** Legacy DB / constants spellings → catalog make names */
export const MAKE_ALIASES: Record<string, string> = {
  XPeng: "XPENG",
  "GAC Aion": "GAC",
  "Hozon (Neta)": "Neta",
};

export const OTHER_MAKE_VALUE = "Other";

const makeToModels = new Map<string, string[]>(
  CAR_MAKE_CATALOG.map((entry) => [entry.Make, entry.Models])
);

const normalizedMakeToEntry = new Map<string, CarMakeEntry>(
  CAR_MAKE_CATALOG.map((entry) => [toNormalizedKey(entry.Make), entry])
);

const aliasToCatalogMake = new Map<string, string>(
  Object.entries(MAKE_ALIASES).map(([alias, catalogMake]) => [alias, catalogMake])
);

export const normalizeMake = (make: string): string => {
  const trimmed = make.trim();
  if (!trimmed) return "";
  if (makeToModels.has(trimmed)) return trimmed;
  if (aliasToCatalogMake.has(trimmed)) return aliasToCatalogMake.get(trimmed)!;
  const normKey = toNormalizedKey(trimmed);
  const matched = normalizedMakeToEntry.get(normKey);
  return matched ? matched.Make : trimmed;
};

export const getModelsForMake = (make: string): string[] => {
  const normalized = normalizeMake(make);
  return makeToModels.get(normalized) ?? [];
};

export const isCatalogMake = (make: string): boolean => {
  const normalized = normalizeMake(make);
  return makeToModels.has(normalized) || normalizedMakeToEntry.has(toNormalizedKey(make));
};

export type DynamicCatalogEntry = {
  make: string;
  models: string[];
  aliases?: string[];
};

const isModelInList = (model: string, models: string[]): boolean => {
  const trimmedModel = model.trim();
  if (!trimmedModel) return false;
  const normModelKey = toNormalizedKey(trimmedModel);
  return (
    models.includes(trimmedModel) ||
    models.some((m) => toNormalizedKey(m) === normModelKey)
  );
};

export const isValidMakeModel = (make: string, model: string): boolean => {
  const normalizedMake = normalizeMake(make);
  const trimmedModel = model.trim();
  if (!normalizedMake || !trimmedModel) return false;
  const models = makeToModels.get(normalizedMake);
  if (!models) return true; // Custom dynamic make
  return isModelInList(trimmedModel, models);
};

export const isValidMakeModelInMergedCatalog = (
  make: string,
  model: string,
  dynamicEntries?: DynamicCatalogEntry[]
): boolean => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();
  if (!trimmedMake || !trimmedModel) return false;

  const merged = mergeCatalog(dynamicEntries);
  const normalizedMake = normalizeMake(trimmedMake);
  const isKnownMake =
    merged.isMake(normalizedMake) ||
    merged.isMake(trimmedMake) ||
    isCatalogMake(normalizedMake);

  if (!isKnownMake) {
    return true;
  }

  const models = merged.getModels(normalizedMake);
  if (models.length === 0) {
    return true;
  }

  return isModelInList(trimmedModel, models);
};

export const isValidVehicleMakeModel = (
  make: string,
  model: string,
  options?: { allowOtherMake?: boolean; dynamicEntries?: DynamicCatalogEntry[] }
): boolean => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();
  if (!trimmedMake || !trimmedModel) return false;

  if (options?.allowOtherMake && trimmedMake === OTHER_MAKE_VALUE) {
    return trimmedModel.length > 0;
  }

  if (options?.dynamicEntries !== undefined) {
    return isValidMakeModelInMergedCatalog(trimmedMake, trimmedModel, options.dynamicEntries);
  }

  return isValidMakeModel(trimmedMake, trimmedModel);
};

export const resolveMakeModelForForm = (
  make: string,
  model: string,
  dynamicEntries?: DynamicCatalogEntry[]
): { make: string; model: string; isOtherMake: boolean } => {
  const normalizedMake = normalizeMake(make);
  const merged = mergeCatalog(dynamicEntries);
  const isKnownMake =
    merged.isMake(normalizedMake) ||
    merged.isMake(make) ||
    isCatalogMake(normalizedMake);

  if (isKnownMake) {
    const canonicalMake = isCatalogMake(normalizedMake)
      ? normalizedMake
      : merged.makes.find((entry) => toNormalizedKey(entry) === toNormalizedKey(normalizedMake)) ||
        normalizedMake;
    const models = merged.getModels(canonicalMake);
    const matchedModel = models.includes(model)
      ? model
      : models.find((m) => toNormalizedKey(m) === toNormalizedKey(model)) || model;
    return { make: canonicalMake, model: matchedModel, isOtherMake: false };
  }

  return { make: OTHER_MAKE_VALUE, model, isOtherMake: true };
};

/**
 * Merges static catalog with dynamic database entries into a unified lookup structure.
 */
export function mergeCatalog(
  dynamicEntries?: Array<{ make: string; models: string[]; aliases?: string[] }>
): {
  makes: string[];
  getModels: (make: string) => string[];
  isMake: (make: string) => boolean;
} {
  return buildMergedCatalog(dynamicEntries);
}

export function appendCatalogPatch(
  entries: DynamicCatalogEntry[] | undefined,
  patch: { make: string; model: string }
): DynamicCatalogEntry[] {
  const base = entries ? entries.map((entry) => ({ ...entry, models: [...entry.models] })) : [];
  const normalizedMake = toNormalizedKey(normalizeMake(patch.make));
  const normalizedModel = toNormalizedKey(patch.model);
  const existing = base.find((entry) => toNormalizedKey(entry.make) === normalizedMake);

  if (existing) {
    if (!existing.models.some((model) => toNormalizedKey(model) === normalizedModel)) {
      existing.models.push(patch.model);
      existing.models.sort((a, b) => a.localeCompare(b));
    }
    return base;
  }

  base.push({ make: normalizeMake(patch.make), models: [patch.model] });
  base.sort((a, b) => a.make.localeCompare(b.make));
  return base;
}

function buildMergedCatalog(
  dynamicEntries?: Array<{ make: string; models: string[]; aliases?: string[] }>
): {
  makes: string[];
  getModels: (make: string) => string[];
  isMake: (make: string) => boolean;
} {
  const makeMap = new Map<string, { canonical: string; models: string[] }>();

  // Add seed catalog
  for (const entry of CAR_MAKE_CATALOG) {
    const key = toNormalizedKey(entry.Make);
    makeMap.set(key, {
      canonical: entry.Make,
      models: [...entry.Models],
    });
  }

  // Overlay dynamic DB entries
  if (dynamicEntries && dynamicEntries.length > 0) {
    for (const entry of dynamicEntries) {
      const key = toNormalizedKey(entry.make);
      const existing = makeMap.get(key);
      if (existing) {
        for (const m of entry.models) {
          const normalizedModel = toNormalizedKey(m);
          if (!existing.models.some((existingModel) => toNormalizedKey(existingModel) === normalizedModel)) {
            existing.models.push(m);
          }
        }
        existing.models.sort((a, b) => a.localeCompare(b));
      } else {
        makeMap.set(key, {
          canonical: entry.make,
          models: [...entry.models].sort((a, b) => a.localeCompare(b)),
        });
      }
    }
  }

  const makes = Array.from(makeMap.values())
    .map((v) => v.canonical)
    .sort((a, b) => a.localeCompare(b));

  const getModels = (make: string): string[] => {
    const key = toNormalizedKey(make);
    const entry = makeMap.get(key);
    return entry ? entry.models : [];
  };

  const isMake = (make: string): boolean => {
    return makeMap.has(toNormalizedKey(make));
  };

  return { makes, getModels, isMake };
}
