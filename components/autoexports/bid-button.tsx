"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useCurrencyStore } from "@/store/currency";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { useToast } from "@/hooks/use-toast";
import {
  calculateBuyNowPricing,
  DESTINATION_LABELS,
  type DestinationPort,
} from "@/lib/buy-now-pricing";

interface BidButtonProps {
  lotId?: Id<"auctionLots">;
  vehicleId?: Id<"vehicles">;
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
  vehicleId,
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
  const [confirmBuyNow, setConfirmBuyNow] = useState(false);
  const [destination, setDestination] = useState<DestinationPort>("lagos");
  const { toast } = useToast();
  const router = useRouter();
  const { isAuthenticated, token } = useAuth();
  const currency = useCurrencyStore((s) => s.currency);
  const exchangeRates = useExchangeRates();

  const placeBidMutation = useMutation(api.bids.placeBid);
  const setMaxBidMutation = useMutation(api.bids.setMaxBid);
  const purchaseAuctionLotMutation = useMutation(api.auctions.purchaseBuyItNow);
  const purchaseVehicleDirectlyMutation = useMutation(api.vehicles.purchaseVehicleDirectly);

  // Get Wallet Info
  const walletData = useQuery(
    api.wallet.getWalletBalance,
    token ? { token } : "skip"
  );

  const availableBalance = walletData?.available ?? 0;
  const biddingPower = walletData?.biddingPower ?? 0;

  const quickBidAmount = currentBid + bidIncrement;
  const parsedCustomBid = parseFloat(customBid);
  const bidAmountForDeposit =
    customBid && Number.isFinite(parsedCustomBid) ? parsedCustomBid : quickBidAmount;
  const requiredDepositKobo = Math.ceil(bidAmountForDeposit * 10);
  const hasEnoughDeposit = availableBalance >= requiredDepositKobo;

  const redirectToLogin = () => {
    const redirect =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/vehicles";
    window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
  };

  const handleQuickBid = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to place a bid",
        variant: "destructive",
      });
      redirectToLogin();
      return;
    }

    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again",
        variant: "destructive",
      });
      redirectToLogin();
      return;
    }

    if (!lotId) {
      toast({
        title: "Action Not Available",
        description: "This vehicle is not in an active auction.",
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
        description: `You've placed a bid of ${formatCurrency(quickBidAmount, { currency, exchangeRates })}${currency !== "NGN" ? ` (~${formatCurrency(quickBidAmount, { currency: "NGN" })})` : ""}`,
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
      redirectToLogin();
      return;
    }

    if (!token) {
      redirectToLogin();
      return;
    }

    if (!lotId) {
      toast({
        title: "Action Not Available",
        description: "This vehicle is not in an active auction.",
        variant: "destructive",
      });
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
        description: `You've placed a bid of ${formatCurrency(bidAmount, { currency, exchangeRates })}${currency !== "NGN" ? ` (~${formatCurrency(bidAmount, { currency: "NGN" })})` : ""}`,
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
      redirectToLogin();
      return;
    }

    if (!token) {
      redirectToLogin();
      return;
    }

    if (!lotId) {
      toast({
        title: "Action Not Available",
        description: "This vehicle is not in an active auction.",
        variant: "destructive",
      });
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
        description: `We'll automatically bid on your behalf up to ${formatCurrency(maxBidAmount, { currency, exchangeRates })}${currency !== "NGN" ? ` (~${formatCurrency(maxBidAmount, { currency: "NGN" })})` : ""}`,
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
    if (!isAuthenticated || !token) {
      toast({
        title: "Login required",
        description: "Please log in to buy this vehicle",
        variant: "destructive",
      });
      redirectToLogin();
      return;
    }

    if (!buyNowPrice) return;

    setLoading(true);
    try {
      let result;
      if (lotId) {
        result = await purchaseAuctionLotMutation({
          token,
          lotId,
          destination,
        });
      } else if (vehicleId) {
        result = await purchaseVehicleDirectlyMutation({
          token,
          vehicleId,
          destination,
        });
      } else {
        throw new Error("Missing item identifier for purchase");
      }

      toast({
        title: "Order created — complete payment",
        description: `Order ${result.orderNumber}. Pay within 72 hours to secure this vehicle.`,
      });
      setOpen(false);
      setConfirmBuyNow(false);
      onSuccess?.();
      router.push(`/orders/${result.orderId}`);
    } catch (error) {
      toast({
        title: "Could not create order",
        description: error instanceof Error ? error.message : "Error processing purchase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showBuyNow =
    !!buyNowEnabled &&
    !!buyNowPrice &&
    status !== "active" &&
    status !== "payment_pending";
  const isDirectPurchaseOnly = showBuyNow && !lotId;
  // During live bidding, bidding is primary; otherwise Buy Now leads
  const showBidding = !!lotId && (status === "active" || status === "pending");
  const buyNowPricing = buyNowPrice
    ? calculateBuyNowPricing(buyNowPrice, destination)
    : null;

  const triggerLabel =
    label ||
    (isDirectPurchaseOnly
      ? "Buy Now"
      : showBuyNow
        ? "Buy Now or Bid"
        : "Place Bid");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmBuyNow(false);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} className={className}>
          {showBuyNow ? (
            <ShoppingCart className="mr-2 h-4 w-4" />
          ) : (
            <Gavel className="mr-2 h-4 w-4" />
          )}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isDirectPurchaseOnly
              ? "Purchase Now"
              : showBuyNow
                ? "Buy Now or Place a Bid"
                : "Place Your Bid"}
          </DialogTitle>
          <DialogDescription>
            {showBidding ? (
              <>
                Current bid:{" "}
                <span className="font-semibold font-mono">
                  {formatCurrency(currentBid, { currency, exchangeRates })}
                </span>
                {isUserHighBidder && (
                  <span className="ml-2 text-volt-green">(You&apos;re the high bidder!)</span>
                )}
              </>
            ) : (
              "Purchase this vehicle immediately at the Buy Now price."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Buy Now — primary purchase option with all-in fee confirmation */}
        {showBuyNow && buyNowPricing && (
          <div className="rounded-xl border-2 border-volt-green/40 bg-volt-green/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                <ShoppingCart className="h-5 w-5 text-volt-green" />
                {confirmBuyNow ? "Review total before you pay" : "Buy Now"}
              </div>
              <span className="text-2xl font-bold font-mono text-volt-green">
                {formatCurrency(
                  confirmBuyNow ? buyNowPricing.totalAmount : buyNowPrice!,
                  { currency, exchangeRates }
                )}
              </span>
            </div>

            {!confirmBuyNow ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Vehicle price shown. Continue to see shipping, customs, and fees — then pay on
                  your order page. Ownership is only secured after payment.
                </p>
                <Button
                  onClick={() => setConfirmBuyNow(true)}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-volt-green text-slate-950 hover:bg-volt-green/90 font-bold gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now — see total with fees
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Destination</Label>
                  <Select
                    value={destination}
                    onValueChange={(v) => setDestination(v as DestinationPort)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lagos">{DESTINATION_LABELS.lagos}</SelectItem>
                      <SelectItem value="port_harcourt">
                        {DESTINATION_LABELS.port_harcourt}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-background/80 p-3 space-y-1.5 text-sm">
                  <FeeRow
                    label="Vehicle price"
                    amount={buyNowPricing.vehiclePrice}
                    currency={currency}
                    exchangeRates={exchangeRates}
                  />
                  <FeeRow
                    label="Service fee"
                    amount={buyNowPricing.serviceFee}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <FeeRow
                    label="Documentation"
                    amount={buyNowPricing.documentationFee}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <FeeRow
                    label="Inspection"
                    amount={buyNowPricing.inspectionFee}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <FeeRow
                    label="Shipping"
                    amount={buyNowPricing.shippingCost}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <FeeRow
                    label="Customs & clearing"
                    amount={buyNowPricing.customsClearingFee}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <FeeRow
                    label="Registration"
                    amount={buyNowPricing.registrationFee}
                    currency={currency}
                    exchangeRates={exchangeRates}
                    muted
                  />
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total due</span>
                    <span className="font-mono">
                      {formatCurrency(buyNowPricing.totalAmount, {
                        currency,
                        exchangeRates,
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Confirming creates a pending order and reserves this listing. You must complete
                  payment within 72 hours — the car stays in inventory as reserved until then.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmBuyNow(false)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={loading}
                    className="flex-1 h-12 rounded-xl bg-volt-green text-slate-950 hover:bg-volt-green/90 font-bold"
                  >
                    {loading ? "Creating order..." : "Confirm and continue to payment"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Bidding — secondary when lot exists */}
        {showBidding && (
          <>
            {showBuyNow && (
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or bid at auction</span>
                </div>
              </div>
            )}

            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">Quick Bid</TabsTrigger>
                <TabsTrigger value="max">Max Bid</TabsTrigger>
              </TabsList>

              <TabsContent value="quick" className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Quick Bid Amount</span>
                    <span className="text-2xl font-bold font-mono text-electric-blue">
                      {formatCurrency(quickBidAmount, { currency, exchangeRates })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum increment: {formatCurrency(bidIncrement, { currency, exchangeRates })}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="custom-bid">Or Enter Custom Bid</Label>
                  <Input
                    id="custom-bid"
                    type="number"
                    placeholder={`Min: ${formatCurrency(quickBidAmount, { currency, exchangeRates })}`}
                    value={customBid}
                    onChange={(e) => setCustomBid(e.target.value)}
                    className="font-mono h-12 text-lg"
                  />
                </div>

                <div
                  className={`
              p-4 rounded-xl border-2 space-y-3
              ${
                hasEnoughDeposit
                  ? "bg-volt-green/5 border-volt-green/20"
                  : "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30"
              }
            `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Wallet
                        className={`h-4 w-4 ${hasEnoughDeposit ? "text-volt-green" : "text-red-500"}`}
                      />
                      Available Wallet Balance
                    </div>
                    <span
                      className={`font-mono font-bold ${hasEnoughDeposit ? "text-volt-green" : "text-red-500"}`}
                    >
                      {formatCurrency(availableBalance / 100, { currency, exchangeRates })}
                    </span>
                  </div>

                  <div className="h-px bg-border/50" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Required 10% Deposit</span>
                    <span className="font-bold">
                      {formatCurrency(requiredDepositKobo / 100, { currency, exchangeRates })}
                    </span>
                  </div>

                  {!hasEnoughDeposit && (
                    <div className="flex items-start gap-2 pt-1">
                      <ShieldCheck className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-tight">
                        Insufficient funds. Your bidding power is{" "}
                        {formatCurrency(biddingPower / 100, { currency, exchangeRates })}. Please
                        fund your wallet.
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
                        variant={showBuyNow ? "outline" : "default"}
                      >
                        {loading
                          ? "Placing Bid..."
                          : `Bid ${formatCurrency(parseFloat(customBid) || 0, { currency, exchangeRates })}`}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleQuickBid}
                        disabled={loading || !hasEnoughDeposit}
                        className="flex-1 h-12 rounded-xl text-lg font-bold"
                        variant={showBuyNow ? "outline" : "default"}
                      >
                        {loading
                          ? "Placing Bid..."
                          : `Quick Bid ${formatCurrency(quickBidAmount, { currency, exchangeRates })}`}
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="max" className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-electric-blue" />
                    <span className="font-semibold">Automatic Bidding</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set your maximum bid and we&apos;ll automatically bid on your behalf,
                    incrementally, up to your limit.
                  </p>
                </div>

                {userMaxBid && (
                  <div className="rounded-lg border p-3 bg-volt-green/10 border-volt-green/30">
                    <p className="text-sm">
                      Current max bid:{" "}
                      <span className="font-semibold font-mono">
                        {formatCurrency(userMaxBid, { currency, exchangeRates })}
                      </span>
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
                    placeholder={`Min: ${formatCurrency(quickBidAmount, { currency, exchangeRates })}`}
                    value={maxBid}
                    onChange={(e) => setMaxBid(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll bid incrementally on your behalf, up to this amount.
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleSetMaxBid}
                    disabled={loading || !maxBid}
                    className="w-full"
                    variant={showBuyNow ? "outline" : "default"}
                  >
                    {loading
                      ? "Setting Max Bid..."
                      : userMaxBid
                        ? "Update Max Bid"
                        : "Set Max Bid"}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeeRow({
  label,
  amount,
  currency,
  exchangeRates,
  muted,
}: {
  label: string;
  amount: number;
  currency: string;
  exchangeRates: ReturnType<typeof useExchangeRates>;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground text-xs" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">
        {formatCurrency(amount, { currency, exchangeRates })}
      </span>
    </div>
  );
}
