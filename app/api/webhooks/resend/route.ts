import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Resend webhook handler for inbound emails and delivery status updates.
 *
 * Configure in Resend dashboard:
 *   Webhook URL: https://autoexports.live/api/webhooks/resend
 *   Events: email.received, email.delivered, email.bounced, email.complained
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook secret if configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("svix-signature");
      if (!signature) {
        return NextResponse.json(
          { error: "Missing webhook signature" },
          { status: 401 }
        );
      }
    }

    const eventType = body.type;

    switch (eventType) {
      // Inbound email received
      case "email.received": {
        const data = body.data;
        const from = data.from;
        const to = Array.isArray(data.to) ? data.to : [data.to];
        const subject = data.subject || "(no subject)";
        const html = data.html || "";
        const text = data.text || "";

        // Generate threadId from normalized subject
        const normalizedSubject = subject
          .replace(/^(Re|Fwd|Fw):\s*/gi, "")
          .trim()
          .toLowerCase();
        const threadId = normalizedSubject || undefined;

        await convex.mutation(api.adminMail.webhookStoreInbound, {
          webhookSecret: webhookSecret || "",
          from,
          fromName: data.from_name || undefined,
          to,
          cc: data.cc || undefined,
          subject,
          bodyHtml: html,
          bodyText: text,
          threadId,
        });

        break;
      }

      // Delivery status events
      case "email.delivered":
      case "email.bounced":
      case "email.complained": {
        const data = body.data;
        const resendEmailId = data.email_id;

        if (resendEmailId) {
          const statusMap: Record<
            string,
            "delivered" | "bounced" | "complained"
          > = {
            "email.delivered": "delivered",
            "email.bounced": "bounced",
            "email.complained": "complained",
          };

          await convex.mutation(api.adminMail.webhookUpdateStatus, {
            webhookSecret: webhookSecret || "",
            resendEmailId,
            status: statusMap[eventType],
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
