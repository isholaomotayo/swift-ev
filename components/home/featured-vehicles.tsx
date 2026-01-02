"use client";

import { useRouter } from "next/navigation";
import { VehicleCard } from "@/components/voltbid/vehicle-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeaturedVehiclesProps {
  vehicles: any[];
  loading?: boolean;
}

export function FeaturedVehicles({ vehicles, loading }: FeaturedVehiclesProps) {
  const router = useRouter();

  if (loading || vehicles === null) {
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
          No vehicles currently available. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.slice(0, 3).map((vehicle) => (
        <VehicleCard
          key={vehicle._id}
          vehicle={vehicle}
          auctionLot={vehicle.auctionLot}
          onBidClick={() => {
            router.push(`/vehicles/${vehicle._id}`);
          }}
          onWatchlistToggle={() => {
            // TODO: Implement watchlist functionality
            console.log("Toggle watchlist for", vehicle._id);
          }}
          isWatchlisted={false}
        />
      ))}
    </div>
  );
}

