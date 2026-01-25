import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register | autoexports.live",
  description: "Create a free account on autoexports.live to start bidding on vehicles from Chinese manufacturers.",
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

