import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { MyBidsClient } from "@/components/bids/my-bids-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "My Bids | autoexports.live",
  description: "Track all your bidding activity",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MyBidsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialUserBids: any = null;

  try {
    initialUserBids = await convex.query(api.bids.getUserBids, { token });
  } catch (error) {
    console.error("Failed to fetch user bids:", error);
    // Continue with null data
  }

  return (
    <MyBidsClient initialUserBids={initialUserBids} token={token} />
  );
}
