/**
 * Unit Tests for Step 328: Banquet Hall & Outdoor Lawn Master Configurator (BanquetHallSetup.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetHallSetup,
  DEFAULT_BANQUET_HALLS,
  calculateHallSummary,
  filterHalls,
  formatLkr,
} from "../src/admin/banquets/index.js";

describe("Step 328: Banquet Hall & Outdoor Lawn Master Configurator (BanquetHallSetup.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Domain Helper Functions", () => {
    it("calculateHallSummary aggregates capacity metrics across all venues", () => {
      const summary = calculateHallSummary(DEFAULT_BANQUET_HALLS);
      assert.strictEqual(summary.totalHalls, 4);
      assert.strictEqual(summary.activeHalls, 4);
      // 450 (Grand Ballroom) + 200 (Kandyan Wing) + 600 (Garden Lawn) + 120 (Rooftop) = 1,370 pax
      assert.strictEqual(summary.totalMaxClusterPax, 1370);
      // 800 + 350 + 1000 + 200 = 2,350 pax
      assert.strictEqual(summary.totalMaxTheatrePax, 2350);
      assert.strictEqual(summary.indoorAcCount, 2);
      assert.strictEqual(summary.outdoorLawnCount, 1);
    });

    it("filterHalls filters venues by hallType category correctly", () => {
      const indoor = filterHalls(DEFAULT_BANQUET_HALLS, "INDOOR_AIR_CONDITIONED", "");
      assert.strictEqual(indoor.length, 2);
      assert.strictEqual(indoor[0]?.name, "Grand Ballroom");
      assert.strictEqual(indoor[1]?.name, "Kandyan Heritage Wing");

      const outdoor = filterHalls(DEFAULT_BANQUET_HALLS, "OUTDOOR_GARDEN_LAWN", "");
      assert.strictEqual(outdoor.length, 1);
      assert.strictEqual(outdoor[0]?.name, "Palm Garden & Coconut Grove");

      const rooftop = filterHalls(DEFAULT_BANQUET_HALLS, "ROOFTOP_TERRACE", "");
      assert.strictEqual(rooftop.length, 1);
      assert.strictEqual(rooftop[0]?.name, "Sunset Ocean Rooftop");
    });

    it("filterHalls searches venues by name, notes, or capacity", () => {
      const byName = filterHalls(DEFAULT_BANQUET_HALLS, "ALL", "Kandyan");
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0]?.name, "Kandyan Heritage Wing");

      const byCapacity = filterHalls(DEFAULT_BANQUET_HALLS, "ALL", "600");
      assert.strictEqual(byCapacity.length, 1);
      assert.strictEqual(byCapacity[0]?.name, "Palm Garden & Coconut Grove");

      const byNote = filterHalls(DEFAULT_BANQUET_HALLS, "ALL", "Ocean");
      assert.strictEqual(byNote.length, 2); // Garden Lawn & Sunset Rooftop
    });

    it("formatLkr formats currency with commas and 2 decimal places", () => {
      assert.strictEqual(formatLkr(25000), "25,000.00");
      assert.strictEqual(formatLkr(150000), "150,000.00");
      assert.strictEqual(formatLkr(0), "0.00");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Markup & Apple HIG Design Compliance
  // --------------------------------------------------------------------------
  describe("2. React Static Markup & Apple HIG Design Standards", () => {
    it("renders BanquetHallSetup with overview metrics and cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetHallSetup, {
          propertyName: "Galle Face Heritage Hotel & Ballrooms",
          language: "en",
        }),
      );

      assert.ok(html.includes('data-testid="banquet-hall-setup-page"'));
      assert.ok(html.includes("Banquet &amp; Wedding Hall Master Setup"));
      assert.ok(html.includes("Galle Face Heritage Hotel &amp; Ballrooms"));
      assert.ok(html.includes('data-testid="add-hall-modal-btn"'));

      // Grand Ballroom card
      assert.ok(html.includes('data-testid="banquet-hall-card-hall-grand-ballroom"'));
      assert.ok(html.includes("Grand Ballroom"));
      assert.ok(html.includes("450 pax"));
      assert.ok(html.includes("7 Hours"));
      assert.ok(html.includes("35,000.00"));
      assert.ok(html.includes("Poruwa Stage Setup"));
      assert.ok(html.includes("Bridal Suite"));
    });

    it("renders minimum 44x44pt touch targets on interactive buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetHallSetup, {
          language: "en",
        }),
      );

      // Verify touch target class
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes('data-testid="filter-tab-all"'));
      assert.ok(html.includes('data-testid="filter-tab-indoor"'));
      assert.ok(html.includes('data-testid="filter-tab-lawn"'));
      assert.ok(html.includes('data-testid="filter-tab-rooftop"'));
      assert.ok(html.includes('data-testid="banquet-hall-search-input"'));
    });

    it("renders trilingual localization in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(BanquetHallSetup, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("උත්සව ශාලා හා එළිමහන් භූමි කළමනාකරණය"));
      assert.ok(htmlSi.includes("නව ශාලාවක් එක් කරන්න"));
      assert.ok(htmlSi.includes("පෝරු මණ්ඩප පහසුකම්"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(BanquetHallSetup, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("மண்டபம் &amp; வெளிப்புற புல்வெளி முதன்மை அமைப்பு"));
      assert.ok(htmlTa.includes("மண்டபம் சேர்க்க"));
      assert.ok(htmlTa.includes("பொறுவை மேடை வசதி"));
    });
  });
});
