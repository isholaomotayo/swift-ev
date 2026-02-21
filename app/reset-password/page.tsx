"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useAction(api.authActions.resetPassword);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <XCircle className="h-12 w-12 text-error-red mx-auto" />
        <h1 className="text-2xl font-black">Invalid link</h1>
        <p className="text-muted-foreground">
          This password reset link is invalid or has already been used.
        </p>
        <Link
          href="/forgot-password"
          className="text-electric-blue hover:underline font-semibold"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPassword({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-volt-green/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-volt-green" />
          </div>
        </div>
        <h1 className="text-2xl font-black">Password updated!</h1>
        <p className="text-muted-foreground">
          Your password has been changed successfully. Redirecting you to
          login…
        </p>
        <Link
          href="/login"
          className="text-electric-blue hover:underline font-semibold"
        >
          Go to login now
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-tight mb-2">
          Set new password
        </h1>
        <p className="text-muted-foreground">
          Choose a strong password of at least 8 characters.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-error-red/30 bg-error-red/5 text-error-red text-sm font-medium flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
          >
            New password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-14 rounded-2xl border-border bg-muted/30 focus:bg-background transition-all pr-12"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="confirm"
            className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
          >
            Confirm password
          </Label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your new password"
            className="h-14 rounded-2xl border-border bg-muted/30 focus:bg-background transition-all"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue/90 shadow-xl shadow-electric-blue/10 text-white"
          disabled={loading}
        >
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-electric-blue text-white shadow-xl shadow-electric-blue/20 group-hover:scale-110 transition-transform">
              <Zap className="h-7 w-7" fill="currentColor" />
            </div>
            <span className="font-black text-2xl tracking-tighter">
              autoexports <span className="text-gradient">.live</span>
            </span>
          </Link>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-xl" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
