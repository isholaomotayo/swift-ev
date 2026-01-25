import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FAQ | autoexports.live",
    description:
        "Find answers to common questions about buying, selling, and using autoexports.live - Nigeria's premier vehicle auction platform.",
    keywords: [
        "FAQ",
        "frequently asked questions",
        "Car auction",
        "bidding rules",
        "shipping",
        "escrow",
        "Nigeria",
    ],
};

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
