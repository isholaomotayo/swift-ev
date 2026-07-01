"use client";

import { WatchlistVehicleCard } from "@/components/autoexports/watchlist-vehicle-card";
import * as m from "@/src/paraglide/messages.js";

export interface Vehicle {
  _id: string;
  lotNumber: string;
  make: string;
  model: string;
  year: number;
  fuelType?: string;
  odometer?: number;
  condition?: string;
  currentLocation?: {
    city: string;
    country: string;
  };
  batteryCapacity?: number;
  estimatedRange?: number;
  batteryHealthPercent?: number;
  heroImage?: string;
  auctionLot?: {
    currentBid: number;
    bidCount: number;
    endsAt?: number;
    status: string;
  } | null;
}

interface FeaturedVehiclesProps {
  vehicles: Vehicle[];
  loading?: boolean;
}

export function FeaturedVehicles({ vehicles, loading }: FeaturedVehiclesProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-96 bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12 bg-background rounded-lg border">
        <p className="text-muted-foreground">
          {m.home_no_vehicles_available()}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.slice(0, 3).map((vehicle) => (
        <WatchlistVehicleCard key={vehicle._id} vehicle={vehicle} />
      ))}
    </div>
  );
}
