/**
 * Unit Test Suite for Step 398: InventoryAdminPage & Unified Stores Hub
 *
 * Validates:
 * 1. Tab Definitions & Metric Constants:
 *    - INVENTORY_TABS contains 6 core workspace tabs with icons
 *    - DEFAULT_INVENTORY_METRICS contains 6 executive metrics
 * 2. Trilingual Localization Integrity:
 *    - Complete translation dictionaries across English, Sinhala, and Tamil
 * 3. Static Markup & Component Rendering:
 *    - Renders default STOCK_REGISTRY tab view without crashing
 *    - Renders PROCUREMENT tab view with voucher center
 *    - Renders BAR_AUDIT tab view with liquor scale auditing
 *    - Renders STOCK_TAKE tab view with variance calculator
 *    - Renders PAYABLES tab view with AP aging & supplier directory
 *    - Renders COST_CONTROL tab view with F&B flash report
 *    - Renders Sinhala and Tamil localizations accurately
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_INVENTORY_METRICS,
  INVENTORY_PAGE_TRANSLATIONS,
  INVENTORY_TABS,
  InventoryAdminPage,
} from "../src/admin/inventory/InventoryAdminPage.js";

describe("Step 398: InventoryAdminPage & Unified Stores Hub", () => {
  describe("1. Tab Definitions & Metric Constants", () => {
    it("defines 6 core workspace tabs with icons and short labels", () => {
      assert.equal(INVENTORY_TABS.length, 6);
      const tabIds = INVENTORY_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, [
        "STOCK_REGISTRY",
        "PROCUREMENT",
        "BAR_AUDIT",
        "STOCK_TAKE",
        "PAYABLES",
        "COST_CONTROL",
      ]);

      for (const tab of INVENTORY_TABS) {
        assert.ok(tab.label.length > 0);
        assert.ok(tab.shortLabel.length > 0);
        assert.ok(tab.icon.length > 0);
      }
    });

    it("verifies default executive overview metrics", () => {
      assert.ok(DEFAULT_INVENTORY_METRICS.totalValuationLkr > 10000000);
      assert.ok(DEFAULT_INVENTORY_METRICS.totalActiveSkus > 100);
      assert.ok(DEFAULT_INVENTORY_METRICS.pendingRequisitions > 0);
      assert.ok(DEFAULT_INVENTORY_METRICS.outstandingPayablesLkr > 1000000);
      assert.ok(DEFAULT_INVENTORY_METRICS.dailyFnbCostPercent > 20);
      assert.ok(DEFAULT_INVENTORY_METRICS.criticalExpiryBatches > 0);
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("contains complete translations across English, Sinhala, and Tamil", () => {
      const locales: ("en" | "si" | "ta")[] = ["en", "si", "ta"];

      for (const loc of locales) {
        const i18n = INVENTORY_PAGE_TRANSLATIONS[loc];
        assert.ok(i18n.pageTitle.length > 0);
        assert.ok(i18n.pageSubtitle.length > 0);

        // Quick action triggers
        assert.ok(i18n.quickActions.newPr.length > 0);
        assert.ok(i18n.quickActions.newPo.length > 0);
        assert.ok(i18n.quickActions.newGrn.length > 0);
        assert.ok(i18n.quickActions.newGin.length > 0);
        assert.ok(i18n.quickActions.newDebitNote.length > 0);
        assert.ok(i18n.quickActions.scanBarcode.length > 0);
        assert.ok(i18n.quickActions.logWastage.length > 0);

        // KPI labels
        assert.ok(i18n.kpi.totalValuation.length > 0);
        assert.ok(i18n.kpi.activeSkus.length > 0);
        assert.ok(i18n.kpi.pendingPrs.length > 0);
        assert.ok(i18n.kpi.outstandingAp.length > 0);
        assert.ok(i18n.kpi.fnbCost.length > 0);
        assert.ok(i18n.kpi.criticalFefo.length > 0);

        // Section labels
        assert.ok(i18n.sections.fefoAlerts.length > 0);
        assert.ok(i18n.sections.containers.length > 0);
        assert.ok(i18n.sections.voucherCenter.length > 0);
        assert.ok(i18n.sections.supplierHub.length > 0);
      }
    });
  });

  describe("3. Static Markup & Component Rendering", () => {
    it("renders default STOCK_REGISTRY tab view without crashing", () => {
      const html = renderToStaticMarkup(React.createElement(InventoryAdminPage, {}));

      assert.match(html, /Store Inventory, Procurement &amp; Cost Control Hub/);
      assert.match(html, /Total Stock Valuation/);
      assert.match(html, /Active Master SKUs/);
      assert.match(html, /Empty Cylinder &amp; Returnable Crate Tracker/);
      assert.match(html, /Master Store &amp; Inventory SKU Registry/);
    });

    it("renders PROCUREMENT tab view with voucher center", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          initialTab: "PROCUREMENT",
        }),
      );

      assert.match(html, /Official Printable A4 Voucher Center/);
      assert.match(html, /GOODS RECEIVED NOTE \(GRN\)/);
    });

    it("renders BAR_AUDIT tab view with liquor scale auditing", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          initialTab: "BAR_AUDIT",
        }),
      );

      assert.match(html, /Bar Peg Audit/);
      assert.match(html, /Rockland Old Arrack/);
    });

    it("renders STOCK_TAKE tab view with variance calculator", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          initialTab: "STOCK_TAKE",
        }),
      );

      assert.match(html, /Monthly Physical Stock-Take/);
      assert.match(html, /Variance/);
    });

    it("renders PAYABLES tab view with AP aging & supplier directory", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          initialTab: "PAYABLES",
        }),
      );

      assert.match(html, /Supplier Accounts Payable/);
      assert.match(html, /Supplier &amp; Local Market Vendor Directory/);
    });

    it("renders COST_CONTROL tab view with F&B flash report", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          initialTab: "COST_CONTROL",
        }),
      );

      assert.match(html, /Daily Food &amp; Beverage Cost % Flash Report/);
      assert.match(html, /Flash Overview/);
    });

    it("renders Sinhala localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          language: "si",
        }),
      );

      assert.match(html, /ගබඩා තොග, මිලදී ගැනීම් සහ පිරිවැය පාලන මධ්‍යස්ථානය/);
      assert.match(html, /මුළු තොග වටිනාකම/);
      assert.match(html, /ක්‍රියාකාරී SKU ගණන/);
    });

    it("renders Tamil localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(InventoryAdminPage, {
          language: "ta",
        }),
      );

      assert.match(html, /களஞ்சிய கையிருப்பு, கொள்முதல் &amp; செலவு கட்டுப்பாட்டு மையம்/);
      assert.match(html, /மொத்த கையிருப்பு மதிப்பு/);
      assert.match(html, /செயலில் உள்ள SKUகள்/);
    });
  });
});
