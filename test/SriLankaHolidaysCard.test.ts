/**
 * Unit Test Suite for Step 431: SriLankaHolidaysCard
 * (`test/SriLankaHolidaysCard.test.ts`)
 *
 * Implements Step 431 (Phase 18.06) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Sri Lankan Public, Bank, Poya & Mercantile Holiday Calendar Configurator (`SriLankaHolidaysCard.tsx`).
 *
 * Validates:
 * 1. Statutory holiday calendar containing all Full Moon Poya Days and Mercantile Holidays.
 * 2. Statutory wage multiplier calculation (1.5x for Poya, 2.0x for Mercantile under Shop & Office Act).
 * 3. Holiday lookup by date (`findHolidayByDate`).
 * 4. Filter predicate matching (`matchesHolidayFilters`).
 * 5. React 19 SSR rendering of holiday card, category filters, and bento summary stats.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HOLIDAY_PAY_SETTINGS,
  HOLIDAY_CATEGORY_DEFINITIONS,
  HOLIDAY_FILTER_OPTIONS,
  SRI_LANKA_2026_HOLIDAYS,
  SriLankaHolidaysCard,
  calculateHolidayPayMultiplier,
  findHolidayByDate,
  matchesHolidayFilters,
} from "../src/admin/hr/SriLankaHolidaysCard.js";

describe("Step 431: Sri Lankan Statutory Holiday Calendar Configurator (SriLankaHolidaysCard.tsx)", () => {
  describe("1. Statutory Holiday Calendar Pre-loading", () => {
    it("pre-loads all 12 Full Moon Poya days for 2026", () => {
      const poyaHolidays = SRI_LANKA_2026_HOLIDAYS.filter((h) => h.isPoya);
      assert.ok(poyaHolidays.length >= 12);

      const poyaNames = poyaHolidays.map((h) => h.name);
      assert.ok(poyaNames.some((n) => n.includes("Duruthu")));
      assert.ok(poyaNames.some((n) => n.includes("Navam")));
      assert.ok(poyaNames.some((n) => n.includes("Medin")));
      assert.ok(poyaNames.some((n) => n.includes("Bak")));
      assert.ok(poyaNames.some((n) => n.includes("Vesak")));
      assert.ok(poyaNames.some((n) => n.includes("Poson")));
      assert.ok(poyaNames.some((n) => n.includes("Esala")));
      assert.ok(poyaNames.some((n) => n.includes("Nikini")));
      assert.ok(poyaNames.some((n) => n.includes("Binara")));
      assert.ok(poyaNames.some((n) => n.includes("Vap")));
      assert.ok(poyaNames.some((n) => n.includes("Il")));
      assert.ok(poyaNames.some((n) => n.includes("Unduvap")));
    });

    it("pre-loads mandatory statutory Mercantile holidays under Shop & Office Act", () => {
      const mercantile = SRI_LANKA_2026_HOLIDAYS.filter((h) => h.isMercantile);
      assert.ok(mercantile.length >= 7);

      const names = mercantile.map((h) => h.name);
      assert.ok(names.some((n) => n.includes("Thai Pongal")));
      assert.ok(names.some((n) => n.includes("Independence")));
      assert.ok(
        names.some((n) => n.includes("Sinhala &amp; Tamil") || n.includes("Sinhala & Tamil")),
      );
      assert.ok(names.some((n) => n.includes("May Day")));
      assert.ok(names.some((n) => n.includes("Christmas")));
    });

    it("defines statutory category metadata with Apple HIG status badge colors", () => {
      assert.equal(HOLIDAY_CATEGORY_DEFINITIONS.POYA.color, "indigo");
      assert.equal(HOLIDAY_CATEGORY_DEFINITIONS.POYA.defaultMultiplier, 1.5);

      assert.equal(HOLIDAY_CATEGORY_DEFINITIONS.MERCANTILE.color, "green");
      assert.equal(HOLIDAY_CATEGORY_DEFINITIONS.MERCANTILE.defaultMultiplier, 2.0);
    });
  });

  describe("2. Statutory Wage Multipliers & Date Lookup", () => {
    it("finds statutory holiday accurately by date", () => {
      const thaiPongal = findHolidayByDate("2026-01-14");
      assert.ok(thaiPongal);
      assert.equal(thaiPongal.name, "Tamil Thai Pongal Day");
      assert.equal(thaiPongal.isMercantile, true);

      const nonHoliday = findHolidayByDate("2026-01-15");
      assert.equal(nonHoliday, undefined);
    });

    it("calculates statutory 2.0x holiday pay multiplier for Mercantile holidays", () => {
      // Thai Pongal (2026-01-14)
      const multiplier = calculateHolidayPayMultiplier("2026-01-14", DEFAULT_HOLIDAY_PAY_SETTINGS);
      assert.equal(multiplier, 2.0);
    });

    it("calculates statutory 1.5x holiday pay multiplier for Full Moon Poya days", () => {
      // Duruthu Poya (2026-01-03)
      const multiplier = calculateHolidayPayMultiplier("2026-01-03", DEFAULT_HOLIDAY_PAY_SETTINGS);
      assert.equal(multiplier, 1.5);
    });

    it("returns standard 1.0x normal wage rate for regular working days", () => {
      const normalDay = calculateHolidayPayMultiplier("2026-01-05", DEFAULT_HOLIDAY_PAY_SETTINGS);
      assert.equal(normalDay, 1.0);
    });

    it("respects custom adjusted multiplier settings", () => {
      const premiumSettings = {
        ...DEFAULT_HOLIDAY_PAY_SETTINGS,
        mercantileMultiplier: 2.5,
        poyaMultiplier: 2.0,
      };
      assert.equal(calculateHolidayPayMultiplier("2026-01-14", premiumSettings), 2.5);
      assert.equal(calculateHolidayPayMultiplier("2026-01-03", premiumSettings), 2.0);
    });
  });

  describe("3. Filter Predicate Matching", () => {
    it("filters holidays by category correctly", () => {
      const poyaSample = SRI_LANKA_2026_HOLIDAYS.find((h) => h.category === "POYA");
      assert.ok(poyaSample);
      assert.equal(matchesHolidayFilters(poyaSample, "POYA", ""), true);
      assert.equal(matchesHolidayFilters(poyaSample, "MERCANTILE", ""), false);
      assert.equal(matchesHolidayFilters(poyaSample, "ALL", ""), true);
    });

    it("searches holidays by English, Sinhala, Tamil, or date", () => {
      const sample = SRI_LANKA_2026_HOLIDAYS.find((h) => h.name.includes("Vesak"));
      assert.ok(sample);
      assert.equal(matchesHolidayFilters(sample, "ALL", "Vesak"), true);
      assert.equal(matchesHolidayFilters(sample, "ALL", "වෙසක්"), true);
      assert.equal(matchesHolidayFilters(sample, "ALL", "2026-05"), true);
      assert.equal(matchesHolidayFilters(sample, "ALL", "Halloween"), false);
    });
  });

  describe("4. React 19 SSR Component Rendering", () => {
    it("renders SriLankaHolidaysCard without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(SriLankaHolidaysCard, {
          initialHolidays: SRI_LANKA_2026_HOLIDAYS,
          initialSettings: DEFAULT_HOLIDAY_PAY_SETTINGS,
        }),
      );

      assert.ok(html.includes("Sri Lankan Statutory Holiday Calendar"));
      assert.ok(html.includes("Phase 18.06"));
      assert.ok(html.includes("Total Poya Days (2026)"));
      assert.ok(html.includes("Mercantile Holidays"));
      assert.ok(html.includes("Duruthu Full Moon Poya Day"));
      assert.ok(html.includes("Tamil Thai Pongal Day"));
      assert.ok(html.includes("Add Gazetted Holiday"));
    });

    it("renders segmented control options for category filtering", () => {
      assert.ok(HOLIDAY_FILTER_OPTIONS.length >= 4);

      const html = renderToStaticMarkup(React.createElement(SriLankaHolidaysCard, {}));
      assert.ok(html.includes("All Holidays"));
      assert.ok(html.includes("Full Moon Poya"));
      assert.ok(html.includes("Mercantile"));
    });
  });
});
