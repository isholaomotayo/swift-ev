import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";
import { AdminLayoutClient } from "@/components/layout/admin-layout-client";

export const metadata: Metadata = {
  title: "Admin | autoexports.live",
  description: "Admin dashboard for managing autoexports.live platform",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin");
  }

  // Verify user role server-side (shared singleton for this request)
  const convex = getConvexClient();
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login?redirect=/admin&auth_failed=1");
  }

  if (!user) {
    redirect("/login?redirect=/admin&auth_failed=1");
  }

  // Verify admin role
  if (user.role !== "admin" && user.role !== "superadmin") {
    redirect("/");
  }

  return (
    <AdminLayoutClient user={user}>
      {children}
    </AdminLayoutClient>
  );
}
