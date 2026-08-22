import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("E2E Journey: Direct Buy-Now Instant Purchase & Settlement Flow", () => {
  test("complete instant purchase lifecycle with deposit funding and delivery settlement", async () => {
    const t = createTestHarness();

    // 1. Seed Actors
    const seller = await seedTestUser(t, {
      role: "seller",
      accountType: "seller_individual",
    });

    const buyer = await seedTestUser(t, {
      role: "buyer",
      accountType: "individual",
      walletBalance: 0,
      buyingPower: 0,
    });

    const admin = await seedTestUser(t, { role: "admin" });

    // 2. Seller Lists Vehicle with Buy-Now Price
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      make: "BMW",
      model: "i4 M50",
      year: 2024,
      startingBid: 32_000_000,
      reservePrice: 38_000_000,
      buyNowPrice: 42_000_000,
      status: "approved",
    });

    // 3. Buyer Initiates Buy-Now Order (Soft Hold activated)
    const buyOrder = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    expect(buyOrder).toHaveProperty("orderId");
    expect(buyOrder).toHaveProperty("orderNumber");

    const orderId = buyOrder.orderId;

    // Verify Vehicle status is locked in payment_pending
    const lockedVehicle = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(lockedVehicle?.status).toBe("payment_pending");

    // 4. Buyer Funds Wallet with Exact Order Total
    const orderDetails = await t.query(api.orders.getOrderDetails, {
      token: buyer.token,
      orderId,
    });

    const totalNaira = orderDetails!.order.totalAmount;
    const depositKobo = Math.round(totalNaira * 100);

    const fundResult = await t.mutation(api.wallet.initiateWalletFunding, {
      token: buyer.token,
      amount: depositKobo,
    });

    const reference = fundResult.txRef;

    // Hermetic Flutterwave Verification Mock
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: any, init: any) => {
      if (String(url).includes("api.flutterwave.com")) {
        return new Response(
          JSON.stringify({
            status: "success",
            message: "Transaction fetched",
            data: {
              id: 5544332211,
              tx_ref: reference,
              flw_ref: "FLW_BUYNOW_9988",
              amount: totalNaira,
              charged_amount: totalNaira,
              currency: "NGN",
              status: "successful",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url, init);
    }) as any;

    try {
      await t.mutation(api.wallet.confirmWalletFunding, {
        token: buyer.token,
        txRef: reference,
        transactionId: "5544332211",
      });

      // 5. Buyer Completes Payment for the Buy-Now Order
      const payResult = await t.mutation(api.payments.payOrderFromWallet, {
        token: buyer.token,
        orderId,
      });

      expect(payResult.success).toBe(true);

      const paidOrder = await t.query(api.orders.getOrderDetails, {
        token: buyer.token,
        orderId,
      });
      expect(paidOrder?.order.status).toBe("payment_complete");

      // 6. Admin and Logistics Processing
      await t.mutation(api.orders.addShippingTracking, {
        token: admin.token,
        orderId,
        carrier: "Swift Logistics Carrier",
        trackingNumber: "SWIFT-BN-112233",
        notes: "En route to Lagos Terminal",
      });

      const passResult = await t.mutation(api.logistics.generateGatePass, {
        token: buyer.token,
        orderId,
      });

      const scanResult = await t.mutation(api.logistics.scanGatePass, {
        token: admin.token,
        code: passResult.code,
      });

      expect(scanResult.success).toBe(true);

      const deliveredOrder = await t.query(api.orders.getOrderDetails, {
        token: buyer.token,
        orderId,
      });
      expect(deliveredOrder?.order.status).toBe("delivered");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
