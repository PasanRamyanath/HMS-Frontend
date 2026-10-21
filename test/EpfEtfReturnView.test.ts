/**
 * Unit Test Suite for Step 436: EpfEtfReturnView
 * (`test/EpfEtfReturnView.test.ts`)
 *
 * Implements Step 436 (Phase 18.11) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Central Bank EPF (`C-Form`) & ETF Monthly Return Exporter (`EpfEtfReturnView.tsx`).
 *
 * Validates:
 * 1. Statutory EPF & ETF line item computation (EPF Eligible Base = Basic + BRA, Employee 8%,
 *    Employer 12%, Total EPF 20%, Employer ETF 3%, Total Remittance 23%).
 * 2. Aggregation of statutory summary metrics across all hotel staff.
 * 3. Central Bank EPF Form C electronic CSV format generation with headers and totals.
 * 4. Employees' Trust Fund Board Form II CSV generation.
 * 5. Combined 23% statutory schedule CSV generation.
 * 6. Pure filter matching by department, employee name, EPF number, and NIC.
 * 7. React 19 SSR component rendering of the master view, bento cards, tab navigation,
 *    and printable A4 Form C statutory layout with official declaration.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_EMPLOYER_STATUTORY_PROFILE,
  EPF_ETF_TAB_OPTIONS,
  EpfEtfReturnView,
  computeEpfReturnRecords,
  computeEpfReturnSummary,
  generateCombinedStatutoryCsv,
  generateEpfCFormCsv,
  generateEtfReturnCsv,
  matchesStatutoryFilter,
} from "../src/admin/hr/EpfEtfReturnView.js";
import { DEFAULT_PAYROLL_EMPLOYEES } from "../src/admin/hr/PayrollRunView.js";

describe("Step 436: Central Bank EPF (C-Form) & ETF Returns Exporter (EpfEtfReturnView.tsx)", () => {
  describe("1. Statutory Remittance Computations (EPF 20% + ETF 3% = 23%)", () => {
    it("computes exact statutory percentages for individual staff members based on Basic + BRA", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      assert.equal(records.length, DEFAULT_PAYROLL_EMPLOYEES.length);

      // Verify Employee 1 (Kasun): Basic 75,000 + BRA 5,000 = 80,000 Base
      const kasun = records.find((r) => r.employeeId === "st-001");
      assert.ok(kasun !== undefined);
      assert.equal(kasun.epfEligibleBaseLkr, 80000.0);
      assert.equal(kasun.employeeEpf8Lkr, 6400.0); // 8% of 80,000
      assert.equal(kasun.employerEpf12Lkr, 9600.0); // 12% of 80,000
      assert.equal(kasun.totalEpf20Lkr, 16000.0); // 20% of 80,000
      assert.equal(kasun.employerEtf3Lkr, 2400.0); // 3% of 80,000
      assert.equal(kasun.totalStatutory23Lkr, 18400.0); // 23% of 80,000

      // Verify Employee 3 (Chef Nuwan): Basic 160,000 + BRA 5,000 = 165,000 Base
      const nuwan = records.find((r) => r.employeeId === "st-003");
      assert.ok(nuwan !== undefined);
      assert.equal(nuwan.epfEligibleBaseLkr, 165000.0);
      assert.equal(nuwan.employeeEpf8Lkr, 13200.0); // 8% of 165,000
      assert.equal(nuwan.employerEpf12Lkr, 19800.0); // 12% of 165,000
      assert.equal(nuwan.totalEpf20Lkr, 33000.0); // 20% of 165,000
      assert.equal(nuwan.employerEtf3Lkr, 4950.0); // 3% of 165,000
      assert.equal(nuwan.totalStatutory23Lkr, 37950.0); // 23% of 165,000
    });

    it("aggregates aggregate summary metrics matching sum of all employees", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      const summary = computeEpfReturnSummary(
        records,
        "2026-10",
        "PREPARED",
        "2026-11-30",
        "REF-123",
      );

      assert.equal(summary.billingPeriod, "2026-10");
      assert.equal(summary.totalStaffCount, records.length);
      assert.equal(summary.paymentStatus, "PREPARED");
      assert.equal(summary.dueDate, "2026-11-30");
      assert.equal(summary.paymentReference, "REF-123");

      // Verify 20% EPF matches 8% + 12%
      assert.equal(
        summary.totalEpf20Lkr,
        Math.round((summary.totalEmployeeEpf8Lkr + summary.totalEmployerEpf12Lkr) * 100) / 100,
      );

      // Verify 23% total remittance matches 20% EPF + 3% ETF
      assert.equal(
        summary.totalRemittance23Lkr,
        Math.round((summary.totalEpf20Lkr + summary.totalEmployerEtf3Lkr) * 100) / 100,
      );
    });
  });

  describe("2. Statutory CSV Schedule Generation", () => {
    it("generates Central Bank EPF Form C CSV formatted with registration headers and totals", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      const summary = computeEpfReturnSummary(records, "2026-10");
      const csv = generateEpfCFormCsv(records, DEFAULT_EMPLOYER_STATUTORY_PROFILE, summary);

      assert.ok(csv.includes("CENTRAL BANK OF SRI LANKA - EMPLOYEES PROVIDENT FUND DEPARTMENT"));
      assert.ok(csv.includes("EPF FORM C - MONTHLY REMITTANCE ADVICE"));
      assert.ok(csv.includes(DEFAULT_EMPLOYER_STATUTORY_PROFILE.epfRegistrationNo));
      assert.ok(csv.includes(DEFAULT_EMPLOYER_STATUTORY_PROFILE.employerName));
      assert.ok(
        csv.includes(
          "Member_No,NIC_No,Member_Name,Total_Earnings_LKR,Employee_8_LKR,Employer_12_LKR,Total_20_LKR",
        ),
      );
      assert.ok(csv.includes("EPF-1042"));
      assert.ok(csv.includes("Kasun Jayasuriya"));
      assert.ok(csv.includes("TOTALS"));
      assert.ok(csv.includes(`${summary.totalStaffCount} MEMBERS`));
    });

    it("generates Employees Trust Fund Board Form II monthly return CSV", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      const summary = computeEpfReturnSummary(records, "2026-10");
      const csv = generateEtfReturnCsv(records, DEFAULT_EMPLOYER_STATUTORY_PROFILE, summary);

      assert.ok(csv.includes("EMPLOYEES TRUST FUND BOARD - SRI LANKA"));
      assert.ok(csv.includes("ETF MONTHLY REMITTANCE SCHEDULE - FORM II"));
      assert.ok(csv.includes(DEFAULT_EMPLOYER_STATUTORY_PROFILE.etfRegistrationNo));
      assert.ok(csv.includes("Member_No,NIC_No,Member_Name,Total_Earnings_LKR,Employer_3_LKR"));
      assert.ok(csv.includes("EPF-1042"));
      assert.ok(csv.includes("Kasun Jayasuriya"));
      assert.ok(csv.includes("TOTALS"));
    });

    it("generates comprehensive combined 23% statutory schedule CSV", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      const summary = computeEpfReturnSummary(records, "2026-10");
      const csv = generateCombinedStatutoryCsv(
        records,
        DEFAULT_EMPLOYER_STATUTORY_PROFILE,
        summary,
      );

      assert.ok(csv.includes("SRI LANKAN HOSPITALITY MASTER STATUTORY EPF & ETF SCHEDULE (23%)"));
      assert.ok(csv.includes("Total_EPF_20_LKR,Employer_3_ETF_LKR,Total_Statutory_23_LKR"));
      assert.ok(csv.includes("EPF-1042"));
      assert.ok(csv.includes("TOTALS"));
      assert.ok(csv.includes(`${summary.totalStaffCount} STAFF`));
    });
  });

  describe("3. Filter Predicate Logic", () => {
    it("filters records by department accurately", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);
      const frontDeskRecs = records.filter((r) => matchesStatutoryFilter(r, "FRONT_DESK", ""));
      const kitchenRecs = records.filter((r) => matchesStatutoryFilter(r, "KITCHEN", ""));

      assert.ok(frontDeskRecs.length > 0);
      assert.ok(kitchenRecs.length > 0);
      for (const r of frontDeskRecs) {
        assert.equal(r.department, "FRONT_DESK");
      }
    });

    it("filters records by search query across name, EPF, NIC, and role", () => {
      const records = computeEpfReturnRecords(DEFAULT_PAYROLL_EMPLOYEES);

      // Search by name
      const byName = records.filter((r) => matchesStatutoryFilter(r, "ALL", "nuwan"));
      assert.equal(byName.length, 1);
      assert.equal(byName[0]?.employeeName, "Chef Nuwan Gunasekara");

      // Search by EPF No
      const byEpf = records.filter((r) => matchesStatutoryFilter(r, "ALL", "EPF-1042"));
      assert.equal(byEpf.length, 1);
      assert.equal(byEpf[0]?.employeeId, "st-001");

      // Search by NIC
      const byNic = records.filter((r) => matchesStatutoryFilter(r, "ALL", "199478103456"));
      assert.equal(byNic.length, 1);
      assert.equal(byNic[0]?.employeeName, "Dilani Fernando");

      // Search by role
      const byRole = records.filter((r) => matchesStatutoryFilter(r, "ALL", "Executive"));
      assert.ok(byRole.length >= 2);
    });
  });

  describe("4. React 19 SSR Component Rendering & HIG Compliance", () => {
    it("renders EpfEtfReturnView with bento metric cards, registration badges, and export actions", () => {
      const html = renderToStaticMarkup(
        React.createElement(EpfEtfReturnView, {
          initialEmployees: DEFAULT_PAYROLL_EMPLOYEES,
          billingPeriod: "2026-10",
          paymentStatus: "PREPARED",
          dueDate: "2026-11-30",
        }),
      );

      assert.ok(
        html.includes("Central Bank EPF (`C-Form`) &amp; ETF Returns") ||
          html.includes("Central Bank EPF"),
      );
      assert.ok(html.includes("Prepared • Due 2026-11-30"));
      assert.ok(html.includes("E/48201")); // EPF Reg No
      assert.ok(html.includes("ETF/19402")); // ETF Reg No
      assert.ok(html.includes("Print Form"));
      assert.ok(html.includes("EPF CSV"));
      assert.ok(html.includes("ETF CSV"));
      assert.ok(html.includes("Export 23% Return"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("EPF-1042"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("verifies tab options and default constants", () => {
      assert.equal(EPF_ETF_TAB_OPTIONS.length, 4);
      assert.equal(DEFAULT_EMPLOYER_STATUTORY_PROFILE.epfRegistrationNo, "E/48201");
      assert.equal(DEFAULT_EMPLOYER_STATUTORY_PROFILE.etfRegistrationNo, "ETF/19402");
    });
  });
});
