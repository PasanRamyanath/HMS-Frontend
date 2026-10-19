import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DepartmentSelectorList,
  type DepartmentSelectorListProps,
  SEED_DEPARTMENT_OPTIONS,
  SeedCatalogButton,
  type SeedCatalogButtonProps,
  type SeedCatalogPreview,
  type SeedCatalogSummary,
  type SeedDepartmentKey,
  type SeedDepartmentOption,
  SeedSummaryBanner,
  type SeedSummaryBannerProps,
  calculateSeedPreview,
  executeCatalogSeedSimulation,
  resolveOptionText,
} from "../src/admin/menus/SeedCatalogButton.js";

describe("Step 238: 1-Click 'Seed Sri Lankan Hotel Menu & Housekeeping Catalog' Button (SeedCatalogButton.tsx)", () => {
  describe("1. Department Options Configuration Integrity", () => {
    it("configures all 4 core Sri Lankan hotel department presets", () => {
      assert.strictEqual(SEED_DEPARTMENT_OPTIONS.length, 4);
      const keys = SEED_DEPARTMENT_OPTIONS.map((d: SeedDepartmentOption) => d.key);
      assert.ok(keys.includes("HOUSEKEEPING"));
      assert.ok(keys.includes("ROOM_SERVICE"));
      assert.ok(keys.includes("BAR"));
      assert.ok(keys.includes("SPA"));
    });

    it("verifies Housekeeping option has 15 items and 15 complimentary amenities", () => {
      const hk = SEED_DEPARTMENT_OPTIONS.find((d) => d.key === "HOUSEKEEPING");
      assert.ok(hk);
      assert.strictEqual(hk.defaultItemCount, 15);
      assert.strictEqual(hk.complimentaryCount, 15);
      assert.strictEqual(hk.iconEmoji, "🧹");
    });

    it("verifies trilingual text presence on all department options", () => {
      for (const opt of SEED_DEPARTMENT_OPTIONS) {
        assert.ok(opt.label.en.trim().length > 0);
        assert.ok(opt.label.si.trim().length > 0);
        assert.ok(opt.label.ta.trim().length > 0);
        assert.ok(opt.description.en.trim().length > 0);
      }
    });
  });

  describe("2. Pure Preview & Seed Simulation Math", () => {
    it("calculateSeedPreview computes totals for all 4 departments (25 items, 15 free amenities)", () => {
      const allDepts: ReadonlyArray<SeedDepartmentKey> = [
        "HOUSEKEEPING",
        "ROOM_SERVICE",
        "BAR",
        "SPA",
      ];
      const preview: SeedCatalogPreview = calculateSeedPreview(allDepts);

      assert.strictEqual(preview.totalCategories, 4);
      assert.strictEqual(preview.totalItems, 25); // 15 + 4 + 3 + 3 = 25 items in 2 seconds
      assert.strictEqual(preview.totalComplimentary, 15);
      assert.strictEqual(preview.estimatedSeedSeconds, 1.5);
    });

    it("calculateSeedPreview computes totals for single department selection", () => {
      const hkOnly: ReadonlyArray<SeedDepartmentKey> = ["HOUSEKEEPING"];
      const preview = calculateSeedPreview(hkOnly);

      assert.strictEqual(preview.totalCategories, 1);
      assert.strictEqual(preview.totalItems, 15);
      assert.strictEqual(preview.totalComplimentary, 15);
    });

    it("calculateSeedPreview handles empty department selection safely", () => {
      const empty: ReadonlyArray<SeedDepartmentKey> = [];
      const preview = calculateSeedPreview(empty);

      assert.strictEqual(preview.totalCategories, 0);
      assert.strictEqual(preview.totalItems, 0);
      assert.strictEqual(preview.totalComplimentary, 0);
      assert.strictEqual(preview.estimatedSeedSeconds, 0);
    });

    it("executeCatalogSeedSimulation produces structured SeedCatalogSummary", () => {
      const depts: ReadonlyArray<SeedDepartmentKey> = ["HOUSEKEEPING", "ROOM_SERVICE"];
      const summary: SeedCatalogSummary = executeCatalogSeedSimulation("cinnamon-grand", depts);

      assert.strictEqual(summary.tenantId, "cinnamon-grand");
      assert.strictEqual(summary.categoriesCreated, 2);
      assert.strictEqual(summary.itemsCreated, 19);
      assert.strictEqual(summary.complimentaryItemsCount, 15);
      assert.strictEqual(summary.success, true);
      assert.ok(summary.seededAtIso.includes("T"));
    });

    it("resolveOptionText returns selected language with English fallback", () => {
      const sample = {
        en: "Housekeeping",
        si: "කාමර සේවා",
        ta: "வீட்டு பராமரிப்பு",
      };
      assert.strictEqual(resolveOptionText(sample, "en"), "Housekeeping");
      assert.strictEqual(resolveOptionText(sample, "si"), "කාමර සේවා");
      assert.strictEqual(resolveOptionText(sample, "ta"), "வீட்டு பராமரிப்பு");
    });
  });

  describe("3. React Static Markup & Subcomponents Rendering", () => {
    it("renders SeedSummaryBanner with 3 metric cards and tabular numbers", () => {
      const preview: SeedCatalogPreview = {
        totalCategories: 4,
        totalItems: 25,
        totalComplimentary: 15,
        selectedDepartments: ["HOUSEKEEPING", "ROOM_SERVICE", "BAR", "SPA"],
        estimatedSeedSeconds: 1.5,
      };

      const bannerProps: SeedSummaryBannerProps = { preview };
      const html = renderToStaticMarkup(React.createElement(SeedSummaryBanner, bannerProps));

      assert.ok(html.includes('data-testid="seed-summary-banner"'));
      assert.ok(html.includes("Categories"));
      assert.ok(html.includes("Total Items"));
      assert.ok(html.includes("Free Amenities"));
      assert.ok(html.includes("25"));
      assert.ok(html.includes("15"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders DepartmentSelectorList with department buttons and emoji icons", () => {
      const listProps: DepartmentSelectorListProps = {
        selectedKeys: ["HOUSEKEEPING", "BAR"],
        onToggle: () => {
          /* no-op for static markup test */
        },
        lang: "en",
      };

      const html = renderToStaticMarkup(React.createElement(DepartmentSelectorList, listProps));

      assert.ok(html.includes('data-testid="dept-selector-list"'));
      assert.ok(html.includes('data-testid="dept-checkbox-HOUSEKEEPING"'));
      assert.ok(html.includes('data-testid="dept-checkbox-BAR"'));
      assert.ok(html.includes("🧹"));
      assert.ok(html.includes("🍹"));
      assert.ok(html.includes("15 items"));
    });

    it("renders SeedCatalogButton with trigger button and < 2s badge", () => {
      const btnProps: SeedCatalogButtonProps = {
        tenantId: "jetwing-blue",
      };

      const html = renderToStaticMarkup(React.createElement(SeedCatalogButton, btnProps));

      assert.ok(html.includes('data-testid="seed-catalog-open-btn"'));
      assert.ok(html.includes("Seed Ceylon Catalog (25 Items)"));
      assert.ok(html.includes("&lt; 2s") || html.includes("< 2s"));
      assert.ok(html.includes("apple-touch-target"));
    });

    it("supports disabled attribute on trigger button", () => {
      const btnProps: SeedCatalogButtonProps = {
        tenantId: "jetwing-blue",
        disabled: true,
      };

      const html = renderToStaticMarkup(React.createElement(SeedCatalogButton, btnProps));
      assert.ok(html.includes("disabled"));
    });
  });
});
