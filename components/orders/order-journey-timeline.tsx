"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface OrderJourneyTimelineProps {
  orderStatus: string;
  hasRegistrationForm?: boolean;
}

const STEPS = [
  { id: 1, label: "Discovery", key: "discovery" },
  { id: 2, label: "Selection", key: "selection" },
  { id: 3, label: "Purchase", key: "purchase" },
  { id: 4, label: "Identity (KYC)", key: "kyc" },
  { id: 5, label: "Payment", key: "payment" },
  { id: 6, label: "Account Access", key: "account" },
  { id: 7, label: "Guarantee Active", key: "guarantee" },
  { id: 8, label: "Pre-Shipment", key: "preshipment" },
  { id: 9, label: "Order Tracking", key: "tracking" },
  { id: 10, label: "Documentation", key: "documentation" },
  { id: 11, label: "Fulfillment", key: "fulfillment" },
];

export function OrderJourneyTimeline({
  orderStatus,
  hasRegistrationForm = false,
}: OrderJourneyTimelineProps) {
  const getActiveStepIndex = (status: string): number => {
    switch (status) {
      case "pending_payment":
        return 4; // Completed up to identity/payment initiation
      case "payment_partial":
        return 4;
      case "payment_complete":
        return 6; // Payment done, Guarantee active
      case "processing":
        return 7; // Pre-shipment waiting
      case "shipped":
      case "in_transit":
      case "customs_clearance":
        return hasRegistrationForm ? 9 : 8; // Order tracking / Documentation
      case "cleared":
      case "out_for_delivery":
        return 9;
      case "delivered":
        return 10; // All 11 completed
      default:
        return 3;
    }
  };

  const activeIndex = getActiveStepIndex(orderStatus);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">11-Step Purchase &amp; Fulfillment Journey</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          Step {activeIndex + 1} of 11
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[750px] flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

          {STEPS.map((step, index) => {
            const isCompleted = index <= activeIndex;
            const isCurrent = index === activeIndex + 1;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center text-center max-w-[65px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-brand-gold text-brand-primary ring-4 ring-brand-gold/20"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold mt-2 leading-tight ${
                  isCompleted
                    ? "text-emerald-700 dark:text-emerald-400"
                    : isCurrent
                    ? "text-slate-900 dark:text-white font-bold"
                    : "text-slate-400"
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
