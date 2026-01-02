"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Gavel, TrendingUp } from "lucide-react";
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
}: BidButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customBid, setCustomBid] = useState<string>("");
  const [maxBid, setMaxBid] = useState<string>("");
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const placeBidMutation = useMutation(api.bids.placeBid);
  const setMaxBidMutation = useMutation(api.bids.setMaxBid);

  const quickBidAmount = currentBid + bidIncrement;

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

    const token = localStorage.getItem("voltbid_token");
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again",
        variant: "destructive",
      });
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

    const token = localStorage.getItem("voltbid_token");
    if (!token) return;

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

    const token = localStorage.getItem("voltbid_token");
    if (!token) return;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className={className}>
          <Gavel className="mr-2 h-4 w-4" />
          Place Bid
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
                className="font-mono"
              />
            </div>

            <DialogFooter className="flex gap-2">
              {customBid ? (
                <Button
                  onClick={handleCustomBid}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Placing Bid..." : `Bid ${formatCurrency(parseFloat(customBid) || 0)}`}
                </Button>
              ) : (
                <Button
                  onClick={handleQuickBid}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Placing Bid..." : `Quick Bid ${formatCurrency(quickBidAmount)}`}
                </Button>
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
                onChange={(e) => setMaxBid(e.target.value)}
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
