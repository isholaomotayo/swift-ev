/**
 * Hostnames allowed for next/image optimization (keep in sync with next.config.ts images.remotePatterns).
 */
const OPTIMIZED_HOST_PATTERNS = [
  /^images\.unsplash\.com$/,
  /\.convex\.cloud$/,
  /\.convex\.site$/,
];

/**
 * Returns true when src can be passed to next/image without an unconfigured-host error.
 */
export const isNextImageOptimizable = (src: string): boolean => {
  if (!src) return false;

  // Local public assets
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  // Blob previews from file uploads
  if (src.startsWith("blob:")) return false;

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "https://localhost";
    const { hostname } = new URL(src, base);

    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    return OPTIMIZED_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
};
