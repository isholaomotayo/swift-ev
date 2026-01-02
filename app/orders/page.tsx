import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { OrdersListClient } from "@/components/orders/orders-list-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "My Orders | VoltBid Africa",
  description: "Track your vehicle purchases",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialOrders: any = null;

  try {
    initialOrders = await convex.query(api.orders.getUserOrders, { token });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    // Continue with null data
  }

  return (
    <OrdersListClient initialOrders={initialOrders} token={token} />
  );
}
