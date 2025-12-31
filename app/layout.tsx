import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
  description:
    "Bid on quality electric vehicles directly from Chinese manufacturers. Complete import solution from China to your doorstep in Nigeria.",
  keywords: [
    "electric vehicles",
    "EV auction",
    "Nigeria",
    "BYD",
    "NIO",
    "XPeng",
    "vehicle import",
    "auction platform",
    "Africa",
  ],
  authors: [{ name: "VoltBid Africa" }],
  creator: "VoltBid Africa",
  publisher: "VoltBid Africa",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "/",
    title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
    description:
      "Bid on quality electric vehicles directly from Chinese manufacturers.",
    siteName: "VoltBid Africa",
  },
  twitter: {
    card: "summary_large_image",
    title: "VoltBid Africa - Premier Electric Vehicle Auction Platform",
    description:
      "Bid on quality electric vehicles directly from Chinese manufacturers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
