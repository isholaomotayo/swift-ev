/**
 * Hard block: automated tests must never write to a live Convex deployment
 * (dev or production). Loaded via bunfig.toml preload for every test file.
 *
 * There is intentionally no env escape hatch. Function logic that needs writes
 * should use an in-memory harness (e.g. convex-test), not ConvexHttpClient.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { getFunctionName } from "convex/server";
import type { FunctionReference } from "convex/server";

/** Load .env / .env.local into process.env when bun did not already inject them. */
function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const WRITE_BLOCKED_MESSAGE =
  "[CONVEX WRITE BLOCKED] Tests cannot mutate Convex (dev or production). " +
  "Use convex-test / pure unit tests for write-path logic.";

function functionName(fn: unknown): string {
  if (typeof fn === "string") return fn;
  try {
    return getFunctionName(fn as FunctionReference<any, any, any>);
  } catch {
    return "unknown";
  }
}

function isLoginAction(name: string): boolean {
  return name === "authActions:login" || name === "login";
}

function blockWrite(kind: "mutation" | "action" | "fetch", detail: string): never {
  throw new Error(`${WRITE_BLOCKED_MESSAGE} Blocked ${kind}: ${detail}`);
}

ConvexHttpClient.prototype.mutation = async function (mutationFn: unknown) {
  return blockWrite("mutation", functionName(mutationFn));
};

const originalAction = ConvexHttpClient.prototype.action;
ConvexHttpClient.prototype.action = async function (
  this: ConvexHttpClient,
  actionFn: unknown,
  args?: unknown
) {
  const name = functionName(actionFn);
  if (!isLoginAction(name)) {
    return blockWrite("action", name);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (originalAction as any).call(this, actionFn, args);
};

const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (/\.convex\.(cloud|site)(\/|$)/.test(url)) {
    const lower = url.toLowerCase();
    if (lower.includes("/api/mutation")) {
      return blockWrite("fetch", url);
    }
    if (lower.includes("/api/action")) {
      const body = typeof init?.body === "string" ? init.body : "";
      const looksLikeLogin =
        body.includes("authActions:login") ||
        (body.includes("authActions") && body.includes('"login"'));
      if (!looksLikeLogin) {
        return blockWrite("fetch", url);
      }
    }
  }

  return originalFetch(input, init);
}) as typeof fetch;
