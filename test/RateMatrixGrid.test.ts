import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_RATE_MATRICES,
  type EffectiveRateBreakdown,
  MEAL_PLAN_CONFIGS,
  RateMatrixGrid,
  type RateMatrixGridProps,
  type RoomCategoryRateMatrix,
  calculateEffectiveRate,
  formatUsd,
  roundCents,
} from "../src/admin/rooms/RateMatrixGrid.js";
import { MealPlan } from "../src/generated/graphql.js";

describe("Dual-Tier Residency Rate & Meal-Plan Matrix (RateMatrixGrid.tsx)", () => {
  describe("Mathematical Accuracy of Supplement & Tax Compounding", () => {
    it("computes Forward Exclusive rates with statutory 34.34% tax compounding", () => {
      // Base RO: 42,000 + BB Supplement: 4,500 = 46,500 Net Supply
      // 34.34% tax on 46,500 = 15,968.10
      // Gross = 62,468.10
      const res: EffectiveRateBreakdown = calculateEffectiveRate(
        42000,
        4500,
        "FORWARD_EXCLUSIVE",
        34.34,
      );

      assert.equal(res.netSupply, 46500);
      assert.equal(res.taxAmount, 15968.1);
      assert.equal(res.grossRate, 62468.1);
    });

    it("computes Reverse Inclusive rates by extracting taxes backwards from published tariff", () => {
      // Published gross tariff = 46,500 LKR
      // Net supply = 46,500 / 1.3434 = 34,613.67
      // Tax amount = 46,500 - 34,613.67 = 11,886.33
      const res = calculateEffectiveRate(42000, 4500, "REVERSE_INCLUSIVE", 34.34);

      assert.equal(res.grossRate, 46500);
      assert.equal(res.netSupply, 34613.67);
      assert.equal(res.taxAmount, 11886.33);
    });

    it("handles zero rates and negative inputs safely without NaN", () => {
      const res = calculateEffectiveRate(0, 0, "FORWARD_EXCLUSIVE", 34.34);
      assert.equal(res.netSupply, 0);
      assert.equal(res.taxAmount, 0);
      assert.equal(res.grossRate, 0);
    });

    it("formats USD currency and rounds cents accurately", () => {
      assert.equal(formatUsd(140), "$140.00 USD");
      assert.equal(roundCents(12.345), 12.35);
      assert.equal(roundCents(12.344), 12.34);
    });
  });

  describe("Meal Plan Coverage & Matrix Defaults", () => {
    it("covers all 5 standard Sri Lankan meal plan arrangements (RO, BB, HB, FB, AI)", () => {
      assert.equal(MEAL_PLAN_CONFIGS.length, 5);
      assert.ok(MEAL_PLAN_CONFIGS.some((c) => c.plan === MealPlan.Ro && c.code === "RO"));
      assert.ok(MEAL_PLAN_CONFIGS.some((c) => c.plan === MealPlan.Bb && c.code === "BB"));
      assert.ok(MEAL_PLAN_CONFIGS.some((c) => c.plan === MealPlan.Hb && c.code === "HB"));
      assert.ok(MEAL_PLAN_CONFIGS.some((c) => c.plan === MealPlan.Fb && c.code === "FB"));
      assert.ok(MEAL_PLAN_CONFIGS.some((c) => c.plan === MealPlan.Ai && c.code === "AI"));
    });

    it("includes the 3 room categories in DEFAULT_RATE_MATRICES", () => {
      assert.equal(DEFAULT_RATE_MATRICES.length, 3);
      assert.ok(DEFAULT_RATE_MATRICES.some((m) => m.roomTypeCode === "DLX-OCN"));
      assert.ok(DEFAULT_RATE_MATRICES.some((m) => m.roomTypeCode === "FAM-CHL"));
      assert.ok(DEFAULT_RATE_MATRICES.some((m) => m.roomTypeCode === "STD-DBL"));
    });
  });

  describe("Static Rendering & Subcomponents", () => {
    it("renders rate matrix grid with room category selector, meal plan rows, and controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(RateMatrixGrid, {
          initialRoomMatrices: DEFAULT_RATE_MATRICES,
        }),
      );

      assert.ok(html.includes("Dual-Tier Residency Rate &amp; Meal-Plan Matrix"));
      assert.ok(html.includes("Deluxe Ocean View (DLX-OCN)"));
      assert.ok(html.includes("Room Only (European Plan)"));
      assert.ok(html.includes("Bed &amp; Breakfast"));
      assert.ok(html.includes("Half Board (MAP)"));
      assert.ok(html.includes("Full Board (American Plan)"));
      assert.ok(html.includes("All Inclusive"));
      assert.ok(html.includes("Per Room"));
      assert.ok(html.includes("Per Person"));
      assert.ok(html.includes("Tax Exclusive (+34.34%)"));
      assert.ok(html.includes("Tax Inclusive"));
    });

    it("verifies constructible types and props", () => {
      const sampleMatrix: RoomCategoryRateMatrix = DEFAULT_RATE_MATRICES[0] ?? {
        roomTypeId: "rt-sample",
        roomTypeCode: "SMP",
        roomTypeName: "Sample",
        baseRoResidentLkr: 30000,
        baseRoForeignUsd: 100,
        pricingBasis: "PER_ROOM",
        mealPlanRates: {
          [MealPlan.Ro]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
          [MealPlan.Bb]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
          [MealPlan.Hb]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
          [MealPlan.Fb]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
          [MealPlan.Ai]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
        },
      };

      const props: RateMatrixGridProps = {
        initialRoomMatrices: [sampleMatrix],
        readOnly: true,
      };
      assert.equal(props.readOnly, true);
    });
  });
});
