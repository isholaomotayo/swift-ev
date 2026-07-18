import type { Metadata } from "next";
import { cookies } from "next/headers";
import { EmailTemplateManager } from "@/components/admin/email-template-manager";

export const metadata: Metadata = {
  title: "Email Templates | Admin | autoexports.live",
  description: "Preview, edit, and manage transactional email templates",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminEmailTemplatesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    return null; // Layout handles redirect
  }

  return <EmailTemplateManager token={token} />;
}
