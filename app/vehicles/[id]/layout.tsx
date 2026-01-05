import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicle Details | Auto Auctions Africa",
  description:
    "View detailed information about this electric vehicle including specifications, battery health, auction status, and bidding options.",
  openGraph: {
    title: "Vehicle Details | Auto Auctions Africa",
    description: "View detailed information about this electric vehicle.",
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

