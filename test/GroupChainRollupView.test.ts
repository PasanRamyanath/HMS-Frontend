import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_CHAIN_PROPERTIES,
  DEFAULT_USD_EXCHANGE_RATE,
  GroupChainRollupView,
  aggregateChainMetrics,
  calculateFoodCostPercent,
  calculateRevPar,
  calculateScPoolPerPoint,
  formatMoney,
  formatPercentNumber,
} from "../src/admin/superadmin/GroupChainRollupView.js";

describe("Step 454 (Phase 19.04): Group-Wide Consolidated Revenue, Occupancy & SC Pool Rollup View (GroupChainRollupView.tsx)", () => {
  describe("1. Pure Hospitality Formulas & Aggregations", () => {
    it("calculates RevPAR as product of occupancy rate and ADR", () => {
      const revpar1 = calculateRevPar(0.8833, 18500);
      assert.strictEqual(revpar1, 16341);

      const revpar2 = calculateRevPar(0.9333, 24000);
      assert.strictEqual(revpar2, 22399);

      const zeroRevpar = calculateRevPar(0, 25000);
      assert.strictEqual(zeroRevpar, 0);
    });

    it("calculates F&B food cost percentage from COGS and gross sales", () => {
      const rate1 = calculateFoodCostPercent(371200, 1280000);
      assert.strictEqual(rate1, 0.29);

      const rate2 = calculateFoodCostPercent(148800, 480000);
      assert.strictEqual(rate2, 0.31);

      assert.strictEqual(calculateFoodCostPercent(100, 0), 0);
    });

    it("calculates 10% service charge pool payout per staff point", () => {
      const payout1 = calculateScPoolPerPoint(324100, 85);
      assert.strictEqual(payout1, 3812.94);

      const payout2 = calculateScPoolPerPoint(148800, 36);
      assert.strictEqual(payout2, 4133.33);

      assert.strictEqual(calculateScPoolPerPoint(50000, 0), 0);
    });

    it("accurately aggregates chain totals across Colombo, Kandy, and Bentota", () => {
      const totals = aggregateChainMetrics(DEFAULT_CHAIN_PROPERTIES);

      // Total rooms = 120 + 45 + 60 = 225
      assert.strictEqual(totals.totalRooms, 225);
      // Total occupied = 106 + 42 + 46 = 194
      assert.strictEqual(totals.totalOccupiedRooms, 194);

      // Weighted occupancy rate = 194 / 225 = 0.8622...
      assert.ok(totals.weightedOccupancyRate > 0.86 && totals.weightedOccupancyRate < 0.87);

      // F&B total sales = 1280000 + 480000 + 940000 = 2700000
      assert.strictEqual(totals.totalFbSalesLkr, 2700000);

      // F&B total COGS = 371200 + 148800 + 300800 = 820800
      assert.strictEqual(totals.totalFbCogsLkr, 820800);

      // Weighted food cost % = 820800 / 2700000 = 0.304 (30.4%)
      assert.strictEqual(Number(totals.weightedFoodCostRate.toFixed(3)), 0.304);

      // Total SC pool = 324100 + 148800 + 225100 = 698000
      assert.strictEqual(totals.totalServiceChargePoolLkr, 698000);

      // Total staff eligible points = 85 + 36 + 52 = 173
      assert.strictEqual(totals.totalStaffEligiblePoints, 173);

      // Average payout per point = 698000 / 173 = 4034.68
      assert.strictEqual(totals.averageScPayoutPerPointLkr, 4034.68);
    });
  });

  describe("2. Formatting & Currency Conversion Utilities", () => {
    it("formats LKR currency amounts with comma separators", () => {
      const lkr = formatMoney(3241000, "LKR");
      assert.strictEqual(lkr, "LKR 3,241,000");
    });

    it("formats USD currency amounts with exchange rate conversion", () => {
      const usd = formatMoney(305000, "USD", DEFAULT_USD_EXCHANGE_RATE);
      assert.strictEqual(usd, "$1,000");
    });

    it("formats percentage numbers with one decimal digit", () => {
      assert.strictEqual(formatPercentNumber(0.8833), "88.3%");
      assert.strictEqual(formatPercentNumber(0.304), "30.4%");
      assert.strictEqual(formatPercentNumber(0.9333), "93.3%");
    });
  });

  describe("3. Static Component Markup & Apple HIG Liquid Glass Accessibility", () => {
    it("renders group header with title, property count, and room count", () => {
      const html = renderToStaticMarkup(React.createElement(GroupChainRollupView));

      assert.ok(html.includes("Ceylon Heritage Hospitality Group"));
      assert.ok(html.includes("3 Properties • 225 Rooms"));
      assert.ok(html.includes("Multi-Property Portfolio Rollup"));
    });

    it("renders top 4 portfolio KPI cards with tabular numerals", () => {
      const html = renderToStaticMarkup(React.createElement(GroupChainRollupView));

      assert.ok(html.includes("Consolidated Revenue"));
      assert.ok(html.includes("Weighted Occupancy"));
      assert.ok(html.includes("Portfolio RevPAR"));
      assert.ok(html.includes("Consolidated 10% SC"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders side-by-side comparative property matrix with Colombo, Kandy, and Bentota", () => {
      const html = renderToStaticMarkup(React.createElement(GroupChainRollupView));

      assert.ok(html.includes("Cinnamon Grand Horizon Colombo"));
      assert.ok(html.includes("Kandy Hills Sanctuary &amp; Tea Estate"));
      assert.ok(html.includes("Bentota Coral Palms Oceanfront Resort"));
      assert.ok(html.includes("Side-by-Side Property Comparison Matrix"));
    });

    it("renders 10% Service Charge Pool rollup section", () => {
      const html = renderToStaticMarkup(React.createElement(GroupChainRollupView));

      assert.ok(html.includes("10% Service Charge Pool Rollup"));
      assert.ok(html.includes("173 Total Points"));
      assert.ok(html.includes("Chain Average Payout per Point:"));
    });

    it("renders F&B sales and food cost % analysis benchmark card", () => {
      const html = renderToStaticMarkup(React.createElement(GroupChainRollupView));

      assert.ok(html.includes("F&amp;B Sales &amp; Food Cost % Analysis"));
      assert.ok(html.includes("Target ≤ 32%"));
      assert.ok(html.includes("Chain Portfolio Food Cost %:"));
    });

    it("renders custom group name and handles timeframe state", () => {
      const html = renderToStaticMarkup(
        React.createElement(GroupChainRollupView, {
          groupName: "Resplendent Ceylon Escapes",
          initialTimeframe: "THIS_MONTH",
        }),
      );

      assert.ok(html.includes("Resplendent Ceylon Escapes"));
    });
  });
});
