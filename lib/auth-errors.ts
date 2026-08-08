const VALID_VEHICLE_CONDITIONS = new Set([
  "new",
  "like_new",
  "excellent",
  "good",
  "fair",
  "salvage",
]);

/**
 * Safely extract a user-facing error message from Convex mutations/queries/actions.
 * Handles plain Error, ConvexError payloads, and string throws.
 */
export function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    // 1. Check if ConvexError data payload contains a specific message (e.g. from actions/mutations)
    if ("data" in error && error.data !== null && typeof error.data === "object") {
      const data = error.data as Record<string, unknown>;
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
      }
    }

    // 2. Check if a string data field is present
    if ("data" in error && typeof (error as { data: unknown }).data === "string") {
      const dataStr = (error as { data: string }).data.trim();
      if (dataStr) return dataStr;
    }

    // 3. Check direct message property on error object
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      const message = (error as { message: string }).message.trim();
      if (message && !message.includes("Server Error")) {
        return message.replace(/^\[CONVEX [^\]]+\]\s*/, "").trim() || fallback;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (!msg.includes("Server Error")) {
      return msg.replace(/^\[CONVEX [^\]]+\]\s*/, "").trim() || fallback;
    }
  }

  return fallback;
}

/** @deprecated Use getMutationErrorMessage — kept for auth call sites */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return getMutationErrorMessage(error, fallback);
}

export function isValidVehicleCondition(
  condition: string | undefined
): condition is "new" | "like_new" | "excellent" | "good" | "fair" | "salvage" {
  return !!condition && VALID_VEHICLE_CONDITIONS.has(condition);
}
