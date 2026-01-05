/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as auctions from "../auctions.js";
import type * as auth from "../auth.js";
import type * as bids from "../bids.js";
import type * as clearData from "../clearData.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as disputes from "../disputes.js";
import type * as files from "../files.js";
import type * as financials from "../financials.js";
import type * as kyc from "../kyc.js";
import type * as lib_auth from "../lib/auth.js";
import type * as logistics from "../logistics.js";
import type * as orders from "../orders.js";
import type * as seedData from "../seedData.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";
import type * as wallet from "../wallet.js";
import type * as watchlist from "../watchlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auctions: typeof auctions;
  auth: typeof auth;
  bids: typeof bids;
  clearData: typeof clearData;
  crons: typeof crons;
  debug: typeof debug;
  disputes: typeof disputes;
  files: typeof files;
  financials: typeof financials;
  kyc: typeof kyc;
  "lib/auth": typeof lib_auth;
  logistics: typeof logistics;
  orders: typeof orders;
  seedData: typeof seedData;
  services: typeof services;
  settings: typeof settings;
  users: typeof users;
  vehicles: typeof vehicles;
  wallet: typeof wallet;
  watchlist: typeof watchlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
