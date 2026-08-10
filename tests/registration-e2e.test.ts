import { describe, test, expect } from "bun:test";
import { api } from "../convex/_generated/api";
import { createTestConvexClient } from "./convex-client";
import { getAuthErrorMessage } from "../lib/auth-errors";

const client = createTestConvexClient();

const ACCOUNT_TYPES = [
  { type: "individual", expectedRole: "buyer" },
  { type: "dealer", expectedRole: "buyer" },
  { type: "corporate", expectedRole: "buyer" },
  { type: "seller_individual", expectedRole: "seller" },
  { type: "seller_dealer", expectedRole: "seller" },
  { type: "seller_fleet", expectedRole: "seller" },
] as const;

describe("End-to-End Registration & Auth Suite", () => {
  describe("Registration Flow Across All Account Types", () => {
    for (const { type, expectedRole } of ACCOUNT_TYPES) {
      test(
        `registers, verifies, and logs in user of type "${type}" with role "${expectedRole}"`,
        async () => {
          const timestamp = Date.now();
          const email = `e2e_${type}_${timestamp}_${Math.floor(Math.random() * 1000)}@test.live`;
          const phone = `+23480${Math.floor(10000000 + Math.random() * 90000000)}`;
          const password = `SecurePass_${timestamp}!`;
          const firstName = `E2E_${type}`;
          const lastName = "Tester";

          // 1. Register Action
          const regResult = await client.action(api.authActions.register, {
            email,
            firstName,
            lastName,
            phone,
            password,
            accountType: type,
            preferredCurrency: "NGN",
            acceptedTerms: true,
          });

          expect(regResult).toHaveProperty("userId");
          expect(regResult).toHaveProperty("message");
          expect(typeof regResult.userId).toBe("string");
          expect(regResult.message).toContain("Registration successful");

          // 2. Login Action immediately after registration
          const loginResult = await client.action(api.authActions.login, {
            email,
            password,
          });

          expect(loginResult).toHaveProperty("token");
          expect(typeof loginResult.token).toBe("string");
          expect(loginResult.user.email).toBe(email.toLowerCase());
          expect(loginResult.user.firstName).toBe(firstName);
          expect(loginResult.user.lastName).toBe(lastName);
          expect(loginResult.user.role).toBe(expectedRole);
          expect(loginResult.user.accountType).toBe(type);

          // 3. Query User Session
          const currentUser = await client.query(api.auth.getCurrentUser, {
            token: loginResult.token,
          });

          expect(currentUser).not.toBeNull();
          expect(currentUser?.email).toBe(email.toLowerCase());
          expect(currentUser?.role).toBe(expectedRole);
          expect(currentUser?.accountType).toBe(type);
          expect(typeof currentUser?.termsAcceptedAt).toBe("number");
          expect(currentUser?.termsVersion).toBe("2026-01");
        },
        30000
      );
    }
  });

  describe("Registration Input Validation & Error Handling", () => {
    test(
      "rejects registration with duplicate email and extracts clear error",
      async () => {
        const timestamp = Date.now();
        const email = `dup_email_${timestamp}@test.live`;
        const password = "Password123!";

        // First registration succeeds
        await client.action(api.authActions.register, {
          email,
          firstName: "First",
          lastName: "User",
          password,
          accountType: "individual",
          acceptedTerms: true,
        });

        // Second registration with exact same email must fail
        let caughtError: unknown = null;
        try {
          await client.action(api.authActions.register, {
            email,
            firstName: "Second",
            lastName: "User",
            password,
            accountType: "dealer",
            acceptedTerms: true,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).not.toBeNull();
        const extractedMessage = getAuthErrorMessage(caughtError, "Registration failed");
        expect(extractedMessage).toBe("Email already registered");
      },
      30000
    );

    test(
      "rejects registration with case-insensitive duplicate email",
      async () => {
        const timestamp = Date.now();
        const emailLower = `case_test_${timestamp}@test.live`;
        const emailUpper = `CASE_TEST_${timestamp}@TEST.LIVE`;
        const password = "Password123!";

        // Register lowercase
        await client.action(api.authActions.register, {
          email: emailLower,
          firstName: "Case",
          lastName: "Test",
          password,
          accountType: "individual",
          acceptedTerms: true,
        });

        // Attempt uppercase
        let caughtError: unknown = null;
        try {
          await client.action(api.authActions.register, {
            email: emailUpper,
            firstName: "Case",
            lastName: "Test",
            password,
            accountType: "individual",
            acceptedTerms: true,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).not.toBeNull();
        const extractedMessage = getAuthErrorMessage(caughtError, "Registration failed");
        expect(extractedMessage).toBe("Email already registered");
      },
      30000
    );

    test(
      "rejects registration with duplicate phone number",
      async () => {
        const timestamp = Date.now();
        const sharedPhone = `+23490${Math.floor(10000000 + Math.random() * 90000000)}`;
        const password = "Password123!";

        // User 1 registers with shared phone
        await client.action(api.authActions.register, {
          email: `phone_user1_${timestamp}@test.live`,
          firstName: "Phone1",
          lastName: "User",
          phone: sharedPhone,
          password,
          accountType: "individual",
          acceptedTerms: true,
        });

        // User 2 attempts registration with same phone
        let caughtError: unknown = null;
        try {
          await client.action(api.authActions.register, {
            email: `phone_user2_${timestamp}@test.live`,
            firstName: "Phone2",
            lastName: "User",
            phone: sharedPhone,
            password,
            accountType: "corporate",
            acceptedTerms: true,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).not.toBeNull();
        const extractedMessage = getAuthErrorMessage(caughtError, "Registration failed");
        expect(extractedMessage).toBe("Phone number already registered");
      },
      30000
    );

    test(
      "allows multiple registrations with empty or whitespace phone numbers",
      async () => {
        const timestamp = Date.now();
        const password = "Password123!";

        // User 1 with empty string phone
        const user1 = await client.action(api.authActions.register, {
          email: `empty_phone1_${timestamp}@test.live`,
          firstName: "NoPhone1",
          lastName: "User",
          phone: "",
          password,
          accountType: "individual",
          acceptedTerms: true,
        });
        expect(user1.userId).toBeDefined();

        // User 2 with whitespace phone
        const user2 = await client.action(api.authActions.register, {
          email: `empty_phone2_${timestamp}@test.live`,
          firstName: "NoPhone2",
          lastName: "User",
          phone: "   ",
          password,
          accountType: "seller_individual",
          acceptedTerms: true,
        });
        expect(user2.userId).toBeDefined();
      },
      30000
    );

    test(
      "rejects registration when terms are not accepted",
      async () => {
        const timestamp = Date.now();
        let caughtError: unknown = null;
        try {
          await client.action(api.authActions.register, {
            email: `no_terms_${timestamp}@test.live`,
            firstName: "No",
            lastName: "Terms",
            password: "Password123!",
            accountType: "individual",
            acceptedTerms: false,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).not.toBeNull();
        expect(getAuthErrorMessage(caughtError, "Registration failed")).toBe(
          "You must accept the terms and conditions"
        );
      },
      30000
    );

    test(
      "rejects registration with password shorter than 8 characters",
      async () => {
        const timestamp = Date.now();
        let caughtError: unknown = null;
        try {
          await client.action(api.authActions.register, {
            email: `short_pw_${timestamp}@test.live`,
            firstName: "Short",
            lastName: "Password",
            password: "abc",
            accountType: "individual",
            acceptedTerms: true,
          });
        } catch (err) {
          caughtError = err;
        }

        expect(caughtError).not.toBeNull();
        expect(getAuthErrorMessage(caughtError, "Registration failed")).toBe(
          "Password must be at least 8 characters"
        );
      },
      30000
    );
  });

  describe("getAuthErrorMessage Helper Robustness", () => {
    test("correctly parses error from ConvexError data payload", () => {
      const err = {
        message: "[CONVEX A(authActions:register)] [Request ID: 12345] Server Error Called by client",
        data: { message: "Custom validation message" },
      };
      expect(getAuthErrorMessage(err, "Fallback")).toBe("Custom validation message");
    });

    test("correctly strips [CONVEX ...] prefix from direct error messages", () => {
      const err = new Error("[CONVEX A(authActions:register)] Direct error message");
      expect(getAuthErrorMessage(err, "Fallback")).toBe("Direct error message");
    });

    test("returns fallback when error message contains Server Error without data payload", () => {
      const err = new Error("Server Error Called by client");
      expect(getAuthErrorMessage(err, "Default Error")).toBe("Default Error");
    });

    test("handles plain string errors", () => {
      expect(getAuthErrorMessage("Plain string error", "Fallback")).toBe("Plain string error");
    });
  });
});
