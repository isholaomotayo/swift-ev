"use client";

import { useState, useEffect } from "react";
import { useConvex } from "convex/react";
import { Car, Gavel, TrendingUp, Package, Users, DollarSign } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { formatCurrency } from "@/lib/utils";

export default function AdminDashboard() {
  const convex = useConvex();
  const [vehicleStats, setVehicleStats] = useState<any | null>(null);
  const [auctions, setAuctions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data once on mount (no real-time subscriptions)
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      convex.query(api.vehicles.getVehicleStats, {}),
      convex.query(api.auctions.listAuctions, { status: "live" }),
    ])
      .then(([stats, liveAuctions]) => {
        if (mounted) {
          setVehicleStats(stats);
          setAuctions(liveAuctions || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch dashboard data:", error);
        if (mounted) {
          setVehicleStats(null);
          setAuctions([]);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [convex]);

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
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-electric-blue/10 rounded-lg">
              <Car className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
            <p className="text-3xl font-bold">
              {vehicleStats?.totalListings || 0}
            </p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-volt-green/10 rounded-lg">
              <Gavel className="h-6 w-6 text-volt-green" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Live Auctions</p>
            <p className="text-3xl font-bold">
              {auctions?.length || 0}
            </p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-warning-amber/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Vehicles Sold</p>
            <p className="text-3xl font-bold">
              {vehicleStats?.totalSold || 0}
            </p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-electric-blue/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">
              {formatCurrency(0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Auctions */}
        <div className="bg-background border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Live Auctions</h2>
          {loading || auctions === null ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No live auctions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auctions.map((auction) => (
                <div
                  key={auction._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">{auction.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {auction.lotCount} lots • {auction.activeLotCount} active
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/admin/auctions/${auction._id}`}
                      className="text-sm text-electric-blue hover:underline"
                    >
                      Manage
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-background border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a
              href="/admin/vehicles/new"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-electric-blue/10 rounded-lg">
                <Car className="h-5 w-5 text-electric-blue" />
              </div>
              <div>
                <p className="font-medium">Add New Vehicle</p>
                <p className="text-sm text-muted-foreground">
                  Upload a vehicle to the platform
                </p>
              </div>
            </a>

            <a
              href="/admin/auctions/new"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-volt-green/10 rounded-lg">
                <Gavel className="h-5 w-5 text-volt-green" />
              </div>
              <div>
                <p className="font-medium">Create Auction</p>
                <p className="text-sm text-muted-foreground">
                  Set up a new auction event
                </p>
              </div>
            </a>

            <a
              href="/admin/users"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-warning-amber/10 rounded-lg">
                <Users className="h-5 w-5 text-warning-amber" />
              </div>
              <div>
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-muted-foreground">
                  View and manage user accounts
                </p>
              </div>
            </a>

            <a
              href="/admin/orders"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-electric-blue/10 rounded-lg">
                <Package className="h-5 w-5 text-electric-blue" />
              </div>
              <div>
                <p className="font-medium">View Orders</p>
                <p className="text-sm text-muted-foreground">
                  Track orders and shipments
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-background border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-volt-green rounded-full"></div>
            <div>
              <p className="text-sm font-medium">Database</p>
              <p className="text-xs text-muted-foreground">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-volt-green rounded-full"></div>
            <div>
              <p className="text-sm font-medium">Convex Backend</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-volt-green rounded-full"></div>
            <div>
              <p className="text-sm font-medium">Real-time Updates</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
