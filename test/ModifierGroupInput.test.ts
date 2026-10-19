import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ALL_MODIFIER_PRESETS,
  type ModifierGroup,
  ModifierGroupCard,
  ModifierGroupInput,
  type ModifierGroupInputProps,
  type ModifierOptionItem,
  ModifierOptionRow,
  ModifierPresetsBar,
  PRESET_BREAKFAST_EXTRAS,
  PRESET_PORTION_SIZES,
  PRESET_RICE_VARIETIES,
  PRESET_SPICE_LEVELS,
  type ValidationResult,
  createEmptyModifierGroup,
  createEmptyModifierOption,
  flattenModifierGroupsToOptions,
  formatLkrPriceAdjustment,
  groupModifierOptions,
  resolveModifierTrilingual,
  validateModifierGroups,
} from "../src/admin/menus/ModifierGroupInput.js";
import type { ModifierOption } from "../src/generated/graphql.js";

describe("Step 231: Dish Modifiers, Add-Ons & Portion Size Builder (ModifierGroupInput.tsx)", () => {
  describe("1. Authentic Sri Lankan Presets & Domain Data Integrity", () => {
    it("exports 4 comprehensive hospitality modifier presets", () => {
      assert.strictEqual(ALL_MODIFIER_PRESETS.length, 4);
      const ids = ALL_MODIFIER_PRESETS.map((p) => p.id);
      assert.ok(ids.includes("GRP-SPICE-LEVELS"));
      assert.ok(ids.includes("GRP-BREAKFAST-EXTRAS"));
      assert.ok(ids.includes("GRP-PORTION-SIZES"));
      assert.ok(ids.includes("GRP-RICE-VARIETIES"));
    });

    it("configures PRESET_SPICE_LEVELS with Mild Tourist, Medium, and Authentic SL Spicy", () => {
      assert.strictEqual(PRESET_SPICE_LEVELS.selectionType, "SINGLE");
      assert.strictEqual(PRESET_SPICE_LEVELS.isRequired, true);
      assert.strictEqual(PRESET_SPICE_LEVELS.options.length, 3);

      const mild = PRESET_SPICE_LEVELS.options[0];
      const medium = PRESET_SPICE_LEVELS.options[1];
      const hot = PRESET_SPICE_LEVELS.options[2];
      assert.ok(mild);
      assert.ok(medium);
      assert.ok(hot);

      assert.strictEqual(mild.name.en, "Mild Tourist");
      assert.strictEqual(mild.priceAdjustmentLkr, 0);
      assert.strictEqual(mild.isDefault, true);

      assert.strictEqual(medium.name.en, "Medium");
      assert.strictEqual(medium.priceAdjustmentLkr, 0);
      assert.strictEqual(medium.isDefault, false);

      assert.strictEqual(hot.name.en, "Authentic Sri Lankan Spicy");
      assert.strictEqual(hot.priceAdjustmentLkr, 0);
      assert.strictEqual(hot.isDefault, false);
      assert.ok(hot.name.si?.includes("සැබෑ ශ්‍රී ලාංකික සැර"));
    });

    it("configures PRESET_BREAKFAST_EXTRAS with +Egg Hopper LKR 250 and +Prawn Curry LKR 950", () => {
      assert.strictEqual(PRESET_BREAKFAST_EXTRAS.selectionType, "MULTIPLE");
      assert.strictEqual(PRESET_BREAKFAST_EXTRAS.isRequired, false);
      assert.strictEqual(PRESET_BREAKFAST_EXTRAS.options.length, 4);

      const eggHopper = PRESET_BREAKFAST_EXTRAS.options.find((o) =>
        o.name.en.includes("Egg Hopper"),
      );
      assert.ok(eggHopper);
      assert.strictEqual(eggHopper.priceAdjustmentLkr, 250);

      const prawnCurry = PRESET_BREAKFAST_EXTRAS.options.find((o) =>
        o.name.en.includes("Prawn Curry"),
      );
      assert.ok(prawnCurry);
      assert.strictEqual(prawnCurry.priceAdjustmentLkr, 950);

      const kattaSambol = PRESET_BREAKFAST_EXTRAS.options.find((o) =>
        o.name.en.includes("Katta Sambol"),
      );
      assert.ok(kattaSambol);
      assert.strictEqual(kattaSambol.priceAdjustmentLkr, 120);

      const seeniSambol = PRESET_BREAKFAST_EXTRAS.options.find((o) =>
        o.name.en.includes("Seeni Sambol"),
      );
      assert.ok(seeniSambol);
      assert.strictEqual(seeniSambol.priceAdjustmentLkr, 150);
    });

    it("configures PRESET_PORTION_SIZES with Regular, Large, and Family Sharing tier", () => {
      assert.strictEqual(PRESET_PORTION_SIZES.selectionType, "SINGLE");
      assert.strictEqual(PRESET_PORTION_SIZES.isRequired, true);
      assert.strictEqual(PRESET_PORTION_SIZES.options.length, 3);

      const reg = PRESET_PORTION_SIZES.options[0];
      const large = PRESET_PORTION_SIZES.options[1];
      const family = PRESET_PORTION_SIZES.options[2];
      assert.ok(reg);
      assert.ok(large);
      assert.ok(family);

      assert.strictEqual(reg.priceAdjustmentLkr, 0);
      assert.strictEqual(reg.isDefault, true);
      assert.strictEqual(large.priceAdjustmentLkr, 450);
      assert.strictEqual(family.priceAdjustmentLkr, 1200);
    });

    it("configures PRESET_RICE_VARIETIES with Samba, Red Rice, and Yellow Rice", () => {
      assert.strictEqual(PRESET_RICE_VARIETIES.selectionType, "SINGLE");
      assert.strictEqual(PRESET_RICE_VARIETIES.options.length, 3);
      const opt0 = PRESET_RICE_VARIETIES.options[0];
      const opt1 = PRESET_RICE_VARIETIES.options[1];
      const opt2 = PRESET_RICE_VARIETIES.options[2];
      assert.ok(opt0);
      assert.ok(opt1);
      assert.ok(opt2);
      assert.strictEqual(opt0.name.en, "Steamed White Samba Rice");
      assert.strictEqual(opt1.priceAdjustmentLkr, 100);
      assert.strictEqual(opt2.priceAdjustmentLkr, 250);
    });
  });

  describe("2. Pure Utility & Conversion Functions", () => {
    it("resolves trilingual text correctly with fallbacks", () => {
      const text = {
        en: "Spice Level",
        si: "මිරිස් සැර ප්‍රමාණය",
        ta: "கார அளவு",
      };

      assert.strictEqual(resolveModifierTrilingual(text, "en"), "Spice Level");
      assert.strictEqual(resolveModifierTrilingual(text, "si"), "මිරිස් සැර ප්‍රමාණය");
      assert.strictEqual(resolveModifierTrilingual(text, "ta"), "கார அளவு");

      // Fallback when missing
      const partial = { en: "English Only", si: "", ta: "" };
      assert.strictEqual(resolveModifierTrilingual(partial, "si"), "English Only");
      assert.strictEqual(resolveModifierTrilingual(partial, "ta"), "English Only");
      assert.strictEqual(resolveModifierTrilingual(null, "en"), "");
    });

    it("formats LKR price adjustments cleanly", () => {
      assert.strictEqual(formatLkrPriceAdjustment(0), "Included (LKR 0.00)");
      assert.strictEqual(formatLkrPriceAdjustment(250), "+ LKR 250.00");
      assert.strictEqual(formatLkrPriceAdjustment(950.5), "+ LKR 950.50");
      assert.strictEqual(formatLkrPriceAdjustment(-50), "- LKR 50.00");
    });

    it("creates empty modifier options and groups with valid defaults", () => {
      const opt = createEmptyModifierOption("Extra Cheese", 200);
      assert.ok(opt.id.startsWith("OPT-"));
      assert.strictEqual(opt.name.en, "Extra Cheese");
      assert.strictEqual(opt.priceAdjustmentLkr, 200);
      assert.strictEqual(opt.isDefault, false);

      const group = createEmptyModifierGroup("Meat Choice");
      assert.ok(group.id.startsWith("GRP-"));
      assert.strictEqual(group.name.en, "Meat Choice");
      assert.strictEqual(group.selectionType, "SINGLE");
      assert.strictEqual(group.options.length, 1);
    });

    it("validates modifier groups thoroughly and catches configuration errors", () => {
      const valid: ValidationResult = validateModifierGroups([
        PRESET_SPICE_LEVELS,
        PRESET_BREAKFAST_EXTRAS,
      ]);
      assert.strictEqual(valid.isValid, true);
      assert.strictEqual(valid.errors.length, 0);

      const invalidGroup: ModifierGroup = {
        id: "GRP-BAD",
        name: { en: "", si: "", ta: "" },
        selectionType: "SINGLE",
        minSelections: 1,
        maxSelections: 2, // Invalid for SINGLE
        isRequired: true,
        options: [
          {
            id: "OPT-BAD",
            name: { en: "", si: "", ta: "" },
            priceAdjustmentLkr: -50,
            isDefault: false,
          },
        ],
      };

      const invalidRes: ValidationResult = validateModifierGroups([invalidGroup]);
      assert.strictEqual(invalidRes.isValid, false);
      assert.ok(invalidRes.errors.some((e) => e.includes("missing an English name")));
      assert.ok(invalidRes.errors.some((e) => e.includes("maxSelections equal to 1")));
      assert.ok(invalidRes.errors.some((e) => e.includes("cannot be negative")));
    });

    it("flattens structured modifier groups into GraphQL ModifierOption array", () => {
      const flattened = flattenModifierGroupsToOptions([
        PRESET_SPICE_LEVELS,
        PRESET_BREAKFAST_EXTRAS,
      ]);
      assert.strictEqual(flattened.length, 7); // 3 + 4
      const opt0 = flattened[0];
      const opt3 = flattened[3];
      assert.ok(opt0);
      assert.ok(opt3);
      assert.strictEqual(opt0.__typename, "ModifierOption");
      assert.strictEqual(opt0.name.en, "Mild Tourist");
      assert.strictEqual(opt0.priceAdjustmentLkr, 0);
      assert.strictEqual(opt3.name.en, "+Egg Hopper");
      assert.strictEqual(opt3.priceAdjustmentLkr, 250);
    });

    it("groups flat legacy options into a modifier group", () => {
      const legacyOptions: ReadonlyArray<ModifierOption> = [
        {
          __typename: "ModifierOption",
          id: "OPT-1",
          name: { en: "Extra Sauce", si: "", ta: "" },
          priceAdjustmentLkr: 50,
          isDefault: false,
        },
      ];

      const grouped = groupModifierOptions(legacyOptions, "Custom Add-ons");
      assert.strictEqual(grouped.length, 1);
      const group0 = grouped[0];
      assert.ok(group0);
      assert.strictEqual(group0.name.en, "Custom Add-ons");
      assert.strictEqual(group0.options.length, 1);
      const innerOpt0 = group0.options[0];
      assert.ok(innerOpt0);
      assert.strictEqual(innerOpt0.name.en, "Extra Sauce");

      assert.deepStrictEqual(groupModifierOptions([]), []);
    });
  });

  describe("3. React Component Rendering & Apple HIG Markup", () => {
    const noop = () => undefined;

    it("renders ModifierPresetsBar with all 4 presets and proper accessibility labels", () => {
      const html = renderToStaticMarkup(
        React.createElement(ModifierPresetsBar, {
          onApplyPreset: noop,
          existingGroupIds: new Set(["GRP-SPICE-LEVELS"]),
          disabled: false,
        }),
      );

      assert.ok(html.includes("1-Click Sri Lankan Presets"));
      assert.ok(html.includes("✓ Spice Level")); // Already added
      assert.ok(html.includes("+ Sri Lankan Breakfast Extras"));
      assert.ok(html.includes("+ Portion Size"));
      assert.ok(html.includes("+ Rice Variety Choice"));
      assert.ok(html.includes("min-h-[44px]")); // Apple HIG touch target
    });

    it("renders ModifierOptionRow with tabular numbers and inputs", () => {
      const opt: ModifierOptionItem = {
        id: "OPT-TEST-HOPPER",
        name: { en: "+Egg Hopper", si: "+බිත්තර ආප්ප", ta: "" },
        priceAdjustmentLkr: 250,
        isDefault: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(ModifierOptionRow, {
          groupId: "GRP-TEST",
          option: opt,
          index: 0,
          selectionType: "MULTIPLE",
          isReadOnly: false,
          onUpdateOption: noop,
          onRemoveOption: noop,
        }),
      );

      assert.ok(html.includes('data-testid="modifier-option-row-GRP-TEST-OPT-TEST-HOPPER"'));
      assert.ok(html.includes("+Egg Hopper"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes('value="250"'));
      assert.ok(html.includes("★ Default"));
      assert.ok(html.includes('aria-label="Remove option +Egg Hopper"'));
    });

    it("renders ModifierGroupCard with Liquid Glass backdrop blur and trilingual tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(ModifierGroupCard, {
          group: PRESET_SPICE_LEVELS,
          index: 0,
          isReadOnly: false,
          onUpdateGroup: noop,
          onRemoveGroup: noop,
          onMoveUp: noop,
          onMoveDown: noop,
        }),
      );

      assert.ok(html.includes('data-testid="modifier-group-card-GRP-SPICE-LEVELS"'));
      assert.ok(html.includes("Spice Level"));
      assert.ok(html.includes("Single Choice"));
      assert.ok(html.includes("Required"));
      assert.ok(html.includes("backdrop-blur-xl"));
      assert.ok(html.includes("Mild Tourist"));
      assert.ok(html.includes("Authentic Sri Lankan Spicy"));
      assert.ok(html.includes('aria-label="Move group up"'));
      assert.ok(html.includes('aria-label="Move group down"'));
    });

    it("renders ModifierGroupInput in empty state when no groups are provided", () => {
      const props: ModifierGroupInputProps = {
        groups: [],
        onChange: noop,
        readOnly: false,
      };

      const html = renderToStaticMarkup(React.createElement(ModifierGroupInput, props));

      assert.ok(html.includes('data-testid="modifier-group-input"'));
      assert.ok(html.includes('data-testid="modifier-empty-state"'));
      assert.ok(html.includes("0 groups • 0 options"));
      assert.ok(html.includes("No Modifier Groups Added"));
      assert.ok(html.includes("Add Spice Levels"));
      assert.ok(html.includes("Add Breakfast Extras"));
    });

    it("renders ModifierGroupInput with active groups and summary metrics", () => {
      const props: ModifierGroupInputProps = {
        groups: [PRESET_SPICE_LEVELS, PRESET_BREAKFAST_EXTRAS],
        onChange: noop,
        readOnly: false,
      };

      const html = renderToStaticMarkup(React.createElement(ModifierGroupInput, props));

      assert.ok(html.includes("2 groups • 7 options"));
      assert.ok(html.includes("GRP-SPICE-LEVELS"));
      assert.ok(html.includes("GRP-BREAKFAST-EXTRAS"));
      assert.ok(html.includes("New Custom Group"));
    });

    it("respects readOnly property by disabling modification buttons", () => {
      const props: ModifierGroupInputProps = {
        groups: [PRESET_SPICE_LEVELS],
        onChange: noop,
        readOnly: true,
      };

      const html = renderToStaticMarkup(React.createElement(ModifierGroupInput, props));

      assert.ok(!html.includes("New Custom Group"));
      assert.ok(!html.includes("1-Click Sri Lankan Presets"));
      assert.ok(!html.includes("+ Add Option"));
      assert.ok(!html.includes("Remove option"));
    });
  });
});
