import { ConvexHttpClient } from "convex/browser";

/**
 * Read-only Convex HTTP client for smoke/query tests.
 * Writes are blocked globally by setup-test-guard (bun preload).
 */
export function createTestConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is required for Convex query smoke tests. " +
        "Do not hardcode a deployment URL in tests."
    );
  }
  if (!url.includes(".convex.cloud") && !url.includes(".convex.site")) {
    throw new Error(`Refusing unexpected Convex URL shape: ${url}`);
  }
  return new ConvexHttpClient(url);
}
