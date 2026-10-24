import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AmenityUsageCard,
  DEFAULT_AMENITY_RECORDS,
  calculateAmenityUsageSummary,
  formatAmenityLkr,
  getAmenityUsageText,
  isAmenityMatchingFilter,
  resolveAmenityCategoryBadge,
} from "../src/admin/housekeeping/AmenityUsageCard.js";

const noop = () => undefined;

describe("Step 318: Amenity Consumption & Eco-Refill Cost Tracker (AmenityUsageCard.tsx)", () => {
  describe("1. Pure Financial & Ecological Calculations", () => {
    it("formats LKR currency amounts with 2 decimal places and Rs. prefix", () => {
      assert.equal(formatAmenityLkr(34080), "Rs. 34,080.00");
      assert.equal(formatAmenityLkr(95.5), "Rs. 95.50");
      assert.equal(formatAmenityLkr(0), "Rs. 0.00");
      assert.equal(formatAmenityLkr(Number.NaN), "Rs. 0.00");
      assert.equal(formatAmenityLkr(Number.POSITIVE_INFINITY), "Rs. 0.00");
    });

    it("calculates total consumption costs, variance costs, and CPOR accurately", () => {
      const summary = calculateAmenityUsageSummary(DEFAULT_AMENITY_RECORDS, 30);
      assert.equal(summary.totalItemsTracked, 5);
      // Sum of totalCostLkr: 34080 + 11210 + 9490 + 10640 + 10500 = 75920
      assert.equal(summary.totalPlacedCostLkr, 75920);
      // Variance costs:
      // am-001: 0.8 * 2400 = 1920
      // am-002: 2 * 95 = 190
      // am-003: 4 * 65 = 260
      // am-004: 2 * 280 = 560
      // am-005: 0 * 420 = 0
      // Total variance cost: 1920 + 190 + 260 + 560 + 0 = 2930
      assert.equal(summary.totalVarianceCostLkr, 2930);
      // Plastic bottles avoided: 450 + 118 + 0 + 38 + 0 = 606
      assert.equal(summary.totalPlasticBottlesAvoided, 606);
      assert.equal(summary.occupiedRoomNights, 30);
      // CPOR: 75920 / 30 = 2530.67
      assert.equal(summary.costPerOccupiedRoomLkr, 2530.67);
    });

    it("handles zero occupied rooms gracefully by using fallback floor of 1", () => {
      const summary = calculateAmenityUsageSummary(DEFAULT_AMENITY_RECORDS, 0);
      assert.equal(summary.occupiedRoomNights, 1);
      assert.equal(summary.costPerOccupiedRoomLkr, 75920);
    });

    it("returns zero metrics when record list is empty", () => {
      const summary = calculateAmenityUsageSummary([], 25);
      assert.equal(summary.totalItemsTracked, 0);
      assert.equal(summary.totalPlacedCostLkr, 0);
      assert.equal(summary.totalVarianceCostLkr, 0);
      assert.equal(summary.totalPlasticBottlesAvoided, 0);
      assert.equal(summary.costPerOccupiedRoomLkr, 0);
    });
  });

  describe("2. Eco-Category Badges and Filtering", () => {
    it("resolves distinctive icons and styles for all 5 amenity categories", () => {
      const t = getAmenityUsageText("en");

      const bath = resolveAmenityCategoryBadge("BATH_BODY_ECO", t);
      assert.equal(bath.icon, "Bath");
      assert.equal(bath.label, "Ayurvedic Bulk Dispenser");
      assert.match(bath.style, /emerald/);

      const water = resolveAmenityCategoryBadge("GLASS_WATER", t);
      assert.equal(water.icon, "Water");
      assert.equal(water.label, "Reusable Glass Bottle");
      assert.match(water.style, /cyan/);

      const tea = resolveAmenityCategoryBadge("BEVERAGE_CEYLON", t);
      assert.equal(tea.icon, "Tea");
      assert.equal(tea.label, "Ceylon Artisan Tea");
      assert.match(tea.style, /amber/);

      const hygiene = resolveAmenityCategoryBadge("ECO_HYGIENE", t);
      assert.equal(hygiene.icon, "Bamboo");
      assert.equal(hygiene.label, "Compostable Bamboo");
      assert.match(hygiene.style, /lime/);

      const aroma = resolveAmenityCategoryBadge("AROMA_WELLNESS", t);
      assert.equal(aroma.icon, "Eco");
      assert.equal(aroma.label, "Citronella & Wellness");
      assert.match(aroma.style, /purple/);
    });

    it("filters records by category and multi-token search queries", () => {
      const sample = DEFAULT_AMENITY_RECORDS[0]; // Lemongrass Bulk Shampoo, GIN-2026-10-881
      assert.ok(sample, "sample record must exist in defaults");

      assert.equal(isAmenityMatchingFilter(sample, "ALL", ""), true);
      assert.equal(isAmenityMatchingFilter(sample, "BATH_BODY_ECO", ""), true);
      assert.equal(isAmenityMatchingFilter(sample, "GLASS_WATER", ""), false);

      // Search by partial name
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "shampoo"), true);
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "Mandarin"), true);

      // Search by GIN voucher
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "881"), true);
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "GIN-2026"), true);

      // Search by notes
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "ocean villas"), true);

      // Non-matching query
      assert.equal(isAmenityMatchingFilter(sample, "ALL", "plastic toothbrushes"), false);
    });
  });

  describe("3. Trilingual Localization", () => {
    it("provides complete translations in English, Sinhala, and Tamil", () => {
      const en = getAmenityUsageText("en");
      const si = getAmenityUsageText("si");
      const ta = getAmenityUsageText("ta");

      assert.match(en.title, /Amenity Consumption/);
      assert.match(si.title, /කාමර පහසුකම්/);
      assert.match(ta.title, /அறை வசதிகள்/);

      assert.equal(en.plasticAvoidedLabel, "Plastic Bottles Saved");
      assert.equal(si.plasticAvoidedLabel, "ඉතිරි කළ ප්ලාස්ටික් බෝතල්");
      assert.equal(ta.plasticAvoidedLabel, "தவிர்க்கப்பட்ட பிளாஸ்டிக்");
    });
  });

  describe("4. React Static Markup & Apple HIG Design System", () => {
    it("renders Apple Liquid Glass container and tabular numerals", () => {
      const html = renderToStaticMarkup(
        React.createElement(AmenityUsageCard, {
          propertyTitle: "Uga Ulagalla Eco Resort",
          occupiedRoomsCount: 25,
          onIssueGinVoucher: noop,
        }),
      );

      assert.match(html, /apple-liquid-glass/);
      assert.match(html, /tabular-nums-lkr/);
      assert.match(html, /Uga Ulagalla Eco Resort/);
      assert.match(html, /Plastic Bottles Saved/);
      assert.match(html, /Lemongrass &amp; Mandarin Bulk Shampoo Refill/);
      assert.match(html, /GIN-2026-10-881/);
    });

    it("verifies minimum touch targets comply with Apple HIG (>= 44pt)", () => {
      const html = renderToStaticMarkup(
        React.createElement(AmenityUsageCard, {
          language: "en",
        }),
      );

      // Check min-h-[44px] is present on filter tabs and action buttons
      assert.match(html, /min-h-\[44px\]/);
    });

    it("renders Sinhala localization in static markup", () => {
      const html = renderToStaticMarkup(
        React.createElement(AmenityUsageCard, {
          language: "si",
        }),
      );

      assert.match(html, /කාමර පහසුකම් පරිභෝජන/);
      assert.match(html, /ඉතිරි කළ ප්ලාස්ටික් බෝතල්/);
    });
  });
});
