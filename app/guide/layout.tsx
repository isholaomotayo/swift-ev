import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Member Guide | Auto Auctions Africa",
    description:
        "Comprehensive guide on how to buy and sell electric vehicles on Auto Auctions Africa. Learn about bidding, payments, shipping, and security.",
    keywords: [
        "member guide",
        "how to bid",
        "selling cars",
        "EV import guide",
        "auction tutorial",
        "Nigeria",
    ],
};

export default function GuideLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
