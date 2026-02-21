import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "autoexports_token";

// Shared cookie options
function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // Only enforce Secure in production (avoids breaking localhost HTTP)
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/**
 * GET — Read the session token server-side and return it to the client.
 * This allows the AuthProvider to hydrate its in-memory token state on
 * page refresh without needing to read the HttpOnly cookie via JS.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value ?? null;
  return NextResponse.json({ token });
}

/**
 * POST — Set the HttpOnly session cookie after a successful login/register.
 * The client sends the token received from the Convex action.
 */
export async function POST(request: NextRequest) {
  let token: string | undefined;

  try {
    const body = await request.json();
    token = body?.token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, token, cookieOptions(30 * 24 * 60 * 60)); // 30 days
  return response;
}

/**
 * DELETE — Clear the session cookie on logout.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", cookieOptions(0));
  return response;
}
