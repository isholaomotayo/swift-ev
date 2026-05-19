import { GenericMutationCtx } from "convex/server";
import { DataModel } from "../_generated/dataModel";

/**
 * Generate a unique order number
 */
export async function generateUniqueOrderNumber(ctx: GenericMutationCtx<DataModel>): Promise<string> {
  let orderNumber: string;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  // Generate order number and check for duplicates
  while (exists && attempts < maxAttempts) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    orderNumber = `VB-${timestamp}-${random}`;

    const existing = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q: any) => q.eq("orderNumber", orderNumber))
      .first();

    exists = !!existing;
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate unique order number after multiple attempts");
  }

  return orderNumber!;
}

/**
 * Calculate service fee
 */
export function calculateServiceFee(bidAmount: number): number {
  if (bidAmount <= 1_000_000) {
    return 75_000;
  } else if (bidAmount <= 5_000_000) {
    return bidAmount * 0.07; // 7%
  } else if (bidAmount <= 15_000_000) {
    return bidAmount * 0.06; // 6%
  } else {
    return bidAmount * 0.05; // 5%
  }
}
