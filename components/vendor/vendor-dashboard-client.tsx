"use client";

import { Car, TrendingUp, Package, DollarSign, Upload, ArrowRight, Zap, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";

interface VendorDashboardClientProps {
  user: {
    firstName: string;
    vendorCompany?: string;
  };
  stats: {
    totalVehicles: number;
    inAuction: number;
    sold: number;
    pendingApproval: number;
    totalRevenue: number;
  };
  recentVehicles: any[];
}

export function VendorDashboardClient({ user, stats, recentVehicles }: VendorDashboardClientProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Vendor Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{user.vendorCompany || user.firstName}</span>!
          </p>
        </div>
        <Button asChild className="bg-volt-green hover:bg-volt-green/90 text-slate-950 shadow-lg shadow-volt-green/20">
          <Link href="/vendor/vehicles/upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload New Vehicle
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 relative overflow-hidden group hover-lift border-volt-green/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-volt-green/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-volt-green/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Inventory</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{stats.totalVehicles}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-volt-green/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Car className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-electric-blue/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-electric-blue/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Auctions</p>
              <p className="text-3xl font-bold tracking-tight text-electric-blue">{stats.inAuction}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Package className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-primary/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Sold Vehicles</p>
              <p className="text-3xl font-bold tracking-tight text-primary">{stats.sold}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-warning-amber/20 bg-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning-amber/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-warning-amber/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-warning-amber/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Approval Notice */}
      {stats.pendingApproval > 0 && (
        <div className="bg-warning-amber/10 border border-warning-amber/20 rounded-xl p-4 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-warning-amber/20 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-warning-amber" />
          </div>
          <div>
            <h3 className="font-semibold text-warning-amber">Pending Approvals</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You have <span className="font-bold text-foreground">{stats.pendingApproval}</span> vehicles awaiting admin review. You will be notified once they are live.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 border-border/50 bg-card h-full">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Zap className="h-5 w-5 text-volt-green" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/vendor/vehicles/upload"
              className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border hover:border-volt-green/50 hover:bg-volt-green/5 transition-all group"
            >
              <div className="h-12 w-12 rounded-lg bg-volt-green/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-volt-green" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground group-hover:text-volt-green transition-colors">Upload New Vehicle</p>
                <p className="text-sm text-muted-foreground">Detailed listing with photos</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-volt-green group-hover:translate-x-1 transition-all" />
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/vendor/vehicles"
                className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all text-center items-center justify-center hover:border-electric-blue/30 group"
              >
                <Car className="h-8 w-8 text-electric-blue/70 group-hover:text-electric-blue transition-colors" />
                <span className="font-medium text-sm">Manage Fleet</span>
              </Link>

              <Link
                href="/vendor/analytics"
                className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all text-center items-center justify-center hover:border-warning-amber/30 group"
              >
                <TrendingUp className="h-8 w-8 text-warning-amber/70 group-hover:text-warning-amber transition-colors" />
                <span className="font-medium text-sm">Analytics</span>
              </Link>
            </div>
          </div>
        </Card>

        {/* Recent Vehicles */}
        <Card className="p-6 border-border/50 bg-card h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Car className="h-5 w-5 text-electric-blue" />
              Recent Inventory
            </h2>
            <Link
              href="/vendor/vehicles"
              className="text-sm font-medium text-electric-blue hover:text-electric-blue/80 flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {recentVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/10 h-[200px] flex flex-col items-center justify-center">
              <Car className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No vehicles uploaded yet</p>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href="/vendor/vehicles/upload">Get Started</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVehicles.slice(0, 5).map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {vehicle.heroImage || (vehicle.images && vehicle.images[0]?.url) ? (
                        <img 
                          src={vehicle.heroImage || vehicle.images[0].url} 
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <Car className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm group-hover:text-electric-blue transition-colors">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="font-mono bg-muted px-1 rounded">#{vehicle.lotNumber}</span>
                        {vehicle.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-electric-blue">
                    <Link href={`/vehicles/${vehicle._id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

