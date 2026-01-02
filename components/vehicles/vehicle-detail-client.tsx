"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import {
  Heart,
  Share2,
  FileText,
  MapPin,
  Battery,
  Zap,
  ArrowLeft,
  Calendar,
  Gauge,
  Info,
  ShieldCheck,
  Timer
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
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatCurrency, formatVIN, formatLotNumber, formatRelativeTime, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Info className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Vehicle Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          The vehicle you're looking for differs or has been removed.
        </p>
        <Button onClick={() => router.push("/vehicles")} size="lg">
          Browse All Vehicles
        </Button>
      </div>
    );
  }

  const { auctionLot, images, bids, documents } = vehicle;
  const currentBid = auctionLot?.currentBid || vehicle.startingBid || 0;
  const bidCount = auctionLot?.bidCount || 0;
  const auctionIsActive = auctionLot?.status === "active";

  // Hero Image Handling
  const heroImage = images && images.length > 0 ? images[0] : null;

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* Immersive Hero Section */}
      <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden bg-muted">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <Zap className="h-24 w-24 text-muted-foreground/20" />
          </div>
        )}

        {/* Back Button */}
        <div className="absolute top-6 left-4 md:left-8 z-10">
          <Link href="/vehicles">
            <Button variant="outline" size="sm" className="bg-black/30 md:bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-md">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Listings
            </Button>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-4">
              <div className="space-y-2 mb-4 md:mb-0">
                <div className="flex items-center gap-3">
                  <Badge className="bg-electric-blue/90 hover:bg-electric-blue text-white border-none py-1.5 px-3 uppercase tracking-wide">
                    {vehicle.year}
                  </Badge>
                  {vehicle.batteryHealthPercent && (
                    <BatteryHealthBadge healthPercent={vehicle.batteryHealthPercent} />
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  {vehicle.make} {vehicle.model}
                </h1>
                <div className="flex items-center gap-4 text-white/90 font-medium text-sm md:text-base">
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <Gauge className="h-4 w-4 text-electric-blue" />
                    {vehicle.odometer.toLocaleString()} km
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <MapPin className="h-4 w-4 text-error-red" />
                    {vehicle.currentLocation.city}, {vehicle.currentLocation.country}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gallery & Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery (Thumbnails) */}
            <div className="bg-card rounded-2xl p-6 shadow-xl border border-border/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-electric-blue" />
                Vehicle Gallery
              </h2>
              <ImageGallery
                images={images}
                vehicleTitle={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              />
            </div>

            {/* Specs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 border-l-4 border-l-electric-blue shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/20">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Battery className="h-5 w-5 text-electric-blue" />
                  Battery & Charging
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Capacity</span>
                    <span className="font-semibold">{vehicle.batteryCapacity} kWh</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Health (SoH)</span>
                    <span className={cn("font-bold", vehicle.batteryHealthPercent && vehicle.batteryHealthPercent > 85 ? "text-volt-green" : "text-warning-amber")}>{vehicle.batteryHealthPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground text-sm">Range (Est.)</span>
                    <span className="font-semibold">{vehicle.estimatedRange} km</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-l-4 border-l-volt-green shadow-md hover:shadow-lg transition-all bg-gradient-to-br from-card to-muted/20">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-volt-green" />
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Motor Power</span>
                    <span className="font-semibold">{vehicle.motorPower || "N/A"} kW</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Drivetrain</span>
                    <span className="font-semibold">{vehicle.drivetrain || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground text-sm">Title Status</span>
                    <span className="font-semibold">{vehicle.titleType}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Comprehensive Tabs */}
            <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-muted/30 scrollbar-hide overflow-x-auto">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6">Overview</TabsTrigger>
                  <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6">Full Specs</TabsTrigger>
                  <TabsTrigger value="condition" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6">Condition</TabsTrigger>
                  <TabsTrigger value="bids" className="rounded-none border-b-2 border-transparent data-[state=active]:border-electric-blue data-[state=active]:bg-transparent py-4 px-6">Bid History ({bidCount})</TabsTrigger>
                </TabsList>

                <div className="p-6">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">VIN</p>
                        <p className="font-mono font-medium">{formatVIN(vehicle.vin)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Odometer</p>
                        <p className="font-medium">{vehicle.odometer.toLocaleString()} km</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Exterior Color</p>
                        <p className="font-medium">{vehicle.exteriorColor}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Interior Color</p>
                        <p className="font-medium">{vehicle.interiorColor}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="specs" className="mt-0">
                    <h3 className="font-bold mb-4">Detailed Specifications</h3>
                    {/* Insert more detailed specs rendering here if available */}
                    <p className="text-muted-foreground">Additional technical specifications for this vehicle.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {vehicle.chargingType.map((type: string) => (
                        <Badge key={type} variant="secondary" className="bg-muted text-foreground">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="condition" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-5 w-5 text-volt-green" />
                        <span className="font-bold">Vehicle Condition Report</span>
                      </div>
                      <p className="text-sm bg-muted/50 p-4 rounded-xl border border-border/50">
                        {vehicle.damageDescription || "No significant damage reported. Normal wear and tear for age and mileage."}
                      </p>
                      {documents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold mb-2 text-sm">Available Documents</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {documents.map((doc: { _id: string; type: string; url: string }) => (
                              <a
                                key={doc._id}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 bg-muted/30 border border-border/50 rounded-lg hover:bg-muted transition-colors group"
                              >
                                <FileText className="h-4 w-4 text-electric-blue" />
                                <span className="text-sm capitalize font-medium group-hover:text-electric-blue transition-colors">{doc.type.replace(/_/g, ' ')}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="bids" className="mt-0">
                    {bids.length === 0 ? (
                      <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground font-medium">No bids yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Be the first to place a bid on this premium EV.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Bidder</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bids.map((bid: any) => (
                            <TableRow key={bid._id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-foreground">
                                User {bid.userId.slice(-4)}
                              </TableCell>
                              <TableCell className="font-bold text-foreground">
                                {formatCurrency(bid.amount)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatRelativeTime(bid.createdAt)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Sale Card */}
              <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                {/* Gradient Glow */}
                <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none opacity-20", auctionIsActive ? "bg-volt-green" : "bg-electric-blue")} />

                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lot Number</p>
                      <p className="font-mono font-bold text-lg">{formatLotNumber(vehicle.lotNumber)}</p>
                    </div>
                    <div className="text-right">
                      {auctionIsActive ? (
                        <Badge variant="outline" className="bg-volt-green/10 text-volt-green border-volt-green/20 animate-pulse px-3 py-1">
                          • Live Auction
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {vehicle.status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <p className="text-sm text-muted-foreground mb-1 font-medium">{auctionIsActive ? "Current Highest Bid" : "Starting Price"}</p>
                    <PriceDisplay amount={currentBid} variant="large" className="text-4xl justify-center font-black tracking-tight" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {bidCount} {bidCount === 1 ? "bid" : "bids"} placed
                    </p>
                  </div>

                  {auctionIsActive && auctionLot?.endsAt && (
                    <div className="bg-muted/50 rounded-xl p-4 mb-6 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Time Remaining</span>
                        <Timer className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <AuctionTimer
                        endsAt={auctionLot.endsAt}
                        variant="large"
                        className="justify-center text-2xl font-mono text-error-red"
                        onExpire={() => setIsActive(false)}
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    {auctionIsActive ? (
                      <BidButton
                        lotId={auctionLot._id}
                        currentBid={currentBid}
                        bidIncrement={auctionLot.bidIncrement}
                        className="w-full h-12 text-lg shadow-lg shadow-volt-green/20 bg-gradient-to-r from-volt-green to-emerald-600 hover:from-emerald-600 hover:to-volt-green transition-all"
                      />
                    ) : (
                      <Button disabled className="w-full h-12">
                        Bidding Closed
                      </Button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full hover:bg-error-red/5 hover:text-error-red hover:border-error-red/20 transition-colors">
                        <Heart className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                      <Button variant="outline" className="w-full hover:bg-electric-blue/5 hover:text-electric-blue hover:border-electric-blue/20 transition-colors">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Estimator (Mini) */}
              <Card className="p-6 border-border/50 bg-card/60 backdrop-blur-lg">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Shipping Estimate
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To Nigeria (Lag)</span>
                    <span className="font-semibold">~ ₦1.2M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Port Fees</span>
                    <span className="font-semibold">~ ₦200k</span>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground mt-2">
                    Estimates only. Customs duty calculated upon arrival.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

