import carMakeCatalogJson from "../../store/car-make.json";

type CarMakeEntry = {
  Make: string;
  Models: string[];
};

const CAR_MAKE_CATALOG = carMakeCatalogJson as CarMakeEntry[];

const makeToModels = new Map<string, string[]>(
  CAR_MAKE_CATALOG.map((entry) => [entry.Make, entry.Models])
);

const MAKE_ALIASES: Record<string, string> = {
  XPeng: "XPENG",
  "GAC Aion": "GAC",
  "Hozon (Neta)": "Neta",
};

const OTHER_MAKE_VALUE = "Other";

const normalizeMake = (make: string): string => {
  const trimmed = make.trim();
  if (!trimmed) return "";
  if (makeToModels.has(trimmed)) return trimmed;
  return MAKE_ALIASES[trimmed] ?? trimmed;
};

const isValidMakeModel = (make: string, model: string): boolean => {
  const normalizedMake = normalizeMake(make);
  const trimmedModel = model.trim();
  if (!normalizedMake || !trimmedModel) return false;
  const models = makeToModels.get(normalizedMake);
  if (!models) return false;
  return models.includes(trimmedModel);
};

export const assertValidVehicleMakeModel = (make: string, model: string): void => {
  const trimmedMake = make.trim();
  const trimmedModel = model.trim();

  if (!trimmedMake || !trimmedModel) {
    throw new Error("Make and model are required.");
  }

  if (trimmedMake === OTHER_MAKE_VALUE) {
    if (trimmedModel.length < 1) {
      throw new Error("Model is required when using a custom make.");
    }
    return;
  }

  if (!isValidMakeModel(trimmedMake, trimmedModel)) {
    throw new Error("Invalid make and model combination. Please select from the catalog.");
  }
};
