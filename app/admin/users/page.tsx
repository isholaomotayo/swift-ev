import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { UsersListClient } from "@/components/admin/users-list-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Manage Users | Admin | Auto Auctions Africa",
  description: "Manage all platform users",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialUsersData: any = null;
  let initialStats: any = null;

  try {
    [initialUsersData, initialStats] = await Promise.all([
      convex.query(api.users.listUsers, {
        token,
        limit: 25,
        offset: 0,
      }),
      convex.query(api.users.getUserStats, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch users data:", error);
    // Continue with null data
  }

  return (
    <UsersListClient
      initialUsersData={initialUsersData}
      initialStats={initialStats}
      token={token}
    />
  );
}
