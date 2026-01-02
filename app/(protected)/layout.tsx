import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { ProtectedLayoutClient } from "@/components/layout/protected-layout-client";

export const metadata: Metadata = {
  title: "Dashboard | VoltBid Africa",
  description: "Your VoltBid Africa dashboard - manage your bids, watchlist, orders, and profile.",
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
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Verify user authentication server-side
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  // Check user status
  if (user.status !== "active") {
    redirect("/login?error=account_inactive");
  }

  return (
    <ProtectedLayoutClient user={user}>
      {children}
    </ProtectedLayoutClient>
  );
}
