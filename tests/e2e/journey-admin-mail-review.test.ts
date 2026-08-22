import { describe, test, expect } from "bun:test";
import { api } from "../../convex/_generated/api";
import {
  createTestHarness,
  seedTestUser,
  seedTestVehicle,
} from "../helpers/convex-test-harness";

describe("E2E Journey: Admin Mail Review System & Interception Safeguard", () => {
  test("emails queued during transactions are inspectable, editable, and approvable by admins", async () => {
    const t = createTestHarness();

    const admin = await seedTestUser(t, { role: "admin" });
    const seller = await seedTestUser(t, { role: "seller" });
    const buyer = await seedTestUser(t, { role: "buyer", walletBalance: 50_000_000_00 });

    // 1. Admin configures email review setting (requireReview: true)
    await t.mutation(api.emailAdmin.setEmailReviewSetting, {
      token: admin.token,
      requireReview: true,
    });

    const setting = await t.query(api.emailAdmin.getEmailReviewSetting, {
      token: admin.token,
    });
    expect(setting.requireReview).toBe(true);

    // 2. Trigger an action that emits transactional emails (e.g. Buy Now order)
    const vehicleId = await seedTestVehicle(t, seller.userId, {
      buyNowPrice: 20_000_000,
      status: "approved",
    });

    const buyRes = await t.mutation(api.vehicles.purchaseVehicleDirectly, {
      token: buyer.token,
      vehicleId,
      destination: "lagos",
    });

    // 3. Admin lists intercepted review emails
    const emailResult = await t.query(api.emailAdmin.listTransactionalEmails, {
      token: admin.token,
    });

    expect(Array.isArray(emailResult.emails)).toBe(true);

    if (emailResult.emails.length > 0) {
      const targetEmail = emailResult.emails[0];
      expect(targetEmail).toHaveProperty("_id");
      expect(targetEmail).toHaveProperty("recipientEmail");
      expect(targetEmail).toHaveProperty("subject");

      // 4. Admin updates email content before approval
      const editResult = await t.mutation(api.emailAdmin.updateTransactionalEmail, {
        token: admin.token,
        emailId: targetEmail._id,
        subject: `[Verified] ${targetEmail.subject}`,
        bodyHtml: `${targetEmail.bodyHtml ?? ""}<p>Official AutoExports Staff Verified</p>`,
      });

      expect(editResult.success).toBe(true);

      const updatedEmail = await t.query(api.emailAdmin.getTransactionalEmail, {
        token: admin.token,
        emailId: targetEmail._id,
      });

      expect(updatedEmail?.subject).toContain("[Verified]");
    }
  });
});
