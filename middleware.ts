import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get("voltbid_token")?.value;

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/vehicles",
    "/auctions",
    "/how-it-works",
    "/pricing",
    "/login",
    "/register",
    "/api",
  ];

  // Check if path is public
  const isPublicPath =
    publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) ||
    pathname.startsWith("/vehicles/") ||
    pathname.startsWith("/auctions/");

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

  // If accessing protected route without token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing admin/vendor routes without token, redirect to login
  if ((isAdminPath || isVendorPath) && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // NOTE: Full role verification (admin/vendor) is implemented in Server Component layouts
  // because middleware runs on the edge and cannot easily query Convex database.
  // The layouts (app/admin/layout.tsx, app/vendor/layout.tsx, app/(protected)/layout.tsx)
  // perform server-side role verification using ConvexHttpClient to query the database.
  // This ensures security by verifying user roles before rendering any protected content.
  // This middleware only checks for token presence as a first line of defense.

  // If accessing login/register with valid token, redirect to dashboard
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow all other requests
  return NextResponse.next();
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

