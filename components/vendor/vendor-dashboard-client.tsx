"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Car, TrendingUp, Package, DollarSign, Upload, ArrowRight, Zap, 
  Clock, AlertCircle, ShoppingBag, BarChart3, Settings 
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

interface VendorDashboardClientProps {
  user: {
    firstName: string;
    vendorCompany?: string;
  };
  initialOverview: any;
  token: string;
}

export function VendorDashboardClient({ user, initialOverview, token }: VendorDashboardClientProps) {
  const { user: authUser, token: authStoreToken } = useAuth();
  const activeToken = authStoreToken || token;
  const preferredCurrency = authUser?.preferredCurrency ?? "NGN";
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Real-time query via Convex
  const overviewData = useQuery(
    api.analytics.getVendorDashboardOverview,
    activeToken ? { token: activeToken, timeRange } : "skip"
  ) ?? initialOverview;

  const kpis = overviewData?.kpis;
  const sneakPeeks = overviewData?.sneakPeeks;
  const charts = overviewData?.charts;

  const pendingApprovals = kpis?.pendingApproval || 0;
  const pendingPayments = kpis?.pendingPayments || 0;
  const totalPendingActions = pendingApprovals + pendingPayments;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 1. Header Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-card via-card to-background border border-border/60 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Vendor Command Center
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase tracking-wider animate-pulse">
              Live & Synced
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Welcome back, <span className="font-semibold text-foreground">{user.vendorCompany || user.firstName}</span>! Monitor your inventory, auctions, and sales performance.
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

          <Button asChild className="bg-volt-green hover:bg-volt-green/90 text-slate-950 shadow-lg shadow-volt-green/20">
            <Link href="/vendor/vehicles/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Vehicle
            </Link>
          </Button>
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
                  Items waiting for review or buyer payment.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pendingApprovals > 0 && (
                <Link href="/vendor/vehicles">
                  <Badge variant="outline" className="bg-warning-amber/10 text-warning-amber border-warning-amber/30 hover:bg-warning-amber/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {pendingApprovals} Vehicles Awaiting Admin Review
                  </Badge>
                </Link>
              )}
              {pendingPayments > 0 && (
                <Link href="/vendor/orders">
                  <Badge variant="outline" className="bg-electric-blue/10 text-electric-blue border-electric-blue/30 hover:bg-electric-blue/20 cursor-pointer transition-colors py-1.5 px-3 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {pendingPayments} Orders Awaiting Buyer Payment
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 3. KPI Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/vendor/vehicles" className="block group">
          <Card className="p-5 relative overflow-hidden group-hover:border-electric-blue/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-electric-blue/5 rounded-full blur-2xl group-hover:bg-electric-blue/15 transition-colors" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Inventory</span>
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue group-hover:scale-110 transition-transform">
                  <Car className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-foreground">{kpis?.totalInventory || 0}</p>
            </div>
          </Card>
        </Link>

        <Card className="p-5 relative overflow-hidden group-hover:border-volt-green/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-volt-green/5 rounded-full blur-2xl group-hover:bg-volt-green/15 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Auctions</span>
              <div className="h-9 w-9 rounded-xl bg-volt-green/10 flex items-center justify-center text-volt-green group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-volt-green">{kpis?.activeInAuction || 0}</p>
          </div>
        </Card>

        <Card className="p-5 relative overflow-hidden group-hover:border-primary/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sold Vehicles</span>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-primary">{kpis?.sold || 0}</p>
          </div>
        </Card>

        <Card className="p-5 relative overflow-hidden group-hover:border-warning-amber/50 transition-all duration-300 bg-card hover-lift h-full flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning-amber/5 rounded-full blur-2xl group-hover:bg-warning-amber/15 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</span>
              <div className="h-9 w-9 rounded-xl bg-warning-amber/10 flex items-center justify-center text-warning-amber group-hover:scale-110 transition-transform">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-foreground truncate" title={formatCurrency(kpis?.totalRevenue || 0, { currency: preferredCurrency })}>
              {formatCurrency(kpis?.totalRevenue || 0, { currency: preferredCurrency })}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Analytics Chart & Sub-System Shortcuts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Interactive Analytics Chart */}
          <Card className="p-6 border-border/60 bg-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-electric-blue" />
                  Sales Performance
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your historical revenue over the last {timeRange.toUpperCase()}
                </p>
              </div>
            </div>

            {charts?.revenueTrend && charts.revenueTrend.length > 0 ? (
              <div className="space-y-4">
                <div className="border-b border-border/40 pb-2">
                  <div className="h-44 flex items-end gap-1.5 overflow-hidden">
                    {charts.revenueTrend.map((pt: any, idx: number) => {
                      const maxRev = Math.max(...charts.revenueTrend.map((p: any) => p.revenue || 0), 1);
                      const heightPct = pt.revenue > 0 ? Math.max(4, Math.round((pt.revenue / maxRev) * 100)) : 0;
                      return (
                        <div key={idx} className="relative flex-1 flex flex-col justify-end h-full group">
                          {pt.revenue > 0 && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-popover text-popover-foreground text-[10px] p-1.5 rounded shadow border border-border pointer-events-none whitespace-nowrap">
                              {formatCurrency(pt.revenue, { currency: preferredCurrency })}<br />
                              <span className="text-muted-foreground">{pt.ordersCount} order{pt.ordersCount !== 1 ? "s" : ""}</span>
                            </div>
                          )}
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
                  <div className="flex gap-1.5 mt-1.5 overflow-hidden">
                    {charts.revenueTrend.map((pt: any, idx: number) => (
                      <span key={idx} className="flex-1 text-[9px] text-muted-foreground truncate text-center">{pt.period}</span>
                    ))}
                  </div>
                </div>

                {charts?.vehicleStatusBreakdown && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Inventory Status Breakdown
                    </p>
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      {charts.vehicleStatusBreakdown.map((st: any, idx: number) => {
                        const totalVeh = kpis?.totalInventory || 1;
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

          {/* Sub-System Shortcuts */}
          <Card className="p-6 border-border/60 bg-card">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-volt-green" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/vendor/vehicles/upload">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-volt-green/50 hover:bg-volt-green/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-volt-green/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-volt-green" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-volt-green transition-colors truncate">Upload Vehicle</div>
                    <div className="text-[10px] text-muted-foreground truncate">Create listing</div>
                  </div>
                </Button>
              </Link>
              <Link href="/vendor/vehicles">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-electric-blue/50 hover:bg-electric-blue/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Car className="h-5 w-5 text-electric-blue" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-electric-blue transition-colors truncate">Manage Fleet</div>
                    <div className="text-[10px] text-muted-foreground truncate">View inventory</div>
                  </div>
                </Button>
              </Link>
              <Link href="/vendor/orders">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-warning-amber/50 hover:bg-warning-amber/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-warning-amber/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="h-5 w-5 text-warning-amber" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-warning-amber transition-colors truncate">Orders</div>
                    <div className="text-[10px] text-muted-foreground truncate">Track sales</div>
                  </div>
                </Button>
              </Link>
              <Link href="/vendor/analytics">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">Analytics</div>
                    <div className="text-[10px] text-muted-foreground truncate">Detailed reports</div>
                  </div>
                </Button>
              </Link>
              <Link href="/vendor/settings">
                <Button variant="outline" className="w-full h-auto p-4 justify-start group border-dashed hover:border-solid hover:border-muted-foreground/50 hover:bg-muted/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-foreground transition-colors truncate">Settings</div>
                    <div className="text-[10px] text-muted-foreground truncate">Profile & payout</div>
                  </div>
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Sneak Peeks */}
        <div className="space-y-8">
          {/* Recent Inventory */}
          <Card className="p-6 border-border/60 bg-card h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Recent Inventory</h3>
                  <p className="text-[11px] text-muted-foreground">Latest vehicle uploads</p>
                </div>
              </div>
              <Link href="/vendor/vehicles">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-electric-blue">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentVehicles && sneakPeeks.recentVehicles.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentVehicles.map((vehicle: any) => (
                  <div key={vehicle._id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {vehicle.heroImage ? (
                          <img src={vehicle.heroImage} alt={`${vehicle.year} ${vehicle.make}`} className="h-full w-full object-cover" />
                        ) : (
                          <Car className="h-5 w-5 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate group-hover:text-electric-blue transition-colors">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                          {vehicle.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <Link href={`/vehicles/${vehicle._id}`}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-electric-blue">
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-background/30 flex flex-col items-center justify-center">
                <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No vehicles yet</p>
              </div>
            )}
          </Card>

          {/* Recent Orders */}
          <Card className="p-6 border-border/60 bg-card h-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Recent Orders</h3>
                  <p className="text-[11px] text-muted-foreground">Latest sales</p>
                </div>
              </div>
              <Link href="/vendor/orders">
                <Button variant="ghost" size="sm" className="h-8 text-xs hover:text-primary">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {sneakPeeks?.recentOrders && sneakPeeks.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {sneakPeeks.recentOrders.map((order: any) => (
                  <div key={order._id} className="p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/40 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">#{String(order.orderNumber).substring(0, 8)}</span>
                      <span className="text-xs font-bold text-foreground">{formatCurrency(order.totalAmount || 0, { currency: preferredCurrency })}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-[9px] capitalize px-1.5 py-0", order.status === "delivered" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                      <Link href="/vendor/orders">
                        <span className="text-[10px] text-primary hover:underline cursor-pointer">View Details</span>
                      </Link>
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
      </div>
    </div>
  );
}
