"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save, Upload, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
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
import { useToast } from "@/hooks/use-toast";
import { VEHICLE_MAKES, CONDITION_OPTIONS, BATTERY_TYPES, CHARGING_TYPES } from "@/lib/constants";

type UploadStep = "basic" | "specs" | "condition" | "pricing" | "images";

interface VehicleFormData {
  // Basic Info
  make: string;
  model: string;
  year: number;
  vin: string;
  lotNumber: string;

  // EV Specs
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

const initialFormData: VehicleFormData = {
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

export default function VehicleUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<UploadStep>("basic");
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVehicle = useMutation(api.vehicles.createVehicle);

  const steps: UploadStep[] = ["basic", "specs", "condition", "pricing", "images"];
  const stepTitles: Record<UploadStep, string> = {
    basic: "Basic Information",
    specs: "EV Specifications",
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
      const newImages = Array.from(e.target.files);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload vehicles",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("voltbid_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // In a real implementation, you would upload images to Cloudinary first
      // For now, we'll use placeholder images
      const placeholderImages = [
        `https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=800&h=600&fit=crop`,
      ];

      await createVehicle({
        token,
        vehicleData: {
          make: formData.make,
          model: formData.model,
          year: formData.year,
          vin: formData.vin,
          lotNumber: formData.lotNumber,
          batteryCapacity: formData.batteryCapacity,
          batteryHealthPercent: formData.batteryHealthPercent,
          range: formData.range,
          batteryType: formData.batteryType,
          chargingTypes: formData.chargingTypes,
          motorPower: formData.motorPower,
          condition: formData.condition,
          odometer: formData.odometer,
          exteriorColor: formData.exteriorColor,
          interiorColor: formData.interiorColor,
          damageDescription: formData.damageDescription,
          startingBid: formData.startingBid,
          reservePrice: formData.reservePrice,
          buyItNowPrice: formData.buyItNowPrice,
          locationCity: formData.locationCity,
          locationState: formData.locationState,
          locationCountry: formData.locationCountry,
          imageUrls: placeholderImages,
        },
      });

      toast({
        title: "Success!",
        description: "Vehicle uploaded successfully and pending admin approval",
      });

      router.push("/vendor/vehicles");
    } catch (error) {
      console.error("Error uploading vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to upload vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Upload New Vehicle</h1>
        <p className="text-muted-foreground">
          Add a vehicle to your inventory for auction approval
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStepIndex
                    ? "bg-volt-green border-volt-green text-white"
                    : "bg-background border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span className="text-xs mt-2 text-center">
                {stepTitles[step]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-4 ${
                  index < currentStepIndex
                    ? "bg-volt-green"
                    : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <Card className="p-6">
        {currentStep === "basic" && (
          <div className="space-y-6">
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">EV Specifications</h2>

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
          <div className="space-y-6">
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
          <div className="space-y-6">
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Upload Images</h2>

            <div>
              <Label htmlFor="images">Vehicle Images</Label>
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

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-error-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-2">
                Note: Image upload to Cloudinary will be implemented in production. For now, placeholder images will be used.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
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
                "Uploading..."
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit for Approval
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
