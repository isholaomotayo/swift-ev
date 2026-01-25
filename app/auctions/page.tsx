import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AuctionsList } from "@/components/auctions/auctions-list";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Live Auctions | autoexports.live",
  description:
    "Browse live, scheduled, and past car auctions. Join live auctions and bid on quality cars from Chinese manufacturers.",
  keywords: [
    "car auctions",
    "live auctions",
    "car auctions",
    "Nigeria",
    "auction platform",
  ],
  openGraph: {
    title: "Live Auctions | autoexports.live",
    description: "Browse live, scheduled, and past car auctions.",
    type: "website",
  },
};

export default async function AuctionsPage() {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  // Fetch initial data server-side
  let initialAuctions: any[] = [];

  try {
    initialAuctions = await convex.query(api.auctions.listAuctions, {});
  } catch (error) {
    console.error("Failed to fetch auctions:", error);
    // Continue with empty array - client component will handle loading
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Auctions</h1>
          <p className="text-muted-foreground">
            Browse live, scheduled, and past auctions
          </p>
        </div>

        <AuctionsList initialAuctions={initialAuctions} />
      </main>
      <Footer />
    </div>
  );
}
