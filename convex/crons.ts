import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Start scheduled auctions every minute
crons.interval(
  "start scheduled auctions",
  { minutes: 1 },
  internal.auctions.startScheduledAuctions
);

// End expired lots every minute
crons.interval(
  "end expired lots",
  { minutes: 1 },
  internal.auctions.endExpiredLots
);

export default crons;
