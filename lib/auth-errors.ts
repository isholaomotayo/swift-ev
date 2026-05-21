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

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      const message = (error as { message: string }).message.trim();
      if (message) return message;
    }

    if ("data" in error) {
      const data = (error as { data: unknown }).data;
      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
      ) {
        const message = (data as { message: string }).message.trim();
        if (message) return message;
      }
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
