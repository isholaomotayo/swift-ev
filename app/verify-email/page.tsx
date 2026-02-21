"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  const verifyEmail = useMutation(api.auth.verifyEmail);

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
      .then(() => setStatus("success"))
      .catch((err) => {
        setErrorMessage(
          err instanceof Error ? err.message : "Verification failed."
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
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-volt-green/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-volt-green" />
          </div>
        </div>
        <h1 className="text-2xl font-black">Email verified!</h1>
        <p className="text-muted-foreground">
          Your email has been confirmed and your account is now active. You can
          sign in and start bidding.
        </p>
        <Button asChild className="rounded-2xl bg-electric-blue text-white font-bold px-8">
          <Link href="/login">Sign in to your account</Link>
        </Button>
      </div>
    );
  }

  // Error state
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
