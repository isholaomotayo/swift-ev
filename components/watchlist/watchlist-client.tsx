"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import { Heart, Trash2, Zap, Gavel, Eye, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";
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
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "auctions" | "liked">("all");

  const watchlist = (useQuery(
    api.watchlist.getWatchlist,
    token ? { token } : "skip"
  ) ?? initialWatchlist) as WatchlistItem[] | undefined;

  const removeFromWatchlist = useMutation(api.watchlist.removeFromWatchlist);

  const handleRemove = async (e: React.MouseEvent, vehicleId: Id<"vehicles">) => {
    e.stopPropagation();
    e.preventDefault();
    if (!token) return;

    try {
      await removeFromWatchlist({ token, vehicleId });
      toast({
        title: "Removed from saved items",
        description: "Vehicle has been removed from your saved list.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove item";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const filteredItems = useMemo(() => {
    if (!watchlist) return [];
    if (activeTab === "auctions") {
      return watchlist.filter((item) => !!item.vehicle.auctionLot);
    }
    if (activeTab === "liked") {
      return watchlist.filter((item) => !item.vehicle.auctionLot);
    }
    return watchlist;
  }, [watchlist, activeTab]);

  const auctionCount = useMemo(
    () => watchlist?.filter((item) => !!item.vehicle.auctionLot).length || 0,
    [watchlist]
  );
  const likedCount = useMemo(
    () => watchlist?.filter((item) => !item.vehicle.auctionLot).length || 0,
    [watchlist]
  );

  if (watchlist === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground font-medium">Loading saved vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Saved Vehicles & Watchlist</h1>
          <p className="text-muted-foreground text-sm">
            Manage your liked vehicles and watched auction lots in one place.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-xl border border-border/60 self-start md:self-auto">
          <Button
            variant={activeTab === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className={cn("rounded-lg text-xs font-bold", activeTab === "all" ? "bg-brand-primary text-white shadow-sm" : "")}
          >
            All Saved ({watchlist.length})
          </Button>
          <Button
            variant={activeTab === "auctions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("auctions")}
            className={cn("rounded-lg text-xs font-bold", activeTab === "auctions" ? "bg-electric-blue text-white shadow-sm" : "")}
          >
            <Gavel className="h-3.5 w-3.5 mr-1.5" />
            Watched Auctions ({auctionCount})
          </Button>
          <Button
            variant={activeTab === "liked" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("liked")}
            className={cn("rounded-lg text-xs font-bold", activeTab === "liked" ? "bg-error-red text-white shadow-sm" : "")}
          >
            <Heart className="h-3.5 w-3.5 mr-1.5 fill-current" />
            Liked Inventory ({likedCount})
          </Button>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-16 h-16 rounded-full bg-error-red/10 flex items-center justify-center mx-auto mb-4 text-error-red">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">No saved vehicles yet</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Click the heart button on any vehicle card in the inventory or auction lists to save it here for quick access.
          </p>
          <Link href="/vehicles">
            <Button size="lg" className="bg-electric-blue hover:bg-electric-blue/90 text-white font-bold">
              Browse Inventory
            </Button>
          </Link>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground font-medium mb-4">
            No items match the selected filter tab.
          </p>
          <Button variant="outline" onClick={() => setActiveTab("all")}>
            Show All Saved Items ({watchlist.length})
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isAuction = !!item.vehicle.auctionLot;
            return (
              <Card
                key={item._id}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push(`/vehicles/${item.vehicle._id}`)}
              >
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {item.vehicle.image ? (
                    <img
                      src={item.vehicle.image}
                      alt={`${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Zap className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Badge indicating Watched Auction vs Liked Inventory */}
                  <div className="absolute top-3 left-3 z-10">
                    {isAuction ? (
                      <Badge className="bg-electric-blue text-white font-bold border-none shadow-md flex items-center gap-1.5 px-2.5 py-1">
                        <Gavel className="h-3.5 w-3.5" />
                        Watched Auction
                      </Badge>
                    ) : (
                      <Badge className="bg-error-red text-white font-bold border-none shadow-md flex items-center gap-1.5 px-2.5 py-1">
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        Liked Vehicle
                      </Badge>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-10 bg-black/40 text-white hover:bg-red-600 hover:text-white rounded-full backdrop-blur-md transition-colors"
                    onClick={(e) => handleRemove(e, item.vehicle._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-xl mb-1 group-hover:text-electric-blue transition-colors line-clamp-1">
                    {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {item.vehicle.condition && (
                      <Badge variant="outline" className="capitalize text-[10px] font-semibold">
                        {item.vehicle.condition}
                      </Badge>
                    )}
                    {item.vehicle.batteryHealthPercent && (
                      <Badge variant="outline" className="text-[10px] font-semibold text-volt-green border-volt-green/30">
                        {item.vehicle.batteryHealthPercent}% SoH
                      </Badge>
                    )}
                  </div>

                  {item.vehicle.auctionLot ? (
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase font-semibold">
                          Current Bid
                        </span>
                        <span className="font-extrabold text-volt-green text-lg">
                          {formatCurrency(item.vehicle.auctionLot.currentBid || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1">
                          <Gavel className="h-3.5 w-3.5 text-electric-blue" />
                          {item.vehicle.auctionLot.bidCount || 0} bids placed
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase font-semibold">
                          Starting Price
                        </span>
                        <span className="font-extrabold text-foreground text-lg">
                          {formatCurrency(item.vehicle.startingBid || 0)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                    <span className="font-semibold text-electric-blue group-hover:underline flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

