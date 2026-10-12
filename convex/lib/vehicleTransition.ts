import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  assertVehicleStatusTransition,
  isVehicleStatus,
  type VehicleStatus,
} from "./vehicleLifecycle";

/** Narrow a stored status string to a known VehicleStatus or throw. */
export function vehicleStatusOf(status: string): VehicleStatus {
  if (!isVehicleStatus(status)) {
    throw new ConvexError(`Unknown vehicle status: ${status}`);
  }
  return status;
}

/**
 * Move a vehicle to a new status through the lifecycle table: read, assert the transition,
 * patch. A no-op status change (same status) still applies `fields`.
 */
export async function transitionVehicle(
  ctx: MutationCtx,
  vehicleId: Id<"vehicles">,
  to: VehicleStatus,
  fields: Record<string, unknown> = {}
): Promise<void> {
  const vehicle = await ctx.db.get(vehicleId);
  if (!vehicle) throw new ConvexError("Vehicle not found");
  assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), to);
  await ctx.db.patch(vehicleId, { ...fields, status: to, updatedAt: Date.now() });
}
