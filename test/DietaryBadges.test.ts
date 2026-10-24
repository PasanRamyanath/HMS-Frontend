import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DIETARY_CONFIG_REGISTRY,
  DietaryAllergenModal,
  type DietaryAllergenModalProps,
  DietaryBadge,
  type DietaryBadgeConfig,
  type DietaryBadgeProps,
  type DietaryBadgeSize,
  type DietaryBadgeVariant,
  DietaryBadges,
  type DietaryBadgesProps,
  type DietaryCategory,
  DietaryIcon,
  type DietaryItemAttributes,
  type DietaryTag,
  SpicyChiliBar,
  type SpicyChiliBarProps,
  type TrilingualContent,
  getDietaryBadgeConfig,
  getSpicinessLabel,
  hasAllergenWarnings,
  normalizeDietaryTag,
  resolveDietaryBadges,
} from "../src/components/DietaryBadges.js";

describe("Step 240: Allergen, Halal, Vegetarian, Vegan & Dietary Badges (DietaryBadges.tsx)", () => {
  describe("1. Configuration Registry & Trilingual Dictionary", () => {
    it("contains all core Sri Lankan multi-faith & international dietary tags", () => {
      const keys = Object.keys(DIETARY_CONFIG_REGISTRY);
      assert.ok(keys.includes("VEGETARIAN"));
      assert.ok(keys.includes("VEGAN"));
      assert.ok(keys.includes("HALAL"));
      assert.ok(keys.includes("CONTAINS_SHELLFISH"));
      assert.ok(keys.includes("CONTAINS_PORK"));
      assert.ok(keys.includes("CONTAINS_BEEF"));
      assert.ok(keys.includes("GLUTEN_FREE"));
      assert.ok(keys.includes("CONTAINS_NUTS"));
      assert.ok(keys.includes("CONTAINS_DAIRY"));
      assert.ok(keys.includes("SPICY_HOT"));
    });

    it("verifies trilingual labels and descriptions for Halal, Pork, and Beef", () => {
      const halal = DIETARY_CONFIG_REGISTRY.HALAL;
      assert.strictEqual(halal.label.en, "Halal Sourced");
      assert.strictEqual(halal.label.si, "හලාල් සහතිකලත්");
      assert.strictEqual(halal.label.ta, "ஹலால் சான்றளிக்கப்பட்டது");
      assert.strictEqual(halal.isReligiousWarning, true);

      const pork = DIETARY_CONFIG_REGISTRY.CONTAINS_PORK;
      assert.strictEqual(pork.shortCode, "PORK");
      assert.ok(pork.description.en.includes("Strictly non-Halal"));
      assert.ok(pork.description.si.includes("ඌරු මස්"));
      assert.ok(pork.description.ta.includes("பன்றி இறைச்சி"));

      const beef = DIETARY_CONFIG_REGISTRY.CONTAINS_BEEF;
      assert.strictEqual(beef.shortCode, "BEEF");
      assert.ok(beef.description.en.includes("Not suitable for Hindu guests"));
      assert.ok(beef.description.si.includes("ගව මස්"));
      assert.ok(beef.description.ta.includes("மாட்டிறைச்சி"));
    });

    it("verifies Shellfish and Nuts allergen warning flags", () => {
      const shellfish = DIETARY_CONFIG_REGISTRY.CONTAINS_SHELLFISH;
      assert.strictEqual(shellfish.isAllergenWarning, true);
      assert.strictEqual(shellfish.category, "ALLERGEN_WARNING");

      const nuts = DIETARY_CONFIG_REGISTRY.CONTAINS_NUTS;
      assert.strictEqual(nuts.isAllergenWarning, true);
      assert.ok(nuts.description.en.includes("cashews (kaju)"));
    });
  });

  describe("2. Pure Normalization & Badge Resolvers", () => {
    it("normalizeDietaryTag maps common aliases and shortcodes", () => {
      assert.strictEqual(normalizeDietaryTag("VEG"), "VEGETARIAN");
      assert.strictEqual(normalizeDietaryTag("vegan"), "VEGAN");
      assert.strictEqual(normalizeDietaryTag("plant-based"), "VEGAN");
      assert.strictEqual(normalizeDietaryTag("Halal"), "HALAL");
      assert.strictEqual(normalizeDietaryTag("crab"), "CONTAINS_SHELLFISH");
      assert.strictEqual(normalizeDietaryTag("prawn"), "CONTAINS_SHELLFISH");
      assert.strictEqual(normalizeDietaryTag("pork"), "CONTAINS_PORK");
      assert.strictEqual(normalizeDietaryTag("beef"), "CONTAINS_BEEF");
      assert.strictEqual(normalizeDietaryTag("gf"), "GLUTEN_FREE");
      assert.strictEqual(normalizeDietaryTag("cashew"), "CONTAINS_NUTS");
      assert.strictEqual(normalizeDietaryTag("lactose"), "CONTAINS_DAIRY");
      assert.strictEqual(normalizeDietaryTag("mild"), "SPICY_MILD");
      assert.strictEqual(normalizeDietaryTag("hot"), "SPICY_HOT");
      assert.strictEqual(normalizeDietaryTag("unknown_junk"), null);
    });

    it("resolveDietaryBadges maps from DietaryItemAttributes object", () => {
      const attrs: DietaryItemAttributes = {
        isVegan: true,
        isVegetarian: true, // Vegan takes precedence
        isHalal: true,
        containsShellfish: false,
        containsNuts: true,
        spicyLevel: 2,
      };

      const resolved = resolveDietaryBadges(attrs);
      assert.ok(resolved.includes("VEGAN"));
      assert.ok(!resolved.includes("VEGETARIAN")); // suppressed in favor of VEGAN
      assert.ok(resolved.includes("HALAL"));
      assert.ok(resolved.includes("CONTAINS_NUTS"));
      assert.ok(resolved.includes("SPICY_MEDIUM"));
    });

    it("resolveDietaryBadges handles vegetarian non-vegan correctly", () => {
      const attrs: DietaryItemAttributes = {
        isVegan: false,
        isVegetarian: true,
        containsDairy: true,
      };

      const resolved = resolveDietaryBadges(attrs);
      assert.ok(resolved.includes("VEGETARIAN"));
      assert.ok(!resolved.includes("VEGAN"));
      assert.ok(resolved.includes("CONTAINS_DAIRY"));
    });

    it("resolveDietaryBadges maps from string array with deduplication", () => {
      const input = ["VEG", "veg", "HALAL", "pork", "PORK", "shellfish"];
      const resolved = resolveDietaryBadges(input);
      assert.strictEqual(resolved.length, 4);
      assert.deepStrictEqual(resolved, [
        "VEGETARIAN",
        "HALAL",
        "CONTAINS_PORK",
        "CONTAINS_SHELLFISH",
      ]);
    });

    it("hasAllergenWarnings detects shellfish, nuts, pork, or beef", () => {
      assert.strictEqual(hasAllergenWarnings({ isVegetarian: true }), false);
      assert.strictEqual(hasAllergenWarnings({ containsShellfish: true }), true);
      assert.strictEqual(hasAllergenWarnings({ containsPork: true }), true);
      assert.strictEqual(hasAllergenWarnings({ containsBeef: true }), true);
      assert.strictEqual(hasAllergenWarnings(["VEG", "GF"]), true); // GF is an allergen/intolerance category
    });

    it("getDietaryBadgeConfig returns valid metadata", () => {
      const conf = getDietaryBadgeConfig("CONTAINS_SHELLFISH");
      assert.strictEqual(conf.shortCode, "SHELLFISH");
      assert.strictEqual(conf.isAllergenWarning, true);
    });

    it("getSpicinessLabel handles mild, medium, hot, dynamite, and unspiced", () => {
      assert.strictEqual(getSpicinessLabel(0, "en"), "Not Spicy");
      assert.strictEqual(getSpicinessLabel(0, "si"), "සැර නැත");
      assert.strictEqual(getSpicinessLabel(1, "en"), "Mild Spice");
      assert.strictEqual(getSpicinessLabel(2, "en"), "Medium Spice");
      assert.strictEqual(getSpicinessLabel(3, "en"), "Authentic Hot");
      assert.strictEqual(getSpicinessLabel(4, "en"), "Dynamite Hot");
    });
  });

  describe("3. React Static Markup & Subcomponents Rendering", () => {
    it("renders DietaryIcon with appropriate SVGs", () => {
      const leafHtml = renderToStaticMarkup(React.createElement(DietaryIcon, { type: "leaf" }));
      assert.ok(leafHtml.includes("<svg"));

      const crescentHtml = renderToStaticMarkup(
        React.createElement(DietaryIcon, { type: "crescent" }),
      );
      assert.ok(crescentHtml.includes("<svg"));

      const shellfishHtml = renderToStaticMarkup(
        React.createElement(DietaryIcon, { type: "shellfish" }),
      );
      assert.ok(shellfishHtml.includes("<svg"));
    });

    it("renders single DietaryBadge in pill, compact, and detailed variants", () => {
      const pillHtml = renderToStaticMarkup(
        React.createElement(DietaryBadge, {
          tag: "HALAL",
          variant: "pill",
          size: "sm",
          language: "en",
        }),
      );
      assert.ok(pillHtml.includes("Halal Sourced"));
      assert.ok(pillHtml.includes('data-testid="dietary-badge-halal"'));

      const compactHtml = renderToStaticMarkup(
        React.createElement(DietaryBadge, {
          tag: "HALAL",
          variant: "compact",
          size: "xs",
        }),
      );
      assert.ok(compactHtml.includes("HALAL"));

      const sinhalaHtml = renderToStaticMarkup(
        React.createElement(DietaryBadge, {
          tag: "VEGETARIAN",
          language: "si",
        }),
      );
      assert.ok(sinhalaHtml.includes("නිර්මාංශ"));
    });

    it("renders null for invalid tag", () => {
      const invalidHtml = renderToStaticMarkup(
        React.createElement(DietaryBadge, {
          tag: "NON_EXISTENT_TAG",
        }),
      );
      assert.strictEqual(invalidHtml, "");
    });

    it("renders DietaryBadges group with multiple tags", () => {
      const groupHtml = renderToStaticMarkup(
        React.createElement(DietaryBadges, {
          tags: ["VEGAN", "HALAL", "GLUTEN_FREE"],
        }),
      );
      assert.ok(groupHtml.includes('data-testid="dietary-badges-group"'));
      assert.ok(groupHtml.includes("Vegan"));
      assert.ok(groupHtml.includes("Halal Sourced"));
      assert.ok(groupHtml.includes("Gluten-Free"));
    });

    it("renders DietaryBadges with maxVisible overflow truncation button", () => {
      const truncatedHtml = renderToStaticMarkup(
        React.createElement(DietaryBadges, {
          tags: ["VEGAN", "HALAL", "CONTAINS_SHELLFISH", "CONTAINS_NUTS", "GLUTEN_FREE"],
          maxVisible: 2,
        }),
      );
      assert.ok(truncatedHtml.includes('data-testid="dietary-badges-more-button"'));
      assert.ok(truncatedHtml.includes("+3 more"));
    });

    it("renders DietaryAllergenModal with accessible dialog and cross-contamination notice", () => {
      const modalHtml = renderToStaticMarkup(
        React.createElement(DietaryAllergenModal, {
          tags: ["CONTAINS_SHELLFISH", "HALAL", "CONTAINS_PORK"],
          language: "en",
          onClose: () => {
            /* test close */
          },
        }),
      );
      assert.ok(modalHtml.includes("<dialog open"));
      assert.ok(modalHtml.includes("Allergen Information"));
      assert.ok(
        modalHtml.includes("Cross-Contact Notice: Kitchen prepares items containing shellfish"),
      );
      assert.ok(modalHtml.includes("Contains Shellfish"));
      assert.ok(modalHtml.includes("Contains Pork"));
      assert.ok(modalHtml.includes("Close"));
    });

    it("renders SpicyChiliBar with correct chili counts", () => {
      const mildHtml = renderToStaticMarkup(
        React.createElement(SpicyChiliBar, {
          level: 1,
          maxLevel: 3,
          showLabel: true,
        }),
      );
      assert.ok(mildHtml.includes("Mild Spice"));
      assert.ok(mildHtml.includes("Spicy"));

      const zeroHtml = renderToStaticMarkup(
        React.createElement(SpicyChiliBar, {
          level: 0,
        }),
      );
      assert.strictEqual(zeroHtml, "");
    });

    it("verifies constructible types and props interfaces", () => {
      const tag: DietaryTag = "HALAL";
      const cat: DietaryCategory = "RELIGIOUS_FAITH";
      const trilingual: TrilingualContent = { en: "A", si: "B", ta: "C" };
      const config: DietaryBadgeConfig = DIETARY_CONFIG_REGISTRY[tag];
      const attrs: DietaryItemAttributes = { isVegetarian: true };
      const size: DietaryBadgeSize = "md";
      const variant: DietaryBadgeVariant = "pill";

      const badgeProps: DietaryBadgeProps = { tag, size, variant };
      const badgesProps: DietaryBadgesProps = { item: attrs, maxVisible: 3 };
      const modalProps: DietaryAllergenModalProps = {
        tags: [tag],
        onClose: () => {
          /* test close */
        },
      };
      const chiliProps: SpicyChiliBarProps = { level: 2 };

      assert.ok(tag && cat && trilingual && config && attrs && size && variant);
      assert.ok(badgeProps && badgesProps && modalProps && chiliProps);
    });
  });
});
