import { create } from "zustand";

interface WatchlistStore {
  /** Set of vehicle IDs the user has watchlisted (kept in sync with Convex via mutations). */
  watchlistedIds: Set<string>;
  /** Optimistically toggle a vehicle in/out of the watchlist. */
  toggle: (vehicleId: string) => void;
  /** Explicitly set whether a vehicle is watchlisted (used for rollback after error). */
  setWatchlisted: (vehicleId: string, isWatchlisted: boolean) => void;
  /** Seed the store from a server-fetched list on mount (avoids flicker). */
  initFromServer: (vehicleIds: string[]) => void;
}

/**
 * In-memory Zustand store for optimistic watchlist state.
 *
 * Not persisted — the source of truth is Convex. On mount, call
 * `initFromServer(vehicleIds)` to seed from the user's server-fetched watchlist.
 * All subsequent mutations go through `toggle()` (optimistic) + Convex mutations.
 */
export const useWatchlistStore = create<WatchlistStore>((set) => ({
  watchlistedIds: new Set(),

  toggle: (vehicleId) =>
    set((state) => {
      const next = new Set(state.watchlistedIds);
      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }
      return { watchlistedIds: next };
    }),

  setWatchlisted: (vehicleId, isWatchlisted) =>
    set((state) => {
      const next = new Set(state.watchlistedIds);
      if (isWatchlisted) {
        next.add(vehicleId);
      } else {
        next.delete(vehicleId);
      }
      return { watchlistedIds: next };
    }),

  initFromServer: (vehicleIds) =>
    set({ watchlistedIds: new Set(vehicleIds) }),
}));
