"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { useAuth } from "@/components/providers/auth-provider";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const hasRun = useRef(false);

  // Read session context — available when the user is already logged in
  // (e.g. they logged in while pending, then clicked the email link)
  const { user, token: sessionToken } = useAuth();

  const verifyEmail = useMutation(api.auth.verifyEmail);
  const resendVerification = useMutation(api.auth.resendVerificationEmail);

  // Pre-populate resend email from logged-in user profile
  useEffect(() => {
    if (user?.email && !resendEmail) {
      setResendEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    // Guard: only run once (React StrictMode double-invokes effects in dev)
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setErrorMessage("No verification token found in the URL.");
      setStatus("error");
      return;
    }

    verifyEmail({ token })
      .then(() => {
        setStatus("success");
        // If user already has an active session, auto-redirect them to their
        // dashboard after a short delay so they can see the success message.
        if (sessionToken) {
          setTimeout(() => {
            if (user?.role === "seller") {
              router.replace("/vendor");
            } else if (user?.role === "admin" || user?.role === "superadmin") {
              router.replace("/admin");
            } else {
              router.replace("/dashboard");
            }
          }, 2500);
        }
      })
      .catch((err) => {
        setErrorMessage(
          getAuthErrorMessage(err, "Invalid or expired verification link.")
        );
        setStatus("error");
      });
  }, [token, verifyEmail]);

  if (status === "verifying") {
    return (
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 text-electric-blue mx-auto animate-spin" />
        <h1 className="text-2xl font-black">Verifying your email…</h1>
        <p className="text-muted-foreground">This only takes a moment.</p>
      </div>
    );
  }

  if (status === "success") {
    const isLoggedIn = !!sessionToken;
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-volt-green/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-volt-green" />
          </div>
        </div>
        <h1 className="text-2xl font-black">Email verified!</h1>
        <p className="text-muted-foreground">
          Your email has been confirmed and your account is now active.{" "}
          {isLoggedIn
            ? "Redirecting you to your dashboard…"
            : "You can now sign in and start bidding."}
        </p>
        {isLoggedIn ? (
          <div className="flex justify-center pt-2">
            <Loader2 className="h-6 w-6 animate-spin text-electric-blue" />
          </div>
        ) : (
          <Button asChild className="rounded-2xl bg-electric-blue text-white font-bold px-8">
            <Link href="/login?verified=true">Sign in to your account</Link>
          </Button>
        )}
      </div>
    );
  }

  // Error state
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      await resendVerification({ email: resendEmail.trim().toLowerCase() });
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-error-red/10 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-error-red" />
        </div>
      </div>
      <h1 className="text-2xl font-black">Verification failed</h1>
      <p className="text-muted-foreground">{errorMessage}</p>
      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-sm text-muted-foreground">
          Need a new verification link?
        </p>
        {resendSent ? (
          <p className="text-sm text-volt-green font-medium">
            Check your inbox for a new verification link.
          </p>
        ) : (
          <form
            onSubmit={handleResend}
            className="flex flex-col gap-3 w-full max-w-xs mx-auto"
          >
            <input
              type="email"
              required
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Enter your email"
              className="h-12 rounded-2xl border border-border bg-muted/30 px-4 text-sm focus:border-electric-blue focus:outline-none"
            />
            <Button
              type="submit"
              variant="outline"
              className="rounded-2xl font-bold"
              disabled={resendLoading}
            >
              {resendLoading ? "Sending…" : "Resend verification link"}
            </Button>
          </form>
        )}
        <Button asChild variant="outline" className="rounded-2xl font-bold">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-12 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-blue text-white shadow-xl shadow-electric-blue/20 group-hover:scale-110 transition-transform">
              <Zap className="h-7 w-7" fill="currentColor" />
            </div>
            <span className="font-black text-2xl tracking-tighter">
              autoexports <span className="text-gradient">.live</span>
            </span>
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-electric-blue mx-auto animate-spin" />
              <p className="text-muted-foreground">Loading…</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
