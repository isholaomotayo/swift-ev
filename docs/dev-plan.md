Claude’s Plan
VoltBid Africa - Implementation Plan
Overview
Build VoltBid Africa, an electric vehicle auction platform for African buyers (focus: Nigeria) to bid on EVs from Chinese manufacturers. The platform combines auction mechanics (like Copart) with specialized EV import services including customs clearance, shipping logistics, and compliance documentation. Current State:
Next.js 16.1.1 with App Router ✓
Tailwind CSS v4 configured ✓
TypeScript strict mode ✓
Clean slate - no components, no backend, no auth
Target State:
Full-stack auction platform with real-time bidding
shadcn/ui component library
Convex backend with complete schema
Authentication system
Public browsing pages
Live auction rooms
Admin dashboard
Implementation Phases
Phase 0: Foundation Setup (Week 1)
Objective: Set up core infrastructure, dependencies, and design system
0.1 Package Manager & Dependencies
Actions:
Migrate from npm to pnpm:

rm -rf node_modules package-lock.json
pnpm install
Install dependencies:

# Convex backend

pnpm add convex

# Authentication

pnpm add bcryptjs jose
pnpm add -D @types/bcryptjs

# shadcn/ui dependencies

pnpm add @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip
pnpm add class-variance-authority clsx tailwind-merge lucide-react

# Forms & validation

pnpm add react-hook-form @hookform/resolvers zod

# Utilities

pnpm add date-fns numeral zustand
pnpm add -D @types/numeral

# Image handling

pnpm add cloudinary next-cloudinary

# Payments

pnpm add paystack

# Dev tools

pnpm add -D prettier prettier-plugin-tailwindcss
Update package.json scripts:

{
"scripts": {
"dev": "next dev --turbopack",
"build": "next build",
"start": "next start",
"lint": "eslint",
"type-check": "npx tsc --noEmit",
"convex:dev": "convex dev",
"convex:deploy": "convex deploy"
}
}
0.2 Convex Backend Setup
Actions:
Initialize Convex:

pnpm convex dev
Create /convex/schema.ts - Complete database schema (use the full schema from technical spec)
Key tables: users, vehicles, vehicleImages, auctions, auctionLots, bids, maxBids, orders, payments, shipments, customsClearance, notifications
All indexes as specified in technical spec lines 216-785
Create environment variables in .env.local:

CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLOUDINARY_CLOUD_NAME=voltbid-africa
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=voltbid-africa
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
0.3 Tailwind & Design System
Actions:
Update app/globals.css:
Replace existing colors with VoltBid brand colors
Electric Blue (#0066FF), Volt Green (#00D26A), Carbon Black (#1A1A2E)
Add font variables for Inter and JetBrains Mono
Configure dark mode support
Update app/layout.tsx:
Replace Geist fonts with Inter (primary) and JetBrains Mono (secondary)
Add ConvexProvider wrapper
Update metadata for VoltBid Africa
0.4 shadcn/ui Setup
Actions:
Initialize shadcn/ui:

pnpm dlx shadcn@latest init
Choose: TypeScript, Default style, CSS variables, Electric Blue base color
Install core components:

pnpm dlx shadcn@latest add button card input label badge dialog dropdown-menu select separator toast tabs progress slider
Create /lib/utils.ts with helper functions:
cn() - Class name merger
formatCurrency() - NGN formatting
formatDate() - Date formatting
calculateTimeRemaining() - Auction timer logic
Create /lib/constants.ts:
Membership tier definitions
Vehicle makes array
Battery health thresholds
Critical Files:
/convex/schema.ts ⭐ MOST CRITICAL
/app/globals.css
/app/layout.tsx
/lib/utils.ts
/lib/constants.ts
Phase 1: Core UI Components (Week 2)
Objective: Build reusable VoltBid-specific components and layout structure
1.1 Layout Components
Create /components/layout/ directory:
components/layout/header.tsx:
VoltBid logo (left)
Navigation: Vehicles, Auctions, How It Works, Pricing
Search bar (center)
User menu/login button (right)
Notification bell with badge
Sticky on scroll
Mobile responsive menu
components/layout/footer.tsx:
Company info
Quick links
Contact details
Social media icons
components/layout/nav.tsx:
Desktop navigation menu
Active state highlighting
components/layout/mobile-nav.tsx:
Hamburger menu
Slide-out drawer navigation
1.2 VoltBid-Specific Components
Create /components/voltbid/ directory:
components/voltbid/vehicle-card.tsx ⭐ CRITICAL:
Vehicle image with Cloudinary optimization
Make, Model, Year display
Battery capacity and range badges
Current bid and bid count
Countdown timer for active auctions
Watchlist heart icon
Quick bid button
Lot number in JetBrains Mono font
components/voltbid/auction-timer.tsx:
Real-time countdown with 1-second updates
Color changes: Green (>1hr), Amber (<1hr), Red (<5min)
Convex subscription for real-time updates
Auto-expire callback
components/voltbid/bid-button.tsx:
Quick bid (current + increment)
Custom bid input option
Set max bid option
Loading states
Success/error toast notifications
Optimistic UI updates
components/voltbid/battery-health-badge.tsx:
Color-coded badge based on SoH percentage
Excellent (95%+), Good (85-94%), Fair (70-84%)
components/voltbid/price-display.tsx:
Formatted NGN currency display
Large/prominent styling for current bids
Mono font for bid amounts
components/voltbid/image-gallery.tsx:
Main image carousel
Thumbnail strip
Zoom on click
Image counter
Critical Files:
/components/layout/header.tsx
/components/voltbid/vehicle-card.tsx ⭐
/components/voltbid/auction-timer.tsx
/components/voltbid/bid-button.tsx
Phase 2: Public Pages (Week 3)
Objective: Build browsing experience without authentication requirement
2.1 Homepage
Create app/(public)/page.tsx: Sections:
Hero section with headline, subheadline, CTA buttons
Featured vehicles carousel (query: getFeaturedVehicles)
Value proposition cards (4-column grid)
How It Works (4-step process)
Government incentives section
Trust indicators (stats)
Convex Functions Needed:
Create /convex/vehicles.ts:
getFeaturedVehicles (query) - Get in_auction vehicles, limit 8
getVehicleStats (query) - Total listings, total sold
2.2 Vehicle Listing Page
Create app/(public)/vehicles/page.tsx: Layout:
Left sidebar (30%): Filters
Make (checkbox group)
Year range (slider)
Price range (slider)
Battery capacity (slider)
Condition (checkbox group)
Battery health (slider)
Right content (70%): Vehicle grid
3-column grid (desktop), responsive
VehicleCard components
Pagination (20 per page)
Sort options dropdown
Convex Functions:
In /convex/vehicles.ts:
listVehicles (query) - Paginated list with filters (make, year, price, batteryHealth, page, limit, sortBy)
searchVehicles (query) - Full-text search
2.3 Vehicle Detail Page
Create app/(public)/vehicles/[id]/page.tsx ⭐ CRITICAL: Layout:
Left (60%): Image gallery with carousel
Right (40%): Auction info card (sticky)
Lot number
Current bid (large)
Bid count
Countdown timer
Quick bid button
Set max bid button
Add to watchlist button
Tabs:
Overview (make, model, year, VIN, odometer, colors, location)
EV Specifications (battery, range, health %, charging types, motor power)
Condition Report (condition badge, damage description, documents)
Shipping & Costs (location, estimated costs calculator)
Bid History (real-time table)
Convex Functions:
In /convex/vehicles.ts:
getVehicleById (query) - Get vehicle + images + auctionLot + bids
Real-time subscription to bid updates
2.4 Static Pages
Create:
app/(public)/how-it-works/page.tsx - 4-step process, FAQ accordion
app/(public)/pricing/page.tsx - Membership comparison table, fee calculator
Critical Files:
/app/(public)/page.tsx
/app/(public)/vehicles/page.tsx
/app/(public)/vehicles/[id]/page.tsx ⭐
/convex/vehicles.ts
Phase 3: Authentication System (Week 4)
Objective: Implement complete auth flow with session management
3.1 Convex Auth Functions
Create convex/auth.ts ⭐ CRITICAL: Functions:
register (mutation):
Validate email uniqueness
Hash password with bcryptjs (10 rounds)
Create user with status "pending", emailVerified false
Send verification email (via scheduler)
Return userId
login (mutation):
Find user by email
Verify password with bcrypt.compare()
Check user status (reject if suspended/banned)
Create session token (crypto.randomUUID())
Insert session with 30-day expiry
Update lastLoginAt
Return token + user
logout (mutation):
Delete session by token
getCurrentUser (query):
Accept token parameter
Find session by token
Check expiry
Return user or null
verifyEmail (mutation):
Verify email token
Update emailVerified to true
3.2 Auth Provider
Create components/providers/convex-provider.tsx:
Wrap ConvexProvider from "convex/react"
Pass Convex client
Create components/providers/auth-provider.tsx:
Context for user, login, logout, register
Store token in localStorage
Query getCurrentUser with token
Provide loading state
Update app/layout.tsx:
Wrap children with ConvexProvider and AuthProvider
3.3 Auth Pages
Create route group /app/(auth)/:
app/(auth)/login/page.tsx:
Email + password form
react-hook-form + zod validation
"Forgot password?" link
"Register" link
Call login mutation
Redirect to dashboard on success
app/(auth)/register/page.tsx:
First name, last name, email, phone, password, confirm password
Form validation (password min 8 chars, 1 number)
Terms checkbox
Call register mutation
Show "Check email for verification" message
app/(auth)/verify-email/page.tsx:
Accept token from URL
Call verifyEmail mutation
Show success/error message
3.4 Protected Routes
Create middleware.ts:
Check for voltbid_token cookie
Public paths: /, /vehicles, /auctions, /how-it-works, /pricing, /login, /register
Redirect to /login if accessing protected route without token
Redirect to /dashboard if accessing /login with valid token
3.5 User Dashboard
Create route group /app/(protected)/: Create app/(protected)/layout.tsx:
Sidebar navigation
Main content area
Check auth (redirect if not logged in)
Pages:
app/(protected)/dashboard/page.tsx - Overview, recent bids, watchlist summary
app/(protected)/watchlist/page.tsx - Saved vehicles grid
app/(protected)/my-bids/page.tsx - Active and past bids table
app/(protected)/orders/page.tsx - Purchase orders list
app/(protected)/account/page.tsx - Account settings, profile edit
Critical Files:
/convex/auth.ts ⭐
/components/providers/auth-provider.tsx
/app/(auth)/login/page.tsx
/app/(auth)/register/page.tsx
/middleware.ts
Phase 4: Auction & Bidding (Weeks 5-6)
Objective: Build live auction room with real-time bidding functionality
4.1 Bidding Convex Functions
Create convex/bids.ts ⭐ CRITICAL: Functions:
placeBid (mutation):
Get userId from session
Validate lot is active
Check bid amount >= currentBid + increment
Check user buying power
Create bid record
Update lot (currentBid, currentBidderId, bidCount)
Mark previous bids as "outbid"
Send outbid notification (via scheduler)
Trigger proxy bid processing (via scheduler)
setMaxBid (mutation):
Create/update maxBids record
Trigger proxy bid processing
processProxyBids (internal mutation):
Get all active max bids for lot
Sort by maxAmount descending
Calculate new bid (beat second highest + increment, up to highest max)
Place proxy bid if needed
getBidsForLot (query):
Get all bids for auction lot
Order by createdAt descending
Return bid history
getUserBids (query):
Get user's active and past bids
Join with vehicle and lot data
4.2 Auction Functions
Create convex/auctions.ts: Functions:
listAuctions (query):
Get auctions by status (live, scheduled)
Include lot count
getAuctionById (query):
Get auction details
Get all lots with vehicles
getCurrentLot (query):
Get active lot for auction
Used for real-time updates in auction room
createAuction (mutation):
Admin only
Create auction record
startScheduledAuctions (internal mutation):
Find auctions with scheduledStart <= now and status "scheduled"
Update status to "live"
Activate first lot
endExpiredLots (internal mutation):
Find lots with endsAt <= now and status "active"
Mark as "sold" or "no_sale"
Create order if sold
Activate next lot
4.3 Scheduled Functions
Create convex/crons.ts:

import { cronJobs } from "convex/server";
import { internal } from "./\_generated/api";

const crons = cronJobs();

crons.interval("start scheduled auctions", { minutes: 1 }, internal.auctions.startScheduledAuctions);
crons.interval("end expired lots", { minutes: 1 }, internal.auctions.endExpiredLots);

export default crons;
4.4 Live Auction Room
Create app/(public)/auctions/[id]/page.tsx: Layout:
Left (60%): Current lot display
Vehicle image
Lot number, VIN
Current bid (large, real-time)
Countdown timer
Quick bid buttons
Custom bid input
Set max bid button
Right (40%): Upcoming lots sidebar
List of next 10 lots
Preview images
Real-time subscriptions:
Subscribe to getAuctionById for auction updates
Subscribe to getCurrentLot for active lot
Subscribe to getBidsForLot for bid history
Bid flow:
User clicks "Quick Bid" or enters custom amount
Call placeBid mutation
Show optimistic update
Display success/error toast
Real-time subscription updates UI
4.5 Watchlist
Create convex/watchlist.ts: Functions:
addToWatchlist (mutation):
Check if already exists
Insert watchlist record
removeFromWatchlist (mutation):
Delete watchlist record
getWatchlist (query):
Get user's watchlist with vehicle details
Critical Files:
/convex/bids.ts ⭐
/convex/auctions.ts
/convex/crons.ts
/convex/watchlist.ts
/app/(public)/auctions/[id]/page.tsx
Phase 5: Admin Dashboard (Week 7)
Objective: Build admin interface for vehicle and auction management
5.1 Admin Layout & Middleware
Create app/(admin)/layout.tsx:
Check user.role === "admin" or "superadmin"
Redirect if not authorized
Admin sidebar with navigation
Main content area
5.2 Vehicle Management
Create app/(admin)/admin/vehicles/page.tsx:
Table of all vehicles
Filter by status
Edit/delete actions
Create app/(admin)/admin/vehicles/new/page.tsx:
Multi-step form:
Basic details (make, model, year, VIN, lot number)
EV specs (battery, range, charging)
Condition (odometer, damage, title)
Images (upload to Cloudinary)
Documents (upload)
Pricing (starting bid, reserve, buy it now)
Image Upload:
Create app/api/upload/route.ts:
Accept multipart/form-data
Upload to Cloudinary
Return image URLs
Convex Functions:
In /convex/vehicles.ts:
createVehicle (mutation) - Admin creates vehicle
updateVehicle (mutation) - Admin updates vehicle
5.3 Auction Management
Create app/(admin)/admin/auctions/page.tsx:
List all auctions
Filter by status
View/edit/delete actions
Create app/(admin)/admin/auctions/new/page.tsx:
Form: name, description, type, scheduled start/end, bid increment
Add lots: search vehicles, set order
Live Auction Control:
Real-time control panel
Start/pause/resume buttons
Advance to next lot
Manual bid entry
Time extension
Convex Functions:
In /convex/auctions.ts:
createAuction (mutation)
updateAuction (mutation)
startAuction (mutation)
pauseAuction (mutation)
advanceLot (mutation)
5.4 Analytics
Create app/(admin)/admin/page.tsx:
Key metrics cards:
Total vehicles
Active auctions
Total bids (24h)
Revenue
Charts:
Revenue over time
Vehicles by make
Bid activity
Convex Functions:
Create /convex/analytics.ts:
getDashboardStats (query)
Critical Files:
/app/(admin)/layout.tsx
/app/(admin)/admin/vehicles/new/page.tsx
/app/(admin)/admin/auctions/new/page.tsx
/app/api/upload/route.ts
Critical Files Summary (in order of implementation)
/convex/schema.ts - Database schema (MUST BE FIRST)
/convex/auth.ts - Authentication system
/convex/vehicles.ts - Vehicle CRUD operations
/convex/bids.ts - Bidding logic
/convex/auctions.ts - Auction management
/lib/utils.ts - Utility functions
/components/voltbid/vehicle-card.tsx - Primary UI component
/components/layout/header.tsx - Site navigation
/app/globals.css - Design system
/app/layout.tsx - Root layout with providers
/components/providers/auth-provider.tsx - Auth context
/app/(public)/vehicles/[id]/page.tsx - Vehicle detail (highest value page)
/app/(auth)/login/page.tsx - Login page
/app/(public)/auctions/[id]/page.tsx - Live auction room
/middleware.ts - Route protection
Environment Setup
Required environment variables (.env.local):

# Convex

CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Cloudinary

CLOUDINARY_CLOUD_NAME=voltbid-africa
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=voltbid-africa

# Paystack (test mode)

PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
Testing Strategy
Manual Testing:
Test each feature as implemented
Use Convex dashboard to verify data
Test real-time subscriptions with multiple browser windows
Type Checking:
Run npx tsc --noEmit after each phase
Fix type errors before proceeding
Performance:
Use Lighthouse for page speed
Monitor Convex query performance in dashboard
Notes
Always use pnpm for package management (per user's global instructions)
No destructive database actions without user approval
Don't run full builds while sorting out issues - use npx tsc for type checking
Follow VoltBid brand colors and typography from brand guide
All currency amounts in Naira (NGN)
All dates/times should use Nigerian timezone
Image optimization via Cloudinary for all vehicle photos
Real-time updates via Convex subscriptions for auctions and bids
