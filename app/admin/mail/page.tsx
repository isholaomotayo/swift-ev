import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { MailClient } from "@/components/admin/mail-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Mail | Admin | autoexports.live",
  description: "Admin email management",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMailPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialEmails: any = null;
  let initialStats: any = null;

  try {
    [initialEmails, initialStats] = await Promise.all([
      convex.query(api.adminMail.listEmails, {
        token,
        folder: "inbox",
        limit: 50,
      }),
      convex.query(api.adminMail.getMailStats, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch mail data:", error);
  }

  return (
    <MailClient
      initialEmails={initialEmails}
      initialStats={initialStats}
      token={token}
    />
  );
}
