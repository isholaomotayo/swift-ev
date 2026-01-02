import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Dashboard | VoltBid Africa",
  description: "Your VoltBid Africa dashboard - manage your bids, watchlist, orders, and profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;
  let initialUserBids: any = null;
  let initialWatchlist: any = null;
  let initialUserOrders: any = null;

  try {
    [user, initialUserBids, initialWatchlist, initialUserOrders] = await Promise.all([
      convex.query(api.auth.getCurrentUser, { token }),
      convex.query(api.bids.getUserBids, { token }),
      convex.query(api.watchlist.getWatchlist, { token }),
      convex.query(api.orders.getUserOrders, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    // Continue with null data - client component will handle loading
  }

  if (!user) {
    return null; // Layout will handle redirect
  }

  return (
    <DashboardClient
      initialUserBids={initialUserBids}
      initialWatchlist={initialWatchlist}
      initialUserOrders={initialUserOrders}
      token={token}
      user={user}
    />
  );
}
