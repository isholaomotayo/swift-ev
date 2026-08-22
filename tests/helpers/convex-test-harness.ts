import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Modules mapping for in-memory convex-test execution.
 * Allows executing Convex mutations and queries hermetically without touching live databases.
 */
export const testModules = {
  "./_generated/api.js": () => import("../../convex/_generated/api.js"),
  "./_generated/server.js": () => import("../../convex/_generated/server.js"),
  "./adminMail.ts": () => import("../../convex/adminMail"),
  "./analytics.ts": () => import("../../convex/analytics"),
  "./auctions.ts": () => import("../../convex/auctions"),
  "./auth.ts": () => import("../../convex/auth"),
  "./authActions.ts": () => import("../../convex/authActions"),
  "./bids.ts": () => import("../../convex/bids"),
  "./clearData.ts": () => import("../../convex/clearData"),
  "./crons.ts": () => import("../../convex/crons"),
  "./debug.ts": () => import("../../convex/debug"),
  "./disputes.ts": () => import("../../convex/disputes"),
  "./emailAdmin.ts": () => import("../../convex/emailAdmin"),
  "./emails.ts": () => import("../../convex/emails"),
  "./emailTemplates.ts": () => import("../../convex/emailTemplates"),
  "./exchangeRates.ts": () => import("../../convex/exchangeRates"),
  "./files.ts": () => import("../../convex/files"),
  "./financials.ts": () => import("../../convex/financials"),
  "./http.ts": () => import("../../convex/http"),
  "./kyc.ts": () => import("../../convex/kyc"),
  "./logistics.ts": () => import("../../convex/logistics"),
  "./mailRouting.ts": () => import("../../convex/mailRouting"),
  "./notifications.ts": () => import("../../convex/notifications"),
  "./orders.ts": () => import("../../convex/orders"),
  "./payments.ts": () => import("../../convex/payments"),
  "./registration.ts": () => import("../../convex/registration"),
  "./schema.ts": () => import("../../convex/schema"),
  "./services.ts": () => import("../../convex/services"),
  "./settings.ts": () => import("../../convex/settings"),
  "./userMail.ts": () => import("../../convex/userMail"),
  "./users.ts": () => import("../../convex/users"),
  "./vehicleCatalog.ts": () => import("../../convex/vehicleCatalog"),
  "./vehicles.ts": () => import("../../convex/vehicles"),
  "./wallet.ts": () => import("../../convex/wallet"),
  "./watchlist.ts": () => import("../../convex/watchlist"),
};

export function createTestHarness() {
  return convexTest(schema, testModules);
}

export type TestHarness = ReturnType<typeof createTestHarness>;

/**
 * Helper to seed an active user directly in the test database and generate a session token.
 */
export async function seedTestUser(
  t: TestHarness,
  overrides?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: "buyer" | "seller" | "admin" | "superadmin";
    accountType?: "individual" | "dealer" | "corporate" | "seller_individual" | "seller_dealer" | "seller_fleet";
    status?: "pending" | "active" | "suspended" | "banned";
    kycStatus?: "not_started" | "pending" | "approved" | "rejected";
    walletBalance?: number;
    buyingPower?: number;
  }
) {
  const email = overrides?.email ?? `test_user_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.live`;
  const role = overrides?.role ?? (overrides?.accountType?.startsWith("seller_") ? "seller" : "buyer");
  const accountType = overrides?.accountType ?? (role === "seller" ? "seller_individual" : "individual");
  const firstName = overrides?.firstName ?? "Test";
  const lastName = overrides?.lastName ?? "User";
  const status = overrides?.status ?? "active";
  const kycStatus = overrides?.kycStatus ?? "approved";
  const walletBalance = overrides?.walletBalance ?? 50_000_000_00; // ₦50M in kobo
  const buyingPower = overrides?.buyingPower ?? 50_000_000;

  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash: "$2a$12$dummyhashforinmemorytests1234567890abcdef",
      accountType,
      role,
      status,
      emailVerified: true,
      phoneVerified: true,
      membershipTier: "premier",
      depositAmount: 0,
      walletBalance,
      pendingBalance: 0,
      reservedBalance: 0,
      buyingPower,
      dailyBidsUsed: 0,
      lastBidResetAt: Date.now(),
      kycStatus,
      termsAcceptedAt: Date.now(),
      termsVersion: "2026-01",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const token = `sess_tok_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });
  });

  return { userId, token, email, role, accountType };
}

/**
 * Seed a vehicle in the test database matching the exact schema definition.
 */
export async function seedTestVehicle(
  t: TestHarness,
  sellerId: Id<"users">,
  overrides?: {
    status?: "draft" | "pending_approval" | "approved" | "scheduled" | "in_auction" | "sold" | "payment_pending" | "rejected";
    make?: string;
    model?: string;
    year?: number;
    startingBid?: number;
    reservePrice?: number;
    buyNowPrice?: number;
  }
) {
  const make = overrides?.make ?? "BYD";
  const model = overrides?.model ?? "Atto 3";
  const year = overrides?.year ?? 2024;
  const status = overrides?.status ?? "approved";
  const startingBid = overrides?.startingBid ?? 15_000_000;
  const reservePrice = overrides?.reservePrice ?? 18_000_000;
  const buyItNowPrice = overrides?.buyNowPrice ?? 22_000_000;

  const vehicleId = await t.run(async (ctx) => {
    return await ctx.db.insert("vehicles", {
      sellerId,
      make,
      model,
      year,
      vin: `TESTVIN${Date.now().toString().slice(-10)}`,
      lotNumber: `VB-${Math.floor(100000 + Math.random() * 900000)}`,
      exteriorColor: "Metallic Blue",
      interiorColor: "Black Leather",
      fuelType: "electric",
      drivetrain: "FWD",
      batteryCapacity: 60.48,
      estimatedRange: 420,
      batteryHealthPercent: 98,
      chargingType: ["type2", "ccs2"],
      motorPower: 150,
      batteryType: "LFP",
      odometer: 5000,
      odometerUnit: "km",
      condition: "excellent",
      titleType: "clean",
      titleCountry: "Nigeria",
      hasKeys: true,
      sourceType: "dealer",
      currentLocation: {
        facility: "Lagos Main Yard",
        city: "Lagos",
        country: "Nigeria",
      },
      startingBid,
      reservePrice,
      buyItNowPrice,
      buyItNowEnabled: true,
      status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return vehicleId;
}
