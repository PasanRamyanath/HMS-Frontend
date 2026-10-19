import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SAMPLE_DISHES,
  DietaryTagChip,
  type GuestDish,
  GuestDishCard,
  type GuestDishCardProps,
  SpicyIndicator,
  formatLkr,
  formatUsdEstimate,
  resolveDishText,
  resolveMealPlanBenefit,
} from "../src/qr/GuestDishCard.js";

describe("Step 255: DOMSpeed-Style Dish Card with 1:1 WebP Thumbnail & Stepper (GuestDishCard.tsx)", () => {
  describe("1. Pure Financial & Localization Resolvers", () => {
    it("formats Sri Lankan Rupee amounts with standard comma grouping", () => {
      assert.strictEqual(formatLkr(0), "LKR 0");
      assert.strictEqual(formatLkr(1200), "LKR 1,200");
      assert.strictEqual(formatLkr(4800), "LKR 4,800");
      assert.strictEqual(formatLkr(125000), "LKR 125,000");
    });

    it("calculates indicative USD estimates with exchange rate", () => {
      assert.strictEqual(formatUsdEstimate(3100, 310), "~$10.00");
      assert.strictEqual(formatUsdEstimate(1550, 310), "~$5.00");
      assert.strictEqual(formatUsdEstimate(1200, 310), "~$3.87");
    });

    it("resolves trilingual dish titles and descriptions with safe fallbacks", () => {
      const dish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(dish);

      assert.strictEqual(resolveDishText(dish.name, "en"), "Lagoon Jumbo Crab Curry");
      assert.strictEqual(resolveDishText(dish.name, "si"), "කලපු කකුළු ව්‍යංජනය");
      assert.strictEqual(resolveDishText(dish.name, "ta"), "மட்டக்களப்பு நண்டு கறி");

      // Fallback to English when SI or TA is missing
      const enOnly = { en: "Ceylon King Coconut" };
      assert.strictEqual(resolveDishText(enOnly, "si"), "Ceylon King Coconut");
      assert.strictEqual(resolveDishText(enOnly, "ta"), "Ceylon King Coconut");
      assert.strictEqual(resolveDishText(undefined, "en"), "");
    });

    it("evaluates meal-plan benefits (Free on HB/FB/AI vs Supplement)", () => {
      const crab = DEFAULT_SAMPLE_DISHES[0]; // freeOnMealPlans: ["AI"], supplementPriceLkr: 1500
      const hoppers = DEFAULT_SAMPLE_DISHES[1]; // freeOnMealPlans: ["BB", "HB", "FB", "AI"]
      assert.ok(crab && hoppers);

      // Room Only guest gets no meal plan benefit
      assert.strictEqual(resolveMealPlanBenefit(crab, "RO"), null);
      assert.strictEqual(resolveMealPlanBenefit(crab, undefined), null);

      // Half Board guest gets free hoppers
      const hbBenefit = resolveMealPlanBenefit(hoppers, "HB");
      assert.ok(hbBenefit);
      assert.strictEqual(hbBenefit.isFree, true);
      assert.strictEqual(hbBenefit.label, "Free on HB");

      // Half Board guest pays supplement upgrade for luxury crab
      const crabHbBenefit = resolveMealPlanBenefit(crab, "HB");
      assert.ok(crabHbBenefit);
      assert.strictEqual(crabHbBenefit.isFree, false);
      assert.strictEqual(crabHbBenefit.isSupplement, true);
      assert.ok(crabHbBenefit.label.includes("+LKR 1,500"));

      // All Inclusive guest gets free crab
      const crabAiBenefit = resolveMealPlanBenefit(crab, "AI");
      assert.ok(crabAiBenefit);
      assert.strictEqual(crabAiBenefit.isFree, true);
      assert.strictEqual(crabAiBenefit.label, "Free on AI");
    });
  });

  describe("2. Static Markup & DOMSpeed UI/UX Verification", () => {
    it("renders dish card with 104x104px thumbnail and + Add button when quantity is 0", () => {
      const dish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(dish);

      const markup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish,
          quantity: 0,
          currency: "LKR",
          language: "en",
        }),
      );

      assert.ok(markup.includes(`data-testid="guest-dish-card-${dish.id}"`));
      assert.ok(markup.includes("Lagoon Jumbo Crab Curry"));
      assert.ok(markup.includes("LKR 4,800"));
      assert.ok(markup.includes('width="104"'));
      assert.ok(markup.includes('height="104"'));
      assert.ok(markup.includes("+ Add"));
      assert.ok(markup.includes("bg-[#E8772E]"));
    });

    it("renders reactive stepper capsule (− [qty] +) when quantity > 0", () => {
      const dish = DEFAULT_SAMPLE_DISHES[1];
      assert.ok(dish);

      const markup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish,
          quantity: 3,
          currency: "LKR",
          language: "en",
        }),
      );

      assert.ok(
        markup.includes(
          'aria-label="Quantity stepper for Crispy Egg Hoppers &amp; Katta Sambol"',
        ) || markup.includes("Quantity stepper"),
      );
      assert.ok(markup.includes(">3<"));
      assert.ok(markup.includes("−"));
      assert.ok(markup.includes("+"));
    });

    it("renders indicative USD price conversion when currency is USD", () => {
      const dish = DEFAULT_SAMPLE_DISHES[2];
      assert.ok(dish);

      const markup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish,
          quantity: 1,
          currency: "USD",
          usdExchangeRate: 310,
          language: "en",
        }),
      );

      assert.ok(markup.includes("LKR 2,950"));
      assert.ok(markup.includes("~$9.52"));
    });

    it("renders trilingual text for Sinhala and Tamil", () => {
      const dish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(dish);

      const sinhalaMarkup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish,
          language: "si",
        }),
      );
      assert.ok(sinhalaMarkup.includes("කලපු කකුළු ව්‍යංජනය"));

      const tamilMarkup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish,
          language: "ta",
        }),
      );
      assert.ok(tamilMarkup.includes("மட்டக்களப்பு நண்டு கறி"));
    });

    it("renders sold out state with dimmed opacity and unavailable badge", () => {
      const baseDish = DEFAULT_SAMPLE_DISHES[0];
      assert.ok(baseDish);
      const soldOutDish: GuestDish = {
        ...baseDish,
        isSoldOut: true,
      };

      const markup = renderToStaticMarkup(
        React.createElement(GuestDishCard, {
          dish: soldOutDish,
          quantity: 0,
        }),
      );

      assert.ok(markup.includes("Sold Out"));
      assert.ok(markup.includes("Unavailable"));
      assert.ok(markup.includes("opacity-60"));
    });

    it("renders SpicyIndicator and DietaryTagChip subcomponents correctly", () => {
      const spiceMarkup = renderToStaticMarkup(React.createElement(SpicyIndicator, { level: 3 }));
      assert.ok(spiceMarkup.includes("🌶️🌶️🌶️"));

      const chipMarkup = renderToStaticMarkup(
        React.createElement(DietaryTagChip, { tag: "VEGETARIAN" }),
      );
      assert.ok(chipMarkup.includes("VEG"));
    });

    it("verifies constructibility of all exported interfaces", () => {
      const sample: GuestDish = {
        id: "TEST-01",
        name: { en: "Test Dish" },
        priceLkr: 1500,
        categoryId: "CAT-TEST",
      };
      assert.strictEqual(sample.id, "TEST-01");

      const props: GuestDishCardProps = {
        dish: sample,
        quantity: 2,
        language: "en",
        currency: "LKR",
      };
      assert.strictEqual(props.quantity, 2);
    });
  });
});
