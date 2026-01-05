import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save an image storage ID to system settings
 */
export const saveImageStorageId = mutation({
  args: {
    key: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.storageId,
      });
    } else {
      await ctx.db.insert("systemSettings", {
        key: args.key,
        value: args.storageId,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get an image storage ID from system settings
 */
export const getImageStorageId = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return setting?.value;
  },
});

/**
 * Generate an upload URL for seeding images
 */
export const generateSeedUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Seed the database with sample data
 * Run this once to populate the database for testing
 */
export const seedDatabase = mutation({
  args: {
    clearExisting: v.optional(v.boolean()),
    imageStorageIds: v.optional(v.any()), // Map of filename -> storageId
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 0. Clear existing data if requested
    if (args.clearExisting) {
      console.log("🗑️  Clearing all data from database...");
      const tables = [
        "users", "sessions", "userDocuments", "vehicles", "vehicleImages",
        "vehicleDocuments", "auctions", "auctionLots", "bids", "maxBids",
        "watchlist", "vehicleAlerts", "orders", "payments", "shipments",
        "shipmentUpdates", "customsClearance", "notifications", "sellers",
        "auditLog" // Don't clear systemSettings to preserve image IDs
      ];

      for (const table of tables) {
        const records = await ctx.db.query(table as any).collect();
        for (const record of records) {
          await ctx.db.delete(record._id);
        }
      }
      console.log("✅ Database cleared");
    }

    // ============================================
    // USERS
    // ============================================

    // 1. Admin User - Check if exists first
    let adminId;
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@voltbid.africa"))
      .first();

    if (existingAdmin) {
      adminId = existingAdmin._id;
      console.log("✓ Admin user already exists, skipping creation");
    } else {
      adminId = await ctx.db.insert("users", {
        email: "admin@voltbid.africa",
        firstName: "System",
        lastName: "Administrator",
        passwordHash: "$2a$10$guhGBa7/c2jbqJt9i8gkrOKyueMx6CpCg6IZAfSJBTjN/UhJOG88K", // admin123
        status: "active",
        emailVerified: true,
        phoneVerified: false,
        membershipTier: "business",
        depositAmount: 0,
        buyingPower: 999_999_999,
        dailyBidsUsed: 0,
        lastBidResetAt: now,
        role: "superadmin",
        kycStatus: "approved",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 2. Vendor 1 - BYD Official Nigeria - Check if exists first
    let vendor1Id;
    const existingVendor1 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "vendor@bydnigeria.com"))
      .first();

    if (existingVendor1) {
      vendor1Id = existingVendor1._id;
      console.log("✓ Vendor 1 already exists, skipping creation");
    } else {
      vendor1Id = await ctx.db.insert("users", {
        email: "vendor@bydnigeria.com",
        phone: "+2348012345678",
        firstName: "BYD",
        lastName: "Nigeria",
        passwordHash: "$2a$10$IdVSEXmCv96DL7pabWRnneVI1XILetV72kj0dL/dI98YFRaBup/OG", // vendor123
        status: "active",
        emailVerified: true,
        phoneVerified: true,
        membershipTier: "business",
        depositAmount: 5_000_000,
        buyingPower: 50_000_000,
        dailyBidsUsed: 0,
        lastBidResetAt: now,
        role: "seller",
        vendorCompany: "BYD Auto Nigeria Ltd",
        vendorLicense: "DL-BYD-2024-001",
        kycStatus: "approved",
        createdAt: now - 90 * 24 * 60 * 60 * 1000, // 90 days ago
        updatedAt: now,
      });
    }

    // 3. Vendor 2 - XPeng Motors - Check if exists first
    let vendor2Id;
    const existingVendor2 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "sales@xpeng-ng.com"))
      .first();

    if (existingVendor2) {
      vendor2Id = existingVendor2._id;
      console.log("✓ Vendor 2 already exists, skipping creation");
    } else {
      vendor2Id = await ctx.db.insert("users", {
        email: "sales@xpeng-ng.com",
        phone: "+2348087654321",
        firstName: "XPeng",
        lastName: "Motors",
        passwordHash: "$2a$10$aaAwklBTyxbqmPKu/nF8q.cg1xJn7U1Njx9Qimx3gYE3v4rm1sPou", // vendor456
        status: "active",
        emailVerified: true,
        phoneVerified: true,
        membershipTier: "business",
        depositAmount: 3_000_000,
        buyingPower: 30_000_000,
        dailyBidsUsed: 0,
        lastBidResetAt: now,
        role: "seller",
        vendorCompany: "XPeng Motors Nigeria",
        vendorLicense: "DL-XPN-2024-002",
        kycStatus: "approved",
        createdAt: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        updatedAt: now,
      });
    }

    // 4. Regular Buyer 1 - Premier Member - Check if exists first
    let buyer1Id;
    const existingBuyer1 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "john.doe@example.com"))
      .first();

    if (existingBuyer1) {
      buyer1Id = existingBuyer1._id;
      console.log("✓ Buyer 1 already exists, skipping creation");
    } else {
      buyer1Id = await ctx.db.insert("users", {
        email: "john.doe@example.com",
        phone: "+2348011112222",
        firstName: "John",
        lastName: "Doe",
        passwordHash: "$2a$10$2zNn452QDxi1anEGlm6f.ueqVwlX6tGJv3rdSRVPGti2ejf2L7vYe", // buyer123
        status: "active",
        emailVerified: true,
        phoneVerified: true,
        membershipTier: "premier",
        depositAmount: 500_000,
        buyingPower: 15_000_000,
        dailyBidsUsed: 2,
        lastBidResetAt: now,
        role: "buyer",
        kycStatus: "approved",
        createdAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        updatedAt: now,
        lastLoginAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
      });
    }

    // 5. Regular Buyer 2 - Basic Member - Check if exists first
    let buyer2Id;
    const existingBuyer2 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "jane.smith@example.com"))
      .first();

    if (existingBuyer2) {
      buyer2Id = existingBuyer2._id;
      console.log("✓ Buyer 2 already exists, skipping creation");
    } else {
      buyer2Id = await ctx.db.insert("users", {
        email: "jane.smith@example.com",
        phone: "+2348022223333",
        firstName: "Jane",
        lastName: "Smith",
        passwordHash: "$2a$10$i3cDpEYe7UCJhv93xEVKeefjXDcbpmmEnHjzYRo94myJRrfjqV/UO", // buyer456
        status: "active",
        emailVerified: true,
        phoneVerified: false,
        membershipTier: "basic",
        depositAmount: 100_000,
        buyingPower: 5_000_000,
        dailyBidsUsed: 1,
        lastBidResetAt: now,
        role: "buyer",
        kycStatus: "approved",
        createdAt: now - 15 * 24 * 60 * 60 * 1000, // 15 days ago
        updatedAt: now,
        lastLoginAt: now - 5 * 60 * 60 * 1000, // 5 hours ago
      });
    }

    // 6. Business Buyer - Check if exists first
    let buyer3Id;
    const existingBuyer3 = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "fleet@logistics.ng"))
      .first();

    if (existingBuyer3) {
      buyer3Id = existingBuyer3._id;
      console.log("✓ Buyer 3 already exists, skipping creation");
    } else {
      buyer3Id = await ctx.db.insert("users", {
        email: "fleet@logistics.ng",
        phone: "+2348033334444",
        firstName: "Swift",
        lastName: "Logistics",
        passwordHash: "$2a$10$gMmuUHtCc5ZugIcrtOAtbO5QiO5qdm5CS/xQaaD3pWmgydTskx1kW", // buyer789
        status: "active",
        emailVerified: true,
        phoneVerified: true,
        membershipTier: "business",
        depositAmount: 10_000_000,
        buyingPower: 100_000_000,
        dailyBidsUsed: 5,
        lastBidResetAt: now,
        role: "buyer",
        vendorCompany: "Swift Logistics Ltd",
        kycStatus: "approved",
        createdAt: now - 45 * 24 * 60 * 60 * 1000, // 45 days ago
        updatedAt: now,
        lastLoginAt: now - 1 * 60 * 60 * 1000, // 1 hour ago
      });
    }

    console.log("✓ Created 6 users (1 admin, 2 vendors, 3 buyers)");

    // ============================================
    // VEHICLES
    // ============================================

    // Vehicle 1 - BYD Atto 3 (Ready for Auction)
    const vehicle1Id = await ctx.db.insert("vehicles", {
      lotNumber: "000001",
      vin: "LGXCE2EL7N0123456",
      make: "BYD",
      model: "Atto 3",
      year: 2024,
      trim: "Premium",
      exteriorColor: "Crystal White",
      interiorColor: "Black",
      batteryCapacity: 60.48,
      estimatedRange: 420,
      batteryHealthPercent: 98,
      chargingType: ["AC Type 2", "DC CCS2"],
      motorPower: 150,
      drivetrain: "FWD",
      odometer: 50,
      odometerUnit: "km",
      condition: "excellent",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor1Id,
      currentLocation: {
        facility: "BYD Shanghai Distribution Center",
        city: "Shanghai",
        country: "China",
      },
      startingBid: 8_500_000,
      reservePrice: 10_000_000,
      buyItNowPrice: 12_500_000,
      buyItNowEnabled: true,
      status: "in_auction",
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      updatedAt: now - 7 * 24 * 60 * 60 * 1000,
    });

    // Vehicle 2 - BYD Seal (Ready for Auction)
    const vehicle2Id = await ctx.db.insert("vehicles", {
      lotNumber: "000002",
      vin: "LGXCE2EL7N0234567",
      make: "BYD",
      model: "Seal",
      year: 2024,
      trim: "AWD Performance",
      exteriorColor: "Aurora Blue",
      interiorColor: "Cream",
      batteryCapacity: 82.56,
      estimatedRange: 650,
      batteryHealthPercent: 99,
      chargingType: ["AC Type 2", "DC CCS2"],
      motorPower: 390,
      drivetrain: "AWD",
      odometer: 20,
      odometerUnit: "km",
      condition: "excellent",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor1Id,
      currentLocation: {
        facility: "BYD Shanghai Distribution Center",
        city: "Shanghai",
        country: "China",
      },
      startingBid: 15_000_000,
      reservePrice: 17_500_000,
      buyItNowPrice: 20_000_000,
      buyItNowEnabled: true,
      status: "in_auction",
      createdAt: now - 6 * 24 * 60 * 60 * 1000,
      updatedAt: now - 6 * 24 * 60 * 60 * 1000,
    });

    // Vehicle 3 - XPeng P7 (Ready for Auction)
    const vehicle3Id = await ctx.db.insert("vehicles", {
      lotNumber: "000003",
      vin: "LXVPE2EL7N0345678",
      make: "XPeng",
      model: "P7",
      year: 2023,
      trim: "Long Range",
      exteriorColor: "Midnight Black",
      interiorColor: "Red/Black",
      batteryCapacity: 80.9,
      estimatedRange: 620,
      batteryHealthPercent: 95,
      chargingType: ["AC Type 2", "DC CCS2"],
      motorPower: 196,
      drivetrain: "RWD",
      odometer: 5000,
      odometerUnit: "km",
      condition: "good",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor2Id,
      currentLocation: {
        facility: "XPeng Guangzhou Center",
        city: "Guangzhou",
        country: "China",
      },
      startingBid: 12_000_000,
      reservePrice: 14_000_000,
      buyItNowEnabled: false,
      status: "in_auction",
      createdAt: now - 5 * 24 * 60 * 60 * 1000,
      updatedAt: now - 5 * 24 * 60 * 60 * 1000,
    });

    // Vehicle 4 - XPeng G9 (Ready for Auction)
    const vehicle4Id = await ctx.db.insert("vehicles", {
      lotNumber: "000004",
      vin: "LXVPE2EL7N0456789",
      make: "XPeng",
      model: "G9",
      year: 2024,
      trim: "Performance AWD",
      exteriorColor: "Space Gray",
      interiorColor: "Tan",
      batteryCapacity: 98,
      estimatedRange: 650,
      batteryHealthPercent: 100,
      chargingType: ["AC Type 2", "DC CCS2", "800V Fast Charge"],
      motorPower: 405,
      drivetrain: "AWD",
      odometer: 10,
      odometerUnit: "km",
      condition: "excellent",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor2Id,
      currentLocation: {
        facility: "XPeng Guangzhou Center",
        city: "Guangzhou",
        country: "China",
      },
      startingBid: 18_000_000,
      reservePrice: 20_000_000,
      buyItNowPrice: 24_000_000,
      buyItNowEnabled: true,
      status: "in_auction",
      createdAt: now - 4 * 24 * 60 * 60 * 1000,
      updatedAt: now - 4 * 24 * 60 * 60 * 1000,
    });

    // Vehicle 5 - BYD Tang (In Auction - Will be active)
    const vehicle5Id = await ctx.db.insert("vehicles", {
      lotNumber: "000005",
      vin: "LGXCE2EL7N0567890",
      make: "BYD",
      model: "Tang",
      year: 2024,
      trim: "EV Excellence",
      exteriorColor: "Red",
      interiorColor: "Black",
      batteryCapacity: 108.8,
      estimatedRange: 635,
      batteryHealthPercent: 98,
      chargingType: ["AC Type 2", "DC CCS2"],
      motorPower: 380,
      drivetrain: "AWD",
      odometer: 100,
      odometerUnit: "km",
      condition: "excellent",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor1Id,
      currentLocation: {
        facility: "BYD Shanghai Distribution Center",
        city: "Shanghai",
        country: "China",
      },
      startingBid: 20_000_000,
      reservePrice: 23_000_000,
      buyItNowEnabled: false,
      status: "in_auction",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000,
    });

    // Vehicle 6 - NIO ES6 (Ready for Auction)
    const vehicle6Id = await ctx.db.insert("vehicles", {
      lotNumber: "000006",
      vin: "LNVPE2EL7N0678901",
      make: "NIO",
      model: "ES6",
      year: 2023,
      trim: "Sport",
      exteriorColor: "Oxford Blue",
      interiorColor: "Black/Blue",
      batteryCapacity: 100,
      estimatedRange: 610,
      batteryHealthPercent: 94,
      chargingType: ["AC Type 2", "DC CCS2", "Battery Swap"],
      motorPower: 320,
      drivetrain: "AWD",
      odometer: 8000,
      odometerUnit: "km",
      condition: "good",
      damageDescription: "",
      titleType: "clean",
      titleCountry: "China",
      hasKeys: true,
      sourceType: "dealer",
      sellerId: vendor2Id,
      currentLocation: {
        facility: "XPeng Guangzhou Center",
        city: "Shanghai",
        country: "China",
      },
      startingBid: 14_000_000,
      reservePrice: 16_000_000,
      buyItNowEnabled: false,
      status: "in_auction",
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    });

    console.log("✓ Created 6 vehicles (5 ready, 1 in auction)");

    // Add placeholder images for vehicles
    const imageNames = [
      "byd-atto-3.png",
      "byd-seal.png",
      "xpeng-p7.png",
      "xpeng-g9.png",
      "byd-tang.png",
      "nio-es6.png",
    ];

    const imagePlaceholders = imageNames.map(name => {
      // Use storage ID if provided and exists
      if (args.imageStorageIds && args.imageStorageIds[name]) {
        return args.imageStorageIds[name];
      }
      // Fallback to local path
      return `/images/vehicles/${name}`;
    });

    const vehicleIds = [vehicle1Id, vehicle2Id, vehicle3Id, vehicle4Id, vehicle5Id, vehicle6Id];

    for (let i = 0; i < vehicleIds.length; i++) {
      await ctx.db.insert("vehicleImages", {
        vehicleId: vehicleIds[i],
        imageUrl: imagePlaceholders[i],
        thumbnailUrl: imagePlaceholders[i],
        imageType: "hero",
        order: 0,
        uploadedAt: now,
      });
    }

    console.log("✓ Added images for vehicles");

    // ============================================
    // AUCTION
    // ============================================

    // Create a live auction
    const auctionId = await ctx.db.insert("auctions", {
      name: "VoltBid Weekly EV Auction - January 2026",
      description: "Premium electric vehicles from top Chinese manufacturers. All vehicles inspected and certified with battery health reports.",
      auctionType: "timed",
      status: "live",
      scheduledStart: now - 2 * 60 * 60 * 1000, // Started 2 hours ago
      scheduledEnd: now + 22 * 60 * 60 * 1000, // Ends in 22 hours
      actualStart: now - 2 * 60 * 60 * 1000,
      bidIncrement: 100_000,
      extendOnBid: true,
      extendMinutes: 5,
      totalLots: 4,
      soldLots: 0,
      totalBids: 8,
      createdAt: now - 7 * 24 * 60 * 60 * 1000,
      createdBy: adminId,
    });

    console.log("✓ Created live auction");

    // ============================================
    // AUCTION LOTS
    // ============================================

    // Lot 1 - BYD Tang (Active - currently bidding)
    const lot1Id = await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle5Id,
      lotOrder: 1,
      status: "active",
      currentBid: 21_500_000,
      currentBidderId: buyer3Id,
      bidCount: 8,
      reserveMet: true,
      // New required fields
      startingBid: 20_000_000,
      reservePrice: 23_000_000,
      buyItNowEnabled: false,
      buyItNowPrice: undefined,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000, // 24 hours
      estimatedStartTime: now - 2 * 60 * 60 * 1000, // Started 2 hours ago
      startsAt: now - 2 * 60 * 60 * 1000,
      endsAt: now + 3 * 60 * 60 * 1000, // Ends in 3 hours
    });

    // Lot 2 - BYD Atto 3 (Active)
    const lot2Id = await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle1Id,
      lotOrder: 2,
      status: "active",
      currentBid: 8_500_000,
      bidCount: 0,
      reserveMet: false,
      startingBid: 8_500_000,
      reservePrice: 10_000_000,
      buyItNowPrice: 12_500_000,
      buyItNowEnabled: true,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000,
      estimatedStartTime: now - 1 * 60 * 60 * 1000, // Started 1 hour ago
      startsAt: now - 1 * 60 * 60 * 1000,
      endsAt: now + 23 * 60 * 60 * 1000,
    });

    // Lot 3 - BYD Seal (Active)
    await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle2Id,
      lotOrder: 3,
      status: "active",
      currentBid: 15_000_000,
      bidCount: 2,
      reserveMet: false,
      startingBid: 15_000_000,
      reservePrice: 17_500_000,
      buyItNowPrice: 20_000_000,
      buyItNowEnabled: true,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000,
      estimatedStartTime: now - 30 * 60 * 1000, // Started 30 mins ago
      startsAt: now - 30 * 60 * 1000,
      endsAt: now + 23.5 * 60 * 60 * 1000,
    });

    // Lot 4 - XPeng P7 (Active)
    await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle3Id,
      lotOrder: 4,
      status: "active",
      currentBid: 12_500_000,
      bidCount: 5,
      reserveMet: false,
      startingBid: 12_000_000,
      reservePrice: 14_000_000,
      buyItNowPrice: undefined,
      buyItNowEnabled: false,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000,
      estimatedStartTime: now - 15 * 60 * 1000, // Started 15 mins ago
      startsAt: now - 15 * 60 * 1000,
      endsAt: now + 23.75 * 60 * 60 * 1000,
    });

    // Lot 5 - XPeng G9 (Active)
    await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle4Id,
      lotOrder: 5,
      status: "active",
      currentBid: 18_000_000,
      bidCount: 0,
      reserveMet: false,
      startingBid: 18_000_000,
      reservePrice: 20_000_000,
      buyItNowPrice: 24_000_000,
      buyItNowEnabled: true,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000,
      estimatedStartTime: now - 10 * 60 * 1000,
      startsAt: now - 10 * 60 * 1000,
      endsAt: now + 23.8 * 60 * 60 * 1000,
    });

    // Lot 6 - NIO ES6 (Active)
    await ctx.db.insert("auctionLots", {
      auctionId,
      vehicleId: vehicle6Id,
      lotOrder: 6,
      status: "active",
      currentBid: 14_200_000,
      bidCount: 3,
      reserveMet: false,
      startingBid: 14_000_000,
      reservePrice: 16_000_000,
      buyItNowPrice: undefined,
      buyItNowEnabled: false,
      bidIncrement: 100_000,
      lotDuration: 24 * 60 * 60 * 1000,
      estimatedStartTime: now - 5 * 60 * 1000,
      startsAt: now - 5 * 60 * 1000,
      endsAt: now + 23.9 * 60 * 60 * 1000,
    });

    console.log("✓ Created 4 auction lots (1 active, 3 pending)");

    // ============================================
    // BIDS
    // ============================================

    // Bids for Lot 1 (BYD Tang)
    const bidTimes = [
      now - 55 * 60 * 1000, // 55 mins ago
      now - 50 * 60 * 1000,
      now - 45 * 60 * 1000,
      now - 40 * 60 * 1000,
      now - 35 * 60 * 1000,
      now - 25 * 60 * 1000,
      now - 15 * 60 * 1000,
      now - 5 * 60 * 1000, // 5 mins ago
    ];

    const bidAmounts = [
      20_000_000, // Starting
      20_100_000,
      20_300_000,
      20_500_000,
      20_800_000,
      21_000_000,
      21_200_000,
      21_500_000, // Current
    ];

    const bidUsers = [buyer1Id, buyer2Id, buyer3Id, buyer1Id, buyer2Id, buyer3Id, buyer1Id, buyer3Id];

    for (let i = 0; i < bidTimes.length; i++) {
      await ctx.db.insert("bids", {
        auctionLotId: lot1Id,
        userId: bidUsers[i],
        bidAmount: bidAmounts[i],
        bidType: "live",
        status: i === bidTimes.length - 1 ? "winning" : "outbid",
        createdAt: bidTimes[i],
      });
    }

    console.log("✓ Created 8 bids for active lot");

    // ============================================
    // MAX BIDS
    // ============================================

    // John Doe has a max bid of ₦22M
    await ctx.db.insert("maxBids", {
      auctionLotId: lot1Id,
      userId: buyer1Id,
      maxAmount: 22_000_000,
      currentProxyBid: 21_500_000,
      isActive: true,
      createdAt: now - 50 * 60 * 1000,
      updatedAt: now - 5 * 60 * 1000,
    });

    // Swift Logistics has a max bid of ₦23M (highest)
    await ctx.db.insert("maxBids", {
      auctionLotId: lot1Id,
      userId: buyer3Id,
      maxAmount: 23_000_000,
      currentProxyBid: 21_500_000,
      isActive: true,
      createdAt: now - 45 * 60 * 1000,
      updatedAt: now - 5 * 60 * 1000,
    });

    console.log("✓ Created 2 max bids");

    // ============================================
    // WATCHLIST
    // ============================================

    // John watching BYD Seal
    await ctx.db.insert("watchlist", {
      userId: buyer1Id,
      vehicleId: vehicle2Id,
      addedAt: now - 24 * 60 * 60 * 1000,
    });

    // Jane watching XPeng P7
    await ctx.db.insert("watchlist", {
      userId: buyer2Id,
      vehicleId: vehicle3Id,
      addedAt: now - 12 * 60 * 60 * 1000,
    });

    // Swift Logistics watching multiple
    await ctx.db.insert("watchlist", {
      userId: buyer3Id,
      vehicleId: vehicle1Id,
      addedAt: now - 6 * 60 * 60 * 1000,
    });

    await ctx.db.insert("watchlist", {
      userId: buyer3Id,
      vehicleId: vehicle4Id,
      addedAt: now - 6 * 60 * 60 * 1000,
    });

    console.log("✓ Created watchlist items");

    // ============================================
    // SUMMARY
    // ============================================

    return {
      success: true,
      message: "Database seeded successfully!",
      summary: {
        users: 6,
        vehicles: 6,
        auctions: 1,
        lots: 4,
        bids: 8,
        maxBids: 2,
        watchlist: 4,
      },
      credentials: {
        admin: { email: "admin@voltbid.africa", password: "admin123" },
        vendor1: { email: "vendor@bydnigeria.com", password: "vendor123" },
        vendor2: { email: "sales@xpeng-ng.com", password: "vendor456" },
        buyer1: { email: "john.doe@example.com", password: "buyer123" },
        buyer2: { email: "jane.smith@example.com", password: "buyer456" },
        buyer3: { email: "fleet@logistics.ng", password: "buyer789" },
      },
    };
  },
});
