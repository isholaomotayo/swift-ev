import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Auction | autoexports.live",
  description:
    "Join the live auction and bid on vehicles in real-time. View current lots, place bids, and track auction progress.",
  openGraph: {
    title: "Live Auction | autoexports.live",
    description: "Join the live auction and bid on vehicles in real-time.",
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

