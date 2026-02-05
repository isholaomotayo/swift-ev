"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { VEHICLE_MAKES, CONDITION_OPTIONS, BATTERY_TYPES, CHARGING_TYPES } from "@/lib/constants";

export type UploadStep = "basic" | "specs" | "condition" | "pricing" | "images";

export interface VehicleFormData {
  // Basic Info
  make: string;
  model: string;
  year: number;
  vin: string;
  lotNumber: string;

  // Car Specs
  batteryCapacity: number;
  batteryHealthPercent: number;
  range: number;
  batteryType: string;
  chargingTypes: string[];
  motorPower: number;

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
}

export const initialFormData: VehicleFormData = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  vin: "",
  lotNumber: "",
  batteryCapacity: 0,
  batteryHealthPercent: 100,
  range: 0,
  batteryType: "",
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
  const [newImages, setNewImages] = useState<File[]>([]);
  
  // Manage existing images (for edit mode)
  const [existingImages, setExistingImages] = useState<any[]>(initialImages);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const addedFiles = Array.from(e.target.files);
      setNewImages((prev) => [...prev, ...addedFiles]);
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img._id !== id));
    setDeletedImageIds((prev) => [...prev, id]);
  };

  const handleSubmit = () => {
    onSubmit(formData, newImages, deletedImageIds);
  };

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
                  </SelectContent>
                </Select>
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
                  onChange={(e) => updateFormData("year", parseInt(e.target.value))}
                  min={2010}
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
                  value={formData.lotNumber}
                  onChange={(e) => updateFormData("lotNumber", e.target.value.toUpperCase())}
                  placeholder="e.g., VB-000123"
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === "specs" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Car Specifications</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
                <Input
                  id="batteryCapacity"
                  type="number"
                  value={formData.batteryCapacity}
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
                  value={formData.batteryHealthPercent}
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
                  value={formData.range}
                  onChange={(e) => updateFormData("range", parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="motorPower">Motor Power (kW)</Label>
                <Input
                  id="motorPower"
                  type="number"
                  value={formData.motorPower}
                  onChange={(e) => updateFormData("motorPower", parseInt(e.target.value))}
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="batteryType">Battery Type</Label>
                <Select
                  value={formData.batteryType}
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
              </div>

              <div>
                <Label>Charging Types (select multiple)</Label>
                <div className="space-y-2 mt-2">
                  {CHARGING_TYPES.map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.chargingTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData("chargingTypes", [...formData.chargingTypes, type]);
                          } else {
                            updateFormData(
                              "chargingTypes",
                              formData.chargingTypes.filter((t) => t !== type)
                            );
                          }
                        }}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
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
                  onChange={(e) => updateFormData("odometer", parseInt(e.target.value))}
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

              <div className="md:col-span-2">
                <Label htmlFor="locationCity">Location City</Label>
                <Input
                  id="locationCity"
                  value={formData.locationCity}
                  onChange={(e) => updateFormData("locationCity", e.target.value)}
                  placeholder="e.g., Lagos"
                />
              </div>

              <div>
                <Label htmlFor="locationState">State</Label>
                <Input
                  id="locationState"
                  value={formData.locationState}
                  onChange={(e) => updateFormData("locationState", e.target.value)}
                  placeholder="e.g., Lagos State"
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
                  onChange={(e) => updateFormData("startingBid", parseInt(e.target.value))}
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
                  onChange={(e) => updateFormData("reservePrice", parseInt(e.target.value))}
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
                    updateFormData("buyItNowPrice", e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  min="0"
                  step="100000"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Price to purchase immediately without bidding
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === "images" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-semibold mb-4">Vehicle Images</h2>

            <div>
              <Label htmlFor="images">Upload Images</Label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label
                  htmlFor="images"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or WEBP (MAX. 5MB per file)
                    </p>
                  </div>
                  <input
                    id="images"
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">Existing Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((image) => (
                      <div key={image._id} className="relative group">
                        <img
                          src={image.url}
                          alt="Vehicle"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(image._id)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">New Uploads</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {newImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-4">
                Note: In production, images will be uploaded to a CDN like Cloudinary.
              </p>
            </div>
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
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-volt-green hover:bg-volt-green/90"
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
