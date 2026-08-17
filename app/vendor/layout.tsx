import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";
import { VendorLayoutClient } from "@/components/layout/vendor-layout-client";

export const metadata: Metadata = {
  title: "Vendor | autoexports.live",
  description: "Vendor dashboard for managing your vehicles and auctions on autoexports.live",
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
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login?redirect=/vendor");
  }

  // Verify user role server-side (shared singleton for this request)
  const convex = getConvexClient();
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login?redirect=/vendor&auth_failed=1");
  }

  if (!user) {
    redirect("/login?redirect=/vendor&auth_failed=1");
  }

  // Verify seller role
  if (user.role !== "seller") {
    redirect("/");
  }

  if (user.status === "banned" || user.status === "suspended") {
    redirect("/login?error=account_suspended");
  }

  return (
    <VendorLayoutClient user={user}>
      {children}
    </VendorLayoutClient>
  );
}
