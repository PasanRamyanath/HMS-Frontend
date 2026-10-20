/**
 * Unit Tests for Step 333: Sri Lankan Wedding Menu Package Customizer (BanquetMenuSelector.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetMenuSelector,
  DEFAULT_CATEGORY_QUOTAS,
  DEFAULT_LIVE_STATIONS,
  DEFAULT_MENU_ITEMS,
  areAllQuotasFulfilled,
  calculateLiveStationsAddOn,
  checkCategoryQuota,
} from "../src/admin/banquets/index.js";

describe("Step 333: Sri Lankan Wedding Menu Package Customizer (BanquetMenuSelector.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Quota Checking & Add-On Calculators
  // --------------------------------------------------------------------------
  describe("1. Pure Quota & Add-On Calculators", () => {
    it("checkCategoryQuota determines fulfillment for a specific course", () => {
      // 2 rice items selected
      const fulfilled = checkCategoryQuota(
        "RICE_DISHES",
        ["rc-01", "rc-02"],
        DEFAULT_MENU_ITEMS,
        DEFAULT_CATEGORY_QUOTAS,
      );
      assert.strictEqual(fulfilled.currentCount, 2);
      assert.strictEqual(fulfilled.maxAllowed, 2);
      assert.strictEqual(fulfilled.isFulfilled, true);

      // Only 1 meat main selected (requires 3)
      const underQuota = checkCategoryQuota(
        "MAINS_MEAT_SEAFOOD",
        ["mn-01"],
        DEFAULT_MENU_ITEMS,
        DEFAULT_CATEGORY_QUOTAS,
      );
      assert.strictEqual(underQuota.currentCount, 1);
      assert.strictEqual(underQuota.maxAllowed, 3);
      assert.strictEqual(underQuota.isFulfilled, false);
    });

    it("areAllQuotasFulfilled returns true only when all courses meet quotas", () => {
      const fullMenu = [
        "wd-01", // 1 welcome drink
        "sp-01", // 1 soup
        "rc-01",
        "rc-02", // 2 rice
        "nd-01", // 1 noodle
        "mn-01",
        "mn-02",
        "mn-03", // 3 mains
        "vg-01",
        "vg-02", // 2 veg
        "sl-01",
        "sl-02",
        "sl-03", // 3 salads
        "ds-01",
        "ds-02",
        "ds-03",
        "ds-04", // 4 desserts
      ];

      assert.strictEqual(
        areAllQuotasFulfilled(fullMenu, DEFAULT_MENU_ITEMS, DEFAULT_CATEGORY_QUOTAS),
        true,
      );

      // Incomplete menu (missing 1 dessert)
      const incompleteMenu = fullMenu.slice(0, -1);
      assert.strictEqual(
        areAllQuotasFulfilled(incompleteMenu, DEFAULT_MENU_ITEMS, DEFAULT_CATEGORY_QUOTAS),
        false,
      );
    });

    it("calculateLiveStationsAddOn calculates per-pax add-ons accurately", () => {
      // None selected
      assert.strictEqual(calculateLiveStationsAddOn([], DEFAULT_LIVE_STATIONS), 0);

      // Hoppers (750) + Kottu (950) = 1,700 LKR / pax
      const addOn = calculateLiveStationsAddOn(
        ["live-hoppers", "live-kottu"],
        DEFAULT_LIVE_STATIONS,
      );
      assert.strictEqual(addOn, 1700);

      // Roast lamb carvery (1,500)
      const carvery = calculateLiveStationsAddOn(["live-carvery"], DEFAULT_LIVE_STATIONS);
      assert.strictEqual(carvery, 1500);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Server-Side Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    it("renders default menu customizer with package tier and financial breakdown", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetMenuSelector, {
          packageTierName: "Platinum Royal Wedding Package",
          basePricePerPaxLkr: 7500,
          guestPaxCount: 250,
          language: "en",
        }),
      );

      assert.ok(html.includes("Platinum Royal Wedding Package"));
      assert.ok(html.includes("250 Guaranteed Pax"));
      assert.ok(html.includes("Base Plate Rate"));
      assert.ok(html.includes("Live Stations Add-on"));
      assert.ok(html.includes("Total Plate Rate / Guest"));
      assert.ok(html.includes("Save Wedding Menu Package"));
    });

    it("renders course category segmented buttons with quota counters", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetMenuSelector, {
          language: "en",
        }),
      );

      assert.ok(html.includes("Welcome Drinks"));
      assert.ok(html.includes("Rice Specialties"));
      assert.ok(
        html.includes("Mains (Meat &amp; Seafood)") || html.includes("Mains (Meat & Seafood)"),
      );
      assert.ok(html.includes("Desserts &amp; Fruits") || html.includes("Desserts & Fruits"));
    });

    it("renders live culinary action stations with theatrical descriptions", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetMenuSelector, {
          language: "en",
        }),
      );

      assert.ok(html.includes("Live Action Culinary Stations"));
      assert.ok(
        html.includes("Live Egg &amp; Cheese Hopper Station") ||
          html.includes("Live Egg & Cheese Hopper Station"),
      );
      assert.ok(html.includes("Live Rhythmic Kottu Roti Bar"));
      assert.ok(html.includes("Live Mongolian BBQ Wok Station"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetMenuSelector, {
          language: "si",
        }),
      );

      assert.ok(html.includes("මංගල භෝජන සංග්‍රහ මෙනු සැකැස්ම"));
      assert.ok(html.includes("මූලික පිඟානක මිල"));
      assert.ok(html.includes("සජීවී ආහාර පිසීමේ සංදර්ශන"));
      assert.ok(html.includes("මෙනු පැකේජය සුරකින්න"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetMenuSelector, {
          language: "ta",
        }),
      );

      assert.ok(html.includes("திருமண உணவுப் பொதி கட்டமைப்பு"));
      assert.ok(html.includes("அடிப்படை தட்டு விலை"));
      assert.ok(html.includes("நேரடி சமையல் நிலையங்கள்"));
      assert.ok(html.includes("உணவுப் பொதியைச் சேமி"));
    });
  });
});
