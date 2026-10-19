import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_MINIBAR_CATALOG,
  type MinibarBillSummary,
  MinibarCatalogEditor,
  type MinibarCatalogEditorProps,
  MinibarChecklistRunner,
  type MinibarChecklistRunnerProps,
  type MinibarConsumedLine,
  type MinibarEditorViewMode,
  type MinibarItem,
  type MinibarItemCategory,
  MinibarItemRow,
  type MinibarItemRowProps,
  MinibarMetricsBento,
  type MinibarMetricsBentoProps,
  type TrilingualTitle,
  calculateMinibarBill,
  formatPriceLkr,
  getCategoryLabel,
  getEffectiveParStock,
  resolveTrilingualTitle,
} from "../src/admin/menus/MinibarCatalogEditor.js";

describe("Step 241: Minibar Room Par-Stock & QR Self-Declaration Checklist (MinibarCatalogEditor.tsx)", () => {
  describe("1. Default Presets & Catalog Configuration", () => {
    it("contains all 6 standard Sri Lankan resort minibar presets", () => {
      assert.strictEqual(DEFAULT_MINIBAR_CATALOG.length, 6);
      const ids = DEFAULT_MINIBAR_CATALOG.map((i) => i.id);
      assert.ok(ids.includes("mb-csh-01"));
      assert.ok(ids.includes("mb-egb-02"));
      assert.ok(ids.includes("mb-lion-03"));
      assert.ok(ids.includes("mb-kand-04"));
      assert.ok(ids.includes("mb-arck-05"));
      assert.ok(ids.includes("mb-wtr-06"));
    });

    it("verifies Elephant House Ginger Beer (EGB) and Lion Lager details", () => {
      const egb = DEFAULT_MINIBAR_CATALOG.find((i) => i.id === "mb-egb-02");
      assert.ok(egb);
      assert.strictEqual(egb.category, "SOFT_DRINKS");
      assert.strictEqual(egb.sellingPriceLkr, 450.0);
      assert.strictEqual(egb.defaultParStock, 4);
      assert.strictEqual(egb.isAlcoholic, false);
      assert.strictEqual(egb.isComplimentary, false);

      const lion = DEFAULT_MINIBAR_CATALOG.find((i) => i.id === "mb-lion-03");
      assert.ok(lion);
      assert.strictEqual(lion.category, "BEER_WINE");
      assert.strictEqual(lion.isAlcoholic, true);
      assert.strictEqual(lion.sellingPriceLkr, 1100.0);
      assert.strictEqual(lion.roomTypeParOverrides?.SUITE, 6);
    });

    it("verifies complimentary bottled water preset", () => {
      const water = DEFAULT_MINIBAR_CATALOG.find((i) => i.id === "mb-wtr-06");
      assert.ok(water);
      assert.strictEqual(water.isComplimentary, true);
      assert.strictEqual(water.sellingPriceLkr, 0.0);
      assert.strictEqual(water.defaultParStock, 4);
    });
  });

  describe("2. Pure Domain Math & Costing Resolvers", () => {
    it("formatPriceLkr formats currency with LKR symbol", () => {
      const formatted = formatPriceLkr(1650);
      assert.ok(formatted.includes("1,650") || formatted.includes("1650"));
    });

    it("resolveTrilingualTitle handles English, Sinhala, and Tamil lookups", () => {
      const title: TrilingualTitle = {
        en: "Cashew Nuts",
        si: "කජු පැකට්ටුව",
        ta: "முந்திரி",
      };
      assert.strictEqual(resolveTrilingualTitle(title, "en"), "Cashew Nuts");
      assert.strictEqual(resolveTrilingualTitle(title, "si"), "කජු පැකට්ටුව");
      assert.strictEqual(resolveTrilingualTitle(title, "ta"), "முந்திரி");
    });

    it("getCategoryLabel maps categories to human-readable strings", () => {
      assert.strictEqual(getCategoryLabel("SNACKS"), "Snacks & Confectionery");
      assert.strictEqual(getCategoryLabel("SOFT_DRINKS"), "Chilled Soft Drinks");
      assert.strictEqual(getCategoryLabel("BEER_WINE"), "Beer & Wines");
      assert.strictEqual(getCategoryLabel("SPIRITS_MINIATURES"), "Spirits & Miniatures");
      assert.strictEqual(getCategoryLabel("WELLNESS_MINERAL"), "Complimentary Water");
    });

    it("getEffectiveParStock respects roomType overrides and defaults", () => {
      const cashew = DEFAULT_MINIBAR_CATALOG[0];
      assert.ok(cashew);
      assert.strictEqual(getEffectiveParStock(cashew), 2);
      assert.strictEqual(getEffectiveParStock(cashew, "STANDARD"), 2);
      assert.strictEqual(getEffectiveParStock(cashew, "SUITE"), 4);
      assert.strictEqual(getEffectiveParStock(cashew, "VILLA"), 4);
    });

    it("calculateMinibarBill computes consumption totals, margins, and taxes", () => {
      // Consumed: 2 Lion Beers (2 * 1100 = 2200), 1 Cashew (1 * 950 = 950), 2 Water (2 * 0 = 0)
      const consumption: Record<string, number> = {
        "mb-lion-03": 2,
        "mb-csh-01": 1,
        "mb-wtr-06": 2,
      };

      const bill = calculateMinibarBill(DEFAULT_MINIBAR_CATALOG, consumption);
      assert.strictEqual(bill.totalItemsCount, 5);
      assert.strictEqual(bill.totalBillLkr, 3150.0);

      // Cost: 2 Lion (2 * 480 = 960) + 1 Cashew (420) + 2 Water (2 * 65 = 130) = 1510
      assert.strictEqual(bill.totalCostLkr, 1510.0);
      assert.strictEqual(bill.grossMarginLkr, 1640.0);
      assert.strictEqual(bill.marginPercentage, 52.1);

      // 10% Service charge = 315.0, 18% VAT = 623.7
      assert.strictEqual(bill.estimatedServiceChargeLkr, 315.0);
      assert.strictEqual(bill.estimatedVatLkr, 623.7);

      assert.strictEqual(bill.consumedLines.length, 3);
      const lionLine = bill.consumedLines.find((l) => l.itemId === "mb-lion-03");
      assert.ok(lionLine);
      assert.strictEqual(lionLine.quantity, 2);
      assert.strictEqual(lionLine.lineTotalLkr, 2200.0);
    });

    it("calculateMinibarBill handles empty consumption cleanly", () => {
      const bill = calculateMinibarBill(DEFAULT_MINIBAR_CATALOG, {});
      assert.strictEqual(bill.totalBillLkr, 0);
      assert.strictEqual(bill.totalItemsCount, 0);
      assert.strictEqual(bill.consumedLines.length, 0);
    });
  });

  describe("3. React Static Markup & Subcomponents Rendering", () => {
    it("renders MinibarMetricsBento with all 4 Apple Liquid Glass metric cards", () => {
      const bentoHtml = renderToStaticMarkup(
        React.createElement(MinibarMetricsBento, {
          items: DEFAULT_MINIBAR_CATALOG,
        }),
      );
      assert.ok(bentoHtml.includes("Catalog SKUs"));
      assert.ok(bentoHtml.includes("Par Units / Room"));
      assert.ok(bentoHtml.includes("Full Par Retail Value"));
      assert.ok(bentoHtml.includes("Beverage Mix"));
      assert.ok(bentoHtml.includes("tabular-nums"));
    });

    it("renders MinibarItemRow with item details, steppers, and pricing", () => {
      const rowHtml = renderToStaticMarkup(
        React.createElement(MinibarItemRow, {
          item: DEFAULT_MINIBAR_CATALOG[0] as MinibarItem,
          language: "en",
          onToggleActive: () => {
            /* no-op */
          },
          onUpdatePar: () => {
            /* no-op */
          },
          readOnly: false,
        }),
      );
      assert.ok(rowHtml.includes("Salted Ceylon Cashew Nuts (50g)"));
      assert.ok(rowHtml.includes("MB-CSH-50G"));
      assert.ok(rowHtml.includes("SKU-SNK-CSH-01"));
      assert.ok(
        rowHtml.includes("Snacks &amp; Confectionery") ||
          rowHtml.includes("Snacks & Confectionery"),
      );
      assert.ok(rowHtml.includes("Room Par"));
    });

    it("renders MinibarChecklistRunner with 1-tap stepper and post button", () => {
      const runnerHtml = renderToStaticMarkup(
        React.createElement(MinibarChecklistRunner, {
          items: DEFAULT_MINIBAR_CATALOG,
          roomNumber: "Room 402",
          roomType: "SUITE",
          language: "en",
          onPostToFolio: () => {
            /* no-op */
          },
        }),
      );
      assert.ok(runnerHtml.includes("Room 402"));
      assert.ok(runnerHtml.includes("SUITE"));
      assert.ok(runnerHtml.includes("Post Consumption to Guest Folio"));
      assert.ok(runnerHtml.includes("Reset Checklist"));
      assert.ok(runnerHtml.includes('data-testid="checklist-item-mb-csh-01"'));
    });

    it("renders master MinibarCatalogEditor in CATALOG tab with filters and save button", () => {
      const editorHtml = renderToStaticMarkup(
        React.createElement(MinibarCatalogEditor, {
          initialItems: DEFAULT_MINIBAR_CATALOG,
          language: "en",
          readOnly: false,
        }),
      );
      assert.ok(
        editorHtml.includes("Room Minibar &amp; Incidentals Catalog") ||
          editorHtml.includes("Room Minibar & Incidentals Catalog"),
      );
      assert.ok(
        editorHtml.includes("Catalog &amp; Par-Stock") ||
          editorHtml.includes("Catalog & Par-Stock"),
      );
      assert.ok(editorHtml.includes("Room Checklist Runner"));
      assert.ok(editorHtml.includes("Save Catalog Changes"));
      assert.ok(editorHtml.includes("All Categories"));
    });

    it("supports readOnly mode by hiding buttons in MinibarCatalogEditor", () => {
      const readOnlyHtml = renderToStaticMarkup(
        React.createElement(MinibarCatalogEditor, {
          initialItems: DEFAULT_MINIBAR_CATALOG,
          readOnly: true,
        }),
      );
      assert.ok(!readOnlyHtml.includes("Save Catalog Changes"));
    });

    it("ensures all exported interfaces and types are properly constructible", () => {
      const cat: MinibarItemCategory = "SNACKS";
      const trilingual: TrilingualTitle = { en: "A", si: "B", ta: "C" };
      const item: MinibarItem = DEFAULT_MINIBAR_CATALOG[0] as MinibarItem;
      const consumedLine: MinibarConsumedLine = {
        itemId: item.id,
        title: "Cashew",
        quantity: 1,
        unitPriceLkr: 950,
        lineTotalLkr: 950,
        lineCostLkr: 420,
      };
      const summary: MinibarBillSummary = {
        totalBillLkr: 950,
        totalCostLkr: 420,
        grossMarginLkr: 530,
        marginPercentage: 55.8,
        consumedLines: [consumedLine],
        totalItemsCount: 1,
        estimatedServiceChargeLkr: 95,
        estimatedVatLkr: 188.1,
      };
      const mode: MinibarEditorViewMode = "CATALOG";
      const bentoProps: MinibarMetricsBentoProps = { items: [item] };
      const rowProps: MinibarItemRowProps = {
        item,
        onToggleActive: () => {
          /* no-op */
        },
        onUpdatePar: () => {
          /* no-op */
        },
      };
      const runnerProps: MinibarChecklistRunnerProps = { items: [item] };
      const editorProps: MinibarCatalogEditorProps = { initialItems: [item] };

      assert.ok(cat && trilingual && item && consumedLine && summary && mode);
      assert.ok(bentoProps && rowProps && runnerProps && editorProps);
    });
  });
});
