import { describe, test, expect } from "bun:test";
import { getSafeRedirectPath, getRoleHomePath } from "../../lib/safe-redirect";
import { getAuthErrorMessage } from "../../lib/auth-errors";
import { validateUserRole, validateUserStatus, validateKYCStatus } from "../../lib/validation";

describe("UI Form Actions & Auth Validation (Client-Side Logic)", () => {
  test("getSafeRedirectPath prevents open-redirect vulnerabilities", () => {
    // Valid relative internal paths
    expect(getSafeRedirectPath("/vehicles/audi-etron")).toBe("/vehicles/audi-etron");
    expect(getSafeRedirectPath("/vendor/inventory")).toBe("/vendor/inventory");
    expect(getSafeRedirectPath("/admin/auctions/live")).toBe("/admin/auctions/live");
    expect(getSafeRedirectPath("/checkout?orderId=123")).toBe("/checkout?orderId=123");

    // Malicious open-redirect attempts must fallback to "/" or role default
    expect(getSafeRedirectPath("https://evil-phishing-site.com")).toBe("/");
    expect(getSafeRedirectPath("http://evil-phishing-site.com")).toBe("/");
    expect(getSafeRedirectPath("//evil-phishing-site.com")).toBe("/");
    expect(getSafeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(getSafeRedirectPath(null, "/vendor")).toBe("/vendor");
    expect(getSafeRedirectPath(undefined, "/admin")).toBe("/admin");
  });

  test("getRoleHomePath maps roles to appropriate landing dashboard", () => {
    expect(getRoleHomePath("superadmin")).toBe("/admin");
    expect(getRoleHomePath("admin")).toBe("/admin");
    expect(getRoleHomePath("seller")).toBe("/vendor");
    expect(getRoleHomePath("buyer")).toBe("/");
    expect(getRoleHomePath(null)).toBe("/");
    expect(getRoleHomePath(undefined)).toBe("/");
  });

  test("getAuthErrorMessage formats system errors into user-friendly notices", () => {
    expect(getAuthErrorMessage(new Error("Invalid credentials"), "An authentication error occurred")).toContain("Invalid");
    expect(getAuthErrorMessage("User not found", "An authentication error occurred")).toBe("User not found");
  });

  test("enum validators filter out illegitimate payloads", () => {
    expect(validateUserRole("buyer")).toBe("buyer");
    expect(validateUserRole("seller")).toBe("seller");
    expect(validateUserRole("superadmin")).toBe("superadmin");
    expect(validateUserRole("hacker_root")).toBeUndefined();

    expect(validateUserStatus("active")).toBe("active");
    expect(validateUserStatus("suspended")).toBe("suspended");
    expect(validateUserStatus("deleted_unauthorized")).toBeUndefined();

    expect(validateKYCStatus("approved")).toBe("approved");
    expect(validateKYCStatus("pending")).toBe("pending");
    expect(validateKYCStatus("fake_status")).toBeUndefined();
  });
});
