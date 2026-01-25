# autoexports.live - Database Seeding Guide

## User Types Available

The platform supports **4 user roles**:

### 1. **Buyer** (Regular Users)
- Can browse vehicles
- Can place bids
- Can set max bids (proxy bidding)
- Has membership tiers: Guest, Basic, Premier, Business
- Has daily bid limits based on tier
- Has buying power limits

### 2. **Seller** (Vendors)
- Can upload vehicles to their inventory
- Can set pricing (starting bid, reserve, buy it now)
- Can manage their vehicle listings
- Requires vendor company name and license
- Approved sellers can list vehicles for auction

### 3. **Admin**
- Can manage all vehicles
- Can create and manage auctions
- Can approve/reject vendor vehicles
- Can view all bids and users
- Can control live auctions

### 4. **Superadmin**
- All admin permissions
- Can manage other admins
- Full system access

---

## Seed Data Overview

The seed data creates:
- ✅ **6 Users**: 1 admin, 2 vendors, 3 buyers
- ✅ **6 Vehicles**: From BYD, XPeng, and NIO
- ✅ **1 Live Auction**: "AutoExports Weekly EV Auction"
- ✅ **4 Auction Lots**: 1 active (with live bidding), 3 pending
- ✅ **8 Bids**: Real bidding activity on active lot
- ✅ **2 Max Bids**: Proxy bidding setup
- ✅ **4 Watchlist Items**: Users watching vehicles

---

## How to Seed the Database

### Step 1: Start Convex

```bash
pnpm convex:dev
```

This will:
- Push your schema to Convex
- Generate TypeScript types
- Start watching for changes

### Step 2: Run the Seed Function

Open the Convex dashboard at: https://dashboard.convex.dev

1. Navigate to your project
2. Click on **"Functions"** in the left sidebar
3. Find `seedData:seedDatabase` in the list
4. Click **"Run"** (no arguments needed)
5. Wait for completion (should take 2-3 seconds)

### Step 3: Verify the Data

You should see a success message with the summary:

```json
{
  "success": true,
  "message": "Database seeded successfully!",
  "summary": {
    "users": 6,
    "vehicles": 6,
    "auctions": 1,
    "lots": 4,
    "bids": 8,
    "maxBids": 2,
    "watchlist": 4
  }
}
```

---

## Test Credentials

After seeding, you can log in with these accounts:

### Admin Account
```
Email: admin@autoexports.live
Password: admin123
```

### Vendor Accounts

**BYD Nigeria (Vendor 1)**
```
Email: vendor@bydnigeria.com
Password: vendor123
Company: BYD Auto Nigeria Ltd
Vehicles: 3 (Atto 3, Seal, Tang)
```

**XPeng Motors (Vendor 2)**
```
Email: sales@xpeng-ng.com
Password: vendor456
Company: XPeng Motors Nigeria
Vehicles: 2 (P7, G9)
```

### Buyer Accounts

**John Doe (Premier Member)**
```
Email: john.doe@example.com
Password: buyer123
Membership: Premier
Buying Power: ₦15,000,000
Daily Bids: 10
Current Activity: Bidding on BYD Tang (₦21.5M bid)
```

**Jane Smith (Basic Member)**
```
Email: jane.smith@example.com
Password: buyer456
Membership: Basic
Buying Power: ₦5,000,000
Daily Bids: 3
Current Activity: Has bid history
```

**Swift Logistics (Business Member)**
```
Email: fleet@logistics.ng
Password: buyer789
Membership: Business
Buying Power: ₦100,000,000
Daily Bids: Unlimited
Current Activity: High bidder on BYD Tang (₦21.5M)
```

---

## Seeded Vehicles

### 1. BYD Atto 3 (Lot #VB-000001)
- **Year**: 2024
- **Battery**: 60.48 kWh
- **Range**: 420 km
- **Health**: 98%
- **Status**: Ready for auction
- **Starting Bid**: ₦8,500,000
- **Reserve**: ₦10,000,000
- **Vendor**: BYD Nigeria

### 2. BYD Seal (Lot #VB-000002)
- **Year**: 2024 AWD Performance
- **Battery**: 82.56 kWh
- **Range**: 650 km
- **Health**: 99%
- **Status**: Ready for auction
- **Starting Bid**: ₦15,000,000
- **Reserve**: ₦17,500,000
- **Vendor**: BYD Nigeria

### 3. XPeng P7 (Lot #VB-000003)
- **Year**: 2023
- **Battery**: 80.9 kWh
- **Range**: 620 km
- **Health**: 95%
- **Status**: Ready for auction
- **Starting Bid**: ₦12,000,000
- **Vendor**: XPeng Motors

### 4. XPeng G9 (Lot #VB-000004)
- **Year**: 2024 Performance AWD
- **Battery**: 98 kWh
- **Range**: 650 km
- **Health**: 100%
- **Status**: Ready for auction
- **Starting Bid**: ₦18,000,000
- **Vendor**: XPeng Motors

### 5. BYD Tang ⚡ (Lot #VB-000005) - **ACTIVE AUCTION**
- **Year**: 2024 EV Excellence
- **Battery**: 108.8 kWh
- **Range**: 635 km
- **Health**: 98%
- **Status**: IN AUCTION (Live bidding!)
- **Current Bid**: ₦21,500,000 (Swift Logistics)
- **Bid Count**: 8 bids
- **Reserve**: ₦23,000,000 (NOT MET)
- **Time Remaining**: ~3 hours
- **Vendor**: BYD Nigeria

### 6. NIO ES6 (Lot #VB-000006)
- **Year**: 2023 Sport
- **Battery**: 100 kWh (with Battery Swap!)
- **Range**: 610 km
- **Health**: 94%
- **Status**: Ready for auction
- **Starting Bid**: ₦14,000,000
- **Vendor**: XPeng Motors (cross-listing)

---

## Testing the Platform

After seeding, you can test:

### 1. **Browse as Guest**
- Visit http://localhost:3000
- Browse vehicles
- View details
- Try to bid (will be prompted to login)

### 2. **Login as Buyer**
- Use John's or Jane's credentials
- Place bids on active lot (BYD Tang)
- Set max bids
- Add vehicles to watchlist
- View your bid history

### 3. **Login as Vendor**
- Use BYD or XPeng credentials
- View your uploaded vehicles
- Check performance/stats
- (Upload functionality coming soon)

### 4. **Login as Admin**
- Use admin credentials
- Visit http://localhost:3000/admin
- View dashboard stats
- Manage all vehicles
- Control auctions
- Advance lots manually

---

## Current Auction Status

**AutoExports Weekly EV Auction - January 2026**
- Status: 🟢 LIVE
- Started: 2 hours ago
- Ends: In 22 hours
- Type: Timed Auction

**Active Lot**: BYD Tang (Lot 1/4)
- Current bid: ₦21,500,000
- High bidder: Swift Logistics
- Bids: 8
- Time left: ~3 hours
- Reserve: NOT MET (needs ₦23M)

**Upcoming Lots**:
- Lot 2: BYD Atto 3 (starts after Tang)
- Lot 3: BYD Seal
- Lot 4: XPeng P7

---

## Max Bids (Proxy Bidding)

The seed data includes active proxy bidding:

- **John Doe**: Max bid of ₦22,000,000 on BYD Tang
- **Swift Logistics**: Max bid of ₦23,000,000 on BYD Tang *(highest)*

This means if someone bids ₦21,600,000, Swift's proxy will automatically counter-bid up to ₦23M!

---

## Watchlist

Users are watching:
- John → BYD Seal
- Jane → XPeng P7
- Swift Logistics → BYD Atto 3, XPeng G9

---

## Important Notes

### Password Hashing
⚠️ **CRITICAL**: The seed data uses placeholder password hashing. Before production:

1. Open `convex/auth.ts`
2. Replace placeholder hashing with bcrypt:

```typescript
import bcrypt from 'bcryptjs';

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

3. Re-seed the database with real hashes

### Images
The seed data uses placeholder images from Unsplash. In production:
- Integrate Cloudinary
- Upload real vehicle photos
- Add multiple angles

### Vendor Upload (Coming Soon)
To allow vendors to upload vehicles:
1. Create vendor dashboard at `/vendor`
2. Build vehicle upload form
3. Add image upload (Cloudinary)
4. Implement admin approval workflow

---

## Clearing the Database

To start fresh, you can delete all data from the Convex dashboard:

1. Go to **Data** tab
2. Select each table
3. Click **Delete all documents**
4. Run seed function again

Or create a clear function in `convex/seedData.ts`:

```typescript
export const clearDatabase = mutation({
  handler: async (ctx) => {
    // Delete all records from each table
    // (implement as needed)
  }
});
```

---

## Next Steps

After seeding:

1. ✅ Test the live auction
2. ✅ Place some bids
3. ✅ Try proxy bidding
4. ✅ Test as different user types
5. ✅ Explore admin dashboard
6. Build vendor upload interface
7. Add more vehicles
8. Create more auctions

---

Enjoy testing autoexports.live! ⚡🚗
