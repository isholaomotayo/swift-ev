import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  createAuditLog,
  getAuthUserOrNull,
  isAdmin as authIsAdmin,
  requireAdmin,
  requireAuth,
  requireSeller,
} from "./lib/auth";
import { generateUniqueOrderNumber } from "./lib/orders";
import {
  assertVehicleStatusTransition,
  isBuyerVisibleVehicleStatus,
  isVehicleStatus,
  type VehicleStatus,
} from "./lib/vehicleLifecycle";
import { isAuctionLotHoldingVehicleForPurchase, resolveBuyNowPrice } from "./lib/purchaseFlow";
import { assertValidVehicleMakeModel } from "./lib/vehicleCatalog";
import {
  createInAppNotification,
  paymentDeadlineFrom,
} from "./lib/payments";
import { calculateBuyNowPricing } from "./lib/buyNowPricing";

const vehicleStatusValidator = v.union(
  v.literal("draft"),
  v.literal("pending_inspection"),
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("ready_for_auction"),
  v.literal("scheduled"),
  v.literal("in_auction"),
  v.literal("payment_pending"),
  v.literal("sold"),
  v.literal("unsold"),
  v.literal("withdrawn"),
  v.literal("rejected"),
  v.literal("in_transit"),
  v.literal("delivered"),
  v.literal("cancelled")
);

function vehicleStatusOf(status: string): VehicleStatus {
  if (!isVehicleStatus(status)) {
    throw new Error(`Unknown vehicle status: ${status}`);
  }
  return status;
}

function canViewPrivateVehicle(
  user: Awaited<ReturnType<typeof requireAuth>> | null,
  vehicle: Doc<"vehicles">
) {
  if (!user) return false;
  if (authIsAdmin(user)) return true;
  if (vehicle.sellerId !== undefined && vehicle.sellerId === user._id) return true;
  // Soft-hold buyer may view their reserved vehicle to complete payment
  if (
    vehicle.status === "payment_pending" &&
    vehicle.buyItNowPurchasedBy !== undefined &&
    vehicle.buyItNowPurchasedBy === user._id
  ) {
    return true;
  }
  return false;
}

async function getHoldingAuctionLot(ctx: any, vehicleId: Id<"vehicles">) {
  return ctx.db
    .query("auctionLots")
    .withIndex("by_vehicle", (q: any) => q.eq("vehicleId", vehicleId))
    .filter((q: any) =>
      q.or(
        q.eq(q.field("status"), "pending"),
        q.eq(q.field("status"), "active")
      )
    )
    .first();
}

async function getActiveAuctionLot(ctx: any, vehicleId: Id<"vehicles">) {
  return ctx.db
    .query("auctionLots")
    .withIndex("by_vehicle", (q: any) => q.eq("vehicleId", vehicleId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .first();
}

async function hydrateVehicleForList(ctx: any, vehicle: Doc<"vehicles">, auctionLot?: Doc<"auctionLots"> | null) {
  const images = await ctx.db
    .query("vehicleImages")
    .withIndex("by_vehicle", (q: any) => q.eq("vehicleId", vehicle._id))
    .order("asc")
    .collect();

  const imagesWithUrls = await Promise.all(
    images.map(async (img: Doc<"vehicleImages">) => {
      let url = img.imageUrl;
      if (!url.startsWith("http") && !url.startsWith("/")) {
        url = (await ctx.storage.getUrl(url as Id<"_storage">)) || "";
      }
      return {
        url,
        alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        type: img.imageType,
      };
    })
  );

  const resolvedLot =
    auctionLot === undefined
      ? await getHoldingAuctionLot(ctx, vehicle._id)
      : auctionLot;

  const buyItNowPrice = resolveBuyNowPrice(vehicle);

  return {
    ...vehicle,
    buyItNowPrice,
    buyItNowEnabled: !!buyItNowPrice,
    images: imagesWithUrls,
    heroImage: imagesWithUrls[0]?.url,
    auctionLot: resolvedLot
      ? {
          ...resolvedLot,
          buyItNowPrice: resolveBuyNowPrice({
            buyItNowPrice: resolvedLot.buyItNowPrice,
            reservePrice: resolvedLot.reservePrice ?? vehicle.reservePrice,
            startingBid: resolvedLot.startingBid ?? vehicle.startingBid,
          }),
          buyItNowEnabled: true,
        }
      : null,
  };
}

/**
 * Get featured vehicles for homepage
 * Returns the 3 latest buyer-visible vehicles (approved, scheduled, in_auction, unsold, sold).
 * Soft-held payment_pending listings are excluded from public inventory.
 */
export const getFeaturedVehicles = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = (await ctx.db
      .query("vehicles")
      .order("desc")
      .collect())
      .filter((vehicle) =>
        isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status))
      )
      .slice(0, 3);

    // Get images for each vehicle
    const vehiclesWithImages = await Promise.all(
      vehicles.map(async (vehicle) => {
        return hydrateVehicleForList(ctx, vehicle);
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
    model: v.optional(v.string()),
    fuelType: v.optional(v.string()),
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
    status: v.optional(vehicleStatusValidator),
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
      model,
      fuelType,
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
    const vehicles = (await vehiclesQuery.filter((q) => {
      const conditions = [];
      if (make) conditions.push(q.eq(q.field("make"), make));
      if (model) conditions.push(q.eq(q.field("model"), model));
      if (fuelType) conditions.push(q.eq(q.field("fuelType"), fuelType));
      if (yearMin) conditions.push(q.gte(q.field("year"), yearMin));
      if (yearMax) conditions.push(q.lte(q.field("year"), yearMax));
      if (batteryHealthMin) conditions.push(q.gte(q.field("batteryHealthPercent"), batteryHealthMin));
      if (condition) conditions.push(q.eq(q.field("condition"), condition));

      if (conditions.length === 0) return q.neq(q.field("_id"), "" as Id<"vehicles">);
      
      let expr = conditions[0];
      for (let i = 1; i < conditions.length; i++) {
        expr = q.and(expr, conditions[i]);
      }
      return expr;
    }).collect()).filter((vehicle) =>
      isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status))
    );

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
        return hydrateVehicleForList(ctx, vehicle, auctionLot);
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
 * Admin-only vehicle inventory query. Returns every lifecycle status.
 */
export const listVehiclesForAdmin = query({
  args: {
    token: v.string(),
    status: v.optional(vehicleStatusValidator),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const page = args.page ?? 0;
    const limit = args.limit ?? 50;
    const status = args.status;
    const vehicles = status
      ? await ctx.db
        .query("vehicles")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect()
      : await ctx.db.query("vehicles").collect();

    vehicles.sort((a, b) => b._creationTime - a._creationTime);

    const startIndex = page * limit;
    const paginatedVehicles = vehicles.slice(startIndex, startIndex + limit);
    const vehiclesWithImages = await Promise.all(
      paginatedVehicles.map((vehicle) => hydrateVehicleForList(ctx, vehicle))
    );

    return {
      vehicles: vehiclesWithImages,
      pagination: {
        page,
        limit,
        total: vehicles.length,
        totalPages: Math.ceil(vehicles.length / limit),
        hasMore: startIndex + limit < vehicles.length,
      },
    };
  },
});

/**
 * Vendor-only inventory query. Returns the vendor's full lifecycle history.
 */
export const getVendorVehicles = query({
  args: {
    token: v.string(),
    status: v.optional(vehicleStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireSeller(user);

    let vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_seller", (q) => q.eq("sellerId", user._id))
      .collect();

    if (args.status) {
      vehicles = vehicles.filter((vehicle) => vehicle.status === args.status);
    }

    vehicles.sort((a, b) => b._creationTime - a._creationTime);

    return Promise.all(
      vehicles.map((vehicle) => hydrateVehicleForList(ctx, vehicle))
    );
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

    let matchedVehicles: Doc<"vehicles">[];
    if (term) {
      matchedVehicles = await ctx.db
        .query("vehicles")
        .withSearchIndex("search_text", (q) => q.search("searchableText", term))
        .take(limit * 5);

      // Fallback for existing records that haven't been migrated
      if (matchedVehicles.length === 0) {
        const allVehicles = await ctx.db.query("vehicles").collect();
        matchedVehicles = allVehicles
          .filter((vehicle) => {
            if (!isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status))) return false;
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
      matchedVehicles = await ctx.db.query("vehicles").take(limit * 5);
    }

    matchedVehicles = matchedVehicles
      .filter((vehicle) => isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status)))
      .slice(0, limit);

    // Get images for matched vehicles
    const vehiclesWithImages = await Promise.all(
      matchedVehicles.map(async (vehicle) => {
        return hydrateVehicleForList(ctx, vehicle);
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
    vehicleId: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetVehicleId = ctx.db.normalizeId("vehicles", args.vehicleId);
    if (!targetVehicleId) {
      return null;
    }

    const vehicle = await ctx.db.get(targetVehicleId);

    if (!vehicle) {
      return null;
    }

    const user = await getAuthUserOrNull(ctx, args.token);
    const isPubliclyVisible = isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status));
    if (!isPubliclyVisible && !canViewPrivateVehicle(user, vehicle)) {
      return null;
    }

    // Get all images
    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .order("asc")
      .collect();

    // Get pending or active auction lot. Pending lots allow pre-auction Buy Now.
    const auctionLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    // Get bid history if there's an active lot
    let bids: Doc<"bids">[] = [];
    if (auctionLot && auctionLot.status === "active") {
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
          storageRef: doc.documentUrl,
        };
      })
    );

    const buyItNowPrice = resolveBuyNowPrice(vehicle);
    const normalizedLot = auctionLot
      ? {
          ...auctionLot,
          buyItNowPrice: resolveBuyNowPrice({
            buyItNowPrice: auctionLot.buyItNowPrice,
            reservePrice: auctionLot.reservePrice ?? vehicle.reservePrice,
            startingBid: auctionLot.startingBid ?? vehicle.startingBid,
          }),
          buyItNowEnabled: true,
        }
      : null;

    return {
      ...vehicle,
      buyItNowPrice,
      buyItNowEnabled: !!buyItNowPrice,
      images: imagesWithUrls,
      heroImage: imagesWithUrls[0]?.url,
      auctionLot: normalizedLot,
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
    const vehicles = (await ctx.db.query("vehicles").collect()).filter((vehicle) =>
      isBuyerVisibleVehicleStatus(vehicleStatusOf(vehicle.status))
    );

    // Get unique makes
    const makes = [...new Set(vehicles.map((v) => v.make))].sort();

    // Get year range
    const years = vehicles.map((v) => v.year);
    const yearRange = {
      min: years.length > 0 ? Math.min(...years) : 0,
      max: years.length > 0 ? Math.max(...years) : 0,
    };

    // Get price range from auction lots
    const visibleVehicleIds = new Set(vehicles.map((vehicle) => vehicle._id));
    const auctionLots = (await ctx.db.query("auctionLots").collect()).filter((lot) =>
      visibleVehicleIds.has(lot.vehicleId)
    );
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
      makeCustom: v.optional(v.string()),
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
      batteryTypeCustom: v.optional(v.string()),
      chargingTypes: v.optional(v.array(v.string())),
      motorPower: v.optional(v.number()),

      // Condition
      condition: v.string(),
      damageDescription: v.string(),

      // Location
      locationCity: v.string(),
      locationState: v.string(),
      locationCountry: v.string(),
      locationCountryCustom: v.optional(v.string()),

      // Pricing
      startingBid: v.number(),
      reservePrice: v.number(),
      buyItNowPrice: v.number(),
      buyItNowEnabled: v.optional(v.boolean()),
      initialStatus: v.optional(
        v.union(v.literal("draft"), v.literal("pending_approval"), v.literal("approved"))
      ),

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
    const initialStatus = vehicleData.initialStatus ?? "pending_approval";
    if (initialStatus === "approved" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Only admins can create pre-approved vehicles");
    }

    const resolvedMake =
      vehicleData.make === "Other"
        ? (vehicleData.makeCustom?.trim() || "")
        : vehicleData.make.trim();
    const resolvedModel = vehicleData.model.trim();
    const resolvedBatteryType =
      vehicleData.batteryType === "Other"
        ? (vehicleData.batteryTypeCustom?.trim() || "Other")
        : vehicleData.batteryType;
    const resolvedLocationCountry =
      vehicleData.locationCountry === "Other"
        ? (vehicleData.locationCountryCustom?.trim() || "Other")
        : vehicleData.locationCountry;

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

    if (
      vehicleData.buyItNowPrice === undefined ||
      vehicleData.buyItNowPrice === null ||
      !Number.isFinite(vehicleData.buyItNowPrice) ||
      vehicleData.buyItNowPrice <= 0
    ) {
      throw new Error("Buy It Now price is required for all listings.");
    }

    if (vehicleData.buyItNowPrice < vehicleData.reservePrice) {
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

    if (vehicleData.make === "Other") {
      if (!resolvedMake || !resolvedModel) {
        throw new Error("Custom make and model are required.");
      }
    } else {
      assertValidVehicleMakeModel(resolvedMake, resolvedModel);
    }

    // Auto-generate a unique lot number
    const lotNumber = await generateUniqueLotNumber(ctx);

    const now = Date.now();

    const searchableText = [
      resolvedMake,
      resolvedModel,
      vehicleData.vin || "",
      lotNumber,
      vehicleData.year.toString()
    ].join(" ").toLowerCase();

    // Create vehicle record matching exact schema
    const vehicleId = await ctx.db.insert("vehicles", {
      lotNumber,
      vin: vehicleData.vin,
      make: resolvedMake,
      model: resolvedModel,
      year: vehicleData.year,
      fuelType: vehicleData.fuelType,
      exteriorColor: vehicleData.exteriorColor,
      interiorColor: vehicleData.interiorColor,
      batteryCapacity: vehicleData.batteryCapacity,
      estimatedRange: vehicleData.range,
      batteryHealthPercent: vehicleData.batteryHealthPercent,
      chargingType: vehicleData.chargingTypes,
      motorPower: vehicleData.motorPower,
      batteryType: resolvedBatteryType,
      odometer: vehicleData.odometer,
      odometerUnit: "km",
      condition: vehicleData.condition as "new" | "like_new" | "excellent" | "good" | "fair" | "salvage",
      damageDescription: vehicleData.damageDescription,
      titleType: "clean",
      titleCountry: resolvedLocationCountry,
      hasKeys: true, // Default
      sourceType: "consignment",
      sellerId: user._id,
      currentLocation: {
        facility: user.vendorCompany || "Vendor Facility",
        city: vehicleData.locationCity,
        country: resolvedLocationCountry,
      },
      startingBid: vehicleData.startingBid,
      reservePrice: vehicleData.reservePrice,
      buyItNowPrice: vehicleData.buyItNowPrice,
      buyItNowEnabled: true,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      approvedAt: initialStatus === "approved" ? now : undefined,
      approvedBy: initialStatus === "approved" ? user._id : undefined,
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
      makeCustom: v.optional(v.string()),
      model: v.optional(v.string()),
      year: v.optional(v.number()),
      vin: v.optional(v.string()), // Allow correcting VIN
      odometer: v.optional(v.number()),
      exteriorColor: v.optional(v.string()),
      interiorColor: v.optional(v.string()),
      trim: v.optional(v.string()),

      // Fuel type
      fuelType: v.optional(v.string()),

      // EV specs
      batteryCapacity: v.optional(v.number()),
      batteryHealthPercent: v.optional(v.number()),
      estimatedRange: v.optional(v.number()), // Note: Frontend might send 'range', map to 'estimatedRange'
      range: v.optional(v.number()),
      batteryType: v.optional(v.string()),
      batteryTypeCustom: v.optional(v.string()),
      chargingType: v.optional(v.array(v.string())),
      chargingTypes: v.optional(v.array(v.string())),
      motorPower: v.optional(v.number()),
      drivetrain: v.optional(v.string()),

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

      // Title & Source
      titleType: v.optional(v.union(v.literal("clean"), v.literal("salvage"), v.literal("rebuilt"), v.literal("export_only"))),
      titleCountry: v.optional(v.string()),
      hasKeys: v.optional(v.boolean()),
      sourceType: v.optional(v.union(v.literal("manufacturer"), v.literal("dealer"), v.literal("consignment"), v.literal("insurance"))),

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
      locationCity: v.optional(v.string()),
      locationState: v.optional(v.string()),
      locationCountry: v.optional(v.string()),
      locationCountryCustom: v.optional(v.string()),

      status: v.optional(vehicleStatusValidator),
      // Images - Optional array of strings (URLs or Storage IDs)
      imageUrls: v.optional(v.array(v.string())),
      // Documents - Optional array of type + storageId
      documents: v.optional(
        v.array(
          v.object({
            type: v.union(
              v.literal("battery_report"),
              v.literal("inspection_report"),
              v.literal("title_scan"),
              v.literal("bill_of_sale"),
              v.literal("export_certificate"),
              v.literal("soncap_cert")
            ),
            storageId: v.string(),
          })
        )
      ),
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

    if (isOwner && !isAdmin) {
      const allowedEditingStatuses = ["draft", "pending_inspection", "pending_approval", "rejected"];
      if (!allowedEditingStatuses.includes(vehicle.status)) {
        throw new Error(`Vendors cannot edit vehicles that have already been approved (current status: ${vehicle.status}). Please contact support if you need to make changes.`);
      }
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

    // Separate imageUrls and documents from the patch as they're not fields on the 'vehicles' table
    const {
      imageUrls,
      documents: newDocs,
      status: requestedStatus,
      makeCustom,
      batteryTypeCustom,
      range,
      chargingTypes,
      locationCity,
      locationState: _locationState,
      locationCountry,
      locationCountryCustom,
      ...rawVehicleUpdates
    } = updates;

    if (requestedStatus !== undefined && requestedStatus !== vehicle.status) {
      throw new Error(
        "Vehicle status changes must use lifecycle mutations or admin override with a reason."
      );
    }

    const validConditions = new Set([
      "new",
      "like_new",
      "excellent",
      "good",
      "fair",
      "salvage",
    ]);

    const normalizedRawUpdates: Record<string, unknown> = { ...rawVehicleUpdates };

    if (rawVehicleUpdates.make === "Other") {
      const resolvedMake = makeCustom?.trim();
      if (!resolvedMake) {
        throw new Error("Custom make is required.");
      }
      normalizedRawUpdates.make = resolvedMake;
    } else if (rawVehicleUpdates.make !== undefined) {
      normalizedRawUpdates.make = rawVehicleUpdates.make.trim();
    } else if (makeCustom?.trim()) {
      normalizedRawUpdates.make = makeCustom.trim();
    }

    if (range !== undefined && normalizedRawUpdates.estimatedRange === undefined) {
      normalizedRawUpdates.estimatedRange = range;
    }

    if (chargingTypes !== undefined && normalizedRawUpdates.chargingType === undefined) {
      normalizedRawUpdates.chargingType = chargingTypes;
    }

    if (rawVehicleUpdates.batteryType === "Other") {
      normalizedRawUpdates.batteryType = batteryTypeCustom?.trim() || "Other";
    }

    if (
      locationCity !== undefined ||
      locationCountry !== undefined ||
      locationCountryCustom !== undefined
    ) {
      const currentLocation = rawVehicleUpdates.currentLocation;
      const resolvedCountry =
        locationCountry === "Other"
          ? (locationCountryCustom?.trim() || "Other")
          : locationCountry;

      normalizedRawUpdates.currentLocation = {
        facility:
          currentLocation?.facility ||
          vehicle.currentLocation?.facility ||
          "Default Facility",
        city:
          locationCity ??
          currentLocation?.city ??
          vehicle.currentLocation?.city ??
          "",
        country:
          resolvedCountry ??
          currentLocation?.country ??
          vehicle.currentLocation?.country ??
          "",
      };
    } else if (rawVehicleUpdates.currentLocation?.country === "Other") {
      normalizedRawUpdates.currentLocation = {
        ...rawVehicleUpdates.currentLocation,
        country: "Other",
      };
    }

    const vehicleUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(normalizedRawUpdates)) {
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

    if (vehicleUpdates.make !== undefined || vehicleUpdates.model !== undefined) {
      assertValidVehicleMakeModel(make, model);
    }

    const nextStartingBid =
      (vehicleUpdates.startingBid as number | undefined) ?? vehicle.startingBid;
    const nextReserve =
      (vehicleUpdates.reservePrice as number | undefined) ?? vehicle.reservePrice ?? 0;
    const nextBuyItNow =
      (vehicleUpdates.buyItNowPrice as number | undefined) ?? vehicle.buyItNowPrice;

    if (vehicleUpdates.buyItNowPrice !== undefined) {
      if (
        typeof vehicleUpdates.buyItNowPrice !== "number" ||
        vehicleUpdates.buyItNowPrice <= 0
      ) {
        throw new Error("Buy It Now price is required and must be greater than zero.");
      }
    }
    if (nextBuyItNow === undefined || nextBuyItNow <= 0) {
      throw new Error("Buy It Now price is required for all listings.");
    }
    if (nextBuyItNow < nextReserve) {
      throw new Error("Buy It Now price must be greater than or equal to the reserve price.");
    }
    if (nextReserve < nextStartingBid) {
      throw new Error("Reserve price must be greater than or equal to the starting bid.");
    }

    // Always keep Buy Now enabled when a valid price is set
    vehicleUpdates.buyItNowEnabled = true;

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

    // 3. Update documents if provided
    if (newDocs) {
      // Delete existing documents
      const existingDocs = await ctx.db
        .query("vehicleDocuments")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicleId))
        .collect();

      await Promise.all(existingDocs.map((doc) => ctx.db.delete(doc._id)));

      // Insert new documents
      const now = Date.now();
      await Promise.all(
        newDocs.map(async (doc) => {
          await ctx.db.insert("vehicleDocuments", {
            vehicleId,
            documentType: doc.type,
            documentUrl: doc.storageId,
            uploadedAt: now,
          });
        })
      );
    }

    return { success: true };
  },
});

/**
 * Vendor: Submit a draft vehicle for admin approval.
 */
export const submitVehicleForApproval = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    const vehicle = await ctx.db.get(args.vehicleId);
    
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (vehicle.sellerId !== user._id) {
      throw new Error("You do not have permission to submit this vehicle");
    }

    if (vehicle.status !== "draft" && vehicle.status !== "rejected") {
      throw new Error(`Vehicle cannot be submitted from status: ${vehicle.status}`);
    }

    await ctx.db.patch(args.vehicleId, {
      status: "pending_approval",
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "submit_vehicle_for_approval",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "pending_approval" },
    });

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
    requireAdmin(user);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (vehicle.status !== "pending_approval") {
      throw new Error("Only pending approval vehicles can be approved");
    }

    if (
      typeof vehicle.buyItNowPrice !== "number" ||
      !Number.isFinite(vehicle.buyItNowPrice) ||
      vehicle.buyItNowPrice <= 0
    ) {
      throw new Error("Cannot approve a listing without a Buy Now price");
    }
    if (
      typeof vehicle.reservePrice === "number" &&
      vehicle.buyItNowPrice < vehicle.reservePrice
    ) {
      throw new Error("Buy Now price must be at least the reserve price");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "approved");

    await ctx.db.patch(args.vehicleId, {
      status: "approved",
      buyItNowEnabled: true,
      approvedAt: Date.now(),
      approvedBy: user._id,
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "approve_vehicle",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "approved" },
    });

    return { success: true };
  },
});

export const rejectVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "rejected");

    await ctx.db.patch(args.vehicleId, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "reject_vehicle",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "rejected", reason: args.reason },
    });

    return { success: true };
  },
});

export const withdrawVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (!authIsAdmin(user) && (!vehicle.sellerId || vehicle.sellerId !== user._id)) {
      throw new Error("You do not have permission to withdraw this vehicle");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "withdrawn");

    const activeLot = await getActiveAuctionLot(ctx, args.vehicleId);
    if (activeLot) {
      throw new Error("Cannot withdraw a vehicle while its auction lot is active");
    }

    const pendingLots = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    await Promise.all(pendingLots.map((lot) => ctx.db.patch(lot._id, { status: "passed" })));

    await ctx.db.patch(args.vehicleId, {
      status: "withdrawn",
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "withdraw_vehicle",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "withdrawn", reason: args.reason },
    });

    return { success: true };
  },
});

export const relistVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (
      typeof vehicle.buyItNowPrice !== "number" ||
      !Number.isFinite(vehicle.buyItNowPrice) ||
      vehicle.buyItNowPrice <= 0
    ) {
      throw new Error("Cannot relist a vehicle without a Buy Now price");
    }
    if (
      typeof vehicle.reservePrice === "number" &&
      vehicle.buyItNowPrice < vehicle.reservePrice
    ) {
      throw new Error("Buy Now price must be at least the reserve price");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "approved");

    await ctx.db.patch(args.vehicleId, {
      status: "approved",
      buyItNowEnabled: true,
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "relist_vehicle",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "approved" },
    });

    return { success: true };
  },
});

export const markVehicleUnsold = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "unsold");

    await ctx.db.patch(args.vehicleId, {
      status: "unsold",
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "mark_vehicle_unsold",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: "unsold", reason: args.reason },
    });

    return { success: true };
  },
});

export const overrideVehicleStatus = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    status: vehicleStatusValidator,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const reason = args.reason.trim();
    if (reason.length < 5) {
      throw new Error("A clear override reason is required");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (args.status === "approved") {
      if (
        typeof vehicle.buyItNowPrice !== "number" ||
        !Number.isFinite(vehicle.buyItNowPrice) ||
        vehicle.buyItNowPrice <= 0
      ) {
        throw new Error("Cannot set status to approved without a Buy Now price");
      }
      if (
        typeof vehicle.reservePrice === "number" &&
        vehicle.buyItNowPrice < vehicle.reservePrice
      ) {
        throw new Error("Buy Now price must be at least the reserve price");
      }
    }

    await ctx.db.patch(args.vehicleId, {
      status: args.status,
      ...(args.status === "approved" ? { buyItNowEnabled: true } : {}),
      updatedAt: Date.now(),
    });

    await createAuditLog(ctx, {
      userId: user._id,
      action: "override_vehicle_status",
      entityType: "vehicle",
      entityId: args.vehicleId,
      changes: { oldStatus: vehicle.status, newStatus: args.status, reason },
    });

    return { success: true };
  },
});

/**
 * Direct purchase of a vehicle without an auction lot.
 * Soft-holds the vehicle (payment_pending) — hidden from public inventory until paid or released.
 */
export const purchaseVehicleDirectly = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
    destination: v.union(v.literal("lagos"), v.literal("port_harcourt")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (vehicle.sellerId && vehicle.sellerId === user._id) {
      throw new Error("You cannot purchase your own listing");
    }

    if (vehicle.status === "payment_pending") {
      if (vehicle.buyItNowPurchasedBy === user._id) {
        const mine = (
          await ctx.db
            .query("orders")
            .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
            .collect()
        ).find(
          (order) =>
            order.userId === user._id &&
            (order.status === "pending_payment" || order.status === "payment_partial")
        );
        if (mine) {
          return {
            success: true,
            orderId: mine._id,
            orderNumber: mine.orderNumber,
            resumed: true,
          };
        }
      }
      throw new Error("This vehicle is reserved pending payment by another buyer");
    }

    if (vehicle.status !== "approved" && vehicle.status !== "unsold") {
      throw new Error(
        `Vehicle cannot be purchased directly because it is in status: ${vehicle.status}`
      );
    }

    const buyItNowPrice = resolveBuyNowPrice(vehicle);
    if (!buyItNowPrice) {
      throw new Error("Direct purchase is not available for this vehicle");
    }

    const activeOrPendingLot = await ctx.db
      .query("auctionLots")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "pending"))
      )
      .first();

    if (
      activeOrPendingLot &&
      isAuctionLotHoldingVehicleForPurchase(activeOrPendingLot.status)
    ) {
      throw new Error(
        "Vehicle is assigned to an auction lot. Please purchase through the auction lot."
      );
    }

    assertVehicleStatusTransition(vehicleStatusOf(vehicle.status), "payment_pending");

    const existingOrder = (
      await ctx.db
        .query("orders")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .collect()
    ).find((order) => order.status !== "cancelled" && order.status !== "refunded");

    if (existingOrder) {
      throw new Error("Vehicle already has an active purchase order");
    }

    const pricing = calculateBuyNowPricing(buyItNowPrice, args.destination);
    const now = Date.now();

    await ctx.db.patch(vehicle._id, {
      status: "payment_pending",
      buyItNowPrice,
      buyItNowEnabled: true,
      buyItNowPurchasedAt: now,
      buyItNowPurchasedBy: user._id,
      updatedAt: now,
    });

    const orderNumber = await generateUniqueOrderNumber(ctx);
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: user._id,
      vehicleId: vehicle._id,
      orderType: "buy_it_now",
      winningBid: pricing.vehiclePrice,
      serviceFee: pricing.serviceFee,
      documentationFee: pricing.documentationFee,
      inspectionFee: pricing.inspectionFee,
      shippingCost: pricing.shippingCost,
      estimatedDuties: pricing.customsClearingFee,
      clearanceFee: pricing.customsClearingFee,
      registrationFee: pricing.registrationFee,
      destinationPort: pricing.destination,
      subtotal: pricing.vehiclePrice,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      balanceDue: pricing.totalAmount,
      status: "pending_payment",
      paymentDeadline: paymentDeadlineFrom(now),
      createdAt: now,
      updatedAt: now,
    });

    const deadlineStr = new Date(paymentDeadlineFrom(now)).toLocaleString();
    await createInAppNotification(ctx, {
      userId: user._id,
      type: "payment_reminder",
      title: "Complete payment to secure this vehicle",
      message: `Order ${orderNumber} created. Pay ₦${pricing.totalAmount.toLocaleString()} by ${deadlineStr} to secure the vehicle. The listing remains reserved until payment is complete.`,
      orderId,
      vehicleId: vehicle._id,
    });

    // Send C2: Buy Now Order Email (Buyer)
    await ctx.scheduler.runAfter(0, internal.emails.sendBuyNowOrderEmail, {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      orderNumber,
      orderId,
      vehiclePrice: pricing.vehiclePrice,
      serviceFee: pricing.serviceFee,
      documentationFee: pricing.documentationFee,
      shippingCost: pricing.shippingCost,
      totalAmount: pricing.totalAmount,
      paymentDeadline: paymentDeadlineFrom(now),
      vehicleId: vehicle._id,
    });

    if (vehicle.sellerId) {
      await createInAppNotification(ctx, {
        userId: vehicle.sellerId,
        type: "system",
        title: "Buyer reserved your vehicle",
        message: `A buyer created order ${orderNumber} for ${vehicle.year} ${vehicle.make} ${vehicle.model}. Payment is due by ${deadlineStr}.`,
        orderId,
        vehicleId: vehicle._id,
      });

      // Send Seller Sold Email
      const sellerUser = await ctx.db.get(vehicle.sellerId);
      if (sellerUser) {
        await ctx.scheduler.runAfter(0, internal.emails.sendSellerVehicleSoldEmail, {
          userId: sellerUser._id,
          email: sellerUser.email,
          firstName: sellerUser.firstName,
          vehicleTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          salePrice: pricing.vehiclePrice,
          paymentDeadline: paymentDeadlineFrom(now),
          orderNumber,
          saleType: "buy_now",
          vehicleId: vehicle._id,
        });
      }
    }

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
    const sold = vehicles.filter((v) =>
      ["sold", "in_transit", "delivered"].includes(v.status)
    ).length;
    const pending = vehicles.filter((v) => v.status === "pending_approval").length;
    const paymentPending = vehicles.filter((v) => v.status === "payment_pending").length;

    // Calculate revenue from sold vehicles
    const soldVehicles = vehicles.filter((v) =>
      ["sold", "in_transit", "delivered"].includes(v.status)
    );
    let totalRevenue = 0;

    // Get auction lots for sold vehicles to find winning bids
    for (const vehicle of soldVehicles) {
      const lot = await ctx.db
        .query("auctionLots")
        .withIndex("by_vehicle", (q) => q.eq("vehicleId", vehicle._id))
        .filter((q) => q.eq(q.field("status"), "sold"))
        .first();

      if (lot?.winningBid) {
        totalRevenue += lot.winningBid;
      }
    }

    const averageSalePrice = sold > 0 ? totalRevenue / sold : 0;

    return {
      totalVehicles: total,
      inAuction,
      sold,
      pending,
      paymentPending,
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

      if (lot?.soldAt && lot.winningBid) {
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

/**
 * Admin: Safely delete a vehicle and its associated media/documents
 */
export const deleteVehicle = mutation({
  args: {
    token: v.string(),
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Check if vehicle is attached to active orders
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    if (activeOrders.length > 0) {
      throw new Error(
        `Cannot delete vehicle: Linked to active order(s) [${activeOrders.map((o) => o.orderNumber).join(", ")}]`
      );
    }

    // Delete images
    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();
    for (const image of images) {
      await ctx.db.delete(image._id);
    }

    // Delete documents
    const documents = await ctx.db
      .query("vehicleDocuments")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();
    for (const doc of documents) {
      await ctx.db.delete(doc._id);
    }

    // Delete spare parts
    const parts = await ctx.db
      .query("spareParts")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();
    for (const part of parts) {
      await ctx.db.delete(part._id);
    }

    // Delete watchlist entries
    const watchlistEntries = await ctx.db
      .query("watchlist")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();
    for (const entry of watchlistEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete vehicle record
    await ctx.db.delete(args.vehicleId);

    return {
      success: true,
      message: `Vehicle ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin || args.vehicleId}) safely deleted.`,
    };
  },
});

