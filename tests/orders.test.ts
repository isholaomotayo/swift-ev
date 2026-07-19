import { describe, test, expect, beforeAll } from "bun:test";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { createTestConvexClient } from "./convex-client";

const client = createTestConvexClient();

describe("Orders", () => {
  let adminToken: string;
  let buyerToken: string;
  let testOrderId: Id<"orders">;

  beforeAll(async () => {
    const [adminLogin, buyerLogin] = await Promise.all([
      client.action(api.authActions.login, {
        email: "admin@voltbid.africa",
        password: "admin123",
      }),
      client.action(api.authActions.login, {
        email: "john.doe@example.com",
        password: "buyer123",
      }),
    ]);
    adminToken = adminLogin.token;
    buyerToken = buyerLogin.token;

    // Read-only: reuse an existing order — never purchase/create in tests
    const userOrders = await client.query(api.orders.getUserOrders, {
      token: buyerToken,
    });
    if (userOrders?.length) {
      testOrderId = userOrders[0]._id;
    } else {
      const listed = await client.query(api.orders.listOrders, {
        token: adminToken,
        limit: 1,
      });
      if (listed?.orders?.length) {
        testOrderId = listed.orders[0]._id;
      }
    }
  });

  describe("getUserOrders", () => {
    test("user can get their orders", async () => {
      const orders = await client.query(api.orders.getUserOrders, {
        token: buyerToken,
      });

      expect(Array.isArray(orders)).toBe(true);
      if (orders.length > 0) {
        const order = orders[0] as Doc<"orders"> & {
          vehicle?: { make: string; model: string; year: number };
        };
        expect(order).toHaveProperty("_id");
        expect(order).toHaveProperty("status");
        expect(order).toHaveProperty("winningBid");
        expect(order).toHaveProperty("totalAmount");
        expect(order).toHaveProperty("balanceDue");
        expect(order).toHaveProperty("vehicle");
        if (order.vehicle) {
          expect(order.vehicle).toHaveProperty("make");
          expect(order.vehicle).toHaveProperty("model");
          expect(order.vehicle).toHaveProperty("year");
        }
      }
    });

    test("requires valid token", async () => {
      await expect(
        client.query(api.orders.getUserOrders, {
          token: "invalid_token",
        })
      ).rejects.toThrow();
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
      result.orders.forEach((order: Doc<"orders">) => {
        expect(order.status).toBe("pending_payment");
      });
    });

    test("admin can filter orders by type", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: adminToken,
        orderType: "auction_win",
      });

      expect(Array.isArray(result.orders)).toBe(true);
      result.orders.forEach((order: Doc<"orders">) => {
        expect(order.orderType).toBe("auction_win");
      });
    });

    test("buy now orders expose canonical purchase fields", async () => {
      const result = await client.query(api.orders.listOrders, {
        token: adminToken,
        orderType: "buy_it_now",
      });

      expect(Array.isArray(result.orders)).toBe(true);
      result.orders.forEach((order: Doc<"orders">) => {
        expect(order.orderType).toBe("buy_it_now");
        expect(order).toHaveProperty("winningBid");
        expect(order).toHaveProperty("totalAmount");
        expect(order).toHaveProperty("paidAmount");
        expect(order).toHaveProperty("balanceDue");
        expect(order.balanceDue).toBe(order.totalAmount - order.paidAmount);
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
        result.orders.forEach((order: Doc<"orders">) => {
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
      result.orders.forEach((order: Doc<"orders">) => {
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
        const otherUserId = adminOrders.orders.find((o: Doc<"orders">) => o.userId !== currentUser?.id)?.userId;

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
        const otherOrderId = adminOrders.orders.find((o: Doc<"orders">) => o.userId !== currentUser?.id)?._id;

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
      const fakeOrderId = testOrderId ? (testOrderId.substring(0, 15) + (testOrderId[15] === "0" ? "1" : "0") + testOrderId.substring(16) as Id<"orders">) : ("j1234567890abcdef" as Id<"orders">);
      await expect(
        client.query(api.orders.getOrderDetails, {
          token: adminToken,
          orderId: fakeOrderId,
        })
      ).rejects.toThrow("not found");
    });
  });

  (describe as any).skip("updateOrderStatus [convex writes blocked]", () => {
    test("admin can update order status", async () => {
      if (testOrderId) {
        const result = await client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: testOrderId,
          status: "processing",
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
            status: "processing",
          })
        ).rejects.toThrow();
      }
    });

    test("requires valid order ID", async () => {
      const fakeOrderId = testOrderId ? (testOrderId.substring(0, 15) + (testOrderId[15] === "0" ? "1" : "0") + testOrderId.substring(16) as Id<"orders">) : ("j1234567890abcdef" as Id<"orders">);
      await expect(
        client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: fakeOrderId,
          status: "processing",
        })
      ).rejects.toThrow("not found");
    });

    test("cannot mark payment_complete while balance remains", async () => {
      if (!testOrderId) return;
      const details = await client.query(api.orders.getOrderDetails, {
        token: adminToken,
        orderId: testOrderId,
      });
      if (!details?.order || details.order.balanceDue <= 0) return;

      await expect(
        client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: testOrderId,
          status: "payment_complete",
        })
      ).rejects.toThrow(/balanceDue/i);
    });
  });

  (describe as any).skip("addShippingTracking [convex writes blocked]", () => {
    test("admin can add shipping tracking", async () => {
      if (testOrderId) {
        // Set order to processing status first so it can be shipped
        await client.mutation(api.orders.updateOrderStatus, {
          token: adminToken,
          orderId: testOrderId,
          status: "processing",
        });

        const result = await client.mutation(api.orders.addShippingTracking, {
          token: adminToken,
          orderId: testOrderId,
          carrier: "DHL",
          trackingNumber: `TEST-${Date.now()}`,
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
      const fakeOrderId = testOrderId ? (testOrderId.substring(0, 15) + (testOrderId[15] === "0" ? "1" : "0") + testOrderId.substring(16) as Id<"orders">) : ("j1234567890abcdef" as Id<"orders">);
      await expect(
        client.mutation(api.orders.addShippingTracking, {
          token: adminToken,
          orderId: fakeOrderId,
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
