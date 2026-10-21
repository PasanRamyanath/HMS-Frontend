/**
 * Unit Test Suite for Step 412: ManagerFlashReportView
 * (`test/ManagerFlashReportView.test.ts`)
 *
 * Implements Step 412 (Phase 17.12) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * GM Daily Flash Report (`ManagerFlashReportView.tsx`).
 *
 * Validates:
 * 1. Executive header with 23:59 SLST audit closing, locked CBSL USD exchange rate, and hotel metadata
 * 2. Executive KPI Cards (Occupancy %, ADR LKR/USD, RevPAR LKR/USD, Total Gross Revenue with taxes)
 * 3. Trend delta calculation and badge rendering (+3.4% vs MTD)
 * 4. Departmental revenue comparison table across Today, MTD, Last Month, and Budget target
 * 5. 4-Stage compounding Sri Lankan statutory tax breakdown (SC 10%, TDL 1%, SSCL 2.5%, VAT 18%)
 * 6. Cashier settlement reconciliation (LankaQR, Credit Cards, Cash drawer, City Ledger DMC)
 * 7. In-house guest census and movement (Foreign vs Domestic split, arrivals, departures, VIP count)
 * 8. Executive audit sign-off chain & SHA-256 hash-chained seal
 * 9. RAMIS/PMS CSV export generator (`generateFlashReportCsv`)
 * 10. React 19 SSR compatibility via renderToStaticMarkup and complete type coverage
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_FLASH_REPORT_DATA,
  type FlashPeriodMetrics,
  type GuestCensusMetrics,
  type ManagerFlashReportData,
  ManagerFlashReportView,
  type ManagerFlashReportViewProps,
  generateFlashReportCsv,
} from "../src/admin/reports/ManagerFlashReportView.js";

describe("Step 412: GM Daily Flash Report (ManagerFlashReportView.tsx)", () => {
  it("renders executive header with hotel name, capacity, 23:59 SLST audit badge, and CBSL rate", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Executive Daily Revenue &amp; Occupancy Flash"));
    assert.ok(html.includes("GM Daily Flash Report"));
    assert.ok(html.includes("Audited 23:59 SLST"));
    assert.ok(html.includes("Cinnamon Grand Colombo"));
    assert.ok(html.includes("Wednesday, 25 March 2026"));
    assert.ok(html.includes("501 Keys"));
    assert.ok(html.includes("1 USD = 305.50 LKR (CBSL)"));
  });

  it("renders executive KPI cards for Occupancy, ADR, RevPAR, and Gross Revenue", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Room Occupancy"));
    assert.ok(html.includes("84.6%"));
    assert.ok(html.includes("419 / 495"));

    assert.ok(html.includes("Average Daily Rate (ADR)"));
    assert.ok(html.includes("$158.75"));

    assert.ok(html.includes("RevPAR (Per Available Key)"));
    assert.ok(html.includes("$134.30"));

    assert.ok(html.includes("Total Gross Revenue"));
    assert.ok(html.includes("Inc. Taxes"));
  });

  it("calculates trend delta badge comparing Today vs MTD", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    // 84.6 - 81.2 = +3.4%
    assert.ok(html.includes("+3.4% vs MTD"));
  });

  it("renders departmental revenue breakdown table comparing Today vs MTD vs Last Month vs Budget", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Rooms Revenue"));
    assert.ok(html.includes("F&amp;B Dining (Outlets &amp; Bars)"));
    assert.ok(html.includes("Banquets &amp; Weddings (MICE)"));
    assert.ok(html.includes("Ayurveda Spa &amp; Wellness"));
    assert.ok(html.includes("Laundry &amp; Minibar"));
    assert.ok(html.includes("Excursions &amp; Transport"));
    assert.ok(html.includes("Total Base Revenue:"));
  });

  it("renders 4-stage compounding Sri Lankan statutory taxes & levies", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Sri Lankan Statutory Taxes &amp; Levies (Compounding)"));
    assert.ok(html.includes("10% Staff Service Charge (SC)"));
    assert.ok(html.includes("1% Tourism Development Levy (TDL)"));
    assert.ok(html.includes("2.5% Social Security Contribution Levy (SSCL)"));
    assert.ok(html.includes("18% Value Added Tax (VAT)"));
    assert.ok(html.includes("Total Taxes &amp; Levies:"));
  });

  it("renders cashier settlement reconciliation with balanced variance", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Payment Settlements &amp; Cashier Reconciliation"));
    assert.ok(html.includes("LankaQR Instant Settlements (EMVCo)"));
    assert.ok(html.includes("Credit Cards &amp; Gateways (PayHere / WebXPay)"));
    assert.ok(html.includes("Cash Drawer Drop (LKR &amp; USD Envelopes)"));
    assert.ok(html.includes("City Ledger Invoiced (DMC &amp; Corporate)"));
    assert.ok(html.includes("Total Collections Reconciled:"));
    assert.ok(html.includes("Variance: LKR 0.00 (Balanced)"));
  });

  it("renders guest census metrics (in-house tourists, arrivals, departures, VIP count)", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("In-House Guest Movement &amp; Demographics"));
    assert.ok(html.includes("Total In-House: 742 Guests"));
    assert.ok(html.includes("556 Foreign • 186 Domestic"));
    assert.ok(html.includes("145 Checked In / 148 Expected"));
    assert.ok(html.includes("124 Checked Out / 124 Scheduled"));
    assert.ok(html.includes("14 VIP Profiles"));
  });

  it("renders executive sign-off chain and cryptographic SHA-256 seal", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManagerFlashReportView, {
        data: DEFAULT_FLASH_REPORT_DATA,
      }),
    );

    assert.ok(html.includes("Executive Audit &amp; Sign-Off Chain"));
    assert.ok(html.includes("R. P. Wickramasinghe (Auditor #804)"));
    assert.ok(html.includes("K. M. Fernando, FCA"));
    assert.ok(html.includes("Sanjiva Perera, CHA"));
    assert.ok(html.includes("5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d"));
    assert.ok(html.includes("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"));
  });

  it("generates structured executive flash CSV report", () => {
    const csv = generateFlashReportCsv(DEFAULT_FLASH_REPORT_DATA);

    assert.ok(csv.includes("# GM Daily Flash Revenue Report - Cinnamon Grand Colombo"));
    assert.ok(csv.includes("# Locked CBSL Rate: 1 USD = 305.50 LKR"));
    assert.ok(
      csv.includes("MetricCategory,MetricName,Today_LKR,MTD_LKR,LastMonth_LKR,BudgetMTD_LKR"),
    );
    assert.ok(
      csv.includes("Rooms,RoomsRevenue,20321500.00,464217600.00,479808000.00,445500000.00"),
    );
    assert.ok(
      csv.includes("Summary,TotalBaseRevenue,32850000.00,784200000.00,812400000.00,753000000.00"),
    );
    assert.ok(
      csv.includes(
        "Summary,TotalGrossRevenue,43996005.00,1050300480.00,1088086860.00,1008529950.00",
      ),
    );
    assert.ok(
      csv.includes(
        "Summary,TotalCollections,43996005.00,1050300480.00,1088086860.00,1008529950.00",
      ),
    );
  });

  it("supports custom data and strongly typed ManagerFlashReportViewProps interface", () => {
    const periodSample: FlashPeriodMetrics = {
      ...DEFAULT_FLASH_REPORT_DATA.today,
      occupancyPercent: 90.0,
    };
    const censusSample: GuestCensusMetrics = {
      ...DEFAULT_FLASH_REPORT_DATA.guestCensus,
      totalInHouseGuests: 800,
    };
    const customData: ManagerFlashReportData = {
      ...DEFAULT_FLASH_REPORT_DATA,
      today: periodSample,
      guestCensus: censusSample,
      generalManagerName: undefined,
    };

    const props: ManagerFlashReportViewProps = {
      data: customData,
      onDateChange: (_date: string) => {
        /* no-op for test */
      },
      onExportCsv: (_csv: string, _filename: string) => {
        /* no-op for test */
      },
      onPrint: () => {
        /* no-op for test */
      },
      onAcknowledge: (_role: string, _name: string) => {
        /* no-op for test */
      },
      className: "custom-flash-test-class",
    };

    const html = renderToStaticMarkup(React.createElement(ManagerFlashReportView, props));
    assert.ok(html.includes("custom-flash-test-class"));
    assert.ok(html.includes("90.0%"));
    assert.ok(html.includes("Total In-House: 800 Guests"));
    assert.ok(html.includes("Sign Off Report"));
  });
});
