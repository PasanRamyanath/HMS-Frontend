import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ADDONS,
  DEFAULT_PORTIONS,
  DEFAULT_SPICE_LEVELS,
  DishModifierSheet,
  type DishModifierSheetProps,
  type GuestCustomizedDish,
  type ModifierOption,
  calculateCustomizedDishPrice,
  resolveModifierText,
} from "../src/qr/DishModifierSheet.js";
import { DEFAULT_SAMPLE_DISHES } from "../src/qr/GuestDishCard.js";

describe("Step 256: Dish Customization, Spice Level & Add-Ons Bottom Sheet (DishModifierSheet.tsx)", () => {
  const sampleDish = DEFAULT_SAMPLE_DISHES[0];
  assert.ok(sampleDish);
  const noop = () => undefined;

  describe("1. Pure Financial & Text Resolvers", () => {
    it("calculates customized dish pricing accurately with portions and add-ons", () => {
      const basePrice = 2000;
      const regularPortion: ModifierOption = {
        id: "PORTION-REGULAR",
        name: { en: "Regular" },
        priceAdjustmentLkr: 0,
      };
      const largePortion: ModifierOption = {
        id: "PORTION-LARGE",
        name: { en: "Large" },
        priceAdjustmentLkr: 650,
      };
      const addOns: ReadonlyArray<ModifierOption> = [
        { id: "ADDON-EGG", name: { en: "Extra Egg" }, priceAdjustmentLkr: 350 },
        { id: "ADDON-SAMBOL", name: { en: "Pol Sambol" }, priceAdjustmentLkr: 200 },
      ];

      // Regular portion, 1 qty, no addons: 2,000
      const calc1 = calculateCustomizedDishPrice(basePrice, regularPortion, [], 1);
      assert.strictEqual(calc1.unitPriceLkr, 2000);
      assert.strictEqual(calc1.totalPriceLkr, 2000);

      // Large portion (+650), 2 addons (+350 +200 = +550), 1 qty: 2,000 + 650 + 550 = 3,200
      const calc2 = calculateCustomizedDishPrice(basePrice, largePortion, addOns, 1);
      assert.strictEqual(calc2.unitPriceLkr, 3200);
      assert.strictEqual(calc2.totalPriceLkr, 3200);

      // Same as above with quantity 3: 3,200 * 3 = 9,600
      const calc3 = calculateCustomizedDishPrice(basePrice, largePortion, addOns, 3);
      assert.strictEqual(calc3.unitPriceLkr, 3200);
      assert.strictEqual(calc3.totalPriceLkr, 9600);

      // Clamps quantity <= 0 to 1
      const calcClamped = calculateCustomizedDishPrice(basePrice, regularPortion, [], 0);
      assert.strictEqual(calcClamped.totalPriceLkr, 2000);
    });

    it("resolves trilingual modifier texts with safe fallbacks", () => {
      const multi = {
        en: "Medium Spice",
        si: "මධ්‍යම සැර",
        ta: "நடுத்தர காரம்",
      };
      assert.strictEqual(resolveModifierText(multi, "en"), "Medium Spice");
      assert.strictEqual(resolveModifierText(multi, "si"), "මධ්‍යම සැර");
      assert.strictEqual(resolveModifierText(multi, "ta"), "நடுத்தர காரம்");

      const enOnly = { en: "Extra Chilli Paste" };
      assert.strictEqual(resolveModifierText(enOnly, "si"), "Extra Chilli Paste");
      assert.strictEqual(resolveModifierText(enOnly, "ta"), "Extra Chilli Paste");
    });
  });

  describe("2. Static Markup & Dialog Accessibility Verification", () => {
    it("returns null when isOpen is false or dish is null", () => {
      const closedMarkup = renderToStaticMarkup(
        React.createElement(DishModifierSheet, {
          isOpen: false,
          dish: sampleDish,
          onClose: noop,
          onConfirm: noop,
        }),
      );
      assert.strictEqual(closedMarkup, "");

      const noDishMarkup = renderToStaticMarkup(
        React.createElement(DishModifierSheet, {
          isOpen: true,
          dish: null,
          onClose: noop,
          onConfirm: noop,
        }),
      );
      assert.strictEqual(noDishMarkup, "");
    });

    it("renders native dialog modal with Apple bottom-sheet styling and title", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DishModifierSheet, {
          isOpen: true,
          dish: sampleDish,
          language: "en",
          onClose: noop,
          onConfirm: noop,
        }),
      );

      assert.ok(markup.includes("<dialog"));
      assert.ok(markup.includes('data-testid="dish-modifier-sheet"'));
      assert.ok(markup.includes('aria-labelledby="'));
      assert.ok(markup.includes("Lagoon Jumbo Crab Curry"));
      assert.ok(markup.includes("Base: LKR 4,800"));
      assert.ok(markup.includes("rounded-t-[28px]"));
      assert.ok(markup.includes("Portion Size"));
      assert.ok(markup.includes("Spice Preference"));
      assert.ok(
        markup.includes("Popular Add-Ons &amp; Extras") ||
          markup.includes("Popular Add-Ons & Extras"),
      );
      assert.ok(markup.includes("+Extra Egg Hopper"));
      assert.ok(
        markup.includes("Preparation &amp; Dietary Preferences") ||
          markup.includes("Preparation & Dietary Preferences"),
      );
      assert.ok(markup.includes("No MSG"));
      assert.ok(markup.includes("Less Salt"));
      assert.ok(markup.includes("Special Instructions for Chef"));
      assert.ok(markup.includes("Add to Cart"));
    });

    it("renders trilingual options in Sinhala and Tamil", () => {
      const sinhalaMarkup = renderToStaticMarkup(
        React.createElement(DishModifierSheet, {
          isOpen: true,
          dish: sampleDish,
          language: "si",
          onClose: noop,
          onConfirm: noop,
        }),
      );
      assert.ok(sinhalaMarkup.includes("කලපු කකුළු ව්‍යංජනය"));
      assert.ok(sinhalaMarkup.includes("ප්‍රමාණය"));
      assert.ok(sinhalaMarkup.includes("මිරිස් සැර මට්ටම"));
      assert.ok(sinhalaMarkup.includes("MSG රහිතව"));

      const tamilMarkup = renderToStaticMarkup(
        React.createElement(DishModifierSheet, {
          isOpen: true,
          dish: sampleDish,
          language: "ta",
          onClose: noop,
          onConfirm: noop,
        }),
      );
      assert.ok(tamilMarkup.includes("மட்டக்களப்பு நண்டு கறி"));
      assert.ok(tamilMarkup.includes("பகுதி அளவு"));
      assert.ok(tamilMarkup.includes("கார விருப்பம்"));
    });

    it("verifies constructibility of all exported interfaces and preset configurations", () => {
      assert.strictEqual(DEFAULT_PORTIONS.id, "GRP-PORTIONS");
      assert.strictEqual(DEFAULT_SPICE_LEVELS.id, "GRP-SPICE");
      assert.ok(DEFAULT_ADDONS.options.length >= 3);

      const customized: GuestCustomizedDish = {
        dishId: "DISH-01",
        dishName: "Curry Dish",
        basePriceLkr: 2000,
        selectedAddOns: [],
        dietaryPreferences: ["NO_MSG"],
        quantity: 2,
        unitPriceLkr: 2000,
        totalPriceLkr: 4000,
      };
      assert.strictEqual(customized.totalPriceLkr, 4000);

      const props: DishModifierSheetProps = {
        isOpen: true,
        dish: sampleDish,
        language: "en",
        onClose: noop,
        onConfirm: noop,
      };
      assert.strictEqual(props.isOpen, true);
    });
  });
});
