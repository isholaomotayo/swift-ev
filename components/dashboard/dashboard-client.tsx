"use client";

import { useQuery } from "convex/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import {
  Gavel,
  Heart,
  ShoppingBag,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { UserBid, WatchlistItem, UserOrder } from "@/lib/types";
import { RECENT_ITEMS_DISPLAY_COUNT } from "@/lib/constants";

interface DashboardClientProps {
  initialUserBids: any;
  initialWatchlist: any;
  initialUserOrders: any;
  token: string;
  user: {
    firstName: string;
  };
}

export function DashboardClient({
  initialUserBids,
  initialWatchlist,
  initialUserOrders,
  token,
  user,
}: DashboardClientProps) {
  // Use useQuery for real-time updates
  const userBids = useQuery(
    api.bids.getUserBids,
    token ? { token } : "skip",
    initialUserBids
  );
  const watchlist = useQuery(
    api.watchlist.getWatchlist,
    token ? { token } : "skip",
    initialWatchlist
  );
  const userOrders = useQuery(
    api.orders.getUserOrders,
    token ? { token } : "skip",
    initialUserOrders
  );

  // Calculate stats
  const activeBids = (userBids as UserBid[] | undefined)?.filter(
    (bid) => bid.bid.status === "active" || bid.bid.status === "winning"
  ) || [];
  const totalBids = (userBids as UserBid[] | undefined)?.length || 0;
  const watchlistCount = (watchlist as WatchlistItem[] | undefined)?.length || 0;
  const activeOrders = (userOrders as UserOrder[] | undefined)?.filter(
    (order) =>
      order.status !== "delivered" &&
      order.status !== "cancelled" &&
      order.status !== "refunded"
  ) || [];

  // Get recent bids
  const recentBids = (userBids as UserBid[] | undefined)?.slice(0, RECENT_ITEMS_DISPLAY_COUNT) || [];

  // Get watchlist items
  const recentWatchlist = (watchlist as WatchlistItem[] | undefined)?.slice(0, RECENT_ITEMS_DISPLAY_COUNT) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName}! Here's your activity overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Active Bids
              </p>
              <p className="text-2xl font-bold">{activeBids.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-electric-blue/10 flex items-center justify-center">
              <Gavel className="h-6 w-6 text-electric-blue" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Total Bids
              </p>
              <p className="text-2xl font-bold">{totalBids}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-volt-green/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-volt-green" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Watchlist
              </p>
              <p className="text-2xl font-bold">{watchlistCount}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-red/10 flex items-center justify-center">
              <Heart className="h-6 w-6 text-error-red" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Active Orders
              </p>
              <p className="text-2xl font-bold">{activeOrders.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning-amber/10 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-warning-amber" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bids */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Recent Bids
            </h2>
            <Link href="/my-bids">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {recentBids.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bids yet</p>
              <Link href="/vehicles">
                <Button variant="outline" className="mt-4">
                  Browse Vehicles
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBids.map((bid) => (
                <div
                  key={bid._id}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {bid.vehicle.year} {bid.vehicle.make}{" "}
                      {bid.vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(bid.bid.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(bid.bid.amount)}
                    </p>
                    <Badge
                      variant={
                        bid.bid.status === "winning"
                          ? "default"
                          : bid.bid.status === "active"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {bid.bid.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Watchlist Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Watchlist
            </h2>
            <Link href="/watchlist">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {recentWatchlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No vehicles in watchlist</p>
              <Link href="/vehicles">
                <Button variant="outline" className="mt-4">
                  Browse Vehicles
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentWatchlist.map((item) => (
                <Link
                  key={item._id}
                  href={`/vehicles/${item.vehicle._id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {item.vehicle.image ? (
                        <img
                          src={item.vehicle.image}
                          alt={`${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Zap className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.vehicle.year} {item.vehicle.make}{" "}
                        {item.vehicle.model}
                      </p>
                      {item.vehicle.auctionLot && (
                        <p className="text-sm text-muted-foreground">
                          Current Bid:{" "}
                          {formatCurrency(
                            item.vehicle.auctionLot.currentBid || 0
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/vehicles">
            <Button variant="outline" className="w-full justify-start">
              <Zap className="h-4 w-4 mr-2" />
              Browse Vehicles
            </Button>
          </Link>
          <Link href="/auctions">
            <Button variant="outline" className="w-full justify-start">
              <Gavel className="h-4 w-4 mr-2" />
              View Auctions
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="outline" className="w-full justify-start">
              <ShoppingBag className="h-4 w-4 mr-2" />
              My Orders
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

