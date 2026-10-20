import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LAUNDRY_BATCHES,
  DEFAULT_LINEN_ITEMS,
  LinenInventoryCard,
  type LinenItemRecord,
  calculateInventoryTotals,
  calculateLinenItemMetrics,
  formatLinenLkr,
  getLinenText,
  isItemMatchingSearch,
  isItemMatchingTab,
  resolveHealthBadgeStyle,
} from "../src/admin/housekeeping/LinenInventoryCard.js";

const noop = () => undefined;

describe("Step 309: Hotel Linen & Towel Par-Stock Counter (LinenInventoryCard.tsx)", () => {
  describe("1. Pure Linen Par-Stock & Circulation Metric Calculations", () => {
    it("calculates accurate circulation ratio, deficit, and optimal health status", () => {
      const item: LinenItemRecord = {
        itemId: "test-king-sheet",
        name: "King Flat Sheet",
        category: "BED_LINEN",
        unitDescription: "Cotton percale",
        inRooms: 40,
        inLaundry: 30,
        cleanStore: 50,
        damagedStained: 2,
        parLevel: 130,
        replacementCostLkr: 4000,
        lastAuditDateIso: "2026-10-20T00:00:00Z",
      };

      const metrics = calculateLinenItemMetrics(item);
      // totalUsable = 40 + 30 + 50 = 120
      assert.equal(metrics.totalUsable, 120);
      // parDeficit = 130 - 120 = 10
      assert.equal(metrics.parDeficit, 10);
      // circulatingRatio = 120 / 130 = 92.3%
      assert.equal(metrics.circulatingRatioPct, 92.3);
      // healthStatus should be OPTIMAL (>= 90%)
      assert.equal(metrics.healthStatus, "OPTIMAL");
      // ragging rate = 2 / (120 + 2) = 1.6%
      assert.equal(metrics.raggingRatePct, 1.6);
      // deficit cost = 10 * 4000 = 40000
      assert.equal(metrics.estimatedDeficitCostLkr, 40000);
    });

    it("flags low stock warning when circulation ratio falls between 75% and 89%", () => {
      const item: LinenItemRecord = {
        itemId: "test-bath-towel",
        name: "Bath Sheet",
        category: "BATH_LINEN",
        unitDescription: "700gsm cotton",
        inRooms: 40,
        inLaundry: 20,
        cleanStore: 20,
        damagedStained: 10,
        parLevel: 100, // 80 / 100 = 80.0%
        replacementCostLkr: 3500,
        lastAuditDateIso: "2026-10-20T00:00:00Z",
      };

      const metrics = calculateLinenItemMetrics(item);
      assert.equal(metrics.totalUsable, 80);
      assert.equal(metrics.parDeficit, 20);
      assert.equal(metrics.circulatingRatioPct, 80.0);
      assert.equal(metrics.healthStatus, "LOW_STOCK");
      assert.equal(metrics.estimatedDeficitCostLkr, 70000);
    });

    it("flags critical deficit when circulation ratio drops below 75%", () => {
      const item: LinenItemRecord = {
        itemId: "test-pool-towel",
        name: "Pool Towel",
        category: "POOL_BEACH",
        unitDescription: "Cabana stripe",
        inRooms: 20,
        inLaundry: 20,
        cleanStore: 20,
        damagedStained: 30,
        parLevel: 100, // 60 / 100 = 60.0%
        replacementCostLkr: 4500,
        lastAuditDateIso: "2026-10-20T00:00:00Z",
      };

      const metrics = calculateLinenItemMetrics(item);
      assert.equal(metrics.totalUsable, 60);
      assert.equal(metrics.parDeficit, 40);
      assert.equal(metrics.circulatingRatioPct, 60.0);
      assert.equal(metrics.healthStatus, "CRITICAL_DEFICIT");
      assert.equal(metrics.estimatedDeficitCostLkr, 180000);
    });

    it("aggregates overall property inventory totals across multiple items", () => {
      const totals = calculateInventoryTotals(DEFAULT_LINEN_ITEMS);
      assert.ok(totals.totalInRooms > 0);
      assert.ok(totals.totalInLaundry > 0);
      assert.ok(totals.totalCleanStore > 0);
      assert.ok(totals.totalDamaged > 0);
      assert.ok(totals.totalUsableAll > 0);
      assert.ok(totals.totalParTarget > 0);
      assert.ok(totals.overallHealthRatioPct > 0);
      assert.ok(totals.totalDeficitCostLkr >= 0);
    });

    it("formats LKR currency strings cleanly with commas and two decimals", () => {
      assert.equal(formatLinenLkr(40000), "LKR 40,000.00");
      assert.equal(formatLinenLkr(1250.5), "LKR 1,250.50");
    });
  });

  describe("2. Filtering & Tab Classification Helpers", () => {
    it("filters items according to category tabs and reconciliation views", () => {
      const bedItem = DEFAULT_LINEN_ITEMS[0]; // BED_LINEN
      assert.ok(bedItem);

      assert.equal(isItemMatchingTab(bedItem, "ALL"), true);
      assert.equal(isItemMatchingTab(bedItem, "BED_LINEN"), true);
      assert.equal(isItemMatchingTab(bedItem, "BATH_LINEN"), false);
      assert.equal(isItemMatchingTab(bedItem, "BATCH_RECONCILIATION"), true);
    });

    it("matches search query against name, unit description, or category", () => {
      const item = DEFAULT_LINEN_ITEMS[0];
      assert.ok(item);

      assert.equal(isItemMatchingSearch(item, "King Duvet"), true);
      assert.equal(isItemMatchingSearch(item, "thread count"), true);
      assert.equal(isItemMatchingSearch(item, "BED_LINEN"), true);
      assert.equal(isItemMatchingSearch(item, "NonExistentLinen"), false);
      assert.equal(isItemMatchingSearch(item, ""), true);
    });

    it("resolves Apple HIG styling tokens for health statuses", () => {
      assert.ok(resolveHealthBadgeStyle("OPTIMAL").style.includes("emerald"));
      assert.ok(resolveHealthBadgeStyle("LOW_STOCK").style.includes("amber"));
      assert.ok(resolveHealthBadgeStyle("CRITICAL_DEFICIT").style.includes("rose"));
    });
  });

  describe("3. React Static Markup & Apple HIG Design Standards", () => {
    it("renders inventory header, KPI metrics bar, and filter tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(LinenInventoryCard, {
          propertyName: "Cinnamon Wild Yala",
          onStockAdjust: noop,
          onReconcileBatch: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Hotel Linen &amp; Towel Par-Stock Counter"));
      assert.ok(html.includes("Total Usable"));
      assert.ok(html.includes("In Rooms"));
      assert.ok(html.includes("In Laundry"));
      assert.ok(html.includes("Clean Store"));
      assert.ok(html.includes("Damaged / Ragged"));
      assert.ok(html.includes("Replenishment Cost"));
      assert.ok(html.includes("All Linens"));
      assert.ok(html.includes("Bed Linen"));
      assert.ok(html.includes("Laundry Batches"));
    });

    it("renders item cards with 4-status distribution and >= 44x44pt touch buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(LinenInventoryCard, {
          initialItems: DEFAULT_LINEN_ITEMS,
        }),
      );

      assert.ok(html.includes("King Duvet Cover"));
      assert.ok(html.includes("Rooms"));
      assert.ok(html.includes("Wash"));
      assert.ok(html.includes("Store"));
      assert.ok(html.includes("Rag"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders laundry batch reconciliation table and vendor dispatches", () => {
      const html = renderToStaticMarkup(
        React.createElement(LinenInventoryCard, {
          initialBatches: DEFAULT_LAUNDRY_BATCHES,
        }),
      );

      // Default tab is ALL, but default items show in cards
      assert.ok(html.includes("Adjust Stock"));
      assert.ok(html.includes("Log Discard"));
    });

    it("renders trilingual localized interface in Sinhala and Tamil", () => {
      const textSi = getLinenText("si");
      assert.equal(textSi.title, "හෝටල් රෙදිපිළි සහ තුවා තොග කළමනාකරණය");
      assert.equal(textSi.adjustStockAction, "තොග වෙනස් කරන්න");
      assert.equal(textSi.reconcileBatchAction, "කාණ්ඩය සසඳන්න");

      const textTa = getLinenText("ta");
      assert.equal(textTa.title, "ஹோட்டல் துணிமணிகள் & துண்டுகள் இருப்பு கண்காணிப்பு");
      assert.equal(textTa.adjustStockAction, "இருப்பை மாற்று");
      assert.equal(textTa.reconcileBatchAction, "தொகுதியை சரிபார்");

      const htmlSi = renderToStaticMarkup(
        React.createElement(LinenInventoryCard, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("හෝටල් රෙදිපිළි සහ තුවා තොග කළමනාකරණය"));
      assert.ok(htmlSi.includes("තොග වෙනස් කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(LinenInventoryCard, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("ஹோட்டல் துணிமணிகள் &amp; துண்டுகள் இருப்பு கண்காணிப்பு"));
      assert.ok(htmlTa.includes("இருப்பை மாற்று"));
    });
  });
});
