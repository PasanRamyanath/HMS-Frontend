import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CHANNELS_PAGE_TABS,
  ChannelsAndDirectPage,
  type ChannelsAndDirectPageProps,
  type ChannelsPageTab,
  DEFAULT_HOTEL_NAME,
  DEFAULT_TENANT_ID,
  type DirectWidgetConfig,
  WIDGET_THEMES,
  computeProjectedDirectSavings,
  generateBookingEmbedCode,
  getTabDisplayConfig,
} from "../src/admin/channels/ChannelsAndDirectPage.js";

describe("Unified Distribution & Direct Booking Master Page (ChannelsAndDirectPage.tsx)", () => {
  describe("1. Default Constants & Navigation Options", () => {
    it("provides standard default tenant and hotel constants", () => {
      assert.strictEqual(DEFAULT_TENANT_ID, "tenant-galle-fort");
      assert.strictEqual(DEFAULT_HOTEL_NAME, "Galle Fort Lighthouse Villa");
    });

    it("defines 5 primary distribution navigation tabs", () => {
      assert.strictEqual(CHANNELS_PAGE_TABS.length, 5);
      assert.deepStrictEqual(
        CHANNELS_PAGE_TABS.map((t) => t.id),
        ["CHANNELS_ARI", "RESTRICTIONS", "COMMISSIONS", "BANK_PROMOS", "DIRECT_WIDGET"],
      );
    });

    it("provides 4 Apple-inspired widget themes", () => {
      assert.strictEqual(WIDGET_THEMES.length, 4);
      assert.ok(WIDGET_THEMES.some((t) => t.id === "apple-glass"));
      assert.ok(WIDGET_THEMES.some((t) => t.id === "emerald"));
      assert.ok(WIDGET_THEMES.some((t) => t.id === "navy"));
      assert.ok(WIDGET_THEMES.some((t) => t.id === "amber"));
    });

    it("verifies exported types and shapes are constructible", () => {
      const tab: ChannelsPageTab = "DIRECT_WIDGET";
      const config: DirectWidgetConfig = {
        layout: "floating",
        theme: "apple-glass",
        showPromos: true,
        primaryColor: "#0071e3",
      };
      assert.strictEqual(tab, "DIRECT_WIDGET");
      assert.strictEqual(config.layout, "floating");
      assert.strictEqual(config.theme, "apple-glass");
    });
  });

  describe("2. Pure Calculation Helpers", () => {
    it("generateBookingEmbedCode creates valid 1-line script tag with data attributes", () => {
      const code1 = generateBookingEmbedCode("tenant-bentota-resort");
      assert.ok(code1.startsWith("<script src="));
      assert.ok(code1.includes("https://cdn.srilankahms.com/booking-widget.js"));
      assert.ok(code1.includes('data-tenant="tenant-bentota-resort"'));
      assert.ok(code1.includes('data-layout="floating"'));
      assert.ok(code1.includes('data-theme="apple-glass"'));
      assert.ok(code1.endsWith("async></script>"));

      const code2 = generateBookingEmbedCode("tenant-colombo", "inline", "emerald");
      assert.ok(code2.includes('data-layout="inline"'));
      assert.ok(code2.includes('data-theme="emerald"'));

      // Empty tenant fallback
      const code3 = generateBookingEmbedCode("");
      assert.ok(code3.includes(`data-tenant="${DEFAULT_TENANT_ID}"`));
    });

    it("computeProjectedDirectSavings calculates commission savings accurately", () => {
      // LKR 10,000,000 at 18% standard OTA rate
      assert.strictEqual(computeProjectedDirectSavings(10000000, 0.18), 1800000);

      // Default rate 18%
      assert.strictEqual(computeProjectedDirectSavings(1000000), 180000);

      // Edge cases: zero or negative values
      assert.strictEqual(computeProjectedDirectSavings(0), 0);
      assert.strictEqual(computeProjectedDirectSavings(-5000), 0);
      assert.strictEqual(computeProjectedDirectSavings(100000, 0), 0);
    });

    it("getTabDisplayConfig returns proper descriptive titles and subtitles for all tabs", () => {
      const ari = getTabDisplayConfig("CHANNELS_ARI");
      assert.ok(ari.title.includes("Channex 2-Way ARI"));
      assert.ok(ari.subtitle.includes("Booking.com"));

      const restr = getTabDisplayConfig("RESTRICTIONS");
      assert.ok(restr.title.includes("Stop-Sell & MinLOS"));

      const comm = getTabDisplayConfig("COMMISSIONS");
      assert.ok(comm.title.includes("OTA Commission"));

      const promos = getTabDisplayConfig("BANK_PROMOS");
      assert.ok(promos.title.includes("Bank Card Promotions"));

      const direct = getTabDisplayConfig("DIRECT_WIDGET");
      assert.ok(direct.title.includes("Commission-Free Direct Booking"));
    });
  });

  describe("3. Static HTML Rendering", () => {
    it("renders default CHANNELS_ARI tab with top toolbar and channel view", () => {
      const html = renderToStaticMarkup(React.createElement(ChannelsAndDirectPage));

      assert.ok(html.includes("Distribution &amp; Direct Booking Hub"));
      assert.ok(html.includes("CHANNEX 2-WAY LIVE"));
      assert.ok(html.includes("Webhook Inspector"));
      assert.ok(html.includes("Live Booking Portal"));
      assert.ok(html.includes("OTAs &amp; Channex ARI"));
      assert.ok(html.includes("Stop-Sell &amp; MinLOS"));
      assert.ok(html.includes("OTA Reconciliation"));
      assert.ok(html.includes("Bank Card Promos"));
      assert.ok(html.includes("Direct Engine &amp; Embed"));
    });

    it("renders DIRECT_WIDGET tab with 1-line script generator, QR code, and savings banner", () => {
      const props: ChannelsAndDirectPageProps = {
        initialTab: "DIRECT_WIDGET",
        tenantId: "tenant-weligama-bay",
        hotelName: "Weligama Bay Horizon Villa",
      };

      const html = renderToStaticMarkup(React.createElement(ChannelsAndDirectPage, props));
      assert.ok(html.includes("0% Commission Direct"));
      assert.ok(html.includes("Hosted Booking Route"));
      assert.ok(html.includes("https://book.srilankahms.com/book/tenant-weligama-bay"));
      assert.ok(html.includes("1-Line Website Embed Snippet Generator"));
      assert.ok(html.includes("data-tenant=&quot;tenant-weligama-bay&quot;"));
      assert.ok(html.includes("Direct Booking QR"));
    });

    it("renders RESTRICTIONS tab with QuickRestrictionsBar", () => {
      const props: ChannelsAndDirectPageProps = {
        initialTab: "RESTRICTIONS",
      };

      const html = renderToStaticMarkup(React.createElement(ChannelsAndDirectPage, props));
      assert.ok(html.includes("Instant Stop-Sell &amp; MinLOS Quick Bar"));
      assert.ok(html.includes("Emergency Stop-Sell All"));
    });

    it("renders COMMISSIONS tab with OtaCommissionTable", () => {
      const props: ChannelsAndDirectPageProps = {
        initialTab: "COMMISSIONS",
      };

      const html = renderToStaticMarkup(React.createElement(ChannelsAndDirectPage, props));
      assert.ok(html.includes("OTA Commission &amp; Net Revenue Reconciliation"));
    });

    it("renders BANK_PROMOS tab with BankPromoManager", () => {
      const props: ChannelsAndDirectPageProps = {
        initialTab: "BANK_PROMOS",
      };

      const html = renderToStaticMarkup(React.createElement(ChannelsAndDirectPage, props));
      assert.ok(html.includes("Commercial Bank"));
    });
  });
});
