/**
 * Unit Tests for Staff Smartphone Self-Service Payslip & SC Viewer (`StaffMyPayslipView.test.ts`)
 *
 * Validates Step 440 (Phase 18.15):
 * 1. Pure Calculation Helpers (SC projections, attendance percentages, label resolutions)
 * 2. Mock Data Integrity (profile, live pool, historical archive)
 * 3. Static Markup & Apple HIG Component Rendering
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CURRENT_OCTOBER_SLIP,
  DEFAULT_ATTENDANCE_MTD,
  DEFAULT_LIVE_SC_SUMMARY,
  DEFAULT_STAFF_PROFILE,
  HISTORICAL_PAYSLIPS,
  STAFF_PAYSLIP_I18N,
  StaffMyPayslipView,
  calculateAttendancePercent,
  calculateStaffScProjection,
  resolveStaffHrLabel,
} from "../src/staff/hr/StaffMyPayslipView.js";

describe("Step 440: Staff Smartphone Self-Service Payslip & Service Charge Point Viewer (StaffMyPayslipView.tsx)", () => {
  describe("1. Pure Calculation Helpers", () => {
    it("calculates staff SC projection accurately for standard weighted points", () => {
      // 2,730,000 net pool across 2,398.50 hotel points = ~1,138.21 / point
      // Staff has 1.25 weight and 24 days worked = 30.0 points
      // 30.0 * 1138.21 = 34,146.30 -> ~34,146
      const result = calculateStaffScProjection(2730000, 2398.5, 1.25, 24);

      assert.equal(result.weightedPoints, 30.0);
      assert.equal(result.pointValueLkr, 1138.21);
      assert.equal(result.projectedShareLkr, 34146);
      assert.ok(result.avgPerDayLkr > 1400);
    });

    it("handles zero hotel points and zero days worked gracefully without division by zero", () => {
      const zeroResult = calculateStaffScProjection(500000, 0, 1.0, 0);
      assert.equal(zeroResult.weightedPoints, 0);
      assert.equal(zeroResult.projectedShareLkr, 0);
      assert.equal(zeroResult.avgPerDayLkr, 0);
    });

    it("calculates attendance rate percentage accurately", () => {
      assert.equal(calculateAttendancePercent(24, 26), 92);
      assert.equal(calculateAttendancePercent(26, 26), 100);
      assert.equal(calculateAttendancePercent(30, 26), 100); // capped at 100%
      assert.equal(calculateAttendancePercent(0, 26), 0);
      assert.equal(calculateAttendancePercent(10, 0), 100); // fallback for 0 total days
    });

    it("resolves English, Sinhala, and Bilingual labels correctly", () => {
      const en = resolveStaffHrLabel("headerTitle", "EN");
      assert.equal(en.primary, "My Payslips & Service Charge");
      assert.equal(en.secondary, undefined);

      const si = resolveStaffHrLabel("headerTitle", "SI");
      assert.equal(si.primary, "මගේ වැටුප් පත්රිකා සහ සේවා ගාස්තු");
      assert.equal(si.secondary, undefined);

      const bi = resolveStaffHrLabel("headerTitle", "BILINGUAL");
      assert.equal(bi.primary, "My Payslips & Service Charge");
      assert.equal(bi.secondary, "මගේ වැටුප් පත්රිකා සහ සේවා ගාස්තු");
    });

    it("verifies dictionary completeness for all keys", () => {
      const keys = Object.keys(STAFF_PAYSLIP_I18N) as (keyof typeof STAFF_PAYSLIP_I18N)[];
      assert.ok(keys.length >= 15);
      for (const key of keys) {
        assert.ok(STAFF_PAYSLIP_I18N[key].en.length > 0);
        assert.ok(STAFF_PAYSLIP_I18N[key].si.length > 0);
      }
    });
  });

  describe("2. Default Mock Profile & Historical Data Integrity", () => {
    it("verifies staff profile has complete bank and EPF details", () => {
      assert.equal(DEFAULT_STAFF_PROFILE.employeeId, "st-001");
      assert.equal(DEFAULT_STAFF_PROFILE.employeeName, "Kasun Jayasuriya");
      assert.equal(DEFAULT_STAFF_PROFILE.pointWeight, 1.25);
      assert.equal(DEFAULT_STAFF_PROFILE.epfNo, "48201");
      assert.equal(DEFAULT_STAFF_PROFILE.bankName, "Commercial Bank of Ceylon");
      assert.equal(DEFAULT_STAFF_PROFILE.bankAccountNo, "8001429810");
    });

    it("verifies live SC pool and attendance default values", () => {
      assert.equal(DEFAULT_LIVE_SC_SUMMARY.grossScLkr, 2850000);
      assert.equal(DEFAULT_LIVE_SC_SUMMARY.netScPoolLkr, 2730000);
      assert.equal(DEFAULT_ATTENDANCE_MTD.daysWorked, 24);
      assert.equal(DEFAULT_ATTENDANCE_MTD.totalWorkingDays, 26);
    });

    it("verifies historical archive contains at least 3 finalized months", () => {
      assert.ok(HISTORICAL_PAYSLIPS.length >= 3);
      const sep = HISTORICAL_PAYSLIPS[0];
      assert.ok(sep);
      assert.equal(sep.billingPeriod, "2026-09");
      assert.equal(sep.status, "PAID");
      assert.ok(sep.slip.netPayLkr > 100000);
    });
  });

  describe("3. React Component Rendering & Apple HIG Layout", () => {
    it("renders default staff self-service view with Live MTD metrics", () => {
      const html = renderToStaticMarkup(React.createElement(StaffMyPayslipView, {}));

      // Profile header & identity
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Senior Bartender"));
      assert.ok(html.includes("1.25x SC"));
      assert.ok(html.includes("EPF: 48201"));

      // Morale booster live SC pool
      assert.ok(html.includes("LIVE MTD POOL"));
      assert.ok(
        html.includes("The more the hotel earns, the higher your monthly service charge share!"),
      );
      assert.ok(html.includes("34,150.00")); // Kasun projected SC share

      // Current projected net pay
      assert.ok(html.includes("Projected Take-Home Pay"));
      assert.ok(html.includes("114,667.00")); // Kasun net pay
      assert.ok(html.includes("Commercial Bank of Ceylon"));

      // Attendance Summary
      assert.ok(html.includes("24 / 26"));
      assert.ok(html.includes("6.5h")); // Overtime hours
    });

    it("renders optional back button when onBack callback is supplied", () => {
      const htmlWithBack = renderToStaticMarkup(
        React.createElement(StaffMyPayslipView, {
          onBack: () => {
            /* no-op for tests */
          },
        }),
      );

      assert.ok(htmlWithBack.includes("Back to Staff Hub"));
    });

    it("verifies current slip calculation conforms to statutory baseline", () => {
      assert.equal(CURRENT_OCTOBER_SLIP.basicSalaryLkr, 75000);
      assert.equal(CURRENT_OCTOBER_SLIP.braLkr, 5000);
      assert.equal(CURRENT_OCTOBER_SLIP.epfEligibleBaseLkr, 80000);
      assert.equal(CURRENT_OCTOBER_SLIP.employeeEpf8Lkr, 6400);
      assert.equal(CURRENT_OCTOBER_SLIP.employerEpf12Lkr, 9600);
      assert.equal(CURRENT_OCTOBER_SLIP.employerEtf3Lkr, 2400);
      assert.equal(CURRENT_OCTOBER_SLIP.netPayLkr, 114667);
    });
  });
});
