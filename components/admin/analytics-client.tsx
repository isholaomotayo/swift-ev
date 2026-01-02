"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Gavel,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsClientProps {
  initialPlatformStats: any;
  initialRevenueMetrics: any;
  initialVehicleMetrics: any;
  initialUserMetrics: any;
  initialAuctionMetrics: any;
  token: string;
}

export function AnalyticsClient({
  initialPlatformStats,
  initialRevenueMetrics,
  initialVehicleMetrics,
  initialUserMetrics,
  initialAuctionMetrics,
  token,
}: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState("30"); // days

  // Calculate date range - memoize to prevent infinite loops
  const { now, start, daysBack } = useMemo(() => {
    const currentTime = Date.now();
    const days = parseInt(dateRange);
    const startTime = currentTime - days * 24 * 60 * 60 * 1000;
    return { now: currentTime, start: startTime, daysBack: days };
  }, [dateRange]);

  // Use useQuery for real-time updates
  const platformStats = useQuery(
    api.analytics.getPlatformStats,
    token ? { token, dateRange: { start, end: now } } : "skip"
  ) ?? initialPlatformStats;

  const revenueMetrics = useQuery(
    api.analytics.getRevenueMetrics,
    token
      ? {
          token,
          dateRange: { start, end: now },
          groupBy: daysBack <= 7 ? "day" : daysBack <= 30 ? "day" : "month",
        }
      : "skip"
  ) ?? initialRevenueMetrics;

  const vehicleMetrics = useQuery(
    api.analytics.getVehicleMetrics,
    token ? { token } : "skip"
  ) ?? initialVehicleMetrics;

  const userMetrics = useQuery(
    api.analytics.getUserMetrics,
    token ? { token, months: 6 } : "skip"
  ) ?? initialUserMetrics;

  const auctionMetrics = useQuery(
    api.analytics.getAuctionMetrics,
    token ? { token } : "skip"
  ) ?? initialAuctionMetrics;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-500 mt-1">Platform performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {platformStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold mt-2">
                  {formatCurrency(platformStats.revenue.total)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {platformStats.revenue.ordersCount} orders
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
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-2xl font-bold mt-2">{platformStats.users.active}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{platformStats.users.new} new
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Vehicles</p>
                <p className="text-2xl font-bold mt-2">{platformStats.vehicles.listed}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {platformStats.vehicles.sold} sold
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Auctions</p>
                <p className="text-2xl font-bold mt-2">{platformStats.auctions.total}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {platformStats.auctions.live} live now
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Gavel className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Revenue Chart */}
      {revenueMetrics && revenueMetrics.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
          <div className="space-y-3">
            {revenueMetrics.map((data: any) => (
              <div key={data.period} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">{data.period}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (data.revenue / Math.max(...revenueMetrics.map((d: any) => d.revenue))) * 100,
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Performance */}
        {vehicleMetrics && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Top Makes</h2>
            <div className="space-y-3">
              {vehicleMetrics.topMakes.map((item: any) => (
                <div key={item.make} className="flex items-center justify-between">
                  <span className="font-medium">{item.make}</span>
                  <span className="text-gray-600">{item.count} vehicles</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* User Growth */}
        {userMetrics && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Membership Distribution</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Guest</span>
                <span className="font-semibold">{userMetrics.membershipDistribution.guest}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Basic</span>
                <span className="font-semibold">{userMetrics.membershipDistribution.basic}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Premier</span>
                <span className="font-semibold">
                  {userMetrics.membershipDistribution.premier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Business</span>
                <span className="font-semibold">
                  {userMetrics.membershipDistribution.business}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">KYC Completion Rate</span>
                <span className="font-semibold">
                  {userMetrics.kycCompletionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Auction Performance */}
      {auctionMetrics && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Auction Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Sell-Through Rate</p>
              <p className="text-3xl font-bold mt-2">
                {auctionMetrics.sellThroughRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Bids per Lot</p>
              <p className="text-3xl font-bold mt-2">
                {auctionMetrics.avgBidsPerLot.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Premium</p>
              <p className="text-3xl font-bold mt-2">
                {auctionMetrics.avgPremiumPercent.toFixed(1)}%
              </p>
            </div>
          </div>

          {auctionMetrics.topAuctions.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3">Top Performing Auctions</h3>
              <div className="space-y-2">
                {auctionMetrics.topAuctions.map((auction: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{auction.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {auction.soldCount}/{auction.lotsCount} sold
                      </span>
                    </div>
                    <span className="font-semibold">{formatCurrency(auction.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

