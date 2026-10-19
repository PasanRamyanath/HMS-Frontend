import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CategoryPillTabs,
  DEFAULT_DOMSPEED_MENU_ITEMS,
  DietaryPillBadges,
  MenuItemCard,
  MenuItemEmptyState,
  MenuItemGrid,
  type MenuItemGridProps,
  MenuItemSummaryBar,
  MenuItemThumbnail,
  SpiceLevelIndicator,
  StockAvailabilityToggle,
  type StockFilterType,
  getDepartmentBadgeColor,
  getDepartmentLabel,
  matchesItemFilters,
  matchesSearchQuery,
  matchesStockFilter,
  resolveTrilingual,
} from "../src/admin/menus/MenuItemGrid.js";
import { Department } from "../src/generated/graphql.js";

describe("Step 229: DOMSpeed Product / Menu Item Card Grid (MenuItemGrid.tsx)", () => {
  describe("1. Default Sample Dishes & Sri Lankan Culinary Parity", () => {
    it("exports 10 curated DOMSpeed menu items with multi-department coverage", () => {
      assert.strictEqual(DEFAULT_DOMSPEED_MENU_ITEMS.length, 10);
      const ids = DEFAULT_DOMSPEED_MENU_ITEMS.map((item) => item.id);
      assert.ok(ids.includes("ITEM-RICE-CHKN"));
      assert.ok(ids.includes("ITEM-BLACK-PORK"));
      assert.ok(ids.includes("ITEM-DHAL-CURRY"));
      assert.ok(ids.includes("ITEM-KOTTU-CHKN"));
      assert.ok(ids.includes("ITEM-EGG-HOPPER"));
      assert.ok(ids.includes("ITEM-CEYLON-TEA"));
      assert.ok(ids.includes("ITEM-THAMBILI"));
      assert.ok(ids.includes("ITEM-WATALAPPAN"));
      assert.ok(ids.includes("ITEM-CLUB-SAND"));
      assert.ok(ids.includes("ITEM-AYUR-HERB"));
    });

    it("verifies trilingual dish titles (EN, SI, TA) for authentic Sri Lankan items", () => {
      const kottu = DEFAULT_DOMSPEED_MENU_ITEMS.find((i) => i.id === "ITEM-KOTTU-CHKN");
      assert.ok(kottu);
      assert.strictEqual(kottu.title.en, "Chicken Cheese Kottu Roti");
      assert.strictEqual(kottu.title.si, "චිකන් චීස් කොත්තු රොටි");
      assert.strictEqual(kottu.title.ta, "சிக்கன் சீஸ் கொத்து ரொட்டி");
      assert.strictEqual(kottu.code, "KOT-402");
      assert.strictEqual(kottu.department, Department.Kitchen);
      assert.strictEqual(kottu.kitchenStation, "Hot Wok");
      assert.strictEqual(kottu.spicyLevel, 2);
    });

    it("verifies multi-department coverage (Kitchen, Bar, Spa)", () => {
      const departments = new Set(DEFAULT_DOMSPEED_MENU_ITEMS.map((i) => i.department));
      assert.ok(departments.has(Department.Kitchen));
      assert.ok(departments.has(Department.Bar));
      assert.ok(departments.has(Department.Spa));
    });

    it("includes an 86'd out-of-stock item sample for quick kitchen status validation", () => {
      const outOfStockItems = DEFAULT_DOMSPEED_MENU_ITEMS.filter((i) => !i.isAvailable);
      assert.ok(outOfStockItems.length >= 1);
      const clubSandwich = DEFAULT_DOMSPEED_MENU_ITEMS.find((i) => i.id === "ITEM-CLUB-SAND");
      assert.ok(clubSandwich);
      assert.strictEqual(clubSandwich.isAvailable, false);
    });
  });

  describe("2. Helper Functions (resolveTrilingual, getDepartmentLabel, getDepartmentBadgeColor)", () => {
    const sampleText = {
      en: "English Title",
      si: "සිංහල නම",
      ta: "தமிழ் பெயர்",
    };

    it("resolves trilingual text based on active language", () => {
      assert.strictEqual(resolveTrilingual(sampleText, "en"), "English Title");
      assert.strictEqual(resolveTrilingual(sampleText, "si"), "සිංහල නම");
      assert.strictEqual(resolveTrilingual(sampleText, "ta"), "தமிழ் பெயர்");
    });

    it("falls back to English when language is not provided or translation missing", () => {
      assert.strictEqual(
        resolveTrilingual({ en: "Only English", si: null, ta: null }, "si"),
        "Only English",
      );
      assert.strictEqual(
        resolveTrilingual({ en: "Only English", si: null, ta: null }, "ta"),
        "Only English",
      );
    });

    it("formats department labels cleanly", () => {
      assert.strictEqual(getDepartmentLabel(Department.Kitchen), "Kitchen");
      assert.strictEqual(getDepartmentLabel(Department.Bar), "Bar");
      assert.strictEqual(getDepartmentLabel(Department.Spa), "Spa");
      assert.strictEqual(getDepartmentLabel(Department.Housekeeping), "Housekeeping");
    });

    it("returns distinct badge styling classes per department", () => {
      const kitchenColor = getDepartmentBadgeColor(Department.Kitchen);
      const barColor = getDepartmentBadgeColor(Department.Bar);
      const spaColor = getDepartmentBadgeColor(Department.Spa);
      assert.ok(kitchenColor.includes("amber"));
      assert.ok(barColor.includes("purple"));
      assert.ok(spaColor.includes("emerald"));
    });

    it("verifies instant search matching against code, title, description, and station", () => {
      const item = DEFAULT_DOMSPEED_MENU_ITEMS[0];
      assert.ok(item);
      assert.strictEqual(matchesSearchQuery(item, "CUR-101"), true);
      assert.strictEqual(matchesSearchQuery(item, "Village"), true);
      assert.strictEqual(matchesSearchQuery(item, "කුකුළු මස්"), true);
      assert.strictEqual(matchesSearchQuery(item, "கோழிக்கறி"), true);
      assert.strictEqual(matchesSearchQuery(item, "Curry Station"), true);
      assert.strictEqual(matchesSearchQuery(item, "NonExistentKeywordXYZ"), false);
      assert.strictEqual(matchesSearchQuery(item, ""), true);
    });

    it("verifies stock status filtering logic", () => {
      const inStockFilter: StockFilterType = "in_stock";
      const outOfStockFilter: StockFilterType = "out_of_stock";
      const allFilter: StockFilterType = "all";

      assert.strictEqual(matchesStockFilter(true, inStockFilter), true);
      assert.strictEqual(matchesStockFilter(false, inStockFilter), false);
      assert.strictEqual(matchesStockFilter(false, outOfStockFilter), true);
      assert.strictEqual(matchesStockFilter(true, outOfStockFilter), false);
      assert.strictEqual(matchesStockFilter(true, allFilter), true);
      assert.strictEqual(matchesStockFilter(false, allFilter), true);
    });

    it("evaluates composite item filters across category, department, stock, and query", () => {
      const item = DEFAULT_DOMSPEED_MENU_ITEMS[0];
      assert.ok(item);
      // Matching all criteria
      assert.strictEqual(
        matchesItemFilters(item, "CAT-RICE-CURRY", Department.Kitchen, "all", "CUR-101"),
        true,
      );
      // Mismatched category
      assert.strictEqual(
        matchesItemFilters(item, "CAT-HOPPERS-KOTTU", Department.Kitchen, "all", ""),
        false,
      );
      // Mismatched department
      assert.strictEqual(matchesItemFilters(item, null, Department.Bar, "all", ""), false);
    });
  });

  describe("3. Visual Subcomponents SSR Static Markup", () => {
    it("renders MenuItemThumbnail with 110x110px dimensions and fallback icon", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemThumbnail, {
          title: "Chicken Curry",
          department: Department.Kitchen,
          isAvailable: true,
        }),
      );
      assert.ok(html.includes("w-[110px]"));
      assert.ok(html.includes("h-[110px]"));
      assert.ok(html.includes("rounded-2xl"));
      assert.ok(html.includes("<svg"));
      assert.ok(!html.includes("86&#x27;d"));
    });

    it("renders 86'd out-of-stock badge when isAvailable is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemThumbnail, {
          title: "Club Sandwich",
          department: Department.Kitchen,
          isAvailable: false,
        }),
      );
      assert.ok(html.includes("86&#x27;d") || html.includes("86'd"));
      assert.ok(html.includes("bg-rose-600"));
    });

    it("renders SpiceLevelIndicator accurately for mild, hot, and Sri Lankan hot", () => {
      const mildHtml = renderToStaticMarkup(React.createElement(SpiceLevelIndicator, { level: 0 }));
      assert.ok(mildHtml.includes("Mild"));

      const medHtml = renderToStaticMarkup(React.createElement(SpiceLevelIndicator, { level: 1 }));
      assert.ok(medHtml.includes("Medium"));

      const slSpicyHtml = renderToStaticMarkup(
        React.createElement(SpiceLevelIndicator, { level: 3 }),
      );
      assert.ok(slSpicyHtml.includes("SL Spicy"));
      assert.ok(slSpicyHtml.includes("bg-rose-500"));
    });

    it("renders DietaryPillBadges for vegetarian, vegan, halal, and gluten-free", () => {
      const html = renderToStaticMarkup(
        React.createElement(DietaryPillBadges, {
          isVegetarian: true,
          isVegan: true,
          isHalal: true,
          isGlutenFree: true,
        }),
      );
      assert.ok(html.includes("VEGAN"));
      assert.ok(html.includes("HALAL"));
      assert.ok(html.includes("GF"));
    });

    it("renders StockAvailabilityToggle switch with role='switch' and >= 44x44pt touch target", () => {
      const html = renderToStaticMarkup(
        React.createElement(StockAvailabilityToggle, {
          itemId: "ITEM-TEST",
          isAvailable: true,
          onToggle: () => undefined,
        }),
      );
      assert.ok(html.includes('role="switch"'));
      assert.ok(html.includes('aria-checked="true"'));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-w-[44px]"));
      assert.ok(html.includes("In Stock"));
    });

    it("renders MenuItemCard with LKR formatted price and tabular-nums", () => {
      const item = DEFAULT_DOMSPEED_MENU_ITEMS[0];
      assert.ok(item);
      const html = renderToStaticMarkup(
        React.createElement(MenuItemCard, {
          item,
          onToggleAvailability: () => undefined,
          onEditItem: () => undefined,
        }),
      );
      assert.ok(html.includes("Village Style Chicken Rice &amp; Curry"));
      assert.ok(html.includes("CUR-101"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("LKR 2,250.00"));
      assert.ok(html.includes("Curry Station"));
    });

    it("renders MenuItemSummaryBar with KPI counts and Add Dish CTA", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemSummaryBar, {
          totalCount: 10,
          inStockCount: 9,
          outOfStockCount: 1,
          onAddNewItem: () => undefined,
        }),
      );
      assert.ok(html.includes("Total Dishes"));
      assert.ok(html.includes("10"));
      assert.ok(html.includes("In Stock"));
      assert.ok(html.includes("9"));
      assert.ok(html.includes("86&#x27;d (Unavailable)") || html.includes("86'd"));
      assert.ok(html.includes("1"));
      assert.ok(html.includes("Add Dish"));
    });

    it("renders CategoryPillTabs navigation bar", () => {
      const html = renderToStaticMarkup(
        React.createElement(CategoryPillTabs, {
          categories: [
            { id: "CAT-1", name: { en: "Breakfast", si: null, ta: null } },
            { id: "CAT-2", name: { en: "Dinner", si: null, ta: null } },
          ],
          selectedCategoryId: "CAT-1",
          onSelectCategory: () => undefined,
        }),
      );
      assert.ok(html.includes("All Categories"));
      assert.ok(html.includes("Breakfast"));
      assert.ok(html.includes("Dinner"));
      assert.ok(html.includes("bg-apple-blue"));
    });

    it("renders MenuItemEmptyState with reset action", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemEmptyState, { onReset: () => undefined }),
      );
      assert.ok(html.includes("No dishes found"));
      assert.ok(html.includes("Reset Filters"));
    });
  });

  describe("4. Full MenuItemGrid SSR Static Render & Integration", () => {
    it("renders complete menu item grid with default DOMSpeed items", () => {
      const html = renderToStaticMarkup(React.createElement(MenuItemGrid, {}));
      assert.ok(html.includes("Village Style Chicken Rice &amp; Curry"));
      assert.ok(html.includes("Southern Black Pork Curry"));
      assert.ok(html.includes("Chicken Cheese Kottu Roti"));
      assert.ok(html.includes("Single-Estate Nuwara Eliya BOP Tea"));
      assert.ok(html.includes("Ayurvedic Warm Herbal Compress Therapy"));
      assert.ok(html.includes("Search dish name, code (e.g. KOT-402), station…"));
      assert.ok(html.includes("All Departments"));
    });

    it("renders with custom items and handles empty list gracefully", () => {
      const emptyHtml = renderToStaticMarkup(React.createElement(MenuItemGrid, { items: [] }));
      assert.ok(emptyHtml.includes("No dishes found"));
    });

    it("verifies constructible prop types and custom callback signatures", () => {
      const customProps: MenuItemGridProps = {
        items: DEFAULT_DOMSPEED_MENU_ITEMS,
        selectedCategoryId: "CAT-RICE-CURRY",
        onSelectCategory: () => undefined,
        onToggleAvailability: () => undefined,
        onEditItem: () => undefined,
        onAddNewItem: () => undefined,
        className: "custom-grid-class",
      };
      const html = renderToStaticMarkup(React.createElement(MenuItemGrid, customProps));
      assert.ok(html.includes("custom-grid-class"));
    });
  });
});
