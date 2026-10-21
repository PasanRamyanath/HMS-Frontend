import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CommandCategory,
  type CommandItem,
  CommandPalette,
  type CommandPaletteProps,
  DEFAULT_COMMAND_ITEMS,
  filterCommandItems,
  getCategoryBadgeClass,
  getCategoryLabel,
  groupCommandItemsByCategory,
} from "../src/components/CommandPalette.js";

describe("Step 465: Global Keyboard Command Palette (CommandPalette.tsx)", () => {
  describe("1. Default Hospitality Command Catalog Integrity", () => {
    it("contains at least 15 default commands across Sri Lankan hospitality operations", () => {
      assert.ok(DEFAULT_COMMAND_ITEMS.length >= 15);
    });

    it("includes rooms, reservations, orders, folios, admin modules, and actions", () => {
      const categories = new Set(DEFAULT_COMMAND_ITEMS.map((item) => item.category));
      assert.strictEqual(categories.has("rooms"), true);
      assert.strictEqual(categories.has("reservations"), true);
      assert.strictEqual(categories.has("orders"), true);
      assert.strictEqual(categories.has("folios"), true);
      assert.strictEqual(categories.has("admin"), true);
      assert.strictEqual(categories.has("actions"), true);
    });

    it("verifies Presidential Pool Villa Room 104 and Order #1021 exist in catalog", () => {
      const room104 = DEFAULT_COMMAND_ITEMS.find((item) => item.id === "room-104");
      assert.ok(room104 !== undefined);
      assert.ok(room104?.title.includes("Room 104"));
      assert.strictEqual(room104?.badge, "OCCUPIED");

      const order1021 = DEFAULT_COMMAND_ITEMS.find((item) => item.id === "order-1021");
      assert.ok(order1021 !== undefined);
      assert.ok(order1021?.title.includes("Order #1021"));
      assert.ok(order1021?.subtitle?.includes("Seafood Kottu"));
    });

    it("verifies Sri Lankan 4-stage compounding statutory taxes are noted in Folio #FL-402", () => {
      const folio402 = DEFAULT_COMMAND_ITEMS.find((item) => item.id === "folio-402");
      assert.ok(folio402 !== undefined);
      assert.ok(folio402?.subtitle?.includes("10% SC"));
      assert.ok(folio402?.subtitle?.includes("1% TDL"));
      assert.ok(folio402?.subtitle?.includes("2.56% SSCL"));
      assert.ok(folio402?.subtitle?.includes("18% VAT"));
      assert.ok(folio402?.badge?.includes("LKR"));
    });
  });

  describe("2. Pure Category Resolution & Badge Styling", () => {
    it("resolves human-readable labels for all command categories", () => {
      assert.strictEqual(getCategoryLabel("rooms"), "Rooms & Suites");
      assert.strictEqual(getCategoryLabel("reservations"), "Reservations");
      assert.strictEqual(getCategoryLabel("orders"), "Active Orders & KDS");
      assert.strictEqual(getCategoryLabel("folios"), "Folios & Billing");
      assert.strictEqual(getCategoryLabel("admin"), "Modules & Settings");
      assert.strictEqual(getCategoryLabel("actions"), "Quick Actions");
      assert.strictEqual(getCategoryLabel("unknown" as CommandCategory), "Other");
    });

    it("resolves distinct Apple HIG color badges for categories", () => {
      assert.ok(getCategoryBadgeClass("rooms").includes("text-blue-600"));
      assert.ok(getCategoryBadgeClass("reservations").includes("text-purple-600"));
      assert.ok(getCategoryBadgeClass("orders").includes("text-amber-600"));
      assert.ok(getCategoryBadgeClass("folios").includes("text-emerald-600"));
      assert.ok(getCategoryBadgeClass("admin").includes("text-indigo-600"));
      assert.ok(getCategoryBadgeClass("actions").includes("text-orange-600"));
      assert.ok(getCategoryBadgeClass("other" as CommandCategory).includes("text-slate-600"));
    });
  });

  describe("3. Fast Substring Filtering & Categorization Engine", () => {
    it("returns all items when search query is empty or whitespace", () => {
      assert.deepStrictEqual(filterCommandItems(DEFAULT_COMMAND_ITEMS, ""), DEFAULT_COMMAND_ITEMS);
      assert.deepStrictEqual(
        filterCommandItems(DEFAULT_COMMAND_ITEMS, "   "),
        DEFAULT_COMMAND_ITEMS,
      );
    });

    it("filters items by room number matching title, keywords, or subtitle", () => {
      const results = filterCommandItems(DEFAULT_COMMAND_ITEMS, "104");
      assert.ok(results.length >= 2);
      assert.strictEqual(
        results.some((r) => r.id === "room-104"),
        true,
      );
      assert.strictEqual(
        results.some((r) => r.id === "order-1021"),
        true,
      );
    });

    it("filters items by dish keyword (e.g. kottu)", () => {
      const results = filterCommandItems(DEFAULT_COMMAND_ITEMS, "kottu");
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0]?.id, "order-1021");
    });

    it("supports multi-term intersection queries (e.g. 'room pool')", () => {
      const results = filterCommandItems(DEFAULT_COMMAND_ITEMS, "room pool");
      assert.strictEqual(
        results.some((r) => r.id === "room-104"),
        true,
      );
    });

    it("matches category name directly (e.g. 'reservations')", () => {
      const results = filterCommandItems(DEFAULT_COMMAND_ITEMS, "reservations");
      assert.ok(results.length >= 2);
      assert.strictEqual(
        results.every((r) => r.category === "reservations"),
        true,
      );
    });

    it("returns empty array when query does not match any items", () => {
      const results = filterCommandItems(DEFAULT_COMMAND_ITEMS, "xyz-unmatched-item-9999");
      assert.strictEqual(results.length, 0);
    });

    it("groups command items accurately into category buckets", () => {
      const grouped = groupCommandItemsByCategory(DEFAULT_COMMAND_ITEMS);
      assert.ok(grouped.rooms.length > 0);
      assert.ok(grouped.reservations.length > 0);
      assert.ok(grouped.orders.length > 0);
      assert.ok(grouped.folios.length > 0);
      assert.ok(grouped.admin.length > 0);
      assert.ok(grouped.actions.length > 0);
    });
  });

  describe("4. React 19 Static Markup & Apple HIG Design Compliance", () => {
    it("renders CommandPalette in open state with input, items, and Apple HIG classes", () => {
      const html = renderToStaticMarkup(
        React.createElement(CommandPalette, {
          isOpen: true,
          onClose: () => {
            /* test close handler */
          },
        }),
      );

      // Liquid glass surface styling
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("rounded-2xl"));

      // Accessibility attributes and dialog semantics
      assert.ok(html.includes("<dialog"));
      assert.ok(html.includes("<input"));
      assert.ok(html.includes('aria-label="Spotlight Command Palette"'));

      // Key entities
      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Seafood Kottu"));
      assert.ok(html.includes("LankaQR"));

      // Touch target >= 44x44pt
      assert.ok(html.includes("min-h-[44px]"));

      // Tabular numerals for LKR amounts and counts
      assert.ok(html.includes("tabular-nums-lkr"));

      // Keyboard navigation hints
      assert.ok(html.includes("Navigate"));
      assert.ok(html.includes("Select"));
      assert.ok(html.includes("Close"));
    });

    it("renders custom placeholder when supplied", () => {
      const customPlaceholder = "Type a guest name, room number, or folio...";
      const html = renderToStaticMarkup(
        React.createElement(CommandPalette, {
          isOpen: true,
          onClose: () => {
            /* test close handler */
          },
          placeholder: customPlaceholder,
        }),
      );

      assert.ok(html.includes(customPlaceholder));
    });

    it("renders empty state notice when custom filtered items are empty", () => {
      const emptyItems: CommandItem[] = [];
      const html = renderToStaticMarkup(
        React.createElement(CommandPalette, {
          isOpen: true,
          onClose: () => {
            /* test close handler */
          },
          items: emptyItems,
        }),
      );

      assert.ok(html.includes("No matching hotel entities or commands"));
      assert.ok(html.includes("Try searching for room number"));
    });

    it("renders custom command items when provided via props", () => {
      const customItems: CommandItem[] = [
        {
          id: "custom-1",
          title: "Custom Spa Booking — Ayurvedic Herbal Wrap",
          subtitle: "Guest: Anura Wickramasinghe · 60 min",
          category: "actions",
          badge: "CONFIRMED",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(CommandPalette, {
          isOpen: true,
          onClose: () => {
            /* test close handler */
          },
          items: customItems,
        }),
      );

      assert.ok(html.includes("Custom Spa Booking"));
      assert.ok(html.includes("Ayurvedic Herbal Wrap"));
      assert.ok(html.includes("CONFIRMED"));
    });

    it("verifies CommandPaletteProps contract is fully constructible", () => {
      const props: CommandPaletteProps = {
        isOpen: true,
        onClose: () => {
          /* test */
        },
        enableGlobalShortcut: true,
        placeholder: "Search...",
      };
      assert.strictEqual(props.isOpen, true);
      assert.strictEqual(props.enableGlobalShortcut, true);
    });
  });
});
