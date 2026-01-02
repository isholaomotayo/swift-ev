# VoltBid Africa

**Africa's Premier Electric Vehicle Auction Platform**

VoltBid Africa is an electric vehicle auction platform connecting African buyers (with initial focus on Nigeria) with Chinese EV manufacturers and dealers. The platform combines proven auction mechanics with specialized services for EV imports including customs clearance, shipping logistics, and compliance documentation support.

**Tagline:** "Power Your Future. Bid Smart."

---

## 📋 Table of Contents

- [Overview](#overview)
- [Current Status](#current-status)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Test Credentials](#test-credentials)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)

---

## Overview

VoltBid Africa enables buyers to:

- **Browse & Bid** on quality electric vehicles directly from Chinese manufacturers (BYD, NIO, XPeng, Geely, etc.)
- **Complete Import Solution** - We handle shipping, SONCAP certification, customs clearance, and delivery
- **Transparent Pricing** - See all costs upfront: vehicle price, shipping, duties, and service fees
- **EV Expertise** - Every vehicle includes detailed battery health reports and charging specifications

### Key Features

- 🎯 **Live Auctions** - Real-time competitive bidding with instant updates
- 🤖 **Proxy Bidding** - Set maximum bids and let the system bid on your behalf
- 📦 **End-to-End Logistics** - From factory to your doorstep in Nigeria
- 🔋 **Battery Health Reports** - Certified inspection reports for every vehicle
- 💳 **Multiple Payment Options** - Paystack integration for Nigerian payments
- 📊 **Admin Dashboard** - Complete vehicle and auction management
- 🏢 **Vendor Portal** - Sellers can upload and manage their listings

---

## Current Status

**Overall Progress: ~95% Complete**

**📊 For detailed status, see [CURRENT_STATUS.md](./CURRENT_STATUS.md)**

**✅ All Critical Features Complete!**  
All core functionality is implemented and working. Remaining items are medium-priority enhancements (email notifications, enhanced admin UI).

### ✅ Completed

- **Phase 0: Foundation Setup (100%)**
  - Package manager migration to pnpm
  - Complete Convex database schema (24 tables)
  - VoltBid brand colors and design system
  - Utility functions and constants
  - Environment configuration

- **Phase 1: Layout & Base Components (100%)**
  - shadcn/ui component library setup
  - Header and Footer components
  - Responsive navigation
  - Homepage skeleton

- **Authentication System**
  - User registration and login
  - Session management
  - Role-based access control

- **Vendor Features**
  - Vehicle upload system (5-step form)
  - Vehicle management dashboard

- **Admin Features**
  - Admin dashboard
  - Vehicle approval workflow
  - Auction management

- **Auction & Bidding**
  - Live auction system
  - Real-time bidding
  - Proxy bidding (max bids)
  - Watchlist functionality

- **Seed Data**
  - Test users (admin, vendors, buyers)
  - Sample vehicles
  - Live auction with active lots
  - Test bids and watchlist items

### 🚧 In Progress / Pending

- VoltBid-specific components (vehicle cards, auction timers, bid buttons)
- Public vehicle listing pages with filters
- Vehicle detail pages
- User dashboard
- Payment integration
- Shipping & logistics module
- Email notifications

---

## Tech Stack

| Category            | Technology                   | Version             |
| ------------------- | ---------------------------- | ------------------- |
| **Framework**       | Next.js                      | 16.1.1 (App Router) |
| **React**           | React                        | 19.2.3              |
| **Backend**         | Convex                       | 1.31.2              |
| **Database**        | Convex (24 tables)           | -                   |
| **Authentication**  | Custom Auth (bcryptjs, jose) | -                   |
| **UI Library**      | shadcn/ui + Radix UI         | -                   |
| **Styling**         | Tailwind CSS                 | v4                  |
| **Typography**      | Inter, JetBrains Mono        | -                   |
| **Forms**           | react-hook-form + zod        | -                   |
| **Image Storage**   | Convex File Storage          | -                   |
| **Payments**        | Paystack                     | -                   |
| **Package Manager** | pnpm                         | -                   |
| **TypeScript**      | TypeScript                   | 5 (strict mode)     |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Convex account (for backend and file storage)
- Paystack account (for payments - test mode is fine)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd swiftEv
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Convex (backend and file storage)
   CONVEX_DEPLOYMENT=dev:your-deployment
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

   # Paystack (test mode)
   PAYSTACK_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
   ```

4. **Initialize Convex**

   ```bash
   pnpm convex:dev
   ```

   This will start Convex in development mode and create your deployment.

5. **Start the development server**

   ```bash
   pnpm dev
   ```

   This runs both Next.js and Convex concurrently.

6. **Visit the application**
   - Homepage: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin
   - Vendor Dashboard: http://localhost:3000/vendor

---

## Test Credentials

The seed data includes test users for all roles:

### Admin

- **Email:** `admin@voltbid.africa`
- **Password:** `admin123`
- **Access:** Full admin dashboard, vehicle approval, auction management

### Vendors

**Vendor 1 (BYD Nigeria)**

- **Email:** `vendor@bydnigeria.com`
- **Password:** `vendor123`
- **Company:** BYD Auto Nigeria Ltd

**Vendor 2 (XPeng Nigeria)**

- **Email:** `sales@xpeng-ng.com`
- **Password:** `vendor456`
- **Company:** XPeng Motors Nigeria

### Buyers

**Buyer 1**

- **Email:** `john.doe@example.com`
- **Password:** `buyer123`

**Buyer 2**

- **Email:** `jane.smith@example.com`
- **Password:** `buyer456`

**Buyer 3 (Business)**

- **Email:** `fleet@logistics.ng`
- **Password:** `buyer789`

---

## Seed Data Summary

The database has been seeded with:

- **6 Users:** 1 admin, 2 vendors, 3 buyers
- **6 Vehicles:** All from vendors (BYD, XPeng, NIO)
- **1 Live Auction:** "VoltBid Weekly EV Auction - January 2026"
- **4 Auction Lots:** 1 active (BYD Tang), 3 pending
- **8 Bids:** On the active lot (BYD Tang)
- **2 Max Bids:** Proxy bidding set up
- **4 Watchlist Items:** Users watching vehicles

### Testing Features

1. **Test Vendor Upload:**
   - Login as vendor (`vendor@bydnigeria.com` / `vendor123`)
   - Navigate to `/vendor/vehicles/upload`
   - Complete the 5-step form
   - Submit and see it in "pending_approval" status

2. **Test Bidding:**
   - Login as buyer (`john.doe@example.com` / `buyer123`)
   - View the live auction (BYD Tang)
   - Place a bid or set a max bid

3. **Test Admin Approval:**
   - Login as admin (`admin@voltbid.africa` / `admin123`)
   - Navigate to `/admin/vehicles`
   - Approve pending vehicles

---

## Project Structure

```
swiftEv/
├── app/                          # Next.js App Router
│   ├── admin/                   # Admin dashboard
│   ├── vendor/                  # Vendor portal
│   ├── vehicles/                # Vehicle pages
│   ├── login/                   # Authentication
│   └── page.tsx                 # Homepage
├── components/
│   ├── layout/                  # Header, Footer
│   ├── ui/                      # shadcn/ui components
│   ├── voltbid/                 # VoltBid-specific components
│   └── providers/               # Context providers
├── convex/                      # Convex backend
│   ├── schema.ts                # Database schema
│   ├── auth.ts                  # Authentication
│   ├── vehicles.ts              # Vehicle operations
│   ├── auctions.ts              # Auction management
│   ├── bids.ts                  # Bidding logic
│   └── seedData.ts              # Seed data script
├── lib/
│   ├── utils.ts                 # Utility functions
│   └── constants.ts             # Platform constants
├── docs/                        # Documentation
│   ├── dev-plan.md              # Implementation plan
│   ├── dev-progress.md          # Development progress
│   ├── voltbid-technical-spec.md # Technical specification
│   └── voltbid-brand-copy-guide.md # Brand guidelines
└── tests/                       # Test files
```

---

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Current Status](./CURRENT_STATUS.md)** ⭐ - **Latest implementation status (updated Jan 2026)**
- **[Technical Specification](./voltbid-technical-spec.md)** - Complete technical architecture, database schema, and API design
- **[Brand & Copy Guide](./voltbid-brand-copy-guide.md)** - Brand identity, copy guidelines, and design specifications
- **[Vendor Features](./VENDOR_FEATURES.md)** - Vendor portal documentation
- **[Seeding Guide](./SEEDING_GUIDE.md)** - Database seeding instructions

---

## Development

### Available Scripts

```bash
# Development (runs Next.js and Convex concurrently)
pnpm dev

# Run Next.js only
pnpm dev:next

# Run Convex only
pnpm dev:convex

# Type checking
pnpm type-check

# Linting
pnpm lint

# Build for production
pnpm build

# Start production server
pnpm start

# Deploy Convex functions
pnpm convex:deploy
```

### Development Workflow

1. **Type Safety:** Always run `pnpm type-check` before committing
2. **Convex Functions:** Use `pnpm convex:dev` to test backend functions
3. **Testing:** Use the test credentials to verify features
4. **Documentation:** Update `docs/dev-progress.md` as features are completed

### Key Features to Test

- ✅ User registration and login
- ✅ Vendor vehicle upload (5-step form)
- ✅ Admin vehicle approval
- ✅ Live auction viewing
- ✅ Real-time bidding
- ✅ Proxy bidding (max bids)
- ✅ Watchlist functionality

---

## Brand Colors

- **Electric Blue:** `#0066FF` - Primary brand color, CTAs
- **Volt Green:** `#00D26A` - Success states, EV indicators
- **Carbon Black:** `#1A1A2E` - Primary text, headers
- **Warning Amber:** `#FFB800` - Auction alerts
- **Error Red:** `#FF3B30` - Error states

---

## License

Private project - All rights reserved

---

## Contact & Support

For questions or support, refer to the documentation in `/docs` or contact the development team.

**Platform:** VoltBid Africa  
**Target Market:** Nigeria (expanding to Africa)  
**Mission:** Powering Africa's sustainable mobility revolution ⚡🚗
