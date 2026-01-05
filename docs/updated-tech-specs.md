# AutoAuctions Africa — Technical Requirements Document

## Document Version: 2.0
## Document Type: Requirements & Specifications (No Code)

---

## Executive Summary

This document outlines the technical requirements, bug fixes, new features, and edge cases for the AutoAuctions Africa platform update. It serves as a specification for developers to implement the required changes.

**Platform Rebrand:** VoltBid Africa → AutoAuctions Africa

---

## Table of Contents

1. Critical Bug Fixes
2. New Feature Requirements
3. Updated User Flows
4. Database Schema Changes
5. Third-Party Integrations
6. Edge Cases & Error Handling
7. Testing Requirements
8. Deployment Checklist

---

## 1. Critical Bug Fixes

### 1.1 BUG-001: Account Type Selection Missing During Registration

**Priority:** Critical
**Affected Flow:** User Registration

**Problem Description:**
Users cannot select their account type (Individual, Dealer/Reseller, Corporate/Fleet) during registration. The selection is either not rendered or not functional.

**Expected Behavior:**
- User should see account type selection as the FIRST step of registration
- Three options for buyers: Individual, Dealer/Reseller, Corporate/Fleet
- Three options for sellers: Individual Seller, Dealer, Export Yard/Fleet
- Selected type should be visually highlighted
- Type must be stored in database and persist across sessions

**Root Cause Investigation Areas:**
1. Frontend: Check if AccountTypeStep component is rendered
2. State Management: Verify accountType field exists in form state
3. API: Confirm accountType is included in registration payload
4. Database: Ensure schema includes accountType field with correct union types
5. Validation: Check if backend validates and stores the field

**Acceptance Criteria:**
- [ ] Account type selection appears as Step 1 of registration
- [ ] All 6 account types are selectable (3 buyer + 3 seller)
- [ ] Selected type persists through registration flow
- [ ] Type is correctly stored in database
- [ ] Type displays correctly in user profile/dashboard
- [ ] Type affects feature access appropriately (dealer vs individual)

**Edge Cases:**
- User navigates back after selecting type — selection should persist
- User refreshes page mid-registration — handled gracefully (restart or restore)
- Invalid account type submitted via API — return clear error message

---

### 1.2 BUG-002: Authenticated Users Cannot Place Bids

**Priority:** Critical
**Affected Flow:** Bidding

**Problem Description:**
Users who are logged in receive a "Please log in to bid" prompt when attempting to place a bid. The system fails to recognize their authenticated state.

**Expected Behavior:**
- Authenticated users should see the bid form immediately
- Bid submission should succeed without re-authentication
- Session should persist across page navigation

**Root Cause Investigation Areas:**
1. Auth Context: Verify auth provider wraps bid components
2. Session Token: Check if token is passed in API requests
3. Token Expiry: Verify token refresh mechanism works
4. Convex Identity: Confirm ctx.auth.getUserIdentity() returns user
5. Database Lookup: Ensure user query by email succeeds
6. Component State: Check if auth state loads before render

**Acceptance Criteria:**
- [ ] Logged-in user sees bid form without login prompt
- [ ] Bid placement succeeds for authenticated users
- [ ] Session persists across page navigation
- [ ] Expired sessions redirect to login with return URL
- [ ] Clear error messages for auth failures

**Edge Cases:**
- Session expires mid-auction — prompt to re-login, preserve bid amount
- Multiple tabs with same session — all tabs should work
- User logs out in one tab — other tabs should detect and update
- Slow network — auth state should show loading, not logged-out state
- Token refresh fails — graceful degradation with re-login prompt

---

## 2. New Feature Requirements

### 2.1 FEAT-001: Wallet System with 10% Bidding Requirement

**Priority:** High
**Type:** New Feature

**Business Requirement:**
Users must have a wallet balance equal to at least 10% of any vehicle's value they wish to bid on. This ensures only serious bidders participate.

**Functional Requirements:**

**Wallet Dashboard:**
- Display available balance in Naira (₦)
- Show pending balance (deposits in transit)
- Show reserved balance (for active bids)
- Calculate and display "Maximum Bidding Power" (balance × 10)
- Transaction history with filters (deposits, withdrawals, payments)

**Funding Wallet:**
- Support multiple funding methods: Card, Bank Transfer, USSD
- Integration with Paystack for payments
- Instant balance update upon successful payment
- Email/SMS confirmation of deposits

**10% Requirement Enforcement:**
- Check wallet balance before allowing bid placement
- If balance < 10% of bid amount, block bid with clear message
- Show exact shortfall amount and "Fund Wallet" CTA
- Real-time balance check (not cached)

**Promotional Period:**
- Initial flat rate of ₦100,000 for new members
- Configurable via admin settings
- Automatic transition to 10% rule after promotion

**Database Requirements:**
- Add to users table: walletBalance, pendingBalance, reservedBalance, walletCurrency
- New table: walletTransactions (userId, type, amount, status, reference, timestamps)

**Edge Cases:**
- Concurrent bids depleting balance — use optimistic locking
- Payment succeeds but webhook fails — implement idempotent retries
- User bids, then withdraws funds — reserve balance on active bids
- Currency conversion (if USD vehicles) — use real-time exchange rates
- Negative balance (shouldn't happen) — alert admin, block transactions
- Partial wallet + card payment — support split payments for invoices

---

### 2.2 FEAT-002: Post-Registration KYC with Sumsub Integration

**Priority:** High
**Type:** New Feature

**Business Requirement:**
Users must complete identity verification (KYC) after registration before they can place bids. Integration with Sumsub for verification processing.

**Functional Requirements:**

**Verification Fee:**
- One-time $3 (₦4,500) fee required before KYC
- Payment via Paystack
- Fee status tracked: not_paid, pending, paid
- Cannot proceed to KYC without payment

**KYC Flow:**
1. User pays verification fee
2. Sumsub WebSDK launches in-app
3. User uploads government ID (front/back)
4. User takes selfie for face match
5. Dealers/Corporate: Additional business documents
6. Submission triggers Sumsub review
7. Webhook updates user status upon completion

**KYC Levels:**
- Basic (Individual): ID + Selfie
- Business (Dealer/Corporate): ID + Selfie + Business Registration + Dealer License

**Status Management:**
- not_started: New user, hasn't begun KYC
- pending: Documents submitted, under review
- approved: Verification successful, can bid
- rejected: Verification failed, can retry

**Notifications:**
- Email on KYC submission
- Email/SMS on approval
- Email on rejection with reason

**Database Requirements:**
- Add to users table: kycStatus, sumsubApplicantId, kycSubmittedAt, kycApprovedAt, kycRejectionReason, verificationFeeStatus, verificationFeePaidAt

**Edge Cases:**
- User closes browser mid-verification — allow resume
- Sumsub webhook fails — implement retry with exponential backoff
- Documents rejected — clear reason displayed, allow resubmission
- Name mismatch between ID and account — flag for manual review
- Expired documents — reject with specific message
- Multiple rejection attempts — escalate to support
- Business verification partial approval — handle individual vs business status separately

---

### 2.3 FEAT-003: 60-Second Anti-Sniping Rule

**Priority:** High
**Type:** New Feature

**Business Requirement:**
Each bid resets a 60-second countdown timer. The auction only ends when 60 seconds pass with no new bids. This prevents last-second sniping.

**Functional Requirements:**
- When a bid is placed with <60 seconds remaining, extend to 60 seconds
- Timer displays countdown in real-time to all viewers
- No maximum auction duration (could extend indefinitely)
- Clear visual indicator when timer is extended
- Notification to all watchers when extension occurs

**Technical Requirements:**
- Server-side timer management (not client-side)
- Real-time updates via Convex subscriptions
- Atomic bid + extension in single transaction
- Handle clock sync issues between server and clients

**Edge Cases:**
- Simultaneous bids at exact same moment — first to database wins
- Network delay causes bid after timer expires — reject gracefully
- Server restart mid-auction — restore timer state from database
- Thousands of users watching — optimize broadcast performance
- Timer drift between clients — server is source of truth

---

### 2.4 FEAT-004: Buy Now with Auction Fallback

**Priority:** Medium
**Type:** New Feature

**Business Requirement:**
Sellers can set a "Buy Now" price. If not purchased before the scheduled auction date, the vehicle automatically enters live bidding.

**Functional Requirements:**
- Seller sets Buy Now price during listing
- Buyer can purchase immediately at Buy Now price
- Buy Now disabled once live auction starts
- Automatic transition to auction at scheduled time
- Seller must accept bids within their specified margin

**Edge Cases:**
- Buy Now purchased seconds before auction start — honor Buy Now
- Multiple users click Buy Now simultaneously — first payment wins
- Buy Now price lower than starting bid — validation error
- Seller wants to remove Buy Now mid-listing — allow with restrictions

---

### 2.5 FEAT-005: Additional Services Module

**Priority:** Medium
**Type:** New Feature

**Services to Implement:**
1. Shipping (Container/RoRo)
2. Customs Clearing
3. Vehicle Registration & Plate Number
4. Pre-Purchase Inspection
5. Insurance
6. Spare Parts Network
7. Financing Partners

**Functional Requirements:**
- Services selectable during checkout (post-auction win)
- Each service has: name, description, estimated cost, timeline
- Status tracking per service
- Integration with order management
- Separate invoicing per service (optional)

**Database Requirements:**
- New table: additionalServices (orderId, userId, serviceType, status, cost, timestamps)
- Service configurations (admin-managed pricing)

---

### 2.6 FEAT-006: Dispute Resolution Center

**Priority:** Medium
**Type:** New Feature

**Dispute Types:**
- Vehicle not as described
- Documents missing
- Seller failed to release
- Shipping delay
- Damage in transit
- Other

**Functional Requirements:**
- Report issue within 24-72 hours (configurable per type)
- Evidence upload (photos, videos, documents)
- Both parties can respond
- Admin review workflow
- Resolution outcomes: Full refund, Partial refund, Repair credit, Rejected
- Automatic escrow hold during dispute

**Database Requirements:**
- New table: disputes (orderId, reporterId, disputeType, description, evidenceUrls, status, resolution, timestamps)

---

### 2.7 FEAT-007: FAQ Page

**Priority:** Low
**Type:** New Feature

**Requirements:**
- Implement full FAQ as specified in brand document
- Categories: General, Buyers, Sellers, Payments & Security, Shipping & Clearing, Account & Verification, Disputes & Issues
- Expandable/collapsible answers
- Search functionality
- Link to related help articles

---

### 2.8 FEAT-008: Member Guide Page

**Priority:** Low
**Type:** New Feature

**Requirements:**
- Comprehensive guide modeled on Copart's member guide
- Sections: Getting Started, Understanding the Auction, Bidding Basics, Winning & Payment, Shipping & Delivery, Seller Guide, Fees & Costs, Trust & Safety, FAQs
- Anchor navigation
- Printable version
- Video tutorials (future enhancement)

---

## 3. Updated User Flows

### 3.1 Buyer Registration Flow

```
1. Click "Start Bidding"
2. Select Account Type (Individual/Dealer/Corporate) [BUG FIX]
3. Enter Basic Info (Email, Phone, Name, Location, Password)
4. Verify Phone via OTP
5. Pay $3 Verification Fee [NEW]
6. Account Created (Limited Access)
7. Complete KYC via Sumsub [NEW]
8. KYC Approved (24-48 hours)
9. Fund Wallet [NEW]
10. Ready to Bid
```

### 3.2 Bidding Flow

```
Pre-Bid Checks:
├── Is user logged in? → If no, redirect to login
├── Is KYC approved? → If no, redirect to KYC page
├── Is wallet balance ≥ 10% of bid? → If no, show fund wallet prompt
└── All checks pass → Show bid form

Bid Placement:
├── User enters bid amount
├── Validate bid ≥ minimum increment
├── Validate auction and lot are active
├── Place bid (atomic transaction)
├── Update lot with new high bid
├── Apply 60-second extension if needed
└── Notify outbid users

Auction End:
├── Timer expires (no bids for 60 seconds)
├── Determine winner
├── Generate invoice
├── Start 72-hour payment deadline
└── Send notifications
```

### 3.3 Seller Flow

```
1. Click "List a Vehicle"
2. Select Seller Type (Individual/Dealer/Fleet)
3. Create Account + OTP Verification
4. Complete Seller Verification (ID, Business Docs, Bank Setup)
5. Create Listing:
   - Vehicle Details (VIN, Make, Model, Year, Mileage, Condition)
   - Media Upload (8+ exterior, 4+ interior, engine video REQUIRED, dashboard video REQUIRED)
   - Documents (Title, Export Docs)
   - Selling Method (Auction with/without reserve, Buy Now)
   - Schedule (Start time, Duration, Reserve price)
6. Submit for Review
7. Listing Approved/Needs Corrections/Rejected
8. Auction Goes Live
9. Manage Auction (Track bids, Answer questions)
10. Sale Completes → Release Vehicle → Receive Payout
```

---

## 4. Database Schema Changes

### 4.1 Users Table Updates

**New Fields:**
- accountType (union: individual, dealer, corporate, seller_individual, seller_dealer, seller_fleet)
- walletBalance (number, in kobo)
- walletCurrency (string, default "NGN")
- pendingBalance (number)
- reservedBalance (number)
- kycStatus (union: not_started, pending, approved, rejected)
- sumsubApplicantId (string, optional)
- kycSubmittedAt (number, optional)
- kycApprovedAt (number, optional)
- kycRejectionReason (string, optional)
- verificationFeeStatus (union: not_paid, pending, paid)
- verificationFeeReference (string, optional)
- verificationFeePaidAt (number, optional)

**New Indexes:**
- by_kyc_status
- by_account_type
- by_sumsub_applicant_id

### 4.2 New Tables

**walletTransactions:**
- userId (reference to users)
- type (union: deposit, withdrawal, bid_reserve, bid_release, payment, refund, fee)
- amount (number, in kobo)
- currency (string)
- status (union: pending, completed, failed, reversed)
- reference (string, unique)
- description (string)
- relatedOrderId (optional reference)
- relatedBidId (optional reference)
- paymentProvider (string, optional)
- paymentReference (string, optional)
- createdAt (number)
- completedAt (number, optional)

**additionalServices:**
- orderId (reference to orders)
- userId (reference to users)
- serviceType (union: shipping_container, shipping_roro, customs_clearing, registration, plate_number, inspection, insurance, delivery)
- status (union: pending, in_progress, completed, cancelled)
- cost (number)
- currency (string)
- notes (string, optional)
- startedAt (number, optional)
- completedAt (number, optional)
- createdAt (number)

**disputes:**
- orderId (reference to orders)
- reporterId (reference to users)
- respondentId (reference to users, optional)
- disputeType (union: not_as_described, documents_missing, seller_failed_release, shipping_delay, damage_in_transit, other)
- description (string)
- evidenceUrls (array of strings)
- status (union: open, under_review, resolved, rejected)
- resolution (union: full_refund, partial_refund, repair_credit, rejected, other)
- resolutionNotes (string, optional)
- refundAmount (number, optional)
- createdAt (number)
- resolvedAt (number, optional)
- resolvedBy (reference to users, optional)

**vehicleQna:**
- vehicleId (reference to vehicles)
- askerId (reference to users)
- question (string)
- answer (string, optional)
- answeredBy (reference to users, optional)
- answeredAt (number, optional)
- isPublic (boolean)
- createdAt (number)

---

## 5. Third-Party Integrations

### 5.1 Sumsub (KYC Provider)

**Integration Points:**
- Create access token for WebSDK
- WebSDK embedded in React component
- Webhook endpoint for verification status updates

**Required Credentials:**
- SUMSUB_APP_TOKEN
- SUMSUB_SECRET_KEY

**Webhook Events:**
- applicantReviewed (main event for status updates)
- applicantPending
- applicantCreated

**Security:**
- Verify webhook signatures using HMAC-SHA256
- Store applicantId for user lookup

### 5.2 Paystack (Payments)

**Use Cases:**
- Wallet funding
- Verification fee payment
- Order payments

**Webhook Events:**
- charge.success
- charge.failed
- transfer.success
- transfer.failed

**Security:**
- Verify webhook signatures using HMAC-SHA512
- Idempotent transaction processing

### 5.3 Flutterwave (Escrow Partner)

**Use Cases:**
- Escrow account for order payments
- Seller payouts
- Refund processing

---

## 6. Edge Cases & Error Handling

### 6.1 Registration Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Email already registered | "Email already in use. Please login or use a different email." |
| Phone already registered | "Phone number already in use." |
| Invalid email format | "Please enter a valid email address." |
| Weak password | "Password must be at least 8 characters with one number and symbol." |
| OTP expired | "Code expired. Please request a new one." |
| OTP incorrect 3 times | Temporary lockout (5 minutes) |
| Payment fails for verification fee | "Payment failed. Please try again or use a different method." |
| Browser closed mid-registration | Allow resume from last completed step |

### 6.2 Bidding Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Wallet balance exactly 10% | Allow bid |
| Wallet balance 9.99% | Block bid with shortfall message |
| KYC pending | "Your verification is in progress. You'll be able to bid once approved." |
| KYC rejected | "Your verification was not successful. Please retry." |
| Bid below minimum increment | "Minimum bid is ₦X. Your bid must be at least ₦Y." |
| Bid on own listing | "You cannot bid on your own listing." |
| Already highest bidder | "You are already the highest bidder." |
| Auction ended | "This auction has ended." |
| Lot not active | "This vehicle is not currently available for bidding." |
| Network timeout during bid | Show retry option, check if bid was placed |
| Concurrent bids same amount | First to reach server wins |
| Session expires mid-bid | Prompt re-login, preserve bid amount in URL params |

### 6.3 Payment Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Payment succeeds, webhook fails | Retry webhook processing, eventually consistent |
| Duplicate payment attempt | Idempotent - don't double-charge |
| Partial payment | Track paid amount, show remaining balance |
| Payment deadline passed | Apply late fee, notify user |
| 72 hours passed, no payment | Cancel order, apply penalties, re-list vehicle |
| Refund requested mid-shipping | Handle based on shipping status |
| Currency conversion needed | Use real-time rates, show both amounts |

### 6.4 Auction Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| No bids at auction end | Mark as "No Sale", return to seller |
| Reserve not met | Seller can accept, reject, or counter |
| Seller rejects highest bid | Notify bidder, offer second chance |
| Buy Now + Auction conflict | Buy Now disabled once auction starts |
| Auction extended 100+ times | No limit, but track for analytics |
| Server restart mid-auction | Restore state from database |

---

## 7. Testing Requirements

### 7.1 Unit Tests

**Registration:**
- Account type validation
- Email format validation
- Password strength validation
- OTP generation and verification
- Verification fee processing

**Wallet:**
- Balance calculation
- 10% requirement check
- Transaction creation
- Funding process

**Bidding:**
- Pre-bid validation
- Bid placement
- Outbid notification
- Timer extension logic
- Auction end determination

**KYC:**
- Sumsub token generation
- Webhook signature verification
- Status updates

### 7.2 Integration Tests

- Complete registration flow (all steps)
- Complete bidding flow (place bid → win → pay)
- Wallet funding via Paystack
- KYC verification via Sumsub
- Order fulfillment with additional services

### 7.3 End-to-End Tests

- New user: Register → Verify → Fund → Bid → Win → Pay → Receive
- Seller: Register → Verify → List → Manage Auction → Get Paid
- Dispute: Report → Review → Resolution

### 7.4 Load Testing

- Concurrent bids (100+ users bidding simultaneously)
- Real-time timer updates (1000+ viewers)
- Webhook processing (high volume)

---

## 8. Deployment Checklist

### 8.1 Pre-Deployment

- [ ] Database migrations applied
- [ ] New environment variables configured:
  - SUMSUB_APP_TOKEN
  - SUMSUB_SECRET_KEY
  - All existing Paystack/Flutterwave keys
- [ ] Webhook endpoints configured in provider dashboards
- [ ] Feature flags set for gradual rollout
- [ ] Backup database before deployment

### 8.2 Deployment Steps

1. Deploy database schema changes
2. Deploy backend functions (Convex)
3. Deploy frontend updates
4. Configure Sumsub webhook URL
5. Verify Paystack webhook URL
6. Enable new features via feature flags
7. Monitor error rates and performance

### 8.3 Post-Deployment Verification

- [ ] Registration flow works end-to-end
- [ ] Account type selection works [BUG FIX]
- [ ] Logged-in users can bid [BUG FIX]
- [ ] Wallet funding works
- [ ] KYC flow works
- [ ] 10% balance check works
- [ ] Webhooks processing correctly
- [ ] Notifications sending
- [ ] All pages load without errors

### 8.4 Rollback Plan

- Keep previous version deployable
- Database migrations should be backward compatible
- Feature flags allow instant disable of new features
- Monitor for 24 hours before removing rollback capability

---

## 9. Documentation Links

Upon completion, the following documentation should be available:

- **Brand & Copy Guide:** `/docs/autoauctions-africa-brand-copy-guide.md`
- **Technical Requirements:** This document
- **API Documentation:** Auto-generated from Convex schema
- **User Guides:** Member Guide page on website
- **FAQ:** FAQ page on website

---

## 10. Success Metrics

**Bug Fixes:**
- 0% of users unable to select account type
- 0% of authenticated users blocked from bidding incorrectly

**New Features:**
- 90%+ KYC completion rate within 7 days of registration
- 80%+ wallet funding success rate
- <1% disputed auctions
- 95%+ satisfaction with 60-second rule fairness

**Performance:**
- Bid placement < 500ms
- Timer updates < 100ms latency
- Webhook processing < 5 seconds
- Page load < 3 seconds

---

*Document Version: 2.0*
*Platform: AutoAuctions Africa*
*Last Updated: January 2026*