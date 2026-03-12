import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/flutterwave-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Note: Flutterwave usually sends the signature in the `verif-hash` header
    // In production, we should verify the signature using process.env.FLUTTERWAVE_SECRET_HASH

    // For this implementation, we will verify the signature if the secret is available
    const signature = request.headers.get("verif-hash");
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;

    if (secretHash && signature !== secretHash) {
      return new Response("Invalid signature", { status: 401 });
    }

    try {
      const payload = await request.json();

      // Check if it's a successful transaction webhook
      if (payload.event === "charge.completed" && payload.data.status === "successful") {
        const txRef = payload.data.tx_ref;
        const transactionId = payload.data.id;

        // Route to the appropriate handler based on the transaction reference prefix
        if (txRef.startsWith("WF_")) {
          // Wallet Funding
          await ctx.runMutation(internal.wallet.processWalletFundingWebhook, {
            txRef,
            transactionId,
          });
        } else if (txRef.startsWith("KYC_")) {
          // KYC Fee
          await ctx.runMutation(internal.kyc.processKycFeeWebhook, {
            txRef,
            transactionId,
          });
        }
      }

      return new Response("Webhook processed successfully", { status: 200 });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // We return 200 even on processing errors so Flutterwave doesn't retry unnecessarily,
      // but in a fully robust system we might want to return 500 for temporary errors.
      return new Response("Webhook received but processing failed", { status: 200 });
    }
  }),
});

export default http;
