import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { VendorDashboardClient } from "@/components/vendor/vendor-dashboard-client";

export const metadata: Metadata = {
  title: "Vendor Dashboard | autoexports.live",
  description: "Manage your vehicles and track your performance",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;
  let vendorStats: any = null;
  let vehicles: any[] = [];

  try {
    // Get user first
    user = await convex.query(api.auth.getCurrentUser, { token });
    
    if (user) {
      // Get vendor stats
      vendorStats = await convex.query(api.vehicles.getVendorStats, { token });
      
      // Get vendor's vehicles (filter by sellerId)
      const allVehicles = await convex.query(api.vehicles.listVehicles, {
        page: 0,
        limit: 100,
      });
      
      vehicles = (allVehicles?.vehicles || []).filter(
        (v: any) => v.sellerId === user.id
      );
    }
  } catch (error) {
    console.error("Failed to fetch vendor dashboard data:", error);
    vendorStats = {
      totalVehicles: 0,
      inAuction: 0,
      sold: 0,
      pendingApproval: 0,
      totalRevenue: 0,
    };
  }

  if (!user) {
    return null; // Layout will handle redirect
  }

  return (
    <VendorDashboardClient
      user={user}
      stats={{
        totalVehicles: vendorStats?.totalVehicles || 0,
        inAuction: vendorStats?.inAuction || 0,
        sold: vendorStats?.sold || 0,
        pendingApproval: vendorStats?.pending || 0,
        totalRevenue: vendorStats?.totalRevenue || 0,
      }}
      recentVehicles={vehicles}
    />
  );
}
