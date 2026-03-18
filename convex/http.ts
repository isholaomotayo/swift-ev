import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Resend webhook endpoint.
 *
 * URL: https://<CONVEX_SITE_URL>/webhooks/resend
 * Configure this URL in the Resend dashboard as your webhook endpoint.
 *
 * Events handled:
 *   - email.received  → stores inbound email in adminEmails table
 *   - email.delivered  → updates delivery status
 *   - email.bounced    → updates delivery status
 *   - email.complained → updates delivery status
 */
http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const eventType = body.type;

      switch (eventType) {
        case "email.received": {
          const data = body.data;
          const from = data.from;
          const to = Array.isArray(data.to) ? data.to : [data.to];
          const subject = data.subject || "(no subject)";
          const resendEmailId = data.email_id;

          // Generate threadId from normalized subject
          const normalizedSubject = subject
            .replace(/^(Re|Fwd|Fw):\s*/gi, "")
            .trim()
            .toLowerCase();
          const threadId = normalizedSubject || undefined;

          // 1) Store metadata immediately so it's never lost
          const emailId = await ctx.runMutation(internal.adminMail.storeInboundEmail, {
            from,
            fromName: data.from_name || undefined,
            to,
            cc: data.cc || undefined,
            subject,
            bodyHtml: "",
            bodyText: "",
            threadId,
            resendEmailId: resendEmailId || undefined,
          });

          // 2) Fetch body from Resend API and backfill the record
          if (resendEmailId) {
            await ctx.runAction(internal.adminMail.fetchAndBackfillEmailBody, {
              emailId,
              resendEmailId,
            });
          }
          break;
        }

        case "email.delivered":
        case "email.bounced":
        case "email.complained": {
          const data = body.data;
          const resendEmailId = data.email_id;

          if (resendEmailId) {
            const statusMap: Record<string, "delivered" | "bounced" | "complained"> = {
              "email.delivered": "delivered",
              "email.bounced": "bounced",
              "email.complained": "complained",
            };

            await ctx.runMutation(internal.adminMail.updateDeliveryStatus, {
              resendEmailId,
              status: statusMap[eventType],
            });
          }
          break;
        }

        default:
          // Unknown event type — ignore
          break;
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Resend webhook error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
