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
    const room = await convex.query(api.auctions.getPublicLiveAuctionRoom, {
      auctionId,
    });
    if (!room) {
      return {
        title: "Auction Not Found | autoexports.live",
      };
    }

    return {
      title: `${room.auction.name} | autoexports.live`,
      description:
        room.auction.description || `Live auction with ${room.lots.length} lots`,
      openGraph: {
        title: room.auction.name,
        description: room.auction.description || "Live vehicle auction",
      },
    };
  } catch {
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

  let initialRoomData: any = null;

  try {
    initialRoomData = await convex.query(api.auctions.getPublicLiveAuctionRoom, {
      auctionId,
    });
  } catch (error) {
    console.error("Failed to fetch auction data:", error);
    notFound();
  }

  if (!initialRoomData) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        <LiveAuctionClient
          initialRoomData={initialRoomData}
          auctionId={auctionId}
        />
      </main>
      <Footer />
    </div>
  );
}
