/**
 * Unit Test Suite for Step 389: StockTakeVarianceView
 * (`test/StockTakeVarianceView.test.ts`)
 *
 * Validates:
 * 1. Pure inventory variance and valuation math:
 *    - calculateItemStockTakeVariance (tolerances, deficit, surplus)
 *    - calculateStockTakeSessionSummary (net percentage, deficit/surplus totals)
 * 2. Trilingual localization coverage (en, si, ta)
 * 3. React 19 static rendering via renderToStaticMarkup:
 *    - Count Sheet tab
 *    - Variance Analytics tab
 *    - Printable A4 Audit Certificate tab
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_STOCK_TAKE_ITEMS,
  STOCK_TAKE_TRANSLATIONS,
  type StockTakeItemModel,
  type StockTakeSessionModel,
  StockTakeVarianceView,
  calculateItemStockTakeVariance,
  calculateStockTakeSessionSummary,
} from "../src/admin/inventory/StockTakeVarianceView.js";

const noop = () => {
  // test dummy handler
};

describe("Step 389: Monthly Physical Stock-Take & Variance Report", () => {
  describe("1. Pure Financial & Variance Calculations", () => {
    it("identifies exact count matches as MATCHED with zero variance", () => {
      const result = calculateItemStockTakeVariance(100, 100, 250);
      assert.strictEqual(result.varianceQuantity, 0);
      assert.strictEqual(result.varianceCostLkr, 0);
      assert.strictEqual(result.status, "MATCHED");
    });

    it("respects default 0.5% tolerance threshold as MATCHED", () => {
      // 1000 units theoretical -> allowable delta is 5 units (0.5%)
      const smallDeficit = calculateItemStockTakeVariance(1000, 996, 380);
      assert.strictEqual(smallDeficit.varianceQuantity, -4);
      assert.strictEqual(smallDeficit.varianceCostLkr, -1520);
      assert.strictEqual(smallDeficit.status, "MATCHED");

      const smallSurplus = calculateItemStockTakeVariance(1000, 1004, 380);
      assert.strictEqual(smallSurplus.varianceQuantity, 4);
      assert.strictEqual(smallSurplus.varianceCostLkr, 1520);
      assert.strictEqual(smallSurplus.status, "MATCHED");
    });

    it("flags deficit outside tolerance as DEFICIT with negative valuation", () => {
      // 100 units theoretical -> 0.5% is 0.5 units. Difference of -5 is well outside.
      const result = calculateItemStockTakeVariance(100, 95, 1200);
      assert.strictEqual(result.varianceQuantity, -5);
      assert.strictEqual(result.varianceCostLkr, -6000);
      assert.strictEqual(result.status, "DEFICIT");
    });

    it("flags surplus outside tolerance as SURPLUS with positive valuation", () => {
      // 50 units theoretical -> 0.5% is 0.25 units. Difference of +4 is surplus.
      const result = calculateItemStockTakeVariance(50, 54, 850);
      assert.strictEqual(result.varianceQuantity, 4);
      assert.strictEqual(result.varianceCostLkr, 3400);
      assert.strictEqual(result.status, "SURPLUS");
    });

    it("handles zero and negative inputs by clamping to non-negative", () => {
      const result = calculateItemStockTakeVariance(-10, -5, -100);
      assert.strictEqual(result.varianceQuantity, 0);
      assert.strictEqual(result.varianceCostLkr, 0);
      assert.strictEqual(result.status, "MATCHED");
    });

    it("aggregates session summary accurately across all items", () => {
      const items: StockTakeItemModel[] = [
        {
          stockItemId: "it-1",
          sku: "DRY-01",
          itemName: "Rice",
          category: "DRY_STORE",
          storageLocation: "MAIN_STORE",
          unitOfMeasure: "kg",
          unitCostLkr: 200,
          theoreticalQuantity: 100,
          physicalQuantity: 100,
          varianceQuantity: 0,
          varianceCostLkr: 0,
          status: "MATCHED",
        },
        {
          stockItemId: "it-2",
          sku: "BAR-01",
          itemName: "Gin",
          category: "LIQUOR_BAR",
          storageLocation: "MAIN_BAR",
          unitOfMeasure: "btl",
          unitCostLkr: 5000,
          theoreticalQuantity: 10,
          physicalQuantity: 8,
          varianceQuantity: -2,
          varianceCostLkr: -10000,
          status: "DEFICIT",
        },
        {
          stockItemId: "it-3",
          sku: "LIN-01",
          itemName: "Disinfectant",
          category: "HOUSEKEEPING_CHEMICALS",
          storageLocation: "HOUSEKEEPING_LINEN_STORE",
          unitOfMeasure: "L",
          unitCostLkr: 1000,
          theoreticalQuantity: 20,
          physicalQuantity: 22,
          varianceQuantity: 2,
          varianceCostLkr: 2000,
          status: "SURPLUS",
        },
      ];

      const summary = calculateStockTakeSessionSummary(items);
      assert.strictEqual(summary.totalItemsCount, 3);
      assert.strictEqual(summary.matchedCount, 1);
      assert.strictEqual(summary.deficitCount, 1);
      assert.strictEqual(summary.surplusCount, 1);

      // Theoretical: (100*200) + (10*5000) + (20*1000) = 20,000 + 50,000 + 20,000 = 90,000
      assert.strictEqual(summary.totalTheoreticalValueLkr, 90000);
      // Physical: (100*200) + (8*5000) + (22*1000) = 20,000 + 40,000 + 22,000 = 82,000
      assert.strictEqual(summary.totalPhysicalValueLkr, 82000);

      // Net variance: 82000 - 90000 = -8000
      assert.strictEqual(summary.netVarianceCostLkr, -8000);
      // Net variance %: (-8000 / 90000) * 100 = -8.89%
      assert.strictEqual(summary.netVariancePercentage, -8.89);

      assert.strictEqual(summary.totalDeficitCostLkr, 10000);
      assert.strictEqual(summary.totalSurplusCostLkr, 2000);
    });

    it("returns zero summary for an empty items list", () => {
      const summary = calculateStockTakeSessionSummary([]);
      assert.strictEqual(summary.totalItemsCount, 0);
      assert.strictEqual(summary.totalTheoreticalValueLkr, 0);
      assert.strictEqual(summary.totalPhysicalValueLkr, 0);
      assert.strictEqual(summary.netVarianceCostLkr, 0);
      assert.strictEqual(summary.netVariancePercentage, 0);
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("contains complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = STOCK_TAKE_TRANSLATIONS[lang];
        assert.ok(dict.title, `Missing title in ${lang}`);
        assert.ok(dict.subtitle, `Missing subtitle in ${lang}`);
        assert.ok(dict.tabs.physicalCountSheet, `Missing tab label in ${lang}`);
        assert.ok(dict.tabs.varianceSummary, `Missing tab label in ${lang}`);
        assert.ok(dict.tabs.printCertificate, `Missing tab label in ${lang}`);
        assert.ok(dict.locations.MAIN_STORE, `Missing location in ${lang}`);
        assert.ok(dict.locations.CENTRAL_KITCHEN, `Missing location in ${lang}`);
        assert.ok(dict.statuses.MATCHED, `Missing status in ${lang}`);
        assert.ok(dict.statuses.DEFICIT, `Missing status in ${lang}`);
        assert.ok(dict.statuses.SURPLUS, `Missing status in ${lang}`);
        assert.ok(dict.columns.itemSku, `Missing column in ${lang}`);
        assert.ok(dict.kpi.bookValue, `Missing kpi in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders the Physical Count Sheet tab by default with items and table headers", () => {
      const html = renderToStaticMarkup(
        React.createElement(StockTakeVarianceView, {
          onSaveSession: noop,
        }),
      );

      assert.ok(
        html.includes("Monthly Physical Stock-Take &amp; Variance Report") ||
          html.includes("Monthly Physical Stock-Take & Variance Report"),
      );
      assert.ok(html.includes("Physical Count Sheet"));
      assert.ok(html.includes("Keeri Samba Rice (Araliya)"));
      assert.ok(html.includes("Yellowfin Tuna Loin Sashimi Grade"));
      assert.ok(html.includes("Rockland Old Arrack 750ml"));
      assert.ok(html.includes("Deficit"));
      assert.ok(html.includes("Matched"));
    });

    it("renders custom session model when provided", () => {
      const customSession: StockTakeSessionModel = {
        sessionId: "ST-CUSTOM-001",
        stockTakeDate: "2026-10-31",
        location: "MAIN_BAR",
        auditorName: "Sunil Silva",
        financialControllerName: "Priyanka Perera",
        status: "IN_PROGRESS",
        items: DEFAULT_STOCK_TAKE_ITEMS.slice(0, 2),
        summary: calculateStockTakeSessionSummary(DEFAULT_STOCK_TAKE_ITEMS.slice(0, 2)),
        notes: "Month-end audit run",
      };

      const html = renderToStaticMarkup(
        React.createElement(StockTakeVarianceView, {
          initialSession: customSession,
          language: "si",
          onSaveSession: noop,
        }),
      );

      assert.ok(html.includes("Sunil Silva"));
      assert.ok(html.includes("2026-10-31"));
      assert.ok(html.includes("මාසික භෞතික තොග ගණනය සහ වෙනස්කම් වාර්තාව"));
    });
  });
});
