import { mutation } from "./_generated/server";

/**
 * Clear all data from the database (for development only)
 */
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🗑️  Clearing all data from database...");

    // Get all tables to clear (matching schema)
    const tables = [
      "users",
      "sessions",
      "userDocuments",
      "vehicles",
      "vehicleImages",
      "vehicleDocuments",
      "auctions",
      "auctionLots",
      "bids",
      "maxBids",
      "watchlist",
      "vehicleAlerts",
      "orders",
      "payments",
      "shipments",
      "shipmentUpdates",
      "customsClearance",
      "notifications",
      "sellers",
      "exchangeRates",
      "systemSettings",
      "auditLog",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      try {
        const records = await ctx.db.query(table as any).collect();
        for (const record of records) {
          await ctx.db.delete(record._id);
        }
        console.log(`✓ Cleared ${records.length} records from ${table}`);
        totalDeleted += records.length;
      } catch (error) {
        console.log(`⚠️  Could not clear ${table}: ${error}`);
      }
    }

    console.log(`\n✅ Database cleared! Total records deleted: ${totalDeleted}\n`);

    return {
      success: true,
      message: "Database cleared successfully",
      totalDeleted,
    };
  },
});
