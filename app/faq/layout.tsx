import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FAQ | Auto Auctions Africa",
    description:
        "Find answers to common questions about buying, selling, and using Auto Auctions Africa - Nigeria's premier vehicle auction platform.",
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
