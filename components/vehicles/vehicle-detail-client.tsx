"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Heart,
  Share2,
  FileText,
} from "lucide-react";
import { ImageGallery } from "@/components/voltbid/image-gallery";
import { BatteryHealthBadge } from "@/components/voltbid/battery-health-badge";
import { AuctionTimer } from "@/components/voltbid/auction-timer";
import { BidButton } from "@/components/voltbid/bid-button";
import { PriceDisplay } from "@/components/voltbid/price-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatCurrency, formatVIN, formatLotNumber, formatRelativeTime } from "@/lib/utils";
import { MapPin, Battery, Zap } from "lucide-react";

interface VehicleDetailClientProps {
  initialVehicle: any;
  vehicleId: Id<"vehicles">;
}

export function VehicleDetailClient({
  initialVehicle,
  vehicleId,
}: VehicleDetailClientProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(
    initialVehicle?.auctionLot?.status === "active"
  );

  // Conditionally use real-time subscription ONLY if auction is active
  const realtimeVehicle = useQuery(
    api.vehicles.getVehicleById,
    isActive ? { vehicleId } : "skip"
  ) ?? initialVehicle;

  // If real-time data shows auction ended, stop subscription
  useEffect(() => {
    if (realtimeVehicle?.auctionLot?.status !== "active" && isActive) {
      setIsActive(false);
    }
  }, [realtimeVehicle?.auctionLot?.status, isActive]);

  // Use real-time data if available and active, otherwise use initial data
  const vehicle = isActive && realtimeVehicle !== undefined ? realtimeVehicle : initialVehicle;

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-2">Vehicle Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The vehicle you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => router.push("/vehicles")}>
          Browse Vehicles
        </Button>
      </div>
    );
  }

  const { auctionLot, images, bids, documents } = vehicle;
  const currentBid = auctionLot?.currentBid || vehicle.startingBid || 0;
  const bidCount = auctionLot?.bidCount || 0;
  const auctionIsActive = auctionLot?.status === "active";

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-muted-foreground">
        <a href="/vehicles" className="hover:text-foreground">
          Vehicles
        </a>
        {" / "}
        <span className="text-foreground">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <div className="bg-background rounded-lg p-6">
            <ImageGallery
              images={images}
              vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            />
          </div>

          {/* Tabbed Content */}
          <div className="bg-background rounded-lg p-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="specs">EV Specs</TabsTrigger>
                <TabsTrigger value="condition">Condition</TabsTrigger>
                <TabsTrigger value="shipping">Shipping</TabsTrigger>
                <TabsTrigger value="bids">Bids ({bidCount})</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Make</p>
                      <p className="font-semibold">{vehicle.make}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-semibold">{vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-semibold">{vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VIN</p>
                      <p className="font-semibold font-mono text-sm">
                        {formatVIN(vehicle.vin)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Odometer</p>
                      <p className="font-semibold">
                        {vehicle.odometer.toLocaleString()} km
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Exterior Color</p>
                      <p className="font-semibold">{vehicle.exteriorColor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interior Color</p>
                      <p className="font-semibold">{vehicle.interiorColor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <p className="font-semibold">{vehicle.currentLocation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* EV Specs Tab */}
              <TabsContent value="specs" className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Electric Vehicle Specifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Battery Capacity</p>
                      <div className="flex items-center gap-2">
                        <Battery className="h-4 w-4 text-electric-blue" />
                        <p className="font-semibold">{vehicle.batteryCapacity} kWh</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Range</p>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-volt-green" />
                        <p className="font-semibold">{vehicle.estimatedRange} km</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Battery Health (SoH)</p>
                      <BatteryHealthBadge healthPercent={vehicle.batteryHealthPercent || 0} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Charging Types</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vehicle.chargingType.map((type: string) => (
                          <Badge key={type} variant="secondary">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {vehicle.motorPower && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motor Power</p>
                        <p className="font-semibold">{vehicle.motorPower} kW</p>
                      </div>
                    )}
                    {vehicle.drivetrain && (
                      <div>
                        <p className="text-sm text-muted-foreground">Drive Type</p>
                        <p className="font-semibold">{vehicle.drivetrain}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Condition Tab */}
              <TabsContent value="condition" className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Vehicle Condition</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Condition</p>
                      <Badge className="mt-1 capitalize">{vehicle.condition}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Title Status</p>
                      <p className="font-semibold">{vehicle.titleType}</p>
                    </div>
                    {vehicle.damageDescription && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Damage Description</p>
                        <p className="text-sm bg-muted/50 p-4 rounded-md">
                          {vehicle.damageDescription}
                        </p>
                      </div>
                    )}
                    {documents.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Documents</p>
                        <div className="space-y-2">
                          {documents.map((doc: { _id: string; type: string; url: string }) => (
                            <a
                              key={doc._id}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-sm capitalize">{doc.type.replace(/_/g, ' ')}</span>
                              <Badge variant="outline" className="ml-auto">
                                {doc.type}
                              </Badge>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Shipping Tab */}
              <TabsContent value="shipping" className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shipping & Costs</h3>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm font-semibold mb-2">Current Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <p className="text-sm">{vehicle.currentLocation}</p>
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-md">
                      <p className="text-sm font-semibold mb-2">Estimated Costs</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        These are estimated costs. Final costs will be calculated after winning the auction.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Shipping (China → Nigeria)</span>
                          <span className="font-mono">₦800,000 - ₦1,200,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Customs Duty (20%)</span>
                          <span className="font-mono">Calculated on arrival</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Port Charges</span>
                          <span className="font-mono">₦150,000 - ₦250,000</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-semibold">
                          <span>Estimated Total Additional Costs</span>
                          <span className="font-mono">₦1,000,000 - ₦1,500,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Bids Tab */}
              <TabsContent value="bids" className="space-y-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Bid History</h3>
                  {bids.length === 0 ? (
                    <div className="text-center py-8 bg-muted/50 rounded-md">
                      <p className="text-muted-foreground">No bids placed yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Be the first to bid!
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bidder</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bids.map((bid: { _id: string; amount: number; createdAt: number; userId: string; type: string }) => (
                          <TableRow key={bid._id}>
                            <TableCell className="font-medium">
                              User {bid.userId.slice(-6)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatCurrency(bid.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={bid.type === "manual" ? "default" : "secondary"}>
                                {bid.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeTime(bid.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column - Auction Info (Sticky) */}
        <div className="lg:col-span-1">
          <div className="bg-background rounded-lg border p-6 space-y-6 sticky top-24">
            {/* Lot Number */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Lot Number</p>
              <p className="text-lg font-bold font-mono text-electric-blue">
                {formatLotNumber(vehicle.lotNumber)}
              </p>
            </div>

            <Separator />

            {/* Current Bid */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Bid</p>
              <PriceDisplay amount={currentBid} variant="large" />
              <p className="text-xs text-muted-foreground mt-1">
                {bidCount} {bidCount === 1 ? "bid" : "bids"} placed
              </p>
            </div>

            {/* Auction Timer */}
            {auctionIsActive && auctionLot?.endsAt && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                  <AuctionTimer
                    endsAt={auctionLot.endsAt}
                    variant="large"
                    onExpire={() => {
                      setIsActive(false);
                    }}
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {auctionIsActive ? (
                <BidButton
                  lotId={auctionLot._id}
                  currentBid={currentBid}
                  bidIncrement={auctionLot.bidIncrement}
                  className="w-full"
                />
              ) : (
                <Button disabled className="w-full">
                  Auction Not Active
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full">
                  <Heart className="h-4 w-4 mr-2" />
                  Watchlist
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Reserve Price Info */}
            {vehicle.reservePrice && (
              <>
                <Separator />
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Reserve Price</p>
                  <p className="text-sm font-semibold">
                    {currentBid >= vehicle.reservePrice ? (
                      <span className="text-volt-green">✓ Reserve Met</span>
                    ) : (
                      <span className="text-warning-amber">Reserve Not Met</span>
                    )}
                  </p>
                </div>
              </>
            )}

            {/* Buy It Now */}
            {vehicle.buyItNowPrice && auctionIsActive && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Buy It Now</p>
                  <PriceDisplay amount={vehicle.buyItNowPrice} />
                  <Button className="w-full mt-2" variant="secondary">
                    Buy Now
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

