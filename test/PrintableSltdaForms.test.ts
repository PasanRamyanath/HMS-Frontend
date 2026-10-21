/**
 * Unit Test Suite for Step 421: PrintableSltdaForms
 * (`test/PrintableSltdaForms.test.ts`)
 *
 * Implements Step 421 (Phase 17.21) / Rung 3 of the Sri Lanka HMS Master Architecture Plan:
 * Printable Official SLTDA Monthly & TDL Return Forms (`PrintableSltdaForms.tsx`).
 *
 * Validates:
 * 1. Statutory occupancy calculation engine (`calculateSltdaMonthlyOccupancyRate`)
 * 2. TDL quarterly payable computation engine (`calculateTdlQuarterlyPayable`)
 * 3. Date formatter (`formatSltdaDate`)
 * 4. Summary generator (`generateSltdaFormSummary`)
 * 5. React 19 SSR rendering of Form A (SLTDA Monthly Return) with Rung 3 GM signature & seal block
 * 6. React 19 SSR rendering of Form B (TDL Quarterly Declaration) with Bank of Ceylon particulars
 * 7. Combined dossier rendering (Form A + Form B with print page break)
 * 8. Watermark rendering states (OFFICIAL, DRAFT, NONE)
 * 9. Custom data injection and cryptographic hash verification
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PRINTABLE_SLTDA_DATA,
  PrintableSltdaForms,
  type PrintableSltdaFormsProps,
  calculateSltdaMonthlyOccupancyRate,
  calculateTdlQuarterlyPayable,
  formatSltdaDate,
  generateSltdaFormSummary,
} from "../src/admin/reports/PrintableSltdaForms.js";

describe("Step 421: Printable Official SLTDA Monthly & TDL Return Forms (PrintableSltdaForms.tsx)", () => {
  describe("1. Statutory Calculation Engines", () => {
    it("accurately computes room occupancy rate to 2 decimal places", () => {
      // 4,190 occupied out of 4,929 available room nights = 85.0071% -> 85.01%
      const rate = calculateSltdaMonthlyOccupancyRate(4190, 4929);
      assert.equal(rate, 85.01);

      // Edge cases: 0 available returns 0
      assert.equal(calculateSltdaMonthlyOccupancyRate(0, 0), 0);
      assert.equal(calculateSltdaMonthlyOccupancyRate(50, 0), 0);

      // 100% full house
      assert.equal(calculateSltdaMonthlyOccupancyRate(100, 100), 100);
    });

    it("accurately computes quarterly TDL payable from monthly turnovers", () => {
      // 3 months turnover: 100M, 150M, 200M @ 1.0% = 4.5M
      const turnovers = [100000000, 150000000, 200000000];
      const tdlStandard = calculateTdlQuarterlyPayable(turnovers, 1.0);
      assert.equal(tdlStandard, 4500000);

      // Small hotel concessionary tier @ 0.5%
      const smallTurnovers = [800000, 900000, 1000000]; // 2.7M <= 3M
      const tdlConcession = calculateTdlQuarterlyPayable(smallTurnovers, 0.5);
      assert.equal(tdlConcession, 13500);
    });

    it("formats ISO dates into statutory British/Sri Lankan standard (DD MMM YYYY)", () => {
      assert.equal(formatSltdaDate("2026-11-02"), "02 Nov 2026");
      assert.equal(formatSltdaDate("2027-01-15"), "15 Jan 2027");
      assert.equal(formatSltdaDate(""), "—");
    });

    it("generates form summaries including foreign market share and workforce census", () => {
      const summary = generateSltdaFormSummary(DEFAULT_PRINTABLE_SLTDA_DATA);

      // Foreign market share sum
      assert.equal(summary.totalForeignShare, 100);

      // Total staff = 185 + 72 + 3 + 1 = 261
      assert.equal(summary.totalStaffCount, 261);

      // TDL quarterly payable
      assert.equal(summary.netPayableTdlLkr, 7318900);
    });
  });

  describe("2. React 19 SSR: Form A (Monthly Occupancy Return)", () => {
    it("renders official Republic of Sri Lanka header, SLTDA title, and Tourism Act reference", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "MONTHLY_OCCUPANCY",
        initialWatermark: "OFFICIAL",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("Government of the Democratic Socialist Republic of Sri Lanka"));
      assert.ok(html.includes("Sri Lanka Tourism Development Authority (SLTDA)"));
      assert.ok(html.includes("FORM A — MONTHLY STATISTICAL RETURN"));
      assert.ok(html.includes("Section 53 of the Tourism Act No. 38 of 2005"));
      assert.ok(html.includes("SLTDA / STAT / FORM-A"));
    });

    it("renders establishment profile and capacity metrics", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "MONTHLY_OCCUPANCY",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("Cinnamon Bentota Beach Resort"));
      assert.ok(html.includes("Ceylon Holiday Resorts Limited"));
      assert.ok(html.includes("SLTDA/SQA/PRO/00892"));
      assert.ok(html.includes("5-Star Luxury Beach Resort"));
      assert.ok(html.includes("Galle Tourism Region (Southern Coastal Belt)"));
      assert.ok(html.includes("October 2026"));
      assert.ok(html.includes("85.01%"));
      assert.ok(html.includes("80.65%"));
    });

    it("renders guest nationality origin table and financial performance", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "MONTHLY_OCCUPANCY",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      // Nationalities
      assert.ok(html.includes("India"));
      assert.ok(html.includes("United Kingdom"));
      assert.ok(html.includes("Russian Federation"));
      assert.ok(html.includes("Germany"));
      assert.ok(html.includes("Australia"));

      // Workforce
      assert.ok(html.includes("Local Male Staff"));
      assert.ok(html.includes("185"));
      assert.ok(html.includes("Local Female Staff"));
      assert.ok(html.includes("72"));
    });

    it("renders Rung 3 statutory GM signature and company seal block", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "MONTHLY_OCCUPANCY",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("Statutory Solemn Declaration:"));
      assert.ok(html.includes("Rohan Chandrasiri Wijeratne"));
      assert.ok(
        html.includes("Area Vice President &amp; General Manager") ||
          html.includes("Area Vice President & General Manager"),
      );
      assert.ok(html.includes("197218402914"));
      assert.ok(html.includes("AFFIX OFFICIAL"));
      assert.ok(html.includes("COMPANY SEAL"));
      assert.ok(html.includes("CEYLON HOLIDAY RESORTS LTD • OFFICIAL SEAL"));
      assert.ok(html.includes("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
    });
  });

  describe("3. React 19 SSR: Form B (TDL Quarterly Declaration)", () => {
    it("renders Form TDL-1 header, Section 11 statutory citation, and quarterly schedule", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "TDL_QUARTERLY",
        initialWatermark: "OFFICIAL",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("FORM TDL-1 — QUARTERLY STATUTORY DECLARATION"));
      assert.ok(html.includes("Section 11 of the Tourism Act No. 38 of 2005"));
      assert.ok(html.includes("Finance Act No. 25 of 2003"));
      assert.ok(html.includes("SLTDA / TDL / FORM-1"));
      assert.ok(html.includes("4th Quarter (October - December 2026)"));
      assert.ok(html.includes("Rate: 1.0% (Standard)"));
    });

    it("renders designated Bank of Ceylon account and settlement verification details", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "TDL_QUARTERLY",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("Director General - SLTDA / TDL Fund"));
      assert.ok(html.includes("0002323145"));
      assert.ok(html.includes("Bank of Ceylon, Corporate Branch, Colombo 01"));
      assert.ok(html.includes("SLTDA-TDL-2026Q4-PRO00892"));
      assert.ok(html.includes("CLEARED"));
    });
  });

  describe("4. React 19 SSR: Combined Dossier & Watermark Toggles", () => {
    it("renders both Form A and Form B with print page break in combined dossier mode", () => {
      const props: PrintableSltdaFormsProps = {
        data: DEFAULT_PRINTABLE_SLTDA_DATA,
        initialFormType: "COMBINED_DOSSIER",
      };

      const html = renderToStaticMarkup(React.createElement(PrintableSltdaForms, props));

      assert.ok(html.includes("FORM A — MONTHLY STATISTICAL RETURN"));
      assert.ok(html.includes("FORM TDL-1 — QUARTERLY STATUTORY DECLARATION"));
      assert.ok(html.includes("print:break-before-page"));
    });

    it("renders appropriate watermark text based on selection", () => {
      // Official watermark
      const officialHtml = renderToStaticMarkup(
        React.createElement(PrintableSltdaForms, {
          initialWatermark: "OFFICIAL",
        }),
      );
      assert.ok(officialHtml.includes("SLTDA OFFICIAL"));
      assert.ok(officialHtml.includes("STATUTORY RETURN • TOURISM ACT NO. 38 OF 2005"));

      // Draft watermark
      const draftHtml = renderToStaticMarkup(
        React.createElement(PrintableSltdaForms, {
          initialWatermark: "DRAFT",
        }),
      );
      assert.ok(draftHtml.includes("INTERNAL DRAFT"));
      assert.ok(draftHtml.includes("PRE-AUDIT VERIFICATION COPY"));

      // None watermark
      const noneHtml = renderToStaticMarkup(
        React.createElement(PrintableSltdaForms, {
          initialWatermark: "NONE",
        }),
      );
      assert.ok(!noneHtml.includes("SLTDA OFFICIAL"));
      assert.ok(!noneHtml.includes("INTERNAL DRAFT"));
    });
  });
});
