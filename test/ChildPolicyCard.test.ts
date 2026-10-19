import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ChildPolicyCard,
  type ChildPolicyCardProps,
  type ChildPolicySettings,
  type ChildSupplementCalculation,
  DEFAULT_CHILD_POLICY_SETTINGS,
  type ExtraBedPolicy,
  calculateChildSupplement,
  calculateExtraBedsCost,
  getChildCategory,
  validateChildPolicy,
} from "../src/admin/rooms/ChildPolicyCard.js";

describe("Child Policy & Extra Bed Supplement Rules (ChildPolicyCard.tsx)", () => {
  describe("Policy Validation (validateChildPolicy)", () => {
    it("validates that default Sri Lankan resort settings are fully valid", () => {
      const res = validateChildPolicy(DEFAULT_CHILD_POLICY_SETTINGS);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it("rejects infant max age < 0 or > 10", () => {
      const invalid: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        tiers: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.tiers,
          infantMaxAge: -1,
        },
      };
      const res = validateChildPolicy(invalid);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /between 0 and 10/i);
    });

    it("rejects when junior child min age is less than or equal to infant max age", () => {
      const invalid: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        tiers: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.tiers,
          infantMaxAge: 6,
          childMinAge: 6,
        },
      };
      const res = validateChildPolicy(invalid);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /must exceed infant max age/i);
    });

    it("rejects when child max age is less than child min age", () => {
      const invalid: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        tiers: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.tiers,
          childMinAge: 8,
          childMaxAge: 7,
        },
      };
      const res = validateChildPolicy(invalid);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /greater than or equal to child min age/i);
    });

    it("rejects when teen/adult min age does not exceed child max age", () => {
      const invalid: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        tiers: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.tiers,
          childMaxAge: 12,
          teenAdultMinAge: 12,
        },
      };
      const res = validateChildPolicy(invalid);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /must exceed child max age/i);
    });

    it("rejects invalid child meal discount percentage outside [0, 100]", () => {
      const invalid: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        tiers: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.tiers,
          childMealDiscountPercent: 120,
        },
      };
      const res = validateChildPolicy(invalid);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /between 0% and 100%/i);
    });

    it("rejects negative extra bed or baby cot rates", () => {
      const invalidBed: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        extraBeds: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.extraBeds,
          extraBedLkrPerNight: -500,
        },
      };
      assert.strictEqual(validateChildPolicy(invalidBed).isValid, false);

      const invalidCot: ChildPolicySettings = {
        ...DEFAULT_CHILD_POLICY_SETTINGS,
        extraBeds: {
          ...DEFAULT_CHILD_POLICY_SETTINGS.extraBeds,
          babyCotUsdPerNight: -10,
        },
      };
      assert.strictEqual(validateChildPolicy(invalidCot).isValid, false);
    });
  });

  describe("Child Category Classification (getChildCategory)", () => {
    const tiers = DEFAULT_CHILD_POLICY_SETTINGS.tiers;

    it("categorizes infants correctly (0-5 yrs)", () => {
      assert.strictEqual(getChildCategory(0, tiers), "INFANT");
      assert.strictEqual(getChildCategory(2, tiers), "INFANT");
      assert.strictEqual(getChildCategory(5, tiers), "INFANT");
    });

    it("categorizes junior children correctly (6-11 yrs)", () => {
      assert.strictEqual(getChildCategory(6, tiers), "CHILD");
      assert.strictEqual(getChildCategory(9, tiers), "CHILD");
      assert.strictEqual(getChildCategory(11, tiers), "CHILD");
    });

    it("categorizes teens and adults correctly (12+ yrs)", () => {
      assert.strictEqual(getChildCategory(12, tiers), "ADULT");
      assert.strictEqual(getChildCategory(15, tiers), "ADULT");
      assert.strictEqual(getChildCategory(35, tiers), "ADULT");
    });
  });

  describe("Supplement Calculation Math (calculateChildSupplement & calculateExtraBedsCost)", () => {
    const tiers = DEFAULT_CHILD_POLICY_SETTINGS.tiers;

    it("calculates Infant (0-5 yrs) as 100% complimentary stay & dine", () => {
      const calc: ChildSupplementCalculation = calculateChildSupplement(
        4,
        5000,
        35000,
        tiers,
        "LKR",
      );
      assert.strictEqual(calc.category, "INFANT");
      assert.strictEqual(calc.stayCost, 0);
      assert.strictEqual(calc.mealCost, 0);
      assert.strictEqual(calc.totalCost, 0);
    });

    it("calculates Junior Child (6-11 yrs) with 50% meal plan discount and free existing bed", () => {
      // Adult meal supplement = Rs 6,000 -> 50% discount = Rs 3,000
      const calcLkr = calculateChildSupplement(9, 6000, 40000, tiers, "LKR");
      assert.strictEqual(calcLkr.category, "CHILD");
      assert.strictEqual(calcLkr.stayCost, 0);
      assert.strictEqual(calcLkr.mealCost, 3000);
      assert.strictEqual(calcLkr.totalCost, 3000);

      // USD: Adult meal supplement = $25.50 -> 50% discount = $12.75
      const calcUsd = calculateChildSupplement(10, 25.5, 150, tiers, "USD");
      assert.strictEqual(calcUsd.category, "CHILD");
      assert.strictEqual(calcUsd.stayCost, 0);
      assert.strictEqual(calcUsd.mealCost, 12.75);
      assert.strictEqual(calcUsd.totalCost, 12.75);
    });

    it("calculates Teen/Adult (12+ yrs) with full room rate and full meal supplement", () => {
      const calc = calculateChildSupplement(14, 6000, 40000, tiers, "LKR");
      assert.strictEqual(calc.category, "ADULT");
      assert.strictEqual(calc.stayCost, 40000);
      assert.strictEqual(calc.mealCost, 6000);
      assert.strictEqual(calc.totalCost, 46000);
    });

    it("computes extra bed and baby cot multi-night tariffs accurately", () => {
      const policy: ExtraBedPolicy = DEFAULT_CHILD_POLICY_SETTINGS.extraBeds;
      // 1 extra bed (Rs 7,500) + 1 baby cot (Rs 0) for 3 nights = Rs 22,500
      const costLkr = calculateExtraBedsCost(1, 1, policy, "LKR", 3);
      assert.strictEqual(costLkr, 22500);

      // USD: 2 extra beds ($25) + 0 cot for 2 nights = 2 * 25 * 2 = $100
      const costUsd = calculateExtraBedsCost(2, 0, policy, "USD", 2);
      assert.strictEqual(costUsd, 100);
    });
  });

  describe("Component Static Rendering & Contract", () => {
    it("renders ChildPolicyCard without throwing", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChildPolicyCard, {} as ChildPolicyCardProps),
      );
      assert.ok(html.includes("Child Policy &amp; Extra Bed Supplement Rules"));
      assert.ok(html.includes("Infant Bracket (0–5 yrs)"));
      assert.ok(html.includes("Junior Child (6–11 yrs)"));
      assert.ok(html.includes("Extra Bed &amp; Baby Cot Tariffs"));
      assert.ok(html.includes("Interactive Reservation Policy Simulator"));
    });

    it("renders in readOnly mode hiding save actions", () => {
      const html = renderToStaticMarkup(
        React.createElement(ChildPolicyCard, {
          readOnly: true,
        } as ChildPolicyCardProps),
      );
      assert.ok(!html.includes("Save Child Policy"));
      assert.ok(!html.includes("Reset Standard Presets"));
    });
  });
});
