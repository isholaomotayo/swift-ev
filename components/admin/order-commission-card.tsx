"use client";

import React from "react";
import { DollarSign, ShieldCheck, UserCheck, Percent } from "lucide-react";

interface FractionalCommission {
  repId: string;
  role: string;
  sharePercent: number;
  amount: number;
}

interface OrderCommissionCardProps {
  subtotal: number;
  chinaImportLeadCommission?: number;
  facilitatorCommissionPercent?: number;
  facilitatorCommissionAmount?: number;
  fractionalCommissions?: FractionalCommission[];
}

export function OrderCommissionCard({
  subtotal,
  chinaImportLeadCommission,
  facilitatorCommissionPercent,
  facilitatorCommissionAmount,
  fractionalCommissions = [],
}: OrderCommissionCardProps) {
  const chinaLeadAmount = chinaImportLeadCommission ?? Math.round(subtotal * 0.03);
  const facilitatorAmount = facilitatorCommissionAmount ?? 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Commission Breakdown</h3>
            <p className="text-xs text-slate-400">Transaction & Sales Facilitator Shares</p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
          Active Structure
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* China Import Lead 3% */}
        <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs font-medium text-slate-300">China Import Lead</p>
              <p className="text-[11px] text-slate-400">3% Per Transaction</p>
            </div>
          </div>
          <span className="text-sm font-bold text-white">
            ₦{chinaLeadAmount.toLocaleString()}
          </span>
        </div>

        {/* Sales Facilitator */}
        <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <UserCheck className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs font-medium text-slate-300">Primary Facilitator</p>
              <p className="text-[11px] text-slate-400">
                {facilitatorCommissionPercent ? `${facilitatorCommissionPercent}% Rate` : "Standard Rep Rate"}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-white">
            ₦{facilitatorAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Fractional Commissions List */}
      {fractionalCommissions.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Fractional Rep Allocations
          </p>
          <div className="space-y-2">
            {fractionalCommissions.map((rep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-md border border-slate-850"
              >
                <div className="flex items-center space-x-2">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-medium text-slate-200">{rep.role}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-400">{rep.sharePercent}%</span>
                  <span className="font-semibold text-emerald-400">
                    ₦{rep.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
