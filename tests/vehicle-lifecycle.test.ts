import { describe, expect, test } from "bun:test";

import {
  assertVehicleStatusTransition,
  canTransitionVehicleStatus,
  getVehicleStatusForOrderStatus,
  isBuyerVisibleVehicleStatus,
  restoreStatusAfterSoftHoldRelease,
  softHoldReleaseKindFromOrder,
} from "../convex/lib/vehicleLifecycle";

describe("vehicle lifecycle", () => {
  test("allows the canonical approval and auction flow", () => {
    expect(canTransitionVehicleStatus("draft", "pending_approval")).toBe(true);
    expect(canTransitionVehicleStatus("pending_approval", "approved")).toBe(true);
    expect(canTransitionVehicleStatus("approved", "scheduled")).toBe(true);
    expect(canTransitionVehicleStatus("scheduled", "in_auction")).toBe(true);
    expect(canTransitionVehicleStatus("in_auction", "payment_pending")).toBe(true);
    expect(canTransitionVehicleStatus("payment_pending", "sold")).toBe(true);
    expect(canTransitionVehicleStatus("sold", "in_transit")).toBe(true);
    expect(canTransitionVehicleStatus("in_transit", "delivered")).toBe(true);
  });

  test("allows buy now holds before direct or scheduled auction sale", () => {
    expect(canTransitionVehicleStatus("approved", "payment_pending")).toBe(true);
    expect(canTransitionVehicleStatus("scheduled", "payment_pending")).toBe(true);
  });

  test("blocks direct status jumps that bypass payment or logistics", () => {
    expect(canTransitionVehicleStatus("pending_approval", "sold")).toBe(false);
    expect(canTransitionVehicleStatus("approved", "sold")).toBe(false);
    expect(canTransitionVehicleStatus("scheduled", "sold")).toBe(false);
    expect(canTransitionVehicleStatus("unsold", "in_auction")).toBe(false);

    expect(() =>
      assertVehicleStatusTransition("pending_approval", "sold")
    ).toThrow("Invalid vehicle status transition");
  });

  test("supports re-listing unsold vehicles through scheduled before auction", () => {
    expect(canTransitionVehicleStatus("unsold", "scheduled")).toBe(true);
    expect(canTransitionVehicleStatus("scheduled", "in_auction")).toBe(true);
    expect(canTransitionVehicleStatus("approved", "scheduled")).toBe(true);
  });

  test("supports explicit review, unsold, and terminal branches", () => {
    expect(canTransitionVehicleStatus("pending_approval", "rejected")).toBe(true);
    expect(canTransitionVehicleStatus("approved", "withdrawn")).toBe(true);
    expect(canTransitionVehicleStatus("scheduled", "withdrawn")).toBe(true);
    expect(canTransitionVehicleStatus("in_auction", "unsold")).toBe(true);
    expect(canTransitionVehicleStatus("unsold", "approved")).toBe(true);
    expect(canTransitionVehicleStatus("payment_pending", "cancelled")).toBe(true);

    expect(canTransitionVehicleStatus("delivered", "approved")).toBe(false);
    expect(canTransitionVehicleStatus("cancelled", "approved")).toBe(false);
    expect(canTransitionVehicleStatus("withdrawn", "approved")).toBe(false);
    expect(canTransitionVehicleStatus("rejected", "approved")).toBe(true);
    expect(canTransitionVehicleStatus("rejected", "pending_approval")).toBe(true);
  });

  test("maps order statuses back to vehicle statuses", () => {
    expect(getVehicleStatusForOrderStatus("pending_payment")).toBe("payment_pending");
    expect(getVehicleStatusForOrderStatus("payment_partial")).toBe("payment_pending");
    expect(getVehicleStatusForOrderStatus("payment_complete")).toBe("sold");
    expect(getVehicleStatusForOrderStatus("processing")).toBe("sold");
    expect(getVehicleStatusForOrderStatus("shipped")).toBe("in_transit");
    expect(getVehicleStatusForOrderStatus("customs_clearance")).toBe("in_transit");
    expect(getVehicleStatusForOrderStatus("cleared")).toBe("in_transit");
    expect(getVehicleStatusForOrderStatus("out_for_delivery")).toBe("in_transit");
    expect(getVehicleStatusForOrderStatus("delivered")).toBe("delivered");
    expect(getVehicleStatusForOrderStatus("cancelled")).toBe("cancelled");
    expect(getVehicleStatusForOrderStatus("refunded")).toBe("cancelled");
  });

  test("keeps soft-held payment_pending vehicles out of public inventory", () => {
    expect(isBuyerVisibleVehicleStatus("approved")).toBe(true);
    expect(isBuyerVisibleVehicleStatus("scheduled")).toBe(true);
    expect(isBuyerVisibleVehicleStatus("in_auction")).toBe(true);
    expect(isBuyerVisibleVehicleStatus("sold")).toBe(true);
    expect(isBuyerVisibleVehicleStatus("unsold")).toBe(true);

    expect(isBuyerVisibleVehicleStatus("payment_pending")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("pending_approval")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("rejected")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("withdrawn")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("cancelled")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("in_transit")).toBe(false);
    expect(isBuyerVisibleVehicleStatus("delivered")).toBe(false);
  });

  test("allows releasing a soft-hold back to inventory", () => {
    expect(canTransitionVehicleStatus("payment_pending", "approved")).toBe(true);
    expect(canTransitionVehicleStatus("payment_pending", "unsold")).toBe(true);
    expect(canTransitionVehicleStatus("payment_pending", "scheduled")).toBe(true);
  });

  test("revoke/forfeit restores the correct inventory status by soft-hold kind", () => {
    expect(restoreStatusAfterSoftHoldRelease("direct_bin")).toBe("approved");
    expect(restoreStatusAfterSoftHoldRelease("auction_bin")).toBe("scheduled");
    expect(restoreStatusAfterSoftHoldRelease("auction_win")).toBe("unsold");
    expect(softHoldReleaseKindFromOrder({ orderType: "buy_it_now" })).toBe("direct_bin");
    expect(
      softHoldReleaseKindFromOrder({ orderType: "buy_it_now", auctionLotId: "lot" })
    ).toBe("auction_bin");
    expect(
      softHoldReleaseKindFromOrder({ orderType: "auction_win", auctionLotId: "lot" })
    ).toBe("auction_win");
  });
});
