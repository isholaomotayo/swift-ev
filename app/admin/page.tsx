import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";

export const metadata: Metadata = {
  title: "Admin Dashboard | autoexports.live",
  description: "Admin dashboard for managing autoexports.live platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialOverview: any = null;

  try {
    initialOverview = await convex.query(api.analytics.getAdminDashboardOverview, {
      token,
      timeRange: "30d",
    });
  } catch (error) {
    console.error("Failed to fetch dashboard overview data:", error);
    // Continue with empty fallback
  }

  return (
    <AdminDashboardClient
      initialOverview={initialOverview}
      token={token}
    />
  );
}
