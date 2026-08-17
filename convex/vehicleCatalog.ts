import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  getAuthUserOrNull,
  requireAdmin,
  requireAuth,
  isAdmin as authIsAdmin,
} from "./lib/auth";
import {
  toNormalizedKey,
  formatCanonicalName,
  checkDuplicateMake,
  checkDuplicateModel,
  type MakeCatalogItem,
} from "./lib/vehicleDedup";
import carMakeCatalogJson from "../store/car-make.json";

type SeedMakeEntry = {
  Make: string;
  Models: string[];
};

const SEED_CATALOG = carMakeCatalogJson as SeedMakeEntry[];

/**
 * Public Query: Fetch all active vehicle makes and models.
 * Automatically bootstraps from default JSON if the table is empty.
 */
export const getCatalog = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx) => {
    const existing = await ctx.db.query("vehicleCatalog").collect();

    // Filter out archived entries for public query
    const active = existing.filter((item) => item.status !== "archived");

    if (active.length > 0) {
      return active
        .map((entry) => ({
          _id: entry._id,
          make: entry.make,
          models: entry.models,
          aliases: entry.aliases || [],
          creatorRole: entry.creatorRole || "system",
          status: entry.status || "active",
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }))
        .sort((a, b) => a.make.localeCompare(b.make));
    }

    // If DB is empty, return seed catalog formatted
    return SEED_CATALOG.map((entry) => ({
      make: entry.Make,
      models: entry.Models,
      aliases: [],
      creatorRole: "system" as const,
      status: "active" as const,
      createdAt: 0,
      updatedAt: 0,
    })).sort((a, b) => a.make.localeCompare(b.make));
  },
});

/**
 * Public Query: Fetch a sorted list of unique make names.
 */
export const getMakes = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("vehicleCatalog").collect();
    const active = entries.filter((item) => item.status !== "archived");

    if (active.length > 0) {
      return active.map((e) => e.make).sort((a, b) => a.localeCompare(b));
    }

    return SEED_CATALOG.map((e) => e.Make).sort((a, b) => a.localeCompare(b));
  },
});

/**
 * Public Query: Fetch models for a given make.
 */
export const getModelsForMake = query({
  args: {
    make: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedInput = toNormalizedKey(args.make);
    if (!normalizedInput) return [];

    const entry = await ctx.db
      .query("vehicleCatalog")
      .withIndex("by_normalized_make", (q) => q.eq("normalizedMake", normalizedInput))
      .first();

    if (entry && entry.status !== "archived") {
      return [...entry.models].sort((a, b) => a.localeCompare(b));
    }

    // Fallback to static catalog
    const fallback = SEED_CATALOG.find(
      (e) => toNormalizedKey(e.Make) === normalizedInput
    );
    return fallback ? [...fallback.Models].sort((a, b) => a.localeCompare(b)) : [];
  },
});

/**
 * Public Query: Check if a proposed make name is available, duplicate, or similar.
 */
export const checkMakeAvailability = query({
  args: {
    make: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.make.trim();
    if (!trimmed) {
      return {
        isDuplicate: true,
        message: "Make name cannot be empty.",
        suggestedAction: "reject" as const,
      };
    }

    const allEntries = await ctx.db.query("vehicleCatalog").collect();
    const existingMakes: MakeCatalogItem[] =
      allEntries.length > 0
        ? allEntries
            .filter((e) => e.status !== "archived")
            .map((e) => ({
              make: e.make,
              aliases: e.aliases,
              models: e.models,
            }))
        : SEED_CATALOG.map((e) => ({
            make: e.Make,
            models: e.Models,
          }));

    return checkDuplicateMake(trimmed, existingMakes);
  },
});

/**
 * Public Query: Check if a proposed model name is available under a make.
 */
export const checkModelAvailability = query({
  args: {
    make: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedModel = args.model.trim();
    if (!trimmedModel) {
      return {
        isDuplicate: true,
        message: "Model name cannot be empty.",
        suggestedAction: "reject" as const,
      };
    }

    const normalizedMake = toNormalizedKey(args.make);
    const entry = await ctx.db
      .query("vehicleCatalog")
      .withIndex("by_normalized_make", (q) => q.eq("normalizedMake", normalizedMake))
      .first();

    let existingModels: string[] = [];
    if (entry) {
      existingModels = entry.models;
    } else {
      const fallback = SEED_CATALOG.find(
        (e) => toNormalizedKey(e.Make) === normalizedMake
      );
      existingModels = fallback ? fallback.Models : [];
    }

    return checkDuplicateModel(trimmedModel, existingModels);
  },
});

/**
 * Mutation: Add a new vehicle make and optional initial models.
 * Can be called by buyers, vendors, or admins.
 */
export const addMake = mutation({
  args: {
    token: v.optional(v.string()),
    make: v.string(),
    initialModels: v.optional(v.array(v.string())),
    allowSimilar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = args.token ? await getAuthUserOrNull(ctx, args.token) : null;
    const trimmedMake = args.make.trim();
    if (!trimmedMake) {
      throw new ConvexError("Make name is required.");
    }

    // Fetch existing makes
    const allEntries = await ctx.db.query("vehicleCatalog").collect();
    const existingMakes: MakeCatalogItem[] = allEntries
      .filter((e) => e.status !== "archived")
      .map((e) => ({
        make: e.make,
        aliases: e.aliases,
        models: e.models,
      }));

    // If DB is empty, also include seed catalog in duplicate check
    if (existingMakes.length === 0) {
      for (const s of SEED_CATALOG) {
        existingMakes.push({ make: s.Make, models: s.Models });
      }
    }

    const check = checkDuplicateMake(trimmedMake, existingMakes);

    if (check.isDuplicate) {
      if (check.matchType === "exact" || check.matchType === "case_insensitive" || check.matchType === "normalized") {
        throw new ConvexError(
          check.message || `Make "${check.matchedItem || trimmedMake}" already exists.`
        );
      }
      if (check.matchType === "fuzzy" && !args.allowSimilar) {
        throw new ConvexError(
          check.message || `A similar make "${check.matchedItem}" already exists.`
        );
      }
    }

    const canonicalMake = formatCanonicalName(trimmedMake);
    const normalizedMake = toNormalizedKey(canonicalMake);

    // Prepare initial models
    const rawModels = args.initialModels || [];
    const uniqueModels: string[] = [];
    const normalizedModels: string[] = [];

    for (const raw of rawModels) {
      const trimmedM = raw.trim();
      if (!trimmedM) continue;
      const modelCheck = checkDuplicateModel(trimmedM, uniqueModels);
      if (!modelCheck.isDuplicate) {
        const canonicalM = formatCanonicalName(trimmedM);
        uniqueModels.push(canonicalM);
        normalizedModels.push(toNormalizedKey(canonicalM));
      }
    }

    const now = Date.now();
    const creatorRole = user
      ? user.role === "admin" || user.role === "superadmin"
        ? (user.role as "admin" | "superadmin")
        : user.role === "seller"
        ? "seller"
        : "buyer"
      : "buyer";

    const makeId = await ctx.db.insert("vehicleCatalog", {
      make: canonicalMake,
      normalizedMake,
      models: uniqueModels,
      normalizedModels,
      aliases: [],
      createdBy: user ? user._id : undefined,
      creatorRole,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {
      makeId,
      make: canonicalMake,
      models: uniqueModels,
    };
  },
});

/**
 * Mutation: Add a new model to an existing make.
 * If the make does not exist in the database yet, it copies it over from seed or creates it.
 */
export const addModel = mutation({
  args: {
    token: v.optional(v.string()),
    make: v.string(),
    model: v.string(),
    allowSimilar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = args.token ? await getAuthUserOrNull(ctx, args.token) : null;
    const trimmedMake = args.make.trim();
    const trimmedModel = args.model.trim();

    if (!trimmedMake || !trimmedModel) {
      throw new ConvexError("Both make and model are required.");
    }

    const normalizedMake = toNormalizedKey(trimmedMake);
    let entry = await ctx.db
      .query("vehicleCatalog")
      .withIndex("by_normalized_make", (q) => q.eq("normalizedMake", normalizedMake))
      .first();

    const now = Date.now();

    // If make is not in DB yet, create or copy from seed
    if (!entry) {
      const seedMatch = SEED_CATALOG.find(
        (s) => toNormalizedKey(s.Make) === normalizedMake
      );
      const canonicalMake = seedMatch ? seedMatch.Make : formatCanonicalName(trimmedMake);
      const initialModels = seedMatch ? [...seedMatch.Models] : [];

      const makeId = await ctx.db.insert("vehicleCatalog", {
        make: canonicalMake,
        normalizedMake: toNormalizedKey(canonicalMake),
        models: initialModels,
        normalizedModels: initialModels.map(toNormalizedKey),
        aliases: [],
        createdBy: user ? user._id : undefined,
        creatorRole: user ? (user.role as any) : "buyer",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      entry = await ctx.db.get(makeId);
    }

    if (!entry) {
      throw new ConvexError("Failed to resolve or create make.");
    }

    // Check duplicate model
    const modelCheck = checkDuplicateModel(trimmedModel, entry.models);
    if (modelCheck.isDuplicate) {
      if (modelCheck.matchType === "exact" || modelCheck.matchType === "case_insensitive" || modelCheck.matchType === "normalized") {
        throw new ConvexError(
          modelCheck.message || `Model "${modelCheck.matchedItem || trimmedModel}" already exists for ${entry.make}.`
        );
      }
      if (modelCheck.matchType === "fuzzy" && !args.allowSimilar) {
        throw new ConvexError(
          modelCheck.message || `A similar model "${modelCheck.matchedItem}" already exists for ${entry.make}.`
        );
      }
    }

    const canonicalModel = formatCanonicalName(trimmedModel);
    const updatedModels = [...entry.models, canonicalModel].sort((a, b) =>
      a.localeCompare(b)
    );
    const updatedNormalizedModels = updatedModels.map(toNormalizedKey);

    await ctx.db.patch(entry._id, {
      models: updatedModels,
      normalizedModels: updatedNormalizedModels,
      updatedAt: now,
    });

    return {
      make: entry.make,
      model: canonicalModel,
      allModels: updatedModels,
    };
  },
});

/**
 * Admin Query: Get full catalog with management statistics and filters.
 */
export const getAdminCatalog = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    statusFilter: v.optional(v.string()),
    creatorRoleFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    let entries = await ctx.db.query("vehicleCatalog").collect();

    // If DB is empty, return seed items formatted as preview
    if (entries.length === 0) {
      entries = SEED_CATALOG.map((s, idx) => ({
        _id: `seed_${idx}` as any,
        _creationTime: 0,
        make: s.Make,
        normalizedMake: toNormalizedKey(s.Make),
        models: s.Models,
        normalizedModels: s.Models.map(toNormalizedKey),
        aliases: [],
        creatorRole: "system" as const,
        status: "active" as const,
        createdAt: 0,
        updatedAt: 0,
      }));
    }

    if (args.statusFilter && args.statusFilter !== "all") {
      entries = entries.filter((e) => (e.status || "active") === args.statusFilter);
    }

    if (args.creatorRoleFilter && args.creatorRoleFilter !== "all") {
      entries = entries.filter(
        (e) => (e.creatorRole || "system") === args.creatorRoleFilter
      );
    }

    if (args.search) {
      const q = args.search.toLowerCase().trim();
      entries = entries.filter(
        (e) =>
          e.make.toLowerCase().includes(q) ||
          e.models.some((m) => m.toLowerCase().includes(q)) ||
          (e.aliases || []).some((a) => a.toLowerCase().includes(q))
      );
    }

    return entries.sort((a, b) => a.make.localeCompare(b.make));
  },
});

/**
 * Admin Mutation: Update make name, aliases, or status.
 */
export const adminUpdateMake = mutation({
  args: {
    token: v.string(),
    id: v.id("vehicleCatalog"),
    make: v.string(),
    aliases: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(v.literal("active"), v.literal("pending_review"), v.literal("archived"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError("Vehicle catalog entry not found.");
    }

    const canonicalMake = formatCanonicalName(args.make);
    const normalizedMake = toNormalizedKey(canonicalMake);

    // If make name changed, ensure no other entry has the same normalized make
    if (normalizedMake !== existing.normalizedMake) {
      const conflict = await ctx.db
        .query("vehicleCatalog")
        .withIndex("by_normalized_make", (q) => q.eq("normalizedMake", normalizedMake))
        .first();

      if (conflict && conflict._id !== args.id) {
        throw new ConvexError(`Another make "${conflict.make}" already exists.`);
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      make: canonicalMake,
      normalizedMake,
      aliases: args.aliases ?? existing.aliases,
      status: args.status ?? existing.status,
      updatedAt: now,
    });

    return { success: true, make: canonicalMake };
  },
});

/**
 * Admin Mutation: Remove a model from a make.
 */
export const adminDeleteModel = mutation({
  args: {
    token: v.string(),
    id: v.id("vehicleCatalog"),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError("Vehicle catalog entry not found.");
    }

    const updatedModels = existing.models.filter((m) => m !== args.model);
    const updatedNormalizedModels = updatedModels.map(toNormalizedKey);

    await ctx.db.patch(args.id, {
      models: updatedModels,
      normalizedModels: updatedNormalizedModels,
      updatedAt: Date.now(),
    });

    return { success: true, remainingCount: updatedModels.length };
  },
});

/**
 * Admin Mutation: Archive or permanently delete a make.
 */
export const adminDeleteMake = mutation({
  args: {
    token: v.string(),
    id: v.id("vehicleCatalog"),
    permanent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError("Vehicle catalog entry not found.");
    }

    if (args.permanent) {
      await ctx.db.delete(args.id);
    } else {
      await ctx.db.patch(args.id, {
        status: "archived",
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Admin Mutation: Merge a duplicate source make into target make.
 */
export const adminMergeMakes = mutation({
  args: {
    token: v.string(),
    sourceId: v.id("vehicleCatalog"),
    targetId: v.id("vehicleCatalog"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);
    requireAdmin(user);

    if (args.sourceId === args.targetId) {
      throw new ConvexError("Cannot merge a make into itself.");
    }

    const source = await ctx.db.get(args.sourceId);
    const target = await ctx.db.get(args.targetId);

    if (!source || !target) {
      throw new ConvexError("Source or target make not found.");
    }

    // Combine models uniquely
    const combinedModels = [...target.models];
    for (const sm of source.models) {
      const check = checkDuplicateModel(sm, combinedModels);
      if (!check.isDuplicate) {
        combinedModels.push(sm);
      }
    }
    combinedModels.sort((a, b) => a.localeCompare(b));

    // Combine aliases
    const targetAliases = new Set(target.aliases || []);
    targetAliases.add(source.make);
    if (source.aliases) {
      for (const a of source.aliases) targetAliases.add(a);
    }

    const now = Date.now();

    // Update target
    await ctx.db.patch(target._id, {
      models: combinedModels,
      normalizedModels: combinedModels.map(toNormalizedKey),
      aliases: Array.from(targetAliases),
      updatedAt: now,
    });

    // Archive source
    await ctx.db.patch(source._id, {
      status: "archived",
      updatedAt: now,
    });

    return {
      success: true,
      targetMake: target.make,
      mergedModelsCount: combinedModels.length,
    };
  },
});

/**
 * Idempotent Bootstrap Mutation: Populates the `vehicleCatalog` table from `car-make.json`
 * safely without deleting or overwriting custom makes/models already created.
 */
export const bootstrapCatalog = mutation({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.token) {
      const user = await requireAuth(ctx, args.token);
      requireAdmin(user);
    }

    const existingEntries = await ctx.db.query("vehicleCatalog").collect();
    const existingNormMap = new Map(
      existingEntries.map((e) => [e.normalizedMake, e])
    );

    let insertedCount = 0;
    let updatedCount = 0;
    const now = Date.now();

    for (const seed of SEED_CATALOG) {
      const canonicalMake = formatCanonicalName(seed.Make);
      const normMake = toNormalizedKey(canonicalMake);

      const existing = existingNormMap.get(normMake);
      if (!existing) {
        // Insert new
        const models = [...seed.Models].sort((a, b) => a.localeCompare(b));
        await ctx.db.insert("vehicleCatalog", {
          make: canonicalMake,
          normalizedMake: normMake,
          models,
          normalizedModels: models.map(toNormalizedKey),
          aliases: [],
          creatorRole: "system",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        insertedCount++;
      } else {
        // Merge missing models into existing
        const modelSet = new Set(existing.models);
        let addedModel = false;
        for (const m of seed.Models) {
          if (!modelSet.has(m)) {
            modelSet.add(m);
            addedModel = true;
          }
        }
        if (addedModel) {
          const newModels = Array.from(modelSet).sort((a, b) => a.localeCompare(b));
          await ctx.db.patch(existing._id, {
            models: newModels,
            normalizedModels: newModels.map(toNormalizedKey),
            updatedAt: now,
          });
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      insertedCount,
      updatedCount,
      totalCatalogMakes: insertedCount + existingEntries.length,
    };
  },
});
