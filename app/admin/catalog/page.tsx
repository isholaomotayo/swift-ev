import type { Metadata } from "next";
import { cookies } from "next/headers";
import { VehicleCatalogManager } from "@/components/admin/vehicles/vehicle-catalog-manager";

export const metadata: Metadata = {
  title: "Vehicle Catalog & Models | Admin | autoexports.live",
  description: "Manage makes, models, and duplicate prevention in vehicle catalog",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminVehicleCatalogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null;
  }

  return <VehicleCatalogManager token={token} />;
}
