/**
 * Safe internal redirect paths only (open-redirect protection).
 */
export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback = "/"
): string {
  if (!raw) return fallback;
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://")) {
    return fallback;
  }
  return decoded;
}

/** Role home when no explicit redirect is provided after login. */
export function getRoleHomePath(role?: string | null): string {
  if (role === "admin" || role === "superadmin") return "/admin";
  if (role === "seller") return "/vendor";
  return "/";
}
