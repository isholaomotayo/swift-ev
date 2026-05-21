"use client";

import { use, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { VehicleForm, VehicleFormData } from "@/components/vendor/vehicle-form";
import { Id } from "@/convex/_generated/dataModel";
import { getMutationErrorMessage, isValidVehicleCondition } from "@/lib/auth-errors";
import { isPersistableImageRef } from "@/lib/vehicle-image-refs";

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

type UploadRole = "required_image" | "optional_image" | "inspection_report" | "video_walkthrough";
type TaggedUploadFile = File & {
  __mediaRole?: UploadRole;
  __category?: string;
};

export default function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = use(params);
  const vehicleId = id as Id<"vehicles">;
  
  const { user, token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch vehicle data
  const vehicle = useQuery(
    api.vehicles.getVehicleById,
    token ? { vehicleId, token } : "skip"
  );
  const updateVehicle = useMutation(api.vehicles.updateVehicle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [initialData, setInitialData] = useState<VehicleFormData | null>(null);

  useEffect(() => {
    if (vehicle) {
      // Map vehicle data to form data
      setInitialData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        fuelType: (vehicle as { fuelType?: string }).fuelType ?? "EV (Electric)",
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

  const uploadFileToStorage = async (token: string, file: File): Promise<string> => {
    const uploadUrl = await generateUploadUrl({ token });
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!result.ok) {
      throw new Error(`Upload failed for ${file.name}`);
    }

    const { storageId } = await result.json();
    return String(storageId);
  };

  const handleSubmit = async (formData: VehicleFormData, newFiles: File[], deletedImageIds: string[]) => {
    if (!user || !token) {
      toast({
        title: "Error",
        description: "You must be logged in to edit vehicles",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {

      const updates: Record<string, unknown> = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        vin: formData.vin?.trim() || undefined,
        fuelType: formData.fuelType,
        batteryCapacity: formData.batteryCapacity,
        batteryHealthPercent: formData.batteryHealthPercent,
        estimatedRange: formData.range,
        batteryType: formData.batteryType,
        chargingType: formData.chargingTypes,
        motorPower: formData.motorPower,
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
      };

      if (isValidVehicleCondition(formData.condition)) {
        updates.condition = formData.condition;
      }

      const taggedNewFiles = newFiles as TaggedUploadFile[];
      const newImageFiles = taggedNewFiles.filter(
        (file) => file.__mediaRole === "required_image" || file.__mediaRole === "optional_image"
      );

      const existingImageUrls = (vehicle?.images || [])
        .filter((img: { _id: string; storageRef?: string; url?: string }) =>
          !deletedImageIds.includes(String(img._id))
        )
        .map((img: { storageRef?: string; url?: string }) => img.storageRef ?? img.url)
        .filter((ref): ref is string => typeof ref === "string" && isPersistableImageRef(ref))
        .map((ref) => ref.trim());

      if (newImageFiles.length > 0 || deletedImageIds.length > 0) {
        const uploadedImageIds = await Promise.all(
          newImageFiles.map((file) => uploadFileToStorage(token, file))
        );
        updates.imageUrls = [...existingImageUrls, ...uploadedImageIds];
      }

      await updateVehicle({
        token,
        vehicleId,
        updates: updates as Parameters<typeof updateVehicle>[0]["updates"],
      });

      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      });

      router.push("/vendor/vehicles");
    } catch (error: unknown) {
      const message = getMutationErrorMessage(
        error,
        "Failed to update vehicle. Please try again."
      );
      console.error("Error updating vehicle:", error);
      toast({
        title: "Error",
        description: message,
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
