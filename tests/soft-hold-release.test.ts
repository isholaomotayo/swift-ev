import { describe, expect, test } from "bun:test";
import {
  restoreStatusAfterSoftHoldRelease,
  softHoldReleaseKindFromOrder,
} from "../convex/lib/vehicleLifecycle";

describe("soft-hold release policy", () => {
  test("admin revoke restores inventory correctly by order kind", () => {
    expect(restoreStatusAfterSoftHoldRelease("direct_bin")).toBe("approved");
    expect(restoreStatusAfterSoftHoldRelease("auction_bin")).toBe("scheduled");
    expect(restoreStatusAfterSoftHoldRelease("auction_win")).toBe("unsold");
  });

  test("classifies order kinds for release", () => {
    expect(softHoldReleaseKindFromOrder({ orderType: "buy_it_now" })).toBe(
      "direct_bin"
    );
    expect(
      softHoldReleaseKindFromOrder({
        orderType: "buy_it_now",
        auctionLotId: "x",
      })
    ).toBe("auction_bin");
    expect(
      softHoldReleaseKindFromOrder({
        orderType: "auction_win",
        auctionLotId: "x",
      })
    ).toBe("auction_win");
  });
});
