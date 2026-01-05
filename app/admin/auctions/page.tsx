import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminAuctionsClient } from "@/components/admin/admin-auctions-client";

export const metadata: Metadata = {
  title: "Manage Auctions | Admin | Auto Auctions Africa",
  description: "Manage all auction events and lots",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminAuctionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialAuctions: any[] = [];

  try {
    initialAuctions = await convex.query(api.auctions.listAuctions, {});
  } catch (error) {
    console.error("Failed to fetch auctions:", error);
    // Continue with empty array
  }

  return <AdminAuctionsClient initialAuctions={initialAuctions} />;
}
