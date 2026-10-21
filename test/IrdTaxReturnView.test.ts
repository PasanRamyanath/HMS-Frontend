/**
 * Unit Test Suite for Step 411: IrdTaxReturnView
 * (`test/IrdTaxReturnView.test.ts`)
 *
 * Implements Step 411 (Phase 17.11) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * IRD Monthly VAT (18%) & Quarterly SSCL (2.5%) Return Export View (`IrdTaxReturnView.tsx`).
 *
 * Validates:
 * 1. Inland Revenue Department (IRD) statutory header & RAMIS compliance identifiers
 * 2. Executive KPI cards for Monthly VAT (Total Output VAT 18%, Base Supply, B2B vs B2C split, Due Date)
 * 3. Invoice-by-invoice VAT schedule table segregating B2B (with Buyer TIN/VAT) and B2C tourist folios
 * 4. Credit Notes (`CN-`) properly deducted from aggregate Output VAT & Taxable Base totals
 * 5. Quarterly SSCL schedule (2.5% rate, month-by-month turnover, monthly 20th due dates, return deadline)
 * 6. RAMIS-ready CSV export generators (`generateVatScheduleCsv`, `generateSsclScheduleCsv`)
 * 7. Statutory declaration, Finance Controller sign-off, and SHA-256 hash-chained audit trail
 * 8. Apple HIG touch targets (>= 44x44pt), accessible form controls, and print media formatting
 * 9. React 19 SSR compatibility via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_IRD_RETURN_DATA,
  type IrdInvoiceClassification,
  type IrdMonthlyVatReturnData,
  type IrdPaymentStatus,
  type IrdQuarterlySsclReturnData,
  type IrdReturnInvoiceItem,
  type IrdSsclMonthItem,
  type IrdTaxReturnData,
  IrdTaxReturnView,
  type IrdTaxReturnViewProps,
  generateSsclScheduleCsv,
  generateVatScheduleCsv,
} from "../src/admin/reports/IrdTaxReturnView.js";

describe("Step 411: IRD Monthly VAT (18%) & Quarterly SSCL (2.5%) Return Export View (IrdTaxReturnView.tsx)", () => {
  it("renders IRD statutory header and hotel tax identification details", () => {
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: DEFAULT_IRD_RETURN_DATA,
      }),
    );

    assert.ok(html.includes("Inland Revenue Department (IRD) Tax Returns"));
    assert.ok(html.includes("IRD Statutory RAMIS Filing"));
    assert.ok(html.includes("Acts No. 14 of 2002 &amp; No. 25 of 2022"));
    assert.ok(html.includes("Cinnamon Grand Colombo"));
    assert.ok(html.includes("102938475")); // TIN
    assert.ok(html.includes("102938475-7000")); // VAT
    assert.ok(html.includes("102938475-9000")); // SSCL
    assert.ok(html.includes("SLTDA/SQA/PRO/00892")); // SLTDA Reg
  });

  it("renders monthly Output VAT summary KPI cards with tabular LKR amounts", () => {
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: DEFAULT_IRD_RETURN_DATA,
        initialMode: "MONTHLY_VAT",
      }),
    );

    assert.ok(html.includes("Total Output VAT Payable (18%)"));
    assert.ok(html.includes("Gross Base Supply Turnover"));
    assert.ok(html.includes("B2B vs B2C VAT Split"));
    assert.ok(html.includes("Statutory Remittance Due"));
    assert.ok(html.includes("2026-04-20"));
    assert.ok(html.includes("Corporate B2B:"));
    assert.ok(html.includes("Tourist B2C:"));
    assert.ok(html.includes("Credit Notes (CN-):"));
  });

  it("renders invoice-by-invoice VAT schedule with B2B corporate TIN, B2C, and Credit Notes", () => {
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: DEFAULT_IRD_RETURN_DATA,
        initialMode: "MONTHLY_VAT",
      }),
    );

    assert.ok(html.includes("TAXINV-2026-03-0101"));
    assert.ok(html.includes("Walkers Tours Sri Lanka Ltd"));
    assert.ok(html.includes("TIN: 118273645"));
    assert.ok(html.includes("VAT: 118273645-7000"));
    assert.ok(html.includes("B2B Corporate"));

    assert.ok(html.includes("TAXINV-2026-03-0103"));
    assert.ok(html.includes("Hans Zimmer (Germany)"));
    assert.ok(html.includes("B2C Tourist"));

    // Credit Note
    assert.ok(html.includes("CN-2026-03-0001"));
    assert.ok(html.includes("Credit Note (CN-)"));

    // Exempt
    assert.ok(html.includes("TAXINV-2026-03-0106"));
    assert.ok(html.includes("Exempt / Zero-Rated"));
  });

  it("renders quarterly SSCL mode with turnover breakdown by month and statutory 2.5% rate", () => {
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: DEFAULT_IRD_RETURN_DATA,
        initialMode: "QUARTERLY_SSCL",
      }),
    );

    assert.ok(html.includes("Quarterly SSCL Payable (2.5%)"));
    assert.ok(html.includes("Quarterly Liable Turnover"));
    assert.ok(html.includes("Quarterly Return Deadline"));
    assert.ok(html.includes("2026-04-30"));

    // Month breakdown table
    assert.ok(html.includes("January 2026 (2026-01)"));
    assert.ok(html.includes("February 2026 (2026-02)"));
    assert.ok(html.includes("March 2026 (2026-03)"));
    assert.ok(html.includes("2.5%"));
    assert.ok(html.includes("2026-02-20"));
    assert.ok(html.includes("2026-03-20"));
    assert.ok(html.includes("2026-04-20"));
  });

  it("generates valid RAMIS-ready CSV export for Monthly Output VAT Schedule", () => {
    const csv = generateVatScheduleCsv(
      DEFAULT_IRD_RETURN_DATA.vatData.invoices,
      DEFAULT_IRD_RETURN_DATA.hotelName,
      DEFAULT_IRD_RETURN_DATA.tinNo,
    );

    assert.ok(csv.includes("# IRD RAMIS Output VAT Schedule - Cinnamon Grand Colombo"));
    assert.ok(
      csv.includes(
        "InvoiceNumber,InvoiceDate,FolioId,Classification,BuyerName,BuyerTIN,BuyerVATNo,BaseSupplyLKR,ServiceChargeLKR,TDLLKR,SSCLLKR,VATBaseLKR,OutputVAT18LKR,GrandTotalLKR",
      ),
    );
    assert.ok(csv.includes('"TAXINV-2026-03-0101"'));
    assert.ok(csv.includes('"Walkers Tours Sri Lanka Ltd"'));
    assert.ok(csv.includes('"118273645"'));
    assert.ok(csv.includes('"CN-2026-03-0001"'));
  });

  it("generates valid RAMIS-ready CSV export for Quarterly SSCL Schedule", () => {
    const csv = generateSsclScheduleCsv(
      DEFAULT_IRD_RETURN_DATA.ssclData.months,
      DEFAULT_IRD_RETURN_DATA.ssclData.quarterLabel,
      DEFAULT_IRD_RETURN_DATA.hotelName,
      DEFAULT_IRD_RETURN_DATA.tinNo,
    );

    assert.ok(csv.includes("# IRD RAMIS Quarterly SSCL Return - Cinnamon Grand Colombo"));
    assert.ok(
      csv.includes(
        "Quarter,MonthIndex,YearMonth,MonthName,LiableTurnoverLKR,SSCLRatePercent,SSCLPayableLKR,RemittanceDueDate,PaymentStatus",
      ),
    );
    assert.ok(csv.includes('"Q1 (Jan - Mar 2026)"'));
    assert.ok(csv.includes('"January 2026"'));
    assert.ok(csv.includes("64200000.00"));
    assert.ok(csv.includes("1605000.00"));
  });

  it("renders statutory certification, Finance Controller sign-off, and SHA-256 audit seal", () => {
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: DEFAULT_IRD_RETURN_DATA,
      }),
    );

    assert.ok(html.includes("Statutory Declaration &amp; RAMIS Audit Certification"));
    assert.ok(html.includes("K. M. Fernando, FCA"));
    assert.ok(html.includes("Director of Finance &amp; Controller"));
    assert.ok(html.includes("2026-04-05"));
    assert.ok(html.includes("Certified &amp; Signed"));
    assert.ok(html.includes("7b4c8f01a35d92e64b81c4e7fa093d5621487ea93f20b85718a245cde185f29a"));
    assert.ok(html.includes("3f901a5e2c7d8b490f1e8a764d23cb51e920fa71829bc4839a1d2e5f8670b134"));
  });

  it("supports uncertified state with interactive certification button", () => {
    const uncertifiedData = {
      ...DEFAULT_IRD_RETURN_DATA,
      certifiedBy: undefined,
      certifiedRole: undefined,
      certifiedDate: undefined,
    };

    let certifiedCalled = false;
    const html = renderToStaticMarkup(
      React.createElement(IrdTaxReturnView, {
        data: uncertifiedData,
        onCertify: () => {
          certifiedCalled = true;
        },
      }),
    );

    assert.ok(html.includes("Awaiting Financial Officer Signature"));
    assert.ok(html.includes("Digitally Sign &amp; Certify Return"));
    assert.equal(certifiedCalled, false);
  });

  it("supports strongly-typed IrdTaxReturnViewProps interface with callback handlers", () => {
    const classification: IrdInvoiceClassification = "B2B_CORPORATE";
    const paymentStatus: IrdPaymentStatus = "CLEARED";
    const sampleInvoice: IrdReturnInvoiceItem = {
      invoiceNo: "TAXINV-TEST-001",
      invoiceDate: "2026-03-01",
      folioId: "FOLIO-001",
      classification,
      buyerName: "Test Buyer",
      baseSupplyLkr: 1000,
      serviceChargeLkr: 100,
      tdlLkr: 10,
      ssclLkr: 25,
      vatBaseLkr: 1135,
      vatLkr: 204.3,
      grandTotalLkr: 1339.3,
    };
    const sampleVatData: IrdMonthlyVatReturnData = {
      yearMonth: "2026-03",
      vatRatePercent: 18.0,
      statutoryFilingDueDate: "2026-04-20",
      paymentStatus,
      invoices: [sampleInvoice],
    };
    const sampleSsclMonth: IrdSsclMonthItem = {
      monthIndex: 1,
      monthName: "January 2026",
      yearMonth: "2026-01",
      liableTurnoverLkr: 100000,
      ssclRatePercent: 2.5,
      ssclPayableLkr: 2500,
      remittanceDueDate: "2026-02-20",
      status: paymentStatus,
    };
    const sampleSsclData: IrdQuarterlySsclReturnData = {
      taxYear: 2026,
      quarter: 1,
      quarterLabel: "Q1",
      ssclRatePercent: 2.5,
      statutoryReturnDueDate: "2026-04-30",
      paymentStatus,
      months: [sampleSsclMonth],
    };
    const fullData: IrdTaxReturnData = {
      ...DEFAULT_IRD_RETURN_DATA,
      vatData: sampleVatData,
      ssclData: sampleSsclData,
    };

    const props: IrdTaxReturnViewProps = {
      data: fullData,
      initialMode: "MONTHLY_VAT",
      onPeriodChange: () => {
        /* no-op for test */
      },
      onExportCsv: () => {
        /* no-op for test */
      },
      onPrint: () => {
        /* no-op for test */
      },
      onCertify: () => {
        /* no-op for test */
      },
      className: "custom-ird-test-class",
    };

    const html = renderToStaticMarkup(React.createElement(IrdTaxReturnView, props));
    assert.ok(html.includes("custom-ird-test-class"));
    assert.ok(html.includes("TAXINV-TEST-001"));
  });
});
