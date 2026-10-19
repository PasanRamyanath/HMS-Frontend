import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ClassifiedMenuItem,
  DEFAULT_MENU_ENGINEERING_ITEMS,
  MenuEngineeringBento,
  type MenuEngineeringBentoProps,
  MenuEngineeringCard,
  type MenuEngineeringCardProps,
  type MenuEngineeringItem,
  MenuEngineeringItemRow,
  type MenuEngineeringItemRowProps,
  MenuEngineeringQuadrantSummary,
  type MenuEngineeringQuadrantSummaryProps,
  type MenuQuadrant,
  type QuadrantMeta,
  calculateMenuEngineeringBenchmarks,
  classifyItemQuadrant,
  classifyMenuEngineeringCatalog,
  formatPriceLkr,
  getQuadrantMetadata,
  resolveTrilingualTitle,
} from "../src/admin/menus/MenuEngineeringCard.js";

describe("Step 246: Top-Selling & Low-Margin Menu Engineering Matrix (MenuEngineeringCard.tsx)", () => {
  describe("1. Default Sri Lankan Catalog Presets & Benchmarks", () => {
    it("contains 6 standard F&B dishes with realistic margins and order volumes", () => {
      assert.strictEqual(DEFAULT_MENU_ENGINEERING_ITEMS.length, 6);
      const ids = DEFAULT_MENU_ENGINEERING_ITEMS.map((i) => i.id);
      assert.ok(ids.includes("eng-chk-01"));
      assert.ok(ids.includes("eng-prwn-02"));
      assert.ok(ids.includes("eng-crb-03"));
      assert.ok(ids.includes("eng-stk-04"));
      assert.ok(ids.includes("eng-kot-05"));
      assert.ok(ids.includes("eng-wat-06"));
    });

    it("verifies Village Chicken Rice and Cheese Kottu are high-volume sellers", () => {
      const chicken = DEFAULT_MENU_ENGINEERING_ITEMS.find((i) => i.id === "eng-chk-01");
      assert.ok(chicken);
      assert.strictEqual(chicken.sellingPriceLkr, 2250);
      assert.strictEqual(chicken.foodCostLkr, 650);
      assert.ok(chicken.unitsSold30Days >= 400);

      const kottu = DEFAULT_MENU_ENGINEERING_ITEMS.find((i) => i.id === "eng-kot-05");
      assert.ok(kottu);
      assert.strictEqual(kottu.sellingPriceLkr, 1950);
      assert.ok(kottu.unitsSold30Days >= 500);
    });
  });

  describe("2. Pure Kasavana & Smith Matrix Classification", () => {
    it("classifies High Volume & High Margin as STAR", () => {
      const q = classifyItemQuadrant(500, 2000, 250, 1500);
      assert.strictEqual(q, "STAR");
    });

    it("classifies High Volume & Low Margin as PLOWHORSE", () => {
      const q = classifyItemQuadrant(500, 1000, 250, 1500);
      assert.strictEqual(q, "PLOWHORSE");
    });

    it("classifies Low Volume & High Margin as PUZZLE", () => {
      const q = classifyItemQuadrant(100, 2500, 250, 1500);
      assert.strictEqual(q, "PUZZLE");
    });

    it("classifies Low Volume & Low Margin as DOG", () => {
      const q = classifyItemQuadrant(80, 800, 250, 1500);
      assert.strictEqual(q, "DOG");
    });

    it("calculates benchmarks accurately across catalog", () => {
      const benchmarks = calculateMenuEngineeringBenchmarks(DEFAULT_MENU_ENGINEERING_ITEMS);
      assert.strictEqual(benchmarks.totalItemsCount, 6);
      assert.ok(benchmarks.avgUnitsSold > 0);
      assert.ok(benchmarks.avgContributionMarginLkr > 0);
      assert.ok(benchmarks.totalRevenueLkr > 0);
      assert.ok(benchmarks.totalGrossProfitLkr > 0);
      assert.ok(benchmarks.overallFoodCostPercent > 0 && benchmarks.overallFoodCostPercent < 100);

      // Verify all 4 quadrants have counts accounted for
      const sumCounts =
        benchmarks.countsByQuadrant.STAR +
        benchmarks.countsByQuadrant.PLOWHORSE +
        benchmarks.countsByQuadrant.PUZZLE +
        benchmarks.countsByQuadrant.DOG;
      assert.strictEqual(sumCounts, 6);
    });

    it("handles empty items list safely without division by zero", () => {
      const empty = calculateMenuEngineeringBenchmarks([]);
      assert.strictEqual(empty.totalItemsCount, 0);
      assert.strictEqual(empty.avgUnitsSold, 0);
      assert.strictEqual(empty.totalRevenueLkr, 0);
      assert.strictEqual(empty.countsByQuadrant.STAR, 0);
    });

    it("classifies catalog items and attaches financial metrics", () => {
      const benchmarks = calculateMenuEngineeringBenchmarks(DEFAULT_MENU_ENGINEERING_ITEMS);
      const classified = classifyMenuEngineeringCatalog(
        DEFAULT_MENU_ENGINEERING_ITEMS,
        benchmarks,
        "en",
      );
      assert.strictEqual(classified.length, 6);

      const first = classified[0];
      assert.ok(first);
      assert.strictEqual(first.id, "eng-chk-01");
      assert.strictEqual(first.contributionMarginLkr, 1600);
      assert.ok(first.totalRevenueLkr > 0);
      assert.ok(first.totalProfitLkr > 0);
      assert.ok(["STAR", "PLOWHORSE", "PUZZLE", "DOG"].includes(first.quadrant));
    });
  });

  describe("3. Metadata & Formatting Helpers", () => {
    it("formatPriceLkr formats currency in Sri Lankan Rupees", () => {
      const formatted = formatPriceLkr(2450);
      assert.ok(formatted.includes("2,450") || formatted.includes("2450"));
    });

    it("resolveTrilingualTitle handles English, Sinhala, and Tamil lookups", () => {
      const title = {
        en: "Chicken Curry",
        si: "කුකුළු මස් ව්‍යංජනය",
        ta: "கோழிக்கறி",
      };
      assert.strictEqual(resolveTrilingualTitle(title, "en"), "Chicken Curry");
      assert.strictEqual(resolveTrilingualTitle(title, "si"), "කුකුළු මස් ව්‍යංජනය");
      assert.strictEqual(resolveTrilingualTitle(title, "ta"), "கோழிக்கறி");
    });

    it("getQuadrantMetadata provides descriptive labels and strategies", () => {
      const star = getQuadrantMetadata("STAR");
      assert.ok(star.emoji.includes("⭐"));
      assert.ok(star.label.includes("Stars"));
      assert.ok(star.strategy.includes("recipe quality"));

      const plow = getQuadrantMetadata("PLOWHORSE");
      assert.ok(plow.emoji.includes("🐎"));
      assert.ok(plow.strategy.includes("Reprice") || plow.strategy.includes("portion"));

      const puzzle = getQuadrantMetadata("PUZZLE");
      assert.ok(puzzle.emoji.includes("🧩"));
      assert.ok(puzzle.strategy.includes("Chef's Recommendation"));

      const dog = getQuadrantMetadata("DOG");
      assert.ok(dog.emoji.includes("🐕"));
      assert.ok(dog.strategy.includes("seasonal") || dog.strategy.includes("86"));
    });
  });

  describe("4. Static Markup & Component Verification", () => {
    const benchmarks = calculateMenuEngineeringBenchmarks(DEFAULT_MENU_ENGINEERING_ITEMS);

    it("renders MenuEngineeringBento with 4 KPI cards", () => {
      const html = renderToStaticMarkup(React.createElement(MenuEngineeringBento, { benchmarks }));
      assert.ok(html.includes('data-testid="menu-engineering-bento"'));
      assert.ok(html.includes("30-Day Gross Revenue"));
      assert.ok(
        html.includes("30-Day F&amp;B Gross Profit") || html.includes("30-Day F&B Gross Profit"),
      );
      assert.ok(html.includes("Overall Food Cost %"));
      assert.ok(html.includes("Average Thresholds"));
    });

    it("renders MenuEngineeringQuadrantSummary with 4 interactive quadrant cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuEngineeringQuadrantSummary, {
          benchmarks,
          activeQuadrant: "ALL",
          onSelectQuadrant: () => undefined,
        }),
      );
      assert.ok(html.includes('data-testid="quadrant-summary-cards"'));
      assert.ok(html.includes("Stars (High Volume"));
      assert.ok(html.includes("Plowhorses (High Volume"));
      assert.ok(html.includes("Puzzles (Low Volume"));
      assert.ok(html.includes("Dogs (Low Volume"));
    });

    it("renders MenuEngineeringItemRow with price, food cost, and quadrant badge", () => {
      const classified = classifyMenuEngineeringCatalog(
        DEFAULT_MENU_ENGINEERING_ITEMS,
        benchmarks,
        "en",
      );
      const item = classified[0];
      assert.ok(item);

      const html = renderToStaticMarkup(
        React.createElement(MenuEngineeringItemRow, {
          item,
          onToggleQrSpotlight: () => undefined,
        }),
      );
      assert.ok(html.includes(`data-testid="menu-eng-item-${item.id}"`));
      assert.ok(html.includes("Village Chicken Rice"));
      assert.ok(html.includes("Selling Price"));
      assert.ok(html.includes("Food Cost (%)"));
      assert.ok(html.includes("Orders (30d)"));
      assert.ok(html.includes("Spotlight"));
    });

    it("renders MenuEngineeringCard top-level component with search and tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuEngineeringCard, {
          items: DEFAULT_MENU_ENGINEERING_ITEMS,
          language: "en",
        }),
      );
      assert.ok(html.includes('data-testid="menu-engineering-card-root"'));
      assert.ok(
        html.includes("Menu Engineering Matrix &amp; Profitability") ||
          html.includes("Menu Engineering Matrix & Profitability"),
      );
      assert.ok(html.includes("All Items"));
      assert.ok(html.includes("STAR"));
      assert.ok(html.includes("PLOWHORSE"));
      assert.ok(html.includes("Search:"));
    });

    it("verifies type-level compliance with exported interfaces", () => {
      const q: MenuQuadrant = "STAR";
      const item: MenuEngineeringItem = DEFAULT_MENU_ENGINEERING_ITEMS[0] as MenuEngineeringItem;
      const classified: ClassifiedMenuItem = {
        id: item.id,
        code: item.code,
        title: "T",
        categoryName: item.categoryName,
        sellingPriceLkr: 2000,
        foodCostLkr: 600,
        contributionMarginLkr: 1400,
        foodCostPercent: 30,
        unitsSold30Days: 100,
        totalRevenueLkr: 200000,
        totalProfitLkr: 140000,
        quadrant: q,
        actionRecommendation: "Action",
        isFeaturedOnQr: true,
      };
      const meta: QuadrantMeta = getQuadrantMetadata(q);
      const bentoProps: MenuEngineeringBentoProps = { benchmarks };
      const summaryProps: MenuEngineeringQuadrantSummaryProps = {
        benchmarks,
        activeQuadrant: "ALL",
        onSelectQuadrant: () => undefined,
      };
      const rowProps: MenuEngineeringItemRowProps = { item: classified };
      const cardProps: MenuEngineeringCardProps = { items: [item] };

      assert.ok(
        q && item && classified && meta && bentoProps && summaryProps && rowProps && cardProps,
      );
    });
  });
});
