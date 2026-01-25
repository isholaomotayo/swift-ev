"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Lock } from "lucide-react";

interface MockPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency?: string;
  onPaymentComplete: () => Promise<void> | void;
  title?: string;
  description?: string;
}

export function MockPaymentModal({
  open,
  onOpenChange,
  amount,
  currency = "NGN",
  onPaymentComplete,
  title = "Secure Payment",
  description,
}: MockPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
  });

  const handlePay = async () => {
    setLoading(true);
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      await onPaymentComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Payment failed", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
    }).format(val / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || `Complete your payment of ${formatAmount(amount)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CreditCard className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <CreditCard className="w-8 h-8" />
                <span className="font-mono text-xs opacity-70">MOCK CARD</span>
              </div>
              <div className="space-y-1">
                <label className="text-xs opacity-70 uppercase tracking-wider">
                  Card Number
                </label>
                <div className="font-mono text-xl tracking-widest">
                  {cardDetails.number || "0000 0000 0000 0000"}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="space-y-1">
                  <label className="text-xs opacity-70 uppercase tracking-wider">
                    Card Holder
                  </label>
                  <div className="font-medium uppercase">
                    {cardDetails.name || "YOUR NAME"}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-xs opacity-70 uppercase tracking-wider">
                    Expires
                  </label>
                  <div className="font-mono">
                    {cardDetails.expiry || "MM/YY"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Cardholder Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={cardDetails.name}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="number">Card Number</Label>
              <Input
                id="number"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={cardDetails.number}
                onChange={(e) => {
                  // Simple formatting
                  let val = e.target.value.replace(/\D/g, "");
                  val = val.replace(/(.{4})/g, "$1 ").trim();
                  setCardDetails({ ...cardDetails, number: val });
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  maxLength={5}
                  value={cardDetails.expiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length >= 2)
                      val = val.substring(0, 2) + "/" + val.substring(2, 4);
                    setCardDetails({ ...cardDetails, expiry: val });
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  maxLength={3}
                  value={cardDetails.cvc}
                  onChange={(e) =>
                    setCardDetails({ ...cardDetails, cvc: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center bg-muted/50 p-2 rounded-lg">
            <Lock className="w-3 h-3" />
            <span>This is a simulation. No real money will be charged.</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            onClick={handlePay}
            disabled={loading || !cardDetails.number || !cardDetails.cvc}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatAmount(amount)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
