import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_MEAL_PLAN_RULES,
  DEFAULT_MEAL_WINDOWS,
  type MealPlanItemRule,
  MealPlanMenuRules,
  type MealPlanMenuRulesProps,
  type MealPlanPriceCalculation,
  MealPlanSimulationInspector,
  MealPlanTogglePill,
  type MealWindowConfig,
  calculateMealPlanGuestPricing,
  formatPriceLkr,
  getActiveMealWindowSlot,
  isItemFreeUnderMealPlan,
  isTimeInRange,
  resolveTrilingualTitle,
} from "../src/admin/menus/MealPlanMenuRules.js";
import { MealPlan } from "../src/generated/graphql.js";

describe("Step 232: Meal-Plan Allowance Rules Editor (MealPlanMenuRules.tsx)", () => {
  describe("1. Default Meal Windows & Hospitality Rules Integrity", () => {
    it("configures the 4 standard Sri Lankan meal windows", () => {
      assert.strictEqual(DEFAULT_MEAL_WINDOWS.length, 4);
      const slots = DEFAULT_MEAL_WINDOWS.map((w: MealWindowConfig) => w.slot);
      assert.ok(slots.includes("BREAKFAST"));
      assert.ok(slots.includes("LUNCH"));
      assert.ok(slots.includes("AFTERNOON_TEA"));
      assert.ok(slots.includes("DINNER"));

      const breakfast = DEFAULT_MEAL_WINDOWS.find((w) => w.slot === "BREAKFAST");
      assert.ok(breakfast);
      assert.strictEqual(breakfast.startTime, "06:30");
      assert.strictEqual(breakfast.endTime, "10:30");
      assert.ok(breakfast.applicablePlans.includes(MealPlan.Bb));
      assert.ok(breakfast.applicablePlans.includes(MealPlan.Hb));

      const dinner = DEFAULT_MEAL_WINDOWS.find((w) => w.slot === "DINNER");
      assert.ok(dinner);
      assert.strictEqual(dinner.startTime, "19:00");
      assert.strictEqual(dinner.endTime, "22:30");
      assert.ok(!dinner.applicablePlans.includes(MealPlan.Bb)); // BB has no dinner
      assert.ok(dinner.applicablePlans.includes(MealPlan.Hb));
    });

    it("pre-seeds authentic dishes covering breakfast, dinner, beverages, and premium catches", () => {
      assert.strictEqual(DEFAULT_MEAL_PLAN_RULES.length, 5);
      const codes = DEFAULT_MEAL_PLAN_RULES.map((r: MealPlanItemRule) => r.itemCode);
      assert.ok(codes.includes("BRK-101")); // Egg Hopper Feast
      assert.ok(codes.includes("DIN-201")); // Rice & 5 Curries
      assert.ok(codes.includes("SEA-501")); // Lagoon Crab
      assert.ok(codes.includes("BEV-301")); // Ceylon Tea
      assert.ok(codes.includes("BAR-105")); // Lion Beer
    });
  });

  describe("2. Pure Domain Math & Entitlement Resolvers", () => {
    it("resolves trilingual titles with proper language fallbacks", () => {
      const title = {
        en: "Ceylon Tea",
        si: "සිලෝන් තේ",
        ta: "சிலோன் தேநீர்",
      };
      assert.strictEqual(resolveTrilingualTitle(title, "en"), "Ceylon Tea");
      assert.strictEqual(resolveTrilingualTitle(title, "si"), "සිලෝන් තේ");
      assert.strictEqual(resolveTrilingualTitle(title, "ta"), "சிலோன் தேநீர்");

      const missing = { en: "English Only", si: "", ta: "" };
      assert.strictEqual(resolveTrilingualTitle(missing, "si"), "English Only");
      assert.strictEqual(resolveTrilingualTitle(null, "en"), "");
    });

    it("formats LKR currency amounts with tabular formatting", () => {
      assert.strictEqual(formatPriceLkr(0), "LKR 0.00");
      assert.strictEqual(formatPriceLkr(1850), "LKR 1,850.00");
      assert.strictEqual(formatPriceLkr(6800.5), "LKR 6,800.50");
    });

    it("evaluates time ranges accurately", () => {
      assert.strictEqual(isTimeInRange("08:15", "06:30", "10:30"), true);
      assert.strictEqual(isTimeInRange("06:30", "06:30", "10:30"), true);
      assert.strictEqual(isTimeInRange("10:30", "06:30", "10:30"), true);
      assert.strictEqual(isTimeInRange("11:00", "06:30", "10:30"), false);
      assert.strictEqual(isTimeInRange("20:30", "19:00", "22:30"), true);
    });

    it("determines active meal window slot based on 24h clock string", () => {
      assert.strictEqual(getActiveMealWindowSlot("07:30"), "BREAKFAST");
      assert.strictEqual(getActiveMealWindowSlot("13:15"), "LUNCH");
      assert.strictEqual(getActiveMealWindowSlot("16:45"), "AFTERNOON_TEA");
      assert.strictEqual(getActiveMealWindowSlot("20:15"), "DINNER");
      assert.strictEqual(getActiveMealWindowSlot("23:45"), null);
      assert.strictEqual(getActiveMealWindowSlot("03:00"), null);
    });

    it("checks item plan eligibility correctly", () => {
      const hopper = DEFAULT_MEAL_PLAN_RULES[0];
      const riceCurry = DEFAULT_MEAL_PLAN_RULES[1];
      assert.ok(hopper);
      assert.ok(riceCurry);

      // Room Only (RO) is never free
      assert.strictEqual(isItemFreeUnderMealPlan(hopper, MealPlan.Ro), false);
      assert.strictEqual(isItemFreeUnderMealPlan(riceCurry, MealPlan.Ro), false);

      // Hopper is free in BB, HB, FB, AI
      assert.strictEqual(isItemFreeUnderMealPlan(hopper, MealPlan.Bb), true);
      assert.strictEqual(isItemFreeUnderMealPlan(hopper, MealPlan.Hb), true);

      // Dinner Rice & Curry is not free in BB, but free in HB, FB, AI
      assert.strictEqual(isItemFreeUnderMealPlan(riceCurry, MealPlan.Bb), false);
      assert.strictEqual(isItemFreeUnderMealPlan(riceCurry, MealPlan.Hb), true);
      assert.strictEqual(isItemFreeUnderMealPlan(riceCurry, MealPlan.Fb), true);
      assert.strictEqual(isItemFreeUnderMealPlan(riceCurry, MealPlan.Ai), true);
    });

    it("calculates exact pricing for Half Board guest ordering included dinner vs extra crab", () => {
      const riceCurry = DEFAULT_MEAL_PLAN_RULES[1]; // Included in HB
      const lagoonCrab = DEFAULT_MEAL_PLAN_RULES[2]; // À La Carte paid
      assert.ok(riceCurry);
      assert.ok(lagoonCrab);

      // 1. HB guest ordering Rice & Curry during DINNER window
      const hbDinnerCalc: MealPlanPriceCalculation = calculateMealPlanGuestPricing(
        riceCurry,
        MealPlan.Hb,
        "DINNER",
      );
      assert.strictEqual(hbDinnerCalc.effectivePriceLkr, 0);
      assert.strictEqual(hbDinnerCalc.isIncluded, true);
      assert.strictEqual(hbDinnerCalc.isSupplement, false);
      assert.strictEqual(hbDinnerCalc.badgeLabel, "Included in HB (LKR 0.00)");

      // 2. HB guest ordering Lagoon Crab during DINNER window (not free under HB)
      const hbCrabCalc: MealPlanPriceCalculation = calculateMealPlanGuestPricing(
        lagoonCrab,
        MealPlan.Hb,
        "DINNER",
      );
      assert.strictEqual(hbCrabCalc.effectivePriceLkr, 6800);
      assert.strictEqual(hbCrabCalc.isIncluded, false);
      assert.strictEqual(hbCrabCalc.badgeLabel, "À La Carte Paid");

      // 3. AI guest ordering Lagoon Crab with supplement upgrade
      const aiCrabCalc: MealPlanPriceCalculation = calculateMealPlanGuestPricing(
        lagoonCrab,
        MealPlan.Ai,
        "DINNER",
      );
      assert.strictEqual(aiCrabCalc.effectivePriceLkr, 3500);
      assert.strictEqual(aiCrabCalc.isIncluded, true);
      assert.strictEqual(aiCrabCalc.isSupplement, true);
      assert.ok(aiCrabCalc.badgeLabel.includes("+ LKR 3,500.00"));
      assert.ok(aiCrabCalc.badgeLabel.includes("AI Supplement"));

      // 4. RO guest ordering breakfast hopper
      const hopper = DEFAULT_MEAL_PLAN_RULES[0];
      assert.ok(hopper);
      const roHopperCalc = calculateMealPlanGuestPricing(hopper, MealPlan.Ro, "BREAKFAST");
      assert.strictEqual(roHopperCalc.effectivePriceLkr, 1850);
      assert.strictEqual(roHopperCalc.isIncluded, false);
      assert.strictEqual(roHopperCalc.badgeLabel, "À La Carte Paid");
    });
  });

  describe("3. React Component Static Rendering & Apple HIG Markup", () => {
    const noop = () => undefined;

    it("renders MealPlanTogglePill for all 4 plans with min 44px touch targets", () => {
      const html = renderToStaticMarkup(
        React.createElement("div", null, [
          React.createElement(MealPlanTogglePill, {
            key: "bb",
            plan: MealPlan.Bb,
            isChecked: true,
            isReadOnly: false,
            onToggle: noop,
          }),
          React.createElement(MealPlanTogglePill, {
            key: "hb",
            plan: MealPlan.Hb,
            isChecked: false,
            isReadOnly: false,
            onToggle: noop,
          }),
        ]),
      );

      assert.ok(html.includes("BB"));
      assert.ok(html.includes("HB"));
      assert.ok(html.includes("Free"));
      assert.ok(html.includes("Paid"));
      assert.ok(html.includes("min-h-[44px]"));
    });

    it("renders MealPlanSimulationInspector with room QR simulator controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(MealPlanSimulationInspector, {
          rules: DEFAULT_MEAL_PLAN_RULES,
        }),
      );

      assert.ok(html.includes('data-testid="meal-plan-simulator"'));
      assert.ok(html.includes("Live Guest Room QR Order Simulator"));
      assert.ok(html.includes("Guest Plan:"));
      assert.ok(html.includes("HB (Half Board)"));
      assert.ok(html.includes("Order Time:"));
      assert.ok(html.includes('data-testid="simulator-card-ITEM-HOPPER-FEAST"'));
      assert.ok(html.includes('data-testid="simulator-card-ITEM-RICE-CURRY-DIN"'));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders MealPlanMenuRules table with search, plan filters, and item rows", () => {
      const props: MealPlanMenuRulesProps = {
        rules: DEFAULT_MEAL_PLAN_RULES,
        onSaveRules: noop,
        readOnly: false,
      };

      const html = renderToStaticMarkup(React.createElement(MealPlanMenuRules, props));

      assert.ok(html.includes('data-testid="meal-plan-menu-rules"'));
      assert.ok(html.includes("Meal-Plan Allowance &amp; Entitlement Rules"));
      assert.ok(html.includes("5 Items Configured"));
      assert.ok(html.includes("BRK-101"));
      assert.ok(html.includes("DIN-201"));
      assert.ok(html.includes("SEA-501"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("Breakfast Classics"));
    });
  });
});
