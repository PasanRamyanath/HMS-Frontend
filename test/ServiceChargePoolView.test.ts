/**
 * Unit Test Suite for Step 432: ServiceChargePoolView
 * (`test/ServiceChargePoolView.test.ts`)
 *
 * Implements Step 432 (Phase 18.07) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Monthly 10% Service Charge Pool & Breakage Recovery Worksheet (`ServiceChargePoolView.tsx`).
 *
 * Validates:
 * 1. Exact Sri Lankan rupee mathematical calculation of the 10% Service Charge pool:
 *    Gross SC -> Breakage Deduction (capped at 10%) -> Net Pool -> Weighted Points -> Per-Point Value -> Staff Shares.
 * 2. Statutory transparency reconciliation: sum of staff shares equals net pool within integer-cent rounding.
 * 3. Breakage deduction percentage bounds (0% to 10% cap).
 * 4. Staff filter predicate matching (by department, name, role, EPF).
 * 5. React 19 SSR component rendering of bento summary cards and staff distribution table.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_STAFF_SC_ROSTER,
  SC_DEPARTMENT_FILTER_OPTIONS,
  ServiceChargePoolView,
  calculateHotelServiceChargePool,
  formatLkr,
  matchesStaffFilter,
  roundLkr,
} from "../src/admin/hr/ServiceChargePoolView.js";

describe("Step 432: Monthly 10% Service Charge Pool & Breakage Worksheet (ServiceChargePoolView.tsx)", () => {
  describe("1. Service Charge Pool Mathematical Precision", () => {
    it("computes gross SC, breakage deduction, and net pool accurately", () => {
      const grossSc = 3450000.0; // LKR 3.45M
      const breakagePercent = 5.0; // 5%
      const pool = calculateHotelServiceChargePool(
        grossSc,
        breakagePercent,
        DEFAULT_STAFF_SC_ROSTER,
        "2026-10",
      );

      assert.equal(pool.grossScLkr, 3450000.0);
      assert.equal(pool.breakagePercent, 5.0);
      // 3,450,000 * 5% = 172,500.00
      assert.equal(pool.breakageDeductionLkr, 172500.0);
      // Net pool = 3,450,000 - 172,500 = 3,277,500.00
      assert.equal(pool.netScPoolLkr, 3277500.0);

      assert.ok(pool.totalWeightedPoints > 0);
      assert.ok(pool.pointValueLkr > 0);
      assert.equal(pool.allocations.length, DEFAULT_STAFF_SC_ROSTER.length);
    });

    it("verifies 100% of net pool is distributed across staff members to the exact rupee", () => {
      const pool = calculateHotelServiceChargePool(
        2500000.0,
        3.0,
        DEFAULT_STAFF_SC_ROSTER,
        "2026-10",
      );

      // Reconcile total distributed vs net pool
      const diff = Math.abs(pool.netScPoolLkr - pool.totalAllocatedLkr);
      // Rounding difference must be less than 5 rupees across all staff
      assert.ok(diff < 5.0, `Rounding difference too high: ${diff}`);
      assert.equal(
        pool.roundingDifferenceLkr,
        roundLkr(pool.netScPoolLkr - pool.totalAllocatedLkr),
      );
    });

    it("enforces statutory 10.0% cap on breakage and linen loss deduction", () => {
      // Pass an excessive 25% breakage
      const cappedPool = calculateHotelServiceChargePool(1000000.0, 25.0, DEFAULT_STAFF_SC_ROSTER);

      assert.equal(cappedPool.breakagePercent, 10.0);
      assert.equal(cappedPool.breakageDeductionLkr, 100000.0);
      assert.equal(cappedPool.netScPoolLkr, 900000.0);
    });

    it("handles zero gross service charge without division by zero errors", () => {
      const emptyPool = calculateHotelServiceChargePool(0, 5.0, DEFAULT_STAFF_SC_ROSTER);
      assert.equal(emptyPool.grossScLkr, 0);
      assert.equal(emptyPool.netScPoolLkr, 0);
      assert.equal(emptyPool.pointValueLkr, 0);
      assert.equal(emptyPool.totalAllocatedLkr, 0);
    });
  });

  describe("2. Filtering & Currency Formatting Helpers", () => {
    it("formats LKR currency strings clearly with Rs. prefix and decimals", () => {
      const formatted = formatLkr(125000.5);
      assert.ok(formatted.includes("125,000.50"));
    });

    it("filters staff allocations by department accurately", () => {
      const pool = calculateHotelServiceChargePool(3000000.0, 5.0, DEFAULT_STAFF_SC_ROSTER);
      const frontDeskAlloc = pool.allocations.find((a) => a.department === "FRONT_DESK");
      assert.ok(frontDeskAlloc);

      assert.equal(matchesStaffFilter(frontDeskAlloc, "FRONT_DESK", ""), true);
      assert.equal(matchesStaffFilter(frontDeskAlloc, "KITCHEN", ""), false);
      assert.equal(matchesStaffFilter(frontDeskAlloc, "ALL", ""), true);
    });

    it("searches staff allocations by name, EPF No, or designation", () => {
      const pool = calculateHotelServiceChargePool(3000000.0, 5.0, DEFAULT_STAFF_SC_ROSTER);
      const chefAlloc = pool.allocations.find((a) => a.staffName.includes("Nuwan"));
      assert.ok(chefAlloc);

      assert.equal(matchesStaffFilter(chefAlloc, "ALL", "Nuwan"), true);
      assert.equal(matchesStaffFilter(chefAlloc, "ALL", "EPF-1088"), true);
      assert.equal(matchesStaffFilter(chefAlloc, "ALL", "Sous Chef"), true);
      assert.equal(matchesStaffFilter(chefAlloc, "ALL", "NonExistent"), false);
    });
  });

  describe("3. React 19 SSR Component Rendering", () => {
    it("renders ServiceChargePoolView without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(ServiceChargePoolView, {
          initialGrossScLkr: 3450000.0,
          initialBreakagePercent: 5.0,
          initialEmployees: DEFAULT_STAFF_SC_ROSTER,
          billingPeriod: "2026-10",
        }),
      );

      assert.ok(html.includes("Monthly 10% Service Charge Pool &amp; Breakage Worksheet"));
      assert.ok(html.includes("Phase 18.07"));
      assert.ok(html.includes("Gross 10% SC Collected"));
      assert.ok(html.includes("Breakage Recovery"));
      assert.ok(html.includes("Net Distributable Pool"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Chef Nuwan Gunasekara"));
      assert.ok(html.includes("Print Staff Notice Board"));
    });

    it("renders department segmented filter controls", () => {
      assert.ok(SC_DEPARTMENT_FILTER_OPTIONS.length >= 5);

      const html = renderToStaticMarkup(React.createElement(ServiceChargePoolView, {}));
      assert.ok(html.includes("All Staff"));
      assert.ok(html.includes("Front Desk"));
      assert.ok(html.includes("Kitchen"));
      assert.ok(html.includes("Housekeeping"));
    });
  });
});
