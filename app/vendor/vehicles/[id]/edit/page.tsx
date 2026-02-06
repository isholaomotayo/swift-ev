"use client";

import { use, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { VehicleForm, VehicleFormData } from "@/components/vendor/vehicle-form";
import { Id } from "@/convex/_generated/dataModel";

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

export default function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = use(params);
  const vehicleId = id as Id<"vehicles">;
  
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicle data
  const vehicle = useQuery(api.vehicles.getVehicleById, { vehicleId });
  const updateVehicle = useMutation(api.vehicles.updateVehicle);

  const [initialData, setInitialData] = useState<VehicleFormData | null>(null);

  useEffect(() => {
    if (vehicle) {
      // Map vehicle data to form data
      setInitialData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        lotNumber: vehicle.lotNumber,
        batteryCapacity: vehicle.batteryCapacity,
        batteryHealthPercent: vehicle.batteryHealthPercent || 100,
        range: vehicle.estimatedRange, // Map estimatedRange to range
        batteryType: (vehicle as any).batteryType ?? "",
        chargingTypes: vehicle.chargingType ?? [], // Map chargingType (array) to chargingTypes
        motorPower: vehicle.motorPower ?? 0,
        condition: vehicle.condition,
        odometer: vehicle.odometer,
        exteriorColor: vehicle.exteriorColor,
        interiorColor: vehicle.interiorColor || "",
        damageDescription: vehicle.damageDescription || "",
        startingBid: vehicle.startingBid ?? 0,
        reservePrice: vehicle.reservePrice ?? 0,
        buyItNowPrice: vehicle.buyItNowPrice,
        locationCity: vehicle.currentLocation?.city || "",
        locationState: "", // Not stored explicitly, might need to extract or leave blank
        locationCountry: vehicle.currentLocation?.country || "Nigeria",
      });
    }
  }, [vehicle]);

  const handleSubmit = async (formData: VehicleFormData, _newImages: File[], _deletedImageIds: string[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to edit vehicles",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("autoexports_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Handle image deletion if needed (not yet implemented in backend properly for individual deletions via update, 
      // but updateVehicle handles replacing everything if imageUrls is provided.
      // Current updateVehicle implementation replaces ALL images if imageUrls is provided.
      // So we need to gather ALL valid image URLs (existing - deleted + new).
      
      // For now, let's keep it simple: we aren't handling full image re-upload logic here correctly without cloud storage.
      // But we can update text fields.
      
      // Construct updates object
      const updates = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        vin: formData.vin,
        lotNumber: formData.lotNumber,
        batteryCapacity: formData.batteryCapacity,
        batteryHealthPercent: formData.batteryHealthPercent,
        estimatedRange: formData.range, // Frontend 'range' -> Backend 'estimatedRange'
        batteryType: formData.batteryType,
        chargingType: formData.chargingTypes,
        motorPower: formData.motorPower,
        condition: formData.condition as any,
        odometer: formData.odometer,
        exteriorColor: formData.exteriorColor,
        interiorColor: formData.interiorColor,
        damageDescription: formData.damageDescription,
        startingBid: formData.startingBid,
        reservePrice: formData.reservePrice,
        buyItNowPrice: formData.buyItNowPrice,
        buyItNowEnabled: !!formData.buyItNowPrice,
        currentLocation: {
          facility: user.vendorCompany || "Vendor Facility",
          city: formData.locationCity,
          country: formData.locationCountry,
        },
        // We are NOT sending imageUrls here to avoid wiping existing images
        // unless we have new images to handle. 
        // Real implementation would upload newImages, get URLs, combine with filtered existing images, and send all.
      };

      await updateVehicle({
        token,
        vehicleId,
        updates,
      });

      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });

      router.push("/vendor/vehicles");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to update vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (vehicle === undefined) {
    return <div className="p-8 text-center">Loading vehicle details...</div>;
  }

  if (vehicle === null) {
    return <div className="p-8 text-center">Vehicle not found</div>;
  }

  if (user && vehicle.sellerId !== user.id) {
     return <div className="p-8 text-center text-red-500">You do not have permission to edit this vehicle.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Edit Vehicle</h1>
        <p className="text-muted-foreground">
          Update vehicle details and specifications
        </p>
      </div>

      {initialData && (
        <VehicleForm
          initialData={initialData}
          initialImages={vehicle.images}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          submitButtonText="Save Changes"
        />
      )}
    </div>
  );
}
