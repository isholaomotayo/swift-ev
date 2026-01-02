"use client";

import { Car, Gavel, TrendingUp, Package, Users, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface AdminDashboardClientProps {
  vehicleStats: any;
  liveAuctions: any[];
}

export function AdminDashboardClient({ vehicleStats, liveAuctions }: AdminDashboardClientProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your VoltBid Africa platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
              <p className="text-2xl font-bold">
                {vehicleStats?.totalListings || 0}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-electric-blue/10 flex items-center justify-center">
              <Car className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Live Auctions</p>
              <p className="text-2xl font-bold">
                {vehicleStats?.activeAuctions || 0}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-volt-green/10 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(vehicleStats?.totalRevenue || 0)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-electric-blue/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-2xl font-bold">
                {vehicleStats?.totalUsers || 0}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-volt-green/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>
      </div>

      {/* Live Auctions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Live Auctions</h2>
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        {liveAuctions.length === 0 ? (
          <p className="text-muted-foreground">No live auctions at the moment</p>
        ) : (
          <div className="space-y-4">
            {liveAuctions.map((auction) => (
              <div
                key={auction._id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-semibold">{auction.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {auction.totalLots} lots • {auction.totalBids} bids
                  </p>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

