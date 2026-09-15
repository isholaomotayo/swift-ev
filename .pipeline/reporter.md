# Work Done — Platform Bug Fixes & Stability

## Summary
Recent platform updates introduced subtle data synchronization bugs and test harness regressions across vehicle inventory management, client UI components, and the development pipeline. Vehicle updates previously failed to strictly validate fuel types and omitted `fuelType` during admin edits, causing data loss on edit. In the frontend, acronyms were distorted by CSS capitalization and minimum bid error toasts were missing foreign currency exchange formatting. In the pipeline engine, report diagram serving collapsed subpaths and runner probes were causing intermittent test timeouts due to unmemoized subprocess invocations. All identified bugs have been corrected and verified across 1,043 automated unit and integration tests with zero regressions.

## What Changed
- **Convex Backend:**
  - `convex/vehicles.ts:1207`: Added strict validation against `ALL_ALLOWED_FUEL_TYPES` in `updateVehicle`, rejecting invalid types with `ConvexError` and defaulting empty strings to `"Battery Electric Vehicle (BEV / EV)"`.
- **Admin & Vendor UI:**
  - `components/admin/vehicles/vehicle-actions-modal.tsx:118`: Pre-populated `fuelType` in form state so existing vehicle classifications are not lost on edit.
  - `components/vehicles/vehicle-detail-client.tsx:61,319,477,531`: Removed CSS `capitalize` distortion from fuel type acronyms and used `isEVFuelType` helper to control powertrain section display.
  - `components/autoexports/bid-button.tsx:205,273`: Passed active currency and exchange rates to `formatCurrency` in minimum bid validation toasts.
- **Pipeline & Test Harness:**
  - `pipeline/ui-server.mjs:645`: Fixed report file serving to preserve diagram subpaths like `diagrams/map.html`.
  - `pipeline/invocation.mjs:121,153`: Replaced full LLM auth probe with fast `cursor-agent status` and added 60-second in-memory memoization.
  - `pipeline/installer.test.mjs:411`: Added support for `.agents/skills/` directory structure in consumer repositories.
  - `package.json:19`: Updated `test` script to `"bun test --timeout 30000"` to prevent Bun's default 5-second timeout on multi-worktree git integration tests.
- **Automated Tests:**
  - `tests/backend/vehicles-lifecycle.test.ts:270`: Added tests for `updateVehicle` fuel type validation, alias normalization, defaulting, rejection, and preserving fuel type across general updates.
  - `tests/ui-forms/admin-live-controls.test.ts:18`: Added tests for `formatCurrency` with custom exchange rates.
  - `pipeline/invocation.test.mjs:77`: Added tests for auth probe memoization and unknown runner handling.

## Key Decisions & Deviations
- **Test Runner Timeout Configuration:** The root `test` script in `package.json` was updated to `"bun test --timeout 30000"`, matching existing scripts (`test:e2e`, `test:auth`) that already use 30s timeouts for deep integration flows.
- **Unified Fuel Type Taxonomy:** Applied `ALL_ALLOWED_FUEL_TYPES` from `convex/lib/fuelTypes.ts` in `updateVehicle`, aligning behavior with `createVehicle`.

## Rough Edges & Follow-ups
- None. All 1,043 unit, form, and backend tests pass cleanly.

## Review Guidance
- Check `convex/vehicles.ts:1207` to confirm the `ConvexError` message aligns with consumer error handling conventions.
- Spot-check `components/vehicles/vehicle-detail-client.tsx:477` to verify that ICE vehicles hide battery capacity and charging specs cleanly.

## Diagrams
None.
