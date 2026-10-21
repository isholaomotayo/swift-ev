import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wallet",
  description: "Manage your funds and track your transactions.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
