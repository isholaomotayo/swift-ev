"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Zap, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const requestReset = useMutation(api.auth.requestPasswordReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestReset({ email });
      setSent(true);
    } catch {
      // Show a generic error; don't reveal whether the email exists
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

        {sent ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-volt-green/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-volt-green" />
              </div>
            </div>
            <h1 className="text-2xl font-black">Check your inbox</h1>
            <p className="text-muted-foreground">
              If an account exists for{" "}
              <span className="font-semibold text-foreground">{email}</span>,
              we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                className="text-electric-blue hover:underline font-semibold"
                onClick={() => setSent(false)}
              >
                try again
              </button>
              .
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-2xl bg-electric-blue/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-electric-blue" />
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2">
                Forgot password?
              </h1>
              <p className="text-muted-foreground">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-14 rounded-2xl border-border bg-muted/30 focus:bg-background transition-all"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-lg font-bold bg-electric-blue hover:bg-electric-blue/90 shadow-xl shadow-electric-blue/10 text-white"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
