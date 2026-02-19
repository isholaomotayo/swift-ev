"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { VEHICLE_MAKES, CONDITION_OPTIONS, BATTERY_TYPES, CHARGING_TYPES, FUEL_TYPES, COUNTRIES } from "@/lib/constants";

export type UploadStep = "basic" | "specs" | "condition" | "pricing" | "images";
type UploadRole = "required_image" | "optional_image" | "inspection_report" | "video_walkthrough";
type TaggedUploadFile = File & {
  __mediaRole?: UploadRole;
  __category?: string;
};

const REQUIRED_IMAGE_CATEGORIES = ["Front View", "Rear View", "Driver Side", "Interior (Dashboard)"] as const;
const OPTIONAL_IMAGE_CATEGORIES = ["Passenger Side", "Engine Bay"] as const;

const getRegionLabel = (country: string) => {
  switch (country) {
    case "China":
    case "Canada":
      return "Province";
    case "United Kingdom":
      return "County / Region";
    case "United States":
      return "State";
    default:
      return "State / Region";
  }
};

export interface VehicleFormData {
  // Basic Info
  make: string;
  makeCustom?: string;
  model: string;
  year: number;
  vin: string;

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

export const initialFormData: VehicleFormData = {
  make: "",
  makeCustom: "",
  model: "",
  year: new Date().getFullYear(),
  vin: "",
  fuelType: "EV (Electric)",
  batteryCapacity: 0,
  batteryHealthPercent: 100,
  range: 0,
  batteryType: "",
  batteryTypeCustom: "",
  chargingTypes: [],
  motorPower: 0,
  condition: "",
  odometer: 0,
  exteriorColor: "",
  interiorColor: "",
  damageDescription: "",
  startingBid: 0,
  reservePrice: 0,
  locationCity: "",
  locationState: "",
  locationCountry: "Nigeria",
  locationCountryCustom: "",
};

interface VehicleFormProps {
  initialData?: VehicleFormData;
  initialImages?: any[];
  isSubmitting: boolean;
  onSubmit: (data: VehicleFormData, images: File[], deletedImageIds: string[]) => void;
  submitButtonText?: string;
  showSteps?: boolean;
}

export function VehicleForm({
  initialData = initialFormData,
  initialImages = [],
  isSubmitting,
  onSubmit,
  submitButtonText = "Submit",
  showSteps = true,
}: VehicleFormProps) {
  const [currentStep, setCurrentStep] = useState<UploadStep>("basic");
  const [formData, setFormData] = useState<VehicleFormData>(initialData);
  
  // Manage new file uploads
  const [newImages, setNewImages] = useState<TaggedUploadFile[]>([]);
  
  // Manage existing images (for edit mode)
  const [existingImages, setExistingImages] = useState<any[]>(initialImages);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // Commission terms acceptance
  const [acceptedCommission, setAcceptedCommission] = useState(false);

  // Categorized image uploads
  const [categoryImages, setCategoryImages] = useState<Record<string, File | null>>({});
  const [inspectionReport, setInspectionReport] = useState<File | null>(null);
  const [videoWalkthrough, setVideoWalkthrough] = useState<File | null>(null);
  const isEditMode = initialImages.length > 0;

  const tagFile = (file: File, role: UploadRole, category?: string) =>
    Object.assign(file, { __mediaRole: role, __category: category }) as TaggedUploadFile;

  const upsertTaggedUpload = (matchFn: (file: TaggedUploadFile) => boolean, nextFile: TaggedUploadFile | null) => {
    setNewImages((prev) => {
      const filtered = prev.filter((file) => !matchFn(file));
      if (!nextFile) return filtered;
      return [...filtered, nextFile];
    });
  };

  const handleCategoryUpload = (category: string, file: File | null) => {
    setCategoryImages((prev) => ({ ...prev, [category]: file }));
    const role: UploadRole = REQUIRED_IMAGE_CATEGORIES.includes(category as (typeof REQUIRED_IMAGE_CATEGORIES)[number])
      ? "required_image"
      : "optional_image";
    upsertTaggedUpload(
      (img) => img.__category === category,
      file ? tagFile(file, role, category) : null
    );
  };

  const handleInspectionUpload = (file: File | null) => {
    setInspectionReport(file);
    upsertTaggedUpload(
      (img) => img.__mediaRole === "inspection_report",
      file ? tagFile(file, "inspection_report") : null
    );
  };

  const handleVideoUpload = (file: File | null) => {
    setVideoWalkthrough(file);
    upsertTaggedUpload(
      (img) => img.__mediaRole === "video_walkthrough",
      file ? tagFile(file, "video_walkthrough") : null
    );
  };

  const requiredPhotosUploaded = REQUIRED_IMAGE_CATEGORIES.every((cat) => !!categoryImages[cat]);
  const hasExistingRequiredPhotoCoverage = existingImages.length >= REQUIRED_IMAGE_CATEGORIES.length;
  const requiresWalkthroughVideo = !isEditMode;
  const hasRequiredWalkthroughVideo = !requiresWalkthroughVideo || !!videoWalkthrough;
  const allRequiredUploaded =
    (requiredPhotosUploaded || hasExistingRequiredPhotoCoverage) && hasRequiredWalkthroughVideo;

  const steps: UploadStep[] = ["basic", "specs", "condition", "pricing", "images"];
  const stepTitles: Record<UploadStep, string> = {
    basic: "Basic Information",
    specs: "Car Specifications",
    condition: "Condition & Details",
    pricing: "Pricing",
    images: "Upload Images",
  };

  const currentStepIndex = steps.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const updateFormData = (field: keyof VehicleFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img._id !== id));
    setDeletedImageIds((prev) => [...prev, id]);
  };

  const handleSubmit = () => {
    // Resolve "Other" values before submitting
    const resolvedData = {
      ...formData,
      make: formData.make === "Other" ? (formData.makeCustom || "Other") : formData.make,
      batteryType: formData.batteryType === "Other" ? (formData.batteryTypeCustom || "Other") : formData.batteryType,
      locationCountry:
        formData.locationCountry === "Other"
          ? (formData.locationCountryCustom || "Other")
          : formData.locationCountry,
    };
    onSubmit(resolvedData, newImages, deletedImageIds);
  };

  const isEV = formData.fuelType === "EV (Electric)" || formData.fuelType === "Hybrid";
  const regionLabel = getRegionLabel(formData.locationCountry);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      {showSteps && (
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4 md:pb-0">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex items-center min-w-[80px] ${index < steps.length - 1 ? "flex-1" : ""}`}
            >
              <div className="flex flex-col items-center w-full">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 text-sm md:text-base cursor-pointer hover:opacity-80 transition-all ${
                    index <= currentStepIndex
                      ? "bg-volt-green border-volt-green text-white"
                      : "bg-background border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => setCurrentStep(step)}
                >
                  {index + 1}
                </div>
                <span className="text-[10px] md:text-xs mt-2 text-center hidden md:block">
                  {stepTitles[step]}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 md:mx-4 ${
                    index < currentStepIndex
                      ? "bg-volt-green"
                      : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Content */}
      <Card className="p-6">
        {currentStep === "basic" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="fuelType">Fuel / Engine Type</Label>
                <Select
                  value={formData.fuelType}
                  onValueChange={(value) => updateFormData("fuelType", value)}
                >
                  <SelectTrigger id="fuelType">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="make">Make</Label>
                <Select
                  value={formData.make}
                  onValueChange={(value) => updateFormData("make", value)}
                >
                  <SelectTrigger id="make">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_MAKES.map((make) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {formData.make === "Other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter manufacturer name"
                    value={formData.makeCustom || ""}
                    onChange={(e) => updateFormData("makeCustom", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => updateFormData("model", e.target.value)}
                  placeholder="e.g., Model 3"
                />
              </div>

              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => updateFormData("year", Number(e.target.value) || 2014)}
                  min={2014}
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => updateFormData("vin", e.target.value.toUpperCase())}
                  placeholder="17-character VIN"
                  maxLength={17}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="lotNumber">Lot Number</Label>
                <Input
                  id="lotNumber"
                  value="Auto-generated by system"
                  readOnly
                  className="font-mono bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">Assigned automatically upon submission</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === "specs" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Car Specifications</h2>
            {!isEV && (
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                EV-specific fields (battery, range, charging) are hidden for {formData.fuelType} vehicles.
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isEV && (
                <>
                  <div>
                    <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
                    <Input
                      id="batteryCapacity"
                      type="number"
                      value={formData.batteryCapacity ?? ""}
                      onChange={(e) => updateFormData("batteryCapacity", parseFloat(e.target.value))}
                      step="0.1"
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="batteryHealthPercent">Battery Health (%)</Label>
                    <Input
                      id="batteryHealthPercent"
                      type="number"
                      value={formData.batteryHealthPercent ?? ""}
                      onChange={(e) => updateFormData("batteryHealthPercent", parseInt(e.target.value))}
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="range">Range (km)</Label>
                    <Input
                      id="range"
                      type="number"
                      value={formData.range ?? ""}
                      onChange={(e) => updateFormData("range", parseInt(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="motorPower">Motor Power (kW)</Label>
                    <Input
                      id="motorPower"
                      type="number"
                      value={formData.motorPower ?? ""}
                      onChange={(e) => updateFormData("motorPower", parseInt(e.target.value))}
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="batteryType">Battery Type</Label>
                    <Select
                      value={formData.batteryType || ""}
                      onValueChange={(value) => updateFormData("batteryType", value)}
                    >
                      <SelectTrigger id="batteryType">
                        <SelectValue placeholder="Select battery type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BATTERY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.batteryType === "Other" && (
                      <Input
                        className="mt-2"
                        placeholder="Enter battery type"
                        value={formData.batteryTypeCustom || ""}
                        onChange={(e) => updateFormData("batteryTypeCustom", e.target.value)}
                      />
                    )}
                  </div>

                  <div>
                    <Label>Charging Types (select multiple)</Label>
                    <div className="space-y-2 mt-2">
                      {CHARGING_TYPES.map((type) => (
                        <label key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={(formData.chargingTypes || []).includes(type)}
                            onChange={(e) => {
                              const current = formData.chargingTypes || [];
                              if (e.target.checked) {
                                updateFormData("chargingTypes", [...current, type]);
                              } else {
                                updateFormData(
                                  "chargingTypes",
                                  current.filter((t) => t !== type)
                                );
                              }
                            }}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentStep === "condition" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Condition & Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => updateFormData("condition", value)}
                >
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="odometer">Odometer (km)</Label>
                <Input
                  id="odometer"
                  type="number"
                  value={formData.odometer}
                  onChange={(e) => updateFormData("odometer", Number(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="exteriorColor">Exterior Color</Label>
                <Input
                  id="exteriorColor"
                  value={formData.exteriorColor}
                  onChange={(e) => updateFormData("exteriorColor", e.target.value)}
                  placeholder="e.g., Pearl White"
                />
              </div>

              <div>
                <Label htmlFor="interiorColor">Interior Color</Label>
                <Input
                  id="interiorColor"
                  value={formData.interiorColor}
                  onChange={(e) => updateFormData("interiorColor", e.target.value)}
                  placeholder="e.g., Black"
                />
              </div>

              <div>
                <Label htmlFor="locationCountry">Country</Label>
                <Select
                  value={formData.locationCountry}
                  onValueChange={(value) => updateFormData("locationCountry", value)}
                >
                  <SelectTrigger id="locationCountry">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.locationCountry === "Other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter country name"
                    value={formData.locationCountryCustom || ""}
                    onChange={(e) => updateFormData("locationCountryCustom", e.target.value)}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="locationState">{regionLabel}</Label>
                <Input
                  id="locationState"
                  value={formData.locationState}
                  onChange={(e) => updateFormData("locationState", e.target.value)}
                  placeholder={
                    regionLabel === "Province"
                      ? "e.g., Guangdong"
                      : regionLabel === "State"
                      ? "e.g., California"
                      : "e.g., Lagos State"
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="locationCity">City</Label>
                <Input
                  id="locationCity"
                  value={formData.locationCity}
                  onChange={(e) => updateFormData("locationCity", e.target.value)}
                  placeholder="e.g., Lagos"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="damageDescription">Damage Description (if any)</Label>
                <Textarea
                  id="damageDescription"
                  value={formData.damageDescription}
                  onChange={(e) => updateFormData("damageDescription", e.target.value)}
                  placeholder="Describe any damage, scratches, or issues..."
                  rows={4}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === "pricing" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Pricing</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="startingBid">Starting Bid (₦)</Label>
                <Input
                  id="startingBid"
                  type="number"
                  value={formData.startingBid}
                  onChange={(e) => updateFormData("startingBid", Number(e.target.value) || 0)}
                  min="0"
                  step="100000"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum bid to start the auction
                </p>
              </div>

              <div>
                <Label htmlFor="reservePrice">Reserve Price (₦)</Label>
                <Input
                  id="reservePrice"
                  type="number"
                  value={formData.reservePrice}
                  onChange={(e) => updateFormData("reservePrice", Number(e.target.value) || 0)}
                  min="0"
                  step="100000"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum price you'll accept (hidden from buyers)
                </p>
              </div>

              <div>
                <Label htmlFor="buyItNowPrice">Buy It Now Price (₦) - Optional</Label>
                <Input
                  id="buyItNowPrice"
                  type="number"
                  value={formData.buyItNowPrice || ""}
                  onChange={(e) =>
                    updateFormData("buyItNowPrice", e.target.value ? Number(e.target.value) : undefined)
                  }
                  min="0"
                  step="100000"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Price to purchase immediately without bidding
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-xl border border-border mt-2">
                  <Checkbox
                    id="commissionTerms"
                    checked={acceptedCommission}
                    onCheckedChange={(checked) => setAcceptedCommission(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="commissionTerms" className="text-sm leading-relaxed cursor-pointer text-muted-foreground">
                    I agree to the platform commission structure: <strong className="text-foreground">7%</strong> for bids up to ₦5M,{" "}
                    <strong className="text-foreground">6%</strong> for bids up to ₦15M, and{" "}
                    <strong className="text-foreground">5%</strong> for bids above ₦15M.
                    Deducted from the final sale amount upon successful auction completion.
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === "images" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Vehicle Media</h2>
            <p className="text-sm text-muted-foreground">
              Upload photos for each required angle{requiresWalkthroughVideo ? " and one walkthrough video" : ""}. All <span className="text-error-red font-semibold">Required</span> items must be filled before submitting.
            </p>

            {/* Existing Images (edit mode) */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-3">Existing Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {existingImages.map((image) => (
                    <div key={image._id} className="relative group">
                      <img src={image.url} alt="Vehicle" className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image._id)}
                        className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Categories */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Required Photos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {REQUIRED_IMAGE_CATEGORIES.map((category) => {
                  const file = categoryImages[category];
                  const inputId = `cat-${category.replace(/\s+/g, "-")}`;
                  return (
                    <div key={category} className={`border-2 rounded-xl p-3 transition-colors ${file ? "border-volt-green/60 bg-volt-green/5" : "border-dashed border-error-red/40 bg-error-red/5"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">{category}</Label>
                        <span className="text-xs text-error-red font-bold">Required</span>
                      </div>
                      {file ? (
                        <div className="relative group">
                          <img src={URL.createObjectURL(file)} alt={category} className="w-full h-28 object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => handleCategoryUpload(category, null)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={inputId} className="flex flex-col items-center justify-center h-28 border border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Click to upload</span>
                          <input id={inputId} type="file" className="hidden" accept="image/*" onChange={(e) => handleCategoryUpload(category, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional Categories */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Optional Photos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {OPTIONAL_IMAGE_CATEGORIES.map((category) => {
                  const file = categoryImages[category];
                  const inputId = `cat-${category.replace(/\s+/g, "-")}`;
                  return (
                    <div key={category} className={`border-2 rounded-xl p-3 transition-colors ${file ? "border-volt-green/60 bg-volt-green/5" : "border-dashed border-border"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">{category}</Label>
                        <span className="text-xs text-muted-foreground">Optional</span>
                      </div>
                      {file ? (
                        <div className="relative group">
                          <img src={URL.createObjectURL(file)} alt={category} className="w-full h-28 object-cover rounded-lg" />
                          <button type="button" onClick={() => handleCategoryUpload(category, null)} className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={inputId} className="flex flex-col items-center justify-center h-28 border border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Click to upload</span>
                          <input id={inputId} type="file" className="hidden" accept="image/*" onChange={(e) => handleCategoryUpload(category, e.target.files?.[0] || null)} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Walkthrough */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Video Walkthrough</Label>
                <span className={`text-xs font-bold ${requiresWalkthroughVideo ? "text-error-red" : "text-muted-foreground"}`}>
                  {requiresWalkthroughVideo ? "Required" : "Optional"}
                </span>
              </div>
              <div className={`border-2 rounded-xl p-3 transition-colors ${videoWalkthrough ? "border-volt-green/60 bg-volt-green/5" : requiresWalkthroughVideo ? "border-dashed border-error-red/40 bg-error-red/5" : "border-dashed border-border"}`}>
                {videoWalkthrough ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{videoWalkthrough.name}</span>
                    <button type="button" onClick={() => handleVideoUpload(null)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="videoWalkthrough" className="flex flex-col items-center justify-center h-20 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg">
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload walkthrough video</span>
                    <input id="videoWalkthrough" type="file" className="hidden" accept="video/*" onChange={(e) => handleVideoUpload(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>

            {/* Inspection Report */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Inspection Report</Label>
                <span className="text-xs text-muted-foreground">Optional — PDF, JPG, or PNG</span>
              </div>
              <div className={`border-2 rounded-xl p-3 transition-colors ${inspectionReport ? "border-volt-green/60 bg-volt-green/5" : "border-dashed border-border"}`}>
                {inspectionReport ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{inspectionReport.name}</span>
                    <button type="button" onClick={() => handleInspectionUpload(null)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="inspectionReport" className="flex flex-col items-center justify-center h-20 cursor-pointer hover:bg-muted/30 transition-colors rounded-lg">
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload inspection report</span>
                    <input id="inspectionReport" type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleInspectionUpload(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>

            {!allRequiredUploaded && (
              <p className="text-sm text-error-red font-medium">
                Please upload all required photos{requiresWalkthroughVideo ? " and the walkthrough video" : ""} before submitting.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0 py-4 z-10">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {!isLastStep ? (
            <Button onClick={handleNext} className="bg-electric-blue hover:bg-electric-blue-dark text-white">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !acceptedCommission || !allRequiredUploaded}
              title={
                !acceptedCommission
                  ? "Please accept the commission terms in the Pricing step"
                  : !allRequiredUploaded
                  ? `Please upload all required vehicle photos${requiresWalkthroughVideo ? " and walkthrough video" : ""}`
                  : undefined
              }
              className="bg-electric-blue hover:bg-electric-blue-dark text-white"
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {submitButtonText}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
