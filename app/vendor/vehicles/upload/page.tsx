"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { VehicleForm } from "@/components/vendor/vehicle-form";

type UploadRole = "required_image" | "optional_image" | "inspection_report" | "video_walkthrough";
type TaggedUploadFile = File & {
  __mediaRole?: UploadRole;
  __category?: string;
};

export default function VehicleUploadPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVehicle = useMutation(api.vehicles.createVehicle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

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

  const handleSubmit = async (formData: any, files: File[], _deletedImageIds: string[]) => {
    if (!user || !token) {
      toast({
        title: "Error",
        description: "You must be logged in to upload vehicles",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {

      const taggedFiles = files as TaggedUploadFile[];
      const imageFiles = taggedFiles.filter(
        (file) => file.__mediaRole === "required_image" || file.__mediaRole === "optional_image"
      );
      const inspectionReportFile =
        taggedFiles.find((file) => file.__mediaRole === "inspection_report") || null;
      const videoWalkthroughFile =
        taggedFiles.find((file) => file.__mediaRole === "video_walkthrough") || null;

      const mediaUploads = await Promise.all(
        imageFiles.map(async (file) => ({
          storageId: await uploadFileToStorage(token, file),
          category: file.__category || "Additional",
          isRequired: file.__mediaRole === "required_image",
        }))
      );

      const inspectionReportStorageId = inspectionReportFile
        ? await uploadFileToStorage(token, inspectionReportFile)
        : undefined;
      const videoWalkthroughStorageId = videoWalkthroughFile
        ? await uploadFileToStorage(token, videoWalkthroughFile)
        : undefined;

      await createVehicle({
        token,
        vehicleData: {
          ...formData,
          mediaUploads,
          inspectionReportStorageId,
          ...(videoWalkthroughStorageId ? { videoWalkthroughStorageId } : {}),
        },
      });

      toast({
        title: "Success!",
        description: "Vehicle uploaded successfully and pending admin approval",
      });

      router.push("/vendor/vehicles");
    } catch (error: any) {
      console.error("Error uploading vehicle:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload vehicle. Please try again.",
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

      <VehicleForm
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        submitButtonText="Submit for Approval"
      />
    </div>
  );
}
