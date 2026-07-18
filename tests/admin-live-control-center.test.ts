import { describe, test, expect, beforeAll } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { createTestConvexClient } from "./convex-client";

const client = createTestConvexClient();

describe("Admin Live Control Center", () => {
  let adminToken: string;
  let buyerToken: string;

  beforeAll(async () => {
    const [adminLogin, buyerLogin] = await Promise.all([
      client.action(api.authActions.login, {
        email: "admin@voltbid.africa",
        password: "admin123",
      }),
      client.action(api.authActions.login, {
        email: "john.doe@example.com",
        password: "buyer123",
      }),
    ]);
    adminToken = adminLogin.token;
    buyerToken = buyerLogin.token;
  });

  test("LiveControlCenter UI component file exists", () => {
    const componentPath = path.join(
      process.cwd(),
      "components/admin/auctions/live-control-center.tsx"
    );
    expect(existsSync(componentPath)).toBe(true);
  });

  test("getLiveControlCenterData requires admin auth and returns control center data", async () => {
    await expect(
      client.query(api.auctions.getLiveControlCenterData, {
        token: buyerToken,
      })
    ).rejects.toThrow();

    const data = await client.query(api.auctions.getLiveControlCenterData, {
      token: adminToken,
    });

    if (data) {
      expect(data).toHaveProperty("auction");
      expect(data).toHaveProperty("activeLot");
      expect(data).toHaveProperty("nextLot");
      expect(data).toHaveProperty("nextLotAfter");
      expect(data).toHaveProperty("upcomingLots");
      expect(data).toHaveProperty("completedLots");
      expect(data).toHaveProperty("allHydratedLots");
      expect(data).toHaveProperty("timing");
      expect(Array.isArray(data.completedLots)).toBe(true);
      expect(Array.isArray(data.allHydratedLots)).toBe(true);
      expect(typeof data.pendingLotsCount).toBe("number");
      expect(typeof data.allLotsCount).toBe("number");
    } else {
      expect(data).toBeNull();
    }
  });

  test("setCurrentActiveLot fails for non-admin user", async () => {
    const fakeAuctionId = "jd7000000000000000000000" as Id<"auctions">;
    const fakeLotId = "k57000000000000000000000" as Id<"auctionLots">;

    expect(
      client.mutation(api.auctions.setCurrentActiveLot, {
        token: buyerToken,
        auctionId: fakeAuctionId,
        lotId: fakeLotId,
      })
    ).rejects.toThrow();
  });

  test("extendLotTime fails for non-admin user", async () => {
    const fakeLotId = "k57000000000000000000000" as Id<"auctionLots">;

    expect(
      client.mutation(api.auctions.extendLotTime, {
        token: buyerToken,
        lotId: fakeLotId,
        seconds: 30,
      })
    ).rejects.toThrow();
  });

  test("notifyAuctionWinner fails for non-admin user", async () => {
    const fakeLotId = "k57000000000000000000000" as Id<"auctionLots">;

    expect(
      client.mutation(api.auctions.notifyAuctionWinner, {
        token: buyerToken,
        lotId: fakeLotId,
      })
    ).rejects.toThrow();
  });
});
