import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Electric Vehicles | VoltBid Africa",
  description:
    "Browse our selection of electric vehicles from Chinese manufacturers. Filter by make, model, year, price, and battery health.",
  keywords: [
    "electric vehicles",
    "EVs",
    "BYD",
    "NIO",
    "XPeng",
    "Tesla",
    "vehicle listings",
    "Nigeria",
  ],
  openGraph: {
    title: "Browse Electric Vehicles | VoltBid Africa",
    description: "Browse our selection of electric vehicles from Chinese manufacturers.",
    type: "website",
  },
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

