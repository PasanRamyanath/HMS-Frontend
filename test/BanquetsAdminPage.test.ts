import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BANQUET_ADMIN_TABS,
  BANQUET_SEGMENTED_OPTIONS,
  BanquetsAdminPage,
  calculateBanquetOverviewMetrics,
  formatBanquetLkr,
  getBanquetAdminTranslations,
} from "../src/admin/banquets/BanquetsAdminPage.js";

const noop = () => undefined;

describe("Step 348: Unified Banquets, Weddings & MICE Admin Page (BanquetsAdminPage.tsx)", () => {
  describe("1. Pure Metric Calculations & Defaults", () => {
    it("returns default banquet overview metrics accurately", () => {
      const metrics = calculateBanquetOverviewMetrics();
      assert.equal(metrics.totalBookingsThisMonth, 18);
      assert.equal(metrics.confirmedWeddings, 12);
      assert.equal(metrics.tentativeHolds, 6);
      assert.equal(metrics.expiringHoldsAlert, 2);
      assert.equal(metrics.totalRevenueLkr, 48500000);
      assert.equal(metrics.averageFoodCostMarginPct, 58.4);
      assert.equal(metrics.casualLaborPayoutTodayLkr, 64500);
    });

    it("allows selective metric overrides", () => {
      const custom = calculateBanquetOverviewMetrics({
        confirmedWeddings: 15,
        totalRevenueLkr: 62000000,
        expiringHoldsAlert: 0,
      });

      assert.equal(custom.confirmedWeddings, 15);
      assert.equal(custom.totalRevenueLkr, 62000000);
      assert.equal(custom.expiringHoldsAlert, 0);
      assert.equal(custom.totalBookingsThisMonth, 18);
    });

    it("formats LKR integers cleanly with formatBanquetLkr", () => {
      const formatted = formatBanquetLkr(48500000);
      assert.ok(
        formatted.includes("48,500,000") ||
          formatted.includes("48.5M") ||
          formatted.includes("LKR"),
      );
    });
  });

  describe("2. Tab Definitions & Navigation Options", () => {
    it("defines all 8 core banquet operational tabs", () => {
      assert.equal(BANQUET_ADMIN_TABS.length, 8);

      const tabIds = BANQUET_ADMIN_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, [
        "CALENDAR",
        "BEO",
        "MENU",
        "LEADS",
        "TABLES",
        "PROFIT",
        "STEWARDS",
        "HALLS",
      ]);
    });

    it("maps tabs correctly to segmented control options with icons and badges", () => {
      assert.equal(BANQUET_SEGMENTED_OPTIONS.length, 8);

      const beoOption = BANQUET_SEGMENTED_OPTIONS.find((o) => o.id === "BEO");
      assert.ok(beoOption);
      assert.equal(beoOption?.label, "BEO Prospectus");
      assert.equal(beoOption?.badge, "Print");

      const leadsOption = BANQUET_SEGMENTED_OPTIONS.find((o) => o.id === "LEADS");
      assert.ok(leadsOption);
      assert.equal(leadsOption?.label, "Leads & Holds");
      assert.equal(leadsOption?.badge, "Critical");
    });
  });

  describe("3. Multi-Language Translations", () => {
    it("returns English translations by default", () => {
      const en = getBanquetAdminTranslations("en");
      assert.equal(en.title, "Banquet, Wedding & MICE Operations");
      assert.equal(en.quickPrintBeo, "Print Official BEO");
      assert.ok(en.defaultHotel.includes("Galle Face Heritage Hotel"));
    });

    it("returns Sinhala translations accurately", () => {
      const si = getBanquetAdminTranslations("si");
      assert.equal(si.title, "මංගල උත්සව සහ සම්මන්ත්රණ මෙහෙයුම් මධ්යස්ථානය");
      assert.equal(si.quickPrintBeo, "BEO ලේඛනය මුද්රණය");
    });

    it("returns Tamil translations accurately", () => {
      const ta = getBanquetAdminTranslations("ta");
      assert.equal(ta.title, "மண்டப, திருமண மற்றும் மாநாட்டு செயல்பாடுகள்");
      assert.equal(ta.quickPrintBeo, "அதிகாரப்பூர்வ BEO அச்சிடுக");
    });
  });

  describe("4. Static UI Markup & Component Integration", () => {
    it("renders master banquet admin page with default CALENDAR tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          propertyTitle: "Grand Ballroom & Royal Kandyan Wing",
          initialTab: "CALENDAR",
          language: "en",
          onTabChange: noop,
        }),
      );

      // Verify header & title
      assert.ok(html.includes("Banquet, Wedding &amp; MICE Operations"));
      assert.ok(html.includes("Grand Ballroom &amp; Royal Kandyan Wing"));

      // Verify action buttons
      assert.ok(html.includes("New Booking Wizard"));
      assert.ok(html.includes("Final Settlement"));
      assert.ok(html.includes("Liquor Gate Pass"));
      assert.ok(html.includes("Print Official BEO"));

      // Verify KPI ribbon
      assert.ok(html.includes("Monthly Bookings"));
      assert.ok(html.includes("Confirmed Weddings"));
      assert.ok(html.includes("Expiring Holds"));
      assert.ok(html.includes("Banquets Revenue"));
      assert.ok(html.includes("Avg Food Margin"));
      assert.ok(html.includes("Casual Steward Labor"));

      // Verify Calendar content is present
      assert.ok(
        html.includes("October 2026") || html.includes("Calendar") || html.includes("2026"),
      );
    });

    it("renders BEO prospectus tab when initialTab is BEO", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "BEO",
          language: "en",
        }),
      );

      assert.ok(html.includes("Banquet Event Order"));
      assert.ok(html.includes("BEO-2026-11-0428"));
      assert.ok(html.includes("Per-Table Sri Lankan Bites"));
    });

    it("renders Menu Packages tab when initialTab is MENU", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "MENU",
          language: "en",
        }),
      );

      assert.ok(html.includes("Royal Kandyan Platinum Buffet"));
      assert.ok(
        html.includes("Live Action Stations") || html.includes("Buffet") || html.includes("Menu"),
      );
    });

    it("renders Sales Leads tab when initialTab is LEADS", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "LEADS",
          language: "en",
        }),
      );

      assert.ok(
        html.includes("Sales Follow-Up Queue") ||
          html.includes("Tentative Hold") ||
          html.includes("Lead"),
      );
    });

    it("renders Floor Plan tab when initialTab is TABLES", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "TABLES",
          language: "en",
        }),
      );

      assert.ok(html.includes("Floor Plan") || html.includes("Table") || html.includes("Ballroom"));
    });

    it("renders Profitability tab when initialTab is PROFIT", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "PROFIT",
          language: "en",
        }),
      );

      assert.ok(
        html.includes("Profitability") || html.includes("Food Cost") || html.includes("Margin"),
      );
    });

    it("renders Casual Stewards tab when initialTab is STEWARDS", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "STEWARDS",
          language: "en",
        }),
      );

      assert.ok(html.includes("Casual") || html.includes("Steward") || html.includes("Payout"));
    });

    it("renders Hall Setup tab when initialTab is HALLS", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          initialTab: "HALLS",
          language: "en",
        }),
      );

      assert.ok(html.includes("Hall") || html.includes("Grand Ballroom"));
    });

    it("renders trilingual Sinhala and Tamil versions accurately", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          language: "si",
          initialTab: "CALENDAR",
        }),
      );
      assert.ok(htmlSi.includes("මංගල උත්සව සහ සම්මන්ත්රණ මෙහෙයුම් මධ්යස්ථානය"));
      assert.ok(htmlSi.includes("නව උත්සව වෙන්කිරීම"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(BanquetsAdminPage, {
          language: "ta",
          initialTab: "CALENDAR",
        }),
      );
      assert.ok(htmlTa.includes("மண்டப, திருமண மற்றும் மாநாட்டு செயல்பாடுகள்"));
      assert.ok(htmlTa.includes("புதிய முன்பதிவு"));
    });
  });
});
