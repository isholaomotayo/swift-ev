import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EmailReviewClient } from "@/components/admin/email-review-client";

export const metadata: Metadata = {
  title: "Outgoing Email Review | Admin | autoexports.live",
  description: "Review, edit, preview, and approve outgoing emails for platform events",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMailReviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout will handle redirect
  }

  return <EmailReviewClient token={token} />;
}
