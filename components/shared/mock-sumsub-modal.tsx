"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileText,
  User,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MockSumsubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationComplete: () => Promise<void> | void;
  applicantId?: string;
}

type Step = "intro" | "document" | "selfie" | "processing" | "success";

export function MockSumsubModal({
  open,
  onOpenChange,
  onVerificationComplete,
  applicantId,
}: MockSumsubModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      // Use setTimeout to avoid synchronous state update warning during effect info
      // or rely on key prop in parent to reset state, but here we force it
      const timer = setTimeout(() => {
        setStep("intro");
        setProgress(0);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleNext = async () => {
    if (step === "intro") {
      setStep("document");
      setProgress(25);
    } else if (step === "document") {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
      setStep("selfie");
      setProgress(50);
    } else if (step === "selfie") {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1500));
      setLoading(false);
      setStep("processing");
      setProgress(75);

      // Auto advance from processing to success
      setTimeout(() => {
        setProgress(100);
        setStep("success");
      }, 3000);
    } else if (step === "success") {
      await onVerificationComplete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-900 border-none shadow-2xl">
        {/* Header / Sumsub branding simulation */}
        <div className="bg-slate-50 dark:bg-zinc-800 p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className="font-semibold text-sm">
              Sumsub Identity Verification
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="h-1" />
          </div>

          {step === "intro" && (
            <div className="flex-1 flex flex-col items-center text-center space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Verify your identity
                </h2>
                <p className="text-muted-foreground text-sm">
                  It will take about 2 minutes. You&apos;ll need a valid
                  government-issued ID.
                </p>
              </div>

              <div className="w-full space-y-3 text-left bg-muted/30 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 text-sm font-bold">
                    1
                  </div>
                  <span className="text-sm font-medium">
                    Upload ID Document
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 text-sm font-bold">
                    2
                  </div>
                  <span className="text-sm font-medium">Take a Selfie</span>
                </div>
              </div>

              <div className="mt-auto w-full pt-4">
                <label className="flex items-start gap-2 text-left text-xs text-muted-foreground mb-4">
                  <input type="checkbox" className="mt-1" defaultChecked />I
                  agree to the processing of my personal data for the purpose of
                  identity verification.
                </label>
              </div>
            </div>
          )}

          {step === "document" && (
            <div className="flex-1 flex flex-col text-center space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold">Upload a document</h2>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "Passport",
                  "ID Card",
                  "Driver's License",
                  "Residence Permit",
                ].map((doc) => (
                  <button
                    key={doc}
                    onClick={handleNext}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-all h-32 gap-3 group"
                  >
                    <FileText className="w-8 h-8 text-muted-foreground group-hover:text-blue-500" />
                    <span className="text-sm font-medium group-hover:text-blue-600">
                      {doc}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg flex gap-3 items-start text-left">
                <div className="mt-0.5">💡</div>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Ensure your document is valid and not expired. All details
                  must be clear and readable.
                </p>
              </div>
            </div>
          )}

          {step === "selfie" && (
            <div className="flex-1 flex flex-col items-center text-center space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold">Face Verification</h2>

              <div className="relative w-64 h-64 bg-black rounded-full overflow-hidden border-4 border-white shadow-xl mx-auto flex items-center justify-center">
                {/* Simulated Camera View */}
                <div className="absolute inset-0 bg-black/30 z-10"></div>
                <User className="w-32 h-32 text-white/20" />
                <div className="absolute bottom-6 left-0 right-0 text-white text-xs z-20 font-medium">
                  Position your face in the circle
                </div>
                <div className="absolute inset-4 border-2 border-white/30 rounded-full border-dashed animate-pulse"></div>
              </div>

              <p className="text-sm text-muted-foreground">
                Please look straight at the camera and hold still.
              </p>
            </div>
          )}

          {step === "processing" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Analyzing data...</h2>
                <p className="text-muted-foreground text-sm">
                  Please wait while we verify your information.
                </p>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Verification Submitted
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Your data has been successfully transmitted. We will notify
                  you once the review is complete.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-slate-50 dark:bg-zinc-800/50">
          <Button
            size="lg"
            onClick={handleNext}
            disabled={loading || step === "processing"}
            className="w-full rounded-xl h-12 font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : step === "intro" ? (
              "Start Verification"
            ) : step === "document" ? (
              "Upload Layout" // Hidden by grid buttons, but safe fallback
            ) : step === "selfie" ? (
              "I'm Ready"
            ) : step === "success" ? (
              "Done"
            ) : (
              "Please Wait"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
