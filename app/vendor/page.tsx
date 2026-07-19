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
  let initialOverview: any = null;

  try {
    // Get user first
    user = await convex.query(api.auth.getCurrentUser, { token });
    
    if (user) {
      const results = await Promise.allSettled([
        convex.query(api.analytics.getVendorDashboardOverview, { token, timeRange: "30d" })
      ]);
      initialOverview = results[0].status === "fulfilled" ? results[0].value : null;
    }
  } catch (error) {
    console.error("Failed to fetch vendor dashboard data:", error);
  }

  if (!user) {
    return null; // Layout will handle redirect
  }

  return (
    <VendorDashboardClient
      user={user}
      initialOverview={initialOverview}
      token={token}
    />
  );
}
