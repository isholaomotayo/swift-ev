"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, Award, Lock, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface GuaranteeCertificateCardProps {
  orderNumber: string;
  guaranteePolicyNumber?: string;
  guaranteeActivatedAt?: number;
  guaranteeStatus?: string;
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    vin?: string;
  };
}

export function GuaranteeCertificateCard({
  orderNumber,
  guaranteePolicyNumber,
  guaranteeActivatedAt,
  guaranteeStatus = "active",
  vehicleInfo,
}: GuaranteeCertificateCardProps) {
  const policyNo = guaranteePolicyNumber || `MBG-${orderNumber}`;
  const activatedDate = guaranteeActivatedAt ? formatDate(guaranteeActivatedAt) : "Order Date";

  return (
    <Card className="relative overflow-hidden border-2 border-amber-300/60 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 p-6 shadow-md">
      {/* Top guarantee seal badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                100% Money-Back &amp; Condition Guarantee
              </h3>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300 font-mono mt-0.5">
              Policy #{policyNo} • Activated: {activatedDate}
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold px-3 py-1 uppercase text-[10px] tracking-wider">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {guaranteeStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4 text-xs">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">Escrow Protection</span>
            <span className="text-slate-500">Funds secured until delivery</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700">
          <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">180-Point Inspection</span>
            <span className="text-slate-500">Guaranteed functional condition</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-amber-200/50 dark:border-slate-700">
          <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">Full Money-Back Return</span>
            <span className="text-slate-500">Protection against non-conformity</span>
          </div>
        </div>
      </div>

      {vehicleInfo && (
        <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-amber-200/50 dark:border-slate-800 flex justify-between items-center">
          <span>
            Covered vehicle: <strong className="text-slate-900 dark:text-white">{vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}</strong>
          </span>
          {vehicleInfo.vin && (
            <span className="font-mono text-[11px]">VIN: {vehicleInfo.vin}</span>
          )}
        </div>
      )}
    </Card>
  );
}
