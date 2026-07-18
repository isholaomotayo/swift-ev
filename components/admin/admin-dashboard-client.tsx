"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Car,
  Gavel,
  ShoppingBag,
  Users,
  CreditCard,
  Mail,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
  ExternalLink,
  Layers,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";

import { useAuth } from "@/components/providers/auth-provider";

interface AdminDashboardClientProps {
  initialOverview: any;
  token: string;
}

export function AdminDashboardClient({ initialOverview, token }: AdminDashboardClientProps) {
  const { token: authStoreToken } = useAuth();
  const activeToken = authStoreToken || token;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Real-time query via Convex (skip if no activeToken to avoid auth errors)
  const overviewData = useQuery(
    api.analytics.getAdminDashboardOverview,
    activeToken ? { token: activeToken, timeRange } : "skip"
  ) ?? initialOverview;

  const kpis = overviewData?.kpis;
  const sneakPeeks = overviewData?.sneakPeeks;
  const charts = overviewData?.charts;

  // Counts of pending actions across modules
  const pendingApprovalsCount = kpis?.vehicles?.pendingApproval || 0;
  const pendingPaymentsCount = kpis?.payments?.pendingCount || 0;
  const pendingKycCount = kpis?.users?.pendingKyc || 0;
  const pendingEmailsCount = kpis?.emails?.pendingReviewCount || 0;
  const totalPendingActions = pendingApprovalsCount + pendingPaymentsCount + pendingKycCount + pendingEmailsCount;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 1. Header & System Health Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-card via-card to-background border border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Platform Command Center
            </h1>
            <Badge variant="outline" className="bg-volt-green/10 text-volt-green border-volt-green/30 flex items-center gap-1.5 py-1 px-3">
              <span className="h-2 w-2 rounded-full bg-volt-green animate-pulse" />
              Live & Synced
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Real-time status overview of vehicles, live auctions, platform orders, bank payment queue, user verification, and system settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Timeframe Filter Switcher */}
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40">
            {(["7d", "30d", "90d", "1y"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all uppercase",
                  timeRange === range
                    ? "bg-background text-electric-blue shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <Link href="/admin/auctions/live">
            <Button className="bg-volt-green text-black font-semibold hover:bg-volt-green/90 shadow-md transition-all">
              <Zap className="h-4 w-4 mr-2" />
              Live Auction Room
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" className="border-border hover:bg-muted">
              <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Attention Required Queue Banner */}
      {totalPendingActions > 0 && (
        <Card className="p-4 bg-gradient-to-r from-warning-amber/10 via-card to-card border-warning-amber/30 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning-amber/20 flex items-center justify-center flex-shrink-0 text-warning-amber">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <span>Action Required ({totalPendingActions} Pending Task{totalPendingActions > 1 ? "s" : ""})</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Items waiting for administrator review and approval.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pendingApprovalsCount > 0 && (
                <Link href="/admin/vehicles/approvals">
                  <Badge variant="outline" className="bg-warning-amber/10 text-warning-amber border-warning-amber/30 hover:bg-warning-amber/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" />
                    {pendingApprovalsCount} Vehicles Pending Approval
                  </Badge>
                </Link>
              )}
              {pendingPaymentsCount > 0 && (
                <Link href="/admin/payments">
                  <Badge variant="outline" className="bg-electric-blue/10 text-electric-blue border-electric-blue/30 hover:bg-electric-blue/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    {pendingPaymentsCount} Bank Transfers Awaiting Verification
                  </Badge>
                </Link>
              )}
              {pendingKycCount > 0 && (
                <Link href="/admin/users">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {pendingKycCount} KYC Applications
                  </Badge>
                </Link>
              )}
              {pendingEmailsCount > 0 && (
                <Link href="/admin/mail-review">
                  <Badge variant="outline" className="bg-volt-green/10 text-volt-green border-volt-green/30 hover:bg-volt-green/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {pendingEmailsCount} Outgoing Email Review Queue
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 3. Top 5 KPI Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Vehicles */}
        <Link href="/admin/vehicles" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-electric-blue/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/5 rounded-full blur-2xl group-hover:bg-electric-blue/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory</span>
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue group-hover:scale-110 transition-transform">
                  <Car className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{kpis?.vehicles?.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Vehicles Listed</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-warning-amber font-medium">{kpis?.vehicles?.pendingApproval || 0} Pending</span>
              <span className="text-volt-green font-medium">{kpis?.vehicles?.inAuction || 0} In Auction</span>
            </div>
          </Card>
        </Link>

        {/* Card 2: Auctions */}
        <Link href="/admin/auctions" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-volt-green/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-volt-green/5 rounded-full blur-2xl group-hover:bg-volt-green/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auctions</span>
                <div className="h-9 w-9 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green group-hover:scale-110 transition-transform">
                  <Gavel className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{kpis?.auctions?.live || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Live Auctions</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{kpis?.auctions?.completed || 0} Completed</span>
              <span className="text-volt-green font-medium">{kpis?.auctions?.totalBids || 0} Total Bids</span>
            </div>
          </Card>
        </Link>

        {/* Card 3: Orders & GMV */}
        <Link href="/admin/orders" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-primary/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales & Revenue</span>
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-primary">{formatCurrency(kpis?.orders?.totalRevenue || 0, { currency: "USD" })}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Platform GMV (USD)</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{kpis?.orders?.total || 0} Total Orders</span>
              <span className="text-warning-amber font-medium">{kpis?.orders?.pending || 0} Pending</span>
            </div>
          </Card>
        </Link>

        {/* Card 4: Users */}
        <Link href="/admin/users" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-purple-500/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Base</span>
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground">{kpis?.users?.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Registered Users</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{kpis?.users?.buyers || 0} Buyers / {kpis?.users?.sellers || 0} Sellers</span>
            </div>
          </Card>
        </Link>

        {/* Card 5: Bank Payments */}
        <Link href="/admin/payments" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-amber-500/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Transfers</span>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-amber-500">{kpis?.payments?.pendingCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending Verification</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate">{formatCurrency(kpis?.payments?.pendingAmount || 0)} Pending</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* 4. Comprehensive Sneak Peek & Module Hub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols wide on desktop): Inventory, Auctions & Orders */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Module Hub 1: Inventory Management Sneak Peek */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Inventory Management</h2>
                  <p className="text-xs text-muted-foreground">Vehicle listings & pending approvals queue</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/vehicles/approvals">
                  <Button variant="outline" size="sm" className="border-warning-amber/30 text-warning-amber hover:bg-warning-amber/10 text-xs">
                    Pending Queue ({pendingApprovalsCount})
                  </Button>
                </Link>
                <Link href="/admin/vehicles">
                  <Button variant="ghost" size="sm" className="hover:text-electric-blue text-xs">
                    Manage All <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Vehicle Status Pills */}
            <div className="grid grid-cols-5 gap-2 mb-5 p-3 rounded-xl bg-muted/40 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">{kpis?.vehicles?.total || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-lg font-bold text-emerald-500">{kpis?.vehicles?.approved || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Auction</p>
                <p className="text-lg font-bold text-electric-blue">{kpis?.vehicles?.inAuction || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sold</p>
                <p className="text-lg font-bold text-purple-400">{kpis?.vehicles?.sold || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-warning-amber">{kpis?.vehicles?.pendingApproval || 0}</p>
              </div>
            </div>

            {/* Pending Vehicles Sneak Peek List */}
            {sneakPeeks?.pendingVehicles && sneakPeeks.pendingVehicles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Vehicles Awaiting Admin Approval
                </p>
                {sneakPeeks.pendingVehicles.map((vehicle: any) => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40">
                        {vehicle.mainImage ? (
                          <img src={vehicle.mainImage} alt={vehicle.title} className="h-full w-full object-cover" />
                        ) : (
                          <Car className="h-6 w-6 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{vehicle.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          List Price: <span className="font-semibold text-foreground">{formatCurrency(vehicle.price || 0)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="bg-warning-amber/10 text-warning-amber border-warning-amber/30 text-xs">
                        Pending
                      </Badge>
                      <Link href="/admin/vehicles/approvals">
                        <Button size="sm" variant="outline" className="h-8 text-xs border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">No vehicles pending approval</p>
                <p className="text-xs text-muted-foreground mt-0.5">All submitted vehicle listings have been reviewed.</p>
              </div>
            )}
          </Card>

          {/* Module Hub 2: Auction & Options Management Sneak Peek */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green">
                  <Gavel className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Auction & Option Management</h2>
                  <p className="text-xs text-muted-foreground">Live & completed auctions + bidding parameters</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/auctions/live">
                  <Button variant="outline" size="sm" className="border-volt-green/30 text-volt-green hover:bg-volt-green/10 text-xs">
                    Live Room
                  </Button>
                </Link>
                <Link href="/admin/auctions">
                  <Button variant="ghost" size="sm" className="hover:text-volt-green text-xs">
                    View Auctions <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live Auctions Feed */}
            {sneakPeeks?.liveAuctions && sneakPeeks.liveAuctions.length > 0 ? (
              <div className="space-y-3 mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Live Auctions
                </p>
                {sneakPeeks.liveAuctions.map((auction: any) => (
                  <div
                    key={auction.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-volt-green/20 bg-volt-green/5 hover:bg-volt-green/10 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-xl bg-volt-green/20 flex items-center justify-center text-volt-green font-bold text-xs">
                        LIVE
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{auction.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{auction.totalLots} Lots</span>
                          <span>•</span>
                          <span className="text-volt-green font-semibold">{auction.totalBids} Bids Placed</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/admin/auctions/${auction.id}`}>
                      <Button size="sm" className="bg-volt-green text-black hover:bg-volt-green/90 text-xs font-semibold">
                        Monitor Live
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 mb-6 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <p className="text-xs text-muted-foreground">No live auctions active right now.</p>
              </div>
            )}

            {/* Completed Auctions Preview */}
            {sneakPeeks?.completedAuctions && sneakPeeks.completedAuctions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recently Completed Auctions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sneakPeeks.completedAuctions.map((auction: any) => (
                    <div key={auction.id} className="p-3 rounded-xl border border-border/50 bg-background/50">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-xs text-foreground truncate">{auction.title}</h5>
                        <Badge variant="outline" className="text-[10px] bg-muted">Ended</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <span>{auction.totalLots} Lots</span>
                        <span className="font-semibold text-foreground">{auction.totalBids} Total Bids</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Module Hub 3: Orders & Fulfillment Sneak Peek */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Orders & Fulfillment</h2>
                  <p className="text-xs text-muted-foreground">Recent customer vehicle purchases & shipping</p>
                </div>
              </div>
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="hover:text-primary text-xs">
                  All Orders <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentOrders && sneakPeeks.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono text-xs font-bold flex-shrink-0">
                        #
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">{order.vehicleDetails}</h4>
                        <p className="text-xs text-muted-foreground truncate">
                          Order Ref: <span className="font-mono">{String(order.orderNumber).substring(0, 12)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm text-foreground">{formatCurrency(order.totalAmount || 0, { currency: "USD" })}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            order.status === "delivered" || order.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-warning-amber/10 text-warning-amber border-warning-amber/30"
                          )}
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <p className="text-xs text-muted-foreground">No recent orders recorded.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1 Col wide on desktop): Verification Queues, Settings, and Analytics */}
        <div className="space-y-8">
          
          {/* Module Hub 4: Financials & Bank Payments Queue */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Bank Transfers</h3>
                  <p className="text-[11px] text-muted-foreground">Offline verification queue</p>
                </div>
              </div>
              <Link href="/admin/payments">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-amber-500">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.pendingPayments && sneakPeeks.pendingPayments.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.pendingPayments.map((pm: any) => (
                  <div key={pm.id} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-foreground truncate">{pm.reference}</span>
                      <span className="font-bold text-amber-500">{formatCurrency(pm.amount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="capitalize">{pm.paymentType || "Deposit / Order"}</span>
                      <Link href="/admin/payments">
                        <span className="text-amber-500 hover:underline cursor-pointer font-medium">Verify →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">Bank transfer queue clear</p>
              </div>
            )}
          </Card>

          {/* Module Hub 5: User & KYC Verification Queue */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">KYC Approvals</h3>
                  <p className="text-[11px] text-muted-foreground">Identity verification queue</p>
                </div>
              </div>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-purple-400">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.pendingKycUsers && sneakPeeks.pendingKycUsers.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.pendingKycUsers.map((u: any) => (
                  <div key={u.id} className="p-3 rounded-xl border border-border/50 bg-background/50 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-xs text-foreground">{u.name}</h5>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Link href="/admin/users">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] border-purple-500/30 text-purple-400">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">No pending KYC applications</p>
              </div>
            )}
          </Card>

          {/* Module Hub 6: Outgoing Email Review Queue */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Email Review Queue</h3>
                  <p className="text-[11px] text-muted-foreground">Outgoing system emails</p>
                </div>
              </div>
              <Link href="/admin/mail-review">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-volt-green">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.pendingEmails && sneakPeeks.pendingEmails.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.pendingEmails.map((em: any) => (
                  <div key={em.id} className="p-3 rounded-xl border border-volt-green/20 bg-volt-green/5 flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-xs text-foreground capitalize">{String(em.emailType).replace(/_/g, " ")}</h5>
                      <p className="text-[11px] text-muted-foreground truncate">{em.recipientEmail}</p>
                    </div>
                    <Link href="/admin/mail-review">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] border-volt-green/30 text-volt-green">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-foreground">Email queue is empty</p>
              </div>
            )}
          </Card>

          {/* Module Hub 7: Platform Settings & Parameters Sneak Peek */}
          <Card className="p-6 border-border/60 bg-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Active Exchange Rates</h3>
                  <p className="text-[11px] text-muted-foreground">Platform conversion settings</p>
                </div>
              </div>
              <Link href="/admin/settings">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-electric-blue">
                  Configure <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {kpis?.exchangeRates && kpis.exchangeRates.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {kpis.exchangeRates.map((rate: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border/40 bg-background/40 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{rate.pair}</p>
                    <p className="text-sm font-bold text-electric-blue mt-0.5">{rate.rate}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">Default USD / NGN rates active.</p>
            )}
          </Card>
        </div>
      </div>

      {/* 5. Interactive Analytics & Performance Chart Section */}
      <Card className="p-6 border-border/60 bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-electric-blue" />
              Platform Sales & Inventory Analytics
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical revenue trend over selected timeframe ({timeRange.toUpperCase()})
            </p>
          </div>
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm" className="border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10">
              Full Analytics Deep Dive <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Visual Revenue Bars Chart */}
        {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
          <div className="space-y-4">
            {/* Chart: bars + labels, self-contained height */}
            <div className="border-b border-border/40 pb-2">
              {/* Bar area */}
              <div className="h-44 flex items-end gap-1.5 overflow-hidden">
                {charts.revenueTrend.map((pt: any, idx: number) => {
                  const maxRev = Math.max(...charts.revenueTrend.map((p: any) => p.revenue || 0), 1);
                  const heightPct = pt.revenue > 0 ? Math.max(4, Math.round((pt.revenue / maxRev) * 100)) : 0;
                  return (
                    <div key={idx} className="relative flex-1 flex flex-col justify-end h-full group">
                      {/* Tooltip — absolutely positioned above bar, never affects layout height */}
                      {pt.revenue > 0 && (
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-popover text-popover-foreground text-[10px] p-1.5 rounded shadow border border-border pointer-events-none whitespace-nowrap">
                          {formatCurrency(pt.revenue, { currency: "USD" })}<br />
                          <span className="text-muted-foreground">{pt.ordersCount} order{pt.ordersCount !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {/* Bar */}
                      <div
                        style={{ height: heightPct > 0 ? `${heightPct}%` : "2px" }}
                        className={cn(
                          "w-full rounded-t-sm transition-all duration-300",
                          heightPct > 0
                            ? "bg-gradient-to-t from-electric-blue/50 to-electric-blue group-hover:to-volt-green"
                            : "bg-border/40"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1.5 mt-1.5 overflow-hidden">
                {charts.revenueTrend.map((pt: any, idx: number) => (
                  <span key={idx} className="flex-1 text-[9px] text-muted-foreground truncate text-center">{pt.period}</span>
                ))}
              </div>
            </div>

            {/* Inventory Distribution Breakdown */}
            {charts?.vehicleStatusBreakdown && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Vehicle Inventory Distribution
                </p>
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {charts.vehicleStatusBreakdown.map((st: any, idx: number) => {
                    const totalVeh = kpis?.vehicles?.total || 1;
                    const pct = (st.count / totalVeh) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={idx}
                        style={{ width: `${pct}%` }}
                        className={cn("h-full transition-all", st.color)}
                        title={`${st.name}: ${st.count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                  {charts.vehicleStatusBreakdown.map((st: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full", st.color)} />
                      <span className="text-muted-foreground">{st.name}:</span>
                      <span className="font-bold text-foreground">{st.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-border/60 rounded-xl bg-background/30">
            <p className="text-xs text-muted-foreground">No revenue chart data for this period.</p>
          </div>
        )}
      </Card>

      {/* 6. Quick Action Matrix Grid (All 9 Admin Sub-systems) */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-electric-blue" />
          Admin Sub-System Shortcuts
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link href="/admin/vehicles">
            <Card className="p-4 hover-lift border-border/50 hover:border-electric-blue/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Vehicles</h4>
                <p className="text-xs text-muted-foreground">Manage Inventory</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/vehicles/approvals">
            <Card className="p-4 hover-lift border-border/50 hover:border-warning-amber/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning-amber/10 flex items-center justify-center text-warning-amber">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Approvals</h4>
                <p className="text-xs text-muted-foreground">{pendingApprovalsCount} Pending</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/auctions">
            <Card className="p-4 hover-lift border-border/50 hover:border-volt-green/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green">
                <Gavel className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Auctions</h4>
                <p className="text-xs text-muted-foreground">Auction Events</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/orders">
            <Card className="p-4 hover-lift border-border/50 hover:border-primary/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Orders</h4>
                <p className="text-xs text-muted-foreground">Orders & Shipping</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="p-4 hover-lift border-border/50 hover:border-purple-500/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Users & KYC</h4>
                <p className="text-xs text-muted-foreground">User Management</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/payments">
            <Card className="p-4 hover-lift border-border/50 hover:border-amber-500/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Payments</h4>
                <p className="text-xs text-muted-foreground">{pendingPaymentsCount} Bank Transfers</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/mail-review">
            <Card className="p-4 hover-lift border-border/50 hover:border-volt-green/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Mail Review</h4>
                <p className="text-xs text-muted-foreground">{pendingEmailsCount} Queued</p>
              </div>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="p-4 hover-lift border-border/50 hover:border-electric-blue/50 transition-all flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Settings</h4>
                <p className="text-xs text-muted-foreground">Platform Config</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
