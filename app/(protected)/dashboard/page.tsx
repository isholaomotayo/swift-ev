import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Dashboard | autoexports.live",
  description: "Your autoexports.live dashboard - manage your bids, watchlist, orders, and profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;
  let initialOverview: any = null;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
    if (user) {
      const results = await Promise.allSettled([
        convex.query(api.analytics.getBuyerDashboardOverview, { token }),
      ]);
      initialOverview = results[0].status === "fulfilled" ? results[0].value : null;
    }
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Continue with null data - client component will handle loading
  }

  if (!user) {
    return null; // Layout will handle redirect
  }

  return (
    <DashboardClient
      initialOverview={initialOverview}
      token={token}
      user={user}
    />
  );
}
