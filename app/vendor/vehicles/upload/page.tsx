"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { VehicleForm } from "@/components/vendor/vehicle-form";



export default function VehicleUploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVehicle = useMutation(api.vehicles.createVehicle);

  const handleSubmit = async (formData: any, images: File[]) => {
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
      const token = localStorage.getItem("autoexports_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // In a real implementation, you would upload images to Cloudinary first
      // For now, we'll use placeholder images or object URLs if needed,
      // but the mutation expects strings. We'll use placeholders for demo.
      const placeholderImages = [
        `https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=800&h=600&fit=crop`,
      ];

      await createVehicle({
        token,
        vehicleData: {
          ...formData,
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

      <VehicleForm
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        submitButtonText="Submit for Approval"
      />
    </div>
  );
}
