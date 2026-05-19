import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

/**
 * Resend webhook endpoint.
 *
 * URL: https://<CONVEX_SITE_URL>/webhooks/resend
 * Configure this URL in the Resend dashboard as your webhook endpoint.
 *
 * Events handled:
 *   - email.received  → stores inbound email, fetches body from Resend API
 *   - email.delivered  → updates delivery status
 *   - email.bounced    → updates delivery status + adds to suppression list
 *   - email.complained → updates delivery status + adds to suppression list
 */
http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const rawBody = await request.text();

      // Verify Svix webhook signature
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
      if (webhookSecret) {
        const svixId = request.headers.get("svix-id");
        const svixTimestamp = request.headers.get("svix-timestamp");
        const svixSignature = request.headers.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
          return new Response(
            JSON.stringify({ error: "Missing webhook signature headers" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          const wh = new Webhook(webhookSecret);
          wh.verify(rawBody, {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
          });
        } catch {
          console.error("Webhook signature verification failed");
          return new Response(
            JSON.stringify({ error: "Invalid webhook signature" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      const body = JSON.parse(rawBody);
      const eventType = body.type;

      switch (eventType) {
        case "email.received": {
          const data = body.data;
          const from = data.from;
          const to = Array.isArray(data.to) ? data.to : [data.to];
          const subject = data.subject || "(no subject)";
          const resendEmailId = data.email_id;
          const messageId = data.message_id || undefined;
          const cc = Array.isArray(data.cc) && data.cc.length > 0 ? data.cc : undefined;
          const attachmentsMeta = Array.isArray(data.attachments) ? data.attachments : [];

          // Generate threadId from normalized subject
          const normalizedSubject = subject
            .replace(/^(Re|Fwd|Fw):\s*/gi, "")
            .trim()
            .toLowerCase();
          const threadId = normalizedSubject || undefined;

          // Build attachments metadata array
          const attachments = attachmentsMeta.map((a: any) => ({
            id: a.id || "",
            filename: a.filename || "unknown",
            contentType: a.content_type || "application/octet-stream",
          }));

          // Map the inbound email to an in-app account (if the recipient matches).
          const mailMapping = await ctx.runQuery(internal.mailRouting.resolveMailAccount, { to });

          // 1) Store metadata immediately so it's never lost
          const emailId = await ctx.runMutation(internal.adminMail.storeInboundEmail, {
            from,
            fromName: data.from_name || undefined,
            to,
            cc,
            subject,
            bodyHtml: "",
            bodyText: "",
            threadId,
            mailAccountUserId: mailMapping?.mailAccountUserId,
            mailAccountEmail: mailMapping?.mailAccountEmail,
            resendEmailId: resendEmailId || undefined,
            messageId,
            attachments: attachments.length > 0 ? attachments : undefined,
            hasAttachments: attachments.length > 0,
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

        case "email.delivered": {
          const data = body.data;
          const resendEmailId = data.email_id || data.id;
          if (resendEmailId) {
            await ctx.runMutation(internal.adminMail.updateDeliveryStatus, {
              resendEmailId,
              status: "delivered",
            });
          }
          break;
        }

        case "email.bounced": {
          const data = body.data;
          const resendEmailId = data.email_id || data.id;
          if (resendEmailId) {
            await ctx.runMutation(internal.adminMail.updateDeliveryStatus, {
              resendEmailId,
              status: "bounced",
              bounceType: data.bounce?.type,
              bounceSubType: data.bounce?.subType,
              bounceMessage: data.bounce?.message,
            });
          }
          // Add recipients to suppression list
          const bouncedTo = Array.isArray(data.to) ? data.to : [data.to];
          for (const email of bouncedTo) {
            if (email) {
              await ctx.runMutation(internal.adminMail.addSuppression, {
                email: email.toLowerCase().trim(),
                reason: "bounce",
                bounceType: data.bounce?.type,
                bounceMessage: data.bounce?.message,
              });
            }
          }
          break;
        }

        case "email.complained": {
          const data = body.data;
          const resendEmailId = data.email_id || data.id;
          if (resendEmailId) {
            await ctx.runMutation(internal.adminMail.updateDeliveryStatus, {
              resendEmailId,
              status: "complained",
            });
          }
          // Add to suppression list
          const complainedTo = Array.isArray(data.to) ? data.to : [data.to];
          for (const email of complainedTo) {
            if (email) {
              await ctx.runMutation(internal.adminMail.addSuppression, {
                email: email.toLowerCase().trim(),
                reason: "complaint",
              });
            }
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
