import { NextRequest, NextResponse } from "next/server";

/**
 * Resend webhook handler — redirects to the Convex HTTP endpoint.
 *
 * The primary webhook handler lives in convex/http.ts with proper Svix
 * signature verification. This route exists as a fallback in case the
 * webhook is configured to hit autoexports.live instead of the Convex site URL.
 *
 * Preferred webhook URL: https://greedy-rhinoceros-131.convex.site/webhooks/resend
 */
export async function POST(request: NextRequest) {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!convexSiteUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_SITE_URL not configured" },
      { status: 500 }
    );
  }

  // Forward the request to the Convex HTTP endpoint
  const body = await request.text();
  const targetUrl = `${convexSiteUrl}/webhooks/resend`;

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward Svix headers for signature verification
        ...(request.headers.get("svix-id") && {
          "svix-id": request.headers.get("svix-id")!,
        }),
        ...(request.headers.get("svix-timestamp") && {
          "svix-timestamp": request.headers.get("svix-timestamp")!,
        }),
        ...(request.headers.get("svix-signature") && {
          "svix-signature": request.headers.get("svix-signature")!,
        }),
      },
      body,
    });

    const responseBody = await res.text();
    return new NextResponse(responseBody, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to forward webhook to Convex:", error);
    return NextResponse.json(
      { error: "Webhook forwarding failed" },
      { status: 502 }
    );
  }
}
