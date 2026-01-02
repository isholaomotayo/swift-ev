import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { VendorLayoutClient } from "@/components/layout/vendor-layout-client";

export const metadata: Metadata = {
  title: "Vendor | VoltBid Africa",
  description: "Vendor dashboard for managing your vehicles and auctions on VoltBid Africa",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login?redirect=/vendor");
  }

  // Verify user role server-side
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login?redirect=/vendor");
  }

  if (!user) {
    redirect("/login?redirect=/vendor");
  }

  // Verify seller role
  if (user.role !== "seller") {
    redirect("/");
  }

  return (
    <VendorLayoutClient user={user}>
      {children}
    </VendorLayoutClient>
  );
}
