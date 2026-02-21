import { NextRequest, NextResponse } from "next/server";

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTH_COOKIE = "autoexports_token";
const PARAGLIDE_COOKIE = "PARAGLIDE_LOCALE";
const SUPPORTED_LOCALES = ["en", "fr", "zh-CN", "ha", "yo", "ig"] as const;
const BASE_LOCALE = "en";

type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Routes requiring a valid session cookie. The actual DB-level session
 * validation still happens in the respective server layouts — this edge
 * check is a fast, cheap first gate that avoids rendering the entire
 * server component tree for unauthenticated requests.
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/my-bids",
  "/watchlist",
  "/admin",
  "/vendor",
];

/**
 * Routes that logged-in users should be bounced away from.
 */
const AUTH_ONLY_PATHS = ["/login", "/register"];

// ─── Locale Detection ─────────────────────────────────────────────────────────

function detectLocale(request: NextRequest): Locale {
  // 1. Respect a Paraglide locale cookie the user has already set
  const cookieLocale = request.cookies.get(PARAGLIDE_COOKIE)?.value;
  if (cookieLocale && (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  // 2. Parse the Accept-Language header (quality-sorted)
  const acceptLang = request.headers.get("Accept-Language");
  if (acceptLang) {
    const ranked = acceptLang
      .split(",")
      .map((entry) => {
        const [rawLocale, rawQ] = entry.trim().split(";");
        const q = rawQ ? parseFloat(rawQ.replace("q=", "")) : 1;
        return { locale: rawLocale.trim(), q };
      })
      .sort((a, b) => b.q - a.q);

    for (const { locale } of ranked) {
      // Exact match (e.g. "fr", "zh-CN")
      if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
        return locale as Locale;
      }
      // Language-prefix match (e.g. "fr-FR" → "fr")
      const prefix = locale.split("-")[0];
      const found = SUPPORTED_LOCALES.find((l) => l === prefix || l.startsWith(prefix + "-"));
      if (found) return found;
    }
  }

  return BASE_LOCALE;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  // ── 1. Gate: protected routes — cookie must be present ─────────────────────
  // Only the existence of the cookie is checked here (O(1) at the edge).
  // DB session validity is verified by the server layout on the other side.
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 2. Gate: auth-only pages — redirect authenticated users away ────────────
  const isAuthPage = AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isAuthPage && token) {
    // Send back to their intended dashboard rather than always hitting "/"
    const redirectTo = request.nextUrl.searchParams.get("redirect") ?? "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // ── 3. i18n: detect locale and forward it as a request header ──────────────
  // The root layout reads this header via:
  //   const locale = headerList.get("x-paraglide-locale") ?? baseLocale;
  const locale = detectLocale(request);
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        "x-paraglide-locale": locale,
      }),
    },
  });

  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *  • _next/static  — static assets
     *  • _next/image   — Next.js image optimisation
     *  • favicon.ico, robots.txt, sitemap.xml — public files
     *  • /api/         — API route handlers manage their own auth
     *  • /images/      — public image folder
     *
     * The negative lookahead keeps the pattern readable and future-proof.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/|images/).*)",
  ],
};
