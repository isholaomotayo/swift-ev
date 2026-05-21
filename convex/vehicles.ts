import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireSeller } from "./lib/auth";
import { generateUniqueOrderNumber, calculateServiceFee } from "./lib/orders";

/**
 * Get featured vehicles for homepage
 * Returns the 3 latest uploaded vehicles
 */
export const getFeaturedVehicles = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .order("desc")
      .take(3);

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
        v.literal("pending_inspection"),
        v.literal("ready_for_auction"),
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

    // Start with base query and optionally narrow via status index.
    const vehiclesQuery = status
      ? ctx.db.query("vehicles").withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("vehicles");

    // Apply filters at the database level
    const vehicles = await vehiclesQuery.filter((q) => {
      const conditions = [];
      if (make) conditions.push(q.eq(q.field("make"), make));
      if (yearMin) conditions.push(q.gte(q.field("year"), yearMin));
      if (yearMax) conditions.push(q.lte(q.field("year"), yearMax));
      if (batteryHealthMin) conditions.push(q.gte(q.field("batteryHealthPercent"), batteryHealthMin));
      if (condition) conditions.push(q.eq(q.field("condition"), condition));

      if (conditions.length === 0) return q.neq(q.field("_id"), "dummy" as any);
      
      let expr = conditions[0];
      for (let i = 1; i < conditions.length; i++) {
        expr = q.and(expr, conditions[i]);
      }
      return expr;
    }).collect();

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
    const filtered = vehiclesWithLots.filter(({ vehicle, auctionLot }) => {
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

    let matchedVehicles;
    if (term) {
      matchedVehicles = await ctx.db
        .query("vehicles")
        .withSearchIndex("search_text", (q) => q.search("searchableText", term))
        .take(limit);

      // Fallback for existing records that haven't been migrated
      if (matchedVehicles.length === 0) {
        const allVehicles = await ctx.db.query("vehicles").collect();
        matchedVehicles = allVehicles
          .filter((vehicle) => {
            if (vehicle.searchableText) return false;
            const text = [
              vehicle.make,
              vehicle.model,
              vehicle.vin || "",
              vehicle.lotNumber,
              vehicle.year.toString(),
            ].join(" ").toLowerCase();
            return text.includes(term);
          })
          .slice(0, limit);
      }
    } else {
      matchedVehicles = await ctx.db.query("vehicles").take(limit);
    }

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
        const storageRef =
          typeof img.imageUrl === "string" ? img.imageUrl : String(img.imageUrl);
        let url = storageRef;
        if (!url.startsWith("http") && !url.startsWith("/")) {
          url = (await ctx.storage.getUrl(img.imageUrl as Id<"_storage">)) || "";
        }
        return {
          _id: img._id,
          url,
          storageRef,
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

async function generateUniqueLotNumber(ctx: MutationCtx): Promise<string> {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  let lotNumber: string = "";
  let attempts = 0;

  // Note: While this has a minor race condition window between checking and inserting,
  // the probability of generating the exact same random 5-character string
  // concurrently is 1 in ~60 million, making it practically safe for this use case.
  do {
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    lotNumber = `VB-${datePart}-${random}`;
    const existing = await ctx.db
      .query("vehicles")
      .withIndex("by_lot_number", (q) => q.eq("lotNumber", lotNumber))
      .first();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);
  if (attempts >= 10) {
    throw new Error("Unable to generate unique lot number after 10 attempts");
  }
  return lotNumber;
}

/** Persist storage IDs or legacy static URLs — never ephemeral blob: previews. */
function normalizeImageRefForStorage(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith("blob:")) {
    throw new Error(
      "An image was not uploaded to storage. Remove it and upload again before saving."
    );
  }
  return trimmed;
}

async function checkDuplicateVin(ctx: MutationCtx, vin?: string, excludeVehicleId?: Id<"vehicles">) {
  if (!vin) return;
  const existingVIN = await ctx.db
    .query("vehicles")
    .withIndex("by_vin", (q) => q.eq("vin", vin))
    .first();

  if (existingVIN && existingVIN._id !== excludeVehicleId) {
    console.warn(`Duplicate VIN attempt: ${vin}`);
    throw new Error(`A vehicle with VIN ${vin} already exists`);
  }
}

const REQUIRED_MEDIA_CATEGORIES = ["Front View", "Rear View", "Driver Side", "Interior (Dashboard)", "Engine Bay"];

const mapCategoryToImageType = (category: string) => {
  if (category === "Front View") return "hero" as const;
  if (category.toLowerCase().includes("interior")) return "interior" as const;
  if (category.toLowerCase().includes("damage")) return "damage" as const;
  return "exterior" as const;
};

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
      vin: v.optional(v.string()),
      odometer: v.number(),
      exteriorColor: v.string(),
      interiorColor: v.string(),

      // Fuel type
      fuelType: v.optional(v.string()),

      // EV specs (optional for non-EV vehicles)
      batteryCapacity: v.optional(v.number()),
      batteryHealthPercent: v.optional(v.number()),
      range: v.optional(v.number()),
      batteryType: v.optional(v.string()),
      chargingTypes: v.optional(v.array(v.string())),
      motorPower: v.optional(v.number()),

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
      buyItNowEnabled: v.optional(v.boolean()),

      // Structured media uploads
      mediaUploads: v.array(
        v.object({
          storageId: v.string(),
          category: v.string(),
          isRequired: v.boolean(),
        })
      ),
      inspectionReportStorageId: v.optional(v.string()),
      videoWalkthroughStorageId: v.optional(v.string()),
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

    // Check role permissions
    if (user.role !== "seller" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Only vendors or admins can upload vehicles");
    }

    const { vehicleData } = args;

    // Hard validation to prevent client-side bypass
    const nextYear = new Date().getFullYear() + 1;
    if (vehicleData.year < 2014 || vehicleData.year > nextYear) {
      throw new Error(`Vehicle year must be between 2014 and ${nextYear}.`);
    }

    if (vehicleData.odometer < 0) {
      throw new Error("Odometer cannot be negative.");
    }

    if (vehicleData.startingBid < 0 || vehicleData.reservePrice < 0) {
      throw new Error("Pricing values cannot be negative.");
    }

    if (vehicleData.reservePrice < vehicleData.startingBid) {
      throw new Error("Reserve price must be greater than or equal to the starting bid.");
    }

    if (vehicleData.buyItNowPrice !== undefined && vehicleData.buyItNowPrice < vehicleData.reservePrice) {
      throw new Error("Buy it now price must be greater than or equal to the reserve price.");
    }

    const allowedFuelTypes = new Set(["EV (Electric)", "Hybrid", "Gas/Petrol", "Solar"]);
    if (vehicleData.fuelType && !allowedFuelTypes.has(vehicleData.fuelType)) {
      throw new Error("Invalid fuel type.");
    }

    if (vehicleData.mediaUploads.length > 30) {
      throw new Error("Exceeded maximum allowed media uploads (30).");
    }

    const requiredCategorySet = new Set(
      vehicleData.mediaUploads
        .filter((item) => item.isRequired)
        .map((item) => item.category)
    );
    const missingRequiredCategories = REQUIRED_MEDIA_CATEGORIES.filter(
      (category) => !requiredCategorySet.has(category)
    );
    if (missingRequiredCategories.length > 0) {
      throw new Error(
        `Missing required media categories: ${missingRequiredCategories.join(", ")}`
      );
    }

    const invalidMedia = vehicleData.mediaUploads.find(
      (item) => !item.storageId || !item.category
    );
    if (invalidMedia) {
      throw new Error("Invalid media upload payload.");
    }

    // Check for duplicate VIN
    await checkDuplicateVin(ctx, vehicleData.vin);

    // Auto-generate a unique lot number
    const lotNumber = await generateUniqueLotNumber(ctx);

    const now = Date.now();

    const searchableText = [
      vehicleData.make,
      vehicleData.model,
      vehicleData.vin || "",
      lotNumber,
      vehicleData.year.toString()
    ].join(" ").toLowerCase();

    // Create vehicle record matching exact schema
    const vehicleId = await ctx.db.insert("vehicles", {
      lotNumber,
      vin: vehicleData.vin,
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      fuelType: vehicleData.fuelType,
      exteriorColor: vehicleData.exteriorColor,
      interiorColor: vehicleData.interiorColor,
      batteryCapacity: vehicleData.batteryCapacity,
      estimatedRange: vehicleData.range,
      batteryHealthPercent: vehicleData.batteryHealthPercent,
      chargingType: vehicleData.chargingTypes,
      motorPower: vehicleData.motorPower,
      batteryType: vehicleData.batteryType,
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
      buyItNowEnabled: vehicleData.buyItNowEnabled ?? !!vehicleData.buyItNowPrice,
      status: "pending_approval",
      createdAt: now,
      updatedAt: now,
      searchableText,
    });

    // Create image records matching exact schema
    await Promise.all(
      vehicleData.mediaUploads.map(async (media, index) => {
        await ctx.db.insert("vehicleImages", {
          vehicleId,
          imageUrl: media.storageId,
          thumbnailUrl: media.storageId,
          imageType: mapCategoryToImageType(media.category),
          order: index,
          uploadedAt: now,
        });
      })
    );

    // Optional inspection report document
    if (vehicleData.inspectionReportStorageId) {
      await ctx.db.insert("vehicleDocuments", {
        vehicleId,
        documentType: "inspection_report",
        documentUrl: vehicleData.inspectionReportStorageId,
        uploadedAt: now,
      });
    }

    if (vehicleData.videoWalkthroughStorageId) {
      await ctx.db.insert("vehicleDocuments", {
        vehicleId,
        documentType: "bill_of_sale",
        documentUrl: vehicleData.videoWalkthroughStorageId,
        uploadedAt: now,
      });
    }

    return { vehicleId };
  },
});

/**
 * Admin: Update vehicle
 */
export const updateVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    updates: v.object({
      make: v.optional(v.string()),
      model: v.optional(v.string()),
      year: v.optional(v.number()),
      vin: v.optional(v.string()), // Allow correcting VIN
      odometer: v.optional(v.number()),
      exteriorColor: v.optional(v.string()),
      interiorColor: v.optional(v.string()),

      // Fuel type
      fuelType: v.optional(v.string()),

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
      buyItNowEnabled: v.optional(v.boolean()),

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
    // 1. Authenticate user
    const user = await requireAuth(ctx, args.token);

    // 2. Get vehicle to check ownership
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // 3. Verify ownership (only seller or admin can update)
    // Note: Admin roles are "admin" or "superadmin"
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isOwner = vehicle.sellerId === user._id;

    if (!isOwner && !isAdmin) {
      throw new Error("You do not have permission to update this vehicle");
    }

    const { vehicleId, updates } = args;

    if (typeof updates.year === "number") {
      const nextYear = new Date().getFullYear() + 1;
      if (updates.year < 2014 || updates.year > nextYear) {
        throw new Error(`Vehicle year must be between 2014 and ${nextYear}.`);
      }
    }

    // Check for duplicate VIN if it's being updated
    const normalizedVin = updates.vin?.trim();
    if (normalizedVin) {
      await checkDuplicateVin(ctx, normalizedVin, vehicleId);
    }

    // 1. Update vehicle fields
    // Separate imageUrls from the patch as it's not a field on the 'vehicles' table
    const { imageUrls, ...rawVehicleUpdates } = updates;

    const validConditions = new Set([
      "new",
      "like_new",
      "excellent",
      "good",
      "fair",
      "salvage",
    ]);

    const vehicleUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawVehicleUpdates)) {
      if (value === undefined) continue;
      if (key === "condition" && typeof value === "string" && !validConditions.has(value)) {
        continue;
      }
      if (typeof value === "number" && Number.isNaN(value)) continue;
      if (key === "vin") {
        vehicleUpdates[key] = normalizedVin || undefined;
        continue;
      }
      vehicleUpdates[key] = value;
    }

    const make = (vehicleUpdates.make as string | undefined) ?? vehicle.make;
    const model = (vehicleUpdates.model as string | undefined) ?? vehicle.model;
    const vin =
      vehicleUpdates.vin !== undefined ? String(vehicleUpdates.vin) : (vehicle.vin || "");
    const lotNumber = vehicle.lotNumber;
    const year = (vehicleUpdates.year as number | undefined) ?? vehicle.year;

    const searchableText = [make, model, vin, lotNumber, year.toString()].join(" ").toLowerCase();

    await ctx.db.patch(vehicleId, {
      ...(vehicleUpdates as typeof rawVehicleUpdates),
      searchableText,
      updatedAt: Date.now(),
    });

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
          const imageRef = normalizeImageRefForStorage(url);
          await ctx.db.insert("vehicleImages", {
            vehicleId,
            imageUrl: imageRef,
            thumbnailUrl: imageRef,
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
 * Admin: Approve a vendor-submitted vehicle.
 */
export const approveVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const isAdmin = user.role === "admin" || user.role === "superadmin";

    if (!isAdmin) {
      throw new Error("Only admins can approve vehicles");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (vehicle.status !== "pending_approval") {
      throw new Error("Only pending approval vehicles can be approved");
    }

    await ctx.db.patch(args.vehicleId, {
      status: "approved",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Direct purchase of a vehicle without an auction lot
 */
export const purchaseVehicleDirectly = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await requireAuth(ctx, args.token);

    // 2. Get vehicle and verify it can be purchased
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (!vehicle.buyItNowPrice || !vehicle.buyItNowEnabled) {
      throw new Error("Direct purchase is not available for this vehicle");
    }

    if (vehicle.status !== "approved" && vehicle.status !== "ready_for_auction") {
      throw new Error(`Vehicle cannot be purchased directly because it is in status: ${vehicle.status}`);
    }

    // 3. Ensure no active auction lot exists
    const activeLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (activeLot) {
      throw new Error("Vehicle is currently in an active auction. Please purchase through the auction lot.");
    }

    // 4. Mark vehicle as sold
    await ctx.db.patch(vehicle._id, {
      status: "sold",
      buyItNowPurchasedAt: Date.now(),
      buyItNowPurchasedBy: user._id,
    });

    // 5. Create Order
    const orderNumber = await generateUniqueOrderNumber(ctx);
    const serviceFee = calculateServiceFee(vehicle.buyItNowPrice);
    const documentationFee = 50_000;
    const totalAmount = vehicle.buyItNowPrice + serviceFee + documentationFee;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: user._id,
      vehicleId: vehicle._id,
      orderType: "buy_it_now",
      winningBid: vehicle.buyItNowPrice,
      serviceFee,
      documentationFee,
      subtotal: vehicle.buyItNowPrice,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      status: "pending_payment",
      paymentDeadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, orderId, orderNumber };
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
