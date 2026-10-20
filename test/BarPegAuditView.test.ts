/**
 * Unit Test Suite for Step 387: BarPegAuditView & Sri Lankan Bar Peg Variance Reconciliation
 * (`test/BarPegAuditView.test.ts`)
 *
 * Validates:
 * 1. Theoretical sales volume mathematics:
 *    - 25ml single pegs, 50ml double pegs, full bottle sales, cocktail BOM ml
 * 2. Item-level peg reconciliation:
 *    - Balanced state within tolerance
 *    - Shortage detection (over-pouring, unbilled drinks) + financial shrinkage loss
 *    - Surplus detection (under-pouring, guest shortchanged)
 * 3. Daily shift audit aggregation & verdict determination:
 *    - CLEAN_AUDIT, MINOR_SPILLAGE_ACCEPTED, DISCREPANCY_FLAGGED, INVESTIGATION_REQUIRED
 * 4. Trilingual localizations (en, si, ta)
 * 5. React 19 component rendering via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BAR_AUDIT_TRANSLATIONS,
  BarPegAuditView,
  type ItemPegAuditEntry,
  type LiquorItemConfig,
  calculateBarDailyAuditSummary,
  calculateItemLiquorVariance,
  calculateTheoreticalSalesVolumeMl,
} from "../src/admin/inventory/BarPegAuditView.js";

const TEST_ARRACK_CONFIG: LiquorItemConfig = {
  stockItemId: "liq-arr-test",
  sku: "BAR-ARR-TEST",
  brandName: "Old Arrack 750ml",
  category: "ARRACK",
  bottleSizeMl: 750,
  costPerBottleLkr: 3000, // 4 LKR/ml
  singlePegPriceLkr: 400,
  doublePegPriceLkr: 750,
};

describe("Step 387: BarPegAuditView & Sri Lankan Bar Peg Reconciliation", () => {
  describe("1. Pure Mathematical Calculations", () => {
    it("converts 30x 25ml single pegs to 750ml theoretical volume", () => {
      const vol = calculateTheoreticalSalesVolumeMl(
        {
          singlePegsSold: 30,
          doublePegsSold: 0,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
        750,
      );
      assert.strictEqual(vol, 750);
    });

    it("converts 15x 50ml double pegs to 750ml theoretical volume", () => {
      const vol = calculateTheoreticalSalesVolumeMl(
        {
          singlePegsSold: 0,
          doublePegsSold: 15,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
        750,
      );
      assert.strictEqual(vol, 750);
    });

    it("aggregates mixed sales: single, double, full bottle, cocktail BOM and comp pegs", () => {
      const vol = calculateTheoreticalSalesVolumeMl(
        {
          singlePegsSold: 4, // 100ml
          doublePegsSold: 2, // 100ml
          fullBottlesSold: 1, // 750ml
          cocktailUsageMl: 150, // 150ml
          complimentaryPegs: 2, // 50ml
          approvedSpillageMl: 25, // 25ml
        },
        750,
      );
      assert.strictEqual(vol, 1175);
    });
  });

  describe("2. Item-Level Peg Reconciliation", () => {
    it("evaluates a perfectly balanced shift within spillage tolerance", () => {
      // Opening: 1 full bottle (750ml) + 250ml open = 1000ml
      // Issues: 0
      // Sales: 10 single pegs (250ml) -> Expected closing = 750ml
      // Physical closing: 1 full bottle (750ml) + 0ml open = 750ml
      const result = calculateItemLiquorVariance(
        TEST_ARRACK_CONFIG,
        {
          openingFullBottles: 1,
          openingOpenBottleMl: 250,
          issuesFullBottles: 0,
          issuesMl: 0,
          closingPhysicalBottles: 1,
          closingPhysicalOpenMl: 0,
        },
        {
          singlePegsSold: 10,
          doublePegsSold: 0,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
      );

      assert.strictEqual(result.openingTotalMl, 1000);
      assert.strictEqual(result.expectedClosingMl, 750);
      assert.strictEqual(result.physicalClosingMl, 750);
      assert.strictEqual(result.varianceMl, 0);
      assert.strictEqual(result.variancePegs, 0);
      assert.strictEqual(result.status, "BALANCED");
      assert.strictEqual(result.shrinkageCostLkr, 0);
      assert.strictEqual(result.lostRetailRevenueLkr, 0);
    });

    it("detects shortage / unbilled drinks (50ml shortage = -2 pegs)", () => {
      // Expected closing = 750ml, but physical dipstick shows 700ml (50ml missing)
      const result = calculateItemLiquorVariance(
        TEST_ARRACK_CONFIG,
        {
          openingFullBottles: 1,
          openingOpenBottleMl: 250,
          issuesFullBottles: 0,
          issuesMl: 0,
          closingPhysicalBottles: 0,
          closingPhysicalOpenMl: 700,
        },
        {
          singlePegsSold: 10, // 250ml sold
          doublePegsSold: 0,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
      );

      assert.strictEqual(result.varianceMl, -50);
      assert.strictEqual(result.variancePegs, -2);
      assert.strictEqual(result.status, "SHORTAGE_UNBILLED");
      // Cost per ml = 3000 / 750 = 4 LKR/ml. 50ml * 4 = 200 LKR
      assert.strictEqual(result.shrinkageCostLkr, 200);
      // Retail revenue lost = 2 pegs * 400 LKR = 800 LKR
      assert.strictEqual(result.lostRetailRevenueLkr, 800);
    });

    it("detects surplus / under-pouring (guest shortchanged)", () => {
      // Expected closing = 750ml, physical is 800ml (+50ml surplus = +2 pegs)
      const result = calculateItemLiquorVariance(
        TEST_ARRACK_CONFIG,
        {
          openingFullBottles: 1,
          openingOpenBottleMl: 250,
          issuesFullBottles: 0,
          issuesMl: 0,
          closingPhysicalBottles: 1,
          closingPhysicalOpenMl: 50,
        },
        {
          singlePegsSold: 10,
          doublePegsSold: 0,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
      );

      assert.strictEqual(result.varianceMl, 50);
      assert.strictEqual(result.variancePegs, 2);
      assert.strictEqual(result.status, "SURPLUS_UNDERPOURED");
      assert.strictEqual(result.shrinkageCostLkr, 0);
      assert.strictEqual(result.lostRetailRevenueLkr, 0);
    });
  });

  describe("3. Shift Summary & Audit Verdict", () => {
    it("determines CLEAN_AUDIT when all items are balanced", () => {
      const balancedEntries: ItemPegAuditEntry[] = [
        {
          config: TEST_ARRACK_CONFIG,
          stock: {
            openingFullBottles: 1,
            openingOpenBottleMl: 0,
            issuesFullBottles: 0,
            issuesMl: 0,
            closingPhysicalBottles: 1,
            closingPhysicalOpenMl: 0,
          },
          sales: {
            singlePegsSold: 0,
            doublePegsSold: 0,
            fullBottlesSold: 0,
            cocktailUsageMl: 0,
            complimentaryPegs: 0,
            approvedSpillageMl: 0,
          },
          result: {
            openingTotalMl: 750,
            issuesTotalMl: 0,
            theoreticalSalesMl: 0,
            expectedClosingMl: 750,
            physicalClosingMl: 750,
            varianceMl: 0,
            variancePegs: 0,
            status: "BALANCED",
            shrinkageCostLkr: 0,
            lostRetailRevenueLkr: 0,
          },
        },
      ];

      const summary = calculateBarDailyAuditSummary(balancedEntries);
      assert.strictEqual(summary.overallVerdict, "CLEAN_AUDIT");
      assert.strictEqual(summary.balancedCount, 1);
      assert.strictEqual(summary.totalShrinkageCostLkr, 0);
    });

    it("flags DISCREPANCY_FLAGGED or INVESTIGATION_REQUIRED on heavy shrinkage", () => {
      const severeEntry: ItemPegAuditEntry = {
        config: {
          ...TEST_ARRACK_CONFIG,
          costPerBottleLkr: 15000,
        },
        stock: {
          openingFullBottles: 2,
          openingOpenBottleMl: 0,
          issuesFullBottles: 0,
          issuesMl: 0,
          closingPhysicalBottles: 0,
          closingPhysicalOpenMl: 0,
        },
        sales: {
          singlePegsSold: 0,
          doublePegsSold: 0,
          fullBottlesSold: 0,
          cocktailUsageMl: 0,
          complimentaryPegs: 0,
          approvedSpillageMl: 0,
        },
        result: {
          openingTotalMl: 1500,
          issuesTotalMl: 0,
          theoreticalSalesMl: 0,
          expectedClosingMl: 1500,
          physicalClosingMl: 0,
          varianceMl: -1500,
          variancePegs: -60,
          status: "SHORTAGE_UNBILLED",
          shrinkageCostLkr: 30000, // Exceeds 10,000 threshold
          lostRetailRevenueLkr: 24000,
        },
      };

      const summary = calculateBarDailyAuditSummary([severeEntry]);
      assert.strictEqual(summary.overallVerdict, "INVESTIGATION_REQUIRED");
      assert.strictEqual(summary.totalShrinkageCostLkr, 30000);
      assert.strictEqual(summary.shortageCount, 1);
    });
  });

  describe("4. Trilingual Localization Coverage", () => {
    it("provides complete dictionary keys for English, Sinhala, and Tamil", () => {
      for (const lang of ["en", "si", "ta"] as const) {
        const dict = BAR_AUDIT_TRANSLATIONS[lang];
        assert.ok(dict.title.length > 0);
        assert.ok(dict.subtitle.length > 0);
        assert.ok(dict.tabs.dailyAuditSheet.length > 0);
        assert.ok(dict.tabs.varianceAnalytics.length > 0);
        assert.ok(dict.tabs.printVoucher.length > 0);
        assert.ok(dict.kpi.netVariance.length > 0);
        assert.ok(dict.kpi.cogsLoss.length > 0);
      }
    });
  });

  describe("5. React 19 Component Static Rendering", () => {
    it("renders BarPegAuditView without crashing", () => {
      const html = renderToStaticMarkup(React.createElement(BarPegAuditView, { language: "en" }));

      assert.ok(
        html.includes("Daily Bar Bottle &amp; Peg Reconciliation Sheet") ||
          html.includes("Daily Bar Bottle & Peg Reconciliation Sheet"),
      );
      assert.ok(html.includes('data-testid="bar-peg-audit-view"'));
      assert.ok(html.includes("Stock Keeping Units"));
      assert.ok(html.includes("Rockland Old Arrack"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(React.createElement(BarPegAuditView, { language: "si" }));

      assert.ok(html.includes("බාර් දෛනික මත්පැන් පෙග්"));
      assert.ok(html.includes("විගණන පත්‍රිකාව"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(React.createElement(BarPegAuditView, { language: "ta" }));

      assert.ok(html.includes("பார் தினசரி மதுபான பாட்டில்"));
      assert.ok(html.includes("தணிக்கை தாள்"));
    });
  });
});
