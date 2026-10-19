import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_DOMSPEED_MENU_ITEMS } from "../src/admin/menus/MenuItemGrid.js";
import {
  type AdminMenuItemSaveInput,
  DietaryAndStockToggles,
  MEAL_PLAN_CONFIGS,
  MealPlanInclusionCheckboxes,
  type MenuItemFormState,
  MenuItemModal,
  type MenuItemModalProps,
  ModalFooterActions,
  ModalHeader,
  OperationalDishFields,
  SPICE_LEVEL_OPTIONS,
  SpiceLevelRadioSelector,
  TrilingualDishFields,
  createInitialFormState,
  validateAndBuildItemPayload,
} from "../src/admin/menus/MenuItemModal.js";
import { Department, MealPlan } from "../src/generated/graphql.js";

describe("Step 230: Menu Item Creation & Edit Modal (MenuItemModal.tsx)", () => {
  describe("1. Constants & Configuration Integrity", () => {
    it("exports 4 Sri Lankan spice level options from Mild to Authentic SL Spicy", () => {
      assert.strictEqual(SPICE_LEVEL_OPTIONS.length, 4);
      const levels = SPICE_LEVEL_OPTIONS.map((o) => o.level);
      assert.deepStrictEqual(levels, [0, 1, 2, 3]);

      const mild = SPICE_LEVEL_OPTIONS.find((o) => o.level === 0);
      assert.ok(mild);
      assert.strictEqual(mild.label, "Mild");

      const spicy = SPICE_LEVEL_OPTIONS.find((o) => o.level === 3);
      assert.ok(spicy);
      assert.strictEqual(spicy.label, "Authentic SL Spicy");
    });

    it("exports 4 hotel meal-plan inclusion options (BB, HB, FB, AI)", () => {
      assert.strictEqual(MEAL_PLAN_CONFIGS.length, 4);
      const plans = MEAL_PLAN_CONFIGS.map((m) => m.plan);
      assert.ok(plans.includes(MealPlan.Bb));
      assert.ok(plans.includes(MealPlan.Hb));
      assert.ok(plans.includes(MealPlan.Fb));
      assert.ok(plans.includes(MealPlan.Ai));
    });
  });

  describe("2. Subcomponent Static Rendering", () => {
    it("renders TrilingualDishFields with active language tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(TrilingualDishFields, {
          titleEn: "Clay-Pot Dhal",
          setTitleEn: () => undefined,
          titleSi: "",
          setTitleSi: () => undefined,
          titleTa: "",
          setTitleTa: () => undefined,
          descEn: "Tempered Mysore lentils",
          setDescEn: () => undefined,
          descSi: "",
          setDescSi: () => undefined,
          descTa: "",
          setDescTa: () => undefined,
        }),
      );
      assert.ok(html.includes("English Title"));
      assert.ok(html.includes("Clay-Pot Dhal"));
      assert.ok(html.includes("English Culinary Description"));
      assert.ok(html.includes("Tempered Mysore lentils"));
      assert.ok(html.includes("සිංහල"));
      assert.ok(html.includes("தமிழ்"));
    });

    it("renders OperationalDishFields with category dropdown, price, prep time, and station", () => {
      const html = renderToStaticMarkup(
        React.createElement(OperationalDishFields, {
          categories: [
            { id: "CAT-1", name: { en: "Rice & Curry", si: null, ta: null } },
            { id: "CAT-2", name: { en: "Bar & Drinks", si: null, ta: null } },
          ],
          categoryId: "CAT-1",
          setCategoryId: () => undefined,
          code: "KOT-402",
          setCode: () => undefined,
          priceLkr: 2450,
          setPriceLkr: () => undefined,
          prepTimeMins: 15,
          setPrepTimeMins: () => undefined,
          department: Department.Kitchen,
          setDepartment: () => undefined,
          kitchenStation: "Hot Wok",
          setKitchenStation: () => undefined,
        }),
      );
      assert.ok(html.includes("Rice &amp; Curry"));
      assert.ok(html.includes("KOT-402"));
      assert.ok(html.includes("2450"));
      assert.ok(html.includes("15"));
      assert.ok(html.includes("Hot Wok"));
      assert.ok(html.includes("Kitchen"));
    });

    it("renders SpiceLevelRadioSelector with 4 clickable rating buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpiceLevelRadioSelector, {
          spicyLevel: 2,
          setSpicyLevel: () => undefined,
        }),
      );
      assert.ok(html.includes("Mild"));
      assert.ok(html.includes("Medium"));
      assert.ok(html.includes("Hot"));
      assert.ok(html.includes("Authentic SL Spicy"));
    });

    it("renders DietaryAndStockToggles with checkboxes and availability pill", () => {
      const html = renderToStaticMarkup(
        React.createElement(DietaryAndStockToggles, {
          isVegetarian: true,
          setIsVegetarian: () => undefined,
          isVegan: false,
          setIsVegan: () => undefined,
          isHalal: true,
          setIsHalal: () => undefined,
          isGlutenFree: true,
          setIsGlutenFree: () => undefined,
          isAvailable: true,
          setIsAvailable: () => undefined,
        }),
      );
      assert.ok(html.includes("Vegetarian"));
      assert.ok(html.includes("Halal Sourced"));
      assert.ok(html.includes("Gluten-Free"));
      assert.ok(html.includes("In Stock (Available on QR)"));
    });

    it("renders MealPlanInclusionCheckboxes with BB, HB, FB, AI", () => {
      const html = renderToStaticMarkup(
        React.createElement(MealPlanInclusionCheckboxes, {
          includedInMealPlans: [MealPlan.Bb, MealPlan.Ai],
          setIncludedInMealPlans: () => undefined,
        }),
      );
      assert.ok(html.includes("Bed &amp; Breakfast (BB)"));
      assert.ok(html.includes("Half Board (HB)"));
      assert.ok(html.includes("Full Board (FB)"));
      assert.ok(html.includes("All Inclusive (AI)"));
    });
  });

  describe("3. Full MenuItemModal Lifecycle & Static Markup", () => {
    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemModal, {
          isOpen: false,
          onSave: () => undefined,
          onClose: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal dialog in Create mode when initialItem is omitted", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuItemModal, {
          isOpen: true,
          onSave: () => undefined,
          onClose: () => undefined,
        }),
      );
      assert.ok(html.includes("<dialog"));
      assert.ok(html.includes("Create New Menu Item"));
      assert.ok(html.includes("DOMSpeed Rung 2"));
      assert.ok(html.includes("Dish Photography (1:1 Square WebP, &lt; 80 KB)"));
      assert.ok(html.includes("Create Dish"));
    });

    it("renders modal dialog in Edit mode with pre-populated dish values", () => {
      const sampleItem = DEFAULT_DOMSPEED_MENU_ITEMS[0];
      assert.ok(sampleItem);

      const html = renderToStaticMarkup(
        React.createElement(MenuItemModal, {
          isOpen: true,
          initialItem: sampleItem,
          onSave: () => undefined,
          onClose: () => undefined,
        }),
      );
      assert.ok(html.includes("Edit Menu Dish"));
      assert.ok(html.includes("Village Style Chicken Rice &amp; Curry"));
      assert.ok(html.includes("CUR-101"));
      assert.ok(html.includes("2250"));
      assert.ok(html.includes("Save Changes"));
    });

    it("verifies constructible prop and payload interfaces", () => {
      const payload: AdminMenuItemSaveInput = {
        categoryId: "CAT-RICE-CURRY",
        code: "KOT-402",
        title: { en: "Test Dish", si: null, ta: null },
        description: { en: "Test Desc", si: null, ta: null },
        priceLkr: 2500,
        department: Department.Kitchen,
        kitchenStation: "Hot Wok",
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        isGlutenFree: false,
        spicyLevel: 2,
        isAvailable: true,
        prepTimeMins: 15,
        includedInMealPlans: [MealPlan.Bb, MealPlan.Hb],
      };
      assert.strictEqual(payload.code, "KOT-402");
      assert.strictEqual(payload.includedInMealPlans.length, 2);

      const props: MenuItemModalProps = {
        isOpen: true,
        onSave: () => undefined,
        onClose: () => undefined,
        className: "custom-modal-class",
      };
      const html = renderToStaticMarkup(React.createElement(MenuItemModal, props));
      assert.ok(html.includes("custom-modal-class"));
    });

    it("renders ModalHeader and ModalFooterActions components", () => {
      const headerHtml = renderToStaticMarkup(
        React.createElement(ModalHeader, {
          isEditing: false,
          dialogId: "test-dialog",
          onClose: () => undefined,
        }),
      );
      assert.ok(headerHtml.includes("Create New Menu Item"));

      const footerHtml = renderToStaticMarkup(
        React.createElement(ModalFooterActions, {
          isEditing: true,
          onClose: () => undefined,
        }),
      );
      assert.ok(footerHtml.includes("Save Changes"));
      assert.ok(footerHtml.includes("Cancel"));
    });

    it("validates and builds valid payload or rejects missing fields", () => {
      const invalidResult = validateAndBuildItemPayload({
        categoryId: "CAT-1",
        code: "",
        titleEn: "",
        titleSi: "",
        titleTa: "",
        descEn: "",
        descSi: "",
        descTa: "",
        imageUrl: null,
        priceLkr: 100,
        department: Department.Kitchen,
        kitchenStation: "",
        isVegetarian: false,
        isVegan: false,
        isHalal: false,
        isGlutenFree: false,
        spicyLevel: 0,
        isAvailable: true,
        prepTimeMins: 10,
        includedInMealPlans: [],
      });
      assert.strictEqual(invalidResult.valid, false);

      const validResult = validateAndBuildItemPayload({
        categoryId: "CAT-1",
        code: "kot-101",
        titleEn: "Egg Kottu",
        titleSi: "",
        titleTa: "",
        descEn: "Chopped roti",
        descSi: "",
        descTa: "",
        imageUrl: null,
        priceLkr: 1800,
        department: Department.Kitchen,
        kitchenStation: "Hot Wok",
        isVegetarian: true,
        isVegan: false,
        isHalal: true,
        isGlutenFree: false,
        spicyLevel: 1,
        isAvailable: true,
        prepTimeMins: 15,
        includedInMealPlans: [MealPlan.Bb],
      });
      assert.strictEqual(validResult.valid, true);
      if (validResult.valid) {
        assert.strictEqual(validResult.payload.code, "KOT-101");
        assert.strictEqual(validResult.payload.title.en, "Egg Kottu");
      }
    });

    it("creates initial form state for empty create mode and pre-populated edit mode", () => {
      const emptyState: MenuItemFormState = createInitialFormState(
        null,
        "CAT-DEFAULT",
        "CAT-FALLBACK",
      );
      assert.strictEqual(emptyState.categoryId, "CAT-DEFAULT");
      assert.strictEqual(emptyState.titleEn, "");
      assert.strictEqual(emptyState.priceLkr, 0);

      const sampleItem = DEFAULT_DOMSPEED_MENU_ITEMS[0];
      assert.ok(sampleItem);
      const populatedState: MenuItemFormState = createInitialFormState(
        sampleItem,
        undefined,
        "CAT-FALLBACK",
      );
      assert.strictEqual(populatedState.titleEn, "Village Style Chicken Rice & Curry");
      assert.strictEqual(populatedState.code, "CUR-101");
      assert.strictEqual(populatedState.priceLkr, 2250);
    });
  });
});
