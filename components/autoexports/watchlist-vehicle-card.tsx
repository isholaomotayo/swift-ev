"use client";

import { useRouter } from "next/navigation";
import { VehicleCard } from "./vehicle-card";
import { useWatchlistToggle } from "@/hooks/use-watchlist-toggle";
import type { Vehicle } from "@/components/home/featured-vehicles";

interface WatchlistVehicleCardProps {
  vehicle: Vehicle;
  className?: string;
}

/**
 * VehicleCard wrapper that wires up live watchlist toggle state.
 *
 * Calling the hook at this level (one instance per card) satisfies the Rules
 * of Hooks — hooks cannot be called inside `.map()` callbacks.
 */
export function WatchlistVehicleCard({
  vehicle,
  className,
}: WatchlistVehicleCardProps) {
  const router = useRouter();
  const { isWatchlisted, handleToggle } = useWatchlistToggle(vehicle._id);

  return (
    <VehicleCard
      vehicle={vehicle}
      auctionLot={vehicle.auctionLot ?? undefined}
      onBidClick={() => router.push(`/vehicles/${vehicle._id}`)}
      onWatchlistToggle={handleToggle}
      isWatchlisted={isWatchlisted}
      className={className}
    />
  );
}
