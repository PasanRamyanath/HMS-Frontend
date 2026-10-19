import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SUBSCRIPTION_DATA,
  DEFAULT_USAGE_METERS,
  SAAS_PLANS,
  SaasBillingCard,
  type SaasBillingCardProps,
  type SaasPlan,
  type SaasPlanId,
  type SaasSubscriptionData,
  type SaasSubscriptionStatus,
  type SaasUsageMeter,
  calculateMeterUsagePercent,
  formatMeterValue,
  getUsageStatusColor,
  validateSubscriptionPlanChange,
} from "../src/admin/settings/SaasBillingCard.js";

describe("SaaS Subscription Plan & WebXPay Billing Portal (SaasBillingCard.tsx)", () => {
  describe("Resource Meter Usage Calculations (calculateMeterUsagePercent)", () => {
    it("computes usage percentage accurately with 1 decimal place", () => {
      // 42,500 / 250,000 = 17.0%
      const pct = calculateMeterUsagePercent(42500, 250000);
      assert.strictEqual(pct, 17.0);

      // 1.8 / 25 = 7.2%
      const dbPct = calculateMeterUsagePercent(1.8, 25.0);
      assert.strictEqual(dbPct, 7.2);
    });

    it("clamps percentages between 0% and 100%", () => {
      assert.strictEqual(calculateMeterUsagePercent(-10, 100), 0);
      assert.strictEqual(calculateMeterUsagePercent(150, 100), 100);
      assert.strictEqual(calculateMeterUsagePercent(50, 0), 0);
    });
  });

  describe("Usage Status Colors (getUsageStatusColor)", () => {
    it("resolves emerald for normal utilization (< 70%)", () => {
      assert.strictEqual(getUsageStatusColor(15), "emerald");
      assert.strictEqual(getUsageStatusColor(69.9), "emerald");
    });

    it("resolves amber for warning utilization (70% - 89.9%)", () => {
      assert.strictEqual(getUsageStatusColor(70), "amber");
      assert.strictEqual(getUsageStatusColor(85), "amber");
    });

    it("resolves red for critical utilization (>= 90%)", () => {
      assert.strictEqual(getUsageStatusColor(90), "red");
      assert.strictEqual(getUsageStatusColor(99.5), "red");
    });
  });

  describe("Value Formatting (formatMeterValue)", () => {
    it("formats GB units to 2 decimal places", () => {
      assert.strictEqual(formatMeterValue(1.8, "GB"), "1.80 GB");
    });

    it("formats integer counts with locale separators", () => {
      assert.ok(formatMeterValue(42500, "ops").includes("42,500 ops"));
      assert.ok(formatMeterValue(1000000, "invocations").includes("1,000,000 invocations"));
    });
  });

  describe("Subscription Plan Change Validation (validateSubscriptionPlanChange)", () => {
    it("rejects switching to the same current plan", () => {
      const res = validateSubscriptionPlanChange("PRO_RESORT", "PRO_RESORT", 10);
      assert.strictEqual(res.isAllowed, false);
      assert.strictEqual(res.reason, "You are already subscribed to this plan.");
    });

    it("allows upgrade to higher tier regardless of active room count", () => {
      const res = validateSubscriptionPlanChange("PRO_RESORT", "ENTERPRISE_LUXURY", 20);
      assert.strictEqual(res.isAllowed, true);
    });

    it("rejects downgrade to Community Free if active rooms exceed plan maximum (5 rooms)", () => {
      const res = validateSubscriptionPlanChange("PRO_RESORT", "COMMUNITY_FREE", 14);
      assert.strictEqual(res.isAllowed, false);
      assert.ok(res.reason?.includes("Cannot downgrade"));
      assert.ok(res.reason?.includes("maximum of 5 rooms"));
    });

    it("allows downgrade if active rooms are within limit", () => {
      const res = validateSubscriptionPlanChange("PRO_RESORT", "COMMUNITY_FREE", 4);
      assert.strictEqual(res.isAllowed, true);
    });
  });

  describe("Constants & Default Data Integrity", () => {
    it("includes the 3 core SaaS tiers in SAAS_PLANS", () => {
      assert.strictEqual(SAAS_PLANS.length, 3);
      const [free, pro, enterprise] = SAAS_PLANS;
      assert.strictEqual(free?.id, "COMMUNITY_FREE");
      assert.strictEqual(free?.priceLkr, 0);
      assert.strictEqual(pro?.id, "PRO_RESORT");
      assert.strictEqual(pro?.priceLkr, 14500);
      assert.strictEqual(enterprise?.id, "ENTERPRISE_LUXURY");
      assert.strictEqual(enterprise?.priceLkr, 38500);
    });

    it("contains expected AWS free-tier meters in DEFAULT_USAGE_METERS", () => {
      const freeTierMeters = DEFAULT_USAGE_METERS.filter((m) => m.isAwsFreeTier);
      assert.strictEqual(freeTierMeters.length, 4);
      assert.ok(freeTierMeters.some((m) => m.id === "meter-appsync"));
      assert.ok(freeTierMeters.some((m) => m.id === "meter-dynamo"));
    });
  });

  describe("Component Static Markup Rendering (SaasBillingCard)", () => {
    it("renders billing overview cards, WebXPay tokenized status, and AWS meters", () => {
      const props: SaasBillingCardProps = {
        subscription: DEFAULT_SUBSCRIPTION_DATA,
      };

      const html = renderToStaticMarkup(React.createElement(SaasBillingCard, props));
      assert.ok(html.includes("SaaS Subscription Plan &amp; WebXPay Billing"));
      assert.ok(html.includes("Pro Resort &amp; Villas"));
      assert.ok(html.includes("WebXPay Sri Lanka Gateway"));
      assert.ok(html.includes("4242"));
      assert.ok(html.includes("AWS Mumbai Free-Tier Resource Meters"));
      assert.ok(html.includes("AppSync GraphQL Operations"));
      assert.ok(html.includes("DynamoDB Table Storage"));
      assert.ok(html.includes("Change Subscription Plan"));
    });

    it("accepts constructible types and handlers", () => {
      const subStatus: SaasSubscriptionStatus = "ACTIVE";
      const planId: SaasPlanId = "PRO_RESORT";
      assert.strictEqual(subStatus, "ACTIVE");
      assert.strictEqual(planId, "PRO_RESORT");

      const meter: SaasUsageMeter = DEFAULT_USAGE_METERS[0] as SaasUsageMeter;
      assert.strictEqual(meter.id, "meter-appsync");

      const plan: SaasPlan = SAAS_PLANS[0] as SaasPlan;
      assert.strictEqual(plan.name, "Community Boutique");

      const data: SaasSubscriptionData = DEFAULT_SUBSCRIPTION_DATA;
      assert.strictEqual(data.activeRoomsCount, 14);
    });
  });
});
