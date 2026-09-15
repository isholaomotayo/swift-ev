# TECHNICAL SPECIFICATION: Fix Platform & Pipeline Regression Bugs

## 1. Alignment Log (Q&A)

### A. Domain & Business Logic
- **Q1:** When a vendor edits a vehicle via the vendor edit form, should modifications to fuelType be preserved and saved to the backend?
  - **A1:** Yes. The vendor edit page previously initialized `fuelType` in form state but omitted `fuelType` from the `updates` payload sent to `updateVehicle`, causing vendor updates to fuel types to be silently lost. `updates.fuelType = formData.fuelType` must be included.
  - **Source:** Codebase Fact (`app/vendor/vehicles/[id]/edit/page.tsx:120-140`)
- **Q2:** How should the admin vehicle edit modal initialize and handle an existing vehicle's fuelType?
  - **A2:** In `components/admin/vehicles/vehicle-actions-modal.tsx`, `setFormData` omitted `fuelType`, leaving `formData.fuelType` undefined when editing a vehicle. It must be initialized with `sourceVehicle.fuelType || "Battery Electric Vehicle (BEV / EV)"` so existing fuel types are correctly displayed in the dropdown and preserved on submission.
  - **Source:** Codebase Fact (`components/admin/vehicles/vehicle-actions-modal.tsx:112-136`)
- **Q3:** Should `updateVehicle` in Convex enforce the same fuel type validation and normalization as `createVehicle`?
  - **A3:** Yes. In `convex/vehicles.ts`, `updateVehicle` applied `normalizeFuelType` but did not validate against `ALL_ALLOWED_FUEL_TYPES`. It must reject invalid fuel types with `ConvexError("Invalid fuel type: ...")` and default empty strings safely to `"Battery Electric Vehicle (BEV / EV)"`.
  - **Source:** Codebase Fact (`convex/vehicles.ts:873-884`, `convex/vehicles.ts:1207-1209`)
- **Q4:** How should vehicle fuel types be displayed on vehicle detail pages without CSS distortion?
  - **A4:** The CSS class `capitalize` on fuel type text elements in `components/vehicles/vehicle-detail-client.tsx` (lines 319, 531) distorts uppercase acronyms like `(BEV / EV)` and `(ICE)`. The `capitalize` class must be removed, the fallback standardized to `"Battery Electric Vehicle (BEV / EV)"`, and the EV spec section gate updated to use the standard `isEVFuelType(vehicle.fuelType)` helper instead of fragile `.toLowerCase().includes("ev")`.
  - **Source:** Codebase Fact (`components/vehicles/vehicle-detail-client.tsx:319,477,531`)
- **Q5:** In `components/autoexports/bid-button.tsx`, how should custom bid and max bid minimum threshold validation error toasts format currency?
  - **A5:** Lines 205 and 273 invoked `formatCurrency(quickBidAmount)` without `{ currency, exchangeRates }`, ignoring user currency preferences and reverting to default NGN. Both must pass the active currency options.
  - **Source:** Codebase Fact (`components/autoexports/bid-button.tsx:205,273`)

### B. Interface & API Contracts
- **Q6:** What is the contract for `serveReport` in `pipeline/ui-server.mjs` when serving nested report files?
  - **A6:** `serveReport` must preserve relative subdirectories (e.g. `diagrams/map.html`) under the reports root rather than stripping them down to only the filename via `parts[parts.length - 1]`.
  - **Source:** Codebase Fact (`pipeline/ui-server.mjs:640-647`)
- **Q7:** How should runner auth probing in `pipeline/invocation.mjs` prevent slow CLI execution from timing out unit tests?
  - **A7:** `firstAuthenticatedRunner` in `pipeline/invocation.mjs` must cache probe results in memory so sequential calls do not repeatedly spawn external CLIs (`claude`, `cursor-agent`, `codex`, `agy`), which previously caused `pipeline/adapters.test.mjs` to exceed test timeouts.
  - **Source:** Codebase Fact (`pipeline/invocation.mjs:107-145`, `pipeline/adapters.test.mjs:272-277`)

### C. Storage & State Persistence
- **Q8:** Do any of these fixes require database migrations or schema alterations?
  - **A8:** No. The `vehicles` table in `convex/schema.ts` already defines `fuelType: v.optional(v.string())`.
  - **Source:** Codebase Fact (`convex/schema.ts:153`)

### D. Regression & Architectural Bounds
- **Q9:** What test suites verify these fixes?
  - **A9:** The pre-deployment test suite (`bun run test:predeploy`), unit tests for fuel types (`bun test tests/fuel-types.test.ts`), vehicle lifecycle tests (`bun test tests/backend/vehicles-lifecycle.test.ts`), and pipeline tests (`bun test pipeline/ui-server.test.mjs`, `bun test pipeline/adapters.test.mjs`).
  - **Source:** Codebase Fact (`scripts/run-predeployment-tests.ts`, `package.json`)

---

## 2. Technical Specification (PRD)

- **Objective:** Eliminate regressions and data loss bugs introduced in recent platform PRs across vendor vehicle editing, admin vehicle editing, Convex `updateVehicle` validation, detail page fuel type display, bid button currency formatting, and pipeline test harnesses.
- **Non-Goals:** Redesigning vehicle form wizard UI, altering Convex schema tables, or changing core auction bidding mechanics.
- **System Boundaries & Interfaces:**
  - `updateVehicle` in `convex/vehicles.ts`: Accepts `updates.fuelType?: string`. Validates against `ALL_ALLOWED_FUEL_TYPES`, throws `ConvexError` on invalid types, normalizes valid types.
  - `processSubmission` in `app/vendor/vehicles/[id]/edit/page.tsx`: Includes `fuelType: formData.fuelType` in `updates` payload.
  - `setFormData` in `components/admin/vehicles/vehicle-actions-modal.tsx`: Populates `fuelType: sourceVehicle.fuelType || "Battery Electric Vehicle (BEV / EV)"`.
  - `VehicleDetailClient` in `components/vehicles/vehicle-detail-client.tsx`: Uses `isEVFuelType(vehicle.fuelType)`, removes CSS `capitalize`, and falls back to `"Battery Electric Vehicle (BEV / EV)"`.
  - `BidButton` in `components/autoexports/bid-button.tsx`: Passes `{ currency, exchangeRates }` to `formatCurrency(quickBidAmount)` on lines 205 and 273.
  - `serveReport` in `pipeline/ui-server.mjs`: Retains directory hierarchy for files under `reports/`.
  - `firstAuthenticatedRunner` in `pipeline/invocation.mjs`: Memoizes probe results to eliminate test timeouts.
- **Data Validation & Error Protocols:**
  - Convex `updateVehicle` validates `fuelType` with `ALL_ALLOWED_FUEL_TYPES.has(...)`. Throws `ConvexError('Invalid fuel type: "${trimmed}".')` on mismatch.
  - Client toasts use `getMutationErrorMessage(error, ...)` for user-friendly error display.

### Edge Cases & Failure Modes

| # | Case | Trigger (input / timing / state) | Required behavior | Proven by |
|---|---|---|---|---|
| E1 | Vendor updates fuelType | Vendor changes fuel type on edit page and submits | Backend receives `updates.fuelType` and persists normalized value | `vendor_edit_persists_fuel_type` |
| E2 | Admin edits vehicle without changing fuelType | Admin opens modal for Hybrid vehicle and clicks save | `formData.fuelType` is initialized to vehicle's fuelType, not undefined | `admin_modal_initializes_fuel_type` |
| E3 | Invalid fuelType in updateVehicle | API caller sends `fuelType: "Rocket Fuel"` to `updateVehicle` | Throws `ConvexError` with message containing "Invalid fuel type" | `update_vehicle_rejects_invalid_fuel_type` |
| E4 | Empty fuelType in updateVehicle | API caller sends `fuelType: ""` or whitespace | Sets `fuelType` to `"Battery Electric Vehicle (BEV / EV)"` | `update_vehicle_handles_empty_fuel_type` |
| E5 | Fuel type display with acronyms | Vehicle detail page displays `(BEV / EV)` or `(ICE)` | Text rendered without CSS `capitalize` distortion | `detail_page_fuel_type_rendering` |
| E6 | Non-EV vehicle detail page | Vehicle is `Internal Combustion Engine (ICE)` | `isEVFuelType` returns false; EV-specific battery/charging blocks are hidden | `detail_page_ev_block_gating` |
| E7 | Custom bid below minimum in foreign currency | User with USD active submits custom bid below `quickBidAmount` | Toast error displays minimum amount formatted in USD | `bid_button_currency_toast` |
| E8 | Report diagram subpath request | HTTP GET `/api/report?run=r1&file=diagrams/map.html` | Serves `reports/diagrams/map.html` with HTTP 200 | `a diagram beside the report is served too` |
| E9 | Repeated resolvePoolRunner calls | Unit test runs `resolvePoolRunner` sequentially 3 times | Subprocess probe results are memoized, resolving instantly without timeout | `resolvePoolRunner never throws for auto/unset` |

- **Categories deliberately not applicable:**
  - authorization: existing RBAC auth checks in `updateVehicle` and `createVehicle` remain untouched and already enforce seller/admin permissions.

---

## 3. Tracer-Bullet Tickets

### Ticket 1: Fix Vendor & Admin Vehicle Edit Fuel Type Persistence & Validation
- **Goal:** Ensure vehicle fuel type updates in vendor edit page and admin actions modal are correctly initialized and saved, and enforce validation in `updateVehicle`.
- **Files:**
  - `app/vendor/vehicles/[id]/edit/page.tsx`
  - `components/admin/vehicles/vehicle-actions-modal.tsx`
  - `convex/vehicles.ts`
  - `tests/backend/vehicles-lifecycle.test.ts`
- **Verification Plan:**
  - `tests/backend/vehicles-lifecycle.test.ts` covers E1, E3, E4.
  - Run `bun test tests/backend/vehicles-lifecycle.test.ts`.
- **Dependencies:** None
- **Signatures:**
  - `updateVehicle` mutation validation block in `convex/vehicles.ts`.

### Ticket 2: Fix UI Detail Page Fuel Type Rendering & Bid Button Currency Toast
- **Goal:** Fix CSS text-transform distortion on fuel type display, use `isEVFuelType` helper in detail client, and format minimum bid validation toasts using active currency.
- **Files:**
  - `components/vehicles/vehicle-detail-client.tsx`
  - `components/autoexports/bid-button.tsx`
  - `tests/ui-forms/auth-forms.test.ts`
- **Verification Plan:**
  - Verify detail client and bid button formatting (E5, E6, E7).
  - Run `bun run type-check` and `bun run test:predeploy`.
- **Dependencies:** Ticket 1
- **Signatures:** None

### Ticket 3: Fix Pipeline Server Diagram Serving & CLI Probe Memoization
- **Goal:** Fix report diagram subpath routing in `ui-server.mjs`, memoize runner auth probing in `invocation.mjs`, and resolve consumer test harness paths in `installer.test.mjs`.
- **Files:**
  - `pipeline/ui-server.mjs`
  - `pipeline/invocation.mjs`
  - `pipeline/installer.test.mjs`
- **Verification Plan:**
  - Run `bun test pipeline/ui-server.test.mjs` (covers E8).
  - Run `bun test pipeline/adapters.test.mjs` (covers E9).
  - Run `bun test pipeline/installer.test.mjs`.
- **Dependencies:** None
- **Signatures:**
  - Memoized `firstAuthenticatedRunner` in `pipeline/invocation.mjs`.
