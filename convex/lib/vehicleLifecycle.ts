import { ConvexError } from "convex/values";

export const VEHICLE_STATUSES = [
  "draft",
  "pending_inspection",
  "pending_approval",
  "approved",
  "ready_for_auction",
  "scheduled",
  "in_auction",
  "payment_pending",
  "sold",
  "unsold",
  "withdrawn",
  "rejected",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const ORDER_STATUSES = [
  "pending_payment",
  "payment_partial",
  "payment_complete",
  "processing",
  "shipped",
  "in_transit",
  "customs_clearance",
  "cleared",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const BUYER_VISIBLE_VEHICLE_STATUSES = [
  "approved",
  "scheduled",
  "in_auction",
  "unsold",
  "sold",
] as const satisfies readonly VehicleStatus[];

export const ADMIN_VISIBLE_VEHICLE_STATUSES = VEHICLE_STATUSES;

export const LEGACY_VEHICLE_STATUSES = [
  "pending_inspection",
  "ready_for_auction",
] as const satisfies readonly VehicleStatus[];

export const TERMINAL_VEHICLE_STATUSES = [
  "cancelled",
  "withdrawn",
  "rejected",
  "delivered",
] as const satisfies readonly VehicleStatus[];

export const ALLOWED_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  draft: ["pending_approval", "withdrawn"],
  pending_inspection: ["pending_approval", "rejected", "withdrawn"],
  pending_approval: ["approved", "rejected", "withdrawn"],
  approved: ["pending_approval", "scheduled", "payment_pending", "withdrawn"],
  ready_for_auction: ["pending_approval", "scheduled", "in_auction", "withdrawn"],
  scheduled: ["pending_approval", "in_auction", "payment_pending", "withdrawn"],
  in_auction: ["payment_pending", "unsold", "withdrawn"],
  payment_pending: ["sold", "cancelled", "unsold", "approved", "scheduled"],
  sold: ["in_transit", "delivered", "cancelled"],
  unsold: ["pending_approval", "approved", "withdrawn", "payment_pending", "scheduled"],
  withdrawn: [],
  rejected: ["approved", "pending_approval", "withdrawn"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function isVehicleStatus(status: string): status is VehicleStatus {
  return (VEHICLE_STATUSES as readonly string[]).includes(status);
}

export function isBuyerVisibleVehicleStatus(status: VehicleStatus): boolean {
  return (BUYER_VISIBLE_VEHICLE_STATUSES as readonly VehicleStatus[]).includes(status);
}

export function isTerminalVehicleStatus(status: VehicleStatus): boolean {
  return (TERMINAL_VEHICLE_STATUSES as readonly VehicleStatus[]).includes(status);
}

export function canTransitionVehicleStatus(
  from: VehicleStatus,
  to: VehicleStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertVehicleStatusTransition(
  from: VehicleStatus,
  to: VehicleStatus
): void {
  if (canTransitionVehicleStatus(from, to)) return;

  throw new ConvexError(`Invalid vehicle status transition: ${from} -> ${to}`);
}

export function getVehicleStatusForOrderStatus(status: OrderStatus): VehicleStatus {
  switch (status) {
    case "pending_payment":
    case "payment_partial":
      return "payment_pending";
    case "payment_complete":
    case "processing":
      return "sold";
    case "shipped":
    case "in_transit":
    case "customs_clearance":
    case "cleared":
    case "out_for_delivery":
      return "in_transit";
    case "delivered":
      return "delivered";
    case "cancelled":
    case "refunded":
      return "cancelled";
  }
}

/** Kind of unpaid soft-hold being released (revoke or deadline forfeit). */
export type SoftHoldReleaseKind = "direct_bin" | "auction_bin" | "auction_win";

/**
 * After revoke/forfeit of an unpaid soft-hold, return vehicle to buyable inventory.
 * - direct_bin → approved (back on open market)
 * - auction_bin → scheduled (lot restored to pending; auction can still run)
 * - auction_win → unsold (sale failed after auction; lot marked no_sale)
 */
export function restoreStatusAfterSoftHoldRelease(
  kind: SoftHoldReleaseKind
): VehicleStatus {
  switch (kind) {
    case "direct_bin":
      return "approved";
    case "auction_bin":
      return "scheduled";
    case "auction_win":
      return "unsold";
  }
}

export function softHoldReleaseKindFromOrder(order: {
  orderType: string;
  auctionLotId?: unknown;
}): SoftHoldReleaseKind {
  if (!order.auctionLotId) return "direct_bin";
  if (order.orderType === "auction_win") return "auction_win";
  return "auction_bin";
}
