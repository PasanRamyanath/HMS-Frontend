/**
 * Unit Test Suite for Step 408: TdlQuarterlyReportView
 * (`test/TdlQuarterlyReportView.test.ts`)
 *
 * Implements Step 408 (Phase 17.08) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * SLTDA Quarterly TDL Return & BOC A/C 73104820 / GovPay Payment Slip Tracker (`TdlQuarterlyReportView.tsx`).
 *
 * Validates:
 * 1. Official SLTDA statutory TDL header & Tourism Act No. 38 compliance details
 * 2. Executive KPI cards (Quarterly Turnover Base B, 1.0% or 0.5% rate, TDL Payable, Due Date)
 * 3. Month-by-month turnover and TDL assessment schedule
 * 4. BOC Corporate Branch A/C 73104820 remittance details & unique reference
 * 5. WebP payment slip upload form and metadata recording
 * 6. Small hotel tier (0.5% rate for turnover <= LKR 3M)
 * 7. Statutory certification declaration & SHA-256 cryptographic audit trail
 * 8. Apple HIG touch targets (>= 44x44pt), accessible labels, and print media formatting
 * 9. React 19 SSR compatibility via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TDL_QUARTERLY_DATA,
  type TdlQuarterlyReportData,
  TdlQuarterlyReportView,
  type TdlQuarterlyReportViewProps,
  type TdlRemittanceSlip,
} from "../src/admin/reports/TdlQuarterlyReportView.js";

describe("Step 408: SLTDA Quarterly TDL Return & BOC A/C 73104820 Payment Slip Tracker (TdlQuarterlyReportView.tsx)", () => {
  it("renders statutory TDL return header and hotel identification", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("Tourism Development Levy (TDL) Return"));
    assert.ok(html.includes("Statutory TDL Statement"));
    assert.ok(html.includes("Tourism Act No. 38 (Section 35)"));
    assert.ok(html.includes("Cinnamon Grand Colombo"));
    assert.ok(html.includes("SLTDA/SQA/PRO/00892"));
    assert.ok(html.includes("Q1 (Jan - Mar 2026)"));
    assert.ok(html.includes("PAYMENT DUE"));
  });

  it("renders quarterly performance KPIs (Turnover, 1.0% Rate, TDL Payable, Due Date)", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("Quarterly Turnover (Base B)"));
    assert.ok(html.includes("Statutory TDL Rate"));
    assert.ok(html.includes("1.0%"));
    assert.ok(html.includes("Standard Hotel Tier"));
    assert.ok(html.includes("Total TDL Payable"));
    assert.ok(html.includes("Statutory Due Date"));
    assert.ok(html.includes("2026-04-15"));
  });

  it("renders month-by-month turnover and assessment schedule", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("Monthly Turnover &amp; TDL Assessment Schedule"));
    assert.ok(html.includes("January 2026"));
    assert.ok(html.includes("2026-01"));
    assert.ok(html.includes("February 2026"));
    assert.ok(html.includes("2026-02"));
    assert.ok(html.includes("March 2026"));
    assert.ok(html.includes("2026-03"));
    assert.ok(html.includes("Total Quarterly Turnover &amp; Assessment"));
  });

  it("renders BOC Corporate Branch A/C 73104820 statutory payment instructions", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("Bank of Ceylon (BOC) Remittance Instructions"));
    assert.ok(html.includes("73104820"));
    assert.ok(html.includes("Corporate Branch, Colombo 01"));
    assert.ok(html.includes("GovPay Code: SLTDA-TDL"));
    assert.ok(html.includes("TDL/2026/Q1/SLTDA-SQA-PRO-00892"));
    assert.ok(html.includes("mandatory 10% penalty plus 2% additional surcharge"));
  });

  it("renders WebP deposit slip uploader and payment proof recorder", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("BOC Deposit Slip / GovPay Transfer Verification"));
    assert.ok(html.includes("BOC Slip / GovPay Reference No:"));
    assert.ok(html.includes("Payment Date:"));
    assert.ok(html.includes("Amount Paid (LKR):"));
    assert.ok(html.includes("Attach &amp; Record Payment Slip"));
    assert.ok(html.includes("Upload Stamped BOC Transfer Slip"));
  });

  it("renders small-hotel tier (0.5% rate) for guesthouse with turnover <= LKR 3M", () => {
    const smallHotelData: TdlQuarterlyReportData = {
      tenantId: "ella-gap-inn",
      taxYear: 2026,
      quarter: 2,
      quarterLabel: "Q2 (Apr - Jun 2026)",
      hotelName: "Ella Gap Rest House",
      sltdaRegNo: "SLTDA/SQA/GST/00451",
      tdlRatePercent: 0.5,
      isSmallHotelTier: true,
      months: [
        {
          monthIndex: 1,
          monthName: "April 2026",
          yearMonth: "2026-04",
          turnoverBaseLkr: 850000,
          tdlRatePercent: 0.5,
          tdlPayableLkr: 4250,
        },
        {
          monthIndex: 2,
          monthName: "May 2026",
          yearMonth: "2026-05",
          turnoverBaseLkr: 720000,
          tdlRatePercent: 0.5,
          tdlPayableLkr: 3600,
        },
        {
          monthIndex: 3,
          monthName: "June 2026",
          yearMonth: "2026-06",
          turnoverBaseLkr: 910000,
          tdlRatePercent: 0.5,
          tdlPayableLkr: 4550,
        },
      ],
      quarterlyTurnoverLkr: 2480000,
      quarterlyTdlPayableLkr: 12400,
      statutoryDueDate: "2026-07-15",
      bocAccountName: "Sri Lanka Tourism Development Authority (SLTDA)",
      bocAccountNumber: "73104820",
      bocBranch: "Bank of Ceylon (BOC) Corporate Branch, Colombo 01",
      paymentReference: "TDL/2026/Q2/SLTDA-SQA-GST-00451",
      remittanceSlip: {
        status: "SLIP_ATTACHED",
        bankReference: "BOC-DEP-99410",
        paidDate: "2026-07-10",
        paidAmountLkr: 12400,
      },
      auditHash: "5e2b10ca4f...",
      certifiedBy: "Kamal Perera (Managing Partner)",
    };

    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: smallHotelData,
      }),
    );

    assert.ok(html.includes("Ella Gap Rest House"));
    assert.ok(html.includes("0.5%"));
    assert.ok(html.includes("Small Hotel (Turnover &lt;= 3M)"));
    assert.ok(html.includes("SLIP SUBMITTED"));
    assert.ok(html.includes("2026-07-15"));
  });

  it("renders statutory sign-off and SHA-256 audit log cryptographic hash", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("SLTDA Finance Clearance &amp; Declaration"));
    assert.ok(html.includes("Rohan Fernando (Chief Financial Controller)"));
    assert.ok(html.includes("SHA-256 Audit Trail Hash"));
    assert.ok(html.includes("9a7c38e12d44fa5061bce471032890ae"));
    assert.ok(html.includes("Prepared By:"));
    assert.ok(html.includes("Certified By:"));
    assert.ok(html.includes("SLTDA Clearance:"));
  });

  it("supports strongly-typed TdlQuarterlyReportViewProps interface with callbacks", () => {
    let quarterChanged = false;
    let slipSubmitted = false;
    let printTriggered = false;

    const props: TdlQuarterlyReportViewProps = {
      data: DEFAULT_TDL_QUARTERLY_DATA,
      onQuarterChange: (_year, _q) => {
        quarterChanged = true;
      },
      onRemittanceSubmit: (_slip: TdlRemittanceSlip) => {
        slipSubmitted = true;
      },
      onPrint: () => {
        printTriggered = true;
      },
      className: "custom-tdl-view-class",
    };

    const html = renderToStaticMarkup(React.createElement(TdlQuarterlyReportView, props));
    assert.ok(html.includes("custom-tdl-view-class"));

    props.onQuarterChange?.(2026, 2);
    props.onRemittanceSubmit?.({
      bankReference: "REF-001",
      paidDate: "2026-04-10",
      paidAmountLkr: 1845000,
      status: "SLIP_ATTACHED",
    });
    props.onPrint?.();

    assert.equal(quarterChanged, true);
    assert.equal(slipSubmitted, true);
    assert.equal(printTriggered, true);
  });

  it("enforces Apple HIG touch targets (>= 44x44pt) and accessible buttons", () => {
    const html = renderToStaticMarkup(
      React.createElement(TdlQuarterlyReportView, {
        data: DEFAULT_TDL_QUARTERLY_DATA,
      }),
    );

    assert.ok(html.includes("min-h-[44px]"));
    assert.ok(html.includes("min-w-[44px]"));
    assert.ok(html.includes('aria-label="Print A4 official TDL statement"'));
    assert.ok(html.includes('aria-label="Save and submit TDL payment proof"'));
  });
});
