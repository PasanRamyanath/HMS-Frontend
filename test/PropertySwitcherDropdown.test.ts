import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HOTEL_GROUP_PROPERTIES,
  PropertySwitcherDropdown,
  formatCurrencyLkr,
  formatPercent,
  getTierBadgeLabel,
} from "../src/admin/layout/PropertySwitcherDropdown.js";

describe("Step 453 (Phase 19.03): Multi-Property Hotel Group Switcher (PropertySwitcherDropdown.tsx)", () => {
  describe("1. Default Multi-Property Configurations & Sri Lankan Entities", () => {
    it("provides 3 default properties representing Colombo, Kandy, and Bentota", () => {
      assert.strictEqual(DEFAULT_HOTEL_GROUP_PROPERTIES.length, 3);
      const cities = DEFAULT_HOTEL_GROUP_PROPERTIES.map((p) => p.city);
      assert.ok(cities.includes("Colombo"));
      assert.ok(cities.includes("Kandy"));
      assert.ok(cities.includes("Bentota"));
    });

    it("configures Cinnamon Grand Horizon Colombo with 120 rooms and city hotel tier", () => {
      const colombo = DEFAULT_HOTEL_GROUP_PROPERTIES.find((p) => p.city === "Colombo");
      assert.ok(colombo);
      assert.strictEqual(colombo?.id, "tenant-colombo");
      assert.strictEqual(colombo?.name, "Cinnamon Grand Horizon Colombo");
      assert.strictEqual(colombo?.province, "Western Province");
      assert.strictEqual(colombo?.roomCount, 120);
      assert.strictEqual(colombo?.occupancyRate, 0.88);
      assert.strictEqual(colombo?.todayRevenueLkr, 1840000);
      assert.strictEqual(colombo?.tier, "CITY_HOTEL");
      assert.strictEqual(colombo?.status, "ONLINE");
    });

    it("configures Kandy Hills Sanctuary & Tea Estate with 45 rooms and boutique villa tier", () => {
      const kandy = DEFAULT_HOTEL_GROUP_PROPERTIES.find((p) => p.city === "Kandy");
      assert.ok(kandy);
      assert.strictEqual(kandy?.id, "tenant-kandy");
      assert.strictEqual(kandy?.name, "Kandy Hills Sanctuary & Tea Estate");
      assert.strictEqual(kandy?.province, "Central Province");
      assert.strictEqual(kandy?.roomCount, 45);
      assert.strictEqual(kandy?.occupancyRate, 0.94);
      assert.strictEqual(kandy?.todayRevenueLkr, 720000);
      assert.strictEqual(kandy?.tier, "BOUTIQUE_VILLA");
      assert.strictEqual(kandy?.status, "ONLINE");
    });

    it("configures Bentota Coral Palms Oceanfront Resort with 60 rooms and luxury resort tier", () => {
      const bentota = DEFAULT_HOTEL_GROUP_PROPERTIES.find((p) => p.city === "Bentota");
      assert.ok(bentota);
      assert.strictEqual(bentota?.id, "tenant-bentota");
      assert.strictEqual(bentota?.name, "Bentota Coral Palms Oceanfront Resort");
      assert.strictEqual(bentota?.province, "Southern Province");
      assert.strictEqual(bentota?.roomCount, 60);
      assert.strictEqual(bentota?.occupancyRate, 0.76);
      assert.strictEqual(bentota?.todayRevenueLkr, 1150000);
      assert.strictEqual(bentota?.tier, "LUXURY_RESORT");
      assert.strictEqual(bentota?.status, "ONLINE");
    });
  });

  describe("2. Formatting & Localization Utilities", () => {
    it("formats LKR currency with integer grouping", () => {
      assert.strictEqual(formatCurrencyLkr(1840000), "LKR 1,840,000");
      assert.strictEqual(formatCurrencyLkr(720000), "LKR 720,000");
      assert.strictEqual(formatCurrencyLkr(0), "LKR 0");
    });

    it("formats percentages accurately with rounding", () => {
      assert.strictEqual(formatPercent(0.88), "88%");
      assert.strictEqual(formatPercent(0.944), "94%");
      assert.strictEqual(formatPercent(0.756), "76%");
    });

    it("translates property tiers to friendly human-readable badges", () => {
      assert.strictEqual(getTierBadgeLabel("LUXURY_RESORT"), "Resort");
      assert.strictEqual(getTierBadgeLabel("BOUTIQUE_VILLA"), "Villa");
      assert.strictEqual(getTierBadgeLabel("CITY_HOTEL"), "City Hotel");
      assert.strictEqual(getTierBadgeLabel("REST_HOUSE"), "Rest House");
    });
  });

  describe("3. Static Markup & Apple HIG Liquid Glass Accessibility", () => {
    it("renders trigger button with accessible attributes and minimum touch target", () => {
      const html = renderToStaticMarkup(React.createElement(PropertySwitcherDropdown));

      assert.ok(html.includes('id="property-switcher-trigger"'));
      assert.ok(html.includes('aria-expanded="false"'));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders active property name and location on initial mount", () => {
      const html = renderToStaticMarkup(React.createElement(PropertySwitcherDropdown));

      assert.ok(html.includes("Cinnamon Grand Horizon Colombo"));
      assert.ok(html.includes("Colombo"));
      assert.ok(html.includes("88% Occ"));
    });

    it("renders explicitly passed activePropertyId correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PropertySwitcherDropdown, {
          activePropertyId: "tenant-kandy",
        }),
      );

      assert.ok(html.includes("Kandy Hills Sanctuary &amp; Tea Estate"));
      assert.ok(html.includes("Kandy"));
      assert.ok(html.includes("94% Occ"));
    });

    it("respects disabled property and disables trigger button", () => {
      const html = renderToStaticMarkup(
        React.createElement(PropertySwitcherDropdown, {
          disabled: true,
        }),
      );

      assert.ok(html.includes("disabled"));
      assert.ok(html.includes("disabled:opacity-50"));
    });

    it("supports custom className injection on outer wrapper", () => {
      const html = renderToStaticMarkup(
        React.createElement(PropertySwitcherDropdown, {
          className: "custom-property-switcher-class",
        }),
      );

      assert.ok(html.includes("custom-property-switcher-class"));
    });
  });

  describe("4. Multi-Tenant Group Aggregation Logic", () => {
    it("accurately calculates total chain rooms across Colombo, Kandy, and Bentota", () => {
      const totalRooms = DEFAULT_HOTEL_GROUP_PROPERTIES.reduce((acc, p) => acc + p.roomCount, 0);
      assert.strictEqual(totalRooms, 120 + 45 + 60);
      assert.strictEqual(totalRooms, 225);
    });

    it("accurately calculates total daily chain revenue", () => {
      const totalRevenue = DEFAULT_HOTEL_GROUP_PROPERTIES.reduce(
        (acc, p) => acc + p.todayRevenueLkr,
        0,
      );
      assert.strictEqual(totalRevenue, 1840000 + 720000 + 1150000);
      assert.strictEqual(totalRevenue, 3710000);
    });

    it("accurately calculates weighted chain occupancy", () => {
      const totalRooms = 225;
      const occupiedRooms =
        120 * 0.88 + // 105.6
        45 * 0.94 + // 42.3
        60 * 0.76; // 45.6
      const weightedRate = occupiedRooms / totalRooms;
      assert.ok(weightedRate > 0.85 && weightedRate < 0.87);
      assert.strictEqual(formatPercent(weightedRate), "86%");
    });
  });
});
