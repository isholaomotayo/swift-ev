import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { VendorAuctionsClient } from "@/components/vendor/vendor-auctions-client";

export const metadata: Metadata = {
  title: "My Auctions | Vendor | VoltBid Africa",
  description: "Track your vehicles in auctions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorAuctionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let auctions: any[] = [];

  try {
    auctions = await convex.query(api.auctions.getVendorAuctions, { token });
  } catch (error) {
    console.error("Failed to fetch vendor auctions:", error);
    // Continue with empty array
  }

  return <VendorAuctionsClient auctions={auctions} />;
}
