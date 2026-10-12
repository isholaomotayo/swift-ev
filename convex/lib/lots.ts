import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { transitionVehicle } from "./vehicleTransition";

export interface LotInput {
  lotOrder: number;
  startingBid?: number;
  reservePrice?: number;
  buyItNowPrice?: number;
  bidIncrement?: number;
  estimatedStartTime?: number;
  lotDuration?: number;
}

/** Resolve and validate lot pricing: starting bid <= reserve <= Buy It Now, BIN required. */
export function resolveLotPricing(
  vehicle: Doc<"vehicles">,
  input: LotInput,
  defaultBidIncrement: number
) {
  const startingBid = input.startingBid ?? vehicle.startingBid ?? 0;
  const reservePrice = input.reservePrice ?? vehicle.reservePrice;
  const buyItNowPrice = input.buyItNowPrice ?? vehicle.buyItNowPrice;
  const bidIncrement = input.bidIncrement ?? defaultBidIncrement;

  if (startingBid < 0 || bidIncrement <= 0) {
    throw new ConvexError("Starting bid and bid increment must be positive values");
  }
  if (reservePrice !== undefined && reservePrice < startingBid) {
    throw new ConvexError("Reserve price must be greater than or equal to starting bid");
  }
  if (buyItNowPrice === undefined || buyItNowPrice <= 0) {
    throw new ConvexError("Buy It Now price is required for all auction lots");
  }
  if (reservePrice !== undefined && buyItNowPrice < reservePrice) {
    throw new ConvexError("Buy It Now price must be greater than or equal to reserve price");
  }
  return { startingBid, reservePrice, buyItNowPrice, bidIncrement };
}

/**
 * Add an approved vehicle to an auction as a pending lot and schedule the vehicle.
 * Single owner of: approved-only rule, one open lot per vehicle, pricing rules, lifecycle transition.
 */
export async function createLotForVehicle(
  ctx: MutationCtx,
  args: {
    auctionId: Id<"auctions">;
    vehicle: Doc<"vehicles">;
    input: LotInput;
    defaultBidIncrement: number;
  }
): Promise<Id<"auctionLots">> {
  const { vehicle, input } = args;
  if (vehicle.status !== "approved") {
    throw new ConvexError(
      `Only approved vehicles can be added to auctions. Current status: ${vehicle.status}`
    );
  }

  const openLot = await ctx.db
    .query("auctionLots")
    .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
    .filter((q) => q.or(q.eq(q.field("status"), "pending"), q.eq(q.field("status"), "active")))
    .first();
  if (openLot) {
    throw new ConvexError("Vehicle already has an active or pending auction lot");
  }

  const { startingBid, reservePrice, buyItNowPrice, bidIncrement } = resolveLotPricing(
    vehicle,
    input,
    args.defaultBidIncrement
  );

  const lotId = await ctx.db.insert("auctionLots", {
    auctionId: args.auctionId,
    vehicleId: vehicle._id,
    lotOrder: input.lotOrder,
    status: "pending",
    currentBid: startingBid,
    startingBid,
    reservePrice,
    bidIncrement,
    bidCount: 0,
    reserveMet: false,
    estimatedStartTime: input.estimatedStartTime,
    lotDuration: input.lotDuration,
    buyItNowPrice,
    buyItNowEnabled: true,
  });

  await transitionVehicle(ctx, vehicle._id, "scheduled");
  return lotId;
}
