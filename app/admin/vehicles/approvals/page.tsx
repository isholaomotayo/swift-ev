import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { VehicleApprovalsClient } from "@/components/admin/vehicle-approvals-client";

export const metadata: Metadata = {
  title: "Vehicle Approvals | Admin | autoexports.live",
  description: "Review and approve vendor vehicle submissions",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminVehicleApprovalsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!token || !convexUrl) {
    return null;
  }

  const convex = new ConvexHttpClient(convexUrl);

  let vehiclesData: {
    vehicles: Doc<"vehicles">[];
    pagination: { total: number };
  } | null = null;

  try {
    vehiclesData = await convex.query(api.vehicles.listVehiclesForAdmin, {
      token,
      status: "pending_approval",
      page: 0,
      limit: 50,
    });
  } catch (error) {
    console.error("Failed to fetch pending vehicle approvals:", error);
    vehiclesData = { vehicles: [], pagination: { total: 0 } };
  }

  return (
    <VehicleApprovalsClient
      initialVehicles={vehiclesData?.vehicles || []}
      totalCount={vehiclesData?.pagination?.total || 0}
      token={token}
    />
  );
}
