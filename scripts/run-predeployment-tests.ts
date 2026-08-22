#!/usr/bin/env bun
/**
 * AutoExports Pre-Deployment Verification Runner
 * Runs all in-memory hermetic backend, UI action, and multi-actor E2E journey tests.
 */

import { spawn } from "node:child_process";

console.log("================================================================================");
console.log("             AUTOEXPORTS.LIVE PRE-DEPLOYMENT TEST SUITE RUNNER                 ");
console.log("================================================================================");
console.log("Target Directories:");
console.log("  • tests/backend/   - Hermetic Convex Backend Engines (Auctions, Vehicles, Orders, Wallet, KYC)");
console.log("  • tests/ui-forms/  - Client Action & Form Processing Logic (Auth, Wizard, Checkout, Admin)");
console.log("  • tests/e2e/       - Multi-Role Full Lifecycle Journeys (Seller -> Buyer -> Admin -> Delivery)");
console.log("--------------------------------------------------------------------------------\n");

const startTime = Date.now();

const testProcess = spawn(
  "bun",
  [
    "test",
    "tests/backend",
    "tests/ui-forms",
    "tests/e2e",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  }
);

testProcess.on("close", (code) => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n================================================================================");
  if (code === 0) {
    console.log(`✅ PRE-DEPLOYMENT VERIFICATION PASSED in ${duration}s!`);
    console.log("All systems, form actions, and multi-role lifecycle journeys are green.");
    console.log("Deployment is SAFE to proceed.");
  } else {
    console.log(`❌ PRE-DEPLOYMENT VERIFICATION FAILED (exit code ${code}) in ${duration}s.`);
    console.log("Issues detected. Fix failing test cases before deploying to production.");
  }
  console.log("================================================================================\n");
  process.exit(code ?? 1);
});
