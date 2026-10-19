import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AdjustmentDirection,
  type AdjustmentType,
  type BulkPriceAdjustmentConfig,
  type BulkPriceCategoryOption,
  BulkPriceControls,
  type BulkPriceControlsProps,
  type BulkPriceItem,
  BulkPriceMetricsBento,
  type BulkPriceMetricsBentoProps,
  BulkPriceModal,
  type BulkPriceModalProps,
  type BulkPricePreviewItem,
  BulkPricePreviewTable,
  type BulkPricePreviewTableProps,
  type BulkPriceSummaryStats,
  type RoundingRule,
  applyRounding,
  computeBulkPricePreviews,
  computeBulkSummaryStats,
  computeSingleItemNewPrice,
  formatPriceLkr,
  resolveTrilingualString,
} from "../src/admin/menus/BulkPriceModal.js";

describe("Step 243: Bulk Menu Price Adjustment Tool (BulkPriceModal.tsx)", () => {
  const sampleItems: ReadonlyArray<BulkPriceItem> = [
    {
      id: "item-1",
      code: "CUR-101",
      title: { en: "Chicken Rice & Curry", si: "කුකුළු මස් බත්", ta: "கோழி சாதம்" },
      categoryId: "CAT-RICE",
      currentPriceLkr: 1420.0,
      isAvailable: true,
    },
    {
      id: "item-2",
      code: "CUR-102",
      title: { en: "Ceylon Black Pepper Crab", si: "ගම්මිරිස් කකුළුවා", ta: "நண்டு கறி" },
      categoryId: "CAT-SEAFOOD",
      currentPriceLkr: 3800.0,
      isAvailable: true,
    },
    {
      id: "item-3",
      code: "BEV-201",
      title: { en: "Ceylon Spiced Milk Tea", si: "මසාලා තේ", ta: "மசாலா தேநீர்" },
      categoryId: "CAT-BEVERAGE",
      currentPriceLkr: 350.0,
      isAvailable: true,
    },
  ];

  const sampleCategories: ReadonlyArray<BulkPriceCategoryOption> = [
    { id: "CAT-RICE", name: { en: "Rice Dishes", si: "බත්", ta: "சாதம்" } },
    { id: "CAT-SEAFOOD", name: { en: "Fresh Seafood", si: "මුහුදු ආහාර", ta: "கடல் உணவு" } },
    { id: "CAT-BEVERAGE", name: { en: "Beverages", si: "පාන", ta: "பானங்கள்" } },
  ];

  describe("1. Pure Domain Rounding Rules (applyRounding)", () => {
    it("handles NO_ROUNDING with 2 decimals precision", () => {
      assert.strictEqual(applyRounding(1423.456, "NO_ROUNDING"), 1423.46);
      assert.strictEqual(applyRounding(0, "NO_ROUNDING"), 0);
      assert.strictEqual(applyRounding(-50, "NO_ROUNDING"), 0);
    });

    it("handles NEAREST_50 rounding accurately (LKR 50 increments)", () => {
      assert.strictEqual(applyRounding(1420, "NEAREST_50"), 1400);
      assert.strictEqual(applyRounding(1430, "NEAREST_50"), 1450);
      assert.strictEqual(applyRounding(1425, "NEAREST_50"), 1450);
      assert.strictEqual(applyRounding(1474, "NEAREST_50"), 1450);
      assert.strictEqual(applyRounding(1475, "NEAREST_50"), 1500);
    });

    it("handles NEAREST_100 rounding accurately (LKR 100 increments)", () => {
      assert.strictEqual(applyRounding(1440, "NEAREST_100"), 1400);
      assert.strictEqual(applyRounding(1450, "NEAREST_100"), 1500);
      assert.strictEqual(applyRounding(1460, "NEAREST_100"), 1500);
    });

    it("handles CEIL_50 and CEIL_100 upward rounding", () => {
      assert.strictEqual(applyRounding(1401, "CEIL_50"), 1450);
      assert.strictEqual(applyRounding(1450, "CEIL_50"), 1450);
      assert.strictEqual(applyRounding(1401, "CEIL_100"), 1500);
      assert.strictEqual(applyRounding(1500, "CEIL_100"), 1500);
    });

    it("handles CHARM_90 psychological pricing (ending in 90 LKR)", () => {
      assert.strictEqual(applyRounding(1500, "CHARM_90"), 1490);
      assert.strictEqual(applyRounding(980, "CHARM_90"), 990);
      assert.strictEqual(applyRounding(120, "CHARM_90"), 90);
    });
  });

  describe("2. Single Item Repricing Math (computeSingleItemNewPrice)", () => {
    it("computes percentage price increase with nearest 50 rounding", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "PERCENTAGE",
        direction: "INCREASE",
        adjustmentValue: 10, // +10%
        roundingRule: "NEAREST_50",
      };
      // 1420 + 10% = 1562 -> nearest 50 = 1550
      assert.strictEqual(computeSingleItemNewPrice(1420, config), 1550);
    });

    it("computes percentage price reduction with nearest 50 rounding", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "PERCENTAGE",
        direction: "DECREASE",
        adjustmentValue: 10, // -10%
        roundingRule: "NEAREST_50",
      };
      // 1420 - 10% = 1278 -> nearest 50 = 1300
      assert.strictEqual(computeSingleItemNewPrice(1420, config), 1300);
    });

    it("computes fixed amount increase with exact rounding", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "FIXED_AMOUNT",
        direction: "INCREASE",
        adjustmentValue: 200,
        roundingRule: "NO_ROUNDING",
      };
      assert.strictEqual(computeSingleItemNewPrice(1420, config), 1620);
    });

    it("enforces minimum price floor", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "FIXED_AMOUNT",
        direction: "DECREASE",
        adjustmentValue: 500,
        roundingRule: "NO_ROUNDING",
        minPriceFloorLkr: 150,
      };
      // 350 - 500 = -150 -> bounded by minPriceFloorLkr of 150
      assert.strictEqual(computeSingleItemNewPrice(350, config), 150);
    });
  });

  describe("3. Bulk Previews & Summary Statistics", () => {
    it("computes previews for ALL categories and handles exclusions", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "PERCENTAGE",
        direction: "INCREASE",
        adjustmentValue: 10,
        roundingRule: "NEAREST_50",
      };
      const excluded = new Set(["item-2"]);

      const previews = computeBulkPricePreviews(sampleItems, config, excluded, "en");
      assert.strictEqual(previews.length, 3);
      assert.strictEqual(previews[0]?.id, "item-1");
      assert.strictEqual(previews[0]?.isSelected, true);
      assert.strictEqual(previews[1]?.id, "item-2");
      assert.strictEqual(previews[1]?.isSelected, false);
    });

    it("filters items by target category", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "CAT-SEAFOOD",
        adjustmentType: "PERCENTAGE",
        direction: "INCREASE",
        adjustmentValue: 15,
        roundingRule: "NEAREST_100",
      };

      const previews = computeBulkPricePreviews(sampleItems, config, new Set(), "en");
      assert.strictEqual(previews.length, 1);
      assert.strictEqual(previews[0]?.id, "item-2");
      // 3800 + 15% = 4370 -> nearest 100 = 4400
      assert.strictEqual(previews[0]?.newPriceLkr, 4400);
      assert.strictEqual(previews[0]?.deltaLkr, 600);
    });

    it("computes summary statistics for selected items", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "PERCENTAGE",
        direction: "INCREASE",
        adjustmentValue: 10,
        roundingRule: "NEAREST_50",
      };
      const previews = computeBulkPricePreviews(sampleItems, config, new Set(), "en");
      const stats = computeBulkSummaryStats(previews);

      assert.strictEqual(stats.totalEligibleCount, 3);
      assert.strictEqual(stats.selectedCount, 3);
      assert.ok(stats.avgOldPriceLkr > 0);
      assert.ok(stats.avgNewPriceLkr > stats.avgOldPriceLkr);
      assert.ok(stats.avgDeltaLkr > 0);
      assert.ok(stats.avgDeltaPercent > 0);
    });

    it("handles zero selected items in summary statistics gracefully", () => {
      const emptyStats = computeBulkSummaryStats([]);
      assert.strictEqual(emptyStats.selectedCount, 0);
      assert.strictEqual(emptyStats.avgNewPriceLkr, 0);
    });
  });

  describe("4. Formatting and Trilingual Helpers", () => {
    it("formatPriceLkr formats currency with LKR symbol", () => {
      const formatted = formatPriceLkr(1550);
      assert.ok(formatted.includes("1,550") || formatted.includes("1550"));
    });

    it("resolveTrilingualString handles language fallbacks", () => {
      const text = { en: "English", si: "සිංහල", ta: "தமிழ்" };
      assert.strictEqual(resolveTrilingualString(text, "en"), "English");
      assert.strictEqual(resolveTrilingualString(text, "si"), "සිංහල");
      assert.strictEqual(resolveTrilingualString(text, "ta"), "தமிழ்");
      assert.strictEqual(resolveTrilingualString({ en: "Fallback" }, "si"), "Fallback");
    });
  });

  describe("5. Component Static Markup & Render Verification", () => {
    it("renders BulkPriceMetricsBento with statistics", () => {
      const stats: BulkPriceSummaryStats = {
        totalEligibleCount: 10,
        selectedCount: 8,
        avgOldPriceLkr: 1500,
        avgNewPriceLkr: 1650,
        avgDeltaLkr: 150,
        avgDeltaPercent: 10,
      };

      const html = renderToStaticMarkup(React.createElement(BulkPriceMetricsBento, { stats }));
      assert.ok(html.includes('data-testid="bulk-price-metrics-bento"'));
      assert.ok(html.includes("Target Items"));
      assert.ok(html.includes("Current Avg Price"));
      assert.ok(html.includes("Projected Avg Price"));
      assert.ok(html.includes("Average Delta"));
    });

    it("renders BulkPriceControls with preset buttons and rounding choices", () => {
      const config: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: "PERCENTAGE",
        direction: "INCREASE",
        adjustmentValue: 10,
        roundingRule: "NEAREST_50",
      };

      const html = renderToStaticMarkup(
        React.createElement(BulkPriceControls, {
          config,
          categories: sampleCategories,
          onChange: () => undefined,
          language: "en",
        }),
      );
      assert.ok(html.includes("Target Category:"));
      assert.ok(html.includes("Adjustment Direction:"));
      assert.ok(html.includes("Percentage (%)"));
      assert.ok(html.includes("Nearest LKR 50 (Standard)"));
    });

    it("renders BulkPricePreviewTable with items and strikethrough prices", () => {
      const previewItems: ReadonlyArray<BulkPricePreviewItem> = [
        {
          id: "item-1",
          code: "CUR-101",
          title: "Chicken Rice & Curry",
          categoryId: "CAT-RICE",
          oldPriceLkr: 1420,
          newPriceLkr: 1550,
          deltaLkr: 130,
          deltaPercent: 9.2,
          isSelected: true,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(BulkPricePreviewTable, {
          items: previewItems,
          onToggleSelect: () => undefined,
          onToggleAll: () => undefined,
        }),
      );
      assert.ok(html.includes('data-testid="bulk-price-preview-table"'));
      assert.ok(html.includes("Chicken Rice &amp; Curry") || html.includes("Chicken Rice & Curry"));
      assert.ok(html.includes("CUR-101"));
      assert.ok(html.includes("line-through"));
    });

    it("renders null when BulkPriceModal isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(BulkPriceModal, {
          isOpen: false,
          items: sampleItems,
          onClose: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal dialog container when BulkPriceModal isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(BulkPriceModal, {
          isOpen: true,
          items: sampleItems,
          categories: sampleCategories,
          language: "en",
          onClose: () => undefined,
        }),
      );
      assert.ok(html.includes('data-testid="bulk-price-modal-backdrop"'));
      assert.ok(html.includes('data-testid="bulk-price-modal-container"'));
      assert.ok(html.includes("Bulk Menu Price Adjustment Tool"));
      assert.ok(html.includes("Apply Repricing to"));
    });

    it("verifies type-level constructs for exported interfaces", () => {
      const adjType: AdjustmentType = "PERCENTAGE";
      const dir: AdjustmentDirection = "INCREASE";
      const rule: RoundingRule = "NEAREST_50";
      const item: BulkPriceItem = sampleItems[0] as BulkPriceItem;
      const cat: BulkPriceCategoryOption = sampleCategories[0] as BulkPriceCategoryOption;
      const prev: BulkPricePreviewItem = {
        id: "1",
        code: "C1",
        title: "T",
        categoryId: "CAT",
        oldPriceLkr: 100,
        newPriceLkr: 110,
        deltaLkr: 10,
        deltaPercent: 10,
        isSelected: true,
      };
      const cfg: BulkPriceAdjustmentConfig = {
        targetCategoryId: "ALL",
        adjustmentType: adjType,
        direction: dir,
        adjustmentValue: 10,
        roundingRule: rule,
      };
      const stats: BulkPriceSummaryStats = {
        totalEligibleCount: 1,
        selectedCount: 1,
        avgOldPriceLkr: 100,
        avgNewPriceLkr: 110,
        avgDeltaLkr: 10,
        avgDeltaPercent: 10,
      };
      const bentoProps: BulkPriceMetricsBentoProps = { stats };
      const ctrlProps: BulkPriceControlsProps = {
        config: cfg,
        categories: [cat],
        onChange: () => undefined,
      };
      const tableProps: BulkPricePreviewTableProps = {
        items: [prev],
        onToggleSelect: () => undefined,
        onToggleAll: () => undefined,
      };
      const modalProps: BulkPriceModalProps = {
        isOpen: true,
        items: [item],
        onClose: () => undefined,
      };

      assert.ok(
        adjType &&
          dir &&
          rule &&
          item &&
          cat &&
          prev &&
          cfg &&
          stats &&
          bentoProps &&
          ctrlProps &&
          tableProps &&
          modalProps,
      );
    });
  });
});
