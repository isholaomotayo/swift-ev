import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AdminAuctionDetailClient } from "@/components/admin/admin-auction-detail-client";
import { getConvexClient } from "@/lib/convex-server";

type AuctionData = {
  auction: Doc<"auctions">;
  lots: Array<{
    lot: Doc<"auctionLots">;
    vehicle: Doc<"vehicles"> & {
      image?: string;
    };
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const auctionId = id as Id<"auctions">;
  const convex = getConvexClient();

  try {
    const auctionData = await convex.query(api.auctions.getAuctionById, {
      auctionId,
    });

    if (!auctionData) {
      return {
        title: "Auction Not Found | Admin | autoexports.live",
      };
    }

    return {
      title: `${auctionData.auction.name} | Admin | autoexports.live`,
      description: "Manage auction details, lots, and live auction controls",
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch {
    return {
      title: "Manage Auction | Admin | autoexports.live",
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function AdminAuctionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auctionId = id as Id<"auctions">;
  const convex = getConvexClient();

  let initialAuctionData: AuctionData | null = null;

  try {
    initialAuctionData = await convex.query(api.auctions.getAuctionById, {
      auctionId,
    });
  } catch (error) {
    console.error("Failed to fetch auction data:", error);
    notFound();
  }

  if (!initialAuctionData) {
    notFound();
  }

  return (
    <AdminAuctionDetailClient
      auctionId={auctionId}
      initialAuctionData={initialAuctionData}
    />
  );
}
