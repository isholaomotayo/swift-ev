"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Gavel, TrendingUp, Wallet, ShieldCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BidButtonProps {
  lotId: Id<"auctionLots">;
  currentBid: number;
  bidIncrement: number;
  isUserHighBidder?: boolean;
  userMaxBid?: number;
  disabled?: boolean;
  onSuccess?: () => void;
  className?: string;
  label?: string;
  buyNowPrice?: number;
  buyNowEnabled?: boolean;
  status?: string;
}

export function BidButton({
  lotId,
  currentBid,
  bidIncrement,
  isUserHighBidder = false,
  userMaxBid,
  disabled = false,
  onSuccess,
  className,
  label,
  buyNowPrice,
  buyNowEnabled,
  status,
}: BidButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customBid, setCustomBid] = useState<string>("");
  const [maxBid, setMaxBid] = useState<string>("");
  const { toast } = useToast();
  const { isAuthenticated, token } = useAuth();

  const placeBidMutation = useMutation(api.bids.placeBid);
  const setMaxBidMutation = useMutation(api.bids.setMaxBid);
  const purchaseMutation = useMutation(api.auctions.purchaseBuyItNow);

  // Get Wallet Info
  const walletData = useQuery(
    api.wallet.getWalletBalance,
    token ? { token } : "skip"
  );

  const availableBalance = walletData?.available ?? 0;
  const biddingPower = walletData?.biddingPower ?? 0;

  const quickBidAmount = currentBid + bidIncrement;
  const requireDeposit = Math.ceil(quickBidAmount * 0.1);
  const hasEnoughDeposit = availableBalance >= requireDeposit;

  const handleQuickBid = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to place a bid",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      await placeBidMutation({
        token,
        lotId,
        amount: quickBidAmount,
      });

      toast({
        title: "Bid Placed Successfully!",
        description: `You've placed a bid of ${formatCurrency(quickBidAmount)}`,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Bid Failed",
        description: error instanceof Error ? error.message : "There was an error placing your bid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomBid = async () => {
    const bidAmount = parseFloat(customBid);

    if (isNaN(bidAmount) || bidAmount < quickBidAmount) {
      toast({
        title: "Invalid Bid Amount",
        description: `Your bid must be at least ${formatCurrency(quickBidAmount)}`,
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to place a bid",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      await placeBidMutation({
        token,
        lotId,
        amount: bidAmount,
      });

      toast({
        title: "Bid Placed Successfully!",
        description: `You've placed a bid of ${formatCurrency(bidAmount)}`,
      });

      setOpen(false);
      setCustomBid("");
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Bid Failed",
        description: error instanceof Error ? error.message : "There was an error placing your bid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetMaxBid = async () => {
    const maxBidAmount = parseFloat(maxBid);

    if (isNaN(maxBidAmount) || maxBidAmount < quickBidAmount) {
      toast({
        title: "Invalid Max Bid",
        description: `Your max bid must be at least ${formatCurrency(quickBidAmount)}`,
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to set a max bid",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      await setMaxBidMutation({
        token,
        lotId,
        maxAmount: maxBidAmount,
      });

      toast({
        title: "Max Bid Set Successfully!",
        description: `We'll automatically bid on your behalf up to ${formatCurrency(maxBidAmount)}`,
      });

      setOpen(false);
      setMaxBid("");
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to Set Max Bid",
        description: error instanceof Error ? error.message : "There was an error setting your max bid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await purchaseMutation({ token, lotId });
      toast({
        title: "Purchase Successful!",
        description: `Order Created: ${result.orderNumber}`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Error processing purchase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className={className}>
          <Gavel className="mr-2 h-4 w-4" />
          {label || "Place Bid"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Place Your Bid</DialogTitle>
          <DialogDescription>
            Current bid: <span className="font-semibold font-mono">{formatCurrency(currentBid)}</span>
            {isUserHighBidder && (
              <span className="ml-2 text-volt-green">(You're the high bidder!)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Bid</TabsTrigger>
            <TabsTrigger value="max">Max Bid</TabsTrigger>
          </TabsList>

          {/* Quick Bid Tab */}
          <TabsContent value="quick" className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Quick Bid Amount</span>
                <span className="text-2xl font-bold font-mono text-electric-blue">
                  {formatCurrency(quickBidAmount)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum increment: {formatCurrency(bidIncrement)}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="custom-bid">Or Enter Custom Bid</Label>
              <Input
                id="custom-bid"
                type="number"
                placeholder={`Min: ${formatCurrency(quickBidAmount)}`}
                value={customBid}
                onChange={(e) => setCustomBid(e.target.value)}
                className="font-mono h-12 text-lg"
              />
            </div>

            {/* Wallet Integration Info */}
            <div className={`
              p-4 rounded-xl border-2 space-y-3
              ${hasEnoughDeposit
                ? "bg-volt-green/5 border-volt-green/20"
                : "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30"}
            `}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Wallet className={`h-4 w-4 ${hasEnoughDeposit ? "text-volt-green" : "text-red-500"}`} />
                  Available Wallet Balance
                </div>
                <span className={`font-mono font-bold ${hasEnoughDeposit ? "text-volt-green" : "text-red-500"}`}>
                  {formatCurrency(availableBalance / 100)}
                </span>
              </div>

              <div className="h-px bg-border/50" />

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Required 10% Deposit</span>
                <span className="font-bold">{formatCurrency((customBid ? parseFloat(customBid) : quickBidAmount) * 0.1)}</span>
              </div>

              {!hasEnoughDeposit && (
                <div className="flex items-start gap-2 pt-1">
                  <ShieldCheck className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-tight">
                    Insufficient funds. Your bidding power is {formatCurrency(biddingPower / 100)}. Please fund your wallet.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col gap-3">
              <div className="flex gap-2 w-full">
                {customBid ? (
                  <Button
                    onClick={handleCustomBid}
                    disabled={loading || !hasEnoughDeposit}
                    className="flex-1 h-12 rounded-xl text-lg font-bold"
                  >
                    {loading ? "Placing Bid..." : `Bid ${formatCurrency(parseFloat(customBid) || 0)}`}
                  </Button>
                ) : (
                  <Button
                    onClick={handleQuickBid}
                    disabled={loading || !hasEnoughDeposit}
                    className="flex-1 h-12 rounded-xl text-lg font-bold"
                  >
                    {loading ? "Placing Bid..." : `Quick Bid ${formatCurrency(quickBidAmount)}`}
                  </Button>
                )}
              </div>

              {/* Buy Now Option */}
              {buyNowEnabled && buyNowPrice && status === "pending" && (
                <div className="pt-2 border-t mt-2">
                  <Button
                    variant="outline"
                    onClick={handleBuyNow}
                    disabled={loading}
                    className="w-full h-12 rounded-xl border-volt-green/50 text-volt-green hover:bg-volt-green hover:text-slate-950 transition-all font-bold gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Buy Now for {formatCurrency(buyNowPrice)}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-widest font-bold">
                    Skip the auction & win instantly
                  </p>
                </div>
              )}
            </DialogFooter>
          </TabsContent>

          {/* Max Bid Tab */}
          <TabsContent value="max" className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-electric-blue" />
                <span className="font-semibold">Automatic Bidding</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Set your maximum bid and we'll automatically bid on your behalf,
                incrementally, up to your limit.
              </p>
            </div>

            {userMaxBid && (
              <div className="rounded-lg border p-3 bg-volt-green/10 border-volt-green/30">
                <p className="text-sm">
                  Current max bid:{" "}
                  <span className="font-semibold font-mono">{formatCurrency(userMaxBid)}</span>
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label htmlFor="max-bid">
                {userMaxBid ? "Update" : "Set"} Maximum Bid
              </Label>
              <Input
                id="max-bid"
                type="number"
                placeholder={`Min: ${formatCurrency(quickBidAmount)}`}
                value={maxBid}
                onChange={(e) => setCustomBid(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                We'll bid incrementally on your behalf, up to this amount.
              </p>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSetMaxBid}
                disabled={loading || !maxBid}
                className="w-full"
              >
                {loading ? "Setting Max Bid..." : userMaxBid ? "Update Max Bid" : "Set Max Bid"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
