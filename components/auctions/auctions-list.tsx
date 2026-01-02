"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { Calendar, Clock, Gavel, Play, Users } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface AuctionsListProps {
  initialAuctions?: any[];
}

export function AuctionsList({ initialAuctions }: AuctionsListProps) {
  const [selectedTab, setSelectedTab] = useState("all");

  // Use real-time subscription if initial data provided, otherwise fetch
  const allAuctions = useQuery(
    api.auctions.listAuctions,
    initialAuctions ? "skip" : {}
  ) || initialAuctions || [];

  // Client-side filtering
  const liveAuctions = useMemo(
    () => allAuctions.filter((a) => a.status === "live"),
    [allAuctions]
  );

  const scheduledAuctions = useMemo(
    () => allAuctions.filter((a) => a.status === "scheduled"),
    [allAuctions]
  );

  const endedAuctions = useMemo(
    () => allAuctions.filter((a) => a.status === "ended"),
    [allAuctions]
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { className: string; label: string }
    > = {
      scheduled: {
        className:
          "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
        label: "Scheduled",
      },
      live: {
        className: "bg-volt-green/20 text-volt-green border-volt-green/30",
        label: "Live",
      },
      paused: {
        className:
          "bg-warning-amber/20 text-warning-amber border-warning-amber/30",
        label: "Paused",
      },
      ended: {
        className: "bg-muted text-muted-foreground",
        label: "Ended",
      },
      cancelled: {
        className: "bg-error-red/20 text-error-red border-error-red/30",
        label: "Cancelled",
      },
    };

    const config =
      variants[status] ||
      ({ className: "bg-muted text-muted-foreground", label: status } as const);

    return (
      <Badge className={config.className}>{config.label}</Badge>
    );
  };

  if (allAuctions.length === 0 && !initialAuctions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
      <TabsList>
        <TabsTrigger value="all">
          All ({allAuctions.length})
        </TabsTrigger>
        <TabsTrigger value="live">Live ({liveAuctions.length})</TabsTrigger>
        <TabsTrigger value="scheduled">
          Scheduled ({scheduledAuctions.length})
        </TabsTrigger>
        <TabsTrigger value="ended">
          Ended ({endedAuctions.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-6">
        {allAuctions.length === 0 ? (
          <Card className="p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No auctions found</h2>
            <p className="text-muted-foreground">
              Check back later for upcoming auctions
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allAuctions.map((auction) => (
              <Card key={auction._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold flex-1">
                    {auction.name}
                  </h3>
                  {getStatusBadge(auction.status)}
                </div>

                {auction.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {auction.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(auction.scheduledStart)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{auction.totalLots} lots</span>
                  </div>
                  {auction.status === "live" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gavel className="h-4 w-4" />
                      <span>{auction.totalBids} bids</span>
                    </div>
                  )}
                </div>

                <Link href={`/auctions/${auction._id}`}>
                  <Button
                    className="w-full"
                    variant={auction.status === "live" ? "default" : "outline"}
                  >
                    {auction.status === "live" ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Join Live Auction
                      </>
                    ) : (
                      "View Details"
                    )}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="live" className="mt-6">
        {liveAuctions.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No live auctions</h2>
            <p className="text-muted-foreground">
              Check scheduled auctions for upcoming events
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveAuctions.map((auction) => (
              <Card key={auction._id} className="p-6 hover:shadow-lg transition-shadow border-volt-green/20">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold flex-1">
                    {auction.name}
                  </h3>
                  {getStatusBadge(auction.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{auction.totalLots} lots</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Gavel className="h-4 w-4" />
                    <span className="font-semibold">{auction.totalBids} bids</span>
                  </div>
                </div>

                <Link href={`/auctions/${auction._id}`} className="block">
                  <Button className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Join Live Auction
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="scheduled" className="mt-6">
        {scheduledAuctions.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No scheduled auctions</h2>
            <p className="text-muted-foreground">
              New auctions will appear here when scheduled
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scheduledAuctions.map((auction) => (
              <Card key={auction._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold flex-1">
                    {auction.name}
                  </h3>
                  {getStatusBadge(auction.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Starts {formatDate(auction.scheduledStart)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{auction.totalLots} lots</span>
                  </div>
                </div>

                <Link href={`/auctions/${auction._id}`}>
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="ended" className="mt-6">
        {endedAuctions.length === 0 ? (
          <Card className="p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No ended auctions</h2>
            <p className="text-muted-foreground">
              Past auctions will appear here
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {endedAuctions.map((auction) => (
              <Card key={auction._id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold flex-1">
                    {auction.name}
                  </h3>
                  {getStatusBadge(auction.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{auction.soldLots} of {auction.totalLots} lots sold</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gavel className="h-4 w-4" />
                    <span>{auction.totalBids} total bids</span>
                  </div>
                </div>

                <Link href={`/auctions/${auction._id}`}>
                  <Button variant="outline" className="w-full">
                    View Results
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

