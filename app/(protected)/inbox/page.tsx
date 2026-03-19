import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "next/navigation";
import { UserMailClient } from "@/components/user/mail-client";
import { api } from "@/convex/_generated/api";

export const metadata: Metadata = {
  title: "Inbox | autoexports.live",
  description: "Your in-app email inbox",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InboxPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  let initialEmails: any = null;
  let initialStats: any = null;

  try {
    [initialEmails, initialStats] = await Promise.all([
      convex.query(api.userMail.listEmails, {
        token,
        folder: "inbox",
        limit: 50,
      }),
      convex.query(api.userMail.getMailStats, { token }),
    ]);
  } catch (error) {
    console.error("Failed to fetch inbox mail data:", error);
  }

  return <UserMailClient initialEmails={initialEmails} initialStats={initialStats} token={token} />;
}

