import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CategoryPillIcon,
  CategoryPillsBar,
  type CategoryPillsBarProps,
  DEFAULT_GUEST_QR_CATEGORIES,
  type QrCategoryItem,
  type TrilingualName,
  filterCategoriesByDepartment,
  resolveCategoryName,
  scrollToMenuSection,
} from "../src/qr/CategoryPillsBar.js";

describe("Step 254: Horizontal Sticky Category Carousel (CategoryPillsBar.tsx)", () => {
  describe("1. Pure Category Filtering & Trilingual Resolvers", () => {
    it("resolves category names accurately across EN, SI, and TA with fallbacks", () => {
      const trilingualName: TrilingualName = {
        en: "Rice & Curry",
        si: "බත් සහ ව්‍යංජන",
        ta: "அரிசி மற்றும் கறி",
      };

      assert.strictEqual(resolveCategoryName(trilingualName, "en"), "Rice & Curry");
      assert.strictEqual(resolveCategoryName(trilingualName, "si"), "බත් සහ ව්‍යංජන");
      assert.strictEqual(resolveCategoryName(trilingualName, "ta"), "அரிசி மற்றும் கறி");

      // Fallback to English when SI or TA is missing
      const enOnlyName: TrilingualName = { en: "Club Sandwich" };
      assert.strictEqual(resolveCategoryName(enOnlyName, "si"), "Club Sandwich");
      assert.strictEqual(resolveCategoryName(enOnlyName, "ta"), "Club Sandwich");

      // Handle undefined / empty safely
      assert.strictEqual(resolveCategoryName(undefined, "en"), "");
    });

    it("filters categories by department accurately", () => {
      const diningCats = filterCategoriesByDepartment(DEFAULT_GUEST_QR_CATEGORIES, "DINING");
      assert.ok(diningCats.length > 0);
      assert.ok(diningCats.every((c) => c.department.toUpperCase() === "DINING"));

      const barCats = filterCategoriesByDepartment(DEFAULT_GUEST_QR_CATEGORIES, "BAR");
      assert.ok(barCats.length >= 2);
      assert.ok(barCats.every((c) => c.department.toUpperCase() === "BAR"));

      // "ALL" or undefined returns all active categories
      const allCats = filterCategoriesByDepartment(DEFAULT_GUEST_QR_CATEGORIES, "ALL");
      assert.strictEqual(allCats.length, DEFAULT_GUEST_QR_CATEGORIES.length);

      const nullFilterCats = filterCategoriesByDepartment(DEFAULT_GUEST_QR_CATEGORIES, undefined);
      assert.strictEqual(nullFilterCats.length, DEFAULT_GUEST_QR_CATEGORIES.length);
    });

    it("executes scrollToMenuSection safely without throwing", () => {
      // In Node.js environment without DOM
      assert.doesNotThrow(() => {
        scrollToMenuSection("CAT-RICE-CURRY");
      });
    });
  });

  describe("2. Static Markup & DOMSpeed Visual Verification", () => {
    it("renders default categories in 48x48px squircle card layout", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: DEFAULT_GUEST_QR_CATEGORIES,
          selectedCategoryId: "CAT-RICE-CURRY",
          language: "en",
        }),
      );

      // Accessibility landmarks & attributes
      assert.ok(markup.includes('data-testid="category-pills-bar"'));
      assert.ok(markup.includes('role="tablist"'));
      assert.ok(markup.includes('role="tab"'));
      assert.ok(markup.includes('aria-label="Menu category carousel"'));

      // Category item contents
      assert.ok(markup.includes("Rice &amp; Curry") || markup.includes("Rice & Curry"));
      assert.ok(markup.includes("Hoppers &amp; Kottu") || markup.includes("Hoppers & Kottu"));
      assert.ok(markup.includes("14 items"));
      assert.ok(markup.includes("18 items"));

      // Active selected category has aria-selected="true"
      assert.ok(markup.includes('id="cat-tab-CAT-RICE-CURRY"'));
      assert.ok(markup.includes('aria-selected="true"'));
      assert.ok(markup.includes("text-orange-600"));
    });

    it("renders compact pill layout when variant='pills'", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: DEFAULT_GUEST_QR_CATEGORIES,
          selectedCategoryId: "CAT-HOPPERS-KOTTU",
          variant: "pills",
          language: "en",
        }),
      );

      assert.ok(markup.includes("rounded-full"));
      assert.ok(markup.includes('id="cat-tab-CAT-HOPPERS-KOTTU"'));
      assert.ok(markup.includes('aria-selected="true"'));
    });

    it("renders Sinhala and Tamil category names when language is set", () => {
      const sinhalaMarkup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: DEFAULT_GUEST_QR_CATEGORIES,
          language: "si",
          activeDepartment: "DINING",
        }),
      );
      assert.ok(sinhalaMarkup.includes("බත් සහ ව්‍යංජන"));
      assert.ok(sinhalaMarkup.includes("ආප්ප සහ කොත්තු"));

      const tamilMarkup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: DEFAULT_GUEST_QR_CATEGORIES,
          language: "ta",
          activeDepartment: "DINING",
        }),
      );
      assert.ok(tamilMarkup.includes("அரிசி மற்றும் கறி"));
      assert.ok(tamilMarkup.includes("அப்பம் மற்றும் கொத்து"));
    });

    it("filters to only BAR categories when activeDepartment='BAR'", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: DEFAULT_GUEST_QR_CATEGORIES,
          activeDepartment: "BAR",
          language: "en",
        }),
      );

      assert.ok(
        markup.includes("Ceylon Tea &amp; Coffee") || markup.includes("Ceylon Tea & Coffee"),
      );
      assert.ok(markup.includes("Tropical Cocktails"));
      // Dining categories should not appear in BAR filter
      assert.ok(!markup.includes("Clay-Pot Fish"));
    });

    it("returns null when no categories match the active department", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CategoryPillsBar, {
          categories: [],
        }),
      );
      assert.strictEqual(markup, "");
    });

    it("renders CategoryPillIcon with all supported icon keys", () => {
      const icons = [
        "rice-bowl",
        "pan",
        "fish",
        "sandwich",
        "cake",
        "coffee",
        "glass-cocktail",
        "sparkles",
        "flower",
        "unknown-key",
      ];

      for (const iconKey of icons) {
        const svg = renderToStaticMarkup(
          React.createElement(CategoryPillIcon, {
            iconKey,
            isSelected: true,
          }),
        );
        assert.ok(svg.includes("<svg"));
        assert.ok(svg.includes("viewBox="));
      }
    });

    it("verifies constructibility of all exported interfaces", () => {
      const item: QrCategoryItem = {
        id: "TEST-CAT",
        name: { en: "Test Category" },
        department: "DINING",
        iconKey: "rice-bowl",
        itemCount: 5,
        badge: "Special",
        isActive: true,
      };
      assert.strictEqual(item.id, "TEST-CAT");

      const props: CategoryPillsBarProps = {
        categories: [item],
        selectedCategoryId: "TEST-CAT",
        language: "en",
        isSticky: true,
        variant: "cards",
        activeDepartment: "DINING",
        className: "custom-class",
      };
      assert.strictEqual(props.selectedCategoryId, "TEST-CAT");
    });
  });
});
