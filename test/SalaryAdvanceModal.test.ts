/**
 * Unit Test Suite for Step 434: SalaryAdvanceModal
 * (`test/SalaryAdvanceModal.test.ts`)
 *
 * Implements Step 434 (Phase 18.09) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Staff Salary Advance, Loan & Festival Advance (Avurudu / Christmas) Tracker (`SalaryAdvanceModal.tsx`).
 *
 * Validates:
 * 1. Advance category definitions and default installment counts.
 * 2. Monthly installment calculation with exact Sri Lankan Rupee rounding.
 * 3. Portfolio summary aggregation (active balances, monthly deduction schedule).
 * 4. Staff-specific advance deduction calculation for payroll run.
 * 5. Filter predicate matching by type, status, and search query.
 * 6. React 19 SSR component rendering of modal dialog, bento metrics, and advance table.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ADVANCE_TYPE_DEFINITIONS,
  ADVANCE_TYPE_FILTER_OPTIONS,
  DEFAULT_SALARY_ADVANCES,
  SalaryAdvanceModal,
  calculateAdvanceSummary,
  calculateMonthlyInstallment,
  calculateStaffAdvanceDeduction,
  matchesAdvanceFilters,
} from "../src/admin/hr/SalaryAdvanceModal.js";

describe("Step 434: Staff Salary Advance & Festival Loan Tracker (SalaryAdvanceModal.tsx)", () => {
  describe("1. Advance Category Definitions & Term Defaults", () => {
    it("defines statutory and operational advance categories with HIG colors", () => {
      assert.equal(
        ADVANCE_TYPE_DEFINITIONS.FESTIVAL_ADVANCE.label,
        "Festival Loan (Avurudu / Xmas)",
      );
      assert.equal(ADVANCE_TYPE_DEFINITIONS.FESTIVAL_ADVANCE.defaultInstallments, 6);
      assert.equal(ADVANCE_TYPE_DEFINITIONS.FESTIVAL_ADVANCE.color, "green");

      assert.equal(ADVANCE_TYPE_DEFINITIONS.MID_MONTH_ADVANCE.label, "Mid-Month Advance");
      assert.equal(ADVANCE_TYPE_DEFINITIONS.MID_MONTH_ADVANCE.defaultInstallments, 1);
      assert.equal(ADVANCE_TYPE_DEFINITIONS.MID_MONTH_ADVANCE.color, "amber");

      assert.equal(ADVANCE_TYPE_DEFINITIONS.EMERGENCY_LOAN.defaultInstallments, 10);
      assert.equal(ADVANCE_TYPE_DEFINITIONS.EMERGENCY_LOAN.color, "blue");
    });

    it("provides segmented control options for advance filtering", () => {
      assert.ok(ADVANCE_TYPE_FILTER_OPTIONS.length >= 4);
      const ids = ADVANCE_TYPE_FILTER_OPTIONS.map((o) => o.id);
      assert.ok(ids.includes("ALL"));
      assert.ok(ids.includes("FESTIVAL_ADVANCE"));
      assert.ok(ids.includes("MID_MONTH_ADVANCE"));
    });
  });

  describe("2. Monthly Installment Math & Payroll Deductions", () => {
    it("computes monthly installments accurately with integer cent rounding", () => {
      // 60,000 LKR over 6 months = 10,000.00 LKR
      assert.equal(calculateMonthlyInstallment(60000, 6), 10000.0);

      // 50,000 LKR over 3 months = 16,666.67 LKR
      assert.equal(calculateMonthlyInstallment(50000, 3), 16666.67);

      // Edge cases: 0 or negative
      assert.equal(calculateMonthlyInstallment(0, 6), 0);
      assert.equal(calculateMonthlyInstallment(10000, 0), 0);
    });

    it("computes staff-specific upcoming payroll deduction correctly", () => {
      // Kasun Jayasuriya (st-001): 1 active festival loan with 10,000 remaining
      const kasunDeduction = calculateStaffAdvanceDeduction(DEFAULT_SALARY_ADVANCES, "st-001");
      assert.equal(kasunDeduction, 10000.0);

      // Malik Perera (st-004): 1 active mid-month advance of 20,000
      const malikDeduction = calculateStaffAdvanceDeduction(DEFAULT_SALARY_ADVANCES, "st-004");
      assert.equal(malikDeduction, 20000.0);

      // Chef Nuwan (st-003): Fully repaid loan, should be 0.0
      const nuwanDeduction = calculateStaffAdvanceDeduction(DEFAULT_SALARY_ADVANCES, "st-003");
      assert.equal(nuwanDeduction, 0.0);
    });

    it("aggregates total active portfolio and monthly deduction schedule", () => {
      const summary = calculateAdvanceSummary(DEFAULT_SALARY_ADVANCES);

      // Active records:
      // st-001: 10,000 balance, 10,000 installment
      // st-004: 20,000 balance, 20,000 installment
      // st-005: 30,000 balance, 5,000 installment
      // st-008: 4,500 balance, 4,500 installment
      // Total active balance: 10,000 + 20,000 + 30,000 + 4,500 = 64,500 LKR
      assert.equal(summary.totalActiveAdvancesLkr, 64500.0);

      // Total monthly deduction: 10,000 + 20,000 + 5,000 + 4,500 = 39,500 LKR
      assert.equal(summary.monthlyDeductionsTotalLkr, 39500.0);

      assert.equal(summary.festivalLoansCount, 1);
      assert.equal(summary.fullyRepaidCount, 1);
    });
  });

  describe("3. Filter Predicate Matching", () => {
    it("filters advances by category accurately", () => {
      const sample = DEFAULT_SALARY_ADVANCES[0];
      assert.ok(sample);

      assert.equal(matchesAdvanceFilters(sample, "FESTIVAL_ADVANCE", "ALL", ""), true);
      assert.equal(matchesAdvanceFilters(sample, "MID_MONTH_ADVANCE", "ALL", ""), false);
      assert.equal(matchesAdvanceFilters(sample, "ALL", "ALL", ""), true);
    });

    it("searches advances by staff name or EPF number", () => {
      const sample = DEFAULT_SALARY_ADVANCES[0];
      assert.ok(sample);

      assert.equal(matchesAdvanceFilters(sample, "ALL", "ALL", "Kasun"), true);
      assert.equal(matchesAdvanceFilters(sample, "ALL", "ALL", "EPF-1042"), true);
      assert.equal(matchesAdvanceFilters(sample, "ALL", "ALL", "UnknownStaff"), false);
    });
  });

  describe("4. React 19 SSR Component Rendering", () => {
    it("renders SalaryAdvanceModal open dialog without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(SalaryAdvanceModal, {
          isOpen: true,
          onClose: () => undefined,
          initialRecords: DEFAULT_SALARY_ADVANCES,
        }),
      );

      assert.ok(html.includes("Staff Salary Advance &amp; Festival Loan Register"));
      assert.ok(html.includes("Phase 18.09"));
      assert.ok(html.includes("Active Advance Portfolio"));
      assert.ok(html.includes("Current Month Deductions"));
      assert.ok(html.includes("Festival Loans Active"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Malik Perera"));
      assert.ok(html.includes("Issue Advance / Loan"));
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(SalaryAdvanceModal, {
          isOpen: false,
          onClose: () => undefined,
        }),
      );

      assert.equal(html, "");
    });
  });
});
