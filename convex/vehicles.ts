import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireSeller } from "./lib/auth";

/**
 * Get featured vehicles for homepage
 * Returns vehicles currently in auction, limited to 8
 */
export const getFeaturedVehicles = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .filter((q) => q.eq(q.field("status"), "in_auction"))
      .order("desc")
      .take(8);

    // Get images for each vehicle
    const vehiclesWithImages = await Promise.all(
      vehicles.map(async (vehicle) => {
        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .collect();

        // Get active auction lot if exists
        const auctionLot = await ctx.db
          .query("auctionLots")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        return {
          ...vehicle,
          images: imagesWithUrls,
          heroImage: imagesWithUrls[0]?.url,
          auctionLot,
        };
      })
    );

    return vehiclesWithImages;
  },
});

/**
 * Get vehicle statistics for homepage
 */
export const getVehicleStats = query({
  args: {},
  handler: async (ctx) => {
    const totalListings = await ctx.db
      .query("vehicles")
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .collect();

    const totalSold = await ctx.db
      .query("vehicles")
      .filter((q) => q.eq(q.field("status"), "sold"))
      .collect();

    const activeAuctions = await ctx.db
      .query("auctions")
      .filter((q) => q.eq(q.field("status"), "live"))
      .collect();

    return {
      totalListings: totalListings.length,
      totalSold: totalSold.length,
      activeAuctions: activeAuctions.length,
    };
  },
});

/**
 * List vehicles with filters and pagination
 */
export const listVehicles = query({
  args: {
    make: v.optional(v.string()),
    yearMin: v.optional(v.number()),
    yearMax: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    batteryHealthMin: v.optional(v.number()),
    condition: v.optional(
      v.union(
        v.literal("excellent"),
        v.literal("good"),
        v.literal("fair"),
        v.literal("salvage")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending_approval"),
        v.literal("approved"),
        v.literal("scheduled"),
        v.literal("in_auction"),
        v.literal("sold"),
        v.literal("unsold"),
        v.literal("withdrawn")
      )
    ),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("price_asc"),
        v.literal("price_desc"),
        v.literal("ending_soon")
      )
    ),
  },
  handler: async (ctx, args) => {
    const {
      make,
      yearMin,
      yearMax,
      priceMin,
      priceMax,
      batteryHealthMin,
      condition,
      status,
      page = 0,
      limit = 20,
      sortBy = "newest",
    } = args;

    // Start with base query
    let vehicles = await ctx.db.query("vehicles").collect();

    // Apply filters
    vehicles = vehicles.filter((vehicle) => {
      if (make && vehicle.make !== make) return false;
      if (yearMin && vehicle.year < yearMin) return false;
      if (yearMax && vehicle.year > yearMax) return false;
      if (batteryHealthMin && (vehicle.batteryHealthPercent || 0) < batteryHealthMin) return false;
      if (condition && vehicle.condition !== condition) return false;
      if (status && vehicle.status !== status) return false;
      return true;
    });

    // Get auction lots for price filtering and sorting
    const vehiclesWithLots = await Promise.all(
      vehicles.map(async (vehicle) => {
        const auctionLot = await ctx.db
          .query("auctionLots")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        return { vehicle, auctionLot };
      })
    );

    // Filter by price (using current bid from auction lot)
    let filtered = vehiclesWithLots.filter(({ vehicle, auctionLot }) => {
      const currentPrice = auctionLot?.currentBid || vehicle.startingBid || 0;
      if (priceMin && currentPrice < priceMin) return false;
      if (priceMax && currentPrice > priceMax) return false;
      return true;
    });

    // Sort
    if (sortBy === "newest") {
      filtered.sort((a, b) => b.vehicle._creationTime - a.vehicle._creationTime);
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => a.vehicle._creationTime - b.vehicle._creationTime);
    } else if (sortBy === "price_asc") {
      filtered.sort((a, b) => {
        const priceA = a.auctionLot?.currentBid || a.vehicle.startingBid || 0;
        const priceB = b.auctionLot?.currentBid || b.vehicle.startingBid || 0;
        return priceA - priceB;
      });
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => {
        const priceA = a.auctionLot?.currentBid || a.vehicle.startingBid || 0;
        const priceB = b.auctionLot?.currentBid || b.vehicle.startingBid || 0;
        return priceB - priceA;
      });
    } else if (sortBy === "ending_soon") {
      filtered.sort((a, b) => {
        const endA = a.auctionLot?.endsAt || Infinity;
        const endB = b.auctionLot?.endsAt || Infinity;
        return endA - endB;
      });
    }

    // Pagination
    const total = filtered.length;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    // Get images for paginated results
    const vehiclesWithImages = await Promise.all(
      paginatedResults.map(async ({ vehicle, auctionLot }) => {
        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .collect();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        return {
          ...vehicle,
          images: imagesWithUrls,
          heroImage: imagesWithUrls[0]?.url,
          auctionLot,
        };
      })
    );

    return {
      vehicles: vehiclesWithImages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: endIndex < total,
      },
    };
  },
});

/**
 * Search vehicles by text
 */
export const searchVehicles = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, limit = 20 } = args;
    const term = searchTerm.toLowerCase();

    const vehicles = await ctx.db.query("vehicles").collect();

    // Simple text search across make, model, VIN, lot number
    const matchedVehicles = vehicles
      .filter((vehicle) => {
        const searchableText = [
          vehicle.make,
          vehicle.model,
          vehicle.vin,
          vehicle.lotNumber,
          vehicle.year.toString(),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(term);
      })
      .slice(0, limit);

    // Get images for matched vehicles
    const vehiclesWithImages = await Promise.all(
      matchedVehicles.map(async (vehicle) => {
        const images = await ctx.db
          .query("vehicleImages")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .order("asc")
          .take(1);

        const auctionLot = await ctx.db
          .query("auctionLots")
          .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
          .filter((q) => q.eq(q.field("status"), "active"))
          .first();

        const imagesWithUrls = await Promise.all(
          images.map(async (img) => {
            let url = img.imageUrl;
            if (!url.startsWith("http") && !url.startsWith("/")) {
              url = (await ctx.storage.getUrl(url)) || "";
            }
            return {
              url,
              alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
              type: img.imageType,
            };
          })
        );

        return {
          ...vehicle,
          images: imagesWithUrls,
          heroImage: imagesWithUrls[0]?.url,
          auctionLot,
        };
      })
    );

    return vehiclesWithImages;
  },
});

/**
 * Get vehicle by ID with all related data
 */
export const getVehicleById = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const vehicle = await ctx.db.get(args.vehicleId);

    if (!vehicle) {
      return null;
    }

    // Get all images
    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .order("asc")
      .collect();

    // Get active auction lot
    const auctionLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    // Get bid history if there's an active lot
    let bids: Doc<"bids">[] = [];
    if (auctionLot) {
      bids = await ctx.db
        .query("bids")
        .withIndex("by_auction_lot", (q) => q.eq("auctionLotId", auctionLot._id))
        .order("desc")
        .take(50);
    }

    // Get documents
    const documents = await ctx.db
      .query("vehicleDocuments")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .collect();

    const imagesWithUrls = await Promise.all(
      images.map(async (img) => {
        let url = img.imageUrl;
        if (!url.startsWith("http") && !url.startsWith("/")) {
          url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
        }
        return {
          _id: img._id,
          url,
          alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          type: img.imageType,
          displayOrder: img.order,
        };
      })
    );

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        let url = doc.documentUrl;
        if (!url.startsWith("http") && !url.startsWith("/")) {
          url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
        }
        return {
          _id: doc._id,
          type: doc.documentType,
          url,
        };
      })
    );

    return {
      ...vehicle,
      images: imagesWithUrls,
      heroImage: imagesWithUrls[0]?.url,
      auctionLot,
      bids: bids.map((bid) => ({
        _id: bid._id,
        amount: bid.bidAmount,
        createdAt: bid.createdAt,
        userId: bid.userId,
        type: bid.bidType,
      })),
      documents: documentsWithUrls,
    };
  },
});

/**
 * Get available filter options for vehicle listing page
 */
export const getFilterOptions = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehicles").collect();

    // Get unique makes
    const makes = [...new Set(vehicles.map((v) => v.make))].sort();

    // Get year range
    const years = vehicles.map((v) => v.year);
    const yearRange = {
      min: Math.min(...years),
      max: Math.max(...years),
    };

    // Get price range from auction lots
    const auctionLots = await ctx.db.query("auctionLots").collect();
    const prices = auctionLots.map((lot) => lot.currentBid);
    const priceRange = {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 0),
    };

    return {
      makes,
      yearRange,
      priceRange,
    };
  },
});

/**
 * Vendor: Create a new vehicle
 */
export const createVehicle = mutation({
  args: {
    token: v.string(),
    vehicleData: v.object({
      // Basic details
      make: v.string(),
      model: v.string(),
      year: v.number(),
      vin: v.string(),
      lotNumber: v.string(),
      odometer: v.number(),
      exteriorColor: v.string(),
      interiorColor: v.string(),

      // EV specs
      batteryCapacity: v.number(),
      batteryHealthPercent: v.number(),
      range: v.number(),
      batteryType: v.string(),
      chargingTypes: v.array(v.string()),
      motorPower: v.number(),

      // Condition
      condition: v.string(),
      damageDescription: v.string(),

      // Location
      locationCity: v.string(),
      locationState: v.string(),
      locationCountry: v.string(),

      // Pricing
      startingBid: v.number(),
      reservePrice: v.number(),
      buyItNowPrice: v.optional(v.number()),

      // Images
      imageUrls: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get user from session token
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session) {
      throw new Error("Invalid session. Please log in again.");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Session expired. Please log in again.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is a vendor (seller)
    if (user.role !== "seller") {
      throw new Error("Only vendors can upload vehicles");
    }

    const { vehicleData } = args;

    // Check for duplicate VIN
    const existingVIN = await ctx.db
      .query("vehicles")
      .withIndex("by_vin", (q) => q.eq("vin", vehicleData.vin))
      .first();

    if (existingVIN) {
      throw new Error(`A vehicle with VIN ${vehicleData.vin} already exists`);
    }

    // Check for duplicate lot number
    const existingLotNumber = await ctx.db
      .query("vehicles")
      .withIndex("by_lot_number", (q) => q.eq("lotNumber", vehicleData.lotNumber))
      .first();

    if (existingLotNumber) {
      throw new Error(`A vehicle with lot number ${vehicleData.lotNumber} already exists`);
    }

    const now = Date.now();

    // Create vehicle record matching exact schema
    const vehicleId = await ctx.db.insert("vehicles", {
      lotNumber: vehicleData.lotNumber,
      vin: vehicleData.vin,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      exteriorColor: vehicleData.exteriorColor,
      interiorColor: vehicleData.interiorColor,
      batteryCapacity: vehicleData.batteryCapacity,
      estimatedRange: vehicleData.range,
      batteryHealthPercent: vehicleData.batteryHealthPercent,
      chargingType: vehicleData.chargingTypes, // Schema uses singular 'chargingType'
      motorPower: vehicleData.motorPower,
      odometer: vehicleData.odometer,
      odometerUnit: "km",
      condition: vehicleData.condition as "new" | "like_new" | "excellent" | "good" | "fair" | "salvage",
      damageDescription: vehicleData.damageDescription,
      titleType: "clean",
      titleCountry: vehicleData.locationCountry,
      hasKeys: true, // Default
      sourceType: "consignment",
      sellerId: user._id,
      currentLocation: {
        facility: user.vendorCompany || "Vendor Facility",
        city: vehicleData.locationCity,
        country: vehicleData.locationCountry,
      },
      startingBid: vehicleData.startingBid,
      reservePrice: vehicleData.reservePrice,
      buyItNowPrice: vehicleData.buyItNowPrice,
      status: "pending_approval",
      createdAt: now,
      updatedAt: now,
    });

    // Create image records matching exact schema
    await Promise.all(
      vehicleData.imageUrls.map(async (url, index) => {
        await ctx.db.insert("vehicleImages", {
          vehicleId,
          imageUrl: url,
          thumbnailUrl: url, // In production, generate actual thumbnails
          imageType: index === 0 ? "hero" : "exterior",
          order: index,
          uploadedAt: now,
        });
      })
    );

    return { vehicleId };
  },
});

/**
 * Admin: Update vehicle
 */
export const updateVehicle = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    updates: v.object({
      make: v.optional(v.string()),
      model: v.optional(v.string()),
      year: v.optional(v.number()),
      vin: v.optional(v.string()), // Allow correcting VIN
      lotNumber: v.optional(v.string()),
      odometer: v.optional(v.number()),
      exteriorColor: v.optional(v.string()),
      interiorColor: v.optional(v.string()),

      // EV specs
      batteryCapacity: v.optional(v.number()),
      batteryHealthPercent: v.optional(v.number()),
      estimatedRange: v.optional(v.number()), // Note: Frontend might send 'range', map to 'estimatedRange'
      batteryType: v.optional(v.string()),
      chargingType: v.optional(v.array(v.string())),
      motorPower: v.optional(v.number()),

      condition: v.optional(
        v.union(
          v.literal("new"),
          v.literal("like_new"),
          v.literal("excellent"),
          v.literal("good"),
          v.literal("fair"),
          v.literal("salvage")
        )
      ),
      damageDescription: v.optional(v.string()),

      // Pricing
      startingBid: v.optional(v.number()),
      reservePrice: v.optional(v.number()),
      buyItNowPrice: v.optional(v.number()),

      // Location
      currentLocation: v.optional(
        v.object({
          facility: v.string(),
          city: v.string(),
          country: v.string(),
        })
      ),

      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("pending_inspection"), // Added missing status
          v.literal("pending_approval"),
          v.literal("approved"),
          v.literal("ready_for_auction"), // Added missing status
          v.literal("scheduled"),
          v.literal("in_auction"),
          v.literal("sold"),
          v.literal("unsold"),
          v.literal("withdrawn"),
          v.literal("payment_pending"), // Added missing status
          v.literal("in_transit"), // Added missing status
          v.literal("delivered"), // Added missing status
          v.literal("cancelled") // Added missing status
        )
      ),
      // Images - Optional array of strings (URLs or Storage IDs)
      imageUrls: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authentication check

    const { vehicleId, updates } = args;

    // 1. Update vehicle fields
    // Separate imageUrls from the patch as it's not a field on the 'vehicles' table
    const { imageUrls, ...vehicleUpdates } = updates;

    await ctx.db.patch(vehicleId, vehicleUpdates);

    // 2. Update images if provided
    if (imageUrls) {
      // Delete existing images
      const existingImages = await ctx.db
        .query("vehicleImages")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .collect();

      await Promise.all(existingImages.map((img) => ctx.db.delete(img._id)));

      // Insert new images
      const now = Date.now();
      await Promise.all(
        imageUrls.map(async (url, index) => {
          await ctx.db.insert("vehicleImages", {
            vehicleId,
            imageUrl: url,
            thumbnailUrl: url,
            imageType: index === 0 ? "hero" : "exterior", // Simple logic for type
            order: index,
            uploadedAt: now,
          });
        })
      );
    }

    return { success: true };
  },
});

/**
 * Get vendor statistics for analytics
 * Seller only
 */
export const getVendorStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireSeller(user);

    // Get vendor's vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .filter((q) => q.eq(q.field("sellerId"), user._id))
      .collect();

    // Calculate stats
    const total = vehicles.length;
    const inAuction = vehicles.filter((v) => v.status === "in_auction").length;
    const sold = vehicles.filter((v) => v.status === "sold").length;
    const pending = vehicles.filter((v) => v.status === "pending_approval").length;

    // Calculate revenue from sold vehicles
    const soldVehicles = vehicles.filter((v) => v.status === "sold");
    let totalRevenue = 0;

    // Get auction lots for sold vehicles to find winning bids
    for (const vehicle of soldVehicles) {
      const lot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .filter((q) => q.eq(q.field("status"), "sold"))
        .first();

      if (lot && lot.winningBid) {
        totalRevenue += lot.winningBid;
      }
    }

    const averageSalePrice = sold > 0 ? totalRevenue / sold : 0;

    return {
      totalVehicles: total,
      inAuction,
      sold,
      pending,
      totalRevenue,
      averageSalePrice,
    };
  },
});

/**
 * Get vendor revenue history
 * Seller only
 */
export const getVendorRevenueHistory = query({
  args: {
    token: v.string(),
    months: v.optional(v.number()), // Number of months to look back
  },
  handler: async (ctx, args) => {
    // Validate authorization
    const user = await requireAuth(ctx, args.token);
    requireSeller(user);

    const monthsBack = args.months || 6;

    // Get vendor's sold vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .filter((q) =>
        q.and(
          q.eq(q.field("sellerId"), user._id),
          q.eq(q.field("status"), "sold")
        )
      )
      .collect();

    // Group sales by month
    const monthlyRevenue: { [key: string]: number } = {};

    for (const vehicle of vehicles) {
      const lot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .filter((q) => q.eq(q.field("status"), "sold"))
        .first();

      if (lot && lot.soldAt && lot.winningBid) {
        const date = new Date(lot.soldAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += lot.winningBid;
      }
    }

    // Convert to array and sort by date
    const revenueData = Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-monthsBack);

    return revenueData;
  },
});
