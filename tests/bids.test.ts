import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Bids", () => {
  let adminToken: string;
  let buyerToken: string;
  let buyer2Token: string;
  let activeLotId: Id<"auctionLots">;

  beforeAll(async () => {
    // Login as admin
    const adminLogin = await client.mutation(api.auth.login, {
      email: "admin@autoexports.live",
      password: "admin123",
    });
    adminToken = adminLogin.token;

    // Login as buyer
    const buyerLogin = await client.mutation(api.auth.login, {
      email: "john.doe@example.com",
      password: "buyer123",
    });
    buyerToken = buyerLogin.token;

    // Login as second buyer (if exists)
    try {
      const buyer2Login = await client.mutation(api.auth.login, {
        email: "jane.smith@example.com",
        password: "buyer123",
      });
      buyer2Token = buyer2Login.token;
    } catch (e) {
      // Second buyer might not exist
      buyer2Token = buyerToken;
    }

    // Get an active lot for testing
    const auctions = await client.query(api.auctions.listAuctions, {
      status: "live",
    });

    if (auctions.length > 0) {
      const auctionId = auctions[0]._id;
      const currentLot = await client.query(api.auctions.getCurrentLot, {
        auctionId,
      });

      if (currentLot) {
        activeLotId = currentLot.lot._id;
      }
    }
  });

  describe("getBidsForLot", () => {
    test("returns bids for a lot", async () => {
      if (activeLotId) {
        const bids = await client.query(api.bids.getBidsForLot, {
          lotId: activeLotId,
        });

        expect(Array.isArray(bids)).toBe(true);
        if (bids.length > 0) {
          const bid = bids[0];
          expect(bid).toHaveProperty("_id");
          expect(bid).toHaveProperty("amount");
          expect(bid).toHaveProperty("bidType");
          expect(bid).toHaveProperty("status");
          expect(bid).toHaveProperty("createdAt");
          expect(bid).toHaveProperty("user");
        }
      }
    });

    test("returns empty array for lot with no bids", async () => {
      // This would require a lot with no bids - might not always be available
      const bids = await client.query(api.bids.getBidsForLot, {
        lotId: activeLotId || ("j1234567890abcdef" as any),
      });

      expect(Array.isArray(bids)).toBe(true);
    });
  });

  describe("getUserBids", () => {
    test("returns user's bids", async () => {
      const bids = await client.query(api.bids.getUserBids, {
        token: buyerToken,
      });

      expect(Array.isArray(bids)).toBe(true);
      if (bids.length > 0) {
        const bid = bids[0];
        expect(bid).toHaveProperty("bid");
        expect(bid).toHaveProperty("lot");
        expect(bid).toHaveProperty("vehicle");
        expect(bid.bid).toHaveProperty("amount");
        expect(bid.bid).toHaveProperty("status");
        expect(bid.lot).toHaveProperty("status");
        expect(bid.vehicle).toHaveProperty("make");
        expect(bid.vehicle).toHaveProperty("model");
      }
    });

    test("returns empty array for user with no bids", async () => {
      // Use invalid token to simulate no bids scenario
      const bids = await client.query(api.bids.getUserBids, {
        token: "invalid_token",
      });

      expect(Array.isArray(bids)).toBe(true);
      expect(bids.length).toBe(0);
    });
  });

  describe("getUserMaxBid", () => {
    test("returns user's max bid for a lot", async () => {
      if (activeLotId) {
        const maxBid = await client.query(api.bids.getUserMaxBid, {
          token: buyerToken,
          lotId: activeLotId,
        });

        // May be null if user hasn't set a max bid
        if (maxBid) {
          expect(maxBid).toHaveProperty("_id");
          expect(maxBid).toHaveProperty("maxAmount");
          expect(maxBid).toHaveProperty("isActive");
          expect(maxBid).toHaveProperty("userId");
        }
      }
    });

    test("returns null for user without max bid", async () => {
      if (activeLotId) {
        const maxBid = await client.query(api.bids.getUserMaxBid, {
          token: "invalid_token",
          lotId: activeLotId,
        });

        expect(maxBid).toBeNull();
      }
    });
  });

  describe("placeBid", () => {
    test("user can place a bid on active lot", async () => {
      if (activeLotId) {
        // Get current bid first
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const newBidAmount = currentBid + bidIncrement;

          const result = await client.mutation(api.bids.placeBid, {
            token: buyerToken,
            lotId: activeLotId,
            amount: newBidAmount,
          });

          expect(result).toHaveProperty("success");
          expect(result.success).toBe(true);
          expect(result).toHaveProperty("bidId");
          expect(result).toHaveProperty("newCurrentBid");
          expect(result.newCurrentBid).toBe(newBidAmount);
        }
      }
    });

    test("fails with bid below minimum", async () => {
      if (activeLotId) {
        // Get current bid first
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const invalidBidAmount = currentBid + bidIncrement - 1; // Below minimum

          await expect(
            client.mutation(api.bids.placeBid, {
              token: buyerToken,
              lotId: activeLotId,
              amount: invalidBidAmount,
            })
          ).rejects.toThrow();
        }
      }
    });

    test("fails on inactive lot", async () => {
      // Get a non-active lot (if available)
      const auctions = await client.query(api.auctions.listAuctions, {
        status: "completed",
      });

      if (auctions.length > 0) {
        const auction = await client.query(api.auctions.getAuctionById, {
          auctionId: auctions[0]._id,
        });

        if (auction && auction.lots.length > 0) {
          const inactiveLotId = auction.lots[0].lot._id;

          await expect(
            client.mutation(api.bids.placeBid, {
              token: buyerToken,
              lotId: inactiveLotId,
              amount: 1000000,
            })
          ).rejects.toThrow("not currently active");
        }
      }
    });

    test("fails without authentication", async () => {
      if (activeLotId) {
        await expect(
          client.mutation(api.bids.placeBid, {
            token: "invalid_token",
            lotId: activeLotId,
            amount: 1000000,
          })
        ).rejects.toThrow();
      }
    });

    test("fails for inactive user", async () => {
      // This would require a suspended/banned user - might not be available in test data
      // Test structure is here for when such users exist
      if (activeLotId) {
        // Would need a suspended user token
        // await expect(...).rejects.toThrow("account is not active");
      }
    });
  });

  describe("setMaxBid", () => {
    test("user can set max bid", async () => {
      if (activeLotId) {
        // Get current bid first
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const maxBidAmount = currentBid + bidIncrement * 5; // Set max bid well above current

          const result = await client.mutation(api.bids.setMaxBid, {
            token: buyer2Token || buyerToken,
            lotId: activeLotId,
            maxAmount: maxBidAmount,
          });

          expect(result).toHaveProperty("success");
          expect(result.success).toBe(true);
          expect(result).toHaveProperty("message");
        }
      }
    });

    test("fails with max bid below minimum", async () => {
      if (activeLotId) {
        // Get current bid first
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const invalidMaxBid = currentBid + bidIncrement - 1; // Below minimum

          await expect(
            client.mutation(api.bids.setMaxBid, {
              token: buyerToken,
              lotId: activeLotId,
              maxAmount: invalidMaxBid,
            })
          ).rejects.toThrow();
        }
      }
    });

    test("fails on inactive lot", async () => {
      const auctions = await client.query(api.auctions.listAuctions, {
        status: "completed",
      });

      if (auctions.length > 0) {
        const auction = await client.query(api.auctions.getAuctionById, {
          auctionId: auctions[0]._id,
        });

        if (auction && auction.lots.length > 0) {
          const inactiveLotId = auction.lots[0].lot._id;

          await expect(
            client.mutation(api.bids.setMaxBid, {
              token: buyerToken,
              lotId: inactiveLotId,
              maxAmount: 1000000,
            })
          ).rejects.toThrow("not currently active");
        }
      }
    });

    test("can update existing max bid", async () => {
      if (activeLotId) {
        // Get current bid first
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const firstMaxBid = currentBid + bidIncrement * 5;
          const updatedMaxBid = currentBid + bidIncrement * 10;

          // Set initial max bid
          await client.mutation(api.bids.setMaxBid, {
            token: buyerToken,
            lotId: activeLotId,
            maxAmount: firstMaxBid,
          });

          // Update max bid
          const result = await client.mutation(api.bids.setMaxBid, {
            token: buyerToken,
            lotId: activeLotId,
            maxAmount: updatedMaxBid,
          });

          expect(result).toHaveProperty("success");
          expect(result.success).toBe(true);
        }
      }
    });
  });

  describe("cancelMaxBid", () => {
    test("user can cancel their max bid", async () => {
      if (activeLotId) {
        // First set a max bid
        const lot = await client.query(api.auctions.getCurrentLot, {
          auctionId: (await client.query(api.auctions.listAuctions, { status: "live" }))[0]._id,
        });

        if (lot) {
          const currentBid = lot.lot.currentBid;
          const bidIncrement = lot.lot.bidIncrement || 10000;
          const maxBidAmount = currentBid + bidIncrement * 5;

          await client.mutation(api.bids.setMaxBid, {
            token: buyerToken,
            lotId: activeLotId,
            maxAmount: maxBidAmount,
          });

          // Cancel it
          const result = await client.mutation(api.bids.cancelMaxBid, {
            token: buyerToken,
            lotId: activeLotId,
          });

          expect(result).toHaveProperty("success");
          expect(result.success).toBe(true);
        }
      }
    });

    test("fails without authentication", async () => {
      if (activeLotId) {
        await expect(
          client.mutation(api.bids.cancelMaxBid, {
            token: "invalid_token",
            lotId: activeLotId,
          })
        ).rejects.toThrow();
      }
    });
  });
});

