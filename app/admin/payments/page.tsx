import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminPaymentsClient } from "@/components/admin/admin-payments-client";

export const metadata: Metadata = {
  title: "Payments | Admin | autoexports.live",
  description: "Verify pending buyer payments",
  robots: { index: false, follow: false },
};

export default async function AdminPaymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null;
  }

  return <AdminPaymentsClient token={token} />;
}
