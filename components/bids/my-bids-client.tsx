"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import { Gavel } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BidStatusBadge } from "@/components/voltbid/bid-status-badge";
import { UserBid } from "@/lib/types";

interface MyBidsClientProps {
  initialUserBids: any;
  token: string;
}

export function MyBidsClient({
  initialUserBids,
  token,
}: MyBidsClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const userBids = useQuery(
    api.bids.getUserBids,
    token ? { token } : "skip",
    initialUserBids
  );

  // Filter bids by status
  const filteredBids =
    (userBids as UserBid[] | undefined)?.filter((bid) => {
      if (statusFilter === "all") return true;
      return bid.bid.status === statusFilter;
    }) || [];

  // Separate active and past bids
  const activeBids = filteredBids.filter(
    (bid) => bid.bid.status === "active" || bid.bid.status === "winning"
  );
  const pastBids = filteredBids.filter(
    (bid) =>
      bid.bid.status === "outbid" ||
      bid.bid.status === "won" ||
      bid.bid.status === "cancelled"
  );

  if (userBids === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-electric-blue border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading bids...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Bids</h1>
        <p className="text-muted-foreground">
          Track all your bidding activity
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bids</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="winning">Winning</SelectItem>
            <SelectItem value="outbid">Outbid</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredBids.length} bid{filteredBids.length === 1 ? "" : "s"} found
        </p>
      </div>

      {filteredBids.length === 0 ? (
        <Card className="p-12 text-center">
          <Gavel className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No bids found</h2>
          <p className="text-muted-foreground mb-6">
            {statusFilter === "all"
              ? "You haven't placed any bids yet"
              : `No ${statusFilter} bids found`}
          </p>
          <Link href="/vehicles">
            <Button>Browse Vehicles</Button>
          </Link>
        </Card>
      ) : (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">
              Active Bids ({activeBids.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Bids ({pastBids.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeBids.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No active bids
              </Card>
            ) : (
              activeBids.map((bid) => (
                <Card key={bid._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/vehicles/${bid.vehicle._id}`}
                          className="hover:text-electric-blue transition-colors"
                        >
                          <h3 className="text-lg font-semibold">
                            {bid.vehicle.year} {bid.vehicle.make}{" "}
                            {bid.vehicle.model}
                          </h3>
                        </Link>
                        <BidStatusBadge status={bid.bid.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Lot {bid.lot.lotOrder || "N/A"} •{" "}
                        {formatDate(bid.bid.createdAt)}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Your Bid
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(bid.bid.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Current Bid
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(
                              bid.lot.currentBid || bid.vehicle.startingBid || 0
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Bid Type
                          </p>
                          <p className="font-semibold capitalize">
                            {bid.bid.bidType.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Status
                          </p>
                          <p className="font-semibold capitalize">
                            {bid.bid.status}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link href={`/vehicles/${bid.vehicle._id}`}>
                      <Button variant="outline">View Vehicle</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBids.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No past bids
              </Card>
            ) : (
              pastBids.map((bid) => (
                <Card key={bid._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/vehicles/${bid.vehicle._id}`}
                          className="hover:text-electric-blue transition-colors"
                        >
                          <h3 className="text-lg font-semibold">
                            {bid.vehicle.year} {bid.vehicle.make}{" "}
                            {bid.vehicle.model}
                          </h3>
                        </Link>
                        <BidStatusBadge status={bid.bid.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Lot {bid.lot.lotOrder || "N/A"} •{" "}
                        {formatDate(bid.bid.createdAt)}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Your Bid
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(bid.bid.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Final Bid
                          </p>
                          <p className="font-semibold">
                            {formatCurrency(
                              bid.lot.winningBid ||
                                bid.lot.currentBid ||
                                bid.vehicle.startingBid ||
                                0
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Bid Type
                          </p>
                          <p className="font-semibold capitalize">
                            {bid.bid.bidType.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Result
                          </p>
                          <p className="font-semibold capitalize">
                            {bid.bid.status}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link href={`/vehicles/${bid.vehicle._id}`}>
                      <Button variant="outline">View Vehicle</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

