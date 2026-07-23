"use client";

import { RemoteImage } from "@/components/ui/remote-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Zap, Battery, Timer, MapPin, Gauge, Fuel } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuctionTimer } from "./auction-timer";
import { PriceDisplay } from "./price-display";
import { BatteryHealthBadge } from "./battery-health-badge";
import { MoneyBackGuaranteeCard } from "@/components/vehicles/money-back-guarantee-card";
import { cn } from "@/lib/utils";

interface VehicleCardProps {
  vehicle: {
    _id: string;
    lotNumber: string;
    make: string;
    model: string;
    year: number;
    fuelType?: string;
    odometer?: number;
    condition?: string;
    status?: string;
    currentLocation?: {
      city: string;
      country: string;
    };
    batteryCapacity?: number;
    estimatedRange?: number;
    batteryHealthPercent?: number;
    heroImage?: string;
    buyItNowPrice?: number;
    buyItNowEnabled?: boolean;
    startingBid?: number;
    reservePrice?: number;
  };
  auctionLot?: {
    currentBid: number;
    bidCount: number;
    endsAt?: number;
    status: string;
    buyItNowPrice?: number;
    buyItNowEnabled?: boolean;
    startingBid?: number;
    reservePrice?: number;
  };
  onBidClick?: () => void;
  onWatchlistToggle?: () => void;
  isWatchlisted?: boolean;
  className?: string;
}

export function VehicleCard({
  vehicle,
  auctionLot,
  onBidClick,
  onWatchlistToggle,
  isWatchlisted = false,
  className,
}: VehicleCardProps) {
  const router = useRouter();
  const {
    _id,
    lotNumber,
    make,
    model,
    year,
    fuelType,
    odometer,
    condition,
    currentLocation,
    batteryCapacity,
    estimatedRange,
    batteryHealthPercent,
    heroImage,
  } = vehicle;

  const isInAuction = auctionLot?.status === "active";
  const isPreBidding = auctionLot?.status === "pending";
  const canBid = isInAuction || isPreBidding;
  
  const reservePrice = auctionLot?.reservePrice ?? vehicle.reservePrice;

  const buyNowPrice =
    auctionLot?.buyItNowPrice ??
    vehicle.buyItNowPrice ??
    reservePrice;

  const showBuyNow =
    !!buyNowPrice &&
    !isInAuction &&
    vehicle.status !== "payment_pending" &&
    (vehicle.buyItNowEnabled !== false || !!buyNowPrice);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1 cursor-pointer",
        isInAuction ? "hover:shadow-volt-green/20" : "hover:shadow-primary/20",
        className,
      )}
      onClick={() => router.push(`/vehicles/${_id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {heroImage ? (
          <RemoteImage
            src={heroImage}
            alt={`${year} ${make} ${model}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/50">
            <Zap className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Lot Number Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
          <Badge
            variant="secondary"
            className="font-mono bg-black/60 text-white border-white/10 backdrop-blur-md shadow-sm"
          >
            LOT #{lotNumber}
          </Badge>
          {showBuyNow && buyNowPrice && (
            <Badge className="bg-volt-green text-slate-950 border-none font-semibold shadow-sm">
              Buy Now · <PriceDisplay amount={buyNowPrice} variant="compact" className="inline" />
            </Badge>
          )}
        </div>

        {/* Watchlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white rounded-full transition-all duration-300"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onWatchlistToggle?.();
          }}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors duration-300",
              isWatchlisted ? "fill-error-red text-error-red" : "text-white",
            )}
          />
        </Button>

        {/* In Auction Badge */}
        {isInAuction && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <Badge className="bg-volt-green text-slate-950 border-0 animate-pulse shadow-lg shadow-volt-green/20 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-white mr-2 block animate-ping" />
              Live Auction
            </Badge>
          </div>
        )}
        {isPreBidding && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <Badge className="bg-electric-blue text-white border-0 shadow-lg shadow-electric-blue/20 px-3 py-1">
              Pre-Bidding Open
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex justify-between items-start gap-2">
          {/* Vehicle Title */}
          <div className="flex-1">
            <h3 className="text-xl font-bold line-clamp-1 group-hover:text-electric-blue transition-colors duration-300">
              {year} {make} {model}
            </h3>
          </div>
          {batteryHealthPercent !== undefined && (
            <BatteryHealthBadge healthPercent={batteryHealthPercent} />
          )}
        </div>

        {/* Location & Condition Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          {currentLocation && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="truncate">{currentLocation.city}, {currentLocation.country}</span>
            </div>
          )}
          {condition && (
            <Badge variant="outline" className={cn(
              "text-[10px] py-0 px-2 font-semibold capitalize border",
              condition === "excellent" || condition === "new" || condition === "like_new"
                ? "bg-green-50 text-green-700 border-green-200"
                : condition === "good"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : condition === "fair"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
            )}>
              {condition}
            </Badge>
          )}
          {fuelType && (
            <Badge variant="outline" className="text-[10px] py-0 px-2 font-semibold bg-slate-50 text-slate-700 border-slate-200 capitalize">
              {fuelType}
            </Badge>
          )}
          <MoneyBackGuaranteeCard variant="compact" className="text-[10px] py-0.5 px-2 font-semibold" />
        </div>

        {/* Specs Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold mt-3 text-muted-foreground">
          {odometer !== undefined && (
            <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
              <Gauge className="h-3.5 w-3.5 text-slate-500" />
              <span>{odometer.toLocaleString()} km</span>
            </div>
          )}
          {/* If it's EV (or has EV params) show battery capacities */}
          {((fuelType?.toLowerCase().includes("ev") || fuelType?.toLowerCase().includes("electric")) || batteryCapacity) && (
            <>
              {batteryCapacity != null && batteryCapacity > 0 && (
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
                  <Battery className="h-3.5 w-3.5 text-electric-blue" />
                  <span>{batteryCapacity} kWh</span>
                </div>
              )}
              {estimatedRange != null && estimatedRange > 0 && (
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-md">
                  <Zap className="h-3.5 w-3.5 text-warning-amber" />
                  <span>{estimatedRange} km range</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2 px-5">
        {/* Auction Info */}
        {auctionLot ? (
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50 group-hover:border-electric-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isInAuction
                  ? "Current Bid"
                  : isPreBidding
                    ? "Current Pre-Bid"
                    : "Starting Bid"}
              </span>
              <Badge variant="outline" className="text-xs bg-background">
                {auctionLot.bidCount}{" "}
                {auctionLot.bidCount === 1 ? "bid" : "bids"}
              </Badge>
            </div>

            <div className="flex items-end justify-between">
              <PriceDisplay
                amount={auctionLot.currentBid}
                variant="large"
                className={cn(
                  isInAuction
                    ? "text-volt-green"
                    : isPreBidding
                      ? "text-electric-blue"
                      : "text-foreground",
                )}
              />

              {isInAuction && auctionLot.endsAt && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-error-red bg-error-red/10 px-2 py-1 rounded-md">
                  <Timer className="h-3.5 w-3.5" />
                  <AuctionTimer endsAt={auctionLot.endsAt} variant="compact" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50 opacity-50">
            <span className="text-sm text-muted-foreground flex items-center justify-center py-2">
              Auction Details Upcoming
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 px-5 pb-5">
        <div className="flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1 font-semibold group-hover:border-electric-blue/50 group-hover:text-electric-blue hover:bg-electric-blue/5 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vehicles/${_id}`);
            }}
          >
            View Details
          </Button>
          {canBid && onBidClick && (
            <Button
              className={cn(
                "flex-1 text-white shadow-lg transition-all font-semibold",
                isInAuction
                  ? "bg-volt-green hover:bg-volt-green/90 shadow-volt-green/20 hover:shadow-volt-green/40"
                  : "bg-electric-blue hover:bg-electric-blue/90 shadow-electric-blue/20 hover:shadow-electric-blue/40",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onBidClick();
              }}
            >
              {isInAuction ? "Place Bid" : "Pre-Bid"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
