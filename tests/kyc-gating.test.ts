import { describe, test, expect } from "bun:test";
import { requireKycApproved, type AuthenticatedUser } from "../convex/lib/auth";

function makeUser(
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser {
  return {
    _id: "user123" as AuthenticatedUser["_id"],
    email: "buyer@test.live",
    firstName: "Test",
    lastName: "Buyer",
    role: "buyer",
    status: "active",
    membershipTier: "guest",
    kycStatus: "not_started",
    ...overrides,
  };
}

describe("requireKycApproved", () => {
  test("allows bidding when KYC is approved", () => {
    expect(() =>
      requireKycApproved(makeUser({ kycStatus: "approved" }))
    ).not.toThrow();
  });

  test("blocks bidding when KYC is not started", () => {
    expect(() => requireKycApproved(makeUser({ kycStatus: "not_started" }))).toThrow(
      "Please complete identity verification before bidding."
    );
  });

  test("blocks bidding when KYC is pending review", () => {
    expect(() => requireKycApproved(makeUser({ kycStatus: "pending" }))).toThrow(
      "Your identity verification is under review"
    );
  });

  test("blocks bidding when KYC is rejected", () => {
    expect(() => requireKycApproved(makeUser({ kycStatus: "rejected" }))).toThrow(
      "Please complete identity verification before bidding."
    );
  });
});
