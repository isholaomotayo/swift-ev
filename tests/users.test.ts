import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Users", () => {
  let adminToken: string;
  let superadminToken: string;
  let buyerToken: string;
  let testUserId: Id<"users">;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await client.mutation(api.auth.login, {
      email: "admin@voltbid.africa",
      password: "admin123",
    });
    adminToken = adminLogin.token;
    superadminToken = adminToken; // Admin is also superadmin in seed data

    // Login as buyer
    const buyerLogin = await client.mutation(api.auth.login, {
      email: "john.doe@example.com",
      password: "buyer123",
    });
    buyerToken = buyerLogin.token;

    // Get a test user ID
    const users = await client.query(api.users.listUsers, {
      token: adminToken,
      limit: 1,
    });

    if (users.users.length > 0) {
      testUserId = users.users[0]._id;
    }
  });

  describe("listUsers", () => {
    test("admin can list users", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
      });

      expect(result).toHaveProperty("users");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("offset");
      expect(result).toHaveProperty("limit");
      expect(Array.isArray(result.users)).toBe(true);
      expect(typeof result.total).toBe("number");
    });

    test("admin can filter users by role", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
        role: "buyer",
      });

      expect(Array.isArray(result.users)).toBe(true);
      result.users.forEach((user) => {
        expect(user.role).toBe("buyer");
      });
    });

    test("admin can filter users by status", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
        status: "active",
      });

      expect(Array.isArray(result.users)).toBe(true);
      result.users.forEach((user) => {
        expect(user.status).toBe("active");
      });
    });

    test("admin can filter users by membership tier", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
        membershipTier: "basic",
      });

      expect(Array.isArray(result.users)).toBe(true);
      result.users.forEach((user) => {
        expect(user.membershipTier).toBe("basic");
      });
    });

    test("admin can filter users by KYC status", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
        kycStatus: "approved",
      });

      expect(Array.isArray(result.users)).toBe(true);
      result.users.forEach((user) => {
        expect(user.kycStatus).toBe("approved");
      });
    });

    test("admin can search users", async () => {
      const result = await client.query(api.users.listUsers, {
        token: adminToken,
        search: "john",
      });

      expect(Array.isArray(result.users)).toBe(true);
      // Results should match search term in name or email
    });

    test("admin can paginate users", async () => {
      const page1 = await client.query(api.users.listUsers, {
        token: adminToken,
        limit: 5,
        offset: 0,
      });

      const page2 = await client.query(api.users.listUsers, {
        token: adminToken,
        limit: 5,
        offset: 5,
      });

      expect(page1.users.length).toBeLessThanOrEqual(5);
      expect(page2.users.length).toBeLessThanOrEqual(5);
      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(5);
    });

    test("non-admin cannot list users", async () => {
      await expect(
        client.query(api.users.listUsers, {
          token: buyerToken,
        })
      ).rejects.toThrow();
    });
  });

  describe("getUserDetails", () => {
    test("admin can get user details", async () => {
      if (testUserId) {
        const result = await client.query(api.users.getUserDetails, {
          token: adminToken,
          userId: testUserId,
        });

        expect(result).toHaveProperty("user");
        expect(result).toHaveProperty("documents");
        expect(result).toHaveProperty("stats");
        expect(result).toHaveProperty("recentOrders");
        expect(result).toHaveProperty("recentBids");
        expect(result).toHaveProperty("auditLogs");
        expect(result.user._id).toBe(testUserId);
        expect(Array.isArray(result.documents)).toBe(true);
        expect(Array.isArray(result.recentOrders)).toBe(true);
        expect(Array.isArray(result.recentBids)).toBe(true);
        expect(Array.isArray(result.auditLogs)).toBe(true);
        expect(result.stats).toHaveProperty("totalOrders");
        expect(result.stats).toHaveProperty("totalBids");
        expect(result.stats).toHaveProperty("totalSpent");
      }
    });

    test("non-admin cannot get user details", async () => {
      if (testUserId) {
        await expect(
          client.query(api.users.getUserDetails, {
            token: buyerToken,
            userId: testUserId,
          })
        ).rejects.toThrow();
      }
    });

    test("returns error for non-existent user", async () => {
      await expect(
        client.query(api.users.getUserDetails, {
          token: adminToken,
          userId: "j1234567890abcdef" as any,
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("updateUserRole", () => {
    test("superadmin can update user role", async () => {
      if (testUserId) {
        // Get current role first
        const user = await client.query(api.users.getUserDetails, {
          token: adminToken,
          userId: testUserId,
        });

        const originalRole = user.user.role;
        const newRole = originalRole === "buyer" ? "seller" : "buyer";

        const result = await client.mutation(api.users.updateUserRole, {
          token: superadminToken,
          userId: testUserId,
          role: newRole,
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);

        // Restore original role
        await client.mutation(api.users.updateUserRole, {
          token: superadminToken,
          userId: testUserId,
          role: originalRole,
        });
      }
    });

    test("admin cannot update user role", async () => {
      if (testUserId) {
        // Try with admin token (if not superadmin)
        await expect(
          client.mutation(api.users.updateUserRole, {
            token: adminToken,
            userId: testUserId,
            role: "seller",
          })
        ).rejects.toThrow("Only superadmin");
      }
    });

    test("cannot change own role", async () => {
      const currentUser = await client.query(api.auth.getCurrentUser, {
        token: superadminToken,
      });

      if (currentUser) {
        await expect(
          client.mutation(api.users.updateUserRole, {
            token: superadminToken,
            userId: currentUser.id,
            role: "buyer",
          })
        ).rejects.toThrow("Cannot change your own role");
      }
    });

    test("returns error for non-existent user", async () => {
      await expect(
        client.mutation(api.users.updateUserRole, {
          token: superadminToken,
          userId: "j1234567890abcdef" as any,
          role: "buyer",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("updateUserStatus", () => {
    test("admin can update user status", async () => {
      if (testUserId) {
        // Get current status first
        const user = await client.query(api.users.getUserDetails, {
          token: adminToken,
          userId: testUserId,
        });

        const originalStatus = user.user.status;
        const newStatus = originalStatus === "active" ? "suspended" : "active";

        const result = await client.mutation(api.users.updateUserStatus, {
          token: adminToken,
          userId: testUserId,
          status: newStatus,
          reason: "Test status update",
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);

        // Restore original status
        await client.mutation(api.users.updateUserStatus, {
          token: adminToken,
          userId: testUserId,
          status: originalStatus,
        });
      }
    });

    test("cannot change own status", async () => {
      const currentUser = await client.query(api.auth.getCurrentUser, {
        token: adminToken,
      });

      if (currentUser) {
        await expect(
          client.mutation(api.users.updateUserStatus, {
            token: adminToken,
            userId: currentUser.id,
            status: "suspended",
          })
        ).rejects.toThrow("Cannot change your own status");
      }
    });

    test("non-admin cannot update user status", async () => {
      if (testUserId) {
        await expect(
          client.mutation(api.users.updateUserStatus, {
            token: buyerToken,
            userId: testUserId,
            status: "suspended",
          })
        ).rejects.toThrow();
      }
    });
  });

  describe("updateKYCStatus", () => {
    test("admin can update KYC status", async () => {
      if (testUserId) {
        const result = await client.mutation(api.users.updateKYCStatus, {
          token: adminToken,
          userId: testUserId,
          kycStatus: "approved",
          notes: "Test KYC approval",
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
      }
    });

    test("non-admin cannot update KYC status", async () => {
      if (testUserId) {
        await expect(
          client.mutation(api.users.updateKYCStatus, {
            token: buyerToken,
            userId: testUserId,
            kycStatus: "approved",
          })
        ).rejects.toThrow();
      }
    });

    test("returns error for non-existent user", async () => {
      await expect(
        client.mutation(api.users.updateKYCStatus, {
          token: adminToken,
          userId: "j1234567890abcdef" as any,
          kycStatus: "approved",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("updateMembershipTier", () => {
    test("admin can update membership tier", async () => {
      if (testUserId) {
        // Get current tier first
        const user = await client.query(api.users.getUserDetails, {
          token: adminToken,
          userId: testUserId,
        });

        const originalTier = user.user.membershipTier;
        const newTier = originalTier === "basic" ? "premier" : "basic";

        const result = await client.mutation(api.users.updateMembershipTier, {
          token: adminToken,
          userId: testUserId,
          tier: newTier,
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);

        // Restore original tier
        await client.mutation(api.users.updateMembershipTier, {
          token: adminToken,
          userId: testUserId,
          tier: originalTier,
        });
      }
    });

    test("non-admin cannot update membership tier", async () => {
      if (testUserId) {
        await expect(
          client.mutation(api.users.updateMembershipTier, {
            token: buyerToken,
            userId: testUserId,
            tier: "premier",
          })
        ).rejects.toThrow();
      }
    });

    test("returns error for non-existent user", async () => {
      await expect(
        client.mutation(api.users.updateMembershipTier, {
          token: adminToken,
          userId: "j1234567890abcdef" as any,
          tier: "premier",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("getUserStats", () => {
    test("admin can get user statistics", async () => {
      const stats = await client.query(api.users.getUserStats, {
        token: adminToken,
      });

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("active");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("suspended");
      expect(stats).toHaveProperty("kycPending");
      expect(stats).toHaveProperty("kycApproved");
      expect(stats).toHaveProperty("membershipBreakdown");
      expect(stats).toHaveProperty("roleBreakdown");
      expect(typeof stats.total).toBe("number");
      expect(stats.membershipBreakdown).toHaveProperty("guest");
      expect(stats.membershipBreakdown).toHaveProperty("basic");
      expect(stats.membershipBreakdown).toHaveProperty("premier");
      expect(stats.membershipBreakdown).toHaveProperty("business");
      expect(stats.roleBreakdown).toHaveProperty("buyer");
      expect(stats.roleBreakdown).toHaveProperty("seller");
      expect(stats.roleBreakdown).toHaveProperty("admin");
      expect(stats.roleBreakdown).toHaveProperty("superadmin");
    });

    test("non-admin cannot get user stats", async () => {
      await expect(
        client.query(api.users.getUserStats, {
          token: buyerToken,
        })
      ).rejects.toThrow();
    });
  });
});

