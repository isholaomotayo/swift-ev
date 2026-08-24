import { describe, test, expect } from "bun:test";
import { getSafeRedirectPath, getRoleHomePath } from "../../lib/safe-redirect";
import { getAuthErrorMessage, getMutationErrorMessage } from "../../lib/auth-errors";
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

  test("getAuthErrorMessage and getMutationErrorMessage format system errors into user-friendly notices", () => {
    expect(getAuthErrorMessage(new Error("Invalid credentials"), "An authentication error occurred")).toContain("Invalid");
    expect(getAuthErrorMessage("User not found", "An authentication error occurred")).toBe("User not found");

    // Masked Convex server error should trigger fallback
    const maskedConvexError = new Error("[CONVEX M(vehicles:createVehicle)] [Request ID: b2dca90bb7a176f9] Server Error Called by client");
    expect(getMutationErrorMessage(maskedConvexError, "Failed to upload vehicle")).toBe("Failed to upload vehicle");

    // Convex error with business message and stack trace
    const stackConvexError = new Error("[CONVEX M(vehicles:createVehicle)] [Request ID: b2dca90bb7a176f9] Vehicle year must be between 2014 and 2027.\n  at handler (convex/vehicles.ts:828)");
    expect(getMutationErrorMessage(stackConvexError, "Failed to upload vehicle")).toBe("Vehicle year must be between 2014 and 2027.");

    // ConvexError with string payload in data field
    const convexDataString = { data: "Reserve price must be greater than or equal to the starting bid." };
    expect(getMutationErrorMessage(convexDataString, "Fallback")).toBe("Reserve price must be greater than or equal to the starting bid.");

    // ConvexError with object payload in data field
    const convexDataObject = { data: { message: "Only vendors or admins can upload vehicles" } };
    expect(getMutationErrorMessage(convexDataObject, "Fallback")).toBe("Only vendors or admins can upload vehicles");

    // Generic error string
    expect(getMutationErrorMessage("Session expired - please log in again", "Fallback")).toBe("Session expired - please log in again");
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
