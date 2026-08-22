import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import { createTestHarness, seedTestUser, seedTestVehicle } from "../helpers/convex-test-harness";

describe("Backend Orders, Checkout, Payments & Logistics Engine (In-Memory Hermetic)", () => {
  test("direct Buy-Now purchase -> soft-hold payment_pending -> pay from wallet -> logistics tracking -> gate pass generation", async () => {
    const t = createTestHarness();

    // 1. Seed actors
    const seller = await seedTestUser(t, { role: "seller", accountType: "seller_individual" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 100_000_000_00 }); // ₦100M in kobo
    const admin = await seedTestUser(t, { role: "admin" });

    // 2. Seed approved vehicle with Buy-Now price
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      make: "Audi",
      model: "e-tron GT",
      year: 2023,
      startingBid: 40_000_000,
      reservePrice: 45_000_000,
      buyNowPrice: 50_000_000,
      status: "approved",
    });

    // 3. Buyer purchases vehicle directly with Lagos destination
    const buyNowResult = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    expect(buyNowResult).toHaveProperty("orderId");
    expect(buyNowResult).toHaveProperty("orderNumber");

    const orderId = buyNowResult.orderId;

    // Verify vehicle is now on soft hold (payment_pending)
    const vehicleDuringHold = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicleDuringHold?.status).toBe("payment_pending");
    expect(vehicleDuringHold?.buyItNowPurchasedBy).toBe(buyer.userId);

    // Another buyer attempting to purchase receives error
    const buyer2 = await seedTestUser(t, { role: "buyer" });
    let conflictError: unknown = null;
    try {
      await t.mutation(api.vehicles.purchaseVehicleDirectly, {
        token: buyer2.token,
        vehicleId,
        destination: "lagos",
      });
    } catch (e: any) {
      conflictError = e;
    }
    expect(conflictError).not.toBeNull();

    // 4. Inspect Order Details and Pricing Breakdown
    const orderDetails = await t.query(api.orders.getOrderDetails, {
      token: buyer.token,
      orderId,
    });

    expect(orderDetails).not.toBeNull();
    expect(orderDetails?.order.orderType).toBe("buy_it_now");
    expect(orderDetails?.order.status).toBe("pending_payment");
    expect(orderDetails?.order.totalAmount).toBeGreaterThan(50_000_000); // Includes service fee + shipping + doc fee

    // 5. Buyer pays for the order using Wallet balance
    const walletPayResult = await t.mutation(api.payments.payOrderFromWallet, {
      token: buyer.token,
      orderId,
    });

    expect(walletPayResult.success).toBe(true);

    // Verify order is now fully paid and vehicle is marked sold
    const orderAfterPayment = await t.query(api.orders.getOrderDetails, {
      token: buyer.token,
      orderId,
    });
    expect(orderAfterPayment?.order.status).toBe("payment_complete");
    expect(orderAfterPayment?.order.paidAmount).toBe(orderAfterPayment?.order.totalAmount);

    const vehicleAfterPayment = await t.run(async (ctx) => ctx.db.get(vehicleId));
    expect(vehicleAfterPayment?.status).toBe("sold");

    // 6. Admin adds Shipping & Carrier Tracking
    const trackingResult = await t.mutation(api.orders.addShippingTracking, {
      token: admin.token,
      orderId,
      carrier: "GIG Logistics",
      trackingNumber: "GIG-EV-982341",
      estimatedDelivery: Date.now() + 3 * 86400_000,
      notes: "Departed Tin Can Island Port for Lagos Distribution Yard",
    });

    expect(trackingResult.success).toBe(true);

    // 7. Retrieve created shipment and add milestone update
    const shipment = await t.run(async (ctx) => {
      return await ctx.db
        .query("shipments")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .first();
    });

    expect(shipment).not.toBeNull();

    const milestoneResult = await t.mutation(api.logistics.addShipmentUpdate, {
      token: admin.token,
      shipmentId: shipment!._id,
      status: "customs_cleared",
      location: "Lagos Customs Wharf",
      description: "Customs clearance and import tariff verified",
    });

    expect(milestoneResult.success).toBe(true);

    // 8. Generate Gate Pass for vehicle clearance
    const gatePassResult = await t.mutation(api.logistics.generateGatePass, {
      token: buyer.token,
      orderId,
    });

    expect(gatePassResult).toHaveProperty("gatePassId");
    expect(gatePassResult).toHaveProperty("code");

    const gatePassId = gatePassResult.gatePassId;
    const code = gatePassResult.code;

    // Security Gate Officer scans & verifies gate pass
    const scanResult = await t.mutation(api.logistics.scanGatePass, {
      token: admin.token,
      code,
    });

    expect(scanResult.success).toBe(true);

    const gatePassDoc = await t.run(async (ctx) => ctx.db.get(gatePassId));
    expect(gatePassDoc?.status).toBe("used");

    const finalOrder = await t.query(api.orders.getOrderDetails, {
      token: buyer.token,
      orderId,
    });
    expect(finalOrder?.order.status).toBe("delivered");
  });
});
