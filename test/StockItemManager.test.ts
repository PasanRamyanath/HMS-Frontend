/**
 * Unit Test Suite for Step 376: StockItemManager
 *
 * Validates:
 * 1. Pure inventory calculations & state evaluators:
 *    - computeInventorySummary
 *    - determineStockStatus
 *    - generateSuggestedSku
 *    - filterStockItems
 * 2. Sri Lankan hotel presets & domain constants:
 *    - DEFAULT_STOCK_ITEMS coverage across 6 store categories and 6 UOMs
 *    - STOCK_CATEGORIES (Dry Store, Cold Room/Seafood, Vegetable Market, Liquor & Bar, Housekeeping Chemicals, Diesel/Fuel)
 *    - STOCK_UOMS (kg, g, L, ml, btl, pcs)
 *    - DEPARTMENTS
 * 3. Trilingual translations (en, si, ta)
 * 4. Component rendering with Apple HIG and Liquid Glass classes via React 19 renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_STOCK_ITEMS,
  DEPARTMENTS,
  STOCK_CATEGORIES,
  STOCK_ITEM_TRANSLATIONS,
  STOCK_UOMS,
  type StockCategory,
  StockItemManager,
  type StockUom,
  computeInventorySummary,
  determineStockStatus,
  filterStockItems,
  generateSuggestedSku,
} from "../src/admin/inventory/StockItemManager.js";

describe("Step 376: StockItemManager & Store SKU Registry", () => {
  describe("1. Pure Calculation & Domain Helpers", () => {
    it("computes comprehensive inventory summary accurately", () => {
      const summary = computeInventorySummary(DEFAULT_STOCK_ITEMS);

      assert.equal(summary.totalSkus, DEFAULT_STOCK_ITEMS.length);
      assert.ok(summary.totalValuationLkr > 0, "Valuation should be strictly positive");

      // Verify low stock and out of stock counts
      let expectedLow = 0;
      let expectedOut = 0;
      let expectedHealthy = 0;
      for (const item of DEFAULT_STOCK_ITEMS) {
        if (item.currentStock === 0) expectedOut++;
        else if (item.currentStock <= item.parLevel) expectedLow++;
        else expectedHealthy++;
      }

      assert.equal(summary.lowStockCount, expectedLow);
      assert.equal(summary.outOfStockCount, expectedOut);
      assert.equal(summary.healthyCount, expectedHealthy);

      // Verify category distribution
      assert.ok(summary.categoryCounts.DRY_STORE >= 1);
      assert.ok(summary.categoryCounts.COLD_ROOM_SEAFOOD >= 1);
      assert.ok(summary.categoryCounts.VEGETABLE_MARKET >= 1);
      assert.ok(summary.categoryCounts.LIQUOR_BAR >= 1);
      assert.ok(summary.categoryCounts.HOUSEKEEPING_CHEMICALS >= 1);
      assert.ok(summary.categoryCounts.DIESEL_FUEL >= 1);
    });

    it("evaluates stock health status correctly across thresholds", () => {
      assert.equal(determineStockStatus(0, 10), "OUT_OF_STOCK");
      assert.equal(determineStockStatus(-5, 10), "OUT_OF_STOCK");
      assert.equal(determineStockStatus(5, 10), "LOW_STOCK");
      assert.equal(determineStockStatus(10, 10), "LOW_STOCK");
      assert.equal(determineStockStatus(10.1, 10), "HEALTHY");
      assert.equal(determineStockStatus(100, 10), "HEALTHY");
    });

    it("generates structured Sri Lankan hotel SKU codes", () => {
      const skuDry = generateSuggestedSku("DRY_STORE", "Keeri Samba", 1);
      assert.match(skuDry, /^DRY-KEER-001$/);

      const skuLiq = generateSuggestedSku("LIQUOR_BAR", "Rockland Arrack", 12);
      assert.match(skuLiq, /^LIQ-ROCK-012$/);

      const skuCold = generateSuggestedSku("COLD_ROOM_SEAFOOD", "Tuna", 99);
      assert.match(skuCold, /^COLD-TUNA-099$/);

      const skuFuel = generateSuggestedSku("DIESEL_FUEL", "Super Diesel", 5);
      assert.match(skuFuel, /^FUEL-SUPE-005$/);
    });

    it("filters stock items by category correctly", () => {
      const dryItems = filterStockItems(DEFAULT_STOCK_ITEMS, { category: "DRY_STORE" });
      assert.ok(dryItems.length > 0);
      assert.ok(dryItems.every((item) => item.category === "DRY_STORE"));

      const allItems = filterStockItems(DEFAULT_STOCK_ITEMS, { category: "ALL" });
      assert.equal(allItems.length, DEFAULT_STOCK_ITEMS.length);
    });

    it("filters stock items by low-stock threshold", () => {
      const lowStockItems = filterStockItems(DEFAULT_STOCK_ITEMS, { lowStockOnly: true });
      assert.ok(lowStockItems.length > 0);
      assert.ok(lowStockItems.every((item) => item.currentStock <= item.parLevel));
    });

    it("filters stock items by text search across SKU, name, vendor, and location", () => {
      // By SKU
      const searchSku = filterStockItems(DEFAULT_STOCK_ITEMS, { searchQuery: "DRY-SAMBA" });
      assert.equal(searchSku.length, 1);
      assert.equal(searchSku[0]?.sku, "DRY-SAMBA-001");

      // By Name
      const searchName = filterStockItems(DEFAULT_STOCK_ITEMS, { searchQuery: "Diesel" });
      assert.ok(searchName.length >= 1);
      assert.ok(searchName.some((i) => i.name.includes("Diesel")));

      // By Supplier
      const searchVendor = filterStockItems(DEFAULT_STOCK_ITEMS, { searchQuery: "Petroleum" });
      assert.equal(searchVendor.length, 1);
      assert.equal(searchVendor[0]?.supplierName, "Ceylon Petroleum Corporation (CPC)");

      // Case-insensitive & trimmed
      const searchTrimmed = filterStockItems(DEFAULT_STOCK_ITEMS, {
        searchQuery: "  arrack  ",
      });
      assert.ok(searchTrimmed.length >= 1);
    });
  });

  describe("2. Domain Presets & UOM Standards", () => {
    it("provides the 6 mandatory storage categories", () => {
      const expectedCategories: StockCategory[] = [
        "DRY_STORE",
        "COLD_ROOM_SEAFOOD",
        "VEGETABLE_MARKET",
        "LIQUOR_BAR",
        "HOUSEKEEPING_CHEMICALS",
        "DIESEL_FUEL",
      ];

      for (const cat of expectedCategories) {
        assert.ok(
          STOCK_CATEGORIES.some((c) => c.id === cat),
          `Category ${cat} must be defined in STOCK_CATEGORIES`,
        );
      }
    });

    it("provides the 6 mandatory hotel UOM standards", () => {
      const expectedUoms: StockUom[] = ["kg", "g", "L", "ml", "btl", "pcs"];

      for (const uom of expectedUoms) {
        assert.ok(
          STOCK_UOMS.some((u) => u.id === uom),
          `UOM ${uom} must be defined in STOCK_UOMS`,
        );
      }
    });

    it("validates that all default stock items conform to domain invariants", () => {
      for (const item of DEFAULT_STOCK_ITEMS) {
        assert.ok(item.id.length > 0, "ID must not be empty");
        assert.ok(item.sku.length > 0, "SKU must not be empty");
        assert.ok(item.name.length > 0, "Name must not be empty");
        assert.ok(item.currentStock >= 0, "Current stock must be non-negative");
        assert.ok(item.parLevel >= 0, "Par level must be non-negative");
        assert.ok(item.reorderQuantity > 0, "Reorder quantity must be positive");
        assert.ok(item.unitCostLkr >= 0, "Unit cost must be non-negative");
        assert.equal(
          item.totalValueLkr,
          Math.round((item.currentStock * item.unitCostLkr + Number.EPSILON) * 100) / 100,
          "Total value must equal currentStock * unitCostLkr",
        );
      }
    });

    it("defines valid operating departments", () => {
      assert.ok(DEPARTMENTS.some((d) => d.id === "KITCHEN"));
      assert.ok(DEPARTMENTS.some((d) => d.id === "BAR"));
      assert.ok(DEPARTMENTS.some((d) => d.id === "HOUSEKEEPING"));
      assert.ok(DEPARTMENTS.some((d) => d.id === "MAINTENANCE"));
    });
  });

  describe("3. Trilingual Localization Integrity", () => {
    it("contains complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      const keys = [
        "title",
        "subtitle",
        "addSku",
        "editSku",
        "quickAdjust",
        "allCategories",
        "lowStockFilter",
        "searchPlaceholder",
        "skuCode",
        "itemName",
        "category",
        "department",
        "uom",
        "onHand",
        "parLevel",
        "unitCost",
        "totalVal",
        "vendor",
        "location",
        "status",
        "actions",
        "healthy",
        "lowStock",
        "outOfStock",
      ] as const;

      for (const lang of languages) {
        const dict = STOCK_ITEM_TRANSLATIONS[lang];
        assert.ok(dict, `Dictionary for ${lang} must exist`);
        for (const key of keys) {
          assert.ok(
            dict[key] && dict[key].length > 0,
            `Key "${key}" in language "${lang}" must not be empty`,
          );
        }
      }
    });
  });

  describe("4. React 19 Component Rendering", () => {
    it("renders StockItemManager with default items without error", () => {
      const html = renderToStaticMarkup(React.createElement(StockItemManager));

      assert.ok(html.includes("Master Store &amp; Inventory SKU Registry"));
      assert.ok(html.includes("Total Store SKUs"));
      assert.ok(html.includes("Total Store Valuation"));
      assert.ok(html.includes("DRY-SAMBA-001"));
      assert.ok(html.includes("LIQ-ARRACK-001"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders in readOnly mode without add/edit/adjust action buttons", () => {
      const html = renderToStaticMarkup(React.createElement(StockItemManager, { readOnly: true }));

      assert.ok(html.includes("Master Store &amp; Inventory SKU Registry"));
      // The Add Store SKU button should not be present
      assert.ok(!html.includes("+</span><span>Add Store SKU"));
      // Action buttons (edit, adjust, delete) shouldn't be rendered
      assert.ok(!html.includes("⚖️ Count"));
      assert.ok(!html.includes("✏️ Edit"));
    });

    it("renders empty state gracefully when item list is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(StockItemManager, { initialItems: [] }),
      );

      assert.ok(html.includes("No stock items found"));
      assert.ok(html.includes("Try clearing search filters or add a new SKU"));
    });
  });
});
