import { cache } from "react";
import { ConvexHttpClient } from "convex/browser";

/**
 * Returns a per-request singleton ConvexHttpClient.
 *
 * React's `cache()` memoises the result for the lifetime of a single
 * server request — meaning every server component that calls this function
 * within one render pass shares the same client instance instead of each
 * creating a new one. The cache is automatically invalidated between requests.
 *
 * Usage in server components:
 *   import { getConvexClient } from "@/lib/convex-server";
 *   const convex = getConvexClient();
 *   const data = await convex.query(api.foo.bar, {});
 */
export const getConvexClient = cache(
  () => new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
);
