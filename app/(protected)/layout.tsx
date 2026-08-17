import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";
import { ProtectedLayoutClient } from "@/components/layout/protected-layout-client";
import { VendorLayoutClient } from "@/components/layout/vendor-layout-client";

export const metadata: Metadata = {
  title: "Dashboard | autoexports.live",
  description: "Your autoexports.live dashboard - manage your bids, watchlist, orders, and profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Verify user authentication server-side (shared singleton for this request)
  const convex = getConvexClient();
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login?auth_failed=1");
  }

  if (!user) {
    redirect("/login?auth_failed=1");
  }

  if (user.status === "banned" || user.status === "suspended") {
    redirect("/login?error=account_suspended");
  }

  if (user.role === "seller") {
    return (
      <VendorLayoutClient user={user}>
        {children}
      </VendorLayoutClient>
    );
  }

  return (
    <ProtectedLayoutClient user={user}>
      {children}
    </ProtectedLayoutClient>
  );
}
