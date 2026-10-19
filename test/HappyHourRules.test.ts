import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HAPPY_HOUR_RULES,
  type HappyHourPricingResult,
  type HappyHourRule,
  HappyHourRuleCard,
  type HappyHourRuleCardProps,
  HappyHourRules,
  type HappyHourRulesProps,
  HappyHourSimulator,
  type HappyHourSimulatorProps,
  calculateHappyHourPrice,
  formatPriceLkr,
  getCurrentSriLankaTime,
  isRuleActiveAt,
  isTimeInWindow,
} from "../src/admin/menus/HappyHourRules.js";

describe("Step 239: Happy Hour & Poolside Dynamic Pricing Rules (HappyHourRules.tsx)", () => {
  describe("1. Default Happy Hour Rules Configuration", () => {
    it("configures the 3 core Sri Lankan resort happy hour presets", () => {
      assert.strictEqual(DEFAULT_HAPPY_HOUR_RULES.length, 3);
      const ids = DEFAULT_HAPPY_HOUR_RULES.map((r: HappyHourRule) => r.id);
      assert.ok(ids.includes("hh-sunset-01"));
      assert.ok(ids.includes("hh-bogo-late-02"));
      assert.ok(ids.includes("hh-midday-thambili-03"));
    });

    it("verifies Sunset Happy Hour 17:00-19:00 with 25% discount", () => {
      const sunset = DEFAULT_HAPPY_HOUR_RULES.find((r) => r.id === "hh-sunset-01");
      assert.ok(sunset);
      assert.strictEqual(sunset.startTime, "17:00");
      assert.strictEqual(sunset.endTime, "19:00");
      assert.strictEqual(sunset.discountType, "PERCENTAGE");
      assert.strictEqual(sunset.discountValue, 25);
      assert.strictEqual(sunset.daysOfWeek.length, 7);
      assert.ok(sunset.applicableItemCodes.includes("BAR-LION-01"));
      assert.ok(sunset.applicableItemCodes.includes("BAR-ARCK-01"));
    });

    it("verifies Weekend BOGO rule active on Friday (5) and Saturday (6)", () => {
      const bogo = DEFAULT_HAPPY_HOUR_RULES.find((r) => r.id === "hh-bogo-late-02");
      assert.ok(bogo);
      assert.strictEqual(bogo.discountType, "BOGO");
      assert.deepStrictEqual(bogo.daysOfWeek, [5, 6]);
      assert.strictEqual(bogo.startTime, "22:00");
      assert.strictEqual(bogo.endTime, "23:59");
    });
  });

  describe("2. Pure Time & Dynamic Pricing Math", () => {
    it("isTimeInWindow evaluates daytime windows correctly", () => {
      // 17:00 to 19:00
      assert.strictEqual(isTimeInWindow("17:30", "17:00", "19:00"), true);
      assert.strictEqual(isTimeInWindow("17:00", "17:00", "19:00"), true);
      assert.strictEqual(isTimeInWindow("19:00", "17:00", "19:00"), true);
      assert.strictEqual(isTimeInWindow("16:59", "17:00", "19:00"), false);
      assert.strictEqual(isTimeInWindow("19:01", "17:00", "19:00"), false);
    });

    it("isTimeInWindow handles cross-midnight overnight windows safely", () => {
      // 22:00 to 02:00 overnight
      assert.strictEqual(isTimeInWindow("23:30", "22:00", "02:00"), true);
      assert.strictEqual(isTimeInWindow("01:15", "22:00", "02:00"), true);
      assert.strictEqual(isTimeInWindow("12:00", "22:00", "02:00"), false);
      assert.strictEqual(isTimeInWindow("21:59", "22:00", "02:00"), false);
    });

    it("isRuleActiveAt checks day of week constraint", () => {
      const bogoRule = DEFAULT_HAPPY_HOUR_RULES.find((r) => r.id === "hh-bogo-late-02");
      assert.ok(bogoRule);

      // Friday (5) at 22:30 -> Active
      assert.strictEqual(isRuleActiveAt(bogoRule, "22:30", 5), true);
      // Saturday (6) at 23:00 -> Active
      assert.strictEqual(isRuleActiveAt(bogoRule, "23:00", 6), true);
      // Wednesday (3) at 22:30 -> Inactive (not a weekend)
      assert.strictEqual(isRuleActiveAt(bogoRule, "22:30", 3), false);
    });

    it("calculateHappyHourPrice applies 25% discount during Sunset Happy Hour", () => {
      // 2 Lion Lagers @ LKR 1,100 = 2,200 LKR
      // 25% discount -> LKR 1,650 (Savings: 550 LKR)
      const res: HappyHourPricingResult = calculateHappyHourPrice(
        1100.0,
        2,
        "BAR-LION-01",
        DEFAULT_HAPPY_HOUR_RULES,
        "18:00", // 18:00 is within 17:00-19:00
        2, // Tuesday
      );

      assert.strictEqual(res.isHappyHourActive, true);
      assert.strictEqual(res.originalTotalLkr, 2200.0);
      assert.strictEqual(res.discountedTotalLkr, 1650.0);
      assert.strictEqual(res.savingsLkr, 550.0);
      assert.strictEqual(res.effectiveUnitPriceLkr, 825.0);
      assert.ok(res.explanation.includes("25% discount"));
    });

    it("calculateHappyHourPrice applies BOGO (Buy 1 Get 1 Free) on eligible drinks", () => {
      // 2 Arrack Cocktails @ LKR 1,850 = 3,700 LKR
      // BOGO -> pays for 1 cocktail (1,850 LKR), saves 1,850 LKR
      const resEven = calculateHappyHourPrice(
        1850.0,
        2,
        "BAR-ARCK-01",
        DEFAULT_HAPPY_HOUR_RULES,
        "22:30",
        5, // Friday
      );

      assert.strictEqual(resEven.isHappyHourActive, true);
      assert.strictEqual(resEven.originalTotalLkr, 3700.0);
      assert.strictEqual(resEven.discountedTotalLkr, 1850.0);
      assert.strictEqual(resEven.savingsLkr, 1850.0);
      assert.strictEqual(resEven.effectiveUnitPriceLkr, 925.0);
      assert.ok(resEven.explanation.includes("Buy 1 Get 1 Free"));

      // 3 Arrack Cocktails -> pays for Math.ceil(3/2) = 2 cocktails (3,700 LKR), saves 1,850 LKR
      const resOdd = calculateHappyHourPrice(
        1850.0,
        3,
        "BAR-ARCK-01",
        DEFAULT_HAPPY_HOUR_RULES,
        "22:30",
        5,
      );

      assert.strictEqual(resOdd.discountedTotalLkr, 3700.0);
      assert.strictEqual(resOdd.savingsLkr, 1850.0);
    });

    it("calculateHappyHourPrice returns standard pricing outside window", () => {
      const res = calculateHappyHourPrice(
        1100.0,
        2,
        "BAR-LION-01",
        DEFAULT_HAPPY_HOUR_RULES,
        "15:00", // 15:00 is outside 17:00-19:00
        1,
      );

      assert.strictEqual(res.isHappyHourActive, false);
      assert.strictEqual(res.originalTotalLkr, 2200.0);
      assert.strictEqual(res.discountedTotalLkr, 2200.0);
      assert.strictEqual(res.savingsLkr, 0);
      assert.ok(res.explanation.includes("Standard menu rate applies"));
    });

    it("getCurrentSriLankaTime returns valid SLST time string and day of week", () => {
      const { time, dayOfWeek } = getCurrentSriLankaTime();
      assert.match(time, /^[0-9]{2}:[0-9]{2}$/);
      assert.ok(dayOfWeek >= 0 && dayOfWeek <= 6);
    });

    it("formatPriceLkr formats currency with LKR symbol", () => {
      const formatted = formatPriceLkr(1850);
      assert.ok(formatted.includes("1,850") || formatted.includes("1850"));
    });
  });

  describe("3. React Static Markup & Subcomponents Rendering", () => {
    it("renders HappyHourRuleCard with rule details, badges, and times", () => {
      const rule = DEFAULT_HAPPY_HOUR_RULES[0];
      assert.ok(rule);

      const cardProps: HappyHourRuleCardProps = {
        rule,
        isCurrentlyActive: true,
        onToggleActive: () => {
          /* no-op for static test */
        },
      };

      const html = renderToStaticMarkup(React.createElement(HappyHourRuleCard, cardProps));
      assert.ok(html.includes('data-testid="rule-card-hh-sunset-01"'));
      assert.ok(html.includes("Golden Sunset Happy Hour"));
      assert.ok(html.includes("LIVE NOW"));
      assert.ok(html.includes("17:00 – 19:00") || html.includes("17:00"));
      assert.ok(html.includes("25% OFF"));
      assert.ok(html.includes("Sunset 25% OFF"));
    });

    it("renders HappyHourSimulator with simulated time inputs and result card", () => {
      const simProps: HappyHourSimulatorProps = {
        rules: DEFAULT_HAPPY_HOUR_RULES,
        currentSlTime: "18:00",
        currentSlDay: 5,
      };

      const html = renderToStaticMarkup(React.createElement(HappyHourSimulator, simProps));
      assert.ok(html.includes('data-testid="happy-hour-simulator"'));
      assert.ok(html.includes('data-testid="sim-time-input"'));
      assert.ok(html.includes('data-testid="sim-result-card"'));
      assert.ok(html.includes("Real-Time Happy Hour Pricing Simulator"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders full HappyHourRules page with Apple Liquid Glass and tabular numbers", () => {
      const pageProps: HappyHourRulesProps = {
        rules: DEFAULT_HAPPY_HOUR_RULES,
      };

      const html = renderToStaticMarkup(React.createElement(HappyHourRules, pageProps));
      assert.ok(html.includes('data-testid="happy-hour-rules-root"'));
      assert.ok(
        html.includes("Sunset Happy Hour &amp; Poolside Dynamic Pricing") ||
          html.includes("Sunset Happy Hour & Poolside Dynamic Pricing"),
      );
      assert.ok(html.includes("SLST 17:00–19:00 Target"));
      assert.ok(html.includes('data-testid="happy-hour-rules-list"'));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("supports readOnly mode by hiding toggles and save buttons", () => {
      const pageProps: HappyHourRulesProps = {
        rules: DEFAULT_HAPPY_HOUR_RULES,
        readOnly: true,
      };

      const html = renderToStaticMarkup(React.createElement(HappyHourRules, pageProps));
      assert.ok(!html.includes('data-testid="save-happy-hour-btn"'));
      assert.ok(!html.includes('data-testid="toggle-rule-'));
    });
  });
});
