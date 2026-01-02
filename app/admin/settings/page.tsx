import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { SettingsClient } from "@/components/admin/settings-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "System Settings | Admin | VoltBid Africa",
  description: "Configure platform-wide settings",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voltbid_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialSettings: any = null;

  try {
    initialSettings = await convex.query(api.settings.getSettings, { token });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    // Continue with null data
  }

  return (
    <SettingsClient initialSettings={initialSettings} token={token} />
  );
}
