import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard | VoltBid Africa",
  description: "Admin dashboard for managing VoltBid Africa platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let vehicleStats: any = null;
  let liveAuctions: any[] = [];

  try {
    [vehicleStats, liveAuctions] = await Promise.all([
      convex.query(api.vehicles.getVehicleStats, {}),
      convex.query(api.auctions.listAuctions, { status: "live" }),
    ]);
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Continue with empty data
  }

  return (
    <AdminDashboardClient
      vehicleStats={vehicleStats}
      liveAuctions={liveAuctions || []}
    />
  );
}
