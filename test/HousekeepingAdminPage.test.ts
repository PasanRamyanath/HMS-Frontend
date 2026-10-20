import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HOUSEKEEPING_SEGMENTED_OPTIONS,
  HOUSEKEEPING_TABS,
  HousekeepingAdminPage,
  calculateHkOverviewMetrics,
  getHkAdminPageText,
} from "../src/admin/housekeeping/HousekeepingAdminPage.js";

const noop = () => undefined;

describe("Step 323: Master Housekeeping & Engineering Admin Page (HousekeepingAdminPage.tsx)", () => {
  describe("1. Pure Metric Calculations & Defaults", () => {
    it("returns default housekeeping overview metrics accurately", () => {
      const metrics = calculateHkOverviewMetrics();
      assert.equal(metrics.totalRooms, 48);
      assert.equal(metrics.cleanRooms, 31);
      assert.equal(metrics.dirtyRooms, 12);
      assert.equal(metrics.inProgressRooms, 5);
      assert.equal(metrics.openMaintenanceCount, 4);
      assert.equal(metrics.urgentMaintenanceCount, 1);
      assert.equal(metrics.activeLaundryJobs, 6);
      assert.equal(metrics.activeDiscrepancies, 3);
      assert.equal(metrics.generatorHoursToday, 2.4);
    });

    it("allows selective metric overrides", () => {
      const custom = calculateHkOverviewMetrics({
        cleanRooms: 40,
        dirtyRooms: 8,
        urgentMaintenanceCount: 0,
      });

      assert.equal(custom.cleanRooms, 40);
      assert.equal(custom.dirtyRooms, 8);
      assert.equal(custom.urgentMaintenanceCount, 0);
      assert.equal(custom.totalRooms, 48);
    });
  });

  describe("2. Tab Definitions & Navigation Options", () => {
    it("defines all 10 core housekeeping & engineering operational tabs", () => {
      assert.equal(HOUSEKEEPING_TABS.length, 10);

      const tabIds = HOUSEKEEPING_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, [
        "ASSIGNMENTS",
        "FLOOR_SHEET",
        "LAUNDRY",
        "LINEN",
        "MAINTENANCE",
        "LOST_FOUND",
        "UTILITIES",
        "DEEP_CLEAN",
        "AMENITIES",
        "PRODUCTIVITY",
      ]);
    });

    it("maps tabs correctly to segmented control options with icons and badges", () => {
      assert.equal(HOUSEKEEPING_SEGMENTED_OPTIONS.length, 10);
      const printOption = HOUSEKEEPING_SEGMENTED_OPTIONS.find((o) => o.id === "FLOOR_SHEET");
      assert.ok(printOption);
      assert.equal(printOption?.label, "Floor Sheet");
      assert.equal(printOption?.badge, "Print");

      const lostFoundOption = HOUSEKEEPING_SEGMENTED_OPTIONS.find((o) => o.id === "LOST_FOUND");
      assert.ok(lostFoundOption);
      assert.equal(lostFoundOption?.label, "Lost & Found");
      assert.equal(lostFoundOption?.badge, "Statutory");
    });
  });

  describe("3. Multi-Language Translations", () => {
    it("returns English translations by default", () => {
      const en = getHkAdminPageText("en");
      assert.equal(en.title, "Housekeeping & Facilities Engineering");
      assert.equal(en.quickPrint, "Print Floor Sheet");
      assert.ok(en.defaultHotel.includes("Galle Face Heritage Hotel"));
    });

    it("returns Sinhala translations accurately", () => {
      const si = getHkAdminPageText("si");
      assert.equal(si.title, "කාමර පිරිසිදු කිරීම සහ ඉංජිනේරු අංශය");
      assert.equal(si.quickPrint, "ලේඛනය මුද්‍රණය");
    });

    it("returns Tamil translations accurately", () => {
      const ta = getHkAdminPageText("ta");
      assert.equal(ta.title, "தூய்மைப்பணி & பொறியியல் நிர்வாகம்");
      assert.equal(ta.quickPrint, "தாளை அச்சிடுக");
    });
  });

  describe("4. Static UI Markup & Component Integration", () => {
    it("renders master housekeeping admin page with default tab (ASSIGNMENTS)", () => {
      const html = renderToStaticMarkup(
        React.createElement(HousekeepingAdminPage, {
          propertyTitle: "Mirissa Bay Luxury Ocean Villas",
          initialTab: "ASSIGNMENTS",
          language: "en",
          onTabChange: noop,
        }),
      );

      // Verify header & property title
      assert.ok(html.includes("Housekeeping &amp; Facilities Engineering"));
      assert.ok(html.includes("Mirissa Bay Luxury Ocean Villas"));

      // Verify quick print button
      assert.ok(html.includes("Print Floor Sheet"));

      // Verify persistent discrepancy alert banner is rendered
      assert.ok(html.includes("Discrepancies"));

      // Verify overview stats ribbon
      assert.ok(html.includes("Inspected &amp; Clean"));
      assert.ok(html.includes("Dirty / Turnover"));
      assert.ok(html.includes("Maintenance Tickets"));
      assert.ok(html.includes("Active Laundry"));
      assert.ok(html.includes("Generator Today"));

      // Verify active tab content is Assignment Board
      assert.ok(html.includes("Assignment"));
    });

    it("renders printable floor sheet tab when initialTab is FLOOR_SHEET", () => {
      const html = renderToStaticMarkup(
        React.createElement(HousekeepingAdminPage, {
          initialTab: "FLOOR_SHEET",
          language: "en",
        }),
      );

      assert.ok(html.includes("Daily Housekeeping Floor Sheet"));
      assert.ok(html.includes("Workload Credits"));
    });

    it("renders maintenance tab when initialTab is MAINTENANCE", () => {
      const html = renderToStaticMarkup(
        React.createElement(HousekeepingAdminPage, {
          initialTab: "MAINTENANCE",
          language: "en",
        }),
      );

      assert.ok(html.includes("Maintenance"));
    });
  });
});
