"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Zap, Battery, Timer } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuctionTimer } from "./auction-timer";
import { PriceDisplay } from "./price-display";
import { BatteryHealthBadge } from "./battery-health-badge";
import { cn } from "@/lib/utils";

interface VehicleCardProps {
  vehicle: {
    _id: string;
    lotNumber: string;
    make: string;
    model: string;
    year: number;
    batteryCapacity: number;
    estimatedRange: number;
    batteryHealthPercent?: number;
    heroImage?: string;
  };
  auctionLot?: {
    currentBid: number;
    bidCount: number;
    endsAt?: number;
    status: string;
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
  const {
    _id,
    lotNumber,
    make,
    model,
    year,
    batteryCapacity,
    estimatedRange,
    batteryHealthPercent,
    heroImage,
  } = vehicle;

  const isInAuction = auctionLot?.status === "active";

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl border-border/50 bg-card/50 backdrop-blur-sm hover:-translate-y-1",
      isInAuction ? "hover:shadow-volt-green/20" : "hover:shadow-primary/20",
      className
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${year} ${make} ${model}`}
            fill
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Zap className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Lot Number Badge */}
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="secondary" className="font-mono bg-black/60 text-white border-white/10 backdrop-blur-md shadow-sm">
            LOT #{lotNumber}
          </Badge>
        </div>

        {/* Watchlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white rounded-full transition-all duration-300"
          onClick={(e) => {
            e.preventDefault();
            onWatchlistToggle?.();
          }}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors duration-300",
              isWatchlisted ? "fill-error-red text-error-red" : "text-white"
            )}
          />
        </Button>

        {/* In Auction Badge */}
        {isInAuction && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <Badge className="bg-volt-green text-white border-0 animate-pulse shadow-lg shadow-volt-green/20 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-white mr-2 block animate-ping" />
              Live Auction
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex justify-between items-start gap-2">
          {/* Vehicle Title */}
          <Link href={`/vehicles/${_id}`} className="flex-1">
            <h3 className="text-xl font-bold line-clamp-1 group-hover:text-electric-blue transition-colors duration-300">
              {year} {make} {model}
            </h3>
          </Link>
          {batteryHealthPercent !== undefined && (
            <BatteryHealthBadge healthPercent={batteryHealthPercent} />
          )}
        </div>

        {/* Specs Row */}
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <Battery className="h-4 w-4 text-electric-blue" />
            <span>{batteryCapacity} kWh</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <Zap className="h-4 w-4 text-warning-amber" />
            <span>{estimatedRange} km range</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2 px-5">
        {/* Auction Info */}
        {auctionLot ? (
          <div className="bg-muted/30 rounded-xl p-3 border border-border/50 group-hover:border-electric-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isInAuction ? "Current Bid" : "Starting Bid"}
              </span>
              <Badge variant="outline" className="text-xs bg-background">
                {auctionLot.bidCount} {auctionLot.bidCount === 1 ? "bid" : "bids"}
              </Badge>
            </div>

            <div className="flex items-end justify-between">
              <PriceDisplay
                amount={auctionLot.currentBid}
                variant="large"
                className={cn(isInAuction ? "text-volt-green" : "text-foreground")}
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
          <Button variant="outline" className="flex-1 font-semibold group-hover:border-electric-blue/50 group-hover:text-electric-blue hover:bg-electric-blue/5 transition-all" asChild>
            <Link href={`/vehicles/${_id}`}>View Details</Link>
          </Button>
          {isInAuction && onBidClick && (
            <Button className="flex-1 bg-gradient-to-r from-volt-green to-emerald-600 hover:from-emerald-600 hover:to-volt-green text-white shadow-lg shadow-volt-green/20 hover:shadow-volt-green/40 transition-all font-semibold" onClick={onBidClick}>
              Place Bid
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
