# VoltBid Africa — Technical Specification & Feature Plan

## Document Overview

This document provides a complete technical roadmap for building the VoltBid Africa electric vehicle auction platform. The platform is modeled on Copart's proven auction mechanics while adding specialized features for EV imports to Nigeria and the African market, with deep integration for Chinese manufacturer partnerships.

**Technology Stack:**
- **Frontend:** Next.js 14+ (App Router)
- **Backend:** Convex (Database, Real-time Functions, File Storage)
- **Authentication:** Custom Auth (provided boilerplate)
- **Image Storage:** Cloudinary
- **Payments:** Paystack (Nigeria), Flutterwave (Pan-African)
- **Real-time:** Convex subscriptions
- **Deployment:** Vercel

---

## Table of Contents

1. System Architecture
2. Database Schema (Convex)
3. Authentication System
4. Core Features — Vehicle Listings
5. Auction Engine
6. Bidding System
7. User Management & Membership
8. Payment Processing
9. Shipping & Logistics Module
10. Customs & Clearance Tracking
11. Notification System
12. Admin Dashboard
13. Seller Portal
14. API Integrations
15. Security Considerations
16. Performance Optimization
17. Development Phases & Timeline

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App (Vercel)                                           │
│  ├── Public Pages (SSR/SSG)                                     │
│  │   ├── Homepage, Vehicle Listings, Vehicle Detail             │
│  │   └── How It Works, Pricing, About                           │
│  ├── Protected Pages (Client-side)                              │
│  │   ├── Dashboard, Watchlist, My Bids                          │
│  │   ├── Live Auction Room                                      │
│  │   └── Account Settings, Order Tracking                       │
│  └── Admin Portal (Role-restricted)                             │
│      ├── Vehicle Management                                     │
│      ├── Auction Management                                     │
│      └── User Management, Reports                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  Convex Backend                                                 │
│  ├── Queries (Read operations)                                  │
│  ├── Mutations (Write operations)                               │
│  ├── Actions (External API calls)                               │
│  ├── Scheduled Functions (Cron jobs)                            │
│  └── Real-time Subscriptions                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Convex Database                    │  Cloudinary               │
│  ├── Users & Auth                   │  ├── Vehicle Images       │
│  ├── Vehicles & Listings            │  ├── Documents            │
│  ├── Auctions & Bids                │  └── User Uploads         │
│  ├── Orders & Payments              │                           │
│  ├── Shipping & Tracking            │                           │
│  └── Notifications                  │                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  Paystack/Flutterwave │ Email (Resend) │ SMS (Termii)          │
│  Shipping APIs        │ Customs Track   │ Exchange Rates       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Directory Structure

```
voltbid-africa/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes
│   │   ├── page.tsx              # Homepage
│   │   ├── vehicles/
│   │   │   ├── page.tsx          # Vehicle listings
│   │   │   └── [id]/page.tsx     # Vehicle detail
│   │   ├── auctions/
│   │   │   ├── page.tsx          # Auction calendar
│   │   │   └── [id]/page.tsx     # Live auction room
│   │   ├── how-it-works/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── about/page.tsx
│   ├── (auth)/                   # Auth routes
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify/page.tsx
│   ├── (protected)/              # Requires authentication
│   │   ├── dashboard/page.tsx
│   │   ├── watchlist/page.tsx
│   │   ├── my-bids/page.tsx
│   │   ├── orders/
│   │   └── account/
│   ├── (admin)/                  # Admin portal
│   │   └── admin/
│   ├── api/                      # Webhooks
│   │   └── webhooks/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # Shared UI components
│   ├── vehicles/                 # Vehicle components
│   ├── auctions/                 # Auction components
│   └── layout/                   # Layout components
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── auth.ts
│   ├── users.ts
│   ├── vehicles.ts
│   ├── auctions.ts
│   ├── bids.ts
│   ├── orders.ts
│   ├── payments.ts
│   ├── shipping.ts
│   └── notifications.ts
├── lib/
│   ├── utils.ts
│   ├── cloudinary.ts
│   └── paystack.ts
├── hooks/
├── types/
└── config/
```

---

## 2. Database Schema (Convex)

### 2.1 Complete Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================
  // USER & AUTHENTICATION TABLES
  // ============================================
  
  users: defineTable({
    email: v.string(),
    phone: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    passwordHash: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("suspended"),
      v.literal("banned")
    ),
    emailVerified: v.boolean(),
    phoneVerified: v.boolean(),
    avatar: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      postalCode: v.optional(v.string()),
    })),
    membershipTier: v.union(
      v.literal("guest"),
      v.literal("basic"),
      v.literal("premier"),
      v.literal("business")
    ),
    membershipExpiry: v.optional(v.number()),
    depositAmount: v.number(),
    buyingPower: v.number(),
    role: v.union(
      v.literal("buyer"),
      v.literal("seller"),
      v.literal("admin"),
      v.literal("superadmin")
    ),
    kycStatus: v.union(
      v.literal("not_started"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_membership", ["membershipTier"]),

  userDocuments: defineTable({
    userId: v.id("users"),
    documentType: v.union(
      v.literal("government_id"),
      v.literal("proof_of_address"),
      v.literal("business_registration"),
      v.literal("dealer_license")
    ),
    documentUrl: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    rejectionReason: v.optional(v.string()),
    uploadedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    deviceInfo: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // ============================================
  // VEHICLE TABLES
  // ============================================

  vehicles: defineTable({
    lotNumber: v.string(),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    trim: v.optional(v.string()),
    exteriorColor: v.string(),
    interiorColor: v.optional(v.string()),
    // EV Specific
    batteryCapacity: v.number(),
    estimatedRange: v.number(),
    batteryHealthPercent: v.optional(v.number()),
    chargingType: v.array(v.string()),
    motorPower: v.optional(v.number()),
    drivetrain: v.optional(v.string()),
    // Condition
    odometer: v.number(),
    odometerUnit: v.literal("km"),
    condition: v.union(
      v.literal("new"),
      v.literal("like_new"),
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("salvage")
    ),
    damageDescription: v.optional(v.string()),
    titleType: v.union(
      v.literal("clean"),
      v.literal("salvage"),
      v.literal("rebuilt"),
      v.literal("export_only")
    ),
    titleCountry: v.string(),
    hasKeys: v.boolean(),
    sourceType: v.union(
      v.literal("manufacturer"),
      v.literal("dealer"),
      v.literal("consignment"),
      v.literal("insurance")
    ),
    sellerId: v.optional(v.id("users")),
    currentLocation: v.object({
      facility: v.string(),
      city: v.string(),
      country: v.string(),
    }),
    startingBid: v.number(),
    reservePrice: v.optional(v.number()),
    buyItNowPrice: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_approval"),
      v.literal("approved"),
      v.literal("scheduled"),
      v.literal("in_auction"),
      v.literal("sold"),
      v.literal("unsold"),
      v.literal("withdrawn")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
  })
    .index("by_lot_number", ["lotNumber"])
    .index("by_vin", ["vin"])
    .index("by_status", ["status"])
    .index("by_make_model", ["make", "model"])
    .index("by_seller", ["sellerId"]),

  vehicleImages: defineTable({
    vehicleId: v.id("vehicles"),
    imageUrl: v.string(),
    thumbnailUrl: v.string(),
    imageType: v.union(
      v.literal("hero"),
      v.literal("exterior"),
      v.literal("interior"),
      v.literal("damage"),
      v.literal("document"),
      v.literal("vin_plate")
    ),
    order: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_vehicle", ["vehicleId"]),

  vehicleDocuments: defineTable({
    vehicleId: v.id("vehicles"),
    documentType: v.union(
      v.literal("battery_report"),
      v.literal("inspection_report"),
      v.literal("title_scan"),
      v.literal("bill_of_sale"),
      v.literal("export_certificate"),
      v.literal("soncap_cert")
    ),
    documentUrl: v.string(),
    uploadedAt: v.number(),
  })
    .index("by_vehicle", ["vehicleId"]),

  // ============================================
  // AUCTION TABLES
  // ============================================

  auctions: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    auctionType: v.union(
      v.literal("live"),
      v.literal("timed"),
      v.literal("buy_it_now")
    ),
    scheduledStart: v.number(),
    scheduledEnd: v.optional(v.number()),
    actualStart: v.optional(v.number()),
    actualEnd: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("paused"),
      v.literal("ended"),
      v.literal("cancelled")
    ),
    bidIncrement: v.number(),
    extendOnBid: v.boolean(),
    extendMinutes: v.optional(v.number()),
    totalLots: v.number(),
    soldLots: v.number(),
    totalBids: v.number(),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_scheduled_start", ["scheduledStart"]),

  auctionLots: defineTable({
    auctionId: v.id("auctions"),
    vehicleId: v.id("vehicles"),
    lotOrder: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("sold"),
      v.literal("no_sale"),
      v.literal("passed")
    ),
    currentBid: v.number(),
    currentBidderId: v.optional(v.id("users")),
    bidCount: v.number(),
    reserveMet: v.boolean(),
    endsAt: v.optional(v.number()),
    winningBid: v.optional(v.number()),
    winnerId: v.optional(v.id("users")),
    soldAt: v.optional(v.number()),
  })
    .index("by_auction", ["auctionId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_status", ["status"]),

  // ============================================
  // BIDDING TABLES
  // ============================================

  bids: defineTable({
    auctionLotId: v.id("auctionLots"),
    userId: v.id("users"),
    bidAmount: v.number(),
    bidType: v.union(
      v.literal("live"),
      v.literal("max_bid"),
      v.literal("proxy")
    ),
    maxBidAmount: v.optional(v.number()),
    status: v.union(
      v.literal("active"),
      v.literal("outbid"),
      v.literal("winning"),
      v.literal("won"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  })
    .index("by_auction_lot", ["auctionLotId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  maxBids: defineTable({
    auctionLotId: v.id("auctionLots"),
    userId: v.id("users"),
    maxAmount: v.number(),
    currentProxyBid: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auction_lot", ["auctionLotId"])
    .index("by_user", ["userId"]),

  // ============================================
  // WATCHLIST & ALERTS
  // ============================================

  watchlist: defineTable({
    userId: v.id("users"),
    vehicleId: v.id("vehicles"),
    addedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_vehicle", ["vehicleId"]),

  vehicleAlerts: defineTable({
    userId: v.id("users"),
    makes: v.optional(v.array(v.string())),
    models: v.optional(v.array(v.string())),
    yearMin: v.optional(v.number()),
    yearMax: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    batteryHealthMin: v.optional(v.number()),
    isActive: v.boolean(),
    frequency: v.union(
      v.literal("instant"),
      v.literal("daily"),
      v.literal("weekly")
    ),
    createdAt: v.number(),
    lastTriggeredAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]),

  // ============================================
  // ORDER & PAYMENT TABLES
  // ============================================

  orders: defineTable({
    orderNumber: v.string(),
    userId: v.id("users"),
    vehicleId: v.id("vehicles"),
    auctionLotId: v.optional(v.id("auctionLots")),
    orderType: v.union(
      v.literal("auction_win"),
      v.literal("buy_it_now"),
      v.literal("make_offer")
    ),
    winningBid: v.number(),
    serviceFee: v.number(),
    documentationFee: v.number(),
    inspectionFee: v.optional(v.number()),
    shippingMethod: v.optional(v.union(
      v.literal("container"),
      v.literal("roro")
    )),
    shippingCost: v.optional(v.number()),
    insuranceCost: v.optional(v.number()),
    estimatedDuties: v.optional(v.number()),
    actualDuties: v.optional(v.number()),
    clearanceFee: v.optional(v.number()),
    deliveryAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      country: v.string(),
      postalCode: v.optional(v.string()),
      phone: v.string(),
    })),
    deliveryFee: v.optional(v.number()),
    subtotal: v.number(),
    totalAmount: v.number(),
    paidAmount: v.number(),
    balanceDue: v.number(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("payment_partial"),
      v.literal("payment_complete"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("in_transit"),
      v.literal("customs_clearance"),
      v.literal("cleared"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled"),
      v.literal("refunded")
    ),
    paymentDeadline: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_order_number", ["orderNumber"])
    .index("by_user", ["userId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_status", ["status"]),

  payments: defineTable({
    orderId: v.id("orders"),
    userId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    provider: v.union(
      v.literal("paystack"),
      v.literal("flutterwave"),
      v.literal("bank_transfer"),
      v.literal("deposit")
    ),
    providerReference: v.optional(v.string()),
    paymentType: v.union(
      v.literal("vehicle"),
      v.literal("shipping"),
      v.literal("duties"),
      v.literal("deposit"),
      v.literal("membership")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("successful"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_user", ["userId"])
    .index("by_provider_reference", ["providerReference"]),

  // ============================================
  // SHIPPING & LOGISTICS TABLES
  // ============================================

  shipments: defineTable({
    orderId: v.id("orders"),
    vehicleId: v.id("vehicles"),
    trackingNumber: v.optional(v.string()),
    shippingLine: v.optional(v.string()),
    containerNumber: v.optional(v.string()),
    originPort: v.string(),
    destinationPort: v.string(),
    estimatedDeparture: v.optional(v.number()),
    actualDeparture: v.optional(v.number()),
    estimatedArrival: v.optional(v.number()),
    actualArrival: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("booked"),
      v.literal("at_origin_port"),
      v.literal("departed"),
      v.literal("in_transit"),
      v.literal("arrived_destination"),
      v.literal("at_customs"),
      v.literal("cleared"),
      v.literal("released"),
      v.literal("delivered")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_tracking_number", ["trackingNumber"])
    .index("by_status", ["status"]),

  shipmentUpdates: defineTable({
    shipmentId: v.id("shipments"),
    status: v.string(),
    location: v.optional(v.string()),
    description: v.string(),
    timestamp: v.number(),
    source: v.union(
      v.literal("system"),
      v.literal("carrier"),
      v.literal("customs"),
      v.literal("manual")
    ),
  })
    .index("by_shipment", ["shipmentId"]),

  // ============================================
  // CUSTOMS & CLEARANCE TABLES
  // ============================================

  customsClearance: defineTable({
    orderId: v.id("orders"),
    shipmentId: v.id("shipments"),
    billOfLading: v.optional(v.string()),
    commercialInvoice: v.optional(v.string()),
    packingList: v.optional(v.string()),
    certificateOfOrigin: v.optional(v.string()),
    soncapCertificate: v.optional(v.string()),
    formM: v.optional(v.string()),
    assessedDutyNgn: v.optional(v.number()),
    paidDutyNgn: v.optional(v.number()),
    status: v.union(
      v.literal("pending_documents"),
      v.literal("documents_submitted"),
      v.literal("under_assessment"),
      v.literal("duty_assessed"),
      v.literal("duty_paid"),
      v.literal("inspection_scheduled"),
      v.literal("inspection_complete"),
      v.literal("cleared"),
      v.literal("released")
    ),
    clearingAgent: v.optional(v.string()),
    agentContact: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    clearedAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_shipment", ["shipmentId"])
    .index("by_status", ["status"]),

  // ============================================
  // NOTIFICATION TABLES
  // ============================================

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("bid_placed"),
      v.literal("outbid"),
      v.literal("auction_won"),
      v.literal("auction_lost"),
      v.literal("payment_reminder"),
      v.literal("payment_received"),
      v.literal("shipment_update"),
      v.literal("customs_update"),
      v.literal("delivery_scheduled"),
      v.literal("vehicle_alert"),
      v.literal("membership_expiring"),
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    orderId: v.optional(v.id("orders")),
    auctionId: v.optional(v.id("auctions")),
    channels: v.array(v.union(
      v.literal("in_app"),
      v.literal("email"),
      v.literal("sms"),
      v.literal("push")
    )),
    read: v.boolean(),
    emailSent: v.boolean(),
    smsSent: v.boolean(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "read"]),

  // ============================================
  // SELLER/SUPPLIER TABLES
  // ============================================

  sellers: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    companyRegistration: v.optional(v.string()),
    businessType: v.union(
      v.literal("manufacturer"),
      v.literal("dealer"),
      v.literal("auction_house"),
      v.literal("individual")
    ),
    country: v.string(),
    city: v.string(),
    address: v.string(),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("suspended")
    ),
    totalListings: v.number(),
    totalSold: v.number(),
    rating: v.optional(v.number()),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // ============================================
  // SYSTEM TABLES
  // ============================================

  exchangeRates: defineTable({
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
    source: v.string(),
    fetchedAt: v.number(),
  })
    .index("by_currencies", ["fromCurrency", "toCurrency"]),

  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  auditLog: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),
});
```

---

## 3. Key Feature Modules

### 3.1 Bidding System Features

The bidding system supports multiple bid types modeled after Copart:

**Live Bidding:** Real-time competitive bidding during live auctions with instant updates via Convex subscriptions.

**Max Bids:** Users set a maximum amount and the system bids incrementally on their behalf up to that limit.

**Proxy Bidding:** Automated bidding that activates when a user is outbid, placing the minimum necessary bid up to their max.

**Monster Bids:** Instant advancement to a specified bid amount to discourage competition.

**Buy It Now:** Fixed-price purchase option bypassing the auction process.

**Make an Offer:** Negotiation feature for specific vehicles.

### 3.2 Membership Tiers

| Tier | Annual Fee | Daily Bids | Max Buying Power | Features |
|------|------------|------------|------------------|----------|
| Guest | Free | 0 | ₦0 | Browse only |
| Basic | ₦75,000 | 3 | ₦5M | Email support |
| Premier | ₦150,000 | 10 | ₦50M | Priority support, Account manager |
| Business | ₦500,000 | Unlimited | Negotiated | API access, Bulk shipping |

### 3.3 Fee Structure

**Service Fees (based on winning bid):**
- ₦0 - ₦1M: ₦75,000 flat
- ₦1M - ₦5M: 7%
- ₦5M - ₦15M: 6%
- ₦15M+: 5%

**Additional Fees:**
- Documentation: ₦25,000
- Inspection Report: ₦15,000
- Port Handling: ₦35,000
- Delivery: Variable by location

---

## 4. Shipping & Customs Integration

### 4.1 Shipping Routes

| Route | Method | Duration | Cost Range |
|-------|--------|----------|------------|
| Shanghai → Lagos | Container | 35-40 days | $1,200-$2,500 |
| Shenzhen → Lagos | Container | 35-40 days | $1,250-$2,500 |
| Shanghai → Lagos | RoRo | 40-45 days | $800-$1,500 |

### 4.2 Nigerian Import Duties (EVs - 2025)

| Component | Rate | Notes |
|-----------|------|-------|
| Import Duty | 10-20% | Reduced for EVs |
| NAC Levy | 15% | National Automotive Council |
| VAT | 0% | **EXEMPT for EVs** |
| IAT | 0% | **EXEMPT for EVs** |

### 4.3 Required Documents

1. Bill of Lading (from shipping company)
2. Commercial Invoice (from seller)
3. Packing List
4. Certificate of Origin (CCPIT)
5. SONCAP Certificate (mandatory)
6. Form M (via Nigerian bank)
7. Battery Health Report

---

## 5. Admin Dashboard Features

### 5.1 Dashboard Sections

```
/admin
├── /dashboard          # Metrics & KPIs
├── /vehicles           # Vehicle management
├── /auctions           # Auction control
├── /orders             # Order processing
├── /users              # User management
├── /payments           # Transaction history
├── /shipping           # Shipment tracking
├── /customs            # Clearance queue
├── /reports            # Analytics
└── /settings           # Configuration
```

### 5.2 Live Auction Control

- Start/Pause/End auction
- Advance to next lot
- Manual bid entry
- Time extensions
- Lot cancellation

---

## 6. API Integrations

| Service | Purpose | 
|---------|---------|
| Paystack | Nigerian payments |
| Flutterwave | Pan-African payments |
| Cloudinary | Image storage & optimization |
| Resend | Transactional email |
| Termii | SMS notifications (Nigeria) |
| Exchange Rate API | Currency conversion |

---

## 7. Security Measures

1. **Authentication:** bcrypt password hashing, session tokens, rate limiting
2. **Data Protection:** Input validation, XSS prevention, CSRF tokens
3. **Payment Security:** PCI compliance via providers, webhook verification
4. **Access Control:** Role-based permissions, audit logging

---

## 8. Development Timeline

### Phase 1: Foundation (Weeks 1-4)
- Project setup, database schema, authentication, basic UI

### Phase 2: Core Auction (Weeks 5-8)
- Vehicle listings, auction engine, bidding system, real-time updates

### Phase 3: Payments & Orders (Weeks 9-12)
- Payment integration, order management, membership system

### Phase 4: Logistics (Weeks 13-16)
- Shipping module, customs tracking, document management

### Phase 5: Admin & Seller (Weeks 17-20)
- Admin dashboard, seller portal, reporting

### Phase 6: Launch (Weeks 21-24)
- Performance optimization, security audit, deployment

---

## 9. Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=https://voltbid.africa

# Convex
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Payments
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx

# Communications
RESEND_API_KEY=re_xxx
TERMII_API_KEY=xxx
```

---

## 10. Key Convex Functions

| Category | Function | Type | Description |
|----------|----------|------|-------------|
| Auth | register | mutation | Create new user |
| Auth | login | mutation | Authenticate user |
| Vehicles | listVehicles | query | Get filtered vehicles |
| Vehicles | getVehicle | query | Get vehicle details |
| Vehicles | createVehicle | mutation | Create listing |
| Auctions | listAuctions | query | Get auctions |
| Auctions | createAuction | mutation | Create auction |
| Auctions | startAuction | internal | Start scheduled auction |
| Bids | placeBid | mutation | Place a bid |
| Bids | setMaxBid | mutation | Set proxy bid |
| Orders | createFromAuction | mutation | Create order from win |
| Payments | initializePayment | action | Start payment |
| Shipping | createShipment | mutation | Create shipment |
| Customs | updateClearanceStatus | mutation | Update clearance |
| Notifications | createNotification | internal | Send notification |

---

*Document Version: 1.0*
*Last Updated: December 2025*
*Prepared for: VoltBid Africa Platform Development*
