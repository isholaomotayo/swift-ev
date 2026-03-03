/**
 * Safely extract a user-facing error message from auth-related errors.
 * ConvexError carries only the data payload to the client (no stack traces).
 * Uses duck-typing to avoid importing convex/values in client bundles (which can
 * cause module-not-found on Vercel builds).
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
  }
  return fallback;
}
