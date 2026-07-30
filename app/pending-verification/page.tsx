import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex-server";
import { PendingVerificationClient } from "@/components/auth/pending-verification-client";

export const metadata: Metadata = {
  title: "Account Verification Pending | autoexports.live",
  description: "Complete your email and identity verification to access autoexports.live.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PendingVerificationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("autoexports_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const convex = getConvexClient();
  let user;

  try {
    user = await convex.query(api.auth.getCurrentUser, { token });
  } catch (error) {
    redirect("/login?auth_failed=1");
  }

  if (!user) {
    redirect("/login");
  }

  // If the user's status is already active, send them straight to dashboard
  if (user.status === "active") {
    redirect("/dashboard");
  }

  return <PendingVerificationClient />;
}
