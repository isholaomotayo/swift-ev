import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Member Guide | autoexports.live",
    description:
        "Comprehensive guide on how to buy and sell vehicles on autoexports.live. Learn about bidding, payments, shipping, and security.",
    keywords: [
        "member guide",
        "how to bid",
        "selling cars",
        "Car import guide",
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
