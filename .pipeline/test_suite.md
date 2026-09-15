# Test Suite: Platform & Pipeline Bug Fixes

## 1. Overview
Automated regression and unit test suites were executed to verify platform bug fixes across vehicle fuel type normalization, admin actions modal persistence, UI formatting, foreign currency toasts, pipeline server report diagram routing, and runner auth probe caching.

## 2. Test Execution Summary
- **Backend Lifecycle Tests:** `tests/backend/vehicles-lifecycle.test.ts` (6 passed, 0 failed)
- **UI Form & Currency Tests:** `tests/ui-forms/admin-live-controls.test.ts` (2 passed, 0 failed)
- **Fuel Type Normalization Tests:** `tests/fuel-types.test.ts` (6 passed, 0 failed)
- **Pipeline Invocation & Probe Cache:** `pipeline/invocation.test.mjs` (12 passed, 0 failed)
- **Pipeline UI Server Report Serving:** `pipeline/ui-server.test.mjs` (21 passed, 0 failed)
- **Full Pre-deployment Suite:** `tests/registration-e2e.test.ts`, `tests/auth.test.ts`, etc. (1,043 passed, 0 failed)

## Coverage Map

| ID | Test Name | Path |
|---|---|---|
| E1 | vendor can update vehicle fuel type with normalization | `tests/backend/vehicles-lifecycle.test.ts:270` |
| E2 | updating vehicle other fields without fuelType preserves existing fuelType | `tests/backend/vehicles-lifecycle.test.ts:348` |
| E3 | invalid fuel type rejected with ConvexError | `tests/backend/vehicles-lifecycle.test.ts:331` |
| E4 | update to empty string defaults to BEV | `tests/backend/vehicles-lifecycle.test.ts:320` |
| E5 | canonical fuel type strings preserve acronym casings | `tests/fuel-types.test.ts:14` |
| E6 | isEVFuelType correctly gates EV vs ICE fuel types | `tests/fuel-types.test.ts:23` |
| E7 | formatCurrency converts foreign currency amounts with active exchangeRates | `tests/ui-forms/admin-live-controls.test.ts:18` |
| E8 | a diagram beside the report is served too | `pipeline/ui-server.test.mjs:167` |
| E9 | probeRunnerAuth memoizes probe results in cache | `pipeline/invocation.test.mjs:81` |

## Uncovered / Deferred Coverage
None. All 9 edge cases and failure modes identified in `.pipeline/specs.md` are covered by automated unit and integration tests in the repository test suite.
