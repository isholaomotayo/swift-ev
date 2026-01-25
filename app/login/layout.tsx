import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | autoexports.live",
  description: "Login to your autoexports.live account to start bidding on vehicles.",
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

