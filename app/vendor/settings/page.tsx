import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { VendorSettingsClient } from "@/components/vendor/settings-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Settings | Vendor | Auto Auctions Africa",
  description: "Manage your vendor account settings",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VendorSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    redirect("/login?redirect=/vendor/settings");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let user: any = null;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    redirect("/login?redirect=/vendor/settings");
  }

  if (!user) {
    redirect("/login?redirect=/vendor/settings");
  }

  return <VendorSettingsClient initialUser={user} />;
}
