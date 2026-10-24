/**
 * Unit Test Suite: Step 345 (Phase 14.20) — BanquetProfitCard.tsx
 *
 * Verifies the Banquet Profitability & Food Cost Margin Summary Card:
 * 1. Pure Revenue & Tax Deduction Calculation Engine (computeBanquetNetRevenue)
 * 2. Direct Operating Cost Aggregation (computeBanquetTotalDirectCosts)
 * 3. Profitability Metrics & Benchmarking (computeBanquetProfitMetrics, resolveMarginRating)
 * 4. Currency & Percentage Formatters (formatProfitLkr, formatProfitPct)
 * 5. React 19 Component Static Rendering & Apple HIG Verification (Bento, Waterfall, Table, Print)
 * 6. Trilingual Localization (English, Sinhala, Tamil)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetProfitCard,
  DEFAULT_BANQUET_EVENT_INFO,
  DEFAULT_COST_BREAKDOWN,
  DEFAULT_REVENUE_BREAKDOWN,
  computeBanquetNetRevenue,
  computeBanquetProfitMetrics,
  computeBanquetTotalDirectCosts,
  formatProfitLkr,
  formatProfitPct,
  resolveMarginRating,
} from "../src/admin/banquets/BanquetProfitCard.js";

describe("Step 345: BanquetProfitCard — Banquet Profitability & Cost Margin Engine", () => {
  describe("1. Pure Revenue & Tax Deduction Helper (computeBanquetNetRevenue)", () => {
    it("correctly subtracts 10% Service Charge and statutory taxes from gross total", () => {
      const gross = 2932500;
      const sc = 293250;
      const taxes = 410550;
      const net = computeBanquetNetRevenue(gross, sc, taxes);

      assert.strictEqual(net, 2228700);
    });

    it("clamps negative values to 0 without underflow", () => {
      const net = computeBanquetNetRevenue(500000, 300000, 300000);
      assert.strictEqual(net, 0);

      const netNegative = computeBanquetNetRevenue(-1000, 50, 50);
      assert.strictEqual(netNegative, 0);
    });
  });

  describe("2. Direct Operating Cost Aggregation (computeBanquetTotalDirectCosts)", () => {
    it("accurately sums all direct cost components", () => {
      const costs = {
        rawIngredientBomCostLkr: 600000,
        beverageAndChasersCostLkr: 40000,
        casualStewardsWagesLkr: 150000,
        kitchenCasualWagesLkr: 40000,
        electricityAndAcCostLkr: 100000,
        laundryAndLinenCostLkr: 40000,
        glasswareBreakageAllowanceLkr: 20000,
        sundryDirectCostsLkr: 20000,
      };

      const total = computeBanquetTotalDirectCosts(costs);
      assert.strictEqual(total, 1010000);
    });
  });

  describe("3. Margin Rating Resolution (resolveMarginRating)", () => {
    it("rates >= 55% margin with <= 30% food cost as EXCELLENT", () => {
      assert.strictEqual(resolveMarginRating(58.5, 28.0), "EXCELLENT");
      assert.strictEqual(resolveMarginRating(55.0, 30.0), "EXCELLENT");
    });

    it("rates 45-54.9% margin with <= 35% food cost as HEALTHY", () => {
      assert.strictEqual(resolveMarginRating(48.0, 32.5), "HEALTHY");
      assert.strictEqual(resolveMarginRating(52.0, 33.0), "HEALTHY");
    });

    it("rates 35-44.9% margin with <= 40% food cost as ACCEPTABLE", () => {
      assert.strictEqual(resolveMarginRating(40.0, 38.0), "ACCEPTABLE");
      assert.strictEqual(resolveMarginRating(36.0, 39.5), "ACCEPTABLE");
    });

    it("rates 25-34.9% margin or higher food cost as WARNING_LOW_MARGIN", () => {
      assert.strictEqual(resolveMarginRating(30.0, 42.0), "WARNING_LOW_MARGIN");
      assert.strictEqual(resolveMarginRating(50.0, 44.0), "WARNING_LOW_MARGIN");
    });

    it("rates < 25% margin or excessive food cost as CRITICAL_UNPROFITABLE", () => {
      assert.strictEqual(resolveMarginRating(18.0, 48.0), "CRITICAL_UNPROFITABLE");
      assert.strictEqual(resolveMarginRating(-5.0, 55.0), "CRITICAL_UNPROFITABLE");
    });
  });

  describe("4. Banquet Profit Metrics Computation (computeBanquetProfitMetrics)", () => {
    it("computes comprehensive profit metrics for standard 250-pax wedding", () => {
      const metrics = computeBanquetProfitMetrics(
        DEFAULT_REVENUE_BREAKDOWN,
        DEFAULT_COST_BREAKDOWN,
        250,
        52.0,
        32.0,
      );

      // Net revenue = 2,228,700, Total cost = 1,158,924
      assert.strictEqual(metrics.grossProfitLkr, 1069776);
      assert.ok(Math.abs(metrics.grossMarginPct - 47.999) < 0.05);
      assert.ok(Math.abs(metrics.foodCostPct - 31.0) < 0.1);
      assert.strictEqual(metrics.marginRating, "HEALTHY");
      assert.ok(metrics.netContributionPerPaxLkr > 4200);

      // Variances
      assert.ok(metrics.marginVariancePct < 0); // ~48% vs 52% target = ~-4.0%
      assert.ok(metrics.foodCostVariancePct < 0); // ~31% vs 32% target = ~-1.0% (good)
    });

    it("handles zero net revenue safely without throwing division by zero NaN", () => {
      const zeroRevenue = {
        ...DEFAULT_REVENUE_BREAKDOWN,
        grossTotalLkr: 0,
        serviceCharge10PctLkr: 0,
        statutoryTaxesLkr: 0,
        netBanquetRevenueLkr: 0,
      };

      const metrics = computeBanquetProfitMetrics(zeroRevenue, DEFAULT_COST_BREAKDOWN, 100, 50, 30);

      assert.strictEqual(metrics.grossMarginPct, 0);
      assert.strictEqual(metrics.foodCostPct, 0);
      assert.strictEqual(metrics.casualLaborCostPct, 0);
      assert.strictEqual(metrics.marginRating, "WARNING_LOW_MARGIN");
    });

    it("handles zero or negative pax count safely by defaulting to 1 pax", () => {
      const metrics = computeBanquetProfitMetrics(
        DEFAULT_REVENUE_BREAKDOWN,
        DEFAULT_COST_BREAKDOWN,
        0,
      );

      assert.strictEqual(metrics.netContributionPerPaxLkr, metrics.grossProfitLkr);
    });
  });

  describe("5. Currency & Percentage Formatters", () => {
    it("formats LKR values with standard thousands separators", () => {
      assert.strictEqual(formatProfitLkr(2228700), "LKR 2,228,700");
      assert.strictEqual(formatProfitLkr(0), "LKR 0");
      assert.strictEqual(formatProfitLkr(1234.56), "LKR 1,235");
    });

    it("formats percentage values with 1 decimal place", () => {
      assert.strictEqual(formatProfitPct(48.0), "48.0%");
      assert.strictEqual(formatProfitPct(31.234), "31.2%");
      assert.strictEqual(formatProfitPct(0), "0.0%");
    });
  });

  describe("6. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("renders banquet profit card with bento metrics and waterfall bar", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetProfitCard, {
          eventInfo: DEFAULT_BANQUET_EVENT_INFO,
          revenueBreakdown: DEFAULT_REVENUE_BREAKDOWN,
          costBreakdown: DEFAULT_COST_BREAKDOWN,
          language: "en",
        }),
      );

      // Apple HIG & Liquid glass container
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));

      // Event details
      assert.ok(
        html.includes("Dilan &amp; Rashmi Wedding Reception") ||
          html.includes("Dilan & Rashmi Wedding Reception"),
      );
      assert.ok(html.includes("Grand Lotus Ballroom"));
      assert.ok(html.includes("EVT-2026-0889"));

      // 4 Bento Metric Cards
      assert.ok(html.includes("Net Hotel Revenue"));
      assert.ok(html.includes("Total Direct Costs"));
      assert.ok(html.includes("Gross Margin"));
      assert.ok(html.includes("Profit / Guest"));

      // Printable A4 Section
      assert.ok(html.includes("print:block"));
      assert.ok(html.includes("Banquet Sales Manager"));
      assert.ok(html.includes("Executive Chef"));
      assert.ok(html.includes("Financial Controller"));
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const sinhalaHtml = renderToStaticMarkup(
        React.createElement(BanquetProfitCard, {
          language: "si",
        }),
      );
      assert.ok(sinhalaHtml.includes("භෝජන සංග්රහ ලාභදායීත්වය"));
      assert.ok(sinhalaHtml.includes("ශුද්ධ හෝටල් ආදායම"));
      assert.ok(sinhalaHtml.includes("මුළු සෘජු පිරිවැය"));

      const tamilHtml = renderToStaticMarkup(
        React.createElement(BanquetProfitCard, {
          language: "ta",
        }),
      );
      assert.ok(tamilHtml.includes("விருந்து லாபத்தன்மை"));
      assert.ok(tamilHtml.includes("நிகர ஹோட்டல் வருமானம்"));
      assert.ok(tamilHtml.includes("மொத்த நேரடி செலவுகள்"));
    });
  });
});
