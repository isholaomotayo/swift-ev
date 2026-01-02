import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { VendorVehiclesClient } from "@/components/vendor/vendor-vehicles-client";

export const metadata: Metadata = {
  title: "My Vehicles | Vendor | VoltBid Africa",
  description: "Manage your vehicle listings",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorVehiclesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;
  let vehicles: any[] = [];

  try {
    // Get user first
    user = await convex.query(api.auth.getCurrentUser, { token });
    
    if (user) {
      // Get all vehicles and filter to vendor's own
      const allVehicles = await convex.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 100,
      });
      
      vehicles = (allVehicles?.vehicles || []).filter(
        (v: any) => v.sellerId === user.id
      );
    }
  } catch (error) {
    console.error("Failed to fetch vendor vehicles:", error);
    // Continue with empty array
  }

  return <VendorVehiclesClient initialVehicles={vehicles} />;
}
