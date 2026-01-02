import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { VendorAnalyticsClient } from "@/components/vendor/analytics-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Analytics | Vendor | VoltBid Africa",
  description: "Track your performance and sales",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorAnalyticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialStats: any = null;
  let initialRevenueHistory: any = null;

  try {
    [initialStats, initialRevenueHistory] = await Promise.all([
      convex.query(api.vehicles.getVendorStats, { token }),
      convex.query(api.vehicles.getVendorRevenueHistory, { token, months: 6 }),
    ]);
  } catch (error) {
    console.error("Failed to fetch vendor analytics:", error);
    // Continue with null data
  }

  return (
    <VendorAnalyticsClient
      initialStats={initialStats}
      initialRevenueHistory={initialRevenueHistory}
      token={token}
    />
  );
}
