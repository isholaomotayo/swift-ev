import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Auction | Auto Auctions Africa",
  description:
    "Join the live auction and bid on electric vehicles in real-time. View current lots, place bids, and track auction progress.",
  openGraph: {
    title: "Live Auction | Auto Auctions Africa",
    description: "Join the live auction and bid on electric vehicles in real-time.",
    type: "website",
  },
};

export default function AuctionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

