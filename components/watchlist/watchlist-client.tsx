"use client";

import { useQuery, useMutation } from "convex/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { Heart, Trash2, Zap, Gavel } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Id } from "@/convex/_generated/dataModel";
import { WatchlistItem } from "@/lib/types";

interface WatchlistClientProps {
  initialWatchlist: any;
  token: string;
}

export function WatchlistClient({
  initialWatchlist,
  token,
}: WatchlistClientProps) {
  const { toast } = useToast();

  const watchlist = useQuery(
    api.watchlist.getWatchlist,
    token ? { token } : "skip"
  ) ?? initialWatchlist;

  const removeFromWatchlist = useMutation(api.watchlist.removeFromWatchlist);

  const handleRemove = async (vehicleId: Id<"vehicles">) => {
    if (!token) return;

    try {
      await removeFromWatchlist({ token, vehicleId });
      toast({
        title: "Removed from watchlist",
        description: "Vehicle has been removed from your watchlist.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove from watchlist";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (watchlist === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Watchlist</h1>
        <p className="text-muted-foreground">
          {watchlist.length === 0
            ? "No vehicles in your watchlist yet"
            : `${watchlist.length} vehicle${watchlist.length === 1 ? "" : "s"} in your watchlist`}
        </p>
      </div>

      {watchlist.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Your watchlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Start adding vehicles you're interested in to your watchlist
          </p>
          <Link href="/vehicles">
            <Button>Browse Vehicles</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(watchlist as WatchlistItem[]).map((item) => (
            <Card key={item._id} className="overflow-hidden">
              <div className="relative">
                <Link href={`/vehicles/${item.vehicle._id}`}>
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {item.vehicle.image ? (
                      <img
                        src={item.vehicle.image}
                        alt={`${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemove(item.vehicle._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4">
                <Link href={`/vehicles/${item.vehicle._id}`}>
                  <h3 className="font-semibold text-lg mb-1 hover:text-electric-blue transition-colors">
                    {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">{item.vehicle.condition}</Badge>
                  {item.vehicle.batteryHealthPercent && (
                    <Badge variant="outline">
                      {item.vehicle.batteryHealthPercent}% SoH
                    </Badge>
                  )}
                </div>

                {item.vehicle.auctionLot ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Current Bid
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(
                          item.vehicle.auctionLot.currentBid || 0
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gavel className="h-4 w-4" />
                      <span>
                        {item.vehicle.auctionLot.bidCount || 0} bids
                      </span>
                    </div>
                    <Link href={`/vehicles/${item.vehicle._id}`}>
                      <Button className="w-full mt-2">View & Bid</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Starting Bid
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(item.vehicle.startingBid || 0)}
                      </span>
                    </div>
                    <Link href={`/vehicles/${item.vehicle._id}`}>
                      <Button variant="outline" className="w-full mt-2">
                        View Details
                      </Button>
                    </Link>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Added {new Date(item.addedAt).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

