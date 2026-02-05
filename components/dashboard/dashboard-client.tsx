"use client";

import { useQuery } from "convex/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import {
  Gavel,
  Heart,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Zap,
  Wallet,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
import { UserBid, WatchlistItem, UserOrder } from "@/lib/types";
import { RECENT_ITEMS_DISPLAY_COUNT } from "@/lib/constants";

interface DashboardClientProps {
  initialUserBids: any;
  initialWatchlist: any;
  initialUserOrders: any;
  token: string;
  user: {
    firstName: string;
    kycStatus?: string;
  };
}

export function DashboardClient({
  initialUserBids,
  initialWatchlist,
  initialUserOrders,
  token,
  user,
}: DashboardClientProps) {
  // Use useQuery for real-time updates
  const userBids = useQuery(
    api.bids.getUserBids,
    token ? { token } : "skip"
  ) ?? initialUserBids;
  const watchlist = useQuery(
    api.watchlist.getWatchlist,
    token ? { token } : "skip"
  ) ?? initialWatchlist;
  const userOrders = useQuery(
    api.orders.getUserOrders,
    token ? { token } : "skip"
  ) ?? initialUserOrders;

  // Wallet balance
  const walletData = useQuery(
    api.wallet.getWalletBalance,
    token ? { token } : "skip"
  );

  // Calculate stats
  const activeBids = (userBids as UserBid[] | undefined)?.filter(
    (bid) => bid.bid.status === "active" || bid.bid.status === "winning"
  ) || [];
  const totalBids = (userBids as UserBid[] | undefined)?.length || 0;
  const watchlistCount = (watchlist as WatchlistItem[] | undefined)?.length || 0;
  const activeOrders = (userOrders as UserOrder[] | undefined)?.filter(
    (order) =>
      order.status !== "delivered" &&
      order.status !== "cancelled" &&
      order.status !== "refunded"
  ) || [];

  // Get recent bids
  const recentBids = (userBids as UserBid[] | undefined)?.slice(0, RECENT_ITEMS_DISPLAY_COUNT) || [];

  // Get watchlist items
  const recentWatchlist = (watchlist as WatchlistItem[] | undefined)?.slice(0, RECENT_ITEMS_DISPLAY_COUNT) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{user.firstName}</span>! Here's your activity overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.kycStatus === "approved" ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <ShieldCheck className="h-3 w-3 mr-1" /> Verified
            </Badge>
          ) : (
            <Link href="/verify">
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 cursor-pointer hover:bg-yellow-50">
                <AlertCircle className="h-3 w-3 mr-1" /> Complete KYC
              </Badge>
            </Link>
          )}
          <Link href="/vehicles">
            <Button className="bg-electric-blue hover:bg-electric-blue/90 text-white shadow-lg shadow-blue-500/20">
              Browse Vehicles
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Wallet Balance Card */}
        <Card className="p-6 relative overflow-hidden group hover-lift border-auction-gold/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-auction-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-auction-gold/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Wallet Balance</p>
              <p className="text-2xl font-bold tracking-tight text-auction-gold">
                {walletData ? formatCurrency(walletData.available) : "—"}
              </p>
              {walletData && walletData.reserved > 0 && (
                <p className="text-xs text-muted-foreground mt-1">+{formatCurrency(walletData.reserved)} reserved</p>
              )}
            </div>
            <Link href="/wallet">
              <div className="w-12 h-12 rounded-2xl bg-auction-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 cursor-pointer">
                <Wallet className="h-6 w-6 text-auction-gold" />
              </div>
            </Link>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-electric-blue/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-electric-blue/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Bids</p>
              <p className="text-3xl font-bold tracking-tight text-electric-blue">{activeBids.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Gavel className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-volt-green/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-volt-green/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-volt-green/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Bids</p>
              <p className="text-3xl font-bold tracking-tight text-volt-green">{totalBids}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-volt-green/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-error-red/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error-red/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-error-red/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Watchlist</p>
              <p className="text-3xl font-bold tracking-tight text-error-red">{watchlistCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-error-red/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Heart className="h-6 w-6 text-error-red" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-warning-amber/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning-amber/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-warning-amber/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Orders</p>
              <p className="text-3xl font-bold tracking-tight text-warning-amber">{activeOrders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-warning-amber/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bids */}
        <Card className="p-6 h-full border-border/50 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gavel className="h-5 w-5 text-electric-blue" />
              Recent Bids
            </h2>
            <Link href="/my-bids">
              <Button variant="ghost" size="sm" className="hover:text-electric-blue hover:bg-electric-blue/10">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {recentBids.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-8 border-2 border-dashed border-muted rounded-xl">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Gavel className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-1">No bids yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">Start bidding on premium cars to see your activity here.</p>
              <Link href="/vehicles">
                <Button variant="outline">Browse Vehicles</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBids.map((bid) => (
                <div
                  key={bid._id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="font-bold text-lg leading-none mb-1">
                      {formatCurrency(bid.bid.amount)}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {bid.vehicle.year} {bid.vehicle.make} {bid.vehicle.model}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(bid.bid.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        bid.bid.status === "winning"
                          ? "default"
                          : bid.bid.status === "active"
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs uppercase tracking-wide",
                        bid.bid.status === "winning" && "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20",
                        bid.bid.status === "active" && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"
                      )}
                    >
                      {bid.bid.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Watchlist Summary */}
        <Card className="p-6 h-full border-border/50 bg-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-error-red" />
              Watchlist
            </h2>
            <Link href="/watchlist">
              <Button variant="ghost" size="sm" className="hover:text-error-red hover:bg-error-red/10">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {recentWatchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center p-8 border-2 border-dashed border-muted rounded-xl">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium mb-1">Your watchlist is empty</p>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">Save items you're interested in to track them easily.</p>
              <Link href="/vehicles">
                <Button variant="outline">Browse Vehicles</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentWatchlist.map((item) => (
                <Link
                  key={item._id}
                  href={`/vehicles/${item.vehicle._id}`}
                  className="block group"
                >
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all duration-200">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                      {item.vehicle.image ? (
                        <div className="w-full h-full relative">
                          <img
                            src={item.vehicle.image}
                            alt={`${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Zap className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-bold text-foreground truncate group-hover:text-electric-blue transition-colors">
                        {item.vehicle.year} {item.vehicle.make}{" "}
                        {item.vehicle.model}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.vehicle.auctionLot ? (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal">
                            Current: <span className="font-bold ml-1 text-foreground">{formatCurrency(item.vehicle.auctionLot.currentBid || 0)}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Upcoming</Badge>
                        )}
                      </div>
                    </div>
                    <div className="pr-2 text-muted-foreground group-hover:text-electric-blue group-hover:translate-x-1 transition-all">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-8 border-border/50 bg-card">
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/vehicles">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5 text-electric-blue" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-electric-blue transition-colors">Browse Vehicles</div>
                <div className="text-xs text-muted-foreground">Find your next car</div>
              </div>
            </Button>
          </Link>
          <Link href="/auctions">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-volt-green/50 hover:bg-volt-green/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-volt-green/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Gavel className="h-5 w-5 text-volt-green" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-volt-green transition-colors">View Auctions</div>
                <div className="text-xs text-muted-foreground">Participate in live bids</div>
              </div>
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-warning-amber/50 hover:bg-warning-amber/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-warning-amber/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-5 w-5 text-warning-amber" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-warning-amber transition-colors">My Orders</div>
                <div className="text-xs text-muted-foreground">Track shipments</div>
              </div>
            </Button>
          </Link>
          <Link href="/wallet">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-auction-gold/50 hover:bg-auction-gold/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-auction-gold/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <Wallet className="h-5 w-5 text-auction-gold" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-auction-gold transition-colors">My Wallet</div>
                <div className="text-xs text-muted-foreground">Fund & manage balance</div>
              </div>
            </Button>
          </Link>
          <Link href="/verify">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-trust-blue/50 hover:bg-trust-blue/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-trust-blue/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5 text-trust-blue" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-trust-blue transition-colors">Verification</div>
                <div className="text-xs text-muted-foreground">Complete KYC</div>
              </div>
            </Button>
          </Link>
          <Link href="/disputes">
            <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-error-red/50 hover:bg-error-red/5 transition-all">
              <div className="w-10 h-10 rounded-full bg-error-red/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-error-red" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground group-hover:text-error-red transition-colors">Disputes</div>
                <div className="text-xs text-muted-foreground">File or track issues</div>
              </div>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

