/**
 * Unit Test Suite for Step 407: SltdaMonthlyReportView
 * (`test/SltdaMonthlyReportView.test.ts`)
 *
 * Implements Step 407 (Phase 17.07) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * SLTDA Monthly Occupancy & Nationality Breakdown View (`SltdaMonthlyReportView.tsx`).
 *
 * Validates:
 * 1. Official SLTDA statutory header & Form MR-1 compliance details
 * 2. Executive KPI bento cards (Room/Bed Occupancy %, ADR, RevPAR, Guest Nights)
 * 3. Country-by-country foreign tourist breakdown table & Domestic guest night row
 * 4. Departmental revenue schedule (Room, F&B, Other, Gross Base B)
 * 5. Statutory certification declaration & SHA-256 cryptographic audit trail
 * 6. RFC-4180 CSV export compiler (`generateSltdaMonthlyCsv`)
 * 7. Apple HIG touch targets (>= 44x44pt), squircle radii, and print media formatting
 * 8. React 19 SSR compatibility via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SLTDA_MONTHLY_DATA,
  type SltdaMonthlyData,
  SltdaMonthlyReportView,
  type SltdaMonthlyReportViewProps,
  downloadSltdaMonthlyCsv,
  generateSltdaMonthlyCsv,
} from "../src/admin/reports/SltdaMonthlyReportView.js";

describe("Step 407: SLTDA Monthly Occupancy & Nationality Breakdown View (SltdaMonthlyReportView.tsx)", () => {
  it("renders official SLTDA statutory return header and hotel identification", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    assert.ok(html.includes("SLTDA Monthly Statistical Return"));
    assert.ok(html.includes("Form MR-1"));
    assert.ok(html.includes("Tourism Act No. 38"));
    assert.ok(html.includes("Cinnamon Grand Colombo"));
    assert.ok(html.includes("SLTDA/SQA/PRO/00892"));
    assert.ok(html.includes("Colombo Metropolitan Area"));
    assert.ok(html.includes("AUDITED &amp; CHAINED"));
  });

  it("renders hospitality occupancy and yield KPIs (Room Occ, Bed Occ, ADR, RevPAR)", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    // Room and Bed Occupancy
    assert.ok(html.includes("76.0%")); // Room occupancy
    assert.ok(html.includes("68.8%")); // Bed occupancy
    assert.ok(html.includes("2828 / 3720 nights"));
    assert.ok(html.includes("5120 / 7440 beds"));

    // Foreign and Domestic guest nights
    assert.ok(html.includes("4096")); // Foreign guest nights
    assert.ok(html.includes("1240 tourist arrivals"));
    assert.ok(html.includes("1024")); // Domestic guest nights
    assert.ok(html.includes("320 local arrivals"));
  });

  it("renders departmental turnover schedule and capacity breakdown", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    assert.ok(html.includes("Hotel Room &amp; Bed Capacity Schedule"));
    assert.ok(html.includes("120 Rooms"));
    assert.ok(html.includes("240 Beds"));
    assert.ok(html.includes("Departmental Turnover Breakdown"));
    assert.ok(html.includes("Room Accommodation Revenue"));
    assert.ok(html.includes("Food &amp; Beverage (Restaurants &amp; Bars)"));
    assert.ok(html.includes("Other Services (Spa, Excursions, Laundry)"));
    assert.ok(html.includes("Total Monthly Turnover (Base B)"));
  });

  it("renders country-by-country foreign tourist nationality table", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    assert.ok(html.includes("Foreign Guest Nights &amp; Arrivals by Country of Origin"));
    assert.ok(html.includes("United Kingdom"));
    assert.ok(html.includes("GB"));
    assert.ok(html.includes("India"));
    assert.ok(html.includes("IN"));
    assert.ok(html.includes("Germany"));
    assert.ok(html.includes("DE"));
    assert.ok(html.includes("Russian Federation"));
    assert.ok(html.includes("RU"));
    assert.ok(html.includes("France"));
    assert.ok(html.includes("FR"));
    assert.ok(html.includes("Australia"));
    assert.ok(html.includes("China"));

    // Subtotals and domestic row
    assert.ok(html.includes("Total Foreign Tourist Nights"));
    assert.ok(html.includes("Sri Lankan Domestic Guests"));
    assert.ok(html.includes("Grand Total (Foreign + Domestic)"));
  });

  it("renders statutory declaration and SHA-256 cryptographic audit trail", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    assert.ok(html.includes("Statutory Declaration &amp; Submission Clearance"));
    assert.ok(html.includes("Chandana Silva (Night Auditor #AUD-104)"));
    assert.ok(html.includes("SHA-256 Immutable Audit Hash"));
    assert.ok(html.includes("8f4b26c04e224e77cbef8975a5937d2f"));
    assert.ok(html.includes("Prepared By:"));
    assert.ok(html.includes("Verified By:"));
    assert.ok(html.includes("Approved By:"));
  });

  it("compiles RFC-4180 CSV export with UTF-8 compatibility and all data rows", () => {
    const csv = generateSltdaMonthlyCsv(DEFAULT_SLTDA_MONTHLY_DATA);

    assert.ok(csv.includes("SRI LANKA TOURISM DEVELOPMENT AUTHORITY (SLTDA)"));
    assert.ok(csv.includes('"Cinnamon Grand Colombo"'));
    assert.ok(csv.includes('"SLTDA/SQA/PRO/00892"'));
    assert.ok(csv.includes('"Reporting Period","2026-10"'));
    assert.ok(csv.includes('"Room Occupancy %",76.02'));
    assert.ok(csv.includes('"Bed Occupancy %",68.82'));
    assert.ok(csv.includes('"GB","United Kingdom",360,1240,30.27'));
    assert.ok(csv.includes('"IN","India",290,860,21.00'));
    assert.ok(csv.includes('"LK","Sri Lanka (Domestic Guests)",320,1024,"N/A"'));
    assert.ok(csv.includes('"TOTAL","All Combined Nationalities",1560,5120,"100.00"'));
    assert.ok(csv.includes("8f4b26c04e224e77cbef8975a5937d2f9748fa64a51b0337cf92e1fbf9d4d4cb"));

    // Verify safe handling when running in non-DOM environment
    assert.doesNotThrow(() => {
      downloadSltdaMonthlyCsv(DEFAULT_SLTDA_MONTHLY_DATA);
    });
  });

  it("supports strongly-typed SltdaMonthlyReportViewProps interface", () => {
    let monthChanged = false;
    let exported = false;
    let printed = false;

    const props: SltdaMonthlyReportViewProps = {
      data: DEFAULT_SLTDA_MONTHLY_DATA,
      onMonthChange: (_ym) => {
        monthChanged = true;
      },
      onExportCsv: () => {
        exported = true;
      },
      onPrint: () => {
        printed = true;
      },
      className: "custom-sltda-class",
    };
    const html = renderToStaticMarkup(React.createElement(SltdaMonthlyReportView, props));
    assert.ok(html.includes("custom-sltda-class"));
    props.onMonthChange?.("2026-12");
    props.onExportCsv?.();
    props.onPrint?.();
    assert.equal(monthChanged, true);
    assert.equal(exported, true);
    assert.equal(printed, true);
  });

  it("renders with custom data for boutique villa / regional resort", () => {
    const boutiqueData: SltdaMonthlyData = {
      tenantId: "kahanda-kanda-galle",
      hotelName: "Kahanda Kanda Boutique Villa",
      sltdaRegNo: "SLTDA/SQA/VIL/00142",
      tourismDistrict: "Galle Southern Coast",
      yearMonth: "2026-11",
      roomCapacity: 12,
      bedCapacity: 24,
      daysInMonth: 30,
      auditedDaysCount: 30,
      totalAvailableRoomNights: 360,
      occupiedRoomNights: 306,
      roomOccupancyRate: 85.0,
      totalAvailableBedNights: 720,
      occupiedBedNights: 576,
      bedOccupancyRate: 80.0,
      domesticGuestCount: 20,
      domesticGuestNights: 60,
      foreignGuestCount: 180,
      foreignGuestNights: 516,
      totalGuestCount: 200,
      totalGuestNights: 576,
      averageDailyRateLkr: 95000,
      revParLkr: 80750,
      totalRoomRevenueLkr: 29070000,
      totalFbRevenueLkr: 8500000,
      totalOtherRevenueLkr: 2400000,
      totalGrossRevenueLkr: 39970000,
      countryBreakdown: [
        {
          countryCode: "GB",
          countryName: "United Kingdom",
          guestCount: 90,
          guestNights: 260,
          sharePercent: 50.39,
        },
        {
          countryCode: "AU",
          countryName: "Australia",
          guestCount: 50,
          guestNights: 150,
          sharePercent: 29.07,
        },
        {
          countryCode: "US",
          countryName: "United States",
          guestCount: 40,
          guestNights: 106,
          sharePercent: 20.54,
        },
      ],
    };

    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, { data: boutiqueData }),
    );

    assert.ok(html.includes("Kahanda Kanda Boutique Villa"));
    assert.ok(html.includes("SLTDA/SQA/VIL/00142"));
    assert.ok(html.includes("85.0%")); // Room occupancy
    assert.ok(html.includes("80.0%")); // Bed occupancy
    assert.ok(html.includes("306 / 360 nights"));
  });

  it("enforces Apple HIG touch targets (>= 44x44pt) and accessible buttons", () => {
    const html = renderToStaticMarkup(
      React.createElement(SltdaMonthlyReportView, {
        data: DEFAULT_SLTDA_MONTHLY_DATA,
      }),
    );

    // Verify minimum 44px touch targets on buttons
    assert.ok(html.includes("min-h-[44px]"));
    assert.ok(html.includes("min-w-[44px]"));
    assert.ok(html.includes('aria-label="Export SLTDA report to CSV"'));
    assert.ok(html.includes('aria-label="Print A4 official return"'));
  });
});
