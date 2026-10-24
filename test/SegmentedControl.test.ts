import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KDS_VIEW_OPTIONS,
  MEAL_PLAN_OPTIONS,
  RESIDENCY_TIER_OPTIONS,
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
  type SegmentedControlSize,
  getNextNavigationIndex,
  getSegmentedControlSizeClasses,
} from "../src/components/SegmentedControl.js";

describe("iOS/macOS Sliding Pill Segmented Control (SegmentedControl.tsx)", () => {
  describe("Size Configurations (getSegmentedControlSizeClasses)", () => {
    it("returns correct sizing tokens for sm, md, and lg sizes", () => {
      const sm = getSegmentedControlSizeClasses("sm");
      assert.ok(sm.container.includes("min-h-[36px]"));
      assert.ok(sm.text.includes("text-xs"));

      const md = getSegmentedControlSizeClasses("md");
      assert.ok(md.container.includes("min-h-[44px]"));
      assert.ok(md.text.includes("text-sm"));

      const lg = getSegmentedControlSizeClasses("lg");
      assert.ok(lg.container.includes("min-h-[52px]"));
      assert.ok(lg.text.includes("text-base"));

      const fallback = getSegmentedControlSizeClasses(undefined);
      assert.ok(fallback.container.includes("min-h-[44px]"));
    });
  });

  describe("Keyboard Navigation Calculation (getNextNavigationIndex)", () => {
    it("handles ArrowRight and ArrowDown forward navigation", () => {
      assert.strictEqual(getNextNavigationIndex("ArrowRight", 0, 3), 1);
      assert.strictEqual(getNextNavigationIndex("ArrowDown", 2, 3), 0);
    });

    it("handles ArrowLeft and ArrowUp backward navigation", () => {
      assert.strictEqual(getNextNavigationIndex("ArrowLeft", 0, 3), 2);
      assert.strictEqual(getNextNavigationIndex("ArrowUp", 2, 3), 1);
    });

    it("handles Home and End jump navigation", () => {
      assert.strictEqual(getNextNavigationIndex("Home", 2, 3), 0);
      assert.strictEqual(getNextNavigationIndex("End", 0, 3), 2);
    });

    it("returns null for non-navigation keys or empty list", () => {
      assert.strictEqual(getNextNavigationIndex("Enter", 0, 3), null);
      assert.strictEqual(getNextNavigationIndex("ArrowRight", 0, 0), null);
    });
  });

  describe("Sri Lankan Hospitality Presets", () => {
    it("exports valid residency tier options (Resident LKR vs Foreign USD)", () => {
      assert.strictEqual(RESIDENCY_TIER_OPTIONS.length, 2);
      assert.strictEqual(RESIDENCY_TIER_OPTIONS[0]?.id, "RESIDENT_LKR");
      assert.strictEqual(RESIDENCY_TIER_OPTIONS[0]?.label, "Resident LKR");
      assert.strictEqual(RESIDENCY_TIER_OPTIONS[1]?.id, "FOREIGN_USD");
      assert.strictEqual(RESIDENCY_TIER_OPTIONS[1]?.label, "Foreign USD");
    });

    it("exports valid meal plan options (RO, BB, HB, FB, AI)", () => {
      assert.strictEqual(MEAL_PLAN_OPTIONS.length, 5);
      const ids = MEAL_PLAN_OPTIONS.map((opt) => opt.id);
      assert.deepStrictEqual(ids, ["RO", "BB", "HB", "FB", "AI"]);
    });

    it("exports valid KDS tickets view options (ALL, KITCHEN, BAR)", () => {
      assert.strictEqual(KDS_VIEW_OPTIONS.length, 3);
      const ids = KDS_VIEW_OPTIONS.map((opt) => opt.id);
      assert.deepStrictEqual(ids, ["ALL", "KITCHEN", "BAR"]);
    });
  });

  describe("Static HTML Markup Rendering", () => {
    it("renders segmented control with accessibility roles and active pill", () => {
      let selected = "RESIDENT_LKR";
      const markup = renderToStaticMarkup(
        React.createElement(SegmentedControl, {
          options: RESIDENCY_TIER_OPTIONS,
          value: selected,
          onChange: (val) => {
            selected = val;
          },
          ariaLabel: "Guest Residency Tier",
        }),
      );

      assert.ok(markup.includes('role="tablist"'));
      assert.ok(markup.includes('aria-label="Guest Residency Tier"'));
      assert.ok(markup.includes('role="tab"'));
      assert.ok(markup.includes('aria-selected="true"'));
      assert.ok(markup.includes("Resident LKR"));
      assert.ok(markup.includes("Foreign USD"));
      assert.ok(markup.includes("min-h-[44px]"));
    });

    it("renders badges and icons when provided", () => {
      const optionsWithBadges: SegmentedControlOption<string>[] = [
        {
          id: "open",
          label: "Active Orders",
          badge: 5,
          icon: React.createElement("span", { className: "icon" }, "*"),
        },
        { id: "completed", label: "Completed", badge: 12 },
      ];

      const markup = renderToStaticMarkup(
        React.createElement(SegmentedControl, {
          options: optionsWithBadges,
          value: "open",
          onChange: (_val) => undefined,
        }),
      );

      assert.ok(markup.includes("Active Orders"));
      assert.ok(markup.includes("*"));
      assert.ok(markup.includes("5"));
      assert.ok(markup.includes("12"));
    });

    it("renders full width container and buttons", () => {
      const markup = renderToStaticMarkup(
        React.createElement(SegmentedControl, {
          options: MEAL_PLAN_OPTIONS,
          value: "BB",
          onChange: (_val) => undefined,
          fullWidth: true,
        }),
      );

      assert.ok(markup.includes("w-full"));
      assert.ok(markup.includes("flex-1"));
    });

    it("renders disabled state on entire control and individual options", () => {
      const options: SegmentedControlOption<string>[] = [
        { id: "a", label: "Option A" },
        { id: "b", label: "Option B", disabled: true },
      ];

      const markup = renderToStaticMarkup(
        React.createElement(SegmentedControl, {
          options,
          value: "a",
          onChange: (_val) => undefined,
          disabled: true,
        }),
      );

      assert.ok(markup.includes("pointer-events-none"));
      assert.ok(markup.includes('aria-disabled="true"'));
    });
  });

  describe("Type Definitions & Construction", () => {
    it("validates all exported interfaces and types are properly formed", () => {
      const _option: SegmentedControlOption<"TEST_A" | "TEST_B"> = {
        id: "TEST_A",
        label: "Test Label",
        badge: 3,
        disabled: false,
      };

      const _size: SegmentedControlSize = "lg";

      const _props: SegmentedControlProps<"TEST_A" | "TEST_B"> = {
        options: [_option],
        value: "TEST_A",
        onChange: (_val) => undefined,
        size: _size,
        fullWidth: true,
        disabled: false,
        ariaLabel: "Test Radiogroup",
        className: "custom-control",
      };

      assert.strictEqual(_option.id, "TEST_A");
      assert.strictEqual(_props.size, "lg");
      assert.ok(_props.fullWidth);
    });
  });
});
