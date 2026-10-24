/**
 * Unit Test Suite for Step 392: FnbFlashCostCard (Daily F&B Cost % Flash Report)
 * (`test/FnbFlashCostCard.test.ts`)
 *
 * Validates:
 * 1. Pure Sri Lankan F&B Cost Accounting & Cost Bridge Math:
 *    - calculateNetFoodCost
 *    - calculateNetBeverageCost
 *    - calculateCostPercentage (with zero-division guard)
 *    - classifyCostStatus
 *    - computeFnbCostBridge
 * 2. Trilingual Localization Coverage (en, si, ta)
 * 3. React 19 Component Static Rendering via renderToStaticMarkup:
 *    - Flash Overview Tab, KPI Cards & Outlet Table
 *    - Localized renders in Sinhala and Tamil
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_FNB_FLASH_REPORT,
  FNB_FLASH_TRANSLATIONS,
  FnbFlashCostCard,
  type FnbFlashReportModel,
  calculateCostPercentage,
  calculateNetBeverageCost,
  calculateNetFoodCost,
  classifyCostStatus,
  computeFnbCostBridge,
} from "../src/admin/inventory/FnbFlashCostCard.js";

describe("Step 392: Daily Food & Beverage Cost % Flash Report", () => {
  describe("1. Pure Financial & Cost Accounting Calculations", () => {
    it("calculates exact net food cost according to Sri Lankan hospitality standards", () => {
      // 300k GIN + 80k direct + 40k opening - 25k staff meals - 5k spoilage - 40k closing = 350,000 LKR
      const cost = calculateNetFoodCost({
        kitchenGinTransfersLkr: 300000,
        directMarketPurchasesLkr: 80000,
        openingWipLkr: 40000,
        staffDutyMealCreditsLkr: 25000,
        approvedKitchenSpoilageLkr: 5000,
        closingWipLkr: 40000,
      });

      assert.strictEqual(cost, 350000);
    });

    it("clamps negative net food cost to zero if credits exceed issues", () => {
      const cost = calculateNetFoodCost({
        kitchenGinTransfersLkr: 10000,
        directMarketPurchasesLkr: 5000,
        openingWipLkr: 2000,
        staffDutyMealCreditsLkr: 50000,
        approvedKitchenSpoilageLkr: 0,
        closingWipLkr: 0,
      });

      assert.strictEqual(cost, 0);
    });

    it("calculates exact net beverage cost deducting welcome drinks and breakage", () => {
      // 100k GIN + 20k direct + 50k opening - 10k welcome drinks - 2k breakage - 48k closing = 110,000 LKR
      const cost = calculateNetBeverageCost({
        barGinIssuesLkr: 100000,
        directBeveragePurchasesLkr: 20000,
        openingBarStockLkr: 50000,
        welcomeDrinkCreditsLkr: 10000,
        approvedBarBreakageLkr: 2000,
        closingBarStockLkr: 48000,
      });

      assert.strictEqual(cost, 110000);
    });

    it("computes cost percentage safely and handles zero sales without division-by-zero", () => {
      const normalPct = calculateCostPercentage(300000, 1000000);
      assert.strictEqual(normalPct, 30.0);

      const fractionalPct = calculateCostPercentage(333333, 1000000);
      assert.strictEqual(fractionalPct, 33.33);

      const zeroSalesPct = calculateCostPercentage(50000, 0);
      assert.strictEqual(zeroSalesPct, 0);
    });

    it("classifies performance status relative to target benchmarks", () => {
      // Target: 30%
      assert.strictEqual(classifyCostStatus(27.5, 30.0), "EXCELLENT"); // -2.5% diff
      assert.strictEqual(classifyCostStatus(30.5, 30.0), "ON_TARGET"); // +0.5% diff
      assert.strictEqual(classifyCostStatus(33.5, 30.0), "ATTENTION_REQUIRED"); // +3.5% diff
      assert.strictEqual(classifyCostStatus(36.5, 30.0), "CRITICAL_OVER_BUDGET"); // +6.5% diff
    });

    it("derives complete F&B cost bridge model from operational inputs", () => {
      const bridge = computeFnbCostBridge({
        kitchenGinTransfersLkr: 250000,
        directMarketPurchasesLkr: 50000,
        openingWipLkr: 20000,
        staffDutyMealCreditsLkr: 15000,
        approvedKitchenSpoilageLkr: 5000,
        closingWipLkr: 20000,

        barGinIssuesLkr: 80000,
        directBeveragePurchasesLkr: 15000,
        openingBarStockLkr: 30000,
        welcomeDrinkCreditsLkr: 5000,
        approvedBarBreakageLkr: 2000,
        closingBarStockLkr: 28000,

        foodNetSalesLkr: 1000000,
        beverageNetSalesLkr: 500000,

        foodTargetPercentage: 30.0,
        beverageTargetPercentage: 20.0,
      });

      // Net Food: 250k + 50k + 20k - 15k - 5k - 20k = 280,000 LKR
      assert.strictEqual(bridge.netFoodCostLkr, 280000);
      // Net Bev: 80k + 15k + 30k - 5k - 2k - 28k = 90,000 LKR
      assert.strictEqual(bridge.netBeverageCostLkr, 90000);

      // Total Net Sales: 1,000k + 500k = 1,500,000 LKR
      assert.strictEqual(bridge.totalNetSalesLkr, 1500000);
      // Total Cost: 280k + 90k = 370,000 LKR
      assert.strictEqual(bridge.totalCostOfSalesLkr, 370000);
      // Gross Profit: 1,500k - 370k = 1,130,000 LKR
      assert.strictEqual(bridge.grossProfitLkr, 1130000);

      // Food Cost %: (280k / 1,000k) * 100 = 28.0%
      assert.strictEqual(bridge.foodCostPercentage, 28.0);
      // Bev Cost %: (90k / 500k) * 100 = 18.0%
      assert.strictEqual(bridge.beverageCostPercentage, 18.0);
      // Overall Cost %: (370k / 1,500k) * 100 = 24.67%
      assert.strictEqual(bridge.overallCostPercentage, 24.67);

      assert.strictEqual(bridge.foodStatus, "EXCELLENT");
      assert.strictEqual(bridge.beverageStatus, "EXCELLENT");
      assert.strictEqual(bridge.overallStatus, "EXCELLENT");
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = FNB_FLASH_TRANSLATIONS[lang];
        assert.ok(dict.title, `Missing title in ${lang}`);
        assert.ok(dict.subtitle, `Missing subtitle in ${lang}`);
        assert.ok(dict.tabs.overview, `Missing tab overview in ${lang}`);
        assert.ok(dict.tabs.costBridge, `Missing tab costBridge in ${lang}`);
        assert.ok(dict.tabs.outlets, `Missing tab outlets in ${lang}`);
        assert.ok(dict.tabs.printReport, `Missing tab printReport in ${lang}`);
        assert.ok(dict.kpi.foodCostPct, `Missing KPI foodCostPct in ${lang}`);
        assert.ok(dict.kpi.bevCostPct, `Missing KPI bevCostPct in ${lang}`);
        assert.ok(dict.statuses.EXCELLENT, `Missing status EXCELLENT in ${lang}`);
        assert.ok(dict.bridgeLabels.kitchenGin, `Missing bridge label in ${lang}`);
        assert.ok(dict.outletsTable.outlet, `Missing outletsTable label in ${lang}`);
        assert.ok(dict.buttons.printA4, `Missing button in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders default report with KPIs, gauge cards, and notes", () => {
      const html = renderToStaticMarkup(React.createElement(FnbFlashCostCard, {}));

      assert.ok(
        html.includes("Daily Food &amp; Beverage Cost % Flash Report") ||
          html.includes("Daily Food & Beverage Cost % Flash Report"),
      );
      assert.ok(html.includes("Daily Food Cost %"));
      assert.ok(html.includes("Daily Beverage Cost %"));
      assert.ok(html.includes("Gamini Wijesinghe"));
      assert.ok(
        html.includes("Sri Lanka Luxury Coastal Resort &amp; Ayurvedic Spa") ||
          html.includes("Sri Lanka Luxury Coastal Resort & Ayurvedic Spa"),
      );
    });

    it("renders outlet comparison tab when initialTab is set to OUTLET_COMPARISON", () => {
      const html = renderToStaticMarkup(
        React.createElement(FnbFlashCostCard, {
          initialTab: "OUTLET_COMPARISON",
        }),
      );

      assert.ok(html.includes("The Ocean Breeze Main Restaurant"));
      assert.ok(
        html.includes("Coconut Palm Beach Bar &amp; Lounge") ||
          html.includes("Coconut Palm Beach Bar & Lounge"),
      );
      assert.ok(html.includes("In-Room Dining (24h Room Service)"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(FnbFlashCostCard, {
          language: "si",
        }),
      );

      assert.ok(html.includes("දිනපතා ආහාර සහ පාන පිරිවැය %"));
      assert.ok(html.includes("ආහාර පිරිවැය ප්රතිශතය %"));
      assert.ok(html.includes("සාරාංශ දැක්ම"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(FnbFlashCostCard, {
          language: "ta",
        }),
      );

      assert.ok(html.includes("தினசரி உணவு மற்றும் பான செலவு %"));
      assert.ok(html.includes("உணவு செலவு %"));
      assert.ok(html.includes("சுருக்கம்"));
    });

    it("renders custom report model when provided", () => {
      const customReport: FnbFlashReportModel = {
        ...DEFAULT_FNB_FLASH_REPORT,
        propertyName: "Galle Fort Boutique Villa",
        reportDate: "2026-10-31",
      };

      const html = renderToStaticMarkup(
        React.createElement(FnbFlashCostCard, {
          initialReport: customReport,
        }),
      );

      assert.ok(html.includes("Galle Fort Boutique Villa"));
      assert.ok(html.includes("2026-10-31"));
    });
  });
});
