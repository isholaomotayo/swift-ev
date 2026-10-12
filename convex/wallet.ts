import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyFlutterwaveTransaction } from "./lib/flutterwave";
import { calculateBidReserveAmountKobo, buyingPowerFromWalletKobo } from "./lib/purchaseFlow";
import { requestWithdrawal, completeWithdrawal, completePendingCredit, rejectWithdrawal as rejectWithdrawalLedger } from "./lib/ledger";
import { requireAuth, requireAdmin, createAuditLog } from "./lib/auth";

/**
 * Get wallet balance and details for the current user
 */
export const getWalletBalance = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
        // Get user from session
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return null;
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            return null;
        }

        const walletBalance = user.walletBalance ?? 0;
        const pendingBalance = user.pendingBalance ?? 0;
        const reservedBalance = user.reservedBalance ?? 0;

        return {
            available: walletBalance,
            pending: pendingBalance,
            reserved: reservedBalance,
            currency: user.walletCurrency ?? "NGN",
            // Bidding power = available balance * 10 (10% requirement)
            biddingPower: buyingPowerFromWalletKobo(walletBalance),
        };
    },
});

/**
 * Get wallet transaction history
 */
export const getTransactionHistory = query({
    args: {
        token: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return [];
        }

        const transactions = await ctx.db
            .query("walletTransactions")
            .withIndex("by_user", (q) => q.eq("userId", session.userId))
            .order("desc")
            .take(args.limit ?? 20);

        return transactions;
    },
});

/**
 * Initiate wallet funding (Flutterwave)
 */
export const initiateWalletFunding = mutation({
    args: {
        token: v.string(),
        amount: v.number(), // in kobo
        paymentMethod: v.optional(v.union(
            v.literal("card"),
            v.literal("bank_transfer"),
            v.literal("ussd")
        )),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        if (args.amount < 10000) {
            throw new Error("Minimum deposit is ₦100");
        }

        // Generate a unique reference for Flutterwave tx_ref
        const reference = `WF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Create pending transaction
        await ctx.db.insert("walletTransactions", {
            userId: session.userId,
            type: "deposit",
            amount: args.amount,
            currency: "NGN",
            status: "pending",
            reference,
            description: `Wallet funding - ${(args.amount / 100).toLocaleString()} NGN`,
            paymentProvider: "flutterwave",
            createdAt: Date.now(),
        });

        return {
            success: true,
            txRef: reference,
            amount: args.amount,
            currency: "NGN",
            customer: {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`.trim(),
                phone: user.phone,
            },
            message: "Flutterwave payment initialized.",
        };
    },
});

/**
 * Confirm wallet funding (Flutterwave verification)
 */
export const confirmWalletFunding = mutation({
    args: {
        token: v.string(),
        txRef: v.string(),
        transactionId: v.union(v.number(), v.string()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Unauthorized");
        }

        return await processWalletFunding(ctx, args.txRef, args.transactionId, session.userId);
    },
});

export const processWalletFundingWebhook = internalMutation({
    args: {
        txRef: v.string(),
        transactionId: v.union(v.number(), v.string()),
    },
    handler: async (ctx, args) => {
        const transaction = await ctx.db
            .query("walletTransactions")
            .withIndex("by_reference", (q) => q.eq("reference", args.txRef))
            .first();

        if (!transaction) {
            throw new Error("Transaction not found");
        }

        return await processWalletFunding(ctx, args.txRef, args.transactionId, transaction.userId);
    },
});

async function processWalletFunding(ctx: any, txRef: string, transactionId: number | string, expectedUserId: string) {
    // Find the pending transaction
    const transaction = await ctx.db
        .query("walletTransactions")
        .withIndex("by_reference", (q: any) => q.eq("reference", txRef))
        .first();

    if (!transaction || transaction.userId !== expectedUserId) {
        throw new Error("Transaction not found");
    }

    if (transaction.status === "completed") {
        return {
            success: true,
            newBalance: (await ctx.db.get(transaction.userId))?.walletBalance ?? 0,
            message: "Wallet already funded",
        };
    }

    if (transaction.status === "failed") {
        throw new Error("Transaction already marked as failed.");
    }

    const verification = await verifyFlutterwaveTransaction(transactionId);

    if (verification.tx_ref !== txRef) {
        throw new Error("Flutterwave reference mismatch");
    }

    if (verification.status !== "successful") {
        await ctx.db.patch(transaction._id, {
            status: "failed",
            completedAt: Date.now(),
            paymentReference: verification.flw_ref ?? String(verification.id),
        });
        throw new Error("Payment not successful");
    }

    if (verification.currency !== "NGN") {
        throw new Error("Invalid payment currency");
    }

    const expectedAmount = transaction.amount / 100;
    const paidAmount = verification.charged_amount ?? verification.amount;
    if (paidAmount + 0.01 < expectedAmount) {
        throw new Error("Payment amount is insufficient");
    }

    // Complete the pending deposit and credit the wallet
    const user = await ctx.db.get(transaction.userId);
    if (!user) {
        throw new Error("User not found");
    }

    const funded = await completePendingCredit(ctx, transaction._id, {
        paymentProvider: "flutterwave",
        paymentReference: verification.flw_ref ?? String(verification.id),
    });
    const newBalance = funded.walletBalance;

    // Send H1: Wallet Funded Email
    await ctx.scheduler.runAfter(0, internal.emails.sendWalletFundedEmail, {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        amount: transaction.amount / 100,
        newBalance: newBalance / 100,
        buyingPower: buyingPowerFromWalletKobo(newBalance),
    });

    return {
        success: true,
        newBalance,
        message: "Wallet funded successfully",
    };
}

/**
 * Initiate withdrawal (STUBBED)
 */
export const initiateWithdrawal = mutation({
    args: {
        token: v.string(),
        amount: v.number(),
        bankCode: v.string(),
        accountNumber: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const reference = `WD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await requestWithdrawal(ctx, {
            userId: session.userId,
            amountKobo: args.amount,
            type: "withdrawal",
            reference,
            description: `Withdrawal to bank account ${args.accountNumber.slice(-4)}`,
            paymentProvider: "paystack_stub",
        });

        return {
            success: true,
            reference,
            message: "Withdrawal initiated. Processing time: 24-48 hours (stubbed)",
        };
    },
});

/**
 * Check if user can bid on a vehicle at a given amount
 */
export const checkBiddingPower = query({
    args: {
        token: v.string(),
        bidAmount: v.number(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session || session.expiresAt < Date.now()) {
            return { canBid: false, reason: "Not authenticated" };
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            return { canBid: false, reason: "User not found" };
        }

        const requiredBalance = calculateBidReserveAmountKobo(args.bidAmount);
        const available = user.walletBalance ?? 0;

        if (available >= requiredBalance) {
            return {
                canBid: true,
                available,
                required: requiredBalance,
                biddingPower: buyingPowerFromWalletKobo(available),
            };
        }

        return {
            canBid: false,
            reason: "Insufficient wallet balance",
            available,
            required: requiredBalance,
            shortfall: requiredBalance - available,
        };
    },
});

/**
 * Approve withdrawal (Admin)
 */
export const approveWithdrawal = mutation({
    args: {
        token: v.string(),
        transactionId: v.id("walletTransactions"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.token);
        requireAdmin(admin);

        await completeWithdrawal(ctx, args.transactionId);
        await createAuditLog(ctx, {
            userId: admin._id,
            action: "approve_withdrawal",
            entityType: "walletTransaction",
            entityId: args.transactionId,
        });

        return { success: true };
    },
});

/**
 * Reject withdrawal (Admin): returns the funds to the user's available balance.
 */
export const rejectWithdrawal = mutation({
    args: {
        token: v.string(),
        transactionId: v.id("walletTransactions"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.token);
        requireAdmin(admin);

        await rejectWithdrawalLedger(ctx, args.transactionId);
        await createAuditLog(ctx, {
            userId: admin._id,
            action: "reject_withdrawal",
            entityType: "walletTransaction",
            entityId: args.transactionId,
            metadata: args.reason,
        });

        return { success: true };
    },
});
