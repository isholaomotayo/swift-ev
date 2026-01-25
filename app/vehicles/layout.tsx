import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Vehicles | autoexports.live",
  description:
    "Browse our selection of vehicles from Chinese manufacturers. Filter by make, model, year, and price.",
  keywords: [
    "vehicles",
    "Cars",
    "BYD",
    "NIO",
    "XPeng",
    "Tesla",
    "vehicle listings",
    "Nigeria",
  ],
  openGraph: {
    title: "Browse Vehicles | autoexports.live",
    description: "Browse our selection of vehicles from Chinese manufacturers.",
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

