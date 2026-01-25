import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { WatchlistClient } from "@/components/watchlist/watchlist-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "My Watchlist | autoexports.live",
  description: "View and manage your saved vehicles",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WatchlistPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialWatchlist: any = null;

  try {
    initialWatchlist = await convex.query(api.watchlist.getWatchlist, { token });
  } catch (error) {
    console.error("Failed to fetch watchlist:", error);
    // Continue with null data
  }

  return (
    <WatchlistClient initialWatchlist={initialWatchlist} token={token} />
  );
}
