import { describe, test, expect } from "bun:test";
import { requireKycApproved, requireActiveStatus, type AuthenticatedUser } from "../convex/lib/auth";

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
    membershipTier: "premier",
    kycStatus: "approved",
    ...overrides,
  };
}

describe("requireKycApproved (Free Access)", () => {
  test("allows bidding when KYC is approved", () => {
    expect(() =>
      requireKycApproved(makeUser({ kycStatus: "approved" }))
    ).not.toThrow();
  });

  test("does not block when KYC is not started (free access enabled)", () => {
    expect(() =>
      requireKycApproved(makeUser({ kycStatus: "not_started" }))
    ).not.toThrow();
  });

  test("does not block when KYC is pending review (free access enabled)", () => {
    expect(() =>
      requireKycApproved(makeUser({ kycStatus: "pending" }))
    ).not.toThrow();
  });

  test("does not block when KYC is rejected (free access enabled)", () => {
    expect(() =>
      requireKycApproved(makeUser({ kycStatus: "rejected" }))
    ).not.toThrow();
  });
});

describe("requireActiveStatus", () => {
  test("allows active users", () => {
    expect(() =>
      requireActiveStatus(makeUser({ status: "active" }))
    ).not.toThrow();
  });

  test("allows pending users during open access", () => {
    expect(() =>
      requireActiveStatus(makeUser({ status: "pending" }))
    ).not.toThrow();
  });

  test("blocks suspended users", () => {
    expect(() =>
      requireActiveStatus(makeUser({ status: "suspended" }))
    ).toThrow("Account is suspended. Please contact support.");
  });

  test("blocks banned users", () => {
    expect(() =>
      requireActiveStatus(makeUser({ status: "banned" }))
    ).toThrow("Account is banned. Please contact support.");
  });
});

