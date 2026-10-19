import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ActiveStayItem,
  BILLING_WORKSPACE_TABS,
  type BillingWorkspaceKPIs,
  type BillingWorkspaceTab,
  DEFAULT_ACTIVE_STAYS,
  DEFAULT_BILLING_KPIS,
  DEFAULT_HOTEL_NAME,
  DEFAULT_TENANT_ID,
  FoliosAndBillingPage,
  type FoliosAndBillingPageProps,
  calculateBillingWorkspaceKPIs,
  getBillingTabInfo,
} from "../src/admin/folios/FoliosAndBillingPage.js";

describe("Step 223: FoliosAndBillingPage Unified Cashiering & Billing Workspace", () => {
  describe("1. Constants & Workspace Navigation Options", () => {
    it("defines four core billing tabs with correct identifiers", () => {
      assert.strictEqual(BILLING_WORKSPACE_TABS.length, 4);
      const tabIds: BillingWorkspaceTab[] = BILLING_WORKSPACE_TABS.map((t) => t.id);
      assert.deepStrictEqual(tabIds, [
        "ACTIVE_FOLIOS",
        "CITY_LEDGER",
        "CASHIER_SHIFT",
        "INVOICE_ARCHIVE",
      ]);
    });

    it("exports default hotel constants and sample active stay items", () => {
      assert.strictEqual(DEFAULT_TENANT_ID, "TENANT-LIGHTHOUSE");
      assert.strictEqual(DEFAULT_HOTEL_NAME, "Jetwing Lighthouse Galle");
      assert.strictEqual(DEFAULT_ACTIVE_STAYS.length, 3);

      const firstStay: ActiveStayItem | undefined = DEFAULT_ACTIVE_STAYS[0];
      assert.ok(firstStay !== undefined);
      assert.strictEqual(firstStay.roomNumber, "Villa 104");
      assert.strictEqual(firstStay.isDmc, true);
    });

    it("verifies default KPIs structure", () => {
      const kpis: BillingWorkspaceKPIs = DEFAULT_BILLING_KPIS;
      assert.strictEqual(kpis.activeFolioCount, 3);
      assert.strictEqual(kpis.totalActiveIncurredLkr, 284500);
      assert.strictEqual(kpis.statutoryVatAndSsclPoolLkr, 72400);
    });
  });

  describe("2. Pure Calculation & Information Helpers", () => {
    it("calculates accurate billing KPIs from stay array", () => {
      const kpis: BillingWorkspaceKPIs = calculateBillingWorkspaceKPIs(DEFAULT_ACTIVE_STAYS);
      assert.strictEqual(kpis.activeFolioCount, 3);
      const expectedBalance = DEFAULT_ACTIVE_STAYS.reduce((acc, s) => acc + s.balanceLkr, 0);
      assert.strictEqual(kpis.guestBalanceDueLkr, Math.round(expectedBalance * 100) / 100);
    });

    it("returns correct tab titles and descriptive texts", () => {
      const activeInfo = getBillingTabInfo("ACTIVE_FOLIOS");
      assert.ok(activeInfo.title.includes("Active In-Stay Guest Folios"));

      const cityInfo = getBillingTabInfo("CITY_LEDGER");
      assert.ok(cityInfo.title.includes("City Ledger"));

      const shiftInfo = getBillingTabInfo("CASHIER_SHIFT");
      assert.ok(shiftInfo.title.includes("Cashier Shift Handover"));

      const archiveInfo = getBillingTabInfo("INVOICE_ARCHIVE");
      assert.ok(archiveInfo.title.includes("Historical Tax Invoice"));
    });
  });

  describe("3. SSR Component Rendering & Tab Switching", () => {
    it("renders page with executive bento KPI header and quick action bar", () => {
      const props: FoliosAndBillingPageProps = {
        hotelName: "Jetwing Lighthouse Galle",
      };
      const html = renderToStaticMarkup(React.createElement(FoliosAndBillingPage, props));

      // Bento KPIs
      assert.ok(html.includes("Folios, Cashiering &amp; City Ledger"));
      assert.ok(html.includes("Active Folios"));
      assert.ok(html.includes("Guest Balance Due"));
      assert.ok(html.includes("City Ledger AR"));
      assert.ok(html.includes("Today&#x27;s Collections"));
      assert.ok(html.includes("Statutory Taxes"));

      // Quick action bar
      assert.ok(html.includes("Non-Resident / Pool Pass Folio"));
      assert.ok(html.includes("Petty Cash / Paid-Out Voucher"));
      assert.ok(html.includes("Encash Foreign Currency"));
      assert.ok(html.includes("Shift Handover &amp; Drawer Drop"));

      // Active room selector cards
      assert.ok(html.includes("Villa 104"));
      assert.ok(html.includes("Ocean Deluxe 201"));
      assert.ok(html.includes("Heritage Suite 305"));
    });

    it("renders City Ledger tab content when initialTab is CITY_LEDGER", () => {
      const html = renderToStaticMarkup(
        React.createElement(FoliosAndBillingPage, {
          initialTab: "CITY_LEDGER",
        }),
      );

      assert.ok(html.includes("City Ledger"));
      assert.ok(html.includes("Aitken Spence Travels"));
    });

    it("renders Cashier Shift tab content when initialTab is CASHIER_SHIFT", () => {
      const html = renderToStaticMarkup(
        React.createElement(FoliosAndBillingPage, {
          initialTab: "CASHIER_SHIFT",
        }),
      );

      assert.ok(html.includes("Front Desk Cash Drawer &amp; Shift Handover"));
      assert.ok(html.includes("Open Cashier Shift Handover &amp; Drawer Drop Modal"));
    });

    it("renders Tax Invoice Archive tab content when initialTab is INVOICE_ARCHIVE", () => {
      const html = renderToStaticMarkup(
        React.createElement(FoliosAndBillingPage, {
          initialTab: "INVOICE_ARCHIVE",
        }),
      );

      assert.ok(html.includes("Historical Tax Invoice"));
      assert.ok(html.includes("Export CSV"));
    });
  });
});
