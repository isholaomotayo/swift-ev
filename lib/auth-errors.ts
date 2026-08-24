const VALID_VEHICLE_CONDITIONS = new Set([
  "new",
  "like_new",
  "excellent",
  "good",
  "fair",
  "salvage",
]);

/**
 * Clean a raw error string by stripping Convex protocol prefixes, request IDs,
 * server stack traces, and unhelpful server error banners.
 */
export function cleanConvexErrorMessage(rawMessage: string): string | null {
  if (!rawMessage || typeof rawMessage !== "string") return null;

  // Extract first line before stack trace
  let cleaned = rawMessage.split(/\r?\n/)[0]?.trim() || "";

  // Strip Convex function markers e.g. [CONVEX M(vehicles:createVehicle)]
  cleaned = cleaned.replace(/\[CONVEX(?:\s+[A-Za-z]\([^)]+\)|[^\]]*)\]/gi, "");

  // Strip Request ID markers e.g. [Request ID: b2dca90bb7a176f9]
  cleaned = cleaned.replace(/\[Request ID:?\s*[^\]]+\]/gi, "");

  // Strip standard Error / ConvexError prefixes
  cleaned = cleaned.replace(/^(?:Uncaught\s+)?(?:ConvexError|Error):\s*/i, "");

  // Strip 'Called by client' suffixes
  cleaned = cleaned.replace(/\s*\(?called by client\)?\s*$/i, "");

  cleaned = cleaned.trim();

  // If the error was a masked or generic Convex server error, return null to trigger fallback
  if (
    !cleaned ||
    /^server error$/i.test(cleaned) ||
    /^internal server error$/i.test(cleaned) ||
    /^server error called by client$/i.test(cleaned)
  ) {
    return null;
  }

  return cleaned;
}

/**
 * Safely extract a user-facing error message from Convex mutations/queries/actions.
 * Handles plain Error, ConvexError payloads, objects, and string throws.
 */
export function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) {
    const cleaned = cleanConvexErrorMessage(error);
    return cleaned || fallback;
  }

  if (error && typeof error === "object") {
    // 1. Check if ConvexError data payload contains a specific message (e.g. from actions/mutations)
    if ("data" in error && error.data !== null && error.data !== undefined) {
      if (typeof error.data === "string" && error.data.trim()) {
        const cleaned = cleanConvexErrorMessage(error.data);
        return cleaned || error.data.trim();
      }

      if (typeof error.data === "object") {
        const data = error.data as Record<string, unknown>;
        for (const key of ["message", "error", "reason", "details"]) {
          if (typeof data[key] === "string" && (data[key] as string).trim()) {
            const cleaned = cleanConvexErrorMessage(data[key] as string);
            if (cleaned) return cleaned;
          }
        }
      }
    }

    // 2. Check direct message property on error object
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      const cleaned = cleanConvexErrorMessage((error as { message: string }).message);
      if (cleaned) {
        return cleaned;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    const cleaned = cleanConvexErrorMessage(error.message);
    if (cleaned) {
      return cleaned;
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
