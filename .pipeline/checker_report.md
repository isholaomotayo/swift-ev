## Verification Status
- Overall Status: PASS
- Total Tests Passed: unknown
- Total Tests Failed: unknown

## Test Executions
### Linter Output
```
1:7  warning  'actionTypes' is assigned a value but only used as a type  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/lib/csv-export.ts
   1:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   3:30  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
   9:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  28:33  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  45:18  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  49:25  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/lib/vehicle-catalog.ts
  2:27  warning  'formatCanonicalName' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/bridge.test.mjs
  323:11  warning  'p' is assigned a value but never used       @typescript-eslint/no-unused-vars
  443:14  warning  'status' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/host-hooks.test.mjs
  104:9  warning  'claimed' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/installer.mjs
  299:54  warning  'homeDir' is assigned a value but never used    @typescript-eslint/no-unused-vars
  299:78  warning  'timeoutMs' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/installer.test.mjs
  11:47  warning  'remoteLatestTag' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/orchestrator.mjs
    14:10  warning  'execSync' is defined but never used           @typescript-eslint/no-unused-vars
    14:20  warning  'spawnSync' is defined but never used          @typescript-eslint/no-unused-vars
  1493:9   warning  'reviewer' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/pool.mjs
   16:34  warning  'appendLine' is defined but never used                                 @typescript-eslint/no-unused-vars
  435:31  warning  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
  436:36  warning  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions

/Users/omotayoishola/dev/swiftEv/pipeline/report.mjs
  233:28  warning  'testSuite' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/roadmap.test.mjs
  5:88  warning  'POOL_RUNNERS' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/router.mjs
  110:12  warning  'err' is defined but never used  @typescript-eslint/no-unused-vars
  124:14  warning  'err' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/skills.test.mjs
    8:26  warning  'resolveSkillDir' is defined but never used  @typescript-eslint/no-unused-vars
    8:43  warning  'hashSkillTree' is defined but never used    @typescript-eslint/no-unused-vars
  237:27  warning  'paths' is assigned a value but never used   @typescript-eslint/no-unused-vars
  254:27  warning  'paths' is assigned a value but never used   @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/supervisor.mjs
  26:60  warning  'pidAlive' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/ui-server.mjs
  273:20  warning  'totalCost' is assigned a value but never used    @typescript-eslint/no-unused-vars
  273:31  warning  'costPartial' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/ui-server.test.mjs
  281:97   warning  'port' is defined but never used  @typescript-eslint/no-unused-vars
  315:113  warning  'root' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/ui/main.mjs
  974:62  warning  'meta' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/pipeline/ui/ui.test.mjs
  5:33  warning  'MAX_TABS' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/proxy.ts
  9:59  warning  'paraglideRequest' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/scripts/extract-strings.ts
  156:32  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  215:40  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/scripts/safe-i18n.ts
    3:13  warning  'path' is defined but never used                  @typescript-eslint/no-unused-vars
   58:28  warning  Unexpected any. Specify a different type          @typescript-eslint/no-explicit-any
  133:19  warning  'placeholder' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/scripts/translate-messages.ts
   48:14  warning  'error' is defined but never used         @typescript-eslint/no-unused-vars
   48:21  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  107:14  warning  'error' is defined but never used         @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/tests/auctions.test.ts
  124:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  185:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  274:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  432:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  458:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  484:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  545:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  675:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/auth.test.ts
  127:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/backend/kyc-rbac-security.test.ts
   33:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  112:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  123:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/backend/orders-checkout-engine.test.ts
  51:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/backend/vehicles-lifecycle.test.ts
   65:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  110:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  253:23  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  263:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  332:22  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  341:17  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/backend/wallet-ledger.test.ts
  38:37  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  38:48  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  58:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/bids.test.ts
    9:7   warning  'adminToken' is assigned a value but never used  @typescript-eslint/no-unused-vars
  144:16  warning  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  242:16  warning  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  349:16  warning  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any
  392:16  warning  Unexpected any. Specify a different type         @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/e2e/journey-admin-mail-review.test.ts
  34:11  warning  'buyRes' is assigned a value but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/tests/e2e/journey-buy-now-instant-purchase.test.ts
  73:37  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  73:48  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  93:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/e2e/journey-kyc-verification-flow.test.ts
  110:37  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  110:48  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  130:11  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/e2e/journey-seller-to-buyer-auction.test.ts
  6:3  warning  'seedTestVehicle' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/tests/fuel-types.test.ts
  8:3  warning  'CANONICAL_FUEL_TYPES' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/tests/orders.test.ts
  280:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  336:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/setup-test-guard.ts
  48:52  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  48:57  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  48:62  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  67:67  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  67:75  warning  'args' is defined but never used          @typescript-eslint/no-unused-vars
  67:81  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  69:6   warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/users.test.ts
  191:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  262:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  322:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  361:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  449:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

/Users/omotayoishola/dev/swiftEv/tests/vehicle-dedup.test.ts
  4:3  warning  'cleanText' is defined but never used  @typescript-eslint/no-unused-vars

/Users/omotayoishola/dev/swiftEv/tests/vehicles.test.ts
  257:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  383:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  472:16  warning  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

✖ 600 problems (0 errors, 600 warnings)
  0 errors and 4 warnings potentially fixable with the `--fix` option.
[... truncated, showing last portion]
```

### Type-Checker Output
```
(no output)
```

### Test Suite Output
```
y Management (In-Memory Hermetic) > seller uploads vehicle -> pending_approval -> admin approves -> status is approved [2.18ms]
(pass) Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic) > buyer cannot upload vehicle (seller role required) [0.47ms]
(pass) Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic) > admin rejects pending vehicle with reason [0.77ms]
(pass) Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic) > catalog management and deduplication allows adding novel make and models with collision prevention [6.87ms]
(pass) Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic) > vendor can upload vehicles with various canonical and legacy fuel types, and invalid ones are rejected [2.20ms]
(pass) Backend Vehicle Lifecycle & Inventory Management (In-Memory Hermetic) > vendor can update vehicle fuel type with normalization and invalid values are rejected [2.21ms]

tests/backend/auctions-live-engine.test.ts:
(pass) Backend Live Auction & Bidding Engine (In-Memory Hermetic) > complete live sequential auction lifecycle: create, add lots, start, live bids, proxy bids, auto-advance, winning order [15.41ms]
(pass) Backend Live Auction & Bidding Engine (In-Memory Hermetic) > timed concurrent auction mode activates all lots in parallel [1.94ms]
(pass) Backend Live Auction & Bidding Engine (In-Memory Hermetic) > unsold lot transitions vehicle status to unsold and handles no bids [1.43ms]

tests/backend/orders-checkout-engine.test.ts:
(pass) Backend Orders, Checkout, Payments & Logistics Engine (In-Memory Hermetic) > direct Buy-Now purchase -> soft-hold payment_pending -> pay from wallet -> logistics tracking -> gate pass generation [4.60ms]

tests/ui-forms/admin-live-controls.test.ts:
(pass) Admin Live Auction Controls & Currency Formatting (Client-Side Logic) > formatCurrency converts NGN amounts to USD, CNY, GBP correctly [0.78ms]
(pass) Admin Live Auction Controls & Currency Formatting (Client-Side Logic) > membership tier limits enforce daily bids and buying power gates [0.02ms]

tests/ui-forms/vendor-vehicle-wizard.test.ts:
(pass) Vendor Vehicle Listing Wizard Form Actions (Client-Side Logic) > sanitizes standard EV vehicle submission payload [0.04ms]
(pass) Vendor Vehicle Listing Wizard Form Actions (Client-Side Logic) > handles custom make and custom battery type fields when 'Other' selected [0.02ms]
(pass) Vendor Vehicle Listing Wizard Form Actions (Client-Side Logic) > validates newly added models dynamically without static catalog mismatch [0.23ms]

tests/ui-forms/checkout-payment-panel.test.ts:
(pass) Checkout Payment Panel & Pricing Logic (Client-Side Logic) > tiered platform service fee calculations [0.02ms]
(pass) Checkout Payment Panel & Pricing Logic (Client-Side Logic) > calculates comprehensive Buy Now all-in checkout breakdown [0.03ms]
(pass) Checkout Payment Panel & Pricing Logic (Client-Side Logic) > destination label parser extracts valid port keys [0.02ms]

tests/ui-forms/auth-forms.test.ts:
(pass) UI Form Actions & Auth Validation (Client-Side Logic) > getSafeRedirectPath prevents open-redirect vulnerabilities [0.04ms]
(pass) UI Form Actions & Auth Validation (Client-Side Logic) > getRoleHomePath maps roles to appropriate landing dashboard [0.02ms]
(pass) UI Form Actions & Auth Validation (Client-Side Logic) > getAuthErrorMessage and getMutationErrorMessage format system errors into user-friendly notices [0.07ms]
(pass) UI Form Actions & Auth Validation (Client-Side Logic) > enum validators filter out illegitimate payloads [0.04ms]

tests/e2e/journey-admin-mail-review.test.ts:
(pass) E2E Journey: Admin Mail Review System & Interception Safeguard > emails queued during transactions are inspectable, editable, and approvable by admins [3.05ms]

tests/e2e/journey-kyc-verification-flow.test.ts:
(pass) E2E Journey: KYC Document Verification, Admin Approval & Gated Bidding Flow > unfunded / suspended user is blocked from bidding -> submits KYC -> admin approves -> funds wallet -> bidding enabled [4.58ms]

tests/e2e/journey-seller-to-buyer-auction.test.ts:
(pass) E2E Journey: Seller Listing to Live Auction Bidding to Checkout & Gate Pass Release > end-to-end multi-actor lifecycle across Seller, Buyer 1, Buyer 2, Admin, and Security Officer [4.51ms]

tests/e2e/journey-dispute-resolution.test.ts:
(pass) E2E Journey: Buyer Dispute Filing, Evidence Submission & Admin Arbitration > complete dispute lifecycle: order delivery -> dispute filing -> admin evidence review -> resolution refund [2.09ms]

tests/e2e/journey-buy-now-instant-purchase.test.ts:
(pass) E2E Journey: Direct Buy-Now Instant Purchase & Settlement Flow > complete instant purchase lifecycle with deposit funding and delivery settlement [3.33ms]

70 tests skipped:
(skip) Bids > placeBid [convex writes blocked] > user can place a bid on active lot
(skip) Bids > placeBid [convex writes blocked] > fails with bid below minimum
(skip) Bids > placeBid [convex writes blocked] > fails on inactive lot
(skip) Bids > placeBid [convex writes blocked] > fails without authentication
(skip) Bids > placeBid [convex writes blocked] > fails for inactive user
(skip) Bids > setMaxBid [convex writes blocked] > user can set max bid
(skip) Bids > setMaxBid [convex writes blocked] > fails with max bid below minimum
(skip) Bids > setMaxBid [convex writes blocked] > fails on inactive lot
(skip) Bids > setMaxBid [convex writes blocked] > can update existing max bid
(skip) Bids > cancelMaxBid [convex writes blocked] > user can cancel their max bid
(skip) Bids > cancelMaxBid [convex writes blocked] > fails without authentication
(skip) Bids > execution mode bid rules and privacy [convex writes blocked] > public bid feed exposes first name only
(skip) Bids > execution mode bid rules and privacy [convex writes blocked] > live sequential rejects bids on pending future lots
(skip) Bids > execution mode bid rules and privacy [convex writes blocked] > timed concurrent allows bidding on multiple active lots
(skip) Bids > execution mode bid rules and privacy [convex writes blocked] > rejects bids on closed lots
(skip) Users > updateUserRole [convex writes blocked] > superadmin can update user role
(skip) Users > updateUserRole [convex writes blocked] > admin cannot update user role
(skip) Users > updateUserRole [convex writes blocked] > cannot change own role
(skip) Users > updateUserRole [convex writes blocked] > returns error for non-existent user
(skip) Users > updateUserStatus [convex writes blocked] > admin can update user status
(skip) Users > updateUserStatus [convex writes blocked] > cannot change own status
(skip) Users > updateUserStatus [convex writes blocked] > non-admin cannot update user status
(skip) Users > updateKYCStatus [convex writes blocked] > admin can update KYC status
(skip) Users > updateKYCStatus [convex writes blocked] > non-admin cannot update KYC status
(skip) Users > updateKYCStatus [convex writes blocked] > returns error for non-existent user
(skip) Users > updateMembershipTier [convex writes blocked] > admin can update membership tier
(skip) Users > updateMembershipTier [convex writes blocked] > non-admin cannot update membership tier
(skip) Users > updateMembershipTier [convex writes blocked] > returns error for non-existent user
(skip) Users > autoApproveAllPendingUsers [convex writes blocked] > admin can trigger auto-approve pending users
(skip) Users > autoApproveAllPendingUsers [convex writes blocked] > non-admin cannot trigger batch auto-approve
(skip) Authentication > Logout [convex writes blocked] > successfully logs out user
(skip) Auctions > createAuction [convex writes blocked] > admin can create auction
(skip) Auctions > createAuction [convex writes blocked] > requires scheduledStart
(skip) Auctions > createAuction [convex writes blocked] > non-admin cannot create auction
(skip) Auctions > createAuction [convex writes blocked] > requires valid session token
(skip) Auctions > addLotToAuction [convex writes blocked] > admin can add lot to auction
(skip) Auctions > addLotToAuction [convex writes blocked] > non-admin cannot add lot
(skip) Auctions > createAuctionWithLots [convex writes blocked] > admin can create auction with multiple lots in 1 atomic mutation
(skip) Auctions > createAuctionWithLots [convex writes blocked] > rejects duplicate lot orders in batch payload
(skip) Auctions > startAuction [convex writes blocked] > admin can start auction
(skip) Auctions > startAuction [convex writes blocked] > non-admin cannot start auction
(skip) Auctions > pauseAuction [convex writes blocked] > admin can pause auction
(skip) Auctions > pauseAuction [convex writes blocked] > non-admin cannot pause auction
(skip) Auctions > advanceLot [convex writes blocked] > admin can advance to next lot
(skip) Auctions > advanceLot [convex writes blocked] > non-admin cannot advance lot
(skip) Auctions > deleteAuction and getAuctionDeletePreview [convex writes blocked] > non-admin cannot delete auction or preview deletion
(skip) Auctions > deleteAuction and getAuctionDeletePreview [convex writes blocked] > admin can preview and safely delete an auction, resetting vehicle status
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > live start activates only the first pending lot
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > timed start activates every pending lot concurrently
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > advanceLot is rejected for timed auctions
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > force-closing one timed lot does not end auction while others remain active
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > auction type can be edited only while scheduled
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > public room omits reserve, emails, and user ids
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > sequential no-sale auto-advances to the next pending lot by default
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > closing a lot with bids awards the high bidder then auto-advances
(skip) Auctions > execution modes (live sequential vs timed concurrent) [convex writes blocked] > sequential auction with auto-advance off does not open the next lot
(skip) Orders > updateOrderStatus [convex writes blocked] > admin can update order status
(skip) Orders > updateOrderStatus [convex writes blocked] > non-admin cannot update order status
(skip) Orders > updateOrderStatus [convex writes blocked] > requires valid order ID
(skip) Orders > updateOrderStatus [convex writes blocked] > cannot mark payment_complete while balance remains
(skip) Orders > addShippingTracking [convex writes blocked] > admin can add shipping tracking
(skip) Orders > addShippingTracking [convex writes blocked] > non-admin cannot add shipping tracking
(skip) Orders > addShippingTracking [convex writes blocked] > requires valid order ID
(skip) Vehicles > createVehicle [convex writes blocked] > vendor can create a vehicle
(skip) Vehicles > createVehicle [convex writes blocked] > non-vendor cannot create vehicle
(skip) Vehicles > createVehicle [convex writes blocked] > requires valid session token
(skip) Vehicles > approveVehicle [convex writes blocked] > admin can approve a pending vehicle
(skip) Vehicles > approveVehicle [convex writes blocked] > vendor cannot approve a vehicle
(skip) Vehicles > approveVehicle [convex writes blocked] > admin cannot approve a vehicle that is not pending approval
(skip) Vehicles > updateVehicle [convex writes blocked] > vendor can update vehicle with legacy image URLs

 975 pass
 70 skip
 0 fail
 1203 expect() calls
Ran 1045 tests across 80 files. [141.87s]
[... truncated, showing last portion]
```

## Actionable Failure Insights
All checks green. No action required.
