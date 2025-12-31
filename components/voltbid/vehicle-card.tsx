"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Zap, Battery } from "lucide-react";
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
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-lg", className)}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={`${year} ${make} ${model}`}
            fill
            className="object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Zap className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Lot Number Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="font-mono bg-black/70 text-white border-0">
            {lotNumber}
          </Badge>
        </div>

        {/* Watchlist Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
          onClick={(e) => {
            e.preventDefault();
            onWatchlistToggle?.();
          }}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isWatchlisted ? "fill-error-red text-error-red" : "text-muted-foreground"
            )}
          />
        </Button>

        {/* In Auction Badge */}
        {isInAuction && (
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-volt-green text-white border-0 animate-pulse">
              Live Auction
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        {/* Vehicle Title */}
        <Link href={`/vehicles/${_id}`}>
          <h3 className="text-lg font-semibold line-clamp-1 hover:text-electric-blue transition-colors">
            {year} {make} {model}
          </h3>
        </Link>

        {/* Specs Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Battery className="h-4 w-4" />
            <span>{batteryCapacity} kWh</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span>{estimatedRange} km</span>
          </div>
        </div>

        {/* Battery Health */}
        {batteryHealthPercent !== undefined && (
          <div className="mt-2">
            <BatteryHealthBadge healthPercent={batteryHealthPercent} />
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        {/* Auction Info */}
        {auctionLot && isInAuction && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <PriceDisplay amount={auctionLot.currentBid} label="Current Bid" variant="compact" />
              <span className="text-sm text-muted-foreground">
                {auctionLot.bidCount} {auctionLot.bidCount === 1 ? "bid" : "bids"}
              </span>
            </div>

            {auctionLot.endsAt && (
              <AuctionTimer endsAt={auctionLot.endsAt} variant="compact" />
            )}
          </div>
        )}

        {/* Buy It Now Price */}
        {!isInAuction && auctionLot?.currentBid && (
          <PriceDisplay amount={auctionLot.currentBid} label="Starting Price" />
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/vehicles/${_id}`}>View Details</Link>
          </Button>
          {isInAuction && onBidClick && (
            <Button className="flex-1" onClick={onBidClick}>
              Place Bid
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
