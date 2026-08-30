export const CANONICAL_FUEL_TYPES = [
  "Internal Combustion Engine (ICE)",
  "Mild Hybrid (MHEV)",
  "Full Hybrid (HEV)",
  "Plug-in Hybrid (PHEV)",
  "Battery Electric Vehicle (BEV / EV)",
  "Hydrogen Fuel Cell (FCEV)",
  "Solar",
] as const;

export type CanonicalFuelType = (typeof CANONICAL_FUEL_TYPES)[number];

export const FUEL_TYPE_ALIASES: Record<CanonicalFuelType, string[]> = {
  "Battery Electric Vehicle (BEV / EV)": [
    "Battery Electric Vehicle (BEV / EV)",
    "EV (Electric)",
    "Electric",
    "EV",
    "BEV",
    "BEV / EV",
  ],
  "Full Hybrid (HEV)": ["Full Hybrid (HEV)", "Hybrid", "HEV"],
  "Mild Hybrid (MHEV)": ["Mild Hybrid (MHEV)", "MHEV"],
  "Plug-in Hybrid (PHEV)": ["Plug-in Hybrid (PHEV)", "PHEV", "Plug-in Hybrid"],
  "Internal Combustion Engine (ICE)": [
    "Internal Combustion Engine (ICE)",
    "Gas/Petrol",
    "Gas",
    "Petrol",
    "Diesel",
    "ICE",
  ],
  "Hydrogen Fuel Cell (FCEV)": ["Hydrogen Fuel Cell (FCEV)", "FCEV", "Hydrogen"],
  "Solar": ["Solar"],
};

export const ALL_ALLOWED_FUEL_TYPES: Set<string> = new Set(
  Object.values(FUEL_TYPE_ALIASES).flatMap((aliases) => aliases.map((a) => a.toLowerCase()))
);

export function normalizeFuelType(fuelType?: string | null): string {
  if (!fuelType) return "Battery Electric Vehicle (BEV / EV)";
  const trimmed = fuelType.trim();
  if (!trimmed) return "Battery Electric Vehicle (BEV / EV)";

  for (const [canonical, aliases] of Object.entries(FUEL_TYPE_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      return canonical;
    }
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("bev") || (lower.includes("electric") && !lower.includes("hybrid"))) {
    return "Battery Electric Vehicle (BEV / EV)";
  }
  if (lower.includes("phev") || lower.includes("plug-in")) {
    return "Plug-in Hybrid (PHEV)";
  }
  if (lower.includes("mhev") || lower.includes("mild")) {
    return "Mild Hybrid (MHEV)";
  }
  if (lower.includes("hybrid") || lower.includes("hev")) {
    return "Full Hybrid (HEV)";
  }
  if (lower.includes("hydrogen") || lower.includes("fcev")) {
    return "Hydrogen Fuel Cell (FCEV)";
  }
  if (lower.includes("gas") || lower.includes("petrol") || lower.includes("diesel") || lower.includes("ice")) {
    return "Internal Combustion Engine (ICE)";
  }
  if (lower.includes("solar")) {
    return "Solar";
  }

  return trimmed;
}

export function getFuelTypeSearchValues(fuelType: string): string[] {
  const norm = normalizeFuelType(fuelType);
  if (norm in FUEL_TYPE_ALIASES) {
    return FUEL_TYPE_ALIASES[norm as CanonicalFuelType];
  }
  return [fuelType];
}
