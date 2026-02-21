"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://autoexports.live";

/**
 * Send a transactional email.
 *
 * Provider: Resend (https://resend.com)
 *   - Set RESEND_API_KEY in your Convex environment variables
 *   - Set EMAIL_FROM to your verified sender address (e.g. "noreply@autoexports.live")
 *
 * Development fallback: if RESEND_API_KEY is not set, the email content is
 * logged to the Convex dashboard so you can test flows without an API key.
 */
async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "noreply@autoexports.live";

  if (!apiKey) {
    // Development fallback — log to Convex dashboard logs
    console.log("[EMAIL STUB — set RESEND_API_KEY to enable sending]", {
      to: args.to,
      from,
      subject: args.subject,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed (${res.status}): ${body}`);
  }
}

/**
 * Generate a verification token, store it, and send the email to the user.
 * Called via ctx.scheduler.runAfter(0, ...) from the createUser mutation.
 */
export const sendVerificationEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();

    await ctx.runMutation(internal.auth.createEmailVerificationToken, {
      userId: args.userId,
      token,
    });

    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

    await sendEmail({
      to: args.email,
      subject: "Verify your autoexports.live email address",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0a;border-radius:12px;">
          <h1 style="color:#0066FF;font-size:24px;margin-bottom:8px;">Welcome to autoexports.live!</h1>
          <p style="color:#ccc;font-size:16px;">Hi ${args.firstName}, thanks for registering. Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 32px;background:#0066FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Verify Email Address
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <p style="color:#555;font-size:11px;word-break:break-all;">Or paste this link into your browser: ${verifyUrl}</p>
        </div>
      `,
    });
  },
});

/**
 * Generate a password-reset token, store it, and email the reset link.
 * Called via ctx.scheduler.runAfter(0, ...) from the requestPasswordReset mutation.
 */
export const sendPasswordResetEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const token = crypto.randomUUID();

    await ctx.runMutation(internal.auth.createPasswordResetToken, {
      userId: args.userId,
      token,
    });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: args.email,
      subject: "Reset your autoexports.live password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0a0a0a;border-radius:12px;">
          <h1 style="color:#0066FF;font-size:24px;margin-bottom:8px;">Password Reset Request</h1>
          <p style="color:#ccc;font-size:16px;">Hi ${args.firstName}, we received a request to reset your password. Click the button below to choose a new one.</p>
          <a href="${resetUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 32px;background:#0066FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
            Reset Password
          </a>
          <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not change.</p>
          <p style="color:#555;font-size:11px;word-break:break-all;">Or paste this link into your browser: ${resetUrl}</p>
        </div>
      `,
    });
  },
});
