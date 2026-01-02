import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { VehicleDetailClient } from "@/components/vehicles/vehicle-detail-client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const vehicleId = resolvedParams.id as Id<"vehicles">;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    const vehicle = await convex.query(api.vehicles.getVehicleById, { vehicleId });
    if (!vehicle) {
      return {
        title: "Vehicle Not Found | VoltBid Africa",
      };
    }

    return {
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model} | VoltBid Africa`,
      description: `View details for ${vehicle.year} ${vehicle.make} ${vehicle.model}. Battery health: ${vehicle.batteryHealthPercent}%, Range: ${vehicle.estimatedRange}km.`,
      openGraph: {
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        description: `Electric vehicle auction listing - ${vehicle.batteryCapacity}kWh battery, ${vehicle.estimatedRange}km range`,
        images: vehicle.images && vehicle.images.length > 0 ? [vehicle.images[0]] : [],
      },
    };
  } catch (error) {
    return {
      title: "Vehicle | VoltBid Africa",
    };
  }
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const vehicleId = resolvedParams.id as Id<"vehicles">;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialVehicle: any = null;

  try {
    initialVehicle = await convex.query(api.vehicles.getVehicleById, { vehicleId });
  } catch (error) {
    console.error("Failed to fetch vehicle:", error);
    notFound();
  }

  if (!initialVehicle) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <VehicleDetailClient initialVehicle={initialVehicle} vehicleId={vehicleId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
