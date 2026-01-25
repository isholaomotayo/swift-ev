import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminVehiclesClient } from "@/components/admin/admin-vehicles-client";

export const metadata: Metadata = {
  title: "Manage Vehicles | Admin | autoexports.live",
  description: "Manage all vehicles in the platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminVehiclesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let vehiclesData: any = null;

  try {
    vehiclesData = await convex.query(api.vehicles.listVehicles, {
      page: 0,
      limit: 50,
    });
  } catch (error) {
    console.error("Failed to fetch vehicles:", error);
    vehiclesData = { vehicles: [], pagination: { total: 0 } };
  }

  return (
    <AdminVehiclesClient
      initialVehicles={vehiclesData?.vehicles || []}
      totalCount={vehiclesData?.pagination?.total || 0}
    />
  );
}
