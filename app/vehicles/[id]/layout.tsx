import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicle Details | autoexports.live",
  description:
    "View detailed information about this vehicle including specifications, condition, auction status, and bidding options.",
  openGraph: {
    title: "Vehicle Details | autoexports.live",
    description: "View detailed information about this vehicle.",
    type: "website",
  },
};

export default function VehicleDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

