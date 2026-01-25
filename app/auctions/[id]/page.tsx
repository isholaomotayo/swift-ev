import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LiveAuctionClient } from "@/components/auctions/live-auction-client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const auctionId = resolvedParams.id as Id<"auctions">;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    const auctionData = await convex.query(api.auctions.getAuctionById, { auctionId });
    if (!auctionData) {
      return {
        title: "Auction Not Found | autoexports.live",
      };
    }

    return {
      title: `${auctionData.auction.name} | autoexports.live`,
      description: auctionData.auction.description || `Live auction with ${auctionData.lots.length} lots`,
      openGraph: {
        title: auctionData.auction.name,
        description: auctionData.auction.description || "Live vehicle auction",
      },
    };
  } catch (error) {
    return {
      title: "Auction | autoexports.live",
    };
  }
}

export default async function LiveAuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const auctionId = resolvedParams.id as Id<"auctions">;

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialAuctionData: any = null;
  let initialCurrentLotData: any = null;

  try {
    [initialAuctionData, initialCurrentLotData] = await Promise.all([
      convex.query(api.auctions.getAuctionById, { auctionId }),
      convex.query(api.auctions.getCurrentLot, { auctionId }),
    ]);
  } catch (error) {
    console.error("Failed to fetch auction data:", error);
    notFound();
  }

  if (!initialAuctionData) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <LiveAuctionClient
          initialAuctionData={initialAuctionData}
          initialCurrentLotData={initialCurrentLotData}
          auctionId={auctionId}
        />
      </main>
      <Footer />
    </div>
  );
}
