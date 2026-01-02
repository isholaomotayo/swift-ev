# Implementation Plan - Platform Redesign

Refine the visual identity of the VoltBid Africa platform, focusing on the Homepage, Auth pages, and other static pages to achieve a "Premium," "Dynamic," and "Modern" aesthetic.

## User Review Required

> [!IMPORTANT]
> This redesign will significantly change the visual appearance of the application. I will be using `Sora` font for headings more prominently and refining the color usage to be more "premium" (less flat colors, more gradients/glassmorphism).

## Proposed Changes

### Global Styles & Layout
#### [MODIFY] [globals.css](file:///Users/omotayoishola/dev/swiftEv/app/globals.css)
- Refine color palette if needed (ensure gradients are modern).
- Ensure `Sora` font variable is available and used for Headings.

### Database Seeding
To populate the featured section, we will update the seed data to ensure more vehicles are in the `in_auction` state with active auction lots.

#### [MODIFY] [seedData.ts](file:///Users/omotayoishola/dev/swiftEv/convex/seedData.ts)
- Update statuses of existing vehicles to `in_auction`.
- Activate auction lots for these vehicles.

## Phase 2: Inner Apps & Dashboards Redesign
Apply the "Premium," "Dynamic," and "Modern" aesthetic to operational areas.

### Dashboard Layouts
#### [MODIFY] [components/layout/protected-layout-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/layout/protected-layout-client.tsx)
- Redesign sidebar using glassmorphism and gradient accents.
- Update top navigation for better user profile visibility.
- Ensure responsive sidebar (collapsible on mobile).

#### [MODIFY] [components/layout/admin-layout-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/layout/admin-layout-client.tsx)
- Unified improved sidebar design.
- Dark theme optimized for high-density data.

#### [MODIFY] [components/layout/vendor-layout-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/layout/vendor-layout-client.tsx)
- Unified improved sidebar design.

### Buyer Dashboard
#### [MODIFY] [components/dashboard/dashboard-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/dashboard/dashboard-client.tsx)
- **Overview Cards:** Use premium gradients for "Active Bids," "Wins," "Spending."
- **Recent Activity:** Stylized list/table with hover effects.
- **My Bids / Watchlist:** Update to use shared premium component styles (cards or modernized tables).

### Admin & Vendor Dashboards
- We will inspect and update the `AdminDashboardClient` and `VendorDashboardClient` (locations to be confirmed/created) to match the new aesthetic.

### Listings & Details
## Phase 3: Listings & Details Redesign
Redesign the detailed view pages to be immersive and information-rich.

### Vehicle Detail Page
#### [MODIFY] [app/vehicles/[id]/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/vehicles/[id]/page.tsx)
#### [MODIFY] [components/vehicles/vehicle-detail-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/vehicles/vehicle-detail-client.tsx)
- **Hero:** Full-width hero image with a gradient overlay.
- **Layout:** Two-column layout on desktop:
   - **Left:** Image gallery (main + thumbnails), detailed specs in cleaner cards/tabs.
   - **Right:** Sticky "Bid/Buy" sidebar with countdowns, current bid, and action buttons.
- **Glassmorphism:** Use glass effects for the sticky sidebar to keep it distinct.

### Auction Detail Page
#### [MODIFY] [app/auctions/[id]/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/auctions/[id]/page.tsx)
- Ensure consistency with the vehicle detail page, focusing on the live bidding experience.

### Homepage
#### [MODIFY] [app/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/page.tsx)
- **Hero Section:** Redesign significantly. Use a full-width immersive layout or a clean split with "floating" elements. Add entrance animations.
- **Stats:** detailed cards with icons.
- **Featured Vehicles:** specific "Card" component update (or wrapper) to look more premium.
- **Call to Action:** Make it pop with a nice gradient background.

### Authentication
#### [MODIFY] [app/login/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/login/page.tsx)
#### [MODIFY] [app/register/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/register/page.tsx)
- Update the "Branding" side panel to be more visually striking (e.g., car image with overlay, or abstract EV visualization).
- Refine the form container (glassmorphism or clean white with subtle shadow).

### Static Pages
#### [MODIFY] [app/how-it-works/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/how-it-works/page.tsx)
- Use a "Step by Step" vertical timeline or interactive horizontal slider.
- Add illustrations/icons for each step.

#### [MODIFY] [app/pricing/page.tsx](file:///Users/omotayoishola/dev/swiftEv/app/pricing/page.tsx)
- Redesign pricing cards to be "clean" and "tiered" clearly.
- Highlight the "Best Value" or "Most Popular" option with a standout design.

## Verification Plan

### Manual Verification
- **Visual Check:** I will create screenshots (using `browser` tool if I were running it, but since I can't generate screenshots easily without a running server that I can access visually, I will rely on code correctness and descriptive validation).
- **Note:** The user will need to verify the "aesthetic" feel.

### Automated Tests
- Run `pnpm dev` to ensure no build errors.
- Ensure all pages load without runtime errors.

## Phase 4: Admin Enhancements
The user wants to replace page-based navigation for viewing and editing vehicles in the Admin Dashboard with a modal-based approach.
### Admin Vehicle Management
#### [NEW] [components/admin/vehicles/vehicle-actions-modal.tsx](file:///Users/omotayoishola/dev/swiftEv/components/admin/vehicles/vehicle-actions-modal.tsx)
- Use `Dialog` from `shadcn/ui`.
- Props: `vehicle` (optional, for edit/view), `mode` ('view' | 'edit' | 'create'), `isOpen`, `onClose`.
- **View Mode:** Display key vehicle details (Images, Specs, Status, Auction Info) in a read-only layout.
- **Edit Mode:** Render a form to update vehicle details.
    - Fields: Make, Model, Year, VIN, Mileage, Color, Battery Health, Estimated Range.
    - Status management (e.g., change from `pending_inspection` to `ready_for_auction`).

#### [MODIFY] [components/admin/admin-vehicles-client.tsx](file:///Users/omotayoishola/dev/swiftEv/components/admin/admin-vehicles-client.tsx)
- Remove `Link` to `/admin/vehicles/[id]/edit` and `/vehicles/[id]`.
- Add state for `selectedVehicle` and `modalMode`.
- Render `VehicleActionsModal` when a row action is clicked.
