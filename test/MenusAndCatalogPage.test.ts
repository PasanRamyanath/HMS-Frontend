import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_DOMSPEED_MENU_ITEMS } from "../src/admin/menus/MenuItemGrid.js";
import {
  MENU_CATALOG_TABS,
  MENU_SEGMENTED_OPTIONS,
  MenuCatalogHeader,
  type MenuCatalogHeaderProps,
  MenuCatalogKPIBanner,
  type MenuCatalogKPIBannerProps,
  type MenuCatalogKPIs,
  type MenuCatalogTabId,
  type MenuCatalogTabMeta,
  MenusAndCatalogPage,
  type MenusAndCatalogPageProps,
  computeMenuCatalogKPIs,
} from "../src/admin/menus/MenusAndCatalogPage.js";
import { DEFAULT_OUT_OF_STOCK_ITEMS } from "../src/admin/menus/OutOfStockBoard.js";

describe("Step 248: Master Menus & Services Catalog Page (MenusAndCatalogPage.tsx)", () => {
  describe("1. Pure KPI Computation Engine", () => {
    it("computes accurate catalog KPIs from provided items and presets", () => {
      const kpis = computeMenuCatalogKPIs(
        DEFAULT_DOMSPEED_MENU_ITEMS,
        8,
        DEFAULT_OUT_OF_STOCK_ITEMS,
      );

      assert.strictEqual(kpis.totalDishes, DEFAULT_DOMSPEED_MENU_ITEMS.length);
      assert.strictEqual(kpis.totalCategories, 8);
      assert.strictEqual(kpis.outOfStockCount, 6);
      assert.strictEqual(kpis.minibarItemsCount, 16);
      assert.strictEqual(kpis.laundryItemsCount, 22);
      assert.strictEqual(kpis.activeHappyHourRules, 3);
    });

    it("handles zero items without errors", () => {
      const emptyKpis = computeMenuCatalogKPIs([], 0, []);
      assert.strictEqual(emptyKpis.totalDishes, 0);
      assert.strictEqual(emptyKpis.totalCategories, 0);
      assert.strictEqual(emptyKpis.outOfStockCount, 0);
    });
  });

  describe("2. Tab Navigation Constants & Segmented Options", () => {
    it("defines 9 comprehensive workspace tabs covering the entire F&B and services catalog", () => {
      assert.strictEqual(MENU_CATALOG_TABS.length, 9);
      assert.strictEqual(MENU_SEGMENTED_OPTIONS.length, 9);

      const tabIds = MENU_CATALOG_TABS.map((t) => t.id);
      assert.ok(tabIds.includes("ITEMS"));
      assert.ok(tabIds.includes("CATEGORIES"));
      assert.ok(tabIds.includes("OUT_OF_STOCK"));
      assert.ok(tabIds.includes("MINIBAR"));
      assert.ok(tabIds.includes("LAUNDRY"));
      assert.ok(tabIds.includes("HAPPY_HOUR"));
      assert.ok(tabIds.includes("MEAL_PLANS"));
      assert.ok(tabIds.includes("MENU_ENGINEERING"));
      assert.ok(tabIds.includes("PRINT_SHEET"));
    });

    it("verifies badges on 86'd board and menu engineering matrix", () => {
      const oosTab = MENU_CATALOG_TABS.find((t) => t.id === "OUT_OF_STOCK");
      assert.ok(oosTab);
      assert.strictEqual(oosTab.badge, "Live Kitchen");

      const engTab = MENU_CATALOG_TABS.find((t) => t.id === "MENU_ENGINEERING");
      assert.ok(engTab);
      assert.strictEqual(engTab.badge, "Profitability");
    });
  });

  describe("3. React Subcomponents & Apple HIG Rendering", () => {
    const sampleTabMeta: MenuCatalogTabMeta = {
      id: "ITEMS",
      label: "Dishes & Drinks",
      shortLabel: "Menu",
      description: "Browse, edit, and create food dishes, drinks, and modifiers.",
      badge: "Full Catalog",
    };

    it("renders MenuCatalogHeader with property title, tab description, and action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenuCatalogHeader, {
          propertyTitle: "Galle Fort Lighthouse Villa",
          activeTabInfo: sampleTabMeta,
          onOpenBulkPrice: () => undefined,
          onExportMenu: () => undefined,
          onPrintMenu: () => undefined,
          onSeedComplete: () => undefined,
        }),
      );

      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Dishes &amp; Drinks") || html.includes("Dishes & Drinks"));
      assert.ok(html.includes("Full Catalog"));
      assert.ok(html.includes("Bulk Reprice"));
      assert.ok(html.includes("Export JSON"));
      assert.ok(html.includes("Export CSV"));
      assert.ok(html.includes("Print Menu"));
    });

    it("renders MenuCatalogKPIBanner with 6 metric cards", () => {
      const kpis: MenuCatalogKPIs = {
        totalDishes: 42,
        totalCategories: 8,
        outOfStockCount: 5,
        minibarItemsCount: 16,
        laundryItemsCount: 22,
        activeHappyHourRules: 3,
      };

      const html = renderToStaticMarkup(
        React.createElement(MenuCatalogKPIBanner, {
          kpis,
          activeTab: "ITEMS",
          onSelectTab: () => undefined,
        }),
      );

      assert.ok(html.includes("Total Dishes"));
      assert.ok(html.includes("42"));
      assert.ok(html.includes("Categories"));
      assert.ok(html.includes("8"));
      assert.ok(html.includes("86&#x27;d Items") || html.includes("86'd Items"));
      assert.ok(html.includes("5"));
      assert.ok(html.includes("Minibar Lines"));
      assert.ok(html.includes("16"));
      assert.ok(html.includes("Laundry Tariff"));
      assert.ok(html.includes("22"));
      assert.ok(html.includes("Happy Hours"));
      assert.ok(html.includes("3"));
    });
  });

  describe("4. Master Page Component & Tab Switching", () => {
    it("renders default ITEMS tab rendering MenuItemGrid", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          propertyTitle: "Jetwing Lighthouse Galle",
          initialTab: "ITEMS",
        }),
      );

      assert.ok(html.includes('data-testid="menus-and-catalog-page"'));
      assert.ok(html.includes("Jetwing Lighthouse Galle"));
      assert.ok(html.includes("Village Style Chicken Rice"));
    });

    it("renders OUT_OF_STOCK tab rendering OutOfStockBoard", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          propertyTitle: "Jetwing Lighthouse Galle",
          initialTab: "OUT_OF_STOCK",
        }),
      );

      assert.ok(html.includes("Out-of-Stock"));
      assert.ok(html.includes("Curry Station"));
    });

    it("renders MINIBAR tab rendering MinibarCatalogEditor", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          initialTab: "MINIBAR",
        }),
      );

      assert.ok(html.includes("Minibar") || html.includes("Par-Stock"));
    });

    it("renders LAUNDRY tab rendering LaundryCatalogEditor", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          initialTab: "LAUNDRY",
        }),
      );

      assert.ok(html.includes("Laundry") || html.includes("Dry Cleaning"));
    });

    it("renders MENU_ENGINEERING tab rendering MenuEngineeringCard", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          initialTab: "MENU_ENGINEERING",
        }),
      );

      assert.ok(html.includes("Menu Engineering"));
    });

    it("renders PRINT_SHEET tab rendering PrintableMenuSheet", () => {
      const html = renderToStaticMarkup(
        React.createElement(MenusAndCatalogPage, {
          initialTab: "PRINT_SHEET",
        }),
      );

      assert.ok(html.includes("All prices are in LKR and subject to 10% Service Charge"));
    });

    it("verifies type-level compliance with exported interfaces and types", () => {
      const tabId: MenuCatalogTabId = "ITEMS";
      const meta: MenuCatalogTabMeta = MENU_CATALOG_TABS[0] as MenuCatalogTabMeta;
      const kpis: MenuCatalogKPIs = {
        totalDishes: 10,
        totalCategories: 2,
        outOfStockCount: 1,
        minibarItemsCount: 5,
        laundryItemsCount: 8,
        activeHappyHourRules: 1,
      };
      const headerProps: MenuCatalogHeaderProps = {
        propertyTitle: "Resort",
        activeTabInfo: meta,
        onOpenBulkPrice: () => undefined,
        onExportMenu: () => undefined,
        onPrintMenu: () => undefined,
        onSeedComplete: () => undefined,
      };
      const bannerProps: MenuCatalogKPIBannerProps = {
        kpis,
        activeTab: tabId,
        onSelectTab: () => undefined,
      };
      const pageProps: MenusAndCatalogPageProps = {
        initialTab: tabId,
        propertyTitle: "Resort",
        tenantId: "T-01",
        onTabChange: () => undefined,
        onActionNotify: () => undefined,
      };

      assert.ok(tabId && meta && kpis && headerProps && bannerProps && pageProps);
    });
  });
});
