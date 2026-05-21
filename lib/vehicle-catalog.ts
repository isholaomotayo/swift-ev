import carMakeCatalogJson from "@/store/car-make.json";

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

const aliasToCatalogMake = new Map<string, string>(
  Object.entries(MAKE_ALIASES).map(([alias, catalogMake]) => [alias, catalogMake])
);

export const normalizeMake = (make: string): string => {
  const trimmed = make.trim();
  if (!trimmed) return "";
  if (makeToModels.has(trimmed)) return trimmed;
  return aliasToCatalogMake.get(trimmed) ?? trimmed;
};

export const getModelsForMake = (make: string): string[] => {
  const normalized = normalizeMake(make);
  return makeToModels.get(normalized) ?? [];
};

export const isCatalogMake = (make: string): boolean => {
  const normalized = normalizeMake(make);
  return makeToModels.has(normalized);
};

export const isValidMakeModel = (make: string, model: string): boolean => {
  const normalizedMake = normalizeMake(make);
  const trimmedModel = model.trim();
  if (!normalizedMake || !trimmedModel) return false;
  const models = makeToModels.get(normalizedMake);
  if (!models) return false;
  return models.includes(trimmedModel);
};

export const isValidVehicleMakeModel = (
  make: string,
  model: string,
  options?: { allowOtherMake?: boolean }
): boolean => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();
  if (!trimmedMake || !trimmedModel) return false;

  if (options?.allowOtherMake && trimmedMake === OTHER_MAKE_VALUE) {
    return trimmedModel.length > 0;
  }

  return isValidMakeModel(trimmedMake, trimmedModel);
};

export const resolveMakeModelForForm = (
  make: string,
  model: string
): { make: string; model: string; isOtherMake: boolean } => {
  const normalizedMake = normalizeMake(make);
  if (isCatalogMake(normalizedMake)) {
    const models = getModelsForMake(normalizedMake);
    const matchedModel = models.includes(model) ? model : "";
    return { make: normalizedMake, model: matchedModel, isOtherMake: false };
  }
  return { make: OTHER_MAKE_VALUE, model, isOtherMake: true };
};
