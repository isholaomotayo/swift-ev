import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Auto Auctions Africa",
  description: "Login to your Auto Auctions Africa account to start bidding on electric vehicles.",
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

