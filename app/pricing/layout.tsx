import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Membership | VoltBid Africa",
  description:
    "View our transparent pricing structure and membership tiers. No hidden fees - see all costs upfront including duties, taxes, and shipping.",
  keywords: [
    "pricing",
    "membership",
    "fees",
    "costs",
    "EV import costs",
    "Nigeria",
  ],
  openGraph: {
    title: "Pricing & Membership | VoltBid Africa",
    description: "View our transparent pricing structure and membership tiers.",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

