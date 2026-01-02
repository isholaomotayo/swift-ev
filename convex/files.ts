import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate an upload URL for client-side file upload
 * Requires authentication
 */
export const generateUploadUrl = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized - please log in");
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get public URL for a file
 * Public access - no authentication required
 */
export const getFileUrl = query({
  args: {
    storageId: v.union(v.string(), v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Handle legacy string URLs
    if (typeof args.storageId === "string") {
      return args.storageId;
    }

    // Get Convex storage URL
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Get URLs for multiple files
 * Useful for batch loading images
 */
export const getFileUrls = query({
  args: {
    storageIds: v.array(v.union(v.string(), v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        if (typeof storageId === "string") {
          return storageId;
        }
        return await ctx.storage.getUrl(storageId);
      })
    );
    return urls;
  },
});

/**
 * Delete a file from storage
 * Validates user owns the file or is admin
 */
export const deleteFile = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    resourceType: v.union(
      v.literal("user_avatar"),
      v.literal("vehicle_image"),
      v.literal("vehicle_document"),
      v.literal("user_document")
    ),
    resourceId: v.string(), // ID of the related resource (user, vehicle, etc.)
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Unauthorized - please log in");
    }

    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate ownership based on resource type
    let authorized = false;

    if (args.resourceType === "user_avatar" || args.resourceType === "user_document") {
      // User can delete their own files or admin can delete any
      authorized = args.resourceId === user._id || user.role === "admin" || user.role === "superadmin";
    } else if (args.resourceType === "vehicle_image" || args.resourceType === "vehicle_document") {
      // Check if user owns the vehicle or is admin
      const vehicle = await ctx.db.get(args.resourceId as any);
      if (vehicle) {
        authorized =
          (vehicle as any).sellerId === user._id ||
          user.role === "admin" ||
          user.role === "superadmin";
      }
    }

    if (!authorized) {
      throw new Error("Unauthorized to delete this file");
    }

    // Delete from storage
    await ctx.storage.delete(args.storageId);

    return { success: true };
  },
});

/**
 * Helper function to get image URL (for use in other functions)
 * Handles both legacy URLs and storage IDs
 */
export async function getImageUrl(
  ctx: any,
  imageField: string | any
): Promise<string | null> {
  if (!imageField) return null;

  if (typeof imageField === "string") {
    // Legacy URL
    return imageField;
  } else {
    // New storage ID
    try {
      return await ctx.storage.getUrl(imageField);
    } catch (e) {
      console.error("Error getting storage URL:", e);
      return null;
    }
  }
}
