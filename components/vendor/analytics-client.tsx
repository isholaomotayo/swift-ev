"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, DollarSign, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VendorAnalyticsClientProps {
  initialStats: any;
  initialRevenueHistory: any;
  token: string;
}

export function VendorAnalyticsClient({
  initialStats,
  initialRevenueHistory,
  token,
}: VendorAnalyticsClientProps) {
  // Use useQuery for real-time updates
  const stats = useQuery(
    api.vehicles.getVendorStats,
    token ? { token } : "skip"
  ) ?? initialStats;

  const revenueHistory = useQuery(
    api.vehicles.getVendorRevenueHistory,
    token ? { token, months: 6 } : "skip"
  ) ?? initialRevenueHistory;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-500 mt-1">Track your performance and sales</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Vehicles</p>
                <p className="text-3xl font-bold mt-2">{stats.totalVehicles}</p>
                <div className="flex gap-2 mt-4">
                  <Badge variant="outline" className="text-xs">
                    {stats.inAuction} In Auction
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {stats.pending} Pending
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {stats.sold} vehicles sold
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Sale Price</p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats.averageSalePrice)}
                </p>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {stats.totalVehicles > 0 ? ((stats.sold / stats.totalVehicles) * 100).toFixed(1) : "0.0"}% sell-through
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Revenue History */}
      {revenueHistory && revenueHistory.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue History (Last 6 Months)</h2>
          <div className="space-y-3">
            {revenueHistory.map((data: any) => (
              <div key={data.month} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">{data.month}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (data.revenue / Math.max(...revenueHistory.map((d: any) => d.revenue))) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-32 text-right font-semibold">
                  {formatCurrency(data.revenue)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

