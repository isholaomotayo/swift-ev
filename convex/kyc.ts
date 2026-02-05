import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyFlutterwaveTransaction } from "./lib/flutterwave";

/**
 * Get KYC status for the current user
 */
export const getKycStatus = query({
    args: {
        token: v.string(),
    },
    handler: async (ctx, args) => {
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

        return {
            status: user.kycStatus,
            verificationFeeStatus: user.verificationFeeStatus ?? "not_paid",
            sumsubApplicantId: user.sumsubApplicantId,
            submittedAt: user.kycSubmittedAt,
            approvedAt: user.kycApprovedAt,
            rejectionReason: user.kycRejectionReason,
            accountType: user.accountType,
        };
    },
});

/**
 * Initiate verification fee payment (Flutterwave)
 */
export const initiateVerificationFeePayment = mutation({
    args: {
        token: v.string(),
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

        if (user.verificationFeeStatus === "paid") {
            throw new Error("Verification fee already paid");
        }

        if (user.verificationFeeStatus === "pending" && user.verificationFeeReference) {
            return {
                success: true,
                txRef: user.verificationFeeReference,
                amount: 450000,
                currency: "NGN",
                customer: {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    phone: user.phone,
                },
                message: "Verification fee payment already initiated.",
            };
        }

        const reference = `VF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await ctx.db.patch(session.userId, {
            verificationFeeStatus: "pending",
            verificationFeeReference: reference,
            updatedAt: Date.now(),
        });

        // Create a wallet transaction record for the fee
        await ctx.db.insert("walletTransactions", {
            userId: session.userId,
            type: "fee",
            amount: 450000, // $3 = ₦4,500 = 450000 kobo
            currency: "NGN",
            status: "pending",
            reference,
            description: "KYC Verification Fee",
            paymentProvider: "flutterwave",
            createdAt: Date.now(),
        });

        return {
            success: true,
            txRef: reference,
            amount: 450000,
            currency: "NGN",
            customer: {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`.trim(),
                phone: user.phone,
            },
            message: "Verification fee payment initiated.",
        };
    },
});

/**
 * Confirm verification fee payment (Flutterwave verification)
 */
export const confirmVerificationFeePayment = mutation({
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

        const user = await ctx.db.get(session.userId);
        if (!user) {
            throw new Error("User not found");
        }

        const transaction = await ctx.db
            .query("walletTransactions")
            .withIndex("by_reference", (q) => q.eq("reference", args.txRef))
            .first();

        if (!transaction || transaction.userId !== session.userId) {
            throw new Error("Transaction not found");
        }

        if (transaction.status === "completed" && user.verificationFeeStatus === "paid") {
            return {
                success: true,
                reference: transaction.reference,
                message: "Verification fee already confirmed",
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
            await ctx.db.patch(session.userId, {
                verificationFeeStatus: "not_paid",
                verificationFeeReference: undefined,
                updatedAt: Date.now(),
            });
            throw new Error("Payment not successful");
        }

        if (verification.currency !== "NGN") {
            throw new Error("Invalid payment currency");
        }

        const expectedAmount = transaction.amount / 100;
        const paidAmount = verification.charged_amount ?? verification.amount;
        if (paidAmount + 0.01 < expectedAmount) {
            await ctx.db.patch(transaction._id, {
                status: "failed",
                completedAt: Date.now(),
                paymentReference: verification.flw_ref ?? String(verification.id),
            });
            await ctx.db.patch(session.userId, {
                verificationFeeStatus: "not_paid",
                verificationFeeReference: undefined,
                updatedAt: Date.now(),
            });
            throw new Error("Payment amount is insufficient");
        }

        await ctx.db.patch(transaction._id, {
            status: "completed",
            completedAt: Date.now(),
            paymentProvider: "flutterwave",
            paymentReference: verification.flw_ref ?? String(verification.id),
        });

        await ctx.db.patch(session.userId, {
            verificationFeeStatus: "paid",
            verificationFeeReference: args.txRef,
            verificationFeePaidAt: Date.now(),
            updatedAt: Date.now(),
        });

        return {
            success: true,
            reference: args.txRef,
            message: "Verification fee paid successfully",
        };
    },
});

/**
 * Generate Sumsub access token (STUBBED)
 * In production, this would call Sumsub API to generate WebSDK token
 */
export const generateSumsubToken = mutation({
    args: {
        token: v.string(),
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

        // Check if verification fee is paid
        if (user.verificationFeeStatus !== "paid") {
            throw new Error("Please pay the verification fee first");
        }

        // Generate or get Sumsub applicant ID
        let applicantId = user.sumsubApplicantId;
        if (!applicantId) {
            // STUBBED: In production, this would create an applicant in Sumsub
            applicantId = `stub_applicant_${session.userId}_${Date.now()}`;

            await ctx.db.patch(session.userId, {
                sumsubApplicantId: applicantId,
                updatedAt: Date.now(),
            });
        }

        // STUBBED: Return mock WebSDK token
        return {
            success: true,
            applicantId,
            // In production, this would be a real Sumsub access token
            accessToken: `stub_token_${applicantId}_${Date.now()}`,
            // Sumsub WebSDK expects these
            expiresIn: 1200, // 20 minutes
            message: "Sumsub token generated (stubbed). Use simulateKycApproval to test.",
        };
    },
});

/**
 * Submit KYC documents (STUBBED)
 * In production, Sumsub WebSDK handles document upload
 */
export const submitKycDocuments = mutation({
    args: {
        token: v.string(),
        documentType: v.optional(v.string()),
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

        if (!user.sumsubApplicantId) {
            throw new Error("Please generate Sumsub token first");
        }

        // Update KYC status to pending
        await ctx.db.patch(session.userId, {
            kycStatus: "pending",
            kycSubmittedAt: Date.now(),
            updatedAt: Date.now(),
        });

        return {
            success: true,
            message: "KYC documents submitted for review (stubbed). Approval typically takes 24-48 hours.",
        };
    },
});

/**
 * Simulate KYC approval (STUBBED - for testing)
 * In production, this would be triggered by Sumsub webhook
 */
export const simulateKycApproval = mutation({
    args: {
        token: v.string(),
        approve: v.boolean(),
        rejectionReason: v.optional(v.string()),
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

        if (args.approve) {
            await ctx.db.patch(session.userId, {
                kycStatus: "approved",
                kycApprovedAt: Date.now(),
                status: "active", // Activate the account
                updatedAt: Date.now(),
            });

            return {
                success: true,
                message: "KYC approved! Your account is now active.",
            };
        } else {
            await ctx.db.patch(session.userId, {
                kycStatus: "rejected",
                kycRejectionReason: args.rejectionReason ?? "Document verification failed",
                updatedAt: Date.now(),
            });

            return {
                success: true,
                message: `KYC rejected: ${args.rejectionReason ?? "Document verification failed"}`,
            };
        }
    },
});

/**
 * Process Sumsub webhook (STUBBED)
 * In production, this would verify webhook signature and update user status
 */
export const processSumsubWebhook = mutation({
    args: {
        applicantId: v.string(),
        reviewResult: v.union(
            v.literal("GREEN"),
            v.literal("RED"),
            v.literal("PENDING")
        ),
        rejectLabels: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        // Find user by Sumsub applicant ID
        const users = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("sumsubApplicantId"), args.applicantId))
            .collect();

        if (users.length === 0) {
            throw new Error("User not found for applicant ID");
        }

        const user = users[0];

        switch (args.reviewResult) {
            case "GREEN":
                await ctx.db.patch(user._id, {
                    kycStatus: "approved",
                    kycApprovedAt: Date.now(),
                    status: "active",
                    updatedAt: Date.now(),
                });
                break;

            case "RED":
                await ctx.db.patch(user._id, {
                    kycStatus: "rejected",
                    kycRejectionReason: args.rejectLabels?.join(", ") ?? "Verification failed",
                    updatedAt: Date.now(),
                });
                break;

            case "PENDING":
                await ctx.db.patch(user._id, {
                    kycStatus: "pending",
                    updatedAt: Date.now(),
                });
                break;
        }

        return { success: true };
    },
});

/**
 * Check if user can bid (KYC and wallet requirements)
 */
export const canUserBid = query({
    args: {
        token: v.string(),
        bidAmount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .first();

        if (!session) {
            return {
                canBid: false,
                reason: "not_authenticated",
                message: "Please log in to bid",
            };
        }

        const user = await ctx.db.get(session.userId);
        if (!user) {
            return {
                canBid: false,
                reason: "user_not_found",
                message: "User not found",
            };
        }

        // Check KYC status
        if (user.kycStatus !== "approved") {
            return {
                canBid: false,
                reason: "kyc_not_approved",
                message: user.kycStatus === "pending"
                    ? "Your verification is in progress. You'll be able to bid once approved."
                    : "Please complete identity verification to bid",
                kycStatus: user.kycStatus,
            };
        }

        // Check wallet balance if bid amount provided
        if (args.bidAmount) {
            const requiredBalance = Math.ceil(args.bidAmount * 0.1);
            const available = user.walletBalance ?? 0;

            if (available < requiredBalance) {
                return {
                    canBid: false,
                    reason: "insufficient_balance",
                    message: `Wallet balance (₦${(available / 100).toLocaleString()}) is less than 10% required (₦${(requiredBalance / 100).toLocaleString()})`,
                    walletBalance: available,
                    required: requiredBalance,
                    shortfall: requiredBalance - available,
                };
            }
        }

        return {
            canBid: true,
            walletBalance: user.walletBalance ?? 0,
            biddingPower: (user.walletBalance ?? 0) * 10,
        };
    },
});
