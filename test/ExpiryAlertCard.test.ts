/**
 * Unit Test Suite for Step 390: ExpiryAlertCard (Cold-Room FEFO & Expiry Alert)
 * (`test/ExpiryAlertCard.test.ts`)
 *
 * Validates:
 * 1. Pure FEFO & Urgency Math Helpers:
 *    - calculateHoursUntilExpiry
 *    - classifyExpiryUrgency
 *    - calculateFefoBatchUrgency
 *    - calculateFefoSummaryTotals
 *    - sortBatchesByFefo
 * 2. Trilingual Localization Coverage (en, si, ta)
 * 3. React 19 Component Static Rendering via renderToStaticMarkup:
 *    - Default Cold-Room Batches & KPI Cards
 *    - Urgent Warning Banner for <= 72h perishables
 *    - Trilingual localized renders
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  EXPIRY_ALERT_TRANSLATIONS,
  ExpiryAlertCard,
  type FefoBatchItem,
  calculateFefoBatchUrgency,
  calculateFefoSummaryTotals,
  calculateHoursUntilExpiry,
  classifyExpiryUrgency,
  sortBatchesByFefo,
} from "../src/admin/inventory/ExpiryAlertCard.js";

const noop = () => {
  // test dummy handler
};

describe("Step 390: Cold-Room FEFO & Expiry-Date Alert Hub", () => {
  describe("1. Pure Financial & FEFO Urgency Calculations", () => {
    it("calculates exact hours remaining until expiry relative to reference date", () => {
      const ref = "2026-10-20T12:00:00Z";
      const futureExpiry = "2026-10-21T12:00:00Z"; // 24 hours later
      const hours = calculateHoursUntilExpiry(futureExpiry, ref);
      assert.strictEqual(hours, 24);

      const pastExpiry = "2026-10-19T12:00:00Z"; // 24 hours in the past
      const pastHours = calculateHoursUntilExpiry(pastExpiry, ref);
      assert.strictEqual(pastHours, -24);

      const exactExpiry = "2026-10-20T12:00:00Z";
      const exactHours = calculateHoursUntilExpiry(exactExpiry, ref);
      assert.strictEqual(exactHours, 0);
    });

    it("classifies expiry hours into appropriate FEFO urgency tiers", () => {
      assert.strictEqual(classifyExpiryUrgency(-5), "EXPIRED");
      assert.strictEqual(classifyExpiryUrgency(0), "EXPIRED");
      assert.strictEqual(classifyExpiryUrgency(12), "CRITICAL_72H");
      assert.strictEqual(classifyExpiryUrgency(72), "CRITICAL_72H");
      assert.strictEqual(classifyExpiryUrgency(73), "EXPIRING_7D");
      assert.strictEqual(classifyExpiryUrgency(168), "EXPIRING_7D");
      assert.strictEqual(classifyExpiryUrgency(169), "SAFE");
      assert.strictEqual(classifyExpiryUrgency(720), "SAFE");
    });

    it("computes live valuation and urgency tier for a batch", () => {
      const ref = "2026-10-20T00:00:00Z";
      const batchInput = {
        batchId: "b-01",
        stockItemId: "it-01",
        sku: "FB-SEA-001",
        itemName: "Yellowfin Tuna",
        category: "COLD_ROOM_SEAFOOD" as const,
        storageLocation: "CHILLER_1",
        batchNumber: "LOT-01",
        receivedDate: "2026-10-18T00:00:00Z",
        expiryDate: "2026-10-22T00:00:00Z", // 48 hours away
        remainingQuantity: 10,
        unitOfMeasure: "kg" as const,
        unitCostLkr: 2500,
        supplierName: "Fishery",
      };

      const enriched = calculateFefoBatchUrgency(batchInput, ref);
      assert.strictEqual(enriched.hoursRemaining, 48);
      assert.strictEqual(enriched.urgency, "CRITICAL_72H");
      assert.strictEqual(enriched.totalValueLkr, 25000);
    });

    it("aggregates batch summaries into category counts and LKR valuations", () => {
      const sampleBatches: FefoBatchItem[] = [
        {
          batchId: "b-1",
          stockItemId: "it-1",
          sku: "SEA-01",
          itemName: "Tuna",
          category: "COLD_ROOM_SEAFOOD",
          storageLocation: "CHILLER",
          batchNumber: "B1",
          receivedDate: "2026-10-10",
          expiryDate: "2026-10-20",
          remainingQuantity: 5,
          unitOfMeasure: "kg",
          unitCostLkr: 2000,
          totalValueLkr: 10000,
          hoursRemaining: -2,
          urgency: "EXPIRED",
          supplierName: "Vendor A",
        },
        {
          batchId: "b-2",
          stockItemId: "it-2",
          sku: "DAI-01",
          itemName: "Curd",
          category: "DRY_STORE",
          storageLocation: "PANTRY",
          batchNumber: "B2",
          receivedDate: "2026-10-18",
          expiryDate: "2026-10-22",
          remainingQuantity: 10,
          unitOfMeasure: "pcs",
          unitCostLkr: 500,
          totalValueLkr: 5000,
          hoursRemaining: 36,
          urgency: "CRITICAL_72H",
          supplierName: "Vendor B",
        },
        {
          batchId: "b-3",
          stockItemId: "it-3",
          sku: "VEG-01",
          itemName: "Lettuce",
          category: "VEGETABLE_MARKET",
          storageLocation: "SALAD_BAR",
          batchNumber: "B3",
          receivedDate: "2026-10-19",
          expiryDate: "2026-10-25",
          remainingQuantity: 20,
          unitOfMeasure: "pcs",
          unitCostLkr: 150,
          totalValueLkr: 3000,
          hoursRemaining: 120,
          urgency: "EXPIRING_7D",
          supplierName: "Vendor C",
        },
        {
          batchId: "b-4",
          stockItemId: "it-4",
          sku: "BAR-01",
          itemName: "Wine",
          category: "LIQUOR_BAR",
          storageLocation: "CELLAR",
          batchNumber: "B4",
          receivedDate: "2026-10-01",
          expiryDate: "2027-01-01",
          remainingQuantity: 10,
          unitOfMeasure: "btl",
          unitCostLkr: 4000,
          totalValueLkr: 40000,
          hoursRemaining: 1800,
          urgency: "SAFE",
          supplierName: "Vendor D",
        },
      ];

      const summary = calculateFefoSummaryTotals(sampleBatches);
      assert.strictEqual(summary.totalBatchesCount, 4);
      assert.strictEqual(summary.expiredCount, 1);
      assert.strictEqual(summary.expiredValueLkr, 10000);
      assert.strictEqual(summary.critical72hCount, 1);
      assert.strictEqual(summary.critical72hValueLkr, 5000);
      assert.strictEqual(summary.expiring7dCount, 1);
      assert.strictEqual(summary.expiring7dValueLkr, 3000);
      assert.strictEqual(summary.safeCount, 1);
      // Total at risk: 10000 + 5000 + 3000 = 18000
      assert.strictEqual(summary.totalAtRiskValueLkr, 18000);
    });

    it("returns zero totals for empty batch array", () => {
      const summary = calculateFefoSummaryTotals([]);
      assert.strictEqual(summary.totalBatchesCount, 0);
      assert.strictEqual(summary.totalAtRiskValueLkr, 0);
      assert.strictEqual(summary.critical72hCount, 0);
    });

    it("sorts batches ascending by remaining hours (FEFO order)", () => {
      const b0: FefoBatchItem = {
        batchId: "b0",
        stockItemId: "it0",
        sku: "SKU0",
        itemName: "Item 0",
        category: "COLD_ROOM_SEAFOOD",
        storageLocation: "CHILLER",
        batchNumber: "LOT0",
        receivedDate: "2026-10-10",
        expiryDate: "2026-10-22",
        remainingQuantity: 10,
        unitOfMeasure: "kg",
        unitCostLkr: 1000,
        totalValueLkr: 10000,
        hoursRemaining: 50,
        urgency: "CRITICAL_72H",
        supplierName: "Supplier",
      };

      const b1: FefoBatchItem = { ...b0, batchId: "b1", hoursRemaining: -5, urgency: "EXPIRED" };
      const b2: FefoBatchItem = {
        ...b0,
        batchId: "b2",
        hoursRemaining: 20,
        urgency: "CRITICAL_72H",
      };

      const unsorted: FefoBatchItem[] = [b0, b1, b2];

      const sorted = sortBatchesByFefo(unsorted);
      assert.strictEqual(sorted[0]?.hoursRemaining, -5);
      assert.strictEqual(sorted[1]?.hoursRemaining, 20);
      assert.strictEqual(sorted[2]?.hoursRemaining, 50);
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = EXPIRY_ALERT_TRANSLATIONS[lang];
        assert.ok(dict.title, `Missing title in ${lang}`);
        assert.ok(dict.subtitle, `Missing subtitle in ${lang}`);
        assert.ok(dict.urgentBanner.alertTitle, `Missing urgent alert title in ${lang}`);
        assert.ok(dict.urgentBanner.actionButton, `Missing action button in ${lang}`);
        assert.ok(dict.kpi.totalAtRisk, `Missing KPI totalAtRisk in ${lang}`);
        assert.ok(dict.kpi.critical72h, `Missing KPI critical72h in ${lang}`);
        assert.ok(dict.urgencyBadge.CRITICAL_72H, `Missing CRITICAL_72H badge in ${lang}`);
        assert.ok(dict.filters.criticalOnly, `Missing filter in ${lang}`);
        assert.ok(dict.columns.batchSku, `Missing column in ${lang}`);
        assert.ok(dict.buttons.runChefSpecial, `Missing button in ${lang}`);
        assert.ok(dict.modal.title, `Missing modal title in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders default batches with cold-room items and warning banner", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExpiryAlertCard, {
          onRunChefSpecial: noop,
          onExpediteGinIssue: noop,
          onWriteOffSpoilage: noop,
        }),
      );

      assert.ok(html.includes("Cold-Room FEFO"));
      assert.ok(html.includes("Yellowfin Tuna Loin Sashimi Grade"));
      assert.ok(html.includes("Fresh Buffalo Curd Pots (Tissamaharama)"));
      assert.ok(html.includes("Jumbo Lagoon Mud Prawns"));
      assert.ok(html.includes("Critical Perishable Batches"));
      assert.ok(html.includes("Run Special"));
      assert.ok(html.includes("Issue to Kitchen"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExpiryAlertCard, {
          language: "si",
          onRunChefSpecial: noop,
        }),
      );

      assert.ok(html.includes("ශීතාගාර කල්ඉකුත්වීම් සහ FEFO අනතුරු ඇඟවීමේ මධ්‍යස්ථානය"));
      assert.ok(html.includes("අවදානම් මුළු වටිනාකම"));
      assert.ok(html.includes("විශේෂ කෑම වට්ටෝරුවක්"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExpiryAlertCard, {
          language: "ta",
          onRunChefSpecial: noop,
        }),
      );

      assert.ok(html.includes("குளிரூட்டப்பட்ட அறை FEFO"));
      assert.ok(html.includes("ஆபத்தில் உள்ள மதிப்பு"));
      assert.ok(html.includes("சிறப்பு உணவு"));
    });
  });
});
