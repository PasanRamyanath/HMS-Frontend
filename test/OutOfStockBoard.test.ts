import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AutoRestoreDuration,
  DEFAULT_OUT_OF_STOCK_ITEMS,
  type KitchenStationName,
  OutOfStockBoard,
  type OutOfStockBoardProps,
  type OutOfStockBoardStats,
  type OutOfStockFilterOptions,
  type OutOfStockItem,
  OutOfStockItemRow,
  type OutOfStockItemRowProps,
  OutOfStockStatsBento,
  type OutOfStockStatsBentoProps,
  PRESET_86_REASONS,
  Quick86Modal,
  type Quick86ModalProps,
  STANDARD_KITCHEN_STATIONS,
  calculateOutOfStockStats,
  computeAutoRestoreTimestamp,
  filterOutOfStockItems,
  formatTimeRemaining,
  matchesOutOfStockQuery,
  resolveItemTitle,
} from "../src/admin/menus/OutOfStockBoard.js";
import { Department } from "../src/generated/graphql.js";

describe("Step 247: Out-of-Stock ('86'd Items') Quick Board (OutOfStockBoard.tsx)", () => {
  describe("1. Default Sri Lankan Resort 86'd Catalog Presets", () => {
    it("contains 6 standard out-of-stock items across kitchen and bar stations", () => {
      assert.strictEqual(DEFAULT_OUT_OF_STOCK_ITEMS.length, 6);
      const codes = DEFAULT_OUT_OF_STOCK_ITEMS.map((i) => i.code);
      assert.ok(codes.includes("CUR-204"));
      assert.ok(codes.includes("CUR-105"));
      assert.ok(codes.includes("GRL-102"));
      assert.ok(codes.includes("BAR-108"));
      assert.ok(codes.includes("PAS-104"));
      assert.ok(codes.includes("BAR-101"));
    });

    it("verifies Lagoon Prawn Curry and Seer Fish Steak are off-menu due to fresh catch delays", () => {
      const prawn = DEFAULT_OUT_OF_STOCK_ITEMS.find((i) => i.code === "CUR-204");
      assert.ok(prawn);
      assert.strictEqual(prawn.kitchenStation, "Curry Station");
      assert.strictEqual(prawn.priceLkr, 4800);
      assert.ok(prawn.reason?.includes("Lagoon prawn catch"));

      const fish = DEFAULT_OUT_OF_STOCK_ITEMS.find((i) => i.code === "GRL-102");
      assert.ok(fish);
      assert.strictEqual(fish.kitchenStation, "Grill");
      assert.strictEqual(fish.priceLkr, 4200);
    });

    it("verifies standard kitchen station tabs and preset reasons exist", () => {
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("All Stations"));
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("Curry Station"));
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("Grill"));
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("Bar BOT"));
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("Pastry"));
      assert.ok(STANDARD_KITCHEN_STATIONS.includes("Hot Wok"));

      assert.ok(PRESET_86_REASONS.length >= 5);
      assert.ok(PRESET_86_REASONS.some((r) => r.includes("ingredients")));
    });
  });

  describe("2. Pure Title Resolution & Trilingual Matching", () => {
    const sampleItem: OutOfStockItem = {
      id: "test-01",
      code: "CUR-204",
      title: {
        en: "Jumbo Lagoon Prawn Curry",
        si: "ගමේ ක්රමයට ඉදුණු කලපු ඉස්සන් ව්යංජනය",
        ta: "ஜம்போ இறால் கறி",
      },
      categoryName: "Rice & Curries",
      department: Department.Kitchen,
      kitchenStation: "Curry Station",
      priceLkr: 4800,
      isAvailable: false,
      reason: "Lagoon prawn catch delayed by Negombo fishermen",
    };

    it("resolves English title when active language is en", () => {
      assert.strictEqual(resolveItemTitle(sampleItem.title, "en"), "Jumbo Lagoon Prawn Curry");
    });

    it("resolves Sinhala title when active language is si", () => {
      assert.strictEqual(resolveItemTitle(sampleItem.title, "si"), "ගමේ ක්රමයට ඉදුණු කලපු ඉස්සන් ව්යංජනය");
    });

    it("resolves Tamil title when active language is ta", () => {
      assert.strictEqual(resolveItemTitle(sampleItem.title, "ta"), "ஜம்போ இறால் கறி");
    });

    it("falls back to English when language is not provided or translation is empty", () => {
      const fallbackTitle = { en: "English Only", si: "   ", ta: "" };
      assert.strictEqual(resolveItemTitle(fallbackTitle, "si"), "English Only");
    });

    it("matches query on dish code", () => {
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "CUR-204"), true);
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "cur-204"), true);
    });

    it("matches query on English, Sinhala, and Tamil strings", () => {
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "prawn"), true);
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "කලපු"), true);
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "இறால்"), true);
    });

    it("matches query on station and reason text", () => {
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "Curry Station"), true);
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "Negombo"), true);
    });

    it("returns false for non-matching queries", () => {
      assert.strictEqual(matchesOutOfStockQuery(sampleItem, "Watalappan"), false);
    });
  });

  describe("3. Auto-Stock Restoration Timestamp & Time Remaining Math", () => {
    it("computes 30m, 1h, 2h, and 4h auto-restore timestamps relative to base date", () => {
      const base = new Date("2026-10-19T10:00:00.000Z");
      const t30m = computeAutoRestoreTimestamp("30m", base);
      assert.strictEqual(t30m, "2026-10-19T10:30:00.000Z");

      const t1h = computeAutoRestoreTimestamp("1h", base);
      assert.strictEqual(t1h, "2026-10-19T11:00:00.000Z");

      const t2h = computeAutoRestoreTimestamp("2h", base);
      assert.strictEqual(t2h, "2026-10-19T12:00:00.000Z");

      const t4h = computeAutoRestoreTimestamp("4h", base);
      assert.strictEqual(t4h, "2026-10-19T14:00:00.000Z");
    });

    it("computes next_shift timestamp as 06:00 AM next day", () => {
      const base = new Date("2026-10-19T18:00:00.000Z");
      const nextShift = computeAutoRestoreTimestamp("next_shift", base);
      assert.ok(nextShift);
      const nextDate = new Date(nextShift);
      assert.strictEqual(nextDate.getHours(), 6);
      assert.strictEqual(nextDate.getMinutes(), 0);
    });

    it("returns null for indefinite / manual auto restore duration", () => {
      assert.strictEqual(computeAutoRestoreTimestamp("indefinite"), null);
    });

    it("formats human-readable time remaining for future target timestamps", () => {
      const now = new Date("2026-10-19T10:00:00.000Z").getTime();
      const in45m = "2026-10-19T10:45:00.000Z";
      assert.strictEqual(formatTimeRemaining(in45m, now), "Restores in 45m");

      const in2h15m = "2026-10-19T12:15:00.000Z";
      assert.strictEqual(formatTimeRemaining(in2h15m, now), "Restores in 2h 15m");
    });

    it("formats expired or past timestamp as 'Due for auto-restore'", () => {
      const now = new Date("2026-10-19T12:00:00.000Z").getTime();
      const past = "2026-10-19T11:30:00.000Z";
      assert.strictEqual(formatTimeRemaining(past, now), "Due for auto-restore");
    });

    it("returns 'Manual restore only' when autoRestoreAt is null or undefined", () => {
      assert.strictEqual(formatTimeRemaining(null), "Manual restore only");
      assert.strictEqual(formatTimeRemaining(undefined), "Manual restore only");
    });
  });

  describe("4. Pure Out-of-Stock Statistics & Filtering Engine", () => {
    it("calculates accurate summary stats across items", () => {
      const now = new Date("2026-10-19T16:00:00.000Z").getTime();
      const stats = calculateOutOfStockStats(DEFAULT_OUT_OF_STOCK_ITEMS, now);

      assert.strictEqual(stats.totalDisabled, 6);
      assert.strictEqual(stats.kitchenCount, 4);
      assert.strictEqual(stats.barCount, 2);
      assert.strictEqual(stats.housekeepingCount, 0);
      assert.strictEqual(stats.autoRestoringCount, 5);
      assert.ok(stats.earliestAutoRestore !== null);
      assert.strictEqual(stats.earliestAutoRestore?.code, "PAS-104");
    });

    it("filters items by station accurately", () => {
      const curryItems = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        station: "Curry Station",
      });
      assert.strictEqual(curryItems.length, 2);
      assert.ok(curryItems.every((i) => i.kitchenStation === "Curry Station"));

      const barItems = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        station: "Bar BOT",
      });
      assert.strictEqual(barItems.length, 2);
    });

    it("filters items by department accurately", () => {
      const barDeptItems = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        department: "BAR",
      });
      assert.strictEqual(barDeptItems.length, 2);

      const kitchenDeptItems = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        department: "KITCHEN",
      });
      assert.strictEqual(kitchenDeptItems.length, 4);
    });

    it("filters only auto-restoring items", () => {
      const timerOnly = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        onlyAutoRestoring: true,
      });
      assert.strictEqual(timerOnly.length, 5);
      assert.ok(timerOnly.every((i) => Boolean(i.autoRestoreAt)));
    });

    it("filters by text search across query string", () => {
      const searchResults = filterOutOfStockItems(DEFAULT_OUT_OF_STOCK_ITEMS, {
        searchQuery: "Arrack",
      });
      assert.strictEqual(searchResults.length, 1);
      assert.strictEqual(searchResults[0]?.code, "BAR-108");
    });
  });

  describe("5. React UI Components & Apple HIG Rendering", () => {
    it("renders OutOfStockStatsBento with department filter buttons and counters", () => {
      const stats: OutOfStockBoardStats = {
        totalDisabled: 6,
        kitchenCount: 4,
        barCount: 2,
        housekeepingCount: 0,
        autoRestoringCount: 5,
        earliestAutoRestore: {
          itemId: "oos-01",
          code: "PAS-104",
          timeRemaining: "Restores in 45m",
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(OutOfStockStatsBento, {
          stats,
          activeDepartment: "ALL",
          onSelectDepartment: () => undefined,
        }),
      );

      assert.ok(html.includes("Total 86&#x27;d Items") || html.includes("Total 86'd Items"));
      assert.ok(html.includes("Kitchen Dishes"));
      assert.ok(html.includes("Bar &amp; Drinks") || html.includes("Bar & Drinks"));
      assert.ok(html.includes("Auto-Restoring"));
      assert.ok(html.includes("PAS-104"));
      assert.ok(html.includes("Restores in 45m"));
    });

    it("renders OutOfStockItemRow with 86'd badge, trilingual titles, and 1-tap Restore button", () => {
      const item = DEFAULT_OUT_OF_STOCK_ITEMS[0];
      assert.ok(item);

      const html = renderToStaticMarkup(
        React.createElement(OutOfStockItemRow, {
          item,
          currentLanguage: "en",
          onRestore: () => undefined,
          onUpdateTimer: () => undefined,
        }),
      );

      assert.ok(html.includes("CUR-204"));
      assert.ok(html.includes("Jumbo Lagoon Prawn Curry"));
      assert.ok(html.includes("Curry Station"));
      assert.ok(html.includes("Restore to Stock"));
      assert.ok(html.includes("Lagoon prawn catch delayed"));
      assert.ok(html.includes("LKR"));
    });

    it("renders Quick86Modal when open with reason presets and duration options", () => {
      const html = renderToStaticMarkup(
        React.createElement(Quick86Modal, {
          isOpen: true,
          availableItems: DEFAULT_OUT_OF_STOCK_ITEMS,
          currentLanguage: "en",
          onClose: () => undefined,
          onSubmit86: () => undefined,
        }),
      );

      assert.ok(html.includes("Mark Item Out-of-Stock"));
      assert.ok(html.includes("Reason for 86"));
      assert.ok(html.includes("Auto-Restoration Timer"));
      assert.ok(html.includes("Confirm 86 (Disable Item)"));
      assert.ok(html.includes("30 Mins"));
      assert.ok(html.includes("Next Shift"));
    });

    it("renders Quick86Modal as null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(Quick86Modal, {
          isOpen: false,
          availableItems: [],
          currentLanguage: "en",
          onClose: () => undefined,
          onSubmit86: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders complete OutOfStockBoard workspace with stations and search input", () => {
      const html = renderToStaticMarkup(
        React.createElement(OutOfStockBoard, {
          items: DEFAULT_OUT_OF_STOCK_ITEMS,
        }),
      );

      assert.ok(
        html.includes("Out-of-Stock (&#x27;86&#x27;d Items&#x27;) Board") ||
          html.includes("Out-of-Stock ('86'd Items') Board"),
      );
      assert.ok(html.includes("Quick 86 Dish"));
      assert.ok(html.includes("Curry Station"));
      assert.ok(html.includes("Bar BOT"));
      assert.ok(html.includes("Grill"));
      assert.ok(html.includes("Search dish, code, or Sinhala/Tamil..."));
    });

    it("renders empty state when all items are in stock", () => {
      const html = renderToStaticMarkup(
        React.createElement(OutOfStockBoard, {
          items: [],
        }),
      );

      assert.ok(html.includes("No 86&#x27;d Items") || html.includes("No 86'd Items"));
      assert.ok(html.includes("All dishes and beverages in this station are in stock"));
    });

    it("verifies type-level compliance with exported interfaces and types", () => {
      const station: KitchenStationName = "Curry Station";
      const duration: AutoRestoreDuration = "2h";
      const filterOpts: OutOfStockFilterOptions = {
        station,
        searchQuery: "CUR",
        department: "KITCHEN",
        onlyAutoRestoring: true,
      };
      const boardProps: OutOfStockBoardProps = {
        items: DEFAULT_OUT_OF_STOCK_ITEMS,
        onRestoreToStock: () => undefined,
      };
      const bentoProps: OutOfStockStatsBentoProps = {
        stats: {
          totalDisabled: 1,
          kitchenCount: 1,
          barCount: 0,
          housekeepingCount: 0,
          autoRestoringCount: 1,
          earliestAutoRestore: null,
        },
        activeDepartment: "ALL",
        onSelectDepartment: () => undefined,
      };
      const rowProps: OutOfStockItemRowProps = {
        item: DEFAULT_OUT_OF_STOCK_ITEMS[0] as OutOfStockItem,
        currentLanguage: "en",
        onRestore: () => undefined,
      };
      const modalProps: Quick86ModalProps = {
        isOpen: false,
        availableItems: [],
        currentLanguage: "en",
        onClose: () => undefined,
        onSubmit86: () => undefined,
      };

      assert.ok(
        station && duration && filterOpts && boardProps && bentoProps && rowProps && modalProps,
      );
    });
  });
});
