import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | VoltBid Africa",
  description: "Create a free account on VoltBid Africa to start bidding on electric vehicles from Chinese manufacturers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

