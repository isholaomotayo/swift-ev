import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Calculate the required deposit for a user to bid on a vehicle or generally.
 * Policy:
 * - Flat rate of 100,000 for standard access.
 * - Becomes 10% of bid value if effective bid limit > 1M (Example threshold).
 * - Or simply returns the 10% value for a given target buying power.
 */
export const calculateRequiredDeposit = query({
    args: {
        targetBuyingPower: v.number(),
    },
    handler: async (ctx, args) => {
        // If target < X, flat rate?
        // "Incentivize... flat rate of 100k. then it goes to become 10%"
        // Let's assume the transition point is when 10% exceeds 100k (i.e. Buying Power > 1M).
        // If Buying Power requested is 500k, 10% is 50k. But flat rate is 100k. So we take Max(100k, 10%).

        const flatRate = 100_000;
        const percentageRate = args.targetBuyingPower * 0.10;

        return Math.max(flatRate, percentageRate);
    },
});

/**
 * Calculate storage fees based on days overdue.
 * Policy:
 * - Free for first 3 days after payment deadline? Or strictly after deadline?
 * - "Storage fees (daily until payment is made)"
 * - "Even if delays are caused by platform, storage fees apply" -> Strict.
 */
export const calculateStorageFees = query({
    args: {
        daysOverdue: v.number(),
    },
    handler: async (ctx, args) => {
        if (args.daysOverdue <= 0) return 0;

        // Updated Rate: 10,000 per day (AutoAuctions Africa Policy)
        const dailyRate = 10_000;
        return args.daysOverdue * dailyRate;
    },
});

/**
 * Calculate Buyer Premium
 * Policy: 5% of the winning bid amount.
 */
export const calculateBuyerPremium = query({
    args: {
        bidAmount: v.number(),
    },
    handler: async (ctx, args) => {
        const PREMIUM_RATE = 0.05;
        return args.bidAmount * PREMIUM_RATE;
    },
});
