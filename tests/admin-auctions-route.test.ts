import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";

describe("Admin auction routes", () => {
  test("has a manage page for individual auctions", () => {
    const manageAuctionPagePath = path.join(
      process.cwd(),
      "app/admin/auctions/[id]/page.tsx"
    );

    expect(existsSync(manageAuctionPagePath)).toBe(true);
  });
});
