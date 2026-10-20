/**
 * Unit Tests for Step 302: Live Guest QR Housekeeping Request Queue (HkAmenityQueue.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_AMENITY_REQUESTS,
  HkAmenityQueue,
  computeAmenitySummary,
  computeElapsedMinutes,
  evaluateAmenitySla,
  filterAmenityRequests,
} from "../src/staff/housekeeping/index.js";

describe("Step 302: Live Guest QR Housekeeping Request Queue (HkAmenityQueue.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Calculation & Filter Helpers", () => {
    it("computeElapsedMinutes calculates accurate elapsed time between ISO timestamps", () => {
      const start = "2026-10-20T12:00:00Z";
      const now = "2026-10-20T12:10:30Z";
      const elapsed = computeElapsedMinutes(start, now);
      assert.strictEqual(elapsed, 10.5);

      // Handles invalid inputs safely
      assert.strictEqual(computeElapsedMinutes("invalid-date", now), 0);
    });

    it("evaluateAmenitySla determines ON_TIME, APPROACHING_SLA, and OVERDUE", () => {
      // Target: 15 minutes
      assert.strictEqual(evaluateAmenitySla(5, 15), "ON_TIME");
      assert.strictEqual(evaluateAmenitySla(11, 15), "APPROACHING_SLA");
      assert.strictEqual(evaluateAmenitySla(15, 15), "OVERDUE");
      assert.strictEqual(evaluateAmenitySla(22, 15), "OVERDUE");
    });

    it("computeAmenitySummary aggregates request counts across statuses", () => {
      const summary = computeAmenitySummary(DEFAULT_AMENITY_REQUESTS);
      assert.strictEqual(summary.totalRequests, 4);
      assert.strictEqual(summary.pendingCount, 2);
      assert.strictEqual(summary.inTransitCount, 1);
      assert.strictEqual(summary.deliveredCount, 1);
      assert.ok(summary.overdueCount >= 0);
    });

    it("filterAmenityRequests filters by tab correctly", () => {
      const all = filterAmenityRequests(DEFAULT_AMENITY_REQUESTS, "ALL");
      assert.strictEqual(all.length, 4);

      const pending = filterAmenityRequests(DEFAULT_AMENITY_REQUESTS, "PENDING");
      assert.strictEqual(pending.length, 2);
      for (const r of pending) {
        assert.strictEqual(r.status, "PENDING");
      }

      const accepted = filterAmenityRequests(DEFAULT_AMENITY_REQUESTS, "ACCEPTED");
      assert.strictEqual(accepted.length, 1);
      assert.strictEqual(accepted[0]?.roomNumber, "204");

      const delivered = filterAmenityRequests(DEFAULT_AMENITY_REQUESTS, "DELIVERED");
      assert.strictEqual(delivered.length, 1);
      assert.strictEqual(delivered[0]?.roomNumber, "104");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Markup & HIG Accessibility
  // --------------------------------------------------------------------------
  describe("2. React Static Markup & Apple HIG Touch Ergonomics", () => {
    it("renders HkAmenityQueue with header, summary cards, and requests", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkAmenityQueue, {
          tenantId: "cinnamon-wild-yala",
          staffName: "Chaminda Rajapaksha",
          language: "en",
        }),
      );

      assert.ok(html.includes('data-testid="hk-amenity-queue-view"'));
      assert.ok(html.includes("Guest Amenity Queue"));
      assert.ok(html.includes("Chaminda Rajapaksha"));
      assert.ok(html.includes("cinnamon-wild-yala"));

      // Request cards rendered
      assert.ok(html.includes('data-testid="amenity-card-req-amenity-01"'));
      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Extra Large Bath Towels"));
      assert.ok(html.includes("Ceylon King Coconut Water"));
    });

    it("renders 1-tap action buttons with >= 44x44pt touch targets", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkAmenityQueue, {
          initialRequests: [
            {
              id: "req-test-p",
              tenantId: "t-1",
              roomNumber: "305",
              requestedAtIso: "2026-10-20T12:00:00Z",
              slaTargetMinutes: 15,
              status: "PENDING",
              priority: "NORMAL",
              items: [{ id: "i1", name: "Mosquito Coil", quantity: 1 }],
            },
          ],
        }),
      );

      // Pending card has Accept button
      assert.ok(html.includes('data-testid="action-accept-req-test-p"'));
      assert.ok(html.includes("Accept Request"));
      assert.ok(html.includes("min-h-[44px]"));
    });

    it("renders trilingual interface labels in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(HkAmenityQueue, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("අමුත්තන්ගේ සේවා පෝලිම"));
      assert.ok(htmlSi.includes("බලාපොරොත්තුවෙන්"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(HkAmenityQueue, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("விருந்தினர் சேவை வரிசை"));
      assert.ok(htmlTa.includes("நிலுவையில்"));
    });
  });
});
