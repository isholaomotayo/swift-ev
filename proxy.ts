import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { paraglideMiddleware } from "@/src/paraglide/server.js";

export function proxy(request: NextRequest) {
  // Use Paraglide middleware to handle locale detection
  // Since we're using cookie-based routing (no URL prefixes),
  // Paraglide will detect locale from cookie or browser preferences
  return paraglideMiddleware(request, ({ locale, request: paraglideRequest }) => {
    const { pathname } = new URL(request.url);

    // Get token from cookie
    const token = request.cookies.get("autoexports_token")?.value;

    // Protected paths
    const isProtectedPath =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/watchlist") ||
      pathname.startsWith("/my-bids") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/profile");

    // Admin paths
    const isAdminPath = pathname.startsWith("/admin");

    // Vendor paths
    const isVendorPath = pathname.startsWith("/vendor");

    // Helper to add locale header to any response
    const addLocaleHeader = (response: NextResponse) => {
      response.headers.set("x-paraglide-locale", locale);
      return response;
    };

    // If accessing protected route without token, redirect to login
    if (isProtectedPath && !token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addLocaleHeader(NextResponse.redirect(loginUrl));
    }

    // If accessing admin/vendor routes without token, redirect to login
    if ((isAdminPath || isVendorPath) && !token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addLocaleHeader(NextResponse.redirect(loginUrl));
    }

    // NOTE: Full role verification (admin/vendor) is implemented in Server Component layouts
    // because proxy runs on the edge and cannot easily query Convex database.
    // The layouts (app/admin/layout.tsx, app/vendor/layout.tsx, app/(protected)/layout.tsx)
    // perform server-side role verification using ConvexHttpClient to query the database.
    // This ensures security by verifying user roles before rendering any protected content.
    // This proxy only checks for token presence as a first line of defense.

    // If accessing login/register with a token:
    // If server layout flagged auth failure (e.g. ?auth_failed=1), do not auto-redirect; let the login form render.
    // Otherwise, redirect to intended target or /dashboard.
    if ((pathname === "/login" || pathname === "/register") && token) {
      const searchParams = new URL(request.url).searchParams;
      const authFailed = searchParams.has("auth_failed");

      if (!authFailed) {
        const redirectTo = searchParams.get("redirect") ?? "/dashboard";
        return addLocaleHeader(NextResponse.redirect(new URL(redirectTo, request.url)));
      }
    }

    // Allow all other requests with locale header
    return addLocaleHeader(NextResponse.next());
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
