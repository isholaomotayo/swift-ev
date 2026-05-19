import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminUserDetailClient } from "@/components/admin/admin-user-detail-client";

export const metadata: Metadata = {
  title: "User Details | Admin | autoexports.live",
  description: "View and manage an individual user account",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminUserDetailPageProps {
  params: {
    userId: string;
  };
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin/users");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  try {
    const data = await convex.query(api.users.getUserDetails, {
      token,
      userId: params.userId as any,
    });

    return (
      <AdminUserDetailClient
        token={token}
        initialData={data}
      />
    );
  } catch (error: any) {
    console.error("Failed to fetch user details:", error);

    // If authorization fails, send them back to the main admin users page
    if (error?.message?.toLowerCase().includes("access denied") || error?.message?.toLowerCase().includes("unauthorized")) {
      redirect("/admin/users");
    }

    // For a missing user, show a friendly not-found state
    return (
      <AdminUserDetailClient
        token={token}
        initialData={null}
        errorMessage="User not found or no longer exists."
      />
    );
  }
}

