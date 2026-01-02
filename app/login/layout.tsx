import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | VoltBid Africa",
  description: "Login to your VoltBid Africa account to start bidding on electric vehicles.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

