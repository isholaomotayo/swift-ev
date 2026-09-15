# TECHNICAL SPECIFICATION: SwiftEV Feature Updates, Owenye Onboarding & Fractionalized Commission Structure

## 1. Alignment Log (Q&A)

### A. Domain & Business Logic
- **Q1:** How should vehicle inventory updates be handled for sellers and admins, and what fields are eligible for updating?
  - **A1:** Extend update mutations in `convex/vehicles.ts` to allow sellers and admins to update inventory status, stock levels, odometer readings, and condition descriptions while preserving admin oversight and status transitions.
  - **Source:** Codebase Fact (`convex/vehicles.ts:975-1045`)
- **Q2:** How should home page vehicle listings be randomized so they do not present static results on every page load?
  - **A2:** Update `getFeaturedVehicles` in `convex/vehicles.ts` to support pseudo-randomized shuffling or seed-based deterministic sampling of active, buyer-visible listings rather than strict fixed `createdAt` ordering.
  - **Source:** Codebase Fact (`convex/vehicles.ts:147-168`)
- **Q3:** How do we onboard users like "Owenye" without requiring an initial verification/membership payment?
  - **A3:** Introduce a payment waiver mechanism (`verificationFeeStatus: "waived"`, waiver promo codes, or admin waiver mutation) in `convex/auth.ts` and `convex/schema.ts` so specific users can bypass initial fee hurdles to launch the MVP.
  - **Source:** Codebase Fact (`convex/auth.ts:102`, `convex/schema.ts:95-101`)

### B. Interface & API Contracts
- **Q4:** What fields and parameters are needed to support fractionalized sales facilitator commissions and 3% China Import Lead commission?
  - **A4:** Add `chinaImportLeadCommission` (3% calculation), `facilitatorId`, `facilitatorCommissionPercent`, `facilitatorCommissionAmount`, and `fractionalCommissions` array to `orders` in `convex/schema.ts` and update order creation/calculation logic in `convex/orders.ts`.
  - **Source:** Engineering Assumption based on `convex/schema.ts:468-537` and transaction requirements

### C. Storage & State Persistence
- **Q5:** What schema additions are required in `convex/schema.ts`?
  - **A5:** 
    1. In `users`: Add `"waived"` to `verificationFeeStatus` union.
    2. In `orders`: Add optional `chinaImportCommission`, `facilitatorId`, `facilitatorCommissionRate`, `facilitatorCommissionAmount`, and `fractionalCommissions` fields.
    3. Create `commissions` table for ledgering payouts.
  - **Source:** Codebase Fact (`convex/schema.ts:95-101`, `convex/schema.ts:468-537`)

### D. Regression & Architectural Bounds
- **Q6:** Will home page randomization break existing search or pagination guarantees?
  - **A6:** No; `getFeaturedVehicles` is used strictly for homepage spotlight listings. Standard inventory search with pagination (`listVehicles`) retains index-based sorting.
  - **Source:** Codebase Fact (`convex/vehicles.ts:200-250`)

---

## 2. Technical Specification (PRD)

- **Objective:** Implement actionable technical updates for vehicle inventory management, homepage listing randomization, payment-waived user onboarding (Owenye MVP), and fractionalized sales facilitator / import lead commission calculations.
- **System Boundaries & Interfaces:**
  - `convex/vehicles.ts`: `getFeaturedVehicles({ shuffle?: boolean, limit?: number })`, `updateVehicleInventory(token, vehicleId, updates)`
  - `convex/auth.ts`: `register({ ..., promoCode?: string, waivePayment?: boolean })`, `waiveUserVerificationFee(token, userId)`
  - `convex/orders.ts`: `calculateOrderCommissions(subtotal, options)`
- **Edge Cases & Security Targets:**
  - Non-admin users cannot grant themselves payment waivers without a valid promo code or admin token.
  - Commission totals must not exceed maximum platform margin bounds.
  - Homepage shuffle must fallback gracefully when inventory count is small.
- **Data Validation & Error Protocols:**
  - Validate `verificationFeeStatus` transitions via Convex schema unions.
  - Return clear ConvexErrors for invalid commission rates or unauthorized inventory edits.

---

## 3. Tracer-Bullet Tickets

### Ticket 1: Schema Updates for Payment Waivers & Fractionalized Commissions
- **Goal:** Update `convex/schema.ts` to support `"waived"` verification fee status and commission breakdown fields on `orders`.
- **Files:** `convex/schema.ts`
- **Verification Plan:** Verify Convex schema compiles cleanly with TypeScript / typecheck.
- **Dependencies:** None
- **Signatures:** Extended `users.verificationFeeStatus` and `orders` commission fields.

### Ticket 2: Vehicle Inventory Updates & Homepage Listing Randomization
- **Goal:** Update `convex/vehicles.ts` with randomized home page listing query and seller/admin inventory update helpers.
- **Files:** `convex/vehicles.ts`
- **Verification Plan:** Test `getFeaturedVehicles` returns randomized items on requests; verify inventory update mutation executes.
- **Dependencies:** Ticket 1

### Ticket 3: Payment-Waived Onboarding Flow ("Owenye" MVP)
- **Goal:** Implement registration payment waiver and `waiveUserVerificationFee` mutation in `convex/auth.ts`.
- **Files:** `convex/auth.ts`
- **Verification Plan:** Test registering a user with waiver code / admin waiver mutation sets `verificationFeeStatus: "waived"` and activates account without requiring payment.
- **Dependencies:** Ticket 1

### Ticket 4: Fractionalized Sales Facilitator & China Import Lead Commission Logic
- **Goal:** Implement commission calculation logic (3% China Import Lead + fractional rep splits) during order creation and listing.
- **Files:** `convex/orders.ts`
- **Verification Plan:** Unit test order creation with facilitator ID and China lead flag; verify commission amounts computed accurately.
- **Dependencies:** Ticket 1
