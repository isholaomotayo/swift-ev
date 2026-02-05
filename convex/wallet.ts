import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyFlutterwaveTransaction } from "./lib/flutterwave";

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

        if (!session) {
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
            biddingPower: walletBalance * 10,
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

        if (!session) {
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

        if (!session) {
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

        if (!session) {
            throw new Error("Unauthorized");
        }

        // Find the pending transaction
        const transaction = await ctx.db
            .query("walletTransactions")
            .withIndex("by_reference", (q) => q.eq("reference", args.txRef))
            .first();

        if (!transaction || transaction.userId !== session.userId) {
            throw new Error("Transaction not found");
        }

        if (transaction.status === "completed") {
            return {
                success: true,
                newBalance: (await ctx.db.get(transaction.userId))?.walletBalance ?? 0,
                message: "Wallet already funded",
            };
        }

        const verification = await verifyFlutterwaveTransaction(args.transactionId);

        if (verification.tx_ref !== args.txRef) {
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

        // Update transaction status
        await ctx.db.patch(transaction._id, {
            status: "completed",
            completedAt: Date.now(),
            paymentProvider: "flutterwave",
            paymentReference: verification.flw_ref ?? String(verification.id),
        });

        // Get user and update wallet balance
        const user = await ctx.db.get(transaction.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const newBalance = (user.walletBalance ?? 0) + transaction.amount;

        await ctx.db.patch(transaction.userId, {
            walletBalance: newBalance,
            updatedAt: Date.now(),
        });

        return {
            success: true,
            newBalance,
            message: "Wallet funded successfully",
        };
    },
});

/**
 * Reserve funds for a bid
 * Called when user places a bid to lock 10% of bid amount
 */
export const reserveFundsForBid = mutation({
    args: {
        token: v.string(),
        bidAmount: v.number(),
        bidId: v.optional(v.id("bids")),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const requiredReserve = Math.ceil(args.bidAmount * 0.1); // 10% of bid
        const available = user.walletBalance ?? 0;

        if (available < requiredReserve) {
            throw new Error(`Insufficient funds. Need ₦${(requiredReserve / 100).toLocaleString()} but only have ₦${(available / 100).toLocaleString()}`);
        }

        // Move funds from available to reserved
        const newBalance = available - requiredReserve;
        const newReserved = (user.reservedBalance ?? 0) + requiredReserve;

        await ctx.db.patch(session.userId, {
            walletBalance: newBalance,
            reservedBalance: newReserved,
            updatedAt: Date.now(),
        });

        // Create transaction record
        const reference = `BR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await ctx.db.insert("walletTransactions", {
            userId: session.userId,
            type: "bid_reserve",
            amount: requiredReserve,
            currency: "NGN",
            status: "completed",
            reference,
            description: `Bid reserve for ₦${(args.bidAmount / 100).toLocaleString()} bid`,
            relatedBidId: args.bidId,
            createdAt: Date.now(),
            completedAt: Date.now(),
        });

        return {
            success: true,
            reserved: requiredReserve,
            newBalance,
        };
    },
});

/**
 * Release reserved funds (when outbid or auction lost)
 */
export const releaseReservedFunds = mutation({
    args: {
        token: v.string(),
        amount: v.number(),
        reason: v.string(),
        bidId: v.optional(v.id("bids")),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const reserved = user.reservedBalance ?? 0;
        const releaseAmount = Math.min(args.amount, reserved);

        // Move funds from reserved back to available
        await ctx.db.patch(session.userId, {
            walletBalance: (user.walletBalance ?? 0) + releaseAmount,
            reservedBalance: reserved - releaseAmount,
            updatedAt: Date.now(),
        });

        // Create transaction record
        const reference = `RL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await ctx.db.insert("walletTransactions", {
            userId: session.userId,
            type: "bid_release",
            amount: releaseAmount,
            currency: "NGN",
            status: "completed",
            reference,
            description: `Funds released: ${args.reason}`,
            relatedBidId: args.bidId,
            createdAt: Date.now(),
            completedAt: Date.now(),
        });

        return {
            success: true,
            released: releaseAmount,
        };
    },
});

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

        if (!session) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const available = user.walletBalance ?? 0;

        if (available < args.amount) {
            throw new Error("Insufficient funds for withdrawal");
        }

        // Create pending withdrawal transaction
        const reference = `WD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await ctx.db.insert("walletTransactions", {
            userId: session.userId,
            type: "withdrawal",
            amount: args.amount,
            currency: "NGN",
            status: "pending",
            reference,
            description: `Withdrawal to bank account ${args.accountNumber.slice(-4)}`,
            paymentProvider: "paystack_stub",
            createdAt: Date.now(),
        });

        // Deduct from balance immediately
        await ctx.db.patch(session.userId, {
            walletBalance: available - args.amount,
            pendingBalance: (user.pendingBalance ?? 0) + args.amount,
            updatedAt: Date.now(),
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

        if (!session) {
            return { canBid: false, reason: "Not authenticated" };
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            return { canBid: false, reason: "User not found" };
        }

        const requiredBalance = Math.ceil(args.bidAmount * 0.1); // 10% of bid
        const available = user.walletBalance ?? 0;

        if (available >= requiredBalance) {
            return {
                canBid: true,
                available,
                required: requiredBalance,
                biddingPower: available * 10,
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
