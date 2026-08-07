"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFlutterwaveCheckout } from "@/hooks/use-flutterwave";
import { useFormatPrice } from "@/hooks/use-format-price";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  Copy,
  Loader2,
  Wallet,
} from "lucide-react";

interface OrderPaymentPanelProps {
  token: string;
  orderId: Id<"orders">;
  onSuccess?: () => void;
}

export function OrderPaymentPanel({
  token,
  orderId,
  onSuccess,
}: OrderPaymentPanelProps) {
  const { toast } = useToast();
  const formatPrice = useFormatPrice();
  const paymentState = useQuery(api.payments.getOrderPaymentState, {
    token,
    orderId,
  });
  const initiateBank = useMutation(api.payments.initiateBankTransferPayment);
  const payFromWallet = useMutation(api.payments.payOrderFromWallet);
  const initiateCard = useMutation(api.payments.initiateCardPayment);
  const confirmCard = useMutation(api.payments.confirmCardPayment);
  const { openCheckout, ready: flutterwaveReady } = useFlutterwaveCheckout();

  const [loading, setLoading] = useState<string | null>(null);
  const [buyerNote, setBuyerNote] = useState("");
  const [bankInstructions, setBankInstructions] = useState<{
    reference?: string;
    amount: number;
    bank: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      currency: string;
    };
  } | null>(null);

  if (!paymentState) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payment options…
        </div>
      </Card>
    );
  }

  const {
    order,
    bank,
    bankConfigured,
    walletAvailableKobo,
    canPay,
    payments,
    pendingBankTransfer,
    viewerRole,
  } = paymentState;

  const deadlinePassed = order.paymentDeadline < Date.now();
  const isSellerViewer = viewerRole === "seller";
  const depositPaid = payments
    .filter((p: { provider: string; status: string; amount: number }) =>
      p.provider === "deposit" && p.status === "successful"
    )
    .reduce(
      (sum: number, p: { amount: number }) => sum + p.amount,
      0
    );

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
    } catch {
      toast({
        title: "Copy failed",
        description: text,
        variant: "destructive",
      });
    }
  };

  const handleBankTransfer = async () => {
    setLoading("bank");
    try {
      const result = await initiateBank({
        token,
        orderId,
        buyerNote: buyerNote || undefined,
      });
      setBankInstructions({
        reference: result.reference,
        amount: result.amount,
        bank: result.bank,
      });
      toast({
        title: "Transfer instructions ready",
        description: "Use the reference as your transfer narration.",
      });
    } catch (error) {
      toast({
        title: "Could not start bank transfer",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleWalletPay = async () => {
    setLoading("wallet");
    try {
      await payFromWallet({ token, orderId });
      toast({ title: "Payment successful", description: "Wallet balance applied to your order." });
    } catch (error) {
      toast({
        title: "Wallet payment failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCardPay = async () => {
    if (!flutterwaveReady) {
      toast({
        title: "Payment unavailable",
        description: "Flutterwave checkout is still loading. Try again shortly.",
        variant: "destructive",
      });
      return;
    }
    setLoading("card");
    try {
      const init = await initiateCard({ token, orderId });
      openCheckout({
        txRef: init.txRef,
        amount: init.amount,
        currency: init.currency,
        customer: {
          email: init.email,
          name: init.name,
          phoneNumber: init.phone,
        },
        title: `Order ${order.orderNumber}`,
        description: "Vehicle purchase balance",
        onSuccess: async (payment) => {
          try {
            await confirmCard({
              token,
              txRef: payment.tx_ref,
              transactionId: payment.transaction_id,
            });
            toast({
              title: "Card payment successful",
              description: "Your payment has been confirmed.",
            });
          } catch (error) {
            toast({
              title: "Confirmation failed",
              description:
                error instanceof Error ? error.message : "Payment may still be processing",
              variant: "destructive",
            });
          } finally {
            setLoading(null);
          }
        },
        onClose: () => setLoading(null),
      });
    } catch (error) {
      toast({
        title: "Could not start card payment",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const instructions = bankInstructions ??
    (pendingBankTransfer && bank
      ? {
          reference: pendingBankTransfer.providerReference,
          amount: pendingBankTransfer.amount,
          bank,
        }
      : null);

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">
          {isSellerViewer ? "Payment status" : "Complete Payment"}
        </h2>
        {canPay ? (
          <Badge variant={deadlinePassed ? "destructive" : "secondary"}>
            Due {formatDate(order.paymentDeadline)}
          </Badge>
        ) : order.balanceDue <= 0 ? (
          <Badge>Paid</Badge>
        ) : (
          <Badge variant="secondary">Awaiting buyer payment</Badge>
        )}
      </div>

      {canPay && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Payment required — {formatPrice(order.balanceDue)} by{" "}
              {formatDate(order.paymentDeadline)}
            </p>
            <p className="text-amber-800 dark:text-amber-300">
              {depositPaid > 0
                ? `${formatPrice(depositPaid)} deposit already applied. `
                : ""}
              If you do not complete payment by the deadline, your reservation will be
              released and the vehicle will be available again
              {depositPaid > 0 ? " (deposit forfeited)" : ""}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-semibold font-mono">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="font-semibold font-mono">{formatCurrency(order.paidAmount)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Balance due</p>
          <p className="font-bold font-mono text-lg">{formatCurrency(order.balanceDue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Wallet available</p>
          <p className="font-semibold font-mono">
            {formatCurrency(walletAvailableKobo / 100)}
          </p>
        </div>
      </div>

      {canPay && (
        <div className="space-y-4 pt-2 border-t">
          {/* Bank transfer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <Building2 className="h-4 w-4" />
              Bank transfer (escrow)
            </div>
            {!bankConfigured ? (
              <p className="text-sm text-muted-foreground">
                Bank transfer is temporarily unavailable. Please pay by card or wallet, or contact support.
              </p>
            ) : !instructions ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="buyerNote">Note (optional)</Label>
                  <Textarea
                    id="buyerNote"
                    value={buyerNote}
                    onChange={(e) => setBuyerNote(e.target.value)}
                    placeholder="Optional note for admin verification"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleBankTransfer}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === "bank" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  Get transfer instructions
                </Button>
              </>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-4 space-y-3 text-sm">
                <p className="font-medium">Transfer exactly this amount to:</p>
                <div className="space-y-2">
                  <Row
                    label="Bank"
                    value={instructions.bank.bankName}
                    onCopy={() => copyText(instructions.bank.bankName, "Bank name")}
                  />
                  <Row
                    label="Account name"
                    value={instructions.bank.accountName}
                    onCopy={() => copyText(instructions.bank.accountName, "Account name")}
                  />
                  <Row
                    label="Account number"
                    value={instructions.bank.accountNumber}
                    onCopy={() =>
                      copyText(instructions.bank.accountNumber, "Account number")
                    }
                  />
                  <Row
                    label="Amount"
                    value={formatCurrency(instructions.amount)}
                    onCopy={() =>
                      copyText(String(instructions.amount), "Amount")
                    }
                  />
                  {instructions.reference && (
                    <Row
                      label="Reference / narration"
                      value={instructions.reference}
                      onCopy={() =>
                        copyText(instructions.reference!, "Payment reference")
                      }
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  After transferring, an admin will verify your payment. Keep the reference exact.
                </p>
              </div>
            )}
          </div>

          {/* Card */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCardPay}
            disabled={!!loading}
          >
            {loading === "card" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Pay with card
          </Button>

          {/* Wallet */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleWalletPay}
            disabled={!!loading || walletAvailableKobo < order.balanceDue * 100}
          >
            {loading === "wallet" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4 mr-2" />
            )}
            Pay from wallet
          </Button>
        </div>
      )}

      {payments.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <h3 className="font-semibold text-sm">Payment history</h3>
          {payments.map((payment: {
            _id: string;
            provider: string;
            status: string;
            amount: number;
            providerReference?: string;
            rejectionReason?: string;
            createdAt: number;
          }) => (
            <div
              key={payment._id}
              className="flex items-center justify-between text-sm gap-2"
            >
              <div>
                <p className="font-medium capitalize">
                  {payment.provider.replace("_", " ")} · {formatCurrency(payment.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(payment.createdAt)}
                  {payment.providerReference ? ` · ${payment.providerReference}` : ""}
                </p>
              </div>
              <Badge
                variant={
                  payment.status === "successful"
                    ? "default"
                    : payment.status === "rejected" || payment.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {payment.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono font-medium break-all">{value}</p>
      </div>
      <Button type="button" size="icon" variant="ghost" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
