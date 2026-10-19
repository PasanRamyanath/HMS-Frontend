import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_WEBHOOK_LOGS,
  PROVIDER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type WebhookDeliveryLog,
  type WebhookDeliveryStatus,
  WebhookLogDrawer,
  type WebhookLogDrawerProps,
  type WebhookPayloadType,
  type WebhookProvider,
  type WebhookSummaryStats,
  computeDeliveryStats,
  filterWebhookLogs,
  formatHttpStatusBadge,
  generateCurlCommand,
  validateRetryEligibility,
} from "../src/admin/channels/WebhookLogDrawer.js";

describe("Webhook Delivery Log & Retry Inspector (WebhookLogDrawer.tsx)", () => {
  describe("1. Default Constants & Configurations", () => {
    it("provides mock delivery logs across Sri Lankan hospitality providers", () => {
      assert.strictEqual(DEFAULT_WEBHOOK_LOGS.length, 5);

      const channex = DEFAULT_WEBHOOK_LOGS.find((l) => l.provider === "CHANNEX");
      assert.ok(channex);
      assert.strictEqual(channex.tenantId, "tenant-galle-fort");
      assert.strictEqual(channex.eventType, "BOOKING_CREATED");
      assert.strictEqual(channex.httpStatus, 200);

      const payhere = DEFAULT_WEBHOOK_LOGS.find((l) => l.provider === "PAYHERE");
      assert.ok(payhere);
      assert.strictEqual(payhere.eventType, "PAYMENT_CONFIRMED");

      const smsgo = DEFAULT_WEBHOOK_LOGS.find((l) => l.provider === "SMSGO");
      assert.ok(smsgo);
      assert.strictEqual(smsgo.eventType, "SMS_DELIVERED");

      const webxpay = DEFAULT_WEBHOOK_LOGS.find((l) => l.provider === "WEBXPAY");
      assert.ok(webxpay);
      assert.strictEqual(webxpay.status, "SIGNATURE_MISMATCH_401");
    });

    it("defines provider and status segmented control options", () => {
      assert.strictEqual(PROVIDER_OPTIONS.length, 5);
      assert.deepStrictEqual(
        PROVIDER_OPTIONS.map((o) => o.id),
        ["ALL", "CHANNEX", "PAYHERE", "SMSGO", "WEBXPAY"],
      );

      assert.strictEqual(STATUS_FILTER_OPTIONS.length, 3);
      assert.deepStrictEqual(
        STATUS_FILTER_OPTIONS.map((o) => o.id),
        ["ALL", "SUCCESS", "FAILURE"],
      );
    });

    it("verifies exported types are constructible", () => {
      const provider: WebhookProvider = "CHANNEX";
      const status: WebhookDeliveryStatus = "DELIVERED_200";
      const eventType: WebhookPayloadType = "BOOKING_CREATED";
      assert.strictEqual(provider, "CHANNEX");
      assert.strictEqual(status, "DELIVERED_200");
      assert.strictEqual(eventType, "BOOKING_CREATED");
    });
  });

  describe("2. Pure Calculation Helpers", () => {
    it("computeDeliveryStats calculates aggregates for empty array", () => {
      const stats: WebhookSummaryStats = computeDeliveryStats([]);
      assert.strictEqual(stats.total, 0);
      assert.strictEqual(stats.successCount, 0);
      assert.strictEqual(stats.failureCount, 0);
      assert.strictEqual(stats.successRatePercent, 100);
      assert.strictEqual(stats.avgLatencyMs, 0);
    });

    it("computeDeliveryStats computes totals, rate, and average latency accurately", () => {
      const stats = computeDeliveryStats(DEFAULT_WEBHOOK_LOGS);
      assert.strictEqual(stats.total, 5);
      assert.strictEqual(stats.successCount, 3); // 200 OKs
      assert.strictEqual(stats.failureCount, 2); // 500, 401
      assert.strictEqual(stats.successRatePercent, 60); // 3/5 = 60%
      assert.ok(stats.avgLatencyMs > 0);
    });

    it("formatHttpStatusBadge maps status codes to semantic colors and labels", () => {
      const b200 = formatHttpStatusBadge(200);
      assert.strictEqual(b200.color, "green");
      assert.strictEqual(b200.label, "200 OK");

      const b401 = formatHttpStatusBadge(401);
      assert.strictEqual(b401.color, "amber");
      assert.strictEqual(b401.label, "401 Auth Fail");

      const b500 = formatHttpStatusBadge(500);
      assert.strictEqual(b500.color, "red");
      assert.strictEqual(b500.label, "500 Server Err");

      const b404 = formatHttpStatusBadge(404);
      assert.strictEqual(b404.color, "gray");
      assert.strictEqual(b404.label, "404");
    });

    it("generateCurlCommand formats executable CLI string", () => {
      const firstLog = DEFAULT_WEBHOOK_LOGS[0];
      assert.ok(firstLog);
      const cmd = generateCurlCommand(firstLog);
      assert.ok(cmd.startsWith("curl -X POST"));
      assert.ok(cmd.includes("https://api.srilankahms.com/webhooks/channex/tenant-galle-fort"));
      assert.ok(cmd.includes('-H "content-type: application/json"'));
      assert.ok(cmd.includes("-d"));
    });

    it("validateRetryEligibility checks eligibility based on delivery status", () => {
      const deliveredLog = DEFAULT_WEBHOOK_LOGS[0];
      assert.ok(deliveredLog);
      const res1 = validateRetryEligibility(deliveredLog);
      assert.strictEqual(res1.canRetry, false);
      assert.ok(res1.reason?.includes("already acknowledged"));

      const failedLog = DEFAULT_WEBHOOK_LOGS[3]; // CHANNEX 500
      assert.ok(failedLog);
      const res2 = validateRetryEligibility(failedLog);
      assert.strictEqual(res2.canRetry, true);

      const maxRetryLog = DEFAULT_WEBHOOK_LOGS[4]; // WEBXPAY 401, retryCount = 3, maxRetries = 3
      assert.ok(maxRetryLog);
      const res3 = validateRetryEligibility(maxRetryLog);
      assert.strictEqual(res3.canRetry, true);
      assert.ok(res3.reason?.includes("Max retries reached"));
    });

    it("filterWebhookLogs filters by provider, status, and search query", () => {
      // 1. By Provider
      const channexOnly = filterWebhookLogs(DEFAULT_WEBHOOK_LOGS, "CHANNEX", "ALL", "");
      assert.strictEqual(channexOnly.length, 2);

      // 2. By Status (SUCCESS)
      const successOnly = filterWebhookLogs(DEFAULT_WEBHOOK_LOGS, "ALL", "SUCCESS", "");
      assert.strictEqual(successOnly.length, 3);

      // 3. By Status (FAILURE)
      const failureOnly = filterWebhookLogs(DEFAULT_WEBHOOK_LOGS, "ALL", "FAILURE", "");
      assert.strictEqual(failureOnly.length, 2);

      // 4. By Search query
      const searchRes = filterWebhookLogs(DEFAULT_WEBHOOK_LOGS, "ALL", "ALL", "payhere_nt_33091");
      assert.strictEqual(searchRes.length, 1);
      const item = searchRes[0];
      assert.ok(item);
      assert.strictEqual(item.provider, "PAYHERE");
    });
  });

  describe("3. Static HTML Rendering", () => {
    it("renders WebhookLogDrawer with summary statistics and inspector", () => {
      const props: WebhookLogDrawerProps = {
        isOpen: true,
        onClose: () => undefined,
      };

      const html = renderToStaticMarkup(React.createElement(WebhookLogDrawer, props));
      assert.ok(html.includes("Webhook Delivery Log &amp; Retry Inspector"));
      assert.ok(html.includes("Total Received"));
      assert.ok(html.includes("Success Rate"));
      assert.ok(html.includes("Failures / Timeouts"));
      assert.ok(html.includes("Avg Latency"));
      assert.ok(html.includes("CHANNEX"));
      assert.ok(html.includes("PAYHERE"));
      assert.ok(html.includes("SMSGO"));
      assert.ok(html.includes("Copy cURL"));
      assert.ok(html.includes("Close Inspector"));
    });

    it("renders with custom single log and custom class name", () => {
      const singleLog: WebhookDeliveryLog = {
        id: "wh-log-custom-01",
        tenantId: "tenant-kandy-hills",
        provider: "NOTIFY_LK",
        eventType: "SMS_DELIVERED",
        externalEventId: "notif_evt_101",
        endpointUrl: "https://api.srilankahms.com/webhooks/notifylk",
        httpMethod: "POST",
        httpStatus: 200,
        status: "DELIVERED_200",
        requestHeaders: { "content-type": "application/json" },
        requestPayload: JSON.stringify({ sent: true }),
        responseBody: JSON.stringify({ ok: true }),
        executionDurationMs: 19,
        retryCount: 0,
        maxRetries: 3,
        createdAtIso: "2026-10-19T10:00:00Z",
        lastAttemptIso: "2026-10-19T10:00:01Z",
      };

      const props: WebhookLogDrawerProps = {
        isOpen: true,
        onClose: () => undefined,
        logs: [singleLog],
        className: "custom-webhook-drawer",
      };

      const html = renderToStaticMarkup(React.createElement(WebhookLogDrawer, props));
      assert.ok(html.includes("custom-webhook-drawer"));
      assert.ok(html.includes("NOTIFY_LK"));
      assert.ok(html.includes("notif_evt_101"));
    });
  });
});
