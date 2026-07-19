import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminKycClient } from "@/components/admin/admin-kyc-client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "KYC Review | Admin Dashboard",
  description: "Review pending user KYC applications",
};

export default async function AdminKycPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login");
  }

  // Double check admin role on server side
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  try {
    const user = await convex.query(api.auth.getCurrentUser, { token });
    if (user?.role !== "admin" && user?.role !== "superadmin") {
      redirect("/dashboard");
    }
  } catch (error) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto p-8">
      <AdminKycClient token={token} />
    </div>
  );
}
