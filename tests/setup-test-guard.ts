import { ConvexHttpClient } from "convex/browser";

const ALLOW_DB_MUTATION = process.env.ALLOW_DB_MUTATION === "true";

if (!ALLOW_DB_MUTATION) {
  // Intercept ConvexHttpClient.prototype.mutation to block all write mutations during automated tests
  ConvexHttpClient.prototype.mutation = async function (mutationFn: any, ..._args: any[]) {
    const fnName = typeof mutationFn === "string"
      ? mutationFn
      : mutationFn?._functionName || mutationFn?.name || "ConvexMutation";

    throw new Error(
      `[DATABASE MUTATION BLOCKED] Attempted to execute Convex mutation '${fnName}' during automated tests. Database mutations are disabled by default to protect live database state. Set ALLOW_DB_MUTATION=true to run mutating tests.`
    );
  };
}
