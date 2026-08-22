import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser } from "../helpers/convex-test-harness";

describe("Backend KYC, Role-Based Access Control (RBAC) & Security (In-Memory Hermetic)", () => {
  test("superadmin updates user role and status -> admin cannot escalate to superadmin", async () => {
    const t = createTestHarness();

    const superadmin = await seedTestUser(t, { role: "superadmin" });
    const admin = await seedTestUser(t, { role: "admin" });
    const user = await seedTestUser(t, { role: "buyer" });

    // 1. Superadmin promotes buyer to seller
    const promoteResult = await t.mutation(api.users.updateUserRole, {
      token: superadmin.token,
      userId: user.userId,
      role: "seller",
    });

    expect(promoteResult.success).toBe(true);

    const userDocAfterPromote = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(userDocAfterPromote?.role).toBe("seller");

    // 2. Regular admin cannot change user role to superadmin
    let adminEscalateError: unknown = null;
    try {
      await t.mutation(api.users.updateUserRole, {
        token: admin.token,
        userId: user.userId,
        role: "superadmin",
      });
    } catch (e: any) {
      adminEscalateError = e;
    }
    expect(adminEscalateError).not.toBeNull();

    // 3. Superadmin suspends user
    const suspendResult = await t.mutation(api.users.updateUserStatus, {
      token: superadmin.token,
      userId: user.userId,
      status: "suspended",
    });

    expect(suspendResult.success).toBe(true);

    const suspendedDoc = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(suspendedDoc?.status).toBe("suspended");
  });

  test("admin updates KYC status to approved and rejected with reason", async () => {
    const t = createTestHarness();

    const admin = await seedTestUser(t, { role: "admin" });
    const user = await seedTestUser(t, { role: "buyer", kycStatus: "pending" });

    // 1. Admin rejects KYC
    const rejectResult = await t.mutation(api.users.updateKYCStatus, {
      token: admin.token,
      userId: user.userId,
      kycStatus: "rejected",
      notes: "ID document expired",
    });

    expect(rejectResult.success).toBe(true);

    const rejectedUser = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(rejectedUser?.kycStatus).toBe("rejected");
    expect(rejectedUser?.kycRejectionReason).toBe("ID document expired");

    // 2. Admin approves KYC
    const approveResult = await t.mutation(api.users.updateKYCStatus, {
      token: admin.token,
      userId: user.userId,
      kycStatus: "approved",
    });

    expect(approveResult.success).toBe(true);

    const approvedUser = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(approvedUser?.kycStatus).toBe("approved");
  });

  test("admin updates user membership tier", async () => {
    const t = createTestHarness();

    const admin = await seedTestUser(t, { role: "admin" });
    const user = await seedTestUser(t, { role: "buyer" });

    const updateTierResult = await t.mutation(api.users.updateMembershipTier, {
      token: admin.token,
      userId: user.userId,
      tier: "business",
    });

    expect(updateTierResult.success).toBe(true);

    const userDoc = await t.run(async (ctx) => ctx.db.get(user.userId));
    expect(userDoc?.membershipTier).toBe("business");
  });

  test("RBAC matrix: non-admin cannot access admin user list or stats", async () => {
    const t = createTestHarness();

    const buyer = await seedTestUser(t, { role: "buyer" });

    let listError: unknown = null;
    try {
      await t.query(api.users.listUsers, {
        token: buyer.token,
      });
    } catch (e: any) {
      listError = e;
    }

    expect(listError).not.toBeNull();

    let statsError: unknown = null;
    try {
      await t.query(api.users.getUserStats, {
        token: buyer.token,
      });
    } catch (e: any) {
      statsError = e;
    }

    expect(statsError).not.toBeNull();
  });
});
