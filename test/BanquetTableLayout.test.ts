import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetTableLayout,
  DEFAULT_BANQUET_LAYOUT_CONFIG,
  DEFAULT_HALL_ZONES,
  type HallLayoutConfig,
  compileAlphabeticalGuestDirectory,
  computeLayoutSummary,
  generateDefault30Tables,
  getCategoryBadgeColor,
} from "../src/admin/banquets/BanquetTableLayout.js";

describe("Step 343: BanquetTableLayout — Banquet Hall Floor Plan & Table Numbering Designer", () => {
  describe("1. Table Grid Generation & Functional Zone Integrity", () => {
    it("generates exactly 30 numbered tables with appropriate wedding categories", () => {
      const tables = generateDefault30Tables();

      assert.strictEqual(tables.length, 30);
      assert.strictEqual(tables[0]?.tableNumber, 1);
      assert.strictEqual(tables[29]?.tableNumber, 30);

      // Verify category allocation
      assert.strictEqual(tables[0]?.category, "GROOM_FAMILY"); // Table 1
      assert.strictEqual(tables[5]?.category, "GROOM_FAMILY"); // Table 6
      assert.strictEqual(tables[6]?.category, "BRIDE_FAMILY"); // Table 7
      assert.strictEqual(tables[11]?.category, "BRIDE_FAMILY"); // Table 12
      assert.strictEqual(tables[12]?.category, "VIP"); // Table 13
      assert.strictEqual(tables[15]?.category, "VIP"); // Table 16
      assert.strictEqual(tables[16]?.category, "FRIENDS"); // Table 17
      assert.strictEqual(tables[24]?.category, "CORPORATE"); // Table 25
      assert.strictEqual(tables[29]?.category, "CORPORATE"); // Table 30
    });

    it("includes all required functional hall zones (Poruwa, Head Table, Dance Floor, Buffet, Bar, Oil Lamp)", () => {
      const zoneIds = DEFAULT_HALL_ZONES.map((z) => z.id);

      assert.ok(zoneIds.includes("ZONE-PORUWA"));
      assert.ok(zoneIds.includes("ZONE-HEAD-TABLE"));
      assert.ok(zoneIds.includes("ZONE-DANCE-FLOOR"));
      assert.ok(zoneIds.includes("ZONE-BUFFET-LEFT"));
      assert.ok(zoneIds.includes("ZONE-BUFFET-RIGHT"));
      assert.ok(zoneIds.includes("ZONE-BAR"));
      assert.ok(zoneIds.includes("ZONE-OIL-LAMP"));
    });
  });

  describe("2. Pure Calculation Helpers & Statistics", () => {
    it("computes accurate seating occupancy statistics across 30 tables", () => {
      const tables = generateDefault30Tables();
      const stats = computeLayoutSummary(tables);

      assert.strictEqual(stats.totalTablesCount, 30);
      // 30 tables * 10 seats each = 300 capacity
      assert.strictEqual(stats.totalSeatingCapacity, 300);

      // Total assigned guests (alternating 8 and 10 per table)
      // 15 tables with 8 = 120, 15 tables with 10 = 150 -> 270 guests
      assert.strictEqual(stats.totalAssignedGuestsCount, 270);
      assert.strictEqual(stats.totalVacantSeatsCount, 30);
      assert.strictEqual(stats.occupancyPercentage, 90);
    });

    it("safely handles empty tables array", () => {
      const stats = computeLayoutSummary([]);
      assert.strictEqual(stats.totalTablesCount, 0);
      assert.strictEqual(stats.totalSeatingCapacity, 0);
      assert.strictEqual(stats.totalAssignedGuestsCount, 0);
      assert.strictEqual(stats.totalVacantSeatsCount, 0);
      assert.strictEqual(stats.occupancyPercentage, 0);
    });

    it("compiles and sorts guest directory alphabetically", () => {
      const tables = generateDefault30Tables();
      const directory = compileAlphabeticalGuestDirectory(tables);

      assert.strictEqual(directory.length, 270);
      // Ensure alphabetical order
      for (let i = 0; i < directory.length - 1; i++) {
        const current = directory[i];
        const next = directory[i + 1];
        if (current && next) {
          assert.ok(
            current.guestName.localeCompare(next.guestName) <= 0,
            `Directory not in alphabetical order at index ${i}`,
          );
        }
      }
    });

    it("resolves valid Apple HIG category badge colors", () => {
      const groomColor = getCategoryBadgeColor("GROOM_FAMILY");
      assert.strictEqual(groomColor.fill, "#3b82f6");

      const brideColor = getCategoryBadgeColor("BRIDE_FAMILY");
      assert.strictEqual(brideColor.fill, "#f43f5e");

      const vipColor = getCategoryBadgeColor("VIP");
      assert.strictEqual(vipColor.fill, "#f59e0b");

      const corporateColor = getCategoryBadgeColor("CORPORATE");
      assert.strictEqual(corporateColor.fill, "#a855f7");

      const friendsColor = getCategoryBadgeColor("FRIENDS");
      assert.strictEqual(friendsColor.fill, "#10b981");
    });
  });

  describe("3. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("renders floor plan canvas with SVG elements, Poruwa, and Table 1 through 30", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetTableLayout, {
          config: DEFAULT_BANQUET_LAYOUT_CONFIG,
        }),
      );

      // Verify title & hall name
      assert.match(html, /Banquet Hall Floor Plan &amp; Seating Matrix/);
      assert.match(html, /The Grand Sapphire Ballroom/);

      // Verify stats
      assert.match(html, /300 seats/);
      assert.match(html, /90%/);

      // Verify SVG canvas and functional zones
      assert.match(html, /<svg/);
      assert.match(html, /Poruwa Ceremony Stage/);
      assert.match(html, /Bridal Head Table/);
      assert.match(html, /Dance Floor &amp; DJ Band/);
      assert.match(html, /Buffet Line 1/);
      assert.match(html, /Beverage &amp; Corkage Bar/);

      // Verify table elements in SVG
      assert.match(html, /Table 1/);
      assert.match(html, /Table 30/);

      // Verify default selected table detail card
      assert.match(html, /Table Inspection &amp; Guest List/);

      // Verify printable entrance seating board
      assert.match(html, /Alphabetical Guest Seating Index/);
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(BanquetTableLayout, {
          config: DEFAULT_BANQUET_LAYOUT_CONFIG,
          language: "si",
        }),
      );
      assert.match(htmlSi, /උත්සව ශාලා සැකැස්ම සහ මේස සැලසුම් පුවරුව/);
      assert.match(htmlSi, /ප්රවේශ ආසන පුවරුව මුද්රණය/);

      const htmlTa = renderToStaticMarkup(
        React.createElement(BanquetTableLayout, {
          config: DEFAULT_BANQUET_LAYOUT_CONFIG,
          language: "ta",
        }),
      );
      assert.match(htmlTa, /விருந்து மண்டப தரைத்தளம் &amp; மேசை திட்டம்/);
      assert.match(htmlTa, /நுழைவு இருக்கை பலகையை அச்சிடுக/);
    });

    it("handles minimal layout configuration without crashing", () => {
      const minimalConfig: HallLayoutConfig = {
        hallName: "Lotus Hall",
        eventName: "Annual Gathering",
        eventDate: "2026-12-31",
        totalPaxTarget: 50,
        tables: [],
        zones: [],
      };

      const html = renderToStaticMarkup(
        React.createElement(BanquetTableLayout, {
          config: minimalConfig,
        }),
      );

      assert.match(html, /Lotus Hall/);
      assert.match(html, /0 seats/);
    });
  });
});
