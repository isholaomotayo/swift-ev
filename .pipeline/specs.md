# TECHNICAL SPECIFICATION: Pass 2 UI & Onboarding Enhancements for SwiftEV

## 1. Alignment Log (Q&A)

### A. Domain & Business Logic
- **Q1:** What UI refinements are needed for vehicle inventory management and status filters?
  - **A1:** Extend vehicle management views to include tabbed/filtered inventory status lists (Approved, In Auction, Soft-Hold, Sold) and instant inventory update controls.
  - **Source:** Codebase Fact (`components/admin/vehicle-approvals-client.tsx`, `convex/vehicles.ts`)
- **Q2:** How should the homepage indicate dynamic / randomized listings?
  - **A2:** Add a subtle "Featured & Dynamic" badge on homepage listing headers so users know vehicle selections update dynamically on refresh.
  - **Source:** Codebase Fact (`convex/vehicles.ts:147-168`)
- **Q3:** How will the registration UI support payment-waived onboarding (Owenye MVP)?
  - **A3:** Add a promo code / fee waiver field (`feeWaiverCode`) in the registration form (`components/auth/register-form.tsx` or auth UI) with helper text for MVP invitees ("e.g. OWENYE_MVP").
  - **Source:** Codebase Fact (`convex/auth.ts:51-102`)
- **Q4:** How will admins view commission breakdowns (3% China Lead & Sales Facilitators) on orders?
  - **A4:** Add a Commission Breakdown card/badge in admin order detail views displaying China Import Lead commission and fractional rep allocations.
  - **Source:** Codebase Fact (`convex/orders.ts:1065-1175`)

### B. Interface & API Contracts
- **Q5:** What prop & API types are used?
  - **A5:** 
    - Registration form payload: `{ email, password, firstName, lastName, feeWaiverCode?: string, ... }`
    - Order Commission Badge: `{ chinaImportLeadCommission?: number, facilitatorCommissionAmount?: number, fractionalCommissions?: Array<{ role: string, sharePercent: number, amount: number }> }`

### C. Storage & State Persistence
- **Q6:** Are additional schema changes needed?
  - **A6:** Schema was updated in Pass 1 (`convex/schema.ts`). Pass 2 leverages existing fields (`verificationFeeStatus: "waived"`, order commission fields).

---

## 2. Technical Specification (PRD)

- **Objective:** Build front-end UI enhancements for vehicle inventory filters, homepage dynamic listing badges, payment-waived promo onboarding in registration forms, and admin order commission breakdowns.
- **System Boundaries & Interfaces:**
  - `components/auth/register-form.tsx`: Promo/Waiver code input field binding to `api.auth.register`.
  - `components/admin/order-commission-card.tsx`: Renders breakdown of 3% China Lead and fractional sales rep commissions.
  - `components/home/featured-vehicles.tsx`: Displays dynamic listing indicator.

---

## 3. Tracer-Bullet Tickets

### Ticket 1: Registration Form Promo Code & Payment Waiver Field
- **Goal:** Add promo code / waiver field to registration UI to enable free onboarding for MVP users ("Owenye").
- **Files:** `components/auth/register-form.tsx` (or related auth component)
- **Verification Plan:** Test entering `OWENYE_MVP` in registration form submits `feeWaiverCode` parameter.
- **Dependencies:** Pass 1 backend mutations

### Ticket 2: Admin Order Commission Breakdown UI Component
- **Goal:** Create visual commission breakdown component for admin order details showing China Import Lead 3% share and sales facilitator splits.
- **Files:** `components/admin/order-commission-card.tsx`
- **Verification Plan:** Verify component renders subtotal, 3% import lead commission, and fractional rep shares accurately.
- **Dependencies:** Pass 1 schema & mutations
