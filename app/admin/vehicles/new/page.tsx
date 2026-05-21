"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/providers/auth-provider";
import { VehicleForm, type VehicleFormData } from "@/components/vendor/vehicle-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type UploadRole = "required_image" | "optional_image" | "inspection_report" | "video_walkthrough";
type TaggedUploadFile = File & {
  __mediaRole?: UploadRole;
  __category?: string;
};
type InitialStatus = "pending_approval" | "approved";

export default function AdminVehicleUploadPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialStatus, setInitialStatus] = useState<InitialStatus>("approved");

  const createVehicle = useMutation(api.vehicles.createVehicle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const uploadFileToStorage = async (file: File): Promise<string> => {
    if (!token) {
      throw new Error("You must be logged in to upload files");
    }

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

  const handleSubmit = async (formData: VehicleFormData, files: File[]) => {
    if (!token) {
      toast({
        title: "Error",
        description: "You must be logged in as an admin to upload vehicles",
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
          storageId: await uploadFileToStorage(file),
          category: file.__category || "Additional",
          isRequired: file.__mediaRole === "required_image",
        }))
      );

      const inspectionReportStorageId = inspectionReportFile
        ? await uploadFileToStorage(inspectionReportFile)
        : undefined;
      const videoWalkthroughStorageId = videoWalkthroughFile
        ? await uploadFileToStorage(videoWalkthroughFile)
        : undefined;

      await createVehicle({
        token,
        vehicleData: {
          ...formData,
          buyItNowEnabled: formData.buyItNowPrice !== undefined,
          initialStatus,
          mediaUploads,
          inspectionReportStorageId,
          ...(videoWalkthroughStorageId ? { videoWalkthroughStorageId } : {}),
        },
      });

      toast({
        title: "Vehicle uploaded",
        description:
          initialStatus === "approved"
            ? "Vehicle was created as approved inventory."
            : "Vehicle was created in the approvals queue.",
      });

      router.push("/admin/vehicles");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to upload vehicle.";
      console.error("Error uploading vehicle:", error);
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Upload New Vehicle</h1>
        <p className="text-muted-foreground">
          Add admin-managed inventory using the same validated media workflow as vendors.
        </p>
      </div>

      <Card className="p-4">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="initialStatus">Initial Status</Label>
          <Select
            value={initialStatus}
            onValueChange={(value) => setInitialStatus(value as InitialStatus)}
          >
            <SelectTrigger id="initialStatus">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <VehicleForm
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        submitButtonText={initialStatus === "approved" ? "Create Approved Vehicle" : "Submit for Approval"}
      />
    </div>
  );
}
