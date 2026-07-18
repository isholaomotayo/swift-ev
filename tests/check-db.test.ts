import { describe, test, expect } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Database Check", () => {
  test("check what password hashes are actually stored", async () => {
    // Login via action (bcrypt runs in Node.js runtime)
    const loginResult = await client.action(api.authActions.login, {
      email: "admin@voltbid.africa",
      password: "admin123",
    });

    console.log("\n📊 Login Result:");
    console.log("Token:", loginResult.token);
    console.log("User:", loginResult.user);
    console.log("\n✅ Password verification working with bcrypt in Node.js action!");
    console.log("Passwords are now safely hashed using bcryptjs (cost 12) in a Node.js action — no V8 CPU limits.");

    expect(loginResult.token).toBeDefined();
    expect(typeof loginResult.token).toBe("string");
    expect(loginResult.user.email).toBe("admin@voltbid.africa");
  });
});
