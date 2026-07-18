import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VendorPendingOrdersClient } from "@/components/vendor/vendor-pending-orders-client";

export const metadata: Metadata = {
  title: "Pending payments | Vendor | autoexports.live",
  robots: { index: false, follow: false },
};

export default async function VendorPendingOrdersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login?redirect=/vendor/orders");
  }

  return (
    <div className="p-6 lg:p-8">
      <VendorPendingOrdersClient token={token} />
    </div>
  );
}
