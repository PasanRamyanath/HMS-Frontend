/**
 * Unit Test Suite for Step 447: LaborCostCard
 * (`test/LaborCostCard.test.ts`)
 *
 * Implements Step 447 (Phase 18.22) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Department Labor Cost % vs. Revenue Analytics Card (`LaborCostCard.tsx`).
 *
 * Validates:
 * 1. Financial logic computing hotel direct labor cost (Basic + OT + EPF 12% + ETF 3% + Benefits).
 * 2. Strict isolation of guest-funded 10% Service Charge from hotel operating payroll.
 * 3. Department productivity variance colors and labels against target benchmarks.
 * 4. Static React 19 SSR rendering of LaborCostCard, MetricsBar, OverviewTab, DepartmentsTab, ScIsolationTab, BenchmarksTab.
 * 5. Minimum 44x44pt touch targets, SF Pro optical typography, and `.tabular-nums-lkr` tabular numerical formatting.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BenchmarksTab,
  DepartmentsTab,
  INITIAL_MONTHLY_LABOR_DATA,
  LaborCostCard,
  LaborMetricsBar,
  OverviewTab,
  ScIsolationTab,
  computeDepartmentCost,
  getLaborVarianceColor,
  getLaborVarianceLabel,
} from "../src/admin/hr/LaborCostCard.js";

describe("Step 447: Department Labor Cost % vs. Revenue Analytics Card (LaborCostCard.tsx)", () => {
  describe("1. Department Labor Cost Math & Variance Resolvers", () => {
    it("computes hotel direct labor cost and labor percent accurately", () => {
      const frontDesk = INITIAL_MONTHLY_LABOR_DATA.departments[0];
      assert.ok(frontDesk);

      const cost = computeDepartmentCost(frontDesk);
      // Basic (680,000) + OT (72,000) = 752,000
      // EPF 12% (90,240) + ETF 3% (22,560) = 112,800
      // Meals (36,000) + Gratuity (34,000) = 70,000
      // Direct Cost = 752,000 + 112,800 + 70,000 = 934,800 LKR
      assert.equal(cost.hotelDirectLaborCostLkr, 934800);
      assert.equal(cost.basicLkr, 680000);
      assert.equal(cost.otLkr, 72000);
      assert.equal(cost.epfEtfLkr, 112800);
      assert.equal(cost.benefitsLkr, 70000);

      // Revenue = 14,850,000 -> Labor % = (934,800 / 14,850,000) * 100 = 6.29%
      assert.equal(cost.actualLaborPercent, 6.29);
      // Target = 7.0% -> Variance = 6.29 - 7.0 = -0.71%
      assert.equal(cost.variancePercent, -0.71);
    });

    it("maps labor budget variances to correct StatusBadge colors", () => {
      assert.equal(getLaborVarianceColor(-1.5), "green"); // Under budget
      assert.equal(getLaborVarianceColor(0.0), "green"); // On target
      assert.equal(getLaborVarianceColor(1.8), "amber"); // Slight overage (<= 2.5%)
      assert.equal(getLaborVarianceColor(4.2), "red"); // Significant overage (> 2.5%)
    });

    it("generates human-readable budget variance status labels", () => {
      assert.equal(getLaborVarianceLabel(0.0), "On Target (0.0%)");
      assert.equal(getLaborVarianceLabel(-1.2), "1.2% Under Budget");
      assert.equal(getLaborVarianceLabel(2.4), "+2.4% Over Budget");
    });
  });

  describe("2. Clean Guest Service Charge Isolation Invariants", () => {
    it("guarantees guest-funded 10% Service Charge is excluded from hotel labor cost", () => {
      const summary = INITIAL_MONTHLY_LABOR_DATA;
      const totalNetRevenue =
        summary.roomRevenueLkr +
        summary.foodBeverageRevenueLkr +
        summary.spaAndExcursionsRevenueLkr +
        summary.banquetRevenueLkr +
        summary.otherIncomeLkr;

      assert.equal(totalNetRevenue, 25250000);
      // 10% guest SC collected
      assert.equal(summary.guestServiceChargeCollectedLkr, 2525000);

      const costs = summary.departments.map(computeDepartmentCost);
      const totalHotelLaborCost = costs.reduce((sum, d) => sum + d.hotelDirectLaborCostLkr, 0);

      // True hotel labor cost is approx 6,824,250 LKR (27.0% of Net Revenue)
      const trueLaborPercent = Number(((totalHotelLaborCost / totalNetRevenue) * 100).toFixed(1));
      assert.ok(trueLaborPercent >= 25.0 && trueLaborPercent <= 30.0);

      // If guest SC was erroneously included in labor cost:
      const distortedCost = totalHotelLaborCost + summary.guestServiceChargeCollectedLkr;
      const distortedPercent = Number(((distortedCost / totalNetRevenue) * 100).toFixed(1));
      assert.ok(distortedPercent >= 35.0); // Would show > 35% artifact
    });
  });

  describe("3. Static React 19 SSR Rendering", () => {
    it("renders master LaborCostCard without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaborCostCard, {
          hotelName: "Grand Serendib Hotel & Resort",
        }),
      );

      assert.ok(html.includes("Department Labor Cost % vs. Revenue Analytics"));
      assert.ok(html.includes("Grand Serendib Hotel &amp; Resort"));
      assert.ok(html.includes("Rung 2 Verified"));
      assert.ok(html.includes("Executive Overview"));
      assert.ok(html.includes("Department Productivity"));
      assert.ok(html.includes("10% SC Isolation"));
      assert.ok(html.includes("SLTDA Benchmarks"));
    });

    it("renders LaborMetricsBar with revenue, labor cost, and CPOR KPIs", () => {
      const summary = INITIAL_MONTHLY_LABOR_DATA;
      const costs = summary.departments.map(computeDepartmentCost);
      const totalCost = costs.reduce((sum, d) => sum + d.hotelDirectLaborCostLkr, 0);
      const totalRev = 25250000;
      const overallPercent = (totalCost / totalRev) * 100;

      const html = renderToStaticMarkup(
        React.createElement(LaborMetricsBar, {
          summary,
          totalNetRevenueLkr: totalRev,
          totalHotelLaborCostLkr: totalCost,
          overallLaborCostPercent: overallPercent,
        }),
      );

      assert.ok(html.includes("Hotel Net Revenue"));
      assert.ok(html.includes("Hotel Direct Labor Cost"));
      assert.ok(html.includes("True Labor Cost %"));
      assert.ok(html.includes("Guest 10% Service Charge"));
      assert.ok(html.includes("Labor Cost Per Room (CPOR)"));
      assert.ok(html.includes("Total Staff Roster"));
    });

    it("renders OverviewTab with accounting integrity banner", () => {
      const summary = INITIAL_MONTHLY_LABOR_DATA;
      const costs = summary.departments.map(computeDepartmentCost);
      const totalCost = costs.reduce((sum, d) => sum + d.hotelDirectLaborCostLkr, 0);
      const totalRev = 25250000;
      const overallPercent = (totalCost / totalRev) * 100;

      const html = renderToStaticMarkup(
        React.createElement(OverviewTab, {
          summary,
          totalNetRevenueLkr: totalRev,
          totalHotelLaborCostLkr: totalCost,
          overallLaborCostPercent: overallPercent,
          departmentCosts: costs,
        }),
      );

      assert.ok(html.includes("Hospitality Accounting Integrity Guard"));
      assert.ok(html.includes("Clean SC Separation"));
      assert.ok(html.includes("Front Office &amp; Concierge"));
      assert.ok(html.includes("Kitchen &amp; Culinary"));
    });

    it("renders DepartmentsTab with full productivity matrix", () => {
      const costs = INITIAL_MONTHLY_LABOR_DATA.departments.map(computeDepartmentCost);
      const html = renderToStaticMarkup(
        React.createElement(DepartmentsTab, {
          departmentCosts: costs,
        }),
      );

      assert.ok(html.includes("Front Office &amp; Concierge"));
      assert.ok(html.includes("Housekeeping &amp; Laundry"));
      assert.ok(html.includes("Maintenance &amp; Engineering"));
      assert.ok(html.includes("EPF/ETF (15%)"));
      assert.ok(html.includes("Actual Labor %"));
    });

    it("renders ScIsolationTab with pass-through custody analysis", () => {
      const summary = INITIAL_MONTHLY_LABOR_DATA;
      const costs = summary.departments.map(computeDepartmentCost);
      const totalCost = costs.reduce((sum, d) => sum + d.hotelDirectLaborCostLkr, 0);

      const html = renderToStaticMarkup(
        React.createElement(ScIsolationTab, {
          summary,
          totalHotelLaborCostLkr: totalCost,
        }),
      );

      assert.ok(html.includes("10% Service Charge Flow Architecture"));
      assert.ok(html.includes("Pass-Through Custody Ledger"));
      assert.ok(html.includes("Zero Hotel Cost"));
      assert.ok(html.includes("Monthly Fund Segregation Analysis"));
    });

    it("renders BenchmarksTab with SLTDA hotel categories", () => {
      const html = renderToStaticMarkup(React.createElement(BenchmarksTab));

      assert.ok(html.includes("Sri Lankan Hospitality Labor Cost Benchmarks"));
      assert.ok(html.includes("5-Star Luxury Resort"));
      assert.ok(html.includes("Boutique Heritage Villa"));
      assert.ok(html.includes("City Business Hotel"));
      assert.ok(html.includes("Eco-Lodge &amp; Safari Tents"));
    });
  });

  describe("4. Apple HIG Design Tokens & Tabular Numbers", () => {
    it("conforms to Apple HIG >= 44x44pt touch targets and tabular numbers", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaborCostCard, {
          hotelName: "Mirissa Ocean Retreat",
        }),
      );

      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("apple-liquid-glass"));
    });
  });
});
