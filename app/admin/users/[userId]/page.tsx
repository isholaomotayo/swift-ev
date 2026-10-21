import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminUserDetailClient } from "@/components/admin/admin-user-detail-client";

export const metadata: Metadata = {
  title: "User Details | Admin",
  description: "View and manage an individual user account",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminUserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin/users");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let data = null;
  let notFound = false;
  try {
    data = await convex.query(api.users.getUserDetails, {
      token,
      userId: userId as any,
    });
  } catch (error: any) {
    console.error("Failed to fetch user details:", error);

    // If authorization fails, send them back to the main admin users page
    if (error?.message?.toLowerCase().includes("access denied") || error?.message?.toLowerCase().includes("unauthorized")) {
      redirect("/admin/users");
    }
    notFound = true;
  }

  // Render outside try/catch: errors thrown while rendering are not catchable here.
  return notFound ? (
    <AdminUserDetailClient
      token={token}
      initialData={null}
      errorMessage="User not found or no longer exists."
    />
  ) : (
    <AdminUserDetailClient token={token} initialData={data} />
  );
}

