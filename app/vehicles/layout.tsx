import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: "Browse Vehicles",
    template: `%s | ${SITE_NAME}`,
  },
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
    title: "Browse Vehicles",
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

