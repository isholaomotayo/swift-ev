import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { ProfileClient } from "@/components/profile/profile-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "My Profile | Auto Auctions Africa",
  description: "Manage your account and view your activity",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;
  let initialOrders: any = null;

  try {
    [user, initialOrders] = await Promise.all([
      convex.query(api.auth.getCurrentUser, { token }),
      convex.query(api.orders.getUserOrders, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileClient
      initialUser={user}
      initialOrders={initialOrders}
      token={token}
    />
  );
}
