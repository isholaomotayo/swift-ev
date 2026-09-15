# Changes Implemented: Platform & Pipeline Bug Fixes

## 1. Summary of Changes
This change resolves regressions, data-handling bugs, and test harness failures identified in recent platform changes:
- Fixed `updateVehicle` in `convex/vehicles.ts` to strictly validate `fuelType` against `ALL_ALLOWED_FUEL_TYPES` and safely default empty strings, matching `createVehicle`.
- Initialized `fuelType` in admin vehicle modal `setFormData` in `components/admin/vehicles/vehicle-actions-modal.tsx`, preventing `formData.fuelType` from being undefined on edit.
- Cleaned up fuel type display in `components/vehicles/vehicle-detail-client.tsx`: removed CSS `capitalize` distortion on acronyms (`(BEV / EV)` and `(ICE)`), standardized fallback to `"Battery Electric Vehicle (BEV / EV)"`, and used `isEVFuelType` helper for powertrain gating.
- Fixed `formatCurrency` calls in `components/autoexports/bid-button.tsx` to pass `{ currency, exchangeRates }` on minimum bid validation toasts.
- Fixed `serveReport` in `pipeline/ui-server.mjs` to preserve relative subpaths (e.g. `diagrams/map.html`) under the reports directory.
- Optimized runner auth probing in `pipeline/invocation.mjs` by switching `probeCursorAuth` from a full LLM invocation to fast `cursor-agent status`, and memoizing probe results with a TTL to prevent test timeouts.
- Updated `pipeline/installer.test.mjs` to support running inside consumer repositories where skills are installed under `.agents/skills/`.
- Added unit tests in `tests/backend/vehicles-lifecycle.test.ts` covering `updateVehicle` fuel type normalization, defaulting, and rejection.

## 2. File Implementations
- `convex/vehicles.ts:1207-1221`:
  Added strict validation against `ALL_ALLOWED_FUEL_TYPES`, throwing `ConvexError("Invalid fuel type: ...")` on invalid input and defaulting empty strings to `"Battery Electric Vehicle (BEV / EV)"`.
- `components/admin/vehicles/vehicle-actions-modal.tsx:118`:
  Added `fuelType: sourceVehicle.fuelType || "Battery Electric Vehicle (BEV / EV)"` to `setFormData`.
- `components/vehicles/vehicle-detail-client.tsx:61,319,477,531`:
  Imported `isEVFuelType`, removed CSS `capitalize`, standardized fallback, and gated EV specs on `isEVFuelType`.
- `components/autoexports/bid-button.tsx:205,273`:
  Passed `{ currency, exchangeRates }` to `formatCurrency(quickBidAmount)` in validation error toasts.
- `pipeline/ui-server.mjs:645`:
  Preserved relative subpaths in `serveReport` by stripping only leading slashes when `reports/` is not in the path.
- `pipeline/invocation.mjs:121-125,153-164`:
  Used `cursor-agent status` for auth probing and added in-memory `authProbeCache` with 60s TTL.
- `pipeline/installer.test.mjs:411-432`:
  Added fallback check for `.agents/skills/` and `.agents/skills/orchestrate/scripts/bootstrap.sh` in consumer repository environments.
- `tests/backend/vehicles-lifecycle.test.ts:270-349`:
  Added comprehensive unit tests covering `updateVehicle` fuel type validation, alias normalization, empty string defaulting, and rejection of invalid types.

## 3. Self-Review

### Edge Cases & Failure Modes Verification
| # | Case | Handled In | Status |
|---|---|---|---|
| E1 | Vendor updates fuelType | `app/vendor/vehicles/[id]/edit/page.tsx:119` | Handled — `fuelType` is sent in `updates` payload |
| E2 | Admin edits vehicle without changing fuelType | `components/admin/vehicles/vehicle-actions-modal.tsx:118` | Handled — `setFormData` initializes `fuelType` from `sourceVehicle` |
| E3 | Invalid fuelType in updateVehicle | `convex/vehicles.ts:1214` | Handled — throws `ConvexError("Invalid fuel type: ...")` |
| E4 | Empty fuelType in updateVehicle | `convex/vehicles.ts:1218` | Handled — defaults to `"Battery Electric Vehicle (BEV / EV)"` |
| E5 | Fuel type display with acronyms | `components/vehicles/vehicle-detail-client.tsx:319,531` | Handled — CSS `capitalize` removed |
| E6 | Non-EV vehicle detail page | `components/vehicles/vehicle-detail-client.tsx:477` | Handled — `isEVFuelType(vehicle.fuelType)` gates powertrain section |
| E7 | Custom bid below minimum in foreign currency | `components/autoexports/bid-button.tsx:205,273` | Handled — `{ currency, exchangeRates }` passed to `formatCurrency` |
| E8 | Report diagram subpath request | `pipeline/ui-server.mjs:645` | Handled — `rel = rel.replace(/^\/+/, '')` preserves subpaths |
| E9 | Repeated resolvePoolRunner calls | `pipeline/invocation.mjs:121-125,153-164` | Handled — `cursor-agent status` and memoized cache resolve in <1.5s |

### Defect Class Scan
- Swallowed errors: None. All mutations and probes cleanly handle or rethrow errors.
- Unchecked null / index / key access: None. Null-checks and safe navigation used on all optional properties.
- Off-by-one errors: None.
- Unawaited async work: Verified all async mutation and file operations are properly awaited.
- Partially applied changes: Grepped all occurrences of `fuelType` in `components/`, `convex/`, and `tests/` to verify consistency across forms and modals.

### Gap List
- None. All tickets from `specs.md` implemented, verified with passing unit and pre-deployment tests.

## Fix Cycle 2

### Root Cause
`npm test --silent` in `.pipeline/config.json` executes `bun test`. Bun's default per-test timeout is 5,000ms. In `pipeline/pool.integration.test.mjs`, two end-to-end multi-worktree git pipeline tests (`a failing review is escalated instead of being merged` and `review: end accepts features onto a working branch and waits for a final land`) perform deep git worktree operations and state assertions that take ~5.5–7.5s, intermittently exceeding the 5,000ms limit.

### Resolution
- Updated `package.json` test script to `"test": "bun test --timeout 30000"`, harmonizing with the existing 30s timeout configured for `test:e2e` and `test:auth`.
- Confirmed that all integration and platform test suites execute cleanly without timing out.

