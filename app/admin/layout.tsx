import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { AdminLayoutClient } from "@/components/layout/admin-layout-client";

export const metadata: Metadata = {
  title: "Admin | VoltBid Africa",
  description: "Admin dashboard for managing VoltBid Africa platform",
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
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login?redirect=/admin");
  }

  // Verify user role server-side
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to verify user:", error);
    redirect("/login?redirect=/admin");
  }

  if (!user) {
    redirect("/login?redirect=/admin");
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
