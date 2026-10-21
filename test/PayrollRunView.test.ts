/**
 * Unit Test Suite for Step 435: PayrollRunView
 * (`test/PayrollRunView.test.ts`)
 *
 * Implements Step 435 (Phase 18.10) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Monthly Payroll Run & EPF/ETF Schedule Generator (`PayrollRunView.tsx`).
 *
 * Validates:
 * 1. Overtime rate calculation per Sri Lanka Shop & Office Employees Act ((Basic + BRA) / 200 * 1.5).
 * 2. Progressive APIT income tax calculation across statutory slabs.
 * 3. Individual employee payslip computation (EPF 8%, SC share, OT, Advances, Net pay, Employer 12%+3%).
 * 4. Hotel-wide monthly payroll summary metrics and 1-click lock mechanism.
 * 5. Filter predicate matching by department, employee name, EPF, and NIC.
 * 6. React 19 SSR component rendering of master payroll schedule table and payslip modal.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PAYROLL_EMPLOYEES,
  PAYROLL_DEPT_FILTER_OPTIONS,
  PayrollRunView,
  calculateEmployeePayslip,
  calculateMonthlyApitTax,
  calculateOvertimeRate,
  calculatePayrollRunSummary,
  matchesPayrollFilters,
} from "../src/admin/hr/PayrollRunView.js";

describe("Step 435: Monthly Payroll Run & Statutory Schedule Generator (PayrollRunView.tsx)", () => {
  describe("1. Labor Law Overtime & APIT Calculations", () => {
    it("calculates statutory overtime hourly rate accurately using 200h divisor and 1.5x multiplier", () => {
      // Basic 75,000 + BRA 5,000 = 80,000. 80,000 / 200 = 400. 400 * 1.5 = 600.00 LKR/hr
      const rate1 = calculateOvertimeRate(75000, 5000);
      assert.equal(rate1, 600.0);

      // Basic 50,000 + BRA 5,000 = 55,000. 55,000 / 200 = 275. 275 * 1.5 = 412.50 LKR/hr
      const rate2 = calculateOvertimeRate(50000, 5000);
      assert.equal(rate2, 412.5);

      // Edge case: zero salary
      assert.equal(calculateOvertimeRate(0, 0), 0);
    });

    it("applies progressive APIT taxation with LKR 100,000 monthly tax-free relief", () => {
      // Below or equal to 100,000 -> 0 tax
      assert.equal(calculateMonthlyApitTax(95000), 0);
      assert.equal(calculateMonthlyApitTax(100000), 0);

      // 120,000 LKR -> 20,000 taxable at 6% = 1,200.00 LKR
      assert.equal(calculateMonthlyApitTax(120000), 1200.0);

      // Top bracket: 350,000 LKR
      const taxHigh = calculateMonthlyApitTax(350000);
      assert.ok(taxHigh > 30000);
    });
  });

  describe("2. Employee Payslip Calculation & Statutory Contributions", () => {
    it("computes complete payslip with EPF 8%, Employer 12%, ETF 3%, SC and Net Pay", () => {
      const sampleEmp = DEFAULT_PAYROLL_EMPLOYEES[0]; // Kasun Jayasuriya
      assert.ok(sampleEmp);

      const slip = calculateEmployeePayslip(sampleEmp);

      // Basic 75k + BRA 5k = 80k EPF base
      assert.equal(slip.epfEligibleBaseLkr, 80000.0);

      // Employee EPF 8% of 80,000 = 6,400.00 LKR
      assert.equal(slip.employeeEpf8Lkr, 6400.0);

      // Employer EPF 12% = 9,600.00 LKR
      assert.equal(slip.employerEpf12Lkr, 9600.0);

      // Employer ETF 3% = 2,400.00 LKR
      assert.equal(slip.employerEtf3Lkr, 2400.0);

      // Total statutory remittance = 6,400 + 9,600 + 2,400 = 18,400.00 LKR (23%)
      assert.equal(slip.totalStatutoryRemittanceLkr, 18400.0);

      // Overtime: 6.5h * 600 = 3,900.00 LKR
      assert.equal(slip.overtimeEarningsLkr, 3900.0);

      // Gross = EPF base (80k) + Fixed Allowances (15k) + OT (3.9k) + SC (34.15k) = 133,050.00 LKR
      assert.equal(slip.grossEarningsLkr, 133050.0);

      // Net Pay = Gross - Total Deductions
      assert.equal(slip.netPayLkr, slip.grossEarningsLkr - slip.totalDeductionsLkr);
      assert.ok(slip.netPayLkr > 0);
    });
  });

  describe("3. Hotel Payroll Summary & Filter Predicate", () => {
    it("aggregates monthly payroll financial summary correctly", () => {
      const slips = DEFAULT_PAYROLL_EMPLOYEES.map((e) => calculateEmployeePayslip(e));
      const summary = calculatePayrollRunSummary(slips, "2026-10", true, "2026-10-21T08:00:00Z");

      assert.equal(summary.billingPeriod, "2026-10");
      assert.equal(summary.totalStaffCount, DEFAULT_PAYROLL_EMPLOYEES.length);
      assert.ok(summary.totalGrossEarningsLkr > 500000);
      assert.ok(summary.totalNetDisbursementLkr > 400000);
      assert.ok(summary.totalCentralBankRemittanceLkr > 100000);
      assert.ok(summary.totalScDisbursedLkr > 200000);
      assert.equal(summary.isLocked, true);
    });

    it("filters payroll records by department and search keywords", () => {
      const emp = DEFAULT_PAYROLL_EMPLOYEES[0];
      assert.ok(emp);
      const sample = calculateEmployeePayslip(emp);

      assert.equal(matchesPayrollFilters(sample, "FRONT_DESK", ""), true);
      assert.equal(matchesPayrollFilters(sample, "KITCHEN", ""), false);
      assert.equal(matchesPayrollFilters(sample, "ALL", "Kasun"), true);
      assert.equal(matchesPayrollFilters(sample, "ALL", "EPF-1042"), true);
      assert.equal(matchesPayrollFilters(sample, "ALL", "198824501234"), true);
      assert.equal(matchesPayrollFilters(sample, "ALL", "NonExistent"), false);
    });
  });

  describe("4. React 19 SSR Component Rendering", () => {
    it("renders PayrollRunView table and bento summary metrics without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(PayrollRunView, {
          initialEmployees: DEFAULT_PAYROLL_EMPLOYEES,
          billingPeriod: "2026-10",
        }),
      );

      assert.ok(html.includes("Monthly Payroll Run &amp; Statutory Schedule"));
      assert.ok(html.includes("Phase 18.10"));
      assert.ok(html.includes("Gross Payroll Remuneration"));
      assert.ok(html.includes("Net Bank Disbursement"));
      assert.ok(html.includes("Central Bank EPF / ETF (23%)"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Chef Nuwan Gunasekara"));
      assert.ok(html.includes("View Payslip"));
    });

    it("renders department segmented filter controls", () => {
      assert.ok(PAYROLL_DEPT_FILTER_OPTIONS.length >= 5);

      const html = renderToStaticMarkup(React.createElement(PayrollRunView, {}));
      assert.ok(html.includes("All Depts"));
      assert.ok(html.includes("Front Desk"));
      assert.ok(html.includes("Kitchen"));
      assert.ok(html.includes("Housekeeping"));
    });
  });
});
