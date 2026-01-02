import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | VoltBid Africa",
  description:
    "Learn how VoltBid works - from browsing vehicles to placing bids, winning auctions, and receiving your electric vehicle at your doorstep in Nigeria.",
  keywords: [
    "how it works",
    "auction process",
    "EV import",
    "Nigeria",
    "vehicle import process",
  ],
  openGraph: {
    title: "How It Works | VoltBid Africa",
    description: "Learn how VoltBid works - from browsing to receiving your EV.",
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

