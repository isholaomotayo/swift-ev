export interface VehicleFormData {
  // Basic Info
  make: string;
  makeCustom?: string;
  model: string;
  year: number;
  vin?: string;

  // Fuel type
  fuelType: string;

  // Car Specs (EV-specific fields are optional for non-EV vehicles)
  batteryCapacity?: number;
  batteryHealthPercent?: number;
  range?: number;
  batteryType?: string;
  batteryTypeCustom?: string;
  chargingTypes?: string[];
  motorPower?: number;

  // Condition
  condition: string;
  odometer: number;
  exteriorColor: string;
  interiorColor: string;
  damageDescription: string;

  // Pricing
  startingBid: number;
  reservePrice: number;
  buyItNowPrice?: number;

  // Location
  locationCity: string;
  locationState: string;
  locationCountry: string;
  locationCountryCustom?: string;
}

export type VehicleSubmitData = Omit<
  VehicleFormData,
  "makeCustom" | "batteryTypeCustom" | "locationCountryCustom"
>;

export function sanitizeVehicleFormDataForSubmit(
  formData: VehicleFormData
): VehicleSubmitData {
  const {
    makeCustom,
    batteryTypeCustom,
    locationCountryCustom,
    ...submitData
  } = formData;

  return {
    ...submitData,
    make: formData.make === "Other" ? (makeCustom?.trim() || "") : formData.make,
    model: formData.model.trim(),
    batteryType:
      formData.batteryType === "Other"
        ? (batteryTypeCustom?.trim() || "Other")
        : formData.batteryType,
    locationCountry:
      formData.locationCountry === "Other"
        ? (locationCountryCustom?.trim() || "Other")
        : formData.locationCountry,
  };
}
