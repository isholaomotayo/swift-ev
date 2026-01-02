"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/voltbid/image-gallery";
import { AuctionTimer } from "@/components/voltbid/auction-timer";
import { BidButton } from "@/components/voltbid/bid-button";
import { PriceDisplay } from "@/components/voltbid/price-display";
import { BatteryHealthBadge } from "@/components/voltbid/battery-health-badge";
import { api } from "@/convex/_generated/api";
import {
  ArrowLeft,
  Calendar,
  Gavel,
  TrendingUp,
  Users,
  Zap,
  Battery,
  MapPin,
} from "lucide-react";
import { formatCurrency, formatLotNumber, formatVIN } from "@/lib/utils";
import Link from "next/link";

interface LiveAuctionClientProps {
  initialAuctionData: any;
  initialCurrentLotData: any;
  auctionId: Id<"auctions">;
}

export function LiveAuctionClient({
  initialAuctionData,
  initialCurrentLotData,
  auctionId,
}: LiveAuctionClientProps) {
  const router = useRouter();
  const [selectedLotIndex, setSelectedLotIndex] = useState(0);

  // Real-time subscriptions
  const auctionData = useQuery(
    api.auctions.getAuctionById,
    { auctionId },
    initialAuctionData
  );
  const currentLotData = useQuery(
    api.auctions.getCurrentLot,
    { auctionId },
    initialCurrentLotData
  );
  const bids = useQuery(
    api.bids.getBidsForLot,
    currentLotData?.lot?._id ? { lotId: currentLotData.lot._id } : "skip"
  );

  // Find current lot index in the lots array
  useEffect(() => {
    if (auctionData && currentLotData?.lot) {
      const index = auctionData.lots.findIndex(
        (l) => l?.lot?._id === currentLotData.lot._id
      );
      if (index !== -1) {
        setSelectedLotIndex(index);
      }
    }
  }, [auctionData, currentLotData]);

  if (!auctionData) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold mb-2">Auction not found</p>
        <p className="text-muted-foreground mb-4">
          The auction you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push("/auctions")}>
          Back to Auctions
        </Button>
      </div>
    );
  }

  const { auction, lots } = auctionData;
  const currentLot = currentLotData?.lot;
  const currentVehicle = currentLotData?.vehicle;

  // Get upcoming lots
  const UPCOMING_LOTS_COUNT = 10;
  const upcomingLots = lots
    .slice(selectedLotIndex + 1, selectedLotIndex + 1 + UPCOMING_LOTS_COUNT)
    .filter((l) => l !== null);

  // Get bid history for current lot
  const bidHistory = bids || [];
  const currentBid = currentLot?.currentBid || currentLot?.startingBid || 0;
  const bidCount = currentLot?.bidCount || 0;

  const isAuctionLive = auction.status === "live";
  const isLotActive = currentLot?.status === "active";

  return (
    <>
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Auction Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">{auction.name}</h1>
          <Badge
            className={
              isAuctionLive
                ? "bg-volt-green/20 text-volt-green border-volt-green/30"
                : "bg-muted text-muted-foreground"
            }
          >
            {isAuctionLive ? "Live" : auction.status}
          </Badge>
        </div>
        {auction.description && (
          <p className="text-muted-foreground">{auction.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(auction.scheduledStart).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{lots.length} lots</span>
          </div>
          {isAuctionLive && (
            <div className="flex items-center gap-1">
              <Gavel className="h-4 w-4" />
              <span>{bidCount} bids</span>
            </div>
          )}
        </div>
      </div>

      {!currentLot || !currentVehicle ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {isAuctionLive
              ? "Waiting for next lot..."
              : "Auction has not started yet"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Current Lot (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Vehicle Image Gallery */}
            <Card className="p-4">
              <ImageGallery
                images={currentVehicle.images || []}
                vehicleTitle={`${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}`}
              />
            </Card>

            {/* Vehicle Details */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {currentVehicle.year} {currentVehicle.make}{" "}
                    {currentVehicle.model}
                  </h2>
                  <p className="text-muted-foreground">
                    Lot {formatLotNumber(currentLot.lotOrder.toString())}
                  </p>
                </div>
                <BatteryHealthBadge
                  healthPercent={currentVehicle.batteryHealthPercent || 0}
                />
              </div>

              <Separator className="my-4" />

              {/* Vehicle Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">VIN</p>
                  <p className="font-mono text-sm font-semibold">
                    {formatVIN(currentVehicle.vin)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Battery Capacity
                  </p>
                  <div className="flex items-center gap-1">
                    <Battery className="h-4 w-4 text-electric-blue" />
                    <p className="font-semibold">
                      {currentVehicle.batteryCapacity} kWh
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Range</p>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-volt-green" />
                    <p className="font-semibold">
                      {currentVehicle.estimatedRange} km
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Odometer</p>
                  <p className="font-semibold">
                    {currentVehicle.odometer.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <Badge variant="secondary">
                    {currentVehicle.condition}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <p className="font-semibold text-sm">
                      {currentVehicle.currentLocation.city},{" "}
                      {currentVehicle.currentLocation.country}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bid History */}
            {bidHistory.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Bid History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bidHistory.map((bid) => (
                    <div
                      key={bid._id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-electric-blue/10 flex items-center justify-center">
                          <Gavel className="h-4 w-4 text-electric-blue" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {bid.user
                              ? `${bid.user.firstName} ${bid.user.lastName}`
                              : `Bidder #${bid._id.slice(-6)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bid.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <PriceDisplay amount={bid.amount} />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Auction Info & Upcoming Lots (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Lot Auction Info (Sticky) */}
            <div className="sticky top-24 space-y-6">
              <Card className="p-6 space-y-6">
                {/* Lot Number */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Lot Number
                  </p>
                  <p className="text-xl font-bold font-mono text-electric-blue">
                    {formatLotNumber(currentLot.lotOrder.toString())}
                  </p>
                </div>

                <Separator />

                {/* Current Bid */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Current Bid
                  </p>
                  <PriceDisplay amount={currentBid} variant="large" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {bidCount} {bidCount === 1 ? "bid" : "bids"} placed
                  </p>
                </div>

                {/* Auction Timer */}
                {isLotActive && currentLot.endsAt && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Time Remaining
                      </p>
                      <AuctionTimer
                        endsAt={currentLot.endsAt}
                        variant="large"
                        onExpire={() => {
                          // useQuery will continue to update automatically
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isLotActive ? (
                    <BidButton
                      lotId={currentLot._id}
                      currentBid={currentBid}
                      bidIncrement={currentLot.bidIncrement || 50000}
                      className="w-full"
                    />
                  ) : (
                    <Button disabled className="w-full">
                      {isAuctionLive ? "Lot Not Active" : "Auction Not Live"}
                    </Button>
                  )}

                  <Link
                    href={`/vehicles/${currentVehicle._id}`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      View Full Details
                    </Button>
                  </Link>
                </div>

                {/* Reserve Price Info */}
                {currentVehicle.reservePrice && (
                  <>
                    <Separator />
                    <div className="bg-muted/50 p-3 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">
                        Reserve Price
                      </p>
                      <p className="text-sm font-semibold">
                        {currentBid >= currentVehicle.reservePrice ? (
                          <span className="text-volt-green">
                            ✓ Reserve Met
                          </span>
                        ) : (
                          <span className="text-warning-amber">
                            Reserve Not Met
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </Card>

              {/* Upcoming Lots Sidebar */}
              {upcomingLots.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Upcoming Lots
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {upcomingLots.map((lotData: any, index: number) => {
                      if (!lotData) return null;
                      const { lot, vehicle } = lotData;
                      return (
                        <Link
                          key={lot._id}
                          href={`/vehicles/${vehicle._id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              {vehicle.image ? (
                                <img
                                  src={vehicle.image}
                                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Zap className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Lot {formatLotNumber(lot.lotOrder.toString())}
                              </p>
                              <p className="text-xs font-semibold mt-1">
                                {formatCurrency(
                                  lot.startingBid || vehicle.startingBid || 0
                                )}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

