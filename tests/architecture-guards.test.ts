import { describe, test, expect } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONVEX_DIR = join(ROOT_DIR, "convex");

function convexSources(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  for (const dir of ["", "lib"]) {
    for (const name of readdirSync(join(CONVEX_DIR, dir))) {
      if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
        const file = join(dir, name);
        out.push({ file, text: readFileSync(join(CONVEX_DIR, file), "utf8") });
      }
    }
  }
  return out;
}

describe("Architecture guards", () => {
  test("only the ledger changes wallet balances", () => {
    const offenders: string[] = [];
    for (const { file, text } of convexSources()) {
      if (file === "lib/ledger.ts" || file === "seedData.ts" || file === "clearData.ts") continue;
      for (const m of text.matchAll(/ctx\.db\.patch\(/g)) {
        const window = text.slice(m.index!, m.index! + 600);
        const body = window.slice(0, window.indexOf("});") + 3 || 600);
        if (/\b(walletBalance|reservedBalance|pendingBalance)\s*:/.test(body)) {
          offenders.push(`${file}: ${body.split("\n")[0].trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("every session-token lookup checks expiry (except logout)", () => {
    const offenders: string[] = [];
    for (const { file, text } of convexSources()) {
      for (const m of text.matchAll(/\.query\("sessions"\)\s*\.withIndex\("by_token"/g)) {
        const window = text.slice(m.index!, m.index! + 500);
        const isLogout = file === "auth.ts" && text.slice(Math.max(0, m.index! - 300), m.index!).includes("export const logout");
        if (!isLogout && !window.includes("expiresAt")) {
          offenders.push(`${file}@${m.index}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("destructive seed/clear functions are not public", () => {
    const clear = readFileSync(join(CONVEX_DIR, "clearData.ts"), "utf8");
    expect(clear).toContain("internalMutation");
    expect(/=\s*mutation\(/.test(clear)).toBe(false);
    const seed = readFileSync(join(CONVEX_DIR, "seedData.ts"), "utf8");
    expect(seed.match(/requireSeedSecret\(args\.secret\)/g)?.length).toBe(3);
  });

  test("admin-or-superadmin checks use the shared isAdmin helper", () => {
    const offenders: string[] = [];
    for (const { file, text } of convexSources()) {
      if (file === "lib/auth.ts") continue;
      text.split("\n").forEach((line, i) => {
        // Aggregate counting on other users (u.role) is fine; permission checks must use isAdmin().
        if (/\b(?!u\b)\w+\.role (===|!==) "admin"/.test(line) && !/\bu\.role/.test(line)) {
          offenders.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  test("service fee tiers live only in the shared pricing module", () => {
    const utils = readFileSync(join(ROOT_DIR, "lib", "utils.ts"), "utf8");
    expect(utils).toContain('export { calculateServiceFee } from "./buy-now-pricing"');

    const backendOrders = readFileSync(join(CONVEX_DIR, "lib", "orders.ts"), "utf8");
    expect(backendOrders).toContain(
      'export { calculateServiceFee } from "../../lib/buy-now-pricing"'
    );

    const pricing = readFileSync(join(ROOT_DIR, "lib", "buy-now-pricing.ts"), "utf8");
    expect(/vehiclePriceNaira \* 0\.0[567]/.test(pricing)).toBe(true);
    expect(/bidAmount \* 0\.0[567]/.test(utils)).toBe(false);
    expect(/bidAmount \* 0\.0[567]/.test(backendOrders)).toBe(false);
  });

  test("the buyer protected layout does not eject admins", () => {
    const layout = readFileSync(
      join(ROOT_DIR, "components", "layout", "protected-layout-client.tsx"),
      "utf8"
    );
    expect(layout).not.toContain('router.push("/admin")');
    expect(layout).not.toContain('user.role === "admin"');
  });

  test("section layouts re-declare the shared title template", () => {
    // Next only inherits the root title template through the last two metadata
    // items; a section layout that sets a plain string title drops it for
    // nested pages, so each section must declare the template itself.
    const offenders: string[] = [];
    for (const file of [
      join("app", "(protected)", "layout.tsx"),
      join("app", "admin", "layout.tsx"),
      join("app", "vendor", "layout.tsx"),
      join("app", "vehicles", "layout.tsx"),
    ]) {
      const text = readFileSync(join(ROOT_DIR, file), "utf8");
      const titleBlock = text.match(/title:\s*\{[\s\S]*?\n\s*\}/);
      if (!titleBlock || !titleBlock[0].includes("template:")) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("vehicle status filters offer every status", () => {
    const schema = readFileSync(join(CONVEX_DIR, "schema.ts"), "utf8");
    const tableIndex = schema.indexOf("vehicles: defineTable(");
    const union = schema
      .slice(schema.indexOf("status: v.union(", tableIndex))
      .match(/status: v\.union\(([\s\S]*?)\n {4}\),/)![1];
    const statuses = [...union.matchAll(/v\.literal\("([^"]+)"\)/g)].map((m) => m[1]);

    for (const file of [
      join("components", "vendor", "vendor-vehicles-client.tsx"),
      join("components", "admin", "admin-vehicles-client.tsx"),
    ]) {
      const text = readFileSync(join(ROOT_DIR, file), "utf8");
      const offered = new Set(
        [...text.matchAll(/<SelectItem value="([^"]+)"/g)].map((m) => m[1])
      );
      const missing = statuses.filter((status) => !offered.has(status));
      expect({ file, missing }).toEqual({ file, missing: [] });
    }
  });

  test("buyer order status filter offers every order status", () => {
    const orders = readFileSync(join(CONVEX_DIR, "orders.ts"), "utf8");
    const start = orders.indexOf("const orderStatusValidator = v.union(");
    const block = orders.slice(start, orders.indexOf(");", start));
    const statuses = [...block.matchAll(/v\.literal\("([^"]+)"\)/g)].map((m) => m[1]);

    const text = readFileSync(
      join(ROOT_DIR, "components", "orders", "orders-list-client.tsx"),
      "utf8"
    );
    const offered = new Set(
      [...text.matchAll(/<SelectItem value="([^"]+)"/g)].map((m) => m[1])
    );
    expect(statuses.filter((status) => !offered.has(status))).toEqual([]);
  });

  test("dynamic pages resolve Next 16 async params", () => {
    // params is a Promise in Next 15+; reading it synchronously yields
    // undefined and makes every detail page look missing.
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name === "page.tsx" && /\[[^\]]+\]/.test(full)) {
          const text = readFileSync(full, "utf8");
          const usesAsyncParams = text.includes('"use client"')
            ? /use\(\s*params\s*\)/.test(text) || text.includes("useParams(")
            : /await\s+params/.test(text);
          if (!usesAsyncParams) {
            offenders.push(full.slice(ROOT_DIR.length + 1));
          }
        }
      }
    };
    walk(join(ROOT_DIR, "app"));
    expect(offenders).toEqual([]);
  });

  test("brand suffix is not hardcoded into page titles", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const text = readFileSync(full, "utf8");
          if (text.includes("| autoexports.live")) {
            offenders.push(full.slice(ROOT_DIR.length + 1));
          }
        }
      }
    };
    walk(join(ROOT_DIR, "app"));
    expect(offenders).toEqual([]);
  });

  test("lot numbers are never rendered raw in buyer-facing cards", () => {
    const offenders: string[] = [];
    for (const file of [
      join("components", "orders", "order-detail-client.tsx"),
      join("components", "orders", "orders-list-client.tsx"),
      join("components", "autoexports", "vehicle-card.tsx"),
      join("components", "vendor", "vendor-vehicles-client.tsx"),
    ]) {
      const text = readFileSync(join(ROOT_DIR, file), "utf8");
      text.split("\n").forEach((line, i) => {
        for (const match of line.matchAll(/\{[^}]*\blotNumber\b[^}]*\}/g)) {
          // Template-literal interpolation in search haystacks is not a rendered label.
          if (match.index! > 0 && line[match.index! - 1] === "$") continue;
          if (!match[0].includes("formatLotNumber")) {
            offenders.push(`${file}:${i + 1} ${match[0].trim()}`);
          }
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
