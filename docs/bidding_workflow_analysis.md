# End-to-End Purchase & Bidding Workflow Analysis

After thoroughly investigating the Convex backend schemas, mutations, and queries, I have documented the complete lifecycle of a vehicle from auction creation to final delivery.

## 1. Pre-Auction (Setup & Discovery)
Before a vehicle can be bid on or purchased, it must be staged.

* **Vehicle & Inventory Management**: Admins add `vehicles` to the platform.
* **Auction Creation**: Admins create an `auctions` record (`createAuction`) and associate lots.
* **Lot Configuration**: Each vehicle is tied to an `auctionLots` record, specifying:
  * Pricing: `startingBid`, `reservePrice`, `buyItNowPrice` (optional).
  * Timing: `estimatedStartTime`, `lotDuration`.
* **Discovery**: Users browse vehicles. They can save favorites to their `watchlist` or set up `vehicleAlerts` (based on Make/Model, Year, Price, etc.) to get notified when matching vehicles appear.

## 2. Bidding & Live Auction Phase
When an auction begins, lots transition to an `active` status.

* **Bidding Engine (`bids.ts`)**:
  * Users place bids via the `placeBid` mutation.
  * Bid Types supported:
    1. **Live Bid**: Standard incremental bidding.
    2. **Max Bid**: A user specifies their maximum budget. The system (`processProxyBids`) automatically counter-bids on their behalf up to that threshold to maintain their winning position.
* **Buy It Now (`auctions.ts` -> `purchaseBuyItNow`)**: If `buyItNowEnabled` is true, a user can instantly purchase the vehicle, bypassing the auction timer and immediately proceeding to checkout.

## 3. Auction Resolution (The Hammer)
When the timer for an `auctionLot` runs out, the `closeLotAt` or `endExpiredLots` cron job processes the result.

* **Winner Determination**: The system identifies the highest bidder (`resolveLotWinner`).
* **Reserve Policy**: Notably, even if the `reservePrice` is not met, the highest bidder is currently awarded the vehicle. The `reserveMet` flag is recorded in the lot, but the hammer falls in favor of the highest bidder.
* **Status Updates**:
  * The lot status is set to `sold`.
  * The winner's bid status changes to `won`, and competing bids are updated to `outbid`.
* **Order Generation**: An `orders` record is automatically generated with:
  * `orderType`: `auction_win`
  * **Fees Applied**: The subtotal is the winning bid amount, plus a calculated `serviceFee` and a flat `documentationFee` (₦50,000).
  * `status`: `pending_payment`
  * `paymentDeadline`: Calculated automatically from the end time.
* **Deposit Application**: The system applies any available reserved deposit funds toward the order's balance.
* **Notifications**: An in-app notification and email are dispatched to the winner, clearly stating the deadline to avoid forfeiture.

## 4. Payment Collection
The user enters the checkout workflow to clear the balance.

* **Providers & Methods**: Payments are tracked in the `payments` table and support Paystack, Flutterwave, Bank Transfers, and Wallet balances.
* **Bank Transfers**: Initiated via `initiateBankTransferPayment` and sit in a `pending` state until an admin verifies them (`verifyPayment`), which then credits the order.
* **Card Payments**: Handled via webhooks (`processOrderCardPaymentWebhook`) which automatically transition the payment to `successful` and update the order balance.
* **Order Status Progression**: Based on the paid amount, the order moves from `pending_payment` to `payment_partial`, and finally `payment_complete`.

## 5. Fulfillment & Logistics
Once payment is complete, physical fulfillment is tracked.

* **Logistics Modules (`schema.ts`)**:
  * `shipments`: Tracks the vessel tracking number, shipping line, container number, and origin/destination ports.
  * `customsClearance`: Manages port operations.
  * `gatePasses`: Manages the local release of the vehicle.
* **Order Finalization**: As fulfillment progresses, the order's `status` iterates through:
  * `processing` -> `shipped` -> `in_transit` -> `customs_clearance` -> `cleared` -> `out_for_delivery` -> `delivered`.

## Summary & Observations
The architecture provides a very robust, standard auction house model. Everything from max-bidding, automated proxy counter-bids, checkout deadlines, and shipping logic is fully mapped out.

> [!NOTE]
> **Reserve Price Behavior**
> During my review of `closeLotAt`, I noticed that an unmet reserve price no longer blocks the automatic hammer award. It records `reserveMet = false` but still grants the win. If this is intentional (e.g. for reporting or manual review later), it's working as coded. If it should block the sale, this is an area that would require adjustment.
