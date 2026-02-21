"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/providers/auth-provider";
import { useWatchlistStore } from "@/store/watchlist";
import { useToast } from "./use-toast";

/**
 * Provides optimistic watchlist toggle behaviour for a single vehicle.
 *
 * - If the user is not authenticated, shows a toast and does nothing.
 * - Applies an optimistic update immediately, then rolls back on error.
 */
export function useWatchlistToggle(vehicleId: string) {
  const { token } = useAuth();
  const { toast } = useToast();
  const { watchlistedIds, toggle, setWatchlisted } = useWatchlistStore();

  const addMutation = useMutation(api.watchlist.addToWatchlist);
  const removeMutation = useMutation(api.watchlist.removeFromWatchlist);

  const isWatchlisted = watchlistedIds.has(vehicleId);

  const handleToggle = async () => {
    if (!token) {
      toast({
        title: "Sign in required",
        description: "Please log in to save vehicles to your watchlist.",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update — flip state immediately so the UI responds instantly.
    const wasWatchlisted = isWatchlisted;
    toggle(vehicleId);

    try {
      if (wasWatchlisted) {
        await removeMutation({
          token,
          vehicleId: vehicleId as Id<"vehicles">,
        });
        toast({ title: "Removed from watchlist" });
      } else {
        await addMutation({
          token,
          vehicleId: vehicleId as Id<"vehicles">,
        });
        toast({ title: "Added to watchlist" });
      }
    } catch {
      // Roll back the optimistic update on failure.
      setWatchlisted(vehicleId, wasWatchlisted);
      toast({
        title: "Error",
        description: "Could not update your watchlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { isWatchlisted, handleToggle };
}
