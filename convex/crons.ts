import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Start scheduled auctions every minute
crons.interval(
  "start scheduled auctions",
  { minutes: 1 },
  internal.auctions.startScheduledAuctions
);

// End expired lots every minute (fallback for missed schedulers)
crons.interval(
  "end expired lots",
  { minutes: 1 },
  internal.auctions.endExpiredLots
);

// Forfeit deposits on overdue unpaid orders
crons.interval(
  "process overdue orders",
  { minutes: 10 },
  internal.payments.processOverdueOrders
);

export default crons;
