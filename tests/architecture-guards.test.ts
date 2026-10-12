import { describe, test, expect } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const CONVEX_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "convex");

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
});
