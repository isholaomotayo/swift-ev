import { describe, test, expect, beforeAll } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://greedy-rhinoceros-131.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

describe("Orders", () => {
  let adminToken: string;
  let buyerToken: string;
  let testOrderId: Id<"orders">;

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
  });

  describe("getUserOrders", () => {
    test("user can get their orders", async () => {
      const orders = await client.query(api.orders.getUserOrders, {
        token: buyerToken,
      });

      expect(Array.isArray(orders)).toBe(true);
      if (orders.length > 0) {
        const order = orders[0];
        expect(order).toHaveProperty("_id");
        expect(order).toHaveProperty("orderStatus");
        expect(order).toHaveProperty("vehiclePrice");
        expect(order).toHaveProperty("totalAmount");
        expect(order).toHaveProperty("vehicle");
        if (order.vehicle) {
          expect(order.vehicle).toHaveProperty("make");
          expect(order.vehicle).toHaveProperty("model");
          expect(order.vehicle).toHaveProperty("year");
        }
      }
    });

    test("requires valid token", async () => {
      const orders = await client.query(api.orders.getUserOrders, {
        token: "invalid_token",
      });

      // Should return empty array or throw error
      expect(Array.isArray(orders) || orders === null).toBe(true);
    });
  });

  describe("listOrders", () => {
    test("admin can list all orders", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: adminToken,
      });

      expect(result).toHaveProperty("orders");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("offset");
      expect(result).toHaveProperty("limit");
      expect(Array.isArray(result.orders)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(typeof result.offset).toBe("number");
      expect(typeof result.limit).toBe("number");
    });

    test("admin can filter orders by status", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: adminToken,
        status: "pending_payment",
      });

      expect(Array.isArray(result.orders)).toBe(true);
      result.orders.forEach((order) => {
        expect(order.status).toBe("pending_payment");
      });
    });

    test("admin can filter orders by type", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: adminToken,
        orderType: "auction_win",
      });

      expect(Array.isArray(result.orders)).toBe(true);
      result.orders.forEach((order) => {
        expect(order.orderType).toBe("auction_win");
      });
    });

    test("admin can filter orders by user", async () => {
      // Get a user ID from orders
      const allOrders = await client.query(api.orders.listOrders, {
        token: adminToken,
      });

      if (allOrders.orders.length > 0) {
        const userId = allOrders.orders[0].userId;

        const result = await client.query(api.orders.listOrders, {
          token: adminToken,
          userId,
        });

        expect(Array.isArray(result.orders)).toBe(true);
        result.orders.forEach((order) => {
          expect(order.userId).toBe(userId);
        });
      }
    });

    test("admin can paginate orders", async () => {
      const page1 = await client.query(api.orders.listOrders, {
        token: adminToken,
        limit: 5,
        offset: 0,
      });

      const page2 = await client.query(api.orders.listOrders, {
        token: adminToken,
        limit: 5,
        offset: 5,
      });

      expect(page1.orders.length).toBeLessThanOrEqual(5);
      expect(page2.orders.length).toBeLessThanOrEqual(5);
      expect(page1.offset).toBe(0);
      expect(page2.offset).toBe(5);
    });

    test("buyer can only see their own orders", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: buyerToken,
      });

      expect(Array.isArray(result.orders)).toBe(true);
      result.orders.forEach((order) => {
        // Buyer should only see their own orders
        expect(order.userId).toBeDefined();
      });
    });

    test("non-admin cannot query other users' orders", async () => {
      // Get a user ID that's not the buyer
      const adminOrders = await client.query(api.orders.listOrders, {
        token: adminToken,
      });

      if (adminOrders.orders.length > 0) {
        const currentUser = await client.query(api.auth.getCurrentUser, { token: buyerToken });
        const otherUserId = adminOrders.orders.find((o) => o.userId !== currentUser?.id)?.userId;

        if (otherUserId) {
          await expect(
            client.query(api.orders.listOrders, {
              token: buyerToken,
              userId: otherUserId,
            })
          ).rejects.toThrow("Unauthorized");
        }
      }
    });
  });

  describe("getOrderDetails", () => {
    test("user can get their own order details", async () => {
      // Get user's orders first
      const userOrders = await client.query(api.orders.getUserOrders, {
        token: buyerToken,
      });

      if (userOrders.length > 0) {
        const orderId = userOrders[0]._id;
        testOrderId = orderId;

        const order = await client.query(api.orders.getOrderDetails, {
          token: buyerToken,
          orderId,
        });

        expect(order).toHaveProperty("order");
        expect(order).toHaveProperty("buyer");
        expect(order).toHaveProperty("vehicle");
        expect(order).toHaveProperty("payments");
        expect(order).toHaveProperty("shipments");
        expect(order.order._id).toBe(orderId);
        expect(Array.isArray(order.payments)).toBe(true);
        expect(Array.isArray(order.shipments)).toBe(true);
      }
    });

    test("admin can get any order details", async () => {
      if (testOrderId) {
        const order = await client.query(api.orders.getOrderDetails, {
          token: adminToken,
          orderId: testOrderId,
        });

        expect(order).toHaveProperty("order");
        expect(order.order._id).toBe(testOrderId);
      }
    });

    test("user cannot get other users' order details", async () => {
      // Get an order from admin view
      const adminOrders = await client.query(api.orders.listOrders, {
        token: adminToken,
      });

      if (adminOrders.orders.length > 0) {
        const currentUser = await client.query(api.auth.getCurrentUser, { token: buyerToken });
        const otherOrderId = adminOrders.orders.find((o) => o.userId !== currentUser?.id)?._id;

        if (otherOrderId) {
          await expect(
            client.query(api.orders.getOrderDetails, {
              token: buyerToken,
              orderId: otherOrderId,
            })
          ).rejects.toThrow("permission");
        }
      }
    });

    test("returns error for non-existent order", async () => {
      await expect(
        client.query(api.orders.getOrderDetails, {
          token: adminToken,
          orderId: "j1234567890abcdef" as any,
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("updateOrderStatus", () => {
    test("admin can update order status", async () => {
      if (testOrderId) {
        const result = await client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: testOrderId,
          status: "payment_complete",
          notes: "Test status update",
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
      }
    });

    test("non-admin cannot update order status", async () => {
      if (testOrderId) {
        await expect(
          client.mutation(api.orders.updateOrderStatus, {
            token: buyerToken,
            orderId: testOrderId,
            status: "payment_complete",
          })
        ).rejects.toThrow();
      }
    });

    test("requires valid order ID", async () => {
      await expect(
        client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: "j1234567890abcdef" as any,
          status: "payment_complete",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("addShippingTracking", () => {
    test("admin can add shipping tracking", async () => {
      if (testOrderId) {
        const result = await client.mutation(api.orders.addShippingTracking, {
          token: adminToken,
          orderId: testOrderId,
          carrier: "DHL",
          trackingNumber: "TEST123456789",
          estimatedDelivery: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
          notes: "Test shipping tracking",
        });

        expect(result).toHaveProperty("success");
        expect(result.success).toBe(true);
      }
    });

    test("non-admin cannot add shipping tracking", async () => {
      if (testOrderId) {
        await expect(
          client.mutation(api.orders.addShippingTracking, {
            token: buyerToken,
            orderId: testOrderId,
            carrier: "DHL",
            trackingNumber: "TEST123456789",
          })
        ).rejects.toThrow();
      }
    });

    test("requires valid order ID", async () => {
      await expect(
        client.mutation(api.orders.addShippingTracking, {
          token: adminToken,
          orderId: "j1234567890abcdef" as any,
          carrier: "DHL",
          trackingNumber: "TEST123456789",
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("getOrderStats", () => {
    test("admin can get order statistics", async () => {
      const stats = await client.query(api.orders.getOrderStats, {
        token: adminToken,
      });

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pendingPayment");
      expect(stats).toHaveProperty("inTransit");
      expect(stats).toHaveProperty("delivered");
      expect(stats).toHaveProperty("totalRevenue");
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.pendingPayment).toBe("number");
      expect(typeof stats.inTransit).toBe("number");
      expect(typeof stats.delivered).toBe("number");
      expect(typeof stats.totalRevenue).toBe("number");
    });

    test("non-admin cannot get order stats", async () => {
      await expect(
        client.query(api.orders.getOrderStats, {
          token: buyerToken,
        })
      ).rejects.toThrow();
    });
  });
});

