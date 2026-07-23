"use client";

import React from "react";
import { ShieldCheck, Lock, RotateCcw, ChevronRight, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HowItWorksModal } from "./how-it-works-modal";
import { cn } from "@/lib/utils";

interface MoneyBackGuaranteeCardProps {
  variant?: "sidebar" | "banner" | "compact";
  className?: string;
}

export function MoneyBackGuaranteeCard({
  variant = "sidebar",
  className,
}: MoneyBackGuaranteeCardProps) {
  if (variant === "compact") {
    return (
      <HowItWorksModal
        defaultTab="guarantee"
        trigger={
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer hover:bg-emerald-500/20 transition-all",
              className
            )}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% Money-Back Guarantee</span>
          </div>
        }
      />
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white relative overflow-hidden border border-emerald-500/30 shadow-xl",
          className
        )}
      >
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/30 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-lg md:text-xl text-white flex items-center gap-2">
                VoltBid Buyer Protection & Guarantee
              </h4>
              <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                Full money-back assurance on every vehicle purchase. Your funds remain in 100% secure escrow until the vehicle passes final inspection and is delivered.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-emerald-400 font-medium">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 100% Escrow Vault</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Marine Insurance</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 180-Point Pre-Shipment Inspection</span>
              </div>
            </div>
          </div>

          <HowItWorksModal
            defaultTab="guarantee"
            trigger={
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40 rounded-full text-xs font-semibold px-5 shrink-0"
              >
                Learn How You're Protected <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Default: Sidebar variant inside vehicle detail card
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h5 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
            100% Money-Back Guarantee
          </h5>
          <p className="text-xs text-emerald-800/90 dark:text-emerald-300 leading-snug">
            Protected by secure third-party escrow. Funds are only released after vehicle inspection & delivery.
          </p>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-900/80 dark:text-emerald-300 font-medium">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Full refund if vehicle fails pre-shipment check</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Zero money paid to seller prior to delivery</span>
        </div>
      </div>

      <div className="pt-1">
        <HowItWorksModal
          defaultTab="guarantee"
          trigger={
            <button className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1 transition-colors w-full justify-center underline underline-offset-2">
              View complete guarantee details
            </button>
          }
        />
      </div>
    </div>
  );
}
