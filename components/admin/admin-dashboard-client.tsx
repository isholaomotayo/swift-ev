"use client";

import { Car, Gavel, TrendingUp, Package, Users, DollarSign, ArrowRight, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";

interface AdminDashboardClientProps {
  vehicleStats: any;
  liveAuctions: any[];
}

export function AdminDashboardClient({ vehicleStats, liveAuctions }: AdminDashboardClientProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-electric-blue to-blue-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of your autoexports.live platform performance and activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-electric-blue/20 hover:bg-electric-blue/5 text-electric-blue">
            <Zap className="h-4 w-4 mr-2" />
            System Health
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 relative overflow-hidden group hover-lift border-electric-blue/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-electric-blue/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-electric-blue/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{vehicleStats?.totalListings || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-electric-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Car className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-volt-green/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-volt-green/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-volt-green/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Live Auctions</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{vehicleStats?.activeAuctions || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-volt-green/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Gavel className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-3xl font-bold tracking-tight text-primary">{formatCurrency(vehicleStats?.totalRevenue || 0)}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group hover-lift border-warning-amber/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning-amber/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-warning-amber/10 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Users</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">{vehicleStats?.totalUsers || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-warning-amber/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Auctions */}
        <Card className="lg:col-span-2 p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-volt-green" />
              Live Auctions Activity
            </h2>
            <Link href="/admin/auctions">
              <Button variant="ghost" size="sm" className="hover:text-electric-blue">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {liveAuctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-8 border-2 border-dashed border-muted rounded-xl">
              <Gavel className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No live auctions active</p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveAuctions.map((auction) => (
                <div
                  key={auction._id}
                  className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-volt-green/10 flex items-center justify-center flex-shrink-0">
                      <Gavel className="h-5 w-5 text-volt-green" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-electric-blue transition-colors">{auction.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          {auction.totalLots} lots
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{auction.totalBids} bids</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-volt-green border-volt-green/30 bg-volt-green/5">
                    Live
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions / Recent Activity (Placeholder) */}
        <Card className="p-6 border-border/50 bg-gradient-to-b from-card to-muted/30">
          <h2 className="text-xl font-bold mb-6">Quick Management</h2>
          <div className="space-y-3">
            <Link href="/admin/vehicles">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Car className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>Manage Vehicles</span>
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <Users className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start h-auto py-3">
                <TrendingUp className="mr-3 h-5 w-5 text-muted-foreground" />
                <span>Platform Analytics</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

