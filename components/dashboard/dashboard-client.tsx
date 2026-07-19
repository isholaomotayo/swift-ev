"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Gavel, Heart, ShoppingBag, TrendingUp, ArrowRight, Zap, 
  Wallet, ShieldCheck, AlertCircle, Mail, Settings, CheckCircle2, Clock,
  CreditCard, Car
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

interface DashboardClientProps {
  initialOverview: any;
  token: string;
  user: {
    firstName: string;
    kycStatus?: string;
  };
}

export function DashboardClient({ initialOverview, token, user }: DashboardClientProps) {
  const { token: authStoreToken } = useAuth();
  const activeToken = authStoreToken || token;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Real-time query via Convex
  const overviewData = useQuery(
    api.analytics.getBuyerDashboardOverview,
    activeToken ? { token: activeToken } : "skip" // Buyer overview doesn't strictly need timeRange yet, but we can pass it if we add charts later
  ) ?? initialOverview;

  const kpis = overviewData?.kpis;
  const sneakPeeks = overviewData?.sneakPeeks;
  const actionRequired = overviewData?.actionRequired;

  const totalPendingActions = (actionRequired?.missingKyc ? 1 : 0) + (actionRequired?.pendingPayments || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 1. Header Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-card via-card to-background border border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-auction-gold/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Buyer Dashboard
            </h1>
            {user.kycStatus === "approved" ? (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            ) : (
              <Link href="/verify">
                <Badge variant="outline" className="border-warning-amber/50 text-warning-amber cursor-pointer hover:bg-warning-amber/10 text-[10px] uppercase tracking-wider animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" /> KYC Required
                </Badge>
              </Link>
            )}
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Welcome back, <span className="font-semibold text-foreground">{user.firstName}</span>! Monitor your bids, orders, and wallet balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <Link href="/vehicles">
            <Button className="bg-electric-blue hover:bg-electric-blue/90 text-white shadow-lg shadow-electric-blue/20">
              <Zap className="h-4 w-4 mr-2" />
              Browse Vehicles
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Action Required Queue Banner */}
      {totalPendingActions > 0 && (
        <Card className="p-4 bg-gradient-to-r from-warning-amber/10 via-card to-card border-warning-amber/30 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning-amber/20 flex items-center justify-center flex-shrink-0 text-warning-amber">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <span>Action Required ({totalPendingActions} Pending)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tasks needing your immediate attention.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {actionRequired?.missingKyc && (
                <Link href="/verify">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Complete Identity Verification (KYC)
                  </Badge>
                </Link>
              )}
              {actionRequired?.pendingPayments > 0 && (
                <Link href="/orders">
                  <Badge variant="outline" className="bg-warning-amber/10 text-warning-amber border-warning-amber/30 hover:bg-warning-amber/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    {actionRequired.pendingPayments} Orders Awaiting Payment
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 3. KPI Scorecards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Wallet Balance */}
        <Card className="p-5 relative overflow-hidden group border-auction-gold/30 bg-gradient-to-br from-card to-auction-gold/5 shadow-md h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-auction-gold/10 rounded-full blur-2xl group-hover:bg-auction-gold/20 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet Balance</span>
              <div className="h-9 w-9 rounded-xl bg-auction-gold/20 flex items-center justify-center text-auction-gold">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-auction-gold truncate">
              {formatCurrency((kpis?.walletBalance || 0) / 100)}
            </p>
            {kpis?.walletReserved > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                +{formatCurrency(kpis.walletReserved / 100)} reserved for bids
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-border/40">
            <Link href="/wallet">
              <Button size="sm" variant="outline" className="w-full h-8 text-xs font-semibold border-auction-gold/50 text-auction-gold hover:bg-auction-gold/10 hover:text-auction-gold">
                Deposit Funds
              </Button>
            </Link>
          </div>
        </Card>

        {/* Active Bids */}
        <Link href="/my-bids" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-electric-blue/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/5 rounded-full blur-2xl group-hover:bg-electric-blue/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Bids</span>
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue group-hover:scale-110 transition-transform">
                  <Gavel className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-electric-blue">{kpis?.activeBids || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently participating</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{kpis?.totalBids || 0} Total Bids</span>
            </div>
          </Card>
        </Link>

        {/* Watchlist */}
        <Link href="/watchlist" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-error-red/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-error-red/5 rounded-full blur-2xl group-hover:bg-error-red/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Watchlist</span>
                <div className="h-9 w-9 rounded-xl bg-error-red/10 flex items-center justify-center text-error-red group-hover:scale-110 transition-transform">
                  <Heart className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-error-red">{kpis?.watchlistCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Saved vehicles</p>
            </div>
          </Card>
        </Link>

        {/* Active Orders */}
        <Link href="/orders" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-warning-amber/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-warning-amber/5 rounded-full blur-2xl group-hover:bg-warning-amber/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Orders</span>
                <div className="h-9 w-9 rounded-xl bg-warning-amber/10 flex items-center justify-center text-warning-amber group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-warning-amber">{kpis?.activeOrders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </div>
          </Card>
        </Link>
        
        {/* Total Spent */}
        <Card className="p-5 relative overflow-hidden group-hover:border-primary/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Spent</span>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xl font-extrabold tracking-tight text-foreground truncate" title={formatCurrency(kpis?.totalSpent || 0)}>
              {formatCurrency(kpis?.totalSpent || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Lifetime purchases</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sub-System Shortcuts & Recent Orders */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Sub-System Shortcuts */}
          <Card className="p-6 border-border/60 bg-card">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-electric-blue" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/auctions">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-volt-green/50 hover:bg-volt-green/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-volt-green/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Gavel className="h-5 w-5 text-volt-green" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-volt-green transition-colors truncate">Live Auctions</div>
                    <div className="text-[10px] text-muted-foreground truncate">Join bidding</div>
                  </div>
                </Button>
              </Link>
              <Link href="/my-bids">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-5 w-5 text-electric-blue" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-electric-blue transition-colors truncate">My Bids</div>
                    <div className="text-[10px] text-muted-foreground truncate">Track activity</div>
                  </div>
                </Button>
              </Link>
              <Link href="/watchlist">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-error-red/50 hover:bg-error-red/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-error-red/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Heart className="h-5 w-5 text-error-red" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-error-red transition-colors truncate">Watchlist</div>
                    <div className="text-[10px] text-muted-foreground truncate">Saved vehicles</div>
                  </div>
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-warning-amber/50 hover:bg-warning-amber/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-warning-amber/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-5 w-5 text-warning-amber" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-warning-amber transition-colors truncate">Orders & Shipping</div>
                    <div className="text-[10px] text-muted-foreground truncate">Track purchases</div>
                  </div>
                </Button>
              </Link>
              <Link href="/inbox">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Mail className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-purple-400 transition-colors truncate">Inbox</div>
                    <div className="text-[10px] text-muted-foreground truncate">Messages & Alerts</div>
                  </div>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-muted-foreground/50 hover:bg-muted/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground transition-colors truncate">Settings</div>
                    <div className="text-[10px] text-muted-foreground truncate">Profile & Preferences</div>
                  </div>
                </Button>
              </Link>
            </div>
          </Card>

          {/* Recent Orders */}
          <Card className="p-6 border-border/60 bg-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-warning-amber/10 flex items-center justify-center text-warning-amber">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Recent Orders</h3>
                  <p className="text-[11px] text-muted-foreground">Track your purchases</p>
                </div>
              </div>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-warning-amber">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentOrders && sneakPeeks.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentOrders.map((order: any) => (
                  <div key={order._id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-warning-amber/10 flex items-center justify-center text-warning-amber font-mono text-xs font-bold flex-shrink-0">
                        #
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">Order {String(order.orderNumber).substring(0, 8)}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(order._creationTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="font-bold text-sm text-foreground">{formatCurrency(order.totalAmount || 0)}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize px-1.5 py-0",
                          order.status === "delivered"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-background/30 flex flex-col items-center justify-center">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No orders yet</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Bids & Watchlist */}
        <div className="space-y-8">
          
          {/* Recent Bids */}
          <Card className="p-6 border-border/60 bg-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                  <Gavel className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Recent Bids</h3>
                  <p className="text-[11px] text-muted-foreground">Your latest auction activity</p>
                </div>
              </div>
              <Link href="/my-bids">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-electric-blue">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentBids && sneakPeeks.recentBids.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentBids.map(({ bid, vehicle }: any) => (
                  <div key={bid._id} className="flex flex-col p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all group">
                    <div className="flex items-center gap-3 min-w-0 mb-2">
                      <div className="h-10 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {vehicle?.heroImage ? (
                          <img src={vehicle.heroImage} alt={`${vehicle.year} ${vehicle.make}`} className="h-full w-full object-cover" />
                        ) : (
                          <Car className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate group-hover:text-electric-blue transition-colors">
                          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown Vehicle"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs font-bold text-foreground">{formatCurrency(bid.bidAmount)}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase px-1.5 py-0",
                          bid.status === "winning" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                          bid.status === "active" && "bg-electric-blue/10 text-electric-blue border-electric-blue/30",
                          bid.status === "outbid" && "bg-error-red/10 text-error-red border-error-red/30",
                          (bid.status !== "winning" && bid.status !== "active" && bid.status !== "outbid") && "bg-muted text-muted-foreground"
                        )}
                      >
                        {bid.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-background/30 flex flex-col items-center justify-center">
                <Gavel className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No bids placed</p>
              </div>
            )}
          </Card>

          {/* Watchlist */}
          <Card className="p-6 border-border/60 bg-card h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-error-red/10 flex items-center justify-center text-error-red">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Watchlist</h3>
                  <p className="text-[11px] text-muted-foreground">Saved for later</p>
                </div>
              </div>
              <Link href="/watchlist">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-error-red">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentWatchlist && sneakPeeks.recentWatchlist.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentWatchlist.map(({ item, vehicle, lot }: any) => (
                  <Link key={item._id} href={`/vehicles/${item.vehicleId}`} className="block group">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {vehicle?.heroImage ? (
                            <img src={vehicle.heroImage} alt={`${vehicle?.year} ${vehicle?.make}`} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <Car className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate group-hover:text-error-red transition-colors">
                            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown Vehicle"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {lot ? (
                              <p className="text-[10px] text-electric-blue font-semibold">Current: {formatCurrency(lot.currentBid || 0)}</p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Upcoming</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-error-red transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-background/30 flex flex-col items-center justify-center">
                <Heart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">Watchlist empty</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
