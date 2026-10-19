import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LAUNDRY_CATALOG,
  type GarmentCategory,
  type LaundryBagLineSelection,
  LaundryBagRunner,
  type LaundryBagRunnerProps,
  type LaundryBillLine,
  type LaundryBillSummary,
  LaundryCatalogEditor,
  type LaundryCatalogEditorProps,
  type LaundryEditorTab,
  type LaundryGarmentItem,
  LaundryMetricsBento,
  type LaundryMetricsBentoProps,
  type LaundryServiceType,
  LaundryTariffRow,
  type LaundryTariffRowProps,
  type TrilingualGarmentTitle,
  calculateLaundryBagBill,
  formatPriceLkr,
  getCategoryLabel,
  getServiceTypeLabel,
  resolveTrilingualTitle,
} from "../src/admin/menus/LaundryCatalogEditor.js";

describe("Step 242: Laundry & Dry Cleaning Price List Editor (LaundryCatalogEditor.tsx)", () => {
  describe("1. Default Catalog Presets & Domain Configuration", () => {
    it("contains authentic Sri Lankan hotel laundry presets", () => {
      assert.strictEqual(DEFAULT_LAUNDRY_CATALOG.length, 6);
      const ids = DEFAULT_LAUNDRY_CATALOG.map((i) => i.id);
      assert.ok(ids.includes("lnd-shirt-01"));
      assert.ok(ids.includes("lnd-trouser-02"));
      assert.ok(ids.includes("lnd-saree-03"));
      assert.ok(ids.includes("lnd-sarong-04"));
      assert.ok(ids.includes("lnd-blazer-05"));
      assert.ok(ids.includes("lnd-dress-06"));
    });

    it("verifies Kandyan Osariya & Silk Saree tariff details", () => {
      const saree = DEFAULT_LAUNDRY_CATALOG.find((i) => i.id === "lnd-saree-03");
      assert.ok(saree);
      assert.strictEqual(saree.category, "TRADITIONAL_CEYLON");
      assert.strictEqual(saree.pricesLkr.WASH_AND_IRON, 1400.0);
      assert.strictEqual(saree.pricesLkr.DRY_CLEAN, 2800.0);
      assert.strictEqual(saree.pricesLkr.PRESS_ONLY, 900.0);
      assert.strictEqual(saree.turnaroundHours, 48);
      assert.strictEqual(saree.expressEligible, false);
      assert.ok(saree.specialCareNotice?.includes("delicate steam press"));
    });

    it("verifies Handloom Sarong tariff details", () => {
      const sarong = DEFAULT_LAUNDRY_CATALOG.find((i) => i.id === "lnd-sarong-04");
      assert.ok(sarong);
      assert.strictEqual(sarong.category, "TRADITIONAL_CEYLON");
      assert.strictEqual(sarong.pricesLkr.WASH_AND_IRON, 600.0);
      assert.strictEqual(sarong.expressEligible, true);
      assert.strictEqual(sarong.turnaroundHours, 24);
    });
  });

  describe("2. Pure Domain Math & Formatting Helpers", () => {
    it("formatPriceLkr formats currency with LKR symbol", () => {
      const formatted = formatPriceLkr(1200);
      assert.ok(formatted.includes("1,200") || formatted.includes("1200"));
    });

    it("resolveTrilingualTitle handles trilingual lookups", () => {
      const title: TrilingualGarmentTitle = {
        en: "Ceylon Batik Shirt",
        si: "බතික් කමිසය",
        ta: "பாடிக் சட்டை",
      };
      assert.strictEqual(resolveTrilingualTitle(title, "en"), "Ceylon Batik Shirt");
      assert.strictEqual(resolveTrilingualTitle(title, "si"), "බතික් කමිසය");
      assert.strictEqual(resolveTrilingualTitle(title, "ta"), "பாடிக் சட்டை");
      // Fallback
      assert.strictEqual(resolveTrilingualTitle(title, undefined), "Ceylon Batik Shirt");
    });

    it("getCategoryLabel maps garment categories to readable labels", () => {
      assert.strictEqual(getCategoryLabel("MENS"), "Men's Apparel");
      assert.strictEqual(getCategoryLabel("LADIES"), "Ladies' Wear");
      assert.strictEqual(getCategoryLabel("CHILDRENS"), "Children's Clothing");
      assert.strictEqual(getCategoryLabel("TRADITIONAL_CEYLON"), "Traditional Ceylon Attire");
      assert.strictEqual(getCategoryLabel("HOUSEHOLD_LINEN"), "Bed & Bath Linen");
    });

    it("getServiceTypeLabel maps service types to human labels", () => {
      assert.strictEqual(getServiceTypeLabel("WASH_AND_IRON"), "Wash & Iron");
      assert.strictEqual(getServiceTypeLabel("DRY_CLEAN"), "Dry Cleaning");
      assert.strictEqual(getServiceTypeLabel("PRESS_ONLY"), "Pressing Only");
    });
  });

  describe("3. calculateLaundryBagBill Calculations & Statutory Taxes", () => {
    it("calculates standard bill without express surcharge correctly", () => {
      const items = DEFAULT_LAUNDRY_CATALOG;
      const selections: Record<string, LaundryBagLineSelection> = {
        "lnd-shirt-01": { serviceType: "WASH_AND_IRON", quantity: 2 }, // 2 * 650 = 1300
        "lnd-trouser-02": { serviceType: "PRESS_ONLY", quantity: 1 }, // 1 * 400 = 400
      };

      const bill = calculateLaundryBagBill(items, selections, false);
      assert.strictEqual(bill.standardSubtotalLkr, 1700.0);
      assert.strictEqual(bill.isExpress, false);
      assert.strictEqual(bill.expressSurchargeLkr, 0);
      assert.strictEqual(bill.netTotalLkr, 1700.0);
      assert.strictEqual(bill.totalGarmentsCount, 3);
      assert.strictEqual(bill.lines.length, 2);

      // Statutory taxes: 10% SC = 170.00, 18% VAT on (1700 + 170 = 1870) = 336.60
      assert.strictEqual(bill.estimatedServiceChargeLkr, 170.0);
      assert.strictEqual(bill.estimatedVatLkr, 336.6);
      assert.strictEqual(bill.grandTotalLkr, 2206.6);
    });

    it("calculates express 4-hour +50% surcharge accurately", () => {
      const items = DEFAULT_LAUNDRY_CATALOG;
      const selections: Record<string, LaundryBagLineSelection> = {
        "lnd-blazer-05": { serviceType: "DRY_CLEAN", quantity: 1 }, // 1 * 2400 = 2400
      };

      const bill = calculateLaundryBagBill(items, selections, true);
      assert.strictEqual(bill.standardSubtotalLkr, 2400.0);
      assert.strictEqual(bill.isExpress, true);
      assert.strictEqual(bill.expressSurchargeLkr, 1200.0); // +50% of 2400
      assert.strictEqual(bill.netTotalLkr, 3600.0);

      // Statutory taxes: 10% SC on 3600 = 360.00, 18% VAT on (3600 + 360 = 3960) = 712.80
      assert.strictEqual(bill.estimatedServiceChargeLkr, 360.0);
      assert.strictEqual(bill.estimatedVatLkr, 712.8);
      assert.strictEqual(bill.grandTotalLkr, 4672.8);
    });

    it("returns zero totals when selections are empty or 0 quantity", () => {
      const items = DEFAULT_LAUNDRY_CATALOG;
      const selections: Record<string, LaundryBagLineSelection> = {
        "lnd-shirt-01": { serviceType: "WASH_AND_IRON", quantity: 0 },
      };

      const bill = calculateLaundryBagBill(items, selections, false);
      assert.strictEqual(bill.standardSubtotalLkr, 0);
      assert.strictEqual(bill.grandTotalLkr, 0);
      assert.strictEqual(bill.totalGarmentsCount, 0);
      assert.strictEqual(bill.lines.length, 0);
    });
  });

  describe("4. Static Markup & Component Verification", () => {
    it("renders LaundryMetricsBento with SLA and active metrics", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaundryMetricsBento, {
          items: DEFAULT_LAUNDRY_CATALOG,
          expressSurchargePercent: 50,
        }),
      );
      assert.ok(html.includes('data-testid="laundry-metrics-bento"'));
      assert.ok(html.includes("+50%"));
      assert.ok(html.includes("Garment Tariff"));
      assert.ok(html.includes("Express 4-Hour SLA"));
    });

    it("renders LaundryTariffRow with service prices and status", () => {
      const item = DEFAULT_LAUNDRY_CATALOG[0];
      assert.ok(item);
      const html = renderToStaticMarkup(
        React.createElement(LaundryTariffRow, {
          item,
          language: "en",
          onToggleActive: () => undefined,
          onUpdatePrice: () => undefined,
          readOnly: false,
        }),
      );
      assert.ok(html.includes(`data-testid="laundry-row-${item.id}"`));
      assert.ok(html.includes("Wash &amp; Iron") || html.includes("Wash & Iron"));
      assert.ok(html.includes("LND-SHIRT-M"));
      assert.ok(html.includes("4-Hr Express"));
    });

    it("renders LaundryTariffRow in read-only mode without inputs", () => {
      const item = DEFAULT_LAUNDRY_CATALOG[2]; // Osariya
      assert.ok(item);
      const html = renderToStaticMarkup(
        React.createElement(LaundryTariffRow, {
          item,
          language: "en",
          onToggleActive: () => undefined,
          onUpdatePrice: () => undefined,
          readOnly: true,
        }),
      );
      assert.ok(html.includes("Standard SLA Only"));
      assert.ok(html.includes("delicate steam press"));
    });

    it("renders LaundryBagRunner with digital laundry bag controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaundryBagRunner, {
          items: DEFAULT_LAUNDRY_CATALOG,
          roomNumber: "Room 101 (Deluxe Beach Chalet)",
          language: "en",
        }),
      );
      assert.ok(html.includes('data-testid="laundry-bag-runner"'));
      assert.ok(html.includes("Room 101 (Deluxe Beach Chalet)"));
      assert.ok(html.includes("Digital Laundry Bag"));
      assert.ok(html.includes("4-Hour Express Surcharge (+50%)"));
    });

    it("renders LaundryCatalogEditor top-level component with tab controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaundryCatalogEditor, {
          initialItems: DEFAULT_LAUNDRY_CATALOG,
          language: "en",
        }),
      );
      assert.ok(html.includes('data-testid="laundry-catalog-editor-root"'));
      assert.ok(
        html.includes("Laundry &amp; Dry Cleaning Price List Editor") ||
          html.includes("Laundry & Dry Cleaning Price List Editor"),
      );
      assert.ok(html.includes("Tariff Price List"));
      assert.ok(html.includes("Digital Bag Simulator"));
      assert.ok(html.includes("Filter Category:"));
    });

    it("verifies type-level compliance with exported interfaces", () => {
      const cat: GarmentCategory = "TRADITIONAL_CEYLON";
      const svc: LaundryServiceType = "DRY_CLEAN";
      const tab: LaundryEditorTab = "PRICE_LIST";
      const item = DEFAULT_LAUNDRY_CATALOG[0] as LaundryGarmentItem;
      const sel: LaundryBagLineSelection = { serviceType: svc, quantity: 1 };
      const line: LaundryBillLine = {
        itemId: item.id,
        title: item.title.en,
        serviceType: svc,
        quantity: 1,
        unitPriceLkr: 1200,
        lineTotalLkr: 1200,
      };
      const summary: LaundryBillSummary = {
        standardSubtotalLkr: 1200,
        isExpress: false,
        expressSurchargeLkr: 0,
        netTotalLkr: 1200,
        estimatedServiceChargeLkr: 120,
        estimatedVatLkr: 237.6,
        grandTotalLkr: 1557.6,
        totalGarmentsCount: 1,
        lines: [line],
      };
      const bentoProps: LaundryMetricsBentoProps = { items: [item] };
      const rowProps: LaundryTariffRowProps = {
        item,
        onToggleActive: () => undefined,
        onUpdatePrice: () => undefined,
      };
      const runnerProps: LaundryBagRunnerProps = { items: [item] };
      const editorProps: LaundryCatalogEditorProps = { initialItems: [item] };

      assert.ok(
        cat &&
          svc &&
          tab &&
          item &&
          sel &&
          line &&
          summary &&
          bentoProps &&
          rowProps &&
          runnerProps &&
          editorProps,
      );
    });
  });
});
