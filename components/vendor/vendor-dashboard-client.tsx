"use client";

import { Car, TrendingUp, Package, DollarSign, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.vendorCompany || user.firstName}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-volt-green/10 rounded-lg">
              <Car className="h-6 w-6 text-volt-green" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Vehicles</p>
            <p className="text-3xl font-bold">{stats.totalVehicles}</p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-electric-blue/10 rounded-lg">
              <Package className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">In Auction</p>
            <p className="text-3xl font-bold">{stats.inAuction}</p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-volt-green/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-volt-green" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Sold</p>
            <p className="text-3xl font-bold">{stats.sold}</p>
          </div>
        </div>

        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-warning-amber/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/vendor/vehicles/upload"
              className="flex items-center gap-3 p-4 bg-volt-green/10 border border-volt-green/20 rounded-lg hover:bg-volt-green/20 transition-colors"
            >
              <div className="p-2 bg-volt-green/20 rounded-lg">
                <Upload className="h-6 w-6 text-volt-green" />
              </div>
              <div>
                <p className="font-medium text-volt-green">Upload New Vehicle</p>
                <p className="text-sm text-muted-foreground">
                  Add a vehicle to your inventory
                </p>
              </div>
            </Link>

            <Link
              href="/vendor/vehicles"
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-electric-blue/10 rounded-lg">
                <Car className="h-5 w-5 text-electric-blue" />
              </div>
              <div>
                <p className="font-medium">Manage Vehicles</p>
                <p className="text-sm text-muted-foreground">
                  View and edit your listings
                </p>
              </div>
            </Link>

            <Link
              href="/vendor/analytics"
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="p-2 bg-warning-amber/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-warning-amber" />
              </div>
              <div>
                <p className="font-medium">View Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Track your performance
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Vehicles */}
        <div className="bg-background border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Vehicles</h2>
            <Link
              href="/vendor/vehicles"
              className="text-sm text-electric-blue hover:underline"
            >
              View all
            </Link>
          </div>

          {recentVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No vehicles uploaded yet</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/vendor/vehicles/upload">Upload Your First Vehicle</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentVehicles.slice(0, 5).map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div>
                    <p className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lot {vehicle.lotNumber} • {vehicle.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Link
                    href={`/vehicles/${vehicle._id}`}
                    className="text-sm text-electric-blue hover:underline"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval Notice */}
      {stats.pendingApproval > 0 && (
        <div className="bg-warning-amber/10 border border-warning-amber/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-warning-amber mt-0.5" />
            <div>
              <p className="font-medium text-warning-amber">
                {stats.pendingApproval} {stats.pendingApproval === 1 ? 'vehicle' : 'vehicles'} pending approval
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your recently uploaded vehicles are being reviewed by our admin team.
                You'll be notified once they're approved for auction.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

