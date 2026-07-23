"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  RotateCcw,
  Truck,
  FileCheck,
  CheckCircle2,
  Info,
  DollarSign,
  Sparkles,
  Search,
  Scale,
  Award,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HowItWorksModalProps {
  trigger?: React.ReactNode;
  defaultTab?: "process" | "guarantee";
  variant?: "button" | "link" | "icon" | "custom";
  className?: string;
}

export function HowItWorksModal({
  trigger,
  defaultTab = "process",
  variant = "button",
  className,
}: HowItWorksModalProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>(defaultTab);

  const defaultTrigger = (
    <Button
      variant="outline"
      className={cn(
        "rounded-full border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-2 font-medium transition-all shadow-sm",
        className
      )}
    >
      <Info className="h-4 w-4 text-electric-blue" />
      How it works
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 p-6 md:p-8 text-white">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-electric-blue/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-48 h-48 bg-volt-green/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-volt-green/10 text-volt-green border-volt-green/30 px-3 py-1 font-semibold uppercase tracking-wider text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Verified Buying Platform
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-400/20 px-3 py-1 text-xs">
                100% Escrow Protected
              </Badge>
            </div>
            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tight text-white pt-1">
              How Purchasing Works on VoltBid
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl">
              Transparent, escrow-backed vehicle sourcing. Buy with 100% confidence through verified 180-point inspections and guaranteed money-back protection.
            </DialogDescription>
          </div>
        </div>

        {/* Tab Navigation & Content */}
        <div className="p-6 md:p-8">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-6 p-1 bg-muted/60 rounded-full">
              <TabsTrigger value="process" className="rounded-full text-xs md:text-sm font-semibold py-2">
                How It Works (4 Steps)
              </TabsTrigger>
              <TabsTrigger value="guarantee" className="rounded-full text-xs md:text-sm font-semibold py-2">
                🛡️ Money-Back Guarantee
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 4-STEP PLATFORM PROCESS */}
            <TabsContent value="process" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="p-5 rounded-xl border border-border/60 bg-muted/20 relative overflow-hidden group hover:border-electric-blue/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-electric-blue/10 text-electric-blue flex items-center justify-center font-bold text-lg shrink-0 border border-electric-blue/20">
                      1
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        Select & Reserve / Bid
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Browse verified EVs with full inspection history. Purchase instantly via <strong>Buy Now</strong> or place a bid in live auctions.
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-electric-blue font-medium">
                        <Search className="w-3.5 h-3.5" /> Complete VIN & Battery SoH Transparency
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-5 rounded-xl border border-border/60 bg-muted/20 relative overflow-hidden group hover:border-volt-green/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-volt-green/10 text-volt-green flex items-center justify-center font-bold text-lg shrink-0 border border-volt-green/20">
                      2
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        Escrow Safeguard Payment
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your deposit and purchase funds are locked in an audited third-party <strong>Escrow Account</strong>. Funds are never released to sellers upfront.
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-volt-green font-medium">
                        <Lock className="w-3.5 h-3.5" /> 100% Risk-Free Payment Vault
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-5 rounded-xl border border-border/60 bg-muted/20 relative overflow-hidden group hover:border-amber-500/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shrink-0 border border-amber-500/20">
                      3
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        180-Point Inspection & Customs
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Independent engineers perform a pre-shipment 180-point check (battery degradation, chassis, electronics) and handle official export documentation.
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        <FileCheck className="w-3.5 h-3.5" /> Detailed Digital Inspection Certificate
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-5 rounded-xl border border-border/60 bg-muted/20 relative overflow-hidden group hover:border-purple-500/40 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg shrink-0 border border-purple-500/20">
                      4
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        Insured Shipping & Delivery
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Track live maritime logistics. Inspect your vehicle upon arrival before authorizing escrow release to the seller.
                      </p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                        <Truck className="w-3.5 h-3.5" /> Full Marine Insurance Coverage Included
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Guarantee Reassurance Callout */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                      Not 100% Satisfied or Vehicle Mismatch?
                    </h5>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Our Money-Back Guarantee covers non-delivery, inspection failures, and undisclosed major defects.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("guarantee")}
                  className="bg-white dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 font-semibold text-xs shrink-0 rounded-full"
                >
                  View Policy Details
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: MONEY-BACK GUARANTEE DEEP DIVE */}
            <TabsContent value="guarantee" className="space-y-6 mt-0">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 shrink-0">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-foreground">
                      The VoltBid 100% Money-Back Guarantee
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Complete financial assurance protected by audited escrow accounts and regulated transit insurance.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 bg-background/80 rounded-xl border border-border/50 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <RotateCcw className="w-4 h-4 text-emerald-500" />
                      Failed Inspection Refund
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      If pre-shipment inspection reveals undisclosed major damage or battery SoH degradation below standards, receive a full 100% refund immediately.
                    </p>
                  </div>

                  <div className="p-3.5 bg-background/80 rounded-xl border border-border/50 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      Escrow Release Protection
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Funds are held in a secure third-party custodial escrow account. Sellers are only paid AFTER you inspect and confirm vehicle receipt.
                    </p>
                  </div>

                  <div className="p-3.5 bg-background/80 rounded-xl border border-border/50 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <Truck className="w-4 h-4 text-emerald-500" />
                      Non-Delivery & Transit Protection
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Every shipment is backed by marine insurance. In the rare event of transit loss or customs rejections, your money is 100% protected and returned.
                    </p>
                  </div>

                  <div className="p-3.5 bg-background/80 rounded-xl border border-border/50 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                      <Scale className="w-4 h-4 text-emerald-500" />
                      Legal Accountability
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      VoltBid / AutoExports operates under official corporate registration with physical offices, giving you full legal recourse and consumer rights protection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Specific Conditions List */}
              <div className="space-y-3">
                <h5 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-volt-green" />
                  What is Covered Under the Guarantee?
                </h5>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Condition Mismatch:</strong> Vehicle condition differs significantly from documented 180-point inspection report.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Shipping & Port Incidents:</strong> Loss, severe transit damage, or customs clearance failure.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Undisclosed Title Defects:</strong> Title status mismatch or legal lien issues.</span>
                  </li>
                  <li className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span><strong>Seller Default:</strong> Failure of seller to dispatch vehicle within agreed fulfillment window.</span>
                  </li>
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold px-6"
                >
                  Understood & Continue Browsing
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact Popover version for quick hover / click reassurance
 */
export function HowItWorksPopover({ trigger, className }: { trigger?: React.ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className={cn("text-xs text-muted-foreground hover:text-foreground gap-1.5", className)}>
            <Info className="w-3.5 h-3.5 text-electric-blue" />
            How it works & Money-Back Guarantee
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-5 space-y-4 shadow-xl border-border/60 bg-card/95 backdrop-blur-md rounded-xl">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">100% Money-Back Guarantee</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escrow protected. Funds are held in a secure third-party account and only released when delivery is confirmed.
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-volt-green shrink-0" />
            <span>Full refund if pre-shipment inspection fails</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-volt-green shrink-0" />
            <span>Marine insured against transit loss or damage</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-volt-green shrink-0" />
            <span>Zero payment to seller until vehicle arrival</span>
          </div>
        </div>

        <div className="pt-1">
          <HowItWorksModal
            defaultTab="guarantee"
            trigger={
              <Button size="sm" variant="outline" className="w-full rounded-lg text-xs font-semibold hover:bg-muted">
                Read Full Guarantee Policy
              </Button>
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
