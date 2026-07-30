"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  Mail,
  RefreshCw,
  LogOut,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KycVerification } from "@/components/kyc/kyc-verification";

export function PendingVerificationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [showKycFlow, setShowKycFlow] = useState(false);

  const resendVerification = useMutation(api.auth.resendVerificationEmail);
  const kycData = useQuery(
    api.kyc.getKycStatus,
    token ? { token } : "skip"
  );
  const currentUserQuery = useQuery(
    api.auth.getCurrentUser,
    token ? { token } : "skip"
  );

  const redirectParam = searchParams.get("redirect") || "/dashboard";

  // Auto-redirect if account becomes active
  useEffect(() => {
    if (currentUserQuery && currentUserQuery.status === "active") {
      toast({
        title: "Account Activated!",
        description: "Your account is active. Redirecting to your dashboard...",
      });
      router.replace(redirectParam);
    }
  }, [currentUserQuery, redirectParam, router, toast]);

  // Set email from logged in user profile
  useEffect(() => {
    if (user?.email) {
      setResendEmail(user.email);
    }
  }, [user]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    try {
      await resendVerification({ email: resendEmail.trim().toLowerCase() });
      setResendSent(true);
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox and click the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description: error.message || "Unable to send verification email.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleRefreshStatus = () => {
    if (currentUserQuery?.status === "active") {
      router.replace(redirectParam);
    } else {
      toast({
        title: "Status Checked",
        description: `Current account status: ${
          currentUserQuery?.status || user?.status || "pending"
        }`,
      });
    }
  };

  const currentStatus = currentUserQuery?.status || user?.status || "pending";
  const emailVerified = user?.emailVerified ?? false;
  const kycStatus = kycData?.status || user?.kycStatus || "not_started";

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-electric-blue/5 blur-[140px] pointer-events-none -z-10" />

      {/* Header / Logo Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-blue text-white shadow-lg shadow-electric-blue/20 group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5" fill="currentColor" />
          </div>
          <span className="font-black text-xl tracking-tighter">
            autoexports <span className="text-gradient">.live</span>
          </span>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground font-semibold rounded-xl"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Banner Card */}
        <Card className="p-8 rounded-[2.5rem] border border-amber-500/20 bg-card shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-1 md:mt-0">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Account Verification Pending
                  </h1>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30 uppercase font-bold text-xs px-3 py-1 rounded-full"
                  >
                    {currentStatus.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-xl">
                  Welcome back,{" "}
                  <span className="font-bold text-foreground">
                    {user?.firstName || "Member"}
                  </span>
                  . Your account is almost ready. Please complete the
                  verification steps below to gain full access to vehicle
                  bidding and orders.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleRefreshStatus}
              className="rounded-2xl h-12 px-5 font-bold border-border hover:bg-muted shrink-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Status
            </Button>
          </div>
        </Card>

        {/* Verification Status Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Email Verification */}
          <Card className="p-6 rounded-[2rem] border bg-card flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-lg">Email Verification</h3>
                </div>
                {emailVerified ? (
                  <Badge className="bg-volt-green/20 text-volt-green border-volt-green/30 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    VERIFIED
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 font-bold">
                    PENDING
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground font-medium mb-4">
                {emailVerified
                  ? `Your email address (${user?.email}) is verified.`
                  : `We sent a confirmation link to ${
                      user?.email || "your email"
                    }. Please click the link to confirm ownership.`}
              </p>

              {!emailVerified && (
                <div className="space-y-3">
                  {resendSent ? (
                    <div className="p-3 rounded-xl bg-volt-green/10 text-volt-green text-sm font-medium flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                      Verification email sent! Please check your inbox.
                    </div>
                  ) : (
                    <form onSubmit={handleResend} className="space-y-3">
                      <Input
                        type="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="Enter email"
                        className="h-11 rounded-xl"
                      />
                      <Button
                        type="submit"
                        disabled={resendLoading}
                        className="w-full h-11 rounded-xl font-bold bg-electric-blue hover:bg-electric-blue-dark"
                      >
                        {resendLoading ? "Sending..." : "Resend Verification Email"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {emailVerified && (
              <div className="pt-2 text-xs text-muted-foreground font-medium flex items-center">
                <CheckCircle2 className="h-4 w-4 text-volt-green mr-1.5" />
                Email address confirmed
              </div>
            )}
          </Card>

          {/* Card 2: Identity Verification (KYC) */}
          <Card className="p-6 rounded-[2rem] border bg-card flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-lg">Identity Verification (KYC)</h3>
                </div>
                {kycStatus === "approved" ? (
                  <Badge className="bg-volt-green/20 text-volt-green border-volt-green/30 font-bold">
                    APPROVED
                  </Badge>
                ) : kycStatus === "pending" ? (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 font-bold">
                    IN REVIEW
                  </Badge>
                ) : kycStatus === "rejected" ? (
                  <Badge variant="destructive" className="font-bold">
                    REJECTED
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-bold">
                    NOT STARTED
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground font-medium mb-4">
                {kycStatus === "approved"
                  ? "Identity verification is complete. You are clear to bid."
                  : kycStatus === "pending"
                  ? "Your documents are currently being reviewed by our compliance team (typically 24–48 hrs)."
                  : kycStatus === "rejected"
                  ? `Application rejected: ${
                      kycData?.rejectionReason || "Please re-submit clear documents."
                    }`
                  : "Complete government ID upload & NIN/BVN verification to activate full platform access."}
              </p>
            </div>

            <Button
              variant={showKycFlow ? "outline" : "default"}
              onClick={() => setShowKycFlow(!showKycFlow)}
              className="w-full h-11 rounded-xl font-bold"
            >
              {showKycFlow
                ? "Hide Verification Flow"
                : kycStatus === "pending"
                ? "View Verification Progress"
                : "Complete Identity Verification"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>

        {/* Embedded KYC Verification Flow (if expanded) */}
        {showKycFlow && (
          <Card className="p-8 rounded-[2.5rem] border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-black">Identity Verification Portal</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKycFlow(false)}
                className="text-muted-foreground"
              >
                Close
              </Button>
            </div>
            <KycVerification />
          </Card>
        )}

        {/* Instructions & Support Info Card */}
        <Card className="p-6 rounded-[2rem] border bg-muted/30">
          <div className="flex items-start gap-4">
            <HelpCircle className="h-6 w-6 text-electric-blue shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-bold text-base">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside font-medium">
                <li>
                  Once your email and identity documents are confirmed, your account status automatically turns <span className="font-bold text-foreground">Active</span>.
                </li>
                <li>
                  Our administration team reviews pending applications continuously. If you registered recently, your account may be auto-approved during routine system verification.
                </li>
                <li>
                  Need urgent access or have questions? Email our support team directly at{" "}
                  <a
                    href="mailto:hello@autoexports.live"
                    className="text-electric-blue font-bold hover:underline"
                  >
                    hello@autoexports.live
                  </a>
                  .
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-muted-foreground mt-8">
        &copy; 2026 autoexports.live &bull; All rights reserved.
      </div>
    </div>
  );
}
