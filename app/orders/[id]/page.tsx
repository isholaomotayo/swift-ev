import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { OrderDetailClient } from "@/components/orders/order-detail-client";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: "Order Details | VoltBid Africa",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const orderId = resolvedParams.id as Id<"orders">;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialOrderDetails: any = null;

  try {
    initialOrderDetails = await convex.query(api.orders.getOrderDetails, { token, orderId });
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    notFound();
  }

  if (!initialOrderDetails) {
    notFound();
  }

  return (
    <OrderDetailClient
      initialOrderDetails={initialOrderDetails}
      token={token}
      orderId={orderId}
    />
  );
}
