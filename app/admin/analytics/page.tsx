import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { AnalyticsClient } from "@/components/admin/analytics-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Analytics | Admin | Auto Auctions Africa",
  description: "Platform performance metrics",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  const now = Date.now();
  const start = now - 30 * 24 * 60 * 60 * 1000; // 30 days ago

  let initialPlatformStats: any = null;
  let initialRevenueMetrics: any = null;
  let initialVehicleMetrics: any = null;
  let initialUserMetrics: any = null;
  let initialAuctionMetrics: any = null;

  try {
    [initialPlatformStats, initialRevenueMetrics, initialVehicleMetrics, initialUserMetrics, initialAuctionMetrics] = await Promise.all([
      convex.query(api.analytics.getPlatformStats, { token, dateRange: { start, end: now } }),
      convex.query(api.analytics.getRevenueMetrics, { token, dateRange: { start, end: now }, groupBy: "day" }),
      convex.query(api.analytics.getVehicleMetrics, { token }),
      convex.query(api.analytics.getUserMetrics, { token, months: 6 }),
      convex.query(api.analytics.getAuctionMetrics, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    // Continue with null data
  }

  return (
    <AnalyticsClient
      initialPlatformStats={initialPlatformStats}
      initialRevenueMetrics={initialRevenueMetrics}
      initialVehicleMetrics={initialVehicleMetrics}
      initialUserMetrics={initialUserMetrics}
      initialAuctionMetrics={initialAuctionMetrics}
      token={token}
    />
  );
}
