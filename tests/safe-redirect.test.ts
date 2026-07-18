import { describe, expect, test } from "bun:test";
import { getRoleHomePath, getSafeRedirectPath } from "../lib/safe-redirect";

describe("safe redirect", () => {
  test("allows internal paths only", () => {
    expect(getSafeRedirectPath("/vehicles/abc")).toBe("/vehicles/abc");
    expect(getSafeRedirectPath("/orders/xyz?x=1")).toBe("/orders/xyz?x=1");
    expect(getSafeRedirectPath("https://evil.com")).toBe("/");
    expect(getSafeRedirectPath("//evil.com")).toBe("/");
    expect(getSafeRedirectPath("/\\evil")).toBe("/\\evil");
    expect(getSafeRedirectPath(null, "/vendor")).toBe("/vendor");
  });

  test("maps roles to home paths", () => {
    expect(getRoleHomePath("admin")).toBe("/admin");
    expect(getRoleHomePath("seller")).toBe("/vendor");
    expect(getRoleHomePath("buyer")).toBe("/");
  });
});
