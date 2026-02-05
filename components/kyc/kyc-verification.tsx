"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Shield,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Camera,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MockSumsubModal } from "@/components/shared/mock-sumsub-modal";
import { useFlutterwaveCheckout } from "@/hooks/use-flutterwave";

type VerificationStep = "fee" | "documents" | "review" | "complete";

export function KycVerification() {
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Modal states
  const [sumsubModalOpen, setSumsubModalOpen] = useState(false);

  // Queries
  const kycStatus = useQuery(api.kyc.getKycStatus, token ? { token } : "skip");

  // Mutations
  const initiateVerificationFeePayment = useMutation(
    api.kyc.initiateVerificationFeePayment
  );
  const confirmVerificationFeePayment = useMutation(
    api.kyc.confirmVerificationFeePayment
  );
  const generateSumsubToken = useMutation(api.kyc.generateSumsubToken);
  const submitKycDocuments = useMutation(api.kyc.submitKycDocuments);
  const simulateApproval = useMutation(api.kyc.simulateKycApproval);

  const { ready: flutterwaveReady, error: flutterwaveError, openCheckout } =
    useFlutterwaveCheckout();

  const getCurrentStep = (): VerificationStep => {
    if (!kycStatus) return "fee";
    if (kycStatus.status === "approved") return "complete";
    if (kycStatus.status === "pending") return "review";
    if (kycStatus.verificationFeeStatus === "paid") return "documents";
    return "fee";
  };

  const currentStep = getCurrentStep();

  const handlePayFee = async () => {
    if (!token || !user) return;
    if (!process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY) {
      toast({
        title: "Payment Unavailable",
        description: "Flutterwave public key is not configured.",
        variant: "destructive",
      });
      return;
    }
    if (!flutterwaveReady || flutterwaveError) {
      toast({
        title: "Payment Unavailable",
        description:
          flutterwaveError || "Flutterwave is still loading. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const init = await initiateVerificationFeePayment({ token });
      const amount = Number((init.amount / 100).toFixed(2));

      openCheckout({
        txRef: init.txRef,
        amount,
        currency: init.currency,
        customer: {
          email: init.customer.email ?? user.email,
          name: init.customer.name ?? `${user.firstName} ${user.lastName}`,
          phoneNumber: init.customer.phone ?? user.phone,
        },
        title: "Pay Verification Fee",
        description: "Secure payment for identity verification processing.",
        meta: {
          payment_type: "kyc_verification_fee",
        },
        onSuccess: async (payment) => {
          try {
            await confirmVerificationFeePayment({
              token,
              txRef: init.txRef,
              transactionId: payment.transaction_id,
            });
            toast({
              title: "Fee Paid Successfully",
              description: "You can now proceed with document verification",
            });
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description:
                error instanceof Error ? error.message : "Please try again",
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (error) {
      toast({
        title: "Payment Initialization Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    if (!token) return;
    setSumsubModalOpen(true);
  };

  const onVerificationComplete = async () => {
    if (!token) return;
    try {
      // First generate token (backend requirement)
      await generateSumsubToken({ token });
      // Then submit documents
      await submitKycDocuments({ token });
      toast({
        title: "Documents Submitted",
        description: "Your verification is now under review",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // STUB: For testing purposes
  const handleSimulateApproval = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await simulateApproval({ token, approve: true });
      toast({
        title: "KYC Approved!",
        description: "Your account is now fully verified",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-lg mb-2">Login Required</h3>
          <p className="text-muted-foreground">
            Please login to verify your account
          </p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: "fee", label: "Verification Fee", icon: CreditCard },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "review", label: "Review", icon: Clock },
    { id: "complete", label: "Verified", icon: CheckCircle2 },
  ];

  const stepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isComplete = i < stepIndex;
          const isCurrent = i === stepIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                flex items-center gap-3
                ${isComplete ? "text-volt-green" : isCurrent ? "text-electric-blue" : "text-muted-foreground"}
              `}
              >
                <div
                  className={`
                  h-10 w-10 rounded-full flex items-center justify-center
                  ${
                    isComplete
                      ? "bg-volt-green text-slate-950"
                      : isCurrent
                        ? "bg-electric-blue text-white"
                        : "bg-muted text-muted-foreground"
                  }
                `}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="font-medium hidden sm:block">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`
                  w-12 h-0.5 mx-2
                  ${i < stepIndex ? "bg-volt-green" : "bg-muted"}
                `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-3xl border p-8 bg-card">
        {currentStep === "fee" && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-electric-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">Verification Fee</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                A one-time $3 verification fee is required to ensure the
                integrity of our auction platform.
              </p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-6 max-w-sm mx-auto">
              <div className="text-4xl font-black text-electric-blue mb-2">
                $3.00
              </div>
              <p className="text-sm text-muted-foreground">
                One-time fee (approx. ₦4,500)
              </p>
            </div>
            <Button
              size="lg"
              onClick={handlePayFee}
              disabled={loading}
              className="h-14 px-8 rounded-2xl"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : null}
              Pay Verification Fee
            </Button>
          </div>
        )}

        {currentStep === "documents" && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Camera className="h-10 w-10 text-electric-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">
                Identity Verification
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Upload a valid ID document and take a selfie to verify your
                identity.
              </p>
            </div>

            {/* Stubbed Document Upload UI */}
            <div className="grid md:grid-cols-2 gap-4 max-w-xl mx-auto">
              <div className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-electric-blue transition-colors cursor-pointer">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">ID Document</p>
                <p className="text-xs text-muted-foreground">
                  Passport, NIN, Driver's License
                </p>
              </div>
              <div className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-electric-blue transition-colors cursor-pointer">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Selfie</p>
                <p className="text-xs text-muted-foreground">
                  Face verification photo
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Button
                size="lg"
                onClick={handleStartVerification}
                disabled={loading}
                className="h-14 rounded-2xl"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                Submit for Verification
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground">
                This is a stubbed demo — documents are simulated
              </p>
            </div>
          </div>
        )}

        {currentStep === "review" && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">Under Review</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your documents are being reviewed. This typically takes 24-48
                hours.
              </p>
            </div>
            <div className="bg-muted/50 rounded-2xl p-6 max-w-sm mx-auto">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-bold">Pending Review</span>
              </div>
            </div>

            {/* STUB: Testing button */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                For testing purposes:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateApproval}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Simulate Approval
              </Button>
            </div>
          </div>
        )}

        {currentStep === "complete" && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-volt-green" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">Fully Verified!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Your account is verified. You can now participate in auctions
                and place bids.
              </p>
            </div>
            <div className="bg-green-50/50 dark:bg-green-900/20 rounded-2xl p-6 max-w-sm mx-auto border border-green-100 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 text-volt-green font-bold">
                <Shield className="h-5 w-5" />
                Verified Member
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Approved on{" "}
                {kycStatus?.approvedAt
                  ? new Date(kycStatus.approvedAt).toLocaleDateString()
                  : "Today"}
              </p>
            </div>
            <Button size="lg" asChild className="h-14 px-8 rounded-2xl">
              <Link href="/auctions">Browse Auctions</Link>
            </Button>
          </div>
        )}
      </div>

      <MockSumsubModal
        open={sumsubModalOpen}
        onOpenChange={setSumsubModalOpen}
        onVerificationComplete={onVerificationComplete}
      />
    </div>
  );
}
