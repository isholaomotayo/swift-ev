"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  TrendingUp,
  CreditCard,
  Building2,
  Plus,
  Shield,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MockPaymentModal } from "@/components/shared/mock-payment-modal";

export function WalletDashboard() {
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [fundAmount, setFundAmount] = useState("");
  const [fundOpen, setFundOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Queries
  const walletData = useQuery(
    api.wallet.getWalletBalance,
    token ? { token } : "skip",
  );

  const transactions = useQuery(
    api.wallet.getTransactionHistory,
    token ? { token, limit: 10 } : "skip",
  );

  // Mutations
  const initiateFunding = useMutation(api.wallet.initiateWalletFunding);
  const confirmFunding = useMutation(api.wallet.confirmWalletFunding);

  const handleFundWallet = async () => {
    const amount = parseFloat(fundAmount) * 100; // Convert to kobo

    if (isNaN(amount) || amount < 10000) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit is ₦100",
        variant: "destructive",
      });
      return;
    }

    if (!token) return;

    // Store amount and open mock payment modal
    setPendingAmount(amount);
    setPaymentModalOpen(true);
    // We close the initial amount selection dialog
    setFundOpen(false);
  };

  const onPaymentComplete = async () => {
    if (!token || pendingAmount === 0) return;

    setLoading(true);
    try {
      const result = await initiateFunding({ token, amount: pendingAmount });

      // Confirm the funding after successful "payment"
      await confirmFunding({ reference: result.reference });

      toast({
        title: "Wallet Funded!",
        description: `₦${(pendingAmount / 100).toLocaleString()} added to your wallet`,
      });

      setFundAmount("");
      setPendingAmount(0);
    } catch (error) {
      toast({
        title: "Funding Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50000, 100000, 500000, 1000000]; // in Naira

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-lg mb-2">Login Required</h3>
          <p className="text-muted-foreground">
            Please login to view your wallet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Balance Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Available Balance */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-electric-blue to-blue-600 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/70">
              Available Balance
            </span>
            <Wallet className="h-5 w-5 text-white/70" />
          </div>
          <div className="text-3xl font-black mb-1">
            ₦{((walletData?.available ?? 0) / 100).toLocaleString()}
          </div>
          <p className="text-sm text-white/70">Ready to use</p>
        </div>

        {/* Reserved Balance */}
        <div className="p-6 rounded-3xl bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Reserved
            </span>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-3xl font-black text-foreground mb-1">
            ₦{((walletData?.reserved ?? 0) / 100).toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground">Held for active bids</p>
        </div>

        {/* Bidding Power */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-volt-green to-green-600 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/70">
              Bidding Power
            </span>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <div className="text-3xl font-black mb-1">
            ₦{((walletData?.biddingPower ?? 0) / 100).toLocaleString()}
          </div>
          <p className="text-sm text-white/70">Max bid amount (10× balance)</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Dialog open={fundOpen} onOpenChange={setFundOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 rounded-2xl h-14 px-8">
              <Plus className="h-5 w-5" />
              Fund Wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Fund Your Wallet</DialogTitle>
              <DialogDescription>
                Add funds to your wallet to increase your bidding power.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Quick Amounts */}
              <div className="grid grid-cols-2 gap-3">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setFundAmount(amount.toString())}
                    className={`
                      p-4 rounded-xl border-2 text-center transition-all
                      ${
                        fundAmount === amount.toString()
                          ? "border-electric-blue bg-blue-50 dark:bg-blue-900/20"
                          : "border-border hover:border-muted-foreground/50"
                      }
                    `}
                  >
                    <span className="font-bold text-lg">
                      ₦{amount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="space-y-2">
                <Label htmlFor="custom-amount">
                  Or enter custom amount (₦)
                </Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="h-14 text-lg font-mono"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <div className="flex gap-3">
                  <div className="flex-1 p-4 rounded-xl border-2 border-electric-blue bg-blue-50/50 dark:bg-blue-900/20 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-electric-blue" />
                    <span className="font-medium">Card</span>
                  </div>
                  <div className="flex-1 p-4 rounded-xl border-2 border-border flex items-center gap-3 opacity-50 cursor-not-allowed">
                    <Building2 className="h-5 w-5" />
                    <span className="font-medium">Bank</span>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl text-sm">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">
                  Payments are secured with 256-bit encryption. This is a
                  stubbed demo.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleFundWallet}
                disabled={loading || !fundAmount}
                className="w-full h-12 rounded-xl"
              >
                {loading
                  ? "Processing..."
                  : `Fund ₦${parseInt(fundAmount || "0").toLocaleString()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="lg"
          className="gap-2 rounded-2xl h-14 px-8"
          disabled
        >
          <ArrowUpRight className="h-5 w-5" />
          Withdraw
        </Button>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Transaction History</h2>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="bids">Bid Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <TransactionList transactions={transactions} />
          </TabsContent>

          <TabsContent value="deposits" className="mt-4">
            <TransactionList
              transactions={transactions?.filter((t) => t.type === "deposit")}
            />
          </TabsContent>

          <TabsContent value="bids" className="mt-4">
            <TransactionList
              transactions={transactions?.filter(
                (t) => t.type === "bid_reserve" || t.type === "bid_release",
              )}
            />
          </TabsContent>
        </Tabs>
      </div>

      <MockPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        amount={pendingAmount}
        currency="NGN"
        title="Fund Wallet"
        onPaymentComplete={onPaymentComplete}
      />
    </div>
  );
}

function TransactionList({ transactions }: { transactions?: any[] }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p>No transactions yet</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="h-5 w-5 text-volt-green" />;
      case "withdrawal":
        return <ArrowUpRight className="h-5 w-5 text-orange-500" />;
      case "bid_reserve":
        return <Clock className="h-5 w-5 text-electric-blue" />;
      case "bid_release":
        return <ArrowDownLeft className="h-5 w-5 text-volt-green" />;
      case "fee":
        return <ArrowUpRight className="h-5 w-5 text-red-500" />;
      default:
        return <Wallet className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "bid_release":
      case "refund":
        return "text-volt-green";
      case "withdrawal":
      case "bid_reserve":
      case "fee":
      case "payment":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case "deposit":
      case "bid_release":
      case "refund":
        return "+";
      case "withdrawal":
      case "bid_reserve":
      case "fee":
      case "payment":
        return "-";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx._id}
          className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              {getIcon(tx.type)}
            </div>
            <div>
              <p className="font-medium">{tx.description}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(tx.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className={`font-bold font-mono ${getAmountColor(tx.type)}`}>
            {getAmountPrefix(tx.type)}₦{(tx.amount / 100).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
