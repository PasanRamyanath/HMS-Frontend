/**
 * Unit Test Suite for Step 448: HrAndPayrollPage
 * (`test/HrAndPayrollPage.test.ts`)
 *
 * Implements Step 448 (Phase 18.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Assemble Unified HR, Roster, 10% Service Charge Pool & Payroll Admin Page (`HrAndPayrollPage.tsx`).
 *
 * Validates:
 * 1. Default executive metrics calculations and rendering in HrSummaryRibbon.
 * 2. Static React 19 SSR rendering of HrAndPayrollPage across all 8 tabbed views:
 *    - ROSTER: ShiftRosterGrid + SriLankaHolidaysCard
 *    - ATTENDANCE: AttendanceManagerView
 *    - SC_POOL: ServiceChargePoolView
 *    - PAYROLL: PayrollRunView
 *    - EPF_ETF: EpfEtfReturnView
 *    - GRATUITY: GratuityReportCard
 *    - LABOR_COST: LaborCostCard
 *    - BENEFITS: StaffBenefitsCard
 * 3. Minimum 44x44pt touch targets, Apple HIG `.apple-liquid-glass` styling, and `.tabular-nums-lkr` tabular figures.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HR_METRICS,
  HrAndPayrollPage,
  HrSummaryRibbon,
} from "../src/admin/hr/HrAndPayrollPage.js";

describe("Step 448: Assemble Unified HR, Roster, 10% Service Charge Pool & Payroll Admin Page (HrAndPayrollPage.tsx)", () => {
  describe("1. Default Executive HR Metrics & Ribbon", () => {
    it("renders all 8 executive KPI cards in HrSummaryRibbon", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrSummaryRibbon, {
          metrics: DEFAULT_HR_METRICS,
        }),
      );

      assert.ok(html.includes("Total Staff"));
      assert.ok(html.includes("68"));
      assert.ok(html.includes("Attendance Rate"));
      assert.ok(html.includes("10% SC Pool"));
      assert.ok(html.includes("Net Payroll"));
      assert.ok(html.includes("EPF/ETF Remit"));
      assert.ok(html.includes("True Labor %"));
      assert.ok(html.includes("Gratuity Accrual"));
      assert.ok(html.includes("Quarters Occupancy"));
    });
  });

  describe("2. Static React 19 SSR Rendering across Tabbed Workspaces", () => {
    it("renders HrAndPayrollPage with STAFF tab (StaffUserManager)", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "STAFF",
        }),
      );

      assert.ok(html.includes("Staff User, Role &amp; Service Charge Point Manager"));
      assert.ok(html.includes("Add Staff Member"));
    });

    it("renders HrAndPayrollPage with default ROSTER tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          hotelName: "Cinnamon Grand Colombo",
          initialTab: "ROSTER",
        }),
      );

      assert.ok(html.includes("HR, Roster, 10% Service Charge &amp; Payroll"));
      assert.ok(html.includes("Cinnamon Grand Colombo"));
      assert.ok(html.includes("Phase 18 Master ERP"));
      // Roster tab content
      assert.ok(html.includes("Department Shift Roster &amp; Weekly Duty Planner"));
      assert.ok(html.includes("Sri Lankan Statutory Holiday Calendar"));
    });

    it("renders HrAndPayrollPage with ATTENDANCE tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "ATTENDANCE",
        }),
      );

      assert.ok(html.includes("Staff Attendance &amp; Time Register"));
    });

    it("renders HrAndPayrollPage with SC_POOL tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "SC_POOL",
        }),
      );

      assert.ok(html.includes("Monthly 10% Service Charge Pool &amp; Breakage Worksheet"));
    });

    it("renders HrAndPayrollPage with PAYROLL tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "PAYROLL",
        }),
      );

      assert.ok(html.includes("Monthly Payroll Run &amp; Statutory Schedule"));
    });

    it("renders HrAndPayrollPage with EPF_ETF tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "EPF_ETF",
        }),
      );

      assert.ok(html.includes("Central Bank EPF"));
    });

    it("renders HrAndPayrollPage with GRATUITY tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "GRATUITY",
        }),
      );

      assert.ok(html.includes("Statutory Gratuity &amp; Staff Turnover Valuation"));
      assert.ok(html.includes("Act No. 12 of 1983"));
    });

    it("renders HrAndPayrollPage with LABOR_COST tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "LABOR_COST",
        }),
      );

      assert.ok(html.includes("Department Labor Cost % vs. Revenue Analytics"));
      assert.ok(html.includes("Rung 2 Verified"));
    });

    it("renders HrAndPayrollPage with BENEFITS tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          initialTab: "BENEFITS",
        }),
      );

      assert.ok(html.includes("Staff Duty Meals, Quarters &amp; Uniforms Configurator"));
    });
  });

  describe("3. Apple HIG & Tabular Number Compliance", () => {
    it("conforms to Apple HIG >= 44x44pt touch targets and tabular numbers", () => {
      const html = renderToStaticMarkup(
        React.createElement(HrAndPayrollPage, {
          hotelName: "Anantara Peace Haven Tangalle",
        }),
      );

      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("apple-liquid-glass"));
    });
  });
});
