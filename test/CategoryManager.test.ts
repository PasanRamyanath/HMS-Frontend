import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AdminMenuCategoryItem,
  CategoryIconSvg,
  CategoryManager,
  type CategoryManagerProps,
  DEFAULT_DOMSPEED_CATEGORIES,
} from "../src/admin/menus/CategoryManager.js";
import { Department, DiningType } from "../src/generated/graphql.js";

describe("Step 226: DOMSpeed-Style Category Manager (CategoryManager.tsx)", () => {
  describe("1. Default Sample Categories & DOMSpeed Sri Lankan Parity", () => {
    it("exports 7 curated multi-department hospitality categories", () => {
      assert.strictEqual(DEFAULT_DOMSPEED_CATEGORIES.length, 7);
      const ids = DEFAULT_DOMSPEED_CATEGORIES.map((c) => c.id);
      assert.deepStrictEqual(ids, [
        "CAT-RICE-CURRY",
        "CAT-HOPPERS-KOTTU",
        "CAT-DRINKS-BAR",
        "CAT-SANDWICHES",
        "CAT-DESSERTS",
        "CAT-AMENITIES",
        "CAT-SPA-WELLNESS",
      ]);
    });

    it("verifies trilingual names (EN, SI, TA) for core food & beverage categories", () => {
      const riceCurry = DEFAULT_DOMSPEED_CATEGORIES.find((c) => c.id === "CAT-RICE-CURRY");
      assert.ok(riceCurry);
      assert.strictEqual(riceCurry.name.en, "Sri Lankan Rice & Curry");
      assert.strictEqual(riceCurry.name.si, "ශ්රී ලාංකික බත් සහ ව්යංජන");
      assert.strictEqual(riceCurry.name.ta, "இலங்கை அரிசி மற்றும் கறி");
      assert.strictEqual(riceCurry.department, Department.Kitchen);
      assert.strictEqual(riceCurry.iconKey, "rice-bowl");
    });

    it("verifies time-of-day availability windows (Lunch vs Dinner vs All-Day)", () => {
      const riceCurry = DEFAULT_DOMSPEED_CATEGORIES.find((c) => c.id === "CAT-RICE-CURRY");
      assert.ok(riceCurry?.availableWindow);
      assert.strictEqual(riceCurry.availableWindow.startTime, "11:30");
      assert.strictEqual(riceCurry.availableWindow.endTime, "15:30");

      const hoppers = DEFAULT_DOMSPEED_CATEGORIES.find((c) => c.id === "CAT-HOPPERS-KOTTU");
      assert.ok(hoppers?.availableWindow);
      assert.strictEqual(hoppers.availableWindow.startTime, "18:00");
      assert.strictEqual(hoppers.availableWindow.endTime, "23:00");

      const amenities = DEFAULT_DOMSPEED_CATEGORIES.find((c) => c.id === "CAT-AMENITIES");
      assert.ok(amenities?.availableWindow);
      assert.strictEqual(amenities.availableWindow.startTime, "00:00");
      assert.strictEqual(amenities.availableWindow.endTime, "23:59");
    });

    it("verifies multi-department coverage (Kitchen, Bar, Housekeeping, Spa)", () => {
      const departments = new Set(DEFAULT_DOMSPEED_CATEGORIES.map((c) => c.department));
      assert.ok(departments.has(Department.Kitchen));
      assert.ok(departments.has(Department.Bar));
      assert.ok(departments.has(Department.Housekeeping));
      assert.ok(departments.has(Department.Spa));
    });
  });

  describe("2. CategoryIconSvg Vector Renderer", () => {
    it("renders valid SVG markup for all curated icon keys", () => {
      const iconKeys = [
        "rice-bowl",
        "pan",
        "glass-cocktail",
        "sandwich",
        "cake",
        "sparkles",
        "flower",
        "unknown-fallback",
      ];

      for (const key of iconKeys) {
        const svgMarkup = renderToStaticMarkup(
          React.createElement(CategoryIconSvg, { iconKey: key }),
        );
        assert.ok(svgMarkup.startsWith("<svg"), `Failed for icon key ${key}`);
        assert.ok(svgMarkup.includes('viewBox="0 0 24 24"'));
      }
    });
  });

  describe("3. CategoryManager SSR Static Render & DOM Output", () => {
    it("renders CategoryManager with default categories cleanly", () => {
      const html = renderToStaticMarkup(React.createElement(CategoryManager, {}));
      assert.ok(html.includes("Menu &amp; Catalog Categories"));
      assert.ok(html.includes("DOMSpeed Parity"));
      assert.ok(html.includes("Sri Lankan Rice &amp; Curry"));
      assert.ok(html.includes("Hoppers &amp; Street Kottu"));
      assert.ok(html.includes("Ceylon Teas, Fresh Juices &amp; Bar"));
      assert.ok(html.includes("Housekeeping Amenities"));
      assert.ok(html.includes("Ayurveda Wellness &amp; Spa"));
    });

    it("renders custom category list when provided via props", () => {
      const customCategory: AdminMenuCategoryItem = {
        id: "CAT-CUSTOM-SEAFOOD",
        name: {
          en: "Mirissa Fresh Lagoon Catch",
          si: "මිරිස්ස නැවුම් මුහුදු ආහාර",
          ta: "மிரிஸ்ஸ புதிய கடல் உணவு",
        },
        department: Department.Kitchen,
        diningTypes: [DiningType.BeachCabana, DiningType.InRoomDining],
        displayOrder: 1,
        isActive: true,
        iconKey: "pan",
        availableWindow: { startTime: "12:00", endTime: "22:00" },
        itemCount: 5,
      };

      const props: CategoryManagerProps = {
        categories: [customCategory],
        className: "test-category-manager",
      };

      const html = renderToStaticMarkup(React.createElement(CategoryManager, props));
      assert.ok(html.includes("Mirissa Fresh Lagoon Catch"));
      assert.ok(html.includes("test-category-manager"));
      assert.ok(html.includes("12:00–22:00"));
      assert.ok(html.includes("5 items"));
    });
  });
});
