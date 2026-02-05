"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImageGallery } from "@/components/autoexports/image-gallery";
import { AuctionTimer } from "@/components/autoexports/auction-timer";
import { BidButton } from "@/components/autoexports/bid-button";
import { PriceDisplay } from "@/components/autoexports/price-display";
import { BatteryHealthBadge } from "@/components/autoexports/battery-health-badge";
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
  Timer,
  Car,
  Gauge,
  Key,
  FileText,
  Plug,
} from "lucide-react";
import { formatCurrency, formatLotNumber, formatVIN, cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ImageCarousel } from "@/components/ui/image-carousel";

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
    { auctionId }
  ) ?? initialAuctionData;
  const currentLotData = useQuery(
    api.auctions.getCurrentLot,
    { auctionId }
  ) ?? initialCurrentLotData;
  const bids = useQuery(
    api.bids.getBidsForLot,
    currentLotData?.lot?._id ? { lotId: currentLotData.lot._id } : "skip"
  );

  // Find current lot index in the lots array
  useEffect(() => {
    if (auctionData && currentLotData?.lot) {
      const index = auctionData.lots.findIndex(
        (l: any) => l?.lot?._id === currentLotData.lot._id
      );
      if (index !== -1) {
        setSelectedLotIndex(index);
      }
    }
  }, [auctionData, currentLotData]);

  if (!auctionData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Card className="p-8 max-w-md w-full border-dashed border-2 bg-muted/30">
          <h2 className="text-xl font-bold mb-2">Auction Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The auction you're looking for differs or has been removed.
          </p>
          <Button onClick={() => router.push("/auctions")} className="w-full">
            Back to Auctions
          </Button>
        </Card>
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
    .filter((l: any) => l !== null);

  // Get bid history for current lot
  const bidHistory = bids || [];
  const currentBid = currentLot?.currentBid || currentLot?.startingBid || 0;
  const bidCount = currentLot?.bidCount || 0;

  const isAuctionLive = auction.status === "live";
  const isLotActive = currentLot?.status === "active";

  // Prepare images for carousel
  const carouselImages = (currentVehicle?.images || []).map((url: string, index: number) => {
    // Determine type based on index or url pattern
    let type = "exterior";
    if (url.includes("interior")) type = "interior";
    else if (url.includes("engine")) type = "engine";
    else if (url.includes("boot") || url.includes("trunk")) type = "boot";
    else if (index === 0) type = "hero";
    return { url, type };
  });

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* 1. Header / Top Bar (Sticky or top section) */}
      <div className="bg-background border-b border-border/50 sticky top-16 z-20 shadow-sm backdrop-blur-md bg-background/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/auctions">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg leading-tight truncate max-w-[200px] md:max-w-md">{auction.name}</h1>
                <Badge
                  variant={isAuctionLive ? "default" : "secondary"}
                  className={cn(isAuctionLive ? "bg-volt-green/10 text-volt-green border-volt-green/20 animate-pulse" : "")}
                >
                  {isAuctionLive ? "LIVE NOW" : auction.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground hidden md:flex">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(auction.scheduledStart).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {lots.length} Lots</span>
              </div>
            </div>
          </div>
          {/* Optional: Add a "Watch Live" View Toggle or similar here */}
        </div>
      </div>

      {!currentLot || !currentVehicle ? (
        <div className="container mx-auto px-4 py-12">
          <Card className="p-12 text-center border-dashed border-2 bg-muted/20">
            <Gavel className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{isAuctionLive ? "Waiting for next lot..." : "Auction has not started"}</h2>
            <p className="text-muted-foreground">Please wait for the auctioneer to open the next lot.</p>
          </Card>
        </div>
      ) : (
        <>
          {/* Split Layout for Live View */}
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:h-[calc(100vh-140px)]">

              {/* Left: Main Visuals & Stats (7 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto">
                {/* Image Carousel */}
                <ImageCarousel
                  images={carouselImages}
                  vehicleName={`${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}`}
                />

                {/* Vehicle Info Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-electric-blue text-white border-none">Lot #{formatLotNumber(currentLot.lotOrder.toString())}</Badge>
                      <Badge variant="outline">{currentVehicle.year}</Badge>
                      <Badge variant="secondary" className="capitalize">{currentVehicle.condition}</Badge>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">
                      {currentVehicle.make} {currentVehicle.model}
                    </h2>
                    {currentVehicle.trim && <p className="text-muted-foreground">{currentVehicle.trim}</p>}
                  </div>
                </div>

                {/* Quick Specs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                      <Battery className="h-3.5 w-3.5" /> Battery
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">{currentVehicle.batteryHealthPercent || 0}%</span>
                      <span className="text-xs text-muted-foreground">health</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{currentVehicle.batteryCapacity} kWh</p>
                  </Card>
                  <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                      <Zap className="h-3.5 w-3.5" /> Range
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">{currentVehicle.estimatedRange}</span>
                      <span className="text-xs text-muted-foreground">km</span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                      <Gauge className="h-3.5 w-3.5" /> Mileage
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">{currentVehicle.odometer?.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">km</span>
                    </div>
                  </Card>
                  <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase font-bold mb-1">
                      <MapPin className="h-3.5 w-3.5" /> Location
                    </div>
                    <p className="text-sm font-medium truncate">{currentVehicle.currentLocation.city}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentVehicle.currentLocation.country}</p>
                  </Card>
                </div>

                {/* Full Vehicle Details */}
                <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-electric-blue" /> Vehicle Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VIN</span>
                        <span className="font-mono font-medium">{formatVIN(currentVehicle.vin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exterior Color</span>
                        <span className="font-medium">{currentVehicle.exteriorColor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interior Color</span>
                        <span className="font-medium">{currentVehicle.interiorColor || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Drivetrain</span>
                        <span className="font-medium">{currentVehicle.drivetrain || "N/A"}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title Type</span>
                        <span className="font-medium capitalize">{currentVehicle.titleType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Has Keys</span>
                        <span className="font-medium flex items-center gap-1">
                          <Key className="h-3.5 w-3.5" /> {currentVehicle.hasKeys ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Motor Power</span>
                        <span className="font-medium">{currentVehicle.motorPower || "N/A"} kW</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Charging</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {(currentVehicle.chargingType || []).map((type: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs flex items-center gap-1">
                              <Plug className="h-3 w-3" /> {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {currentVehicle.damageDescription && (
                    <div className="mt-4 p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
                      <p className="text-sm font-medium text-warning-amber">Damage Notes:</p>
                      <p className="text-sm text-muted-foreground">{currentVehicle.damageDescription}</p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Right: Bidding Console (5 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                {/* Live Status & Timer */}
                <Card className="p-5 border-border/50 shadow-lg bg-card/80 backdrop-blur-xl">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isLotActive ? "bg-volt-green" : "bg-warning-amber")}></span>
                        <span className={cn("relative inline-flex rounded-full h-3 w-3", isLotActive ? "bg-volt-green" : "bg-warning-amber")}></span>
                      </span>
                      <span className={cn("font-bold text-sm uppercase tracking-wider", isLotActive ? "text-volt-green" : "text-warning-amber")}>
                        {isLotActive ? "Accepting Bids" : "Lot Closed"}
                      </span>
                    </div>
                    {isLotActive && currentLot.endsAt && (
                      <AuctionTimer endsAt={currentLot.endsAt} variant="default" onExpire={() => { }} className="font-mono text-lg font-bold" />
                    )}
                  </div>

                  <div className="text-center py-4 bg-muted/10 rounded-xl mb-4 border border-border/50">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Current Highest Bid</p>
                    <PriceDisplay amount={currentBid} variant="large" className="text-5xl justify-center font-black tracking-tight" />
                  </div>

                  {isLotActive ? (
                    <div className="space-y-3">
                      <BidButton
                        lotId={currentLot._id}
                        currentBid={currentBid}
                        bidIncrement={currentLot.bidIncrement || 50000}
                        buyNowPrice={currentLot.buyItNowPrice}
                        buyNowEnabled={currentLot.buyItNowEnabled}
                        status={currentLot.status}
                        className="w-full h-14 text-xl shadow-lg shadow-volt-green/20 bg-volt-green text-slate-950 hover:bg-volt-green/90"
                      />
                      <p className="text-xs text-center text-muted-foreground">
                        Bid increment: {formatCurrency(currentLot.bidIncrement || 50000)}
                      </p>
                    </div>
                  ) : (
                    <Button disabled className="w-full h-14 text-lg">
                      {isAuctionLive ? "Waiting for next lot..." : "Auction Not Live"}
                    </Button>
                  )}
                </Card>

                {/* Live Feed / History */}
                <Card className="flex-1 border-border/50 bg-card/40 backdrop-blur-sm flex flex-col overflow-hidden min-h-[300px]">
                  <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-electric-blue" />
                      Live Feed
                    </h3>
                    <Badge variant="secondary" className="text-xs">{bidHistory.length} Bids</Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide">
                    {bidHistory.length > 0 ? bidHistory.map((bid) => (
                      <div key={bid._id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 animate-in slide-in-from-right-2 duration-300">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-electric-blue/10 flex items-center justify-center">
                            <Gavel className="h-4 w-4 text-electric-blue" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">User {bid.user?.firstName || "Guest"}</p>
                            <p className="text-xs text-muted-foreground">{new Date(bid.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-electric-blue">{formatCurrency(bid.amount)}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                        <p>No bids yet.</p>
                        <p>Be the first to bid!</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Upcoming Lots Queue (Horizontal Scroll) */}
            {upcomingLots.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 px-1">Up Next Queue</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {upcomingLots.map((lotData: any, i: number) => {
                    if (!lotData) return null;
                    const { lot, vehicle } = lotData;
                    return (
                      <Link key={lot._id} href={`/vehicles/${vehicle._id}`} className="min-w-[280px] group">
                        <Card className="p-3 bg-card/40 border-border/50 hover:bg-card hover:border-electric-blue/30 transition-all flex items-center gap-3">
                          <div className="h-16 w-16 rounded-lg bg-muted relative overflow-hidden flex-shrink-0">
                            {vehicle.images?.[0] && <Image src={vehicle.images[0]} alt="Thumbnail" fill className="object-cover" />}
                            <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded backdrop-blur-sm">Lot {lot.lotOrder}</div>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-electric-blue transition-colors">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{vehicle.trim || "Base Model"}</p>
                            <p className="font-mono text-xs font-bold mt-1">Start: {formatCurrency(lot.startingBid)}</p>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

