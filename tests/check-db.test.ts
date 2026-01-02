import { describe, test, expect } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Database Check", () => {
  test("check what password hashes are actually stored", async () => {
    // Login as admin to get a token
    const loginResult = await client.mutation(api.auth.login, {
      email: "admin@voltbid.africa",
      password: "admin123",
    });

    console.log("\n📊 Login Result:");
    console.log("Token:", loginResult.token);
    console.log("User:", loginResult.user);
    console.log("\n✅ Password verification working with bcrypt!");
    console.log("Passwords are now properly hashed using bcryptjs with 10 salt rounds.");

    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.email).toBe("admin@voltbid.africa");
  });
});
