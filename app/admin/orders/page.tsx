import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { OrdersListClient } from "@/components/admin/orders-list-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Manage Orders | Admin | VoltBid Africa",
  description: "Track and manage all orders",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialOrdersData: any = null;
  let initialStats: any = null;

  try {
    [initialOrdersData, initialStats] = await Promise.all([
      convex.query(api.orders.listOrders, {
        token,
        limit: 25,
        offset: 0,
      }),
      convex.query(api.orders.getOrderStats, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch orders data:", error);
    // Continue with null data
  }

  return (
    <OrdersListClient
      initialOrdersData={initialOrdersData}
      initialStats={initialStats}
      token={token}
    />
  );
}
