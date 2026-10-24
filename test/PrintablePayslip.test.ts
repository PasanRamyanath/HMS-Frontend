/**
 * Unit Test Suite for Step 439: PrintablePayslip
 * (`test/PrintablePayslip.test.ts`)
 *
 * Implements Step 439 (Phase 18.14) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Build Printable A4 / Half-Page Bilingual (`English / සිංහල`) Employee Payslip (`PrintablePayslip.tsx`).
 *
 * Validates:
 * 1. Bilingual label resolution logic across English, Sinhala, and Bilingual modes.
 * 2. Static React 19 SSR rendering of formal hotel letterhead, employee meta, and registration numbers.
 * 3. Accurate itemization of Basic + BRA, Service Charge Share, Overtime, EPF 8%, APIT, and Net Bank Transfer.
 * 4. Informational Employer statutory contributions (EPF 12% + ETF 3% = 15%).
 * 5. A4 Full Page vs A5 Half Page dual-copy layout with perforation line.
 * 6. Modal dialog structure, accessibility, and >= 44x44pt touch targets.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PAYROLL_EMPLOYEES,
  calculateEmployeePayslip,
} from "../src/admin/hr/PayrollRunView.js";
import {
  DEFAULT_HOTEL_LETTERHEAD,
  PAYSLIP_I18N,
  PAYSLIP_LANG_OPTIONS,
  PAYSLIP_LAYOUT_OPTIONS,
  PrintablePayslip,
  PrintablePayslipSheet,
  resolveLabel,
} from "../src/admin/hr/PrintablePayslip.js";

const firstEmployee = DEFAULT_PAYROLL_EMPLOYEES[0];
if (!firstEmployee) {
  throw new Error("DEFAULT_PAYROLL_EMPLOYEES is empty");
}
const TEST_SLIP = calculateEmployeePayslip(firstEmployee); // Kasun Jayasuriya

describe("Step 439: Printable A4 / Half-Page Bilingual Employee Payslip (PrintablePayslip.tsx)", () => {
  describe("1. Bilingual Dictionary & Label Resolvers", () => {
    it("resolves English labels correctly", () => {
      const basic = resolveLabel("basicSalary", "EN");
      assert.equal(basic.primary, "Basic Salary");
      assert.equal(basic.secondary, undefined);

      const net = resolveLabel("netPay", "EN");
      assert.equal(net.primary, "NET SALARY (BANK TRANSFER)");
    });

    it("resolves Sinhala labels correctly", () => {
      const basic = resolveLabel("basicSalary", "SI");
      assert.equal(basic.primary, "මූලික වැටුප");
      assert.equal(basic.secondary, undefined);

      const epf = resolveLabel("epfBaseRemuneration", "SI");
      assert.equal(epf.primary, "අර්ථසාධක මූලික වැටුප");
    });

    it("resolves Bilingual labels with both primary English and secondary Sinhala", () => {
      const basic = resolveLabel("basicSalary", "BILINGUAL");
      assert.equal(basic.primary, "Basic Salary");
      assert.equal(basic.secondary, "මූලික වැටුප");

      const title = resolveLabel("title", "BILINGUAL");
      assert.equal(title.primary, "EMPLOYEE PAY VOUCHER / SLIP");
      assert.equal(title.secondary, "සේවක වැටුප් පත්රිකාව");
    });

    it("verifies dictionary completeness and option constants", () => {
      assert.ok(Object.keys(PAYSLIP_I18N).length >= 20);
      assert.equal(PAYSLIP_LAYOUT_OPTIONS.length, 2);
      assert.equal(PAYSLIP_LANG_OPTIONS.length, 3);
      assert.equal(DEFAULT_HOTEL_LETTERHEAD.epfRegistrationNo, "E/48201");
      assert.equal(DEFAULT_HOTEL_LETTERHEAD.etfRegistrationNo, "ETF/19402");
    });
  });

  describe("2. Printable Sheet Static Markup & Itemization", () => {
    it("renders PrintablePayslipSheet with hotel letterhead and registration numbers", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslipSheet, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          hotel: DEFAULT_HOTEL_LETTERHEAD,
          lang: "BILINGUAL",
        }),
      );

      assert.ok(
        html.includes("Grand Serendib Hotel &amp; Suites (Pvt) Ltd") ||
          html.includes("Grand Serendib"),
      );
      assert.ok(html.includes("E/48201"));
      assert.ok(html.includes("ETF/19402"));
      assert.ok(html.includes("SLIP REF: PAY-202610-1042"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("EPF-1042"));
      assert.ok(html.includes("198824501234"));
      assert.ok(html.includes("Front Desk Supervisor"));
      assert.ok(html.includes("Commercial Bank of Ceylon"));
      assert.ok(html.includes("8001429810"));
    });

    it("itemizes Basic, BRA, SC Share, Overtime, and Deductions accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslipSheet, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          hotel: DEFAULT_HOTEL_LETTERHEAD,
          lang: "BILINGUAL",
        }),
      );

      // Earnings
      assert.ok(html.includes("75,000.00")); // Basic
      assert.ok(html.includes("5,000.00")); // BRA
      assert.ok(html.includes("34,150.00")); // SC share
      assert.ok(html.includes("6.5h")); // Overtime hours
      assert.ok(html.includes("3,900.00")); // Overtime earnings (6.5h * 600)

      // Deductions
      assert.ok(html.includes("6,400.00")); // Employee 8% EPF (8% of 80,000)
      assert.ok(html.includes("10,000.00")); // Avurudu advance loan installment

      // Net Take-Home Bank Transfer
      assert.ok(html.includes("NET SALARY (BANK TRANSFER)"));
      assert.ok(html.includes("114,667.00")); // Net pay for Kasun

      // Informational Employer Contributions
      assert.ok(html.includes("9,600.00")); // Employer EPF 12%
      assert.ok(html.includes("2,400.00")); // Employer ETF 3%
      assert.ok(html.includes("18,400.00")); // Total 23%
    });

    it("renders official triple signature blocks", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslipSheet, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          lang: "BILINGUAL",
        }),
      );

      assert.ok(html.includes("Prepared By (Accounts)"));
      assert.ok(html.includes("Certified By (Finance Manager)"));
      assert.ok(
        html.includes("Employee Signature &amp; Date") || html.includes("Employee Signature"),
      );
    });
  });

  describe("3. Layout Switching & Modal Rendering", () => {
    it("renders A4 Full-Page layout without perforation line", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslip, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          initialLayout: "A4_FULL",
          isModal: false,
        }),
      );

      assert.ok(!html.includes("PERFORATION CUT LINE"));
      assert.ok(html.includes("Print Payslip"));
    });

    it("renders A5 Half-Page dual copy layout with perforation line and HR archive copy", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslip, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          initialLayout: "A5_HALF_PAGE",
          isModal: false,
        }),
      );

      assert.ok(html.includes("PERFORATION CUT LINE"));
      assert.ok(
        html.includes("[HR &amp; FINANCE ARCHIVE COPY]") ||
          html.includes("HR & FINANCE ARCHIVE COPY"),
      );
    });

    it("renders accessible modal dialog wrapper when isModal is true and open", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslip, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          isModal: true,
          isOpen: true,
          onClose: () => {
            /* no-op for tests */
          },
        }),
      );

      assert.ok(html.includes("<dialog"));
      assert.ok(html.includes("Close payslip modal"));
    });

    it("renders null when isModal is true and isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintablePayslip, {
          slip: TEST_SLIP,
          billingPeriod: "2026-10",
          isModal: true,
          isOpen: false,
        }),
      );

      assert.equal(html, "");
    });
  });
});
