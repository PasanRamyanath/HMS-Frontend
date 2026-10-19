import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AddIngredientBar,
  type AddIngredientBarProps,
  BomHighCostAlert,
  type BomHighCostAlertProps,
  BomMetricsBento,
  type BomMetricsBentoProps,
  DEFAULT_RECIPE_DISHES,
  DEFAULT_STORE_INVENTORY_SKUS,
  type InventoryStockSku,
  RecipeBomEditor,
  type RecipeBomEditorProps,
  type RecipeBomFinancials,
  type RecipeBomIngredient,
  type RecipeDishProfile,
  calculateBomFinancials,
  calculateLineCost,
  formatPriceLkr,
  resolveMarginHealthStatus,
  resolveTrilingualTitle,
} from "../src/admin/menus/RecipeBomEditor.js";

describe("Step 235: Recipe Bill of Materials (BOM) Ingredient Linker (RecipeBomEditor.tsx)", () => {
  describe("1. Default Inventory SKUs & Ceylon Signature Recipes", () => {
    it("provides authentic Sri Lankan inventory SKUs covering seafood, spices, grains and dairy", () => {
      assert.ok(DEFAULT_STORE_INVENTORY_SKUS.length >= 10);
      const skus = DEFAULT_STORE_INVENTORY_SKUS.map((s: InventoryStockSku) => s.sku);
      assert.ok(skus.includes("SEA-PRAWN-001"));
      assert.ok(skus.includes("DRY-RICE-001"));
      assert.ok(skus.includes("OIL-COCO-001"));
      assert.ok(skus.includes("SPC-CURRY-001"));
      assert.ok(skus.includes("FRE-COCO-002"));
      assert.ok(skus.includes("DRY-FLOUR-002"));
      assert.ok(skus.includes("DAI-EGG-001"));
      assert.ok(skus.includes("SEA-MALDF-001"));
      assert.ok(skus.includes("SEA-CRAB-001"));
      assert.ok(skus.includes("BEV-TEA-001"));
    });

    it("includes signature Ceylon dishes with pre-linked BOM ingredients", () => {
      assert.strictEqual(DEFAULT_RECIPE_DISHES.length, 3);
      const codes = DEFAULT_RECIPE_DISHES.map((d: RecipeDishProfile) => d.dishCode);
      assert.ok(codes.includes("CUR-PRAWN-01"));
      assert.ok(codes.includes("BRK-HOPPER-01"));
      assert.ok(codes.includes("SEA-CRAB-01"));

      const prawnDish = DEFAULT_RECIPE_DISHES.find((d) => d.dishCode === "CUR-PRAWN-01");
      assert.ok(prawnDish);
      assert.strictEqual(prawnDish.sellingPriceLkr, 3800.0);
      assert.strictEqual(prawnDish.ingredients.length, 5);
    });
  });

  describe("2. Pure Domain Math & Costing Resolvers", () => {
    it("calculateLineCost accurately multiplies quantity by unit cost with rounding", () => {
      // 0.200 kg @ LKR 4,500.00 = LKR 900.00
      const cost = calculateLineCost(0.2, 4500.0);
      assert.strictEqual(cost, 900.0);

      // 0.150 kg @ LKR 650.00 = LKR 97.50
      assert.strictEqual(calculateLineCost(0.15, 650.0), 97.5);

      // 0.050 L @ LKR 1,200.00 = LKR 60.00
      assert.strictEqual(calculateLineCost(0.05, 1200.0), 60.0);

      // Zero or negative handling
      assert.strictEqual(calculateLineCost(0, 4500.0), 0);
      assert.strictEqual(calculateLineCost(-1, 4500.0), 0);
      assert.strictEqual(calculateLineCost(0.2, 0), 0);
    });

    it("calculateLineCost factors in trimming/shrinkage wastage percentage correctly", () => {
      // 0.500 kg raw seafood with 10% shell/cleaning loss:
      // Effective required = 0.5 / (1 - 0.10) = 0.5555... kg * 1000 = 555.56
      const costWithWaste = calculateLineCost(0.5, 1000.0, 10);
      assert.strictEqual(costWithWaste, 555.56);
    });

    it("resolveMarginHealthStatus classifies optimal, acceptable, warning and critical tiers", () => {
      // <= 28%: Optimal
      const opt = resolveMarginHealthStatus(1000, 250, 25.0);
      assert.strictEqual(opt.status, "OPTIMAL");

      // 28.1% - 35%: Acceptable
      const acc = resolveMarginHealthStatus(1000, 320, 32.0);
      assert.strictEqual(acc.status, "ACCEPTABLE");

      // 35.1% - 49.9%: Warning (>35% ceiling)
      const warn = resolveMarginHealthStatus(1000, 420, 42.0);
      assert.strictEqual(warn.status, "WARNING");

      // >= 50% or cost >= price: Critical
      const crit = resolveMarginHealthStatus(1000, 550, 55.0);
      assert.strictEqual(crit.status, "CRITICAL");

      const loss = resolveMarginHealthStatus(1000, 1200, 120.0);
      assert.strictEqual(loss.status, "CRITICAL");
    });

    it("calculateBomFinancials derives correct food cost %, gross margin % and suggested price", () => {
      const ingredients: ReadonlyArray<RecipeBomIngredient> = [
        {
          id: "1",
          stockSkuId: "sku-1",
          sku: "SEA-01",
          name: "Prawns",
          unitOfMeasure: "kg",
          quantityRequired: 0.2,
          costPerUnitLkr: 4500.0,
        }, // 900
        {
          id: "2",
          stockSkuId: "sku-2",
          sku: "DRY-01",
          name: "Rice",
          unitOfMeasure: "kg",
          quantityRequired: 0.15,
          costPerUnitLkr: 650.0,
        }, // 97.5
        {
          id: "3",
          stockSkuId: "sku-3",
          sku: "OIL-01",
          name: "Oil",
          unitOfMeasure: "liters",
          quantityRequired: 0.05,
          costPerUnitLkr: 1200.0,
        }, // 60
      ];

      // Total food cost = 900 + 97.5 + 60 = 1,057.50
      // Selling price = 3,500.00
      // Food Cost % = (1057.50 / 3500) * 100 = 30.2%
      // Gross Profit = 3500 - 1057.50 = 2442.50
      // Gross Margin % = (2442.50 / 3500) * 100 = 69.8%
      const fin = calculateBomFinancials(3500.0, ingredients, 1);
      assert.strictEqual(fin.totalFoodCostLkr, 1057.5);
      assert.strictEqual(fin.costPerPortionLkr, 1057.5);
      assert.strictEqual(fin.foodCostPercent, 30.2);
      assert.strictEqual(fin.grossProfitLkr, 2442.5);
      assert.strictEqual(fin.grossMarginPercent, 69.8);
      assert.strictEqual(fin.marginStatus, "ACCEPTABLE");
      assert.strictEqual(fin.isFoodCostHigh, false);
      // Suggested price at 30% target = Math.round(1057.5 / 0.3) = 3525
      assert.strictEqual(fin.suggestedSellingPriceLkr, 3525);
    });

    it("calculateBomFinancials scales correctly with batch portion yields", () => {
      const ingredients: ReadonlyArray<RecipeBomIngredient> = [
        {
          id: "1",
          stockSkuId: "sku-1",
          sku: "DRY-01",
          name: "Rice 10kg",
          unitOfMeasure: "kg",
          quantityRequired: 5,
          costPerUnitLkr: 400.0,
        }, // 2,000.00
      ];

      // Total batch cost = 2,000.00 LKR for 10 portions
      // Cost per portion = 200.00 LKR
      const fin = calculateBomFinancials(800.0, ingredients, 10);
      assert.strictEqual(fin.totalFoodCostLkr, 2000.0);
      assert.strictEqual(fin.costPerPortionLkr, 200.0);
      assert.strictEqual(fin.foodCostPercent, 25.0);
      assert.strictEqual(fin.marginStatus, "OPTIMAL");
      assert.strictEqual(fin.isFoodCostHigh, false);
    });

    it("flags isFoodCostHigh and triggers warning when Food Cost exceeds 35%", () => {
      const highCostIngredients: ReadonlyArray<RecipeBomIngredient> = [
        {
          id: "1",
          stockSkuId: "sku-crb",
          sku: "CRB-01",
          name: "Negombo Mud Crab",
          unitOfMeasure: "kg",
          quantityRequired: 0.6,
          costPerUnitLkr: 5200.0,
        }, // 3,120.00
      ];

      // Selling price 6,000.00 -> Food Cost % = (3120 / 6000) * 100 = 52.0% -> Critical & > 35%
      const fin = calculateBomFinancials(6000.0, highCostIngredients, 1);
      assert.strictEqual(fin.foodCostPercent, 52.0);
      assert.strictEqual(fin.isFoodCostHigh, true);
      assert.strictEqual(fin.marginStatus, "CRITICAL");
    });
  });

  describe("3. Formatting & Trilingual Helpers", () => {
    it("formatPriceLkr formats currency with LKR designation", () => {
      const formatted = formatPriceLkr(3800.0);
      assert.ok(formatted.includes("3,800.00") || formatted.includes("3800.00"));
      assert.ok(formatted.includes("LKR") || formatted.includes("Rs"));
    });

    it("resolveTrilingualTitle resolves Sinhala, Tamil, or English fallback", () => {
      const title = {
        en: "Lagoon Prawn Curry",
        si: "ඉස්සෝ කරිය",
        ta: "இறால் கறி",
      };
      assert.strictEqual(resolveTrilingualTitle(title, "en"), "Lagoon Prawn Curry");
      assert.strictEqual(resolveTrilingualTitle(title, "si"), "ඉස්සෝ කරිය");
      assert.strictEqual(resolveTrilingualTitle(title, "ta"), "இறால் கறி");
    });
  });

  describe("4. React Static Markup & Apple HIG UI Components", () => {
    it("renders BomMetricsBento with all 4 Apple Liquid Glass metric cards", () => {
      const fin: RecipeBomFinancials = {
        totalFoodCostLkr: 1164.5,
        costPerPortionLkr: 1164.5,
        sellingPriceLkr: 3800.0,
        foodCostPercent: 30.6,
        grossProfitLkr: 2635.5,
        grossMarginPercent: 69.4,
        marginStatus: "ACCEPTABLE",
        isFoodCostHigh: false,
        suggestedSellingPriceLkr: 3882,
        statusLabel: "Standard Industry Margin",
        statusDescription: "Within acceptable thresholds.",
      };

      const bentoProps: BomMetricsBentoProps = { financials: fin, portionYield: 1 };
      const html = renderToStaticMarkup(React.createElement(BomMetricsBento, bentoProps));
      assert.ok(html.includes('data-testid="bom-metrics-bento"'));
      assert.ok(html.includes("Theoretical Food Cost"));
      assert.ok(html.includes("Menu Selling Price"));
      assert.ok(html.includes("Food Cost %"));
      assert.ok(html.includes("30.6%"));
      assert.ok(
        html.includes("Gross Margin &amp; Profit") || html.includes("Gross Margin & Profit"),
      );
      assert.ok(html.includes("Standard Industry Margin"));
    });

    it("BomHighCostAlert renders warning when isFoodCostHigh is true and null when false", () => {
      const highFin: RecipeBomFinancials = {
        totalFoodCostLkr: 2500,
        costPerPortionLkr: 2500,
        sellingPriceLkr: 5000,
        foodCostPercent: 50.0,
        grossProfitLkr: 2500,
        grossMarginPercent: 50.0,
        marginStatus: "CRITICAL",
        isFoodCostHigh: true,
        suggestedSellingPriceLkr: 8333,
        statusLabel: "Critical Margin Deficit",
        statusDescription: "Selling at near cost.",
      };

      const highAlertProps: BomHighCostAlertProps = { financials: highFin };
      const htmlHigh = renderToStaticMarkup(React.createElement(BomHighCostAlert, highAlertProps));
      assert.ok(htmlHigh.includes('data-testid="food-cost-warning-alert"'));
      assert.ok(htmlHigh.includes("Critical Food Cost Alert"));

      const lowFin: RecipeBomFinancials = {
        ...highFin,
        foodCostPercent: 22.0,
        isFoodCostHigh: false,
        marginStatus: "OPTIMAL",
      };

      const lowAlertProps: BomHighCostAlertProps = { financials: lowFin };
      const htmlLow = renderToStaticMarkup(React.createElement(BomHighCostAlert, lowAlertProps));
      assert.strictEqual(htmlLow, "");
    });

    it("renders AddIngredientBar with SKU select and numeric inputs", () => {
      const addBarProps: AddIngredientBarProps = {
        availableSkus: DEFAULT_STORE_INVENTORY_SKUS,
        onAdd: () => {
          /* no-op for static markup test */
        },
      };
      const html = renderToStaticMarkup(React.createElement(AddIngredientBar, addBarProps));
      assert.ok(html.includes('data-testid="add-ingredient-bar"'));
      assert.ok(html.includes('data-testid="select-sku-input"'));
      assert.ok(html.includes('data-testid="input-qty-field"'));
      assert.ok(html.includes('data-testid="add-ingredient-btn"'));
      assert.ok(html.includes("SEA-PRAWN-001"));
    });

    it("renders full RecipeBomEditor with dishes, metrics, BOM table, and Apple HIG classes", () => {
      const editorProps: RecipeBomEditorProps = {
        initialDishes: DEFAULT_RECIPE_DISHES,
        availableSkus: DEFAULT_STORE_INVENTORY_SKUS,
      };
      const html = renderToStaticMarkup(React.createElement(RecipeBomEditor, editorProps));

      assert.ok(html.includes('data-testid="recipe-bom-editor-root"'));
      assert.ok(
        html.includes("Recipe Bill of Materials (BOM) &amp; Food Costing") ||
          html.includes("Recipe Bill of Materials (BOM) & Food Costing"),
      );
      assert.ok(html.includes('data-testid="dish-switcher-bar"'));
      assert.ok(html.includes('data-testid="dish-tab-CUR-PRAWN-01"'));
      assert.ok(html.includes('data-testid="dish-tab-BRK-HOPPER-01"'));
      assert.ok(html.includes('data-testid="selling-price-input"'));
      assert.ok(html.includes('data-testid="bom-table"'));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("supports readOnly mode by hiding editing forms and action buttons", () => {
      const readOnlyProps: RecipeBomEditorProps = {
        initialDishes: DEFAULT_RECIPE_DISHES,
        availableSkus: DEFAULT_STORE_INVENTORY_SKUS,
        readOnly: true,
      };
      const html = renderToStaticMarkup(React.createElement(RecipeBomEditor, readOnlyProps));

      assert.ok(!html.includes('data-testid="add-ingredient-bar"'));
      assert.ok(!html.includes('data-testid="save-recipe-btn"'));
      assert.ok(!html.includes('data-testid="remove-ing-'));
    });
  });
});
