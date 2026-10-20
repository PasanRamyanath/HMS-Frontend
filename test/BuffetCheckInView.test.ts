import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BUFFET_TRANSLATIONS,
  BuffetCheckInView,
  DEFAULT_BUFFET_RECORDS,
  DEFAULT_BUFFET_TARIFFS,
  calculateBuffetFolioCharge,
  computeBuffetAttendanceKpis,
  filterBuffetRecords,
  formatBuffetTime,
  getMealPlanBadgeClass,
  isMealPlanEntitled,
  matchesBuffetQuery,
  matchesBuffetTab,
} from "../src/staff/pos/BuffetCheckInView.js";

describe("Step 292: BuffetCheckInView — Buffet / Meal-Plan Attendance Check-Off Screen", () => {
  describe("1. Pure Domain Logic & Entitlement Calculation", () => {
    it("evaluates meal plan entitlement across breakfast, lunch, and dinner", () => {
      // AI & FB have all 3 meals included
      assert.strictEqual(isMealPlanEntitled("AI", "BREAKFAST"), true);
      assert.strictEqual(isMealPlanEntitled("AI", "LUNCH"), true);
      assert.strictEqual(isMealPlanEntitled("AI", "DINNER"), true);

      assert.strictEqual(isMealPlanEntitled("FB", "BREAKFAST"), true);
      assert.strictEqual(isMealPlanEntitled("FB", "LUNCH"), true);
      assert.strictEqual(isMealPlanEntitled("FB", "DINNER"), true);

      // HB includes Breakfast & Dinner only
      assert.strictEqual(isMealPlanEntitled("HB", "BREAKFAST"), true);
      assert.strictEqual(isMealPlanEntitled("HB", "LUNCH"), false);
      assert.strictEqual(isMealPlanEntitled("HB", "DINNER"), true);

      // BB includes Breakfast only
      assert.strictEqual(isMealPlanEntitled("BB", "BREAKFAST"), true);
      assert.strictEqual(isMealPlanEntitled("BB", "LUNCH"), false);
      assert.strictEqual(isMealPlanEntitled("BB", "DINNER"), false);

      // RO has zero meals included
      assert.strictEqual(isMealPlanEntitled("RO", "BREAKFAST"), false);
      assert.strictEqual(isMealPlanEntitled("RO", "LUNCH"), false);
      assert.strictEqual(isMealPlanEntitled("RO", "DINNER"), false);
    });

    it("computes accurate attendance KPIs over mock dataset", () => {
      const kpis = computeBuffetAttendanceKpis(DEFAULT_BUFFET_RECORDS);
      assert.strictEqual(kpis.totalInHouseRooms, 7);
      // Entitled rooms: 101 (3 pax), 104 (2 pax), 301 (1 pax), 304 (3 pax) = 9 expected
      assert.strictEqual(kpis.expectedPaxTotal, 9);
      // Checked in: 101 (3 pax), 301 (1 pax), CAB-02 (2 pax) = 6 pax checked in
      assert.strictEqual(kpis.checkedInPaxTotal, 6);
      assert.strictEqual(kpis.remainingPaxTotal, 3);
      assert.strictEqual(kpis.roWalkInsChargedCount, 1); // CAB-02
      assert.strictEqual(kpis.attendanceRatePercent, 67); // 6 / 9 = 67%
    });

    it("matches query strings across room numbers, guest names, and assigned tables", () => {
      const rec = DEFAULT_BUFFET_RECORDS[0];
      assert.ok(rec);
      assert.strictEqual(matchesBuffetQuery(rec, "101"), true);
      assert.strictEqual(matchesBuffetQuery(rec, "rohan"), true);
      assert.strictEqual(matchesBuffetQuery(rec, "table 04"), true);
      assert.strictEqual(matchesBuffetQuery(rec, "vance"), false);
      assert.strictEqual(matchesBuffetQuery(rec, ""), true);
    });

    it("matches filter tabs correctly", () => {
      const rec101 = DEFAULT_BUFFET_RECORDS[0]; // checked in, entitled
      const rec104 = DEFAULT_BUFFET_RECORDS[1]; // pending, entitled
      const rec205 = DEFAULT_BUFFET_RECORDS[3]; // RO, pending
      assert.ok(rec101 && rec104 && rec205);

      assert.strictEqual(matchesBuffetTab(rec101, "ALL"), true);
      assert.strictEqual(matchesBuffetTab(rec101, "CHECKED_IN"), true);
      assert.strictEqual(matchesBuffetTab(rec101, "PENDING"), false);
      assert.strictEqual(matchesBuffetTab(rec101, "ENTITLED_ONLY"), true);
      assert.strictEqual(matchesBuffetTab(rec101, "RO_WALK_IN"), false);

      assert.strictEqual(matchesBuffetTab(rec104, "PENDING"), true);
      assert.strictEqual(matchesBuffetTab(rec104, "CHECKED_IN"), false);

      assert.strictEqual(matchesBuffetTab(rec205, "RO_WALK_IN"), true);
      assert.strictEqual(matchesBuffetTab(rec205, "ENTITLED_ONLY"), false);
    });

    it("filters buffet records by combined search query and tab filter", () => {
      const results = filterBuffetRecords(DEFAULT_BUFFET_RECORDS, "10", "ALL");
      assert.strictEqual(results.length, 2); // 101 and 104

      const seatedResults = filterBuffetRecords(DEFAULT_BUFFET_RECORDS, "", "CHECKED_IN");
      assert.strictEqual(seatedResults.length, 3); // 101, 301, CAB-02
    });

    it("calculates statutory 4-stage compounding tax on RO walk-in buffet folio charge", () => {
      const dinnerTariff = DEFAULT_BUFFET_TARIFFS[2];
      assert.ok(dinnerTariff);
      // 2 Adults (6800 each) + 1 Child (3400 each) = 17,000 LKR base
      const charge = calculateBuffetFolioCharge(2, 1, dinnerTariff, 310);
      assert.strictEqual(charge.grossSubtotalLkr, 17000);
      assert.strictEqual(charge.serviceChargeLkr, 1700); // 10%
      assert.strictEqual(charge.tdlLkr, 187); // 1% on 18700
      assert.strictEqual(charge.ssclLkr, 467.5); // 2.5% on 18700
      assert.strictEqual(charge.vatLkr, 3483.81); // 18% on (18700 + 187 + 467.5)
      assert.strictEqual(charge.grandTotalLkr, 22838.31);
    });

    it("returns appropriate Apple Dynamic Color badges for meal plans", () => {
      assert.ok(getMealPlanBadgeClass("AI").includes("purple"));
      assert.ok(getMealPlanBadgeClass("FB").includes("indigo"));
      assert.ok(getMealPlanBadgeClass("HB").includes("blue"));
      assert.ok(getMealPlanBadgeClass("BB").includes("emerald"));
      assert.ok(getMealPlanBadgeClass("RO").includes("amber"));
    });

    it("formats ISO timestamps to short UTC string", () => {
      assert.strictEqual(formatBuffetTime("2026-10-20T19:15:00.000Z"), "19:15 UTC");
      assert.strictEqual(formatBuffetTime(""), "");
      assert.strictEqual(formatBuffetTime(undefined), "");
    });
  });

  describe("2. React Static Markup Rendering", () => {
    it("renders buffet check-in view with header, KPI cards, and room list", () => {
      const html = renderToStaticMarkup(
        React.createElement(BuffetCheckInView, {
          initialRecords: DEFAULT_BUFFET_RECORDS,
          initialServicePeriod: "DINNER",
        }),
      );

      assert.ok(html.includes("Buffet &amp; Meal Attendance"));
      assert.ok(html.includes("Expected Diners"));
      assert.ok(html.includes("101"));
      assert.ok(html.includes("Dr. Alistair Vance"));
      assert.ok(html.includes("Check In Pax"));
      assert.ok(html.includes("Post to Room Folio"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BuffetCheckInView, {
          initialRecords: DEFAULT_BUFFET_RECORDS,
          language: "si",
        }),
      );

      assert.ok(html.includes(BUFFET_TRANSLATIONS.si.title));
      assert.ok(html.includes(BUFFET_TRANSLATIONS.si.kpiExpected));
      assert.ok(html.includes(BUFFET_TRANSLATIONS.si.checkInButton));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BuffetCheckInView, {
          initialRecords: DEFAULT_BUFFET_RECORDS,
          language: "ta",
        }),
      );

      assert.ok(html.includes(BUFFET_TRANSLATIONS.ta.title));
      assert.ok(html.includes(BUFFET_TRANSLATIONS.ta.kpiExpected));
      assert.ok(html.includes(BUFFET_TRANSLATIONS.ta.checkInButton));
    });
  });
});
