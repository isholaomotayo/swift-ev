import { describe, test, expect } from "bun:test";
import { api } from "../convex/_generated/api";
import { createTestConvexClient } from "./convex-client";
import { getAuthErrorMessage } from "../lib/auth-errors";

const client = createTestConvexClient();

describe("Authentication", () => {
  describe("Login", () => {
    test(
      "admin can login with correct credentials",
      async () => {
        const result = await client.action(api.authActions.login, {
          email: "admin@voltbid.africa",
          password: "admin123",
        });

        expect(result.token).toBeDefined();
        expect(typeof result.token).toBe("string");
        expect(result.user.email).toBe("admin@voltbid.africa");
        expect(result.user.role).toBe("superadmin");
        expect(result.user.firstName).toBe("System");
        expect(result.user.lastName).toBe("Administrator");
      }
    );

    test(
      "vendor can login with correct credentials",
      async () => {
        const result = await client.action(api.authActions.login, {
          email: "vendor@bydnigeria.com",
          password: "vendor123",
        });

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe("vendor@bydnigeria.com");
        expect(result.user.role).toBe("seller");
        expect(result.user.vendorCompany).toBe("BYD Auto Nigeria Ltd");
        expect(result.user.vendorLicense).toBe("DL-BYD-2024-001");
      }
    );

    test(
      "buyer can login with correct credentials",
      async () => {
        const result = await client.action(api.authActions.login, {
          email: "john.doe@example.com",
          password: "buyer123",
        });

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe("john.doe@example.com");
        expect(result.user.firstName).toBe("John");
        expect(result.user.lastName).toBe("Doe");
      }
    );

    test(
      "login fails with wrong password",
      async () => {
        let error: unknown = null;
        try {
          await client.action(api.authActions.login, {
            email: "vendor@bydnigeria.com",
            password: "wrong_password",
          });
        } catch (err) {
          error = err;
        }
        expect(error).not.toBeNull();
        expect(getAuthErrorMessage(error, "")).toBe("Invalid email or password");
      }
    );

    test(
      "login fails with non-existent email",
      async () => {
        let error: unknown = null;
        try {
          await client.action(api.authActions.login, {
            email: "nonexistent@example.com",
            password: "password123",
          });
        } catch (err) {
          error = err;
        }
        expect(error).not.toBeNull();
        expect(getAuthErrorMessage(error, "")).toBe("Invalid email or password");
      }
    );
  });

  describe("Get Current User", () => {
    test(
      "returns user data with valid token",
      async () => {
        // First login
        const loginResult = await client.action(api.authActions.login, {
          email: "vendor@bydnigeria.com",
          password: "vendor123",
        });

        // Then get current user
        const user = await client.query(api.auth.getCurrentUser, {
          token: loginResult.token,
        });

        expect(user).toBeDefined();
        expect(user?.email).toBe("vendor@bydnigeria.com");
        expect(user?.role).toBe("seller");
        expect(user?.vendorCompany).toBe("BYD Auto Nigeria Ltd");
      }
    );

    test(
      "returns null with invalid token",
      async () => {
        const user = await client.query(api.auth.getCurrentUser, {
          token: "invalid_token_12345",
        });

        expect(user).toBeNull();
      }
    );
  });

  (describe as any).skip("Logout [convex writes blocked]", () => {
    test(
      "successfully logs out user",
      async () => {
        // First login
        const loginResult = await client.action(api.authActions.login, {
          email: "john.doe@example.com",
          password: "buyer123",
        });

        // Logout
        const logoutResult = await client.mutation(api.auth.logout, {
          token: loginResult.token,
        });

        expect(logoutResult.success).toBe(true);

        // Verify token is invalid after logout
        const user = await client.query(api.auth.getCurrentUser, {
          token: loginResult.token,
        });

        expect(user).toBeNull();
      }
    );
  });
});
