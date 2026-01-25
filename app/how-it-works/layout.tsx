import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | autoexports.live",
  description:
    "Learn how autoexports.live works - from browsing vehicles to placing bids, winning auctions, and receiving your vehicle at your doorstep in Nigeria.",
  keywords: [
    "how it works",
    "auction process",
    "Car import",
    "Nigeria",
    "vehicle import process",
  ],
  openGraph: {
    title: "How It Works | autoexports.live",
    description: "Learn how autoexports.live works - from browsing to receiving your car.",
    type: "website",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

