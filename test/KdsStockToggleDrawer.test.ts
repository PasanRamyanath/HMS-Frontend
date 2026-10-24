/**
 * Unit Tests for Step 281: Chef 1-Tap '86 Item' Quick Out-of-Stock Toggle Drawer (KdsStockToggleDrawer.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_KDS_STOCK_ITEMS,
  type KdsStockItem,
  KdsStockToggleDrawer,
  type KdsStockToggleDrawerProps,
  filterStockItems,
  getStationLabel,
} from "../src/staff/kds/index.js";

describe("Step 281: Chef 1-Tap '86 Item' Quick Toggle Drawer (KdsStockToggleDrawer.tsx)", () => {
  const noop = () => {
    // test noop
  };

  // --------------------------------------------------------------------------
  // 1. Pure Helper Functions & Trilingual Station Labels
  // --------------------------------------------------------------------------
  describe("1. Station Labels & Search Filtering", () => {
    it("returns accurate station labels across English, Sinhala, and Tamil", () => {
      assert.strictEqual(getStationLabel("CURRY_STATION", "en"), "Curry Station");
      assert.strictEqual(getStationLabel("CURRY_STATION", "si"), "කරපිංචා / කරි");
      assert.strictEqual(getStationLabel("CURRY_STATION", "ta"), "கறி பிரிவு");

      assert.strictEqual(getStationLabel("SEAFOOD", "en"), "Fresh Seafood");
      assert.strictEqual(getStationLabel("SEAFOOD", "si"), "මුහුදු ආහාර");
      assert.strictEqual(getStationLabel("SEAFOOD", "ta"), "கடல் உணவு");

      assert.strictEqual(getStationLabel("HOPPERS_ROTI", "en"), "Hoppers & Roti");
      assert.strictEqual(getStationLabel("BAR_BOT", "en"), "Bar BOT Drinks");
    });

    it("filters stock items by station category", () => {
      const seafood = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "", "SEAFOOD");
      assert.strictEqual(seafood.length, 1);
      assert.strictEqual(seafood[0]?.name, "Jaffna Lagoon Crab Curry");

      const hoppers = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "", "HOPPERS_ROTI");
      assert.strictEqual(hoppers.length, 2);
    });

    it("searches items by English, Sinhala, or Tamil name substring", () => {
      // English match
      const crabEn = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "crab", "ALL");
      assert.strictEqual(crabEn.length, 1);
      assert.strictEqual(crabEn[0]?.name, "Jaffna Lagoon Crab Curry");

      // Sinhala match: කකුළු (Crab)
      const crabSi = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "කකුළු", "ALL");
      assert.strictEqual(crabSi.length, 1);
      assert.strictEqual(crabSi[0]?.name, "Jaffna Lagoon Crab Curry");

      // Tamil match: ஆப்பம் (Appam / Hopper)
      const hopperTa = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "ஆப்பம்", "ALL");
      assert.strictEqual(hopperTa.length, 1);
      assert.strictEqual(hopperTa[0]?.name, "Egg Hopper Set (3 Hoppers + 1 Egg)");

      // No match
      const empty = filterStockItems(DEFAULT_KDS_STOCK_ITEMS, "Nonexistent Pizza", "ALL");
      assert.strictEqual(empty.length, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Rendering & Drawer Interactivity
  // --------------------------------------------------------------------------
  describe("2. React Static Rendering & Drawer Controls", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsStockToggleDrawer, {
          isOpen: false,
          onClose: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders slide-over drawer when isOpen is true with stock item controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsStockToggleDrawer, {
          isOpen: true,
          onClose: noop,
        }),
      );

      assert.ok(html.includes('data-testid="kds-stock-toggle-drawer"'));
      assert.ok(html.includes("Chef 86 Item Quick Toggle"));
      assert.ok(html.includes("Search dish or beverage..."));

      // Items rendered
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("IN STOCK"));
      assert.ok(html.includes("86 Item"));

      // 86'd out of stock item (King Coconut)
      assert.ok(html.includes("Mirissa King Coconut (Thambili)"));
      assert.ok(html.includes("86&#x27;D (OUT)"));
      assert.ok(html.includes("Restore"));
      assert.ok(html.includes("Daily Tree Harvest Depleted"));
    });

    it("renders station filter buttons in header", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsStockToggleDrawer, {
          isOpen: true,
          onClose: noop,
        }),
      );

      assert.ok(html.includes("All Stations"));
      assert.ok(html.includes("Curry Station"));
      assert.ok(html.includes("Grill &amp; Wok"));
      assert.ok(html.includes("Fresh Seafood"));
      assert.ok(html.includes("Hoppers &amp; Roti"));
      assert.ok(html.includes("Bar BOT Drinks"));
    });

    it("renders in Sinhala and Tamil localization", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(KdsStockToggleDrawer, {
          isOpen: true,
          onClose: noop,
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("කෑම තොග තත්ත්වය (86)"));
      assert.ok(htmlSi.includes("තොග ඇත"));
      assert.ok(htmlSi.includes("ඉවරයි (86)"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(KdsStockToggleDrawer, {
          isOpen: true,
          onClose: noop,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("உணவு இருப்பு (86)"));
      assert.ok(htmlTa.includes("உள்ளது"));
      assert.ok(htmlTa.includes("தீர்ந்தது (86)"));
    });

    it("validates constructible types and interfaces", () => {
      const item: KdsStockItem = {
        id: "test-01",
        name: "Devilled Prawns",
        station: "SEAFOOD",
        inStock: true,
        priceLkr: 3200,
      };
      const props: KdsStockToggleDrawerProps = {
        isOpen: true,
        onClose: noop,
        initialItems: [item],
      };
      assert.strictEqual(props.isOpen, true);
      assert.strictEqual(props.initialItems?.[0]?.name, "Devilled Prawns");
    });
  });
});
