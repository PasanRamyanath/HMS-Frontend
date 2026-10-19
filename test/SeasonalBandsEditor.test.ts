import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SRI_LANKAN_SEASON_PRESETS,
  type SeasonType,
  type SeasonalBand,
  SeasonalBandsEditor,
  type SeasonalBandsEditorProps,
  calculateSeasonalRate,
  findActiveSeasonBand,
  formatAdjustmentLabel,
  getSeasonBadgeColor,
  getSeasonTypeLabel,
  isDateInSeasonalBand,
  validateSeasonalBand,
} from "../src/admin/rooms/SeasonalBandsEditor.js";

describe("Sri Lankan Seasonal Calendar Band Editor (SeasonalBandsEditor.tsx)", () => {
  describe("Domain Validation (validateSeasonalBand)", () => {
    it("rejects empty or whitespace-only band names", () => {
      const res1 = validateSeasonalBand({
        name: "",
        startDate: "2026-12-15",
        endDate: "2027-01-15",
        minimumStayNights: 2,
        adjustmentValue: 1.25,
      });
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error ?? "", /cannot be empty/i);

      const res2 = validateSeasonalBand({
        name: "   ",
        startDate: "2026-12-15",
        endDate: "2027-01-15",
        minimumStayNights: 2,
        adjustmentValue: 1.25,
      });
      assert.strictEqual(res2.isValid, false);
    });

    it("requires both start and end dates", () => {
      const res = validateSeasonalBand({
        name: "Peak",
        startDate: "",
        endDate: "2027-01-15",
        minimumStayNights: 2,
        adjustmentValue: 1.25,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /dates are required/i);
    });

    it("rejects when start date is after end date", () => {
      const res = validateSeasonalBand({
        name: "Inverted Band",
        startDate: "2027-02-01",
        endDate: "2027-01-01",
        minimumStayNights: 1,
        adjustmentValue: 1.1,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /must precede or match end date/i);
    });

    it("rejects minimum stay < 1 night", () => {
      const res = validateSeasonalBand({
        name: "Day pass",
        startDate: "2027-01-01",
        endDate: "2027-01-10",
        minimumStayNights: 0,
        adjustmentValue: 1.1,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /at least 1 night/i);
    });

    it("rejects negative percentage multiplier", () => {
      const res = validateSeasonalBand({
        name: "Invalid Negative",
        startDate: "2027-01-01",
        endDate: "2027-01-10",
        minimumStayNights: 1,
        rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
        adjustmentValue: -0.2,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /cannot be negative/i);
    });

    it("accepts valid Sri Lankan seasonal band configuration", () => {
      const firstPreset = SRI_LANKAN_SEASON_PRESETS[0];
      assert.ok(firstPreset);
      const res = validateSeasonalBand(firstPreset);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });
  });

  describe("Seasonal Rate Calculation (calculateSeasonalRate)", () => {
    const euroPeakBand: SeasonalBand = {
      id: "test-peak",
      name: "Euro Peak",
      seasonType: "SUPER_PEAK",
      startDate: "2026-12-15",
      endDate: "2027-01-15",
      rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
      adjustmentValue: 1.4, // +40%
      minimumStayNights: 3,
      isActive: true,
    };

    it("accurately applies percentage multiplier to LKR amounts", () => {
      // 50,000 * 1.4 = 70,000
      const rateLkr = calculateSeasonalRate(50000, euroPeakBand, "LKR");
      assert.strictEqual(rateLkr, 70000);
    });

    it("accurately applies percentage multiplier to USD amounts with 2-decimal rounding", () => {
      // 175.50 * 1.4 = 245.70
      const rateUsd = calculateSeasonalRate(175.5, euroPeakBand, "USD");
      assert.strictEqual(rateUsd, 245.7);
    });

    it("returns unmodified base rate if band is inactive", () => {
      const inactiveBand: SeasonalBand = { ...euroPeakBand, isActive: false };
      assert.strictEqual(calculateSeasonalRate(50000, inactiveBand, "LKR"), 50000);
      assert.strictEqual(calculateSeasonalRate(150, inactiveBand, "USD"), 150);
    });

    it("applies fixed amount LKR adjustments accurately", () => {
      const fixedLkrBand: SeasonalBand = {
        ...euroPeakBand,
        rateAdjustmentType: "FIXED_AMOUNT_LKR",
        adjustmentValue: 12500,
      };
      assert.strictEqual(calculateSeasonalRate(40000, fixedLkrBand, "LKR"), 52500);
      // Fixed LKR does not modify USD currency
      assert.strictEqual(calculateSeasonalRate(150, fixedLkrBand, "USD"), 150);
    });

    it("applies fixed amount USD adjustments accurately", () => {
      const fixedUsdBand: SeasonalBand = {
        ...euroPeakBand,
        rateAdjustmentType: "FIXED_AMOUNT_USD",
        adjustmentValue: 45.5,
      };
      assert.strictEqual(calculateSeasonalRate(150, fixedUsdBand, "USD"), 195.5);
      // Fixed USD does not modify LKR currency
      assert.strictEqual(calculateSeasonalRate(40000, fixedUsdBand, "LKR"), 40000);
    });
  });

  describe("Calendar Date Matching & Prioritization (findActiveSeasonBand)", () => {
    it("correctly identifies whether a date falls within a seasonal band", () => {
      const band = SRI_LANKAN_SEASON_PRESETS[0]; // 2026-12-15 to 2027-01-15
      assert.ok(band);
      assert.strictEqual(isDateInSeasonalBand("2026-12-25", band), true);
      assert.strictEqual(isDateInSeasonalBand("2026-12-15", band), true);
      assert.strictEqual(isDateInSeasonalBand("2027-01-15", band), true);
      assert.strictEqual(isDateInSeasonalBand("2026-12-14", band), false);
      assert.strictEqual(isDateInSeasonalBand("2027-01-16", band), false);
    });

    it("matches active season band for Christmas / New Year", () => {
      const match = findActiveSeasonBand("2026-12-31", SRI_LANKAN_SEASON_PRESETS);
      assert.ok(match);
      assert.strictEqual(match?.seasonType, "SUPER_PEAK");
      assert.strictEqual(match?.id, "preset-euro-winter-super-peak");
    });

    it("matches active season band for Bak Maha Avurudu (New Year)", () => {
      const match = findActiveSeasonBand("2027-04-14", SRI_LANKAN_SEASON_PRESETS);
      assert.ok(match);
      assert.strictEqual(match?.seasonType, "SUPER_PEAK");
      assert.strictEqual(match?.id, "preset-avurudu-peak");
    });

    it("matches active season band for South-West Monsoon low season", () => {
      const match = findActiveSeasonBand("2027-05-20", SRI_LANKAN_SEASON_PRESETS);
      assert.ok(match);
      assert.strictEqual(match?.seasonType, "OFF_PEAK");
      assert.strictEqual(match?.adjustmentValue, 0.8);
    });

    it("returns null when no seasonal band covers the target date", () => {
      const match = findActiveSeasonBand("2028-02-15", SRI_LANKAN_SEASON_PRESETS);
      assert.strictEqual(match, null);
    });
  });

  describe("Formatting and Presentation Helpers", () => {
    it("formats percentage multipliers and fixed amounts clearly", () => {
      const basePreset = SRI_LANKAN_SEASON_PRESETS[0];
      assert.ok(basePreset);
      const p1 = formatAdjustmentLabel({
        ...basePreset,
        adjustmentValue: 1.4,
      });
      assert.strictEqual(p1, "+40% (1.40x)");

      const p2 = formatAdjustmentLabel({
        ...basePreset,
        adjustmentValue: 0.75,
      });
      assert.strictEqual(p2, "-25% (0.75x)");

      const p3 = formatAdjustmentLabel({
        ...basePreset,
        rateAdjustmentType: "FIXED_AMOUNT_LKR",
        adjustmentValue: 15000,
      });
      assert.match(p3, /\+LKR\s*15,000/);

      const p4 = formatAdjustmentLabel({
        ...basePreset,
        rateAdjustmentType: "FIXED_AMOUNT_USD",
        adjustmentValue: 50,
      });
      assert.strictEqual(p4, "+$50.00 USD");
    });

    it("maps all season types to appropriate badges and labels", () => {
      const types: SeasonType[] = ["SUPER_PEAK", "PEAK", "SHOULDER", "OFF_PEAK"];
      for (const t of types) {
        assert.ok(getSeasonBadgeColor(t));
        assert.ok(getSeasonTypeLabel(t));
      }
    });
  });

  describe("Component Static Rendering & Contract", () => {
    it("renders SeasonalBandsEditor with default Sri Lankan presets without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeasonalBandsEditor, {} as SeasonalBandsEditorProps),
      );
      assert.ok(html.includes("Seasonal Calendar Band &amp; Multiplier Editor"));
      assert.ok(html.includes("European Winter Super Peak"));
      assert.ok(html.includes("Bak Maha Avurudu"));
      assert.ok(html.includes("Live Seasonal Rate Simulator"));
      assert.ok(html.includes("Restore Sri Lankan Presets"));
    });

    it("renders readOnly mode without mutating controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(SeasonalBandsEditor, {
          readOnly: true,
        } as SeasonalBandsEditorProps),
      );
      assert.ok(!html.includes("Restore Sri Lankan Presets"));
      assert.ok(!html.includes("+ Add Seasonal Band"));
    });
  });
});
