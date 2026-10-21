import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AwsFreeTierMeterCard,
  DEFAULT_AWS_FREE_TIER_QUOTAS,
  calculateDaysRemainingInMonth,
  calculateUsagePercent,
  formatQuotaValue,
  getQuotaHealthStatus,
  projectMonthEndUsagePercent,
} from "../src/admin/superadmin/AwsFreeTierMeterCard.js";

describe("Step 455 (Phase 19.05): Real-Time AWS Free-Tier Quota Monitor Widget (AwsFreeTierMeterCard.tsx)", () => {
  describe("1. Default Quota Entitlements & Zero-Bill Architecture", () => {
    it("tracks DynamoDB, AppSync, Lambda, CloudFront, and Cognito quotas", () => {
      assert.strictEqual(DEFAULT_AWS_FREE_TIER_QUOTAS.length, 5);
      const services = DEFAULT_AWS_FREE_TIER_QUOTAS.map((q) => q.serviceId);
      assert.ok(services.includes("dynamodb"));
      assert.ok(services.includes("appsync"));
      assert.ok(services.includes("lambda"));
      assert.ok(services.includes("cloudfront"));
      assert.ok(services.includes("cognito"));
    });

    it("configures Amazon DynamoDB with 25 GB permanent storage allowance", () => {
      const ddb = DEFAULT_AWS_FREE_TIER_QUOTAS.find((q) => q.serviceId === "dynamodb");
      assert.ok(ddb);
      assert.strictEqual(ddb?.freeTierLimit, 25.0);
      assert.strictEqual(ddb?.unit, "GB");
      assert.strictEqual(ddb?.monthlyBillUsd, 0.0);
      assert.strictEqual(ddb?.status, "HEALTHY");
      assert.ok(ddb?.usagePercent < 15);
    });

    it("configures AWS AppSync with 250,000 monthly operations", () => {
      const appsync = DEFAULT_AWS_FREE_TIER_QUOTAS.find((q) => q.serviceId === "appsync");
      assert.ok(appsync);
      assert.strictEqual(appsync?.freeTierLimit, 250000);
      assert.strictEqual(appsync?.unit, "Ops");
      assert.strictEqual(appsync?.monthlyBillUsd, 0.0);
      assert.strictEqual(appsync?.status, "HEALTHY");
      assert.ok(appsync?.usagePercent < 20);
    });

    it("configures AWS Lambda with 1,000,000 monthly free invocations", () => {
      const lambda = DEFAULT_AWS_FREE_TIER_QUOTAS.find((q) => q.serviceId === "lambda");
      assert.ok(lambda);
      assert.strictEqual(lambda?.freeTierLimit, 1000000);
      assert.strictEqual(lambda?.unit, "Invocations");
      assert.strictEqual(lambda?.monthlyBillUsd, 0.0);
      assert.strictEqual(lambda?.status, "HEALTHY");
    });

    it("configures Amazon CloudFront with 1,000 GB (1 TB) data transfer out", () => {
      const cf = DEFAULT_AWS_FREE_TIER_QUOTAS.find((q) => q.serviceId === "cloudfront");
      assert.ok(cf);
      assert.strictEqual(cf?.freeTierLimit, 1000.0);
      assert.strictEqual(cf?.unit, "GB");
      assert.strictEqual(cf?.monthlyBillUsd, 0.0);
      assert.strictEqual(cf?.status, "HEALTHY");
    });

    it("configures Amazon Cognito with 50,000 monthly active users", () => {
      const cognito = DEFAULT_AWS_FREE_TIER_QUOTAS.find((q) => q.serviceId === "cognito");
      assert.ok(cognito);
      assert.strictEqual(cognito?.freeTierLimit, 50000);
      assert.strictEqual(cognito?.unit, "MAUs");
      assert.strictEqual(cognito?.monthlyBillUsd, 0.0);
      assert.strictEqual(cognito?.status, "HEALTHY");
    });
  });

  describe("2. Health Thresholds & Usage Calculations", () => {
    it("calculates usage percentage accurately", () => {
      assert.strictEqual(calculateUsagePercent(1.84, 25), 7.36);
      assert.strictEqual(calculateUsagePercent(34200, 250000), 13.68);
      assert.strictEqual(calculateUsagePercent(10, 0), 0);
    });

    it("maps percentage to health status according to safety boundaries", () => {
      assert.strictEqual(getQuotaHealthStatus(15), "HEALTHY");
      assert.strictEqual(getQuotaHealthStatus(69.9), "HEALTHY");
      assert.strictEqual(getQuotaHealthStatus(70.0), "WARNING");
      assert.strictEqual(getQuotaHealthStatus(84.9), "WARNING");
      assert.strictEqual(getQuotaHealthStatus(85.0), "CRITICAL");
      assert.strictEqual(getQuotaHealthStatus(98.5), "CRITICAL");
    });

    it("calculates remaining days in monthly billing cycle accurately", () => {
      const oct21 = new Date("2026-10-21T12:00:00Z");
      const remaining = calculateDaysRemainingInMonth(oct21);
      assert.strictEqual(remaining, 10); // 31 days in Oct - 21 = 10
    });

    it("projects month-end usage percentage based on daily velocity", () => {
      // 100 units consumed in 10 days out of 30 days total, with limit 600
      // daily rate = 10 units/day -> month total = 300 units -> 300 / 600 = 50.0%
      const projected = projectMonthEndUsagePercent(100, 600, 10, 30);
      assert.strictEqual(projected, 50.0);

      assert.strictEqual(projectMonthEndUsagePercent(100, 0, 10, 30), 0);
      assert.strictEqual(projectMonthEndUsagePercent(100, 600, 0, 30), 0);
    });

    it("formats quota values with appropriate unit suffix", () => {
      assert.strictEqual(formatQuotaValue(1.84, "GB"), "1.84 GB");
      assert.strictEqual(formatQuotaValue(250000, "Ops"), "250,000 Ops");
      assert.strictEqual(formatQuotaValue(1000000, "Invocations"), "1,000,000 Invocations");
      assert.strictEqual(formatQuotaValue(1420, "MAUs"), "1,420 MAUs");
    });
  });

  describe("3. Static Component Markup & Apple HIG Liquid Glass Presentation", () => {
    it("renders card title, region badge, and zero-cost guarantee banner", () => {
      const html = renderToStaticMarkup(React.createElement(AwsFreeTierMeterCard));

      assert.ok(html.includes("AWS Free-Tier Quota Monitor"));
      assert.ok(html.includes("ap-south-1 Mumbai"));
      assert.ok(html.includes("100% Within Free-Tier Quotas"));
      assert.ok(html.includes("$0.00"));
      assert.ok(html.includes("USD / Month"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders all five AWS services with progress meters and limits", () => {
      const html = renderToStaticMarkup(React.createElement(AwsFreeTierMeterCard));

      assert.ok(html.includes("Amazon DynamoDB"));
      assert.ok(html.includes("AWS AppSync"));
      assert.ok(html.includes("AWS Lambda"));
      assert.ok(html.includes("Amazon CloudFront"));
      assert.ok(html.includes("Amazon Cognito"));
      assert.ok(html.includes("25.00 GB"));
      assert.ok(html.includes("250,000 Ops"));
      assert.ok(html.includes("1,000,000 Invocations"));
    });

    it("renders refresh button with accessible label", () => {
      const html = renderToStaticMarkup(React.createElement(AwsFreeTierMeterCard));

      assert.ok(html.includes('aria-label="Refresh AWS free tier telemetry"'));
    });

    it("renders highest utilized service summary and zero-bill safety margin", () => {
      const html = renderToStaticMarkup(React.createElement(AwsFreeTierMeterCard));

      assert.ok(html.includes("Highest Utilized:"));
      assert.ok(html.includes("Zero-bill safety margin:"));
    });

    it("supports custom className on wrapper card", () => {
      const html = renderToStaticMarkup(
        React.createElement(AwsFreeTierMeterCard, {
          className: "custom-meter-widget-class",
        }),
      );

      assert.ok(html.includes("custom-meter-widget-class"));
    });
  });
});
