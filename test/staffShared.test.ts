/**
 * Unit Tests for Step 300: Staff Shared Helpers & Apple HIG Status Badges (staffShared.test.ts)
 *
 * Verifies that KDS, POS, and Runner share status badges and thermal print
 * utilities without code duplication, ensuring Apple HIG and 80mm ESC/POS compliance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DestinationBadge,
  DietaryBadge,
  MealPlanBadge,
  SlaBadge,
  THERMAL_80MM_COLUMN_WIDTH,
  THERMAL_80MM_PRINT_STYLES,
  TicketDepartmentBadge,
  centerReceiptText,
  formatThermalCurrency,
  formatThermalTimestamp,
  generateReceiptDivider,
  getDestinationBadgeStyle,
  getDietaryBadgeStyle,
  getMealPlanBadgeStyle,
  getSlaBadgeStyle,
  getTicketDepartmentStyle,
  padReceiptLine,
  triggerThermalPrint,
} from "../src/staff/shared/index.js";

describe("Step 300: Phase 12 Staff Shared Helpers & Badges (staffShared.test.ts)", () => {
  // --------------------------------------------------------------------------
  // 1. Thermal Printing Formatting Utilities
  // --------------------------------------------------------------------------
  describe("1. Thermal Print Monospace & Formatting Helpers", () => {
    it("formatThermalTimestamp formats ISO strings and dates to standard receipt format", () => {
      const formatted = formatThermalTimestamp("2026-10-20T14:32:05.000Z");
      assert.strictEqual(formatted, "2026-10-20 14:32:05");

      const dateObj = new Date("2026-10-20T08:15:30.000Z");
      assert.strictEqual(formatThermalTimestamp(dateObj), "2026-10-20 08:15:30");

      // Falls back to current timestamp if undefined
      const fallback = formatThermalTimestamp(undefined);
      assert.strictEqual(fallback.length, 19);
      assert.ok(fallback.includes("-") && fallback.includes(":"));

      // Returns invalid string gracefully
      assert.strictEqual(formatThermalTimestamp("not-a-valid-date"), "not-a-valid-date");
    });

    it("formatThermalCurrency formats LKR currency with integer-cent rounding", () => {
      assert.strictEqual(formatThermalCurrency(15450.5), "15,450.50");
      assert.strictEqual(formatThermalCurrency(0), "0.00");
      assert.strictEqual(formatThermalCurrency(1200), "1,200.00");
      assert.strictEqual(formatThermalCurrency(Number.NaN), "0.00");
    });

    it("generateReceiptDivider creates horizontal ASCII dividers", () => {
      const divider = generateReceiptDivider("-", 48);
      assert.strictEqual(divider.length, 48);
      assert.strictEqual(divider, "-".repeat(48));

      const doubleDivider = generateReceiptDivider("=", 32);
      assert.strictEqual(doubleDivider.length, 32);
      assert.strictEqual(doubleDivider, "=".repeat(32));

      // Defaults to 48 columns
      assert.strictEqual(generateReceiptDivider().length, THERMAL_80MM_COLUMN_WIDTH);
    });

    it("padReceiptLine aligns two columns across receipt width with truncation guard", () => {
      const line = padReceiptLine("1x Jaffna Crab Curry", "Rs 9,600.00", 48);
      assert.strictEqual(line.length, 48);
      assert.ok(line.startsWith("1x Jaffna Crab Curry"));
      assert.ok(line.endsWith("Rs 9,600.00"));

      // Long item description gracefully truncates
      const veryLong = "Very Long Signature Seafood Rice Platter With Extra Prawns and Calamari";
      const truncatedLine = padReceiptLine(veryLong, "Rs 14,500.00", 48);
      assert.strictEqual(truncatedLine.length, 48);
      assert.ok(truncatedLine.includes("..."));
      assert.ok(truncatedLine.endsWith("Rs 14,500.00"));
    });

    it("centerReceiptText centers text within specified column width", () => {
      const centered = centerReceiptText("GALLE HERITAGE VILLA", 48);
      assert.strictEqual(centered.length, 48);
      assert.ok(centered.includes("GALLE HERITAGE VILLA"));
      assert.strictEqual(centered.trim(), "GALLE HERITAGE VILLA");

      // Text longer than width returns trimmed
      const longText = "A".repeat(55);
      assert.strictEqual(centerReceiptText(longText, 48), longText);
    });

    it("triggerThermalPrint handles headless/SSR environment safely", () => {
      let callbackInvoked = false;
      const result = triggerThermalPrint(() => {
        callbackInvoked = true;
      });
      // In Node.js / SSR window is not defined
      assert.strictEqual(result, false);
      assert.strictEqual(callbackInvoked, true);
    });

    it("THERMAL_80MM_PRINT_STYLES includes 80mm CSS and media print declarations", () => {
      assert.ok(THERMAL_80MM_PRINT_STYLES.includes("@media print"));
      assert.ok(THERMAL_80MM_PRINT_STYLES.includes("72mm"));
      assert.ok(THERMAL_80MM_PRINT_STYLES.includes("print-color-adjust"));
      assert.ok(THERMAL_80MM_PRINT_STYLES.includes(".no-print"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Shared Apple HIG Status Badges
  // --------------------------------------------------------------------------
  describe("2. Shared Apple HIG Status Badges", () => {
    describe("SLA Urgency Badge", () => {
      it("resolves dynamic theme tokens for SLA states", () => {
        const onTime = getSlaBadgeStyle("ON_TIME", "en");
        assert.strictEqual(onTime.level, "ON_TIME");
        assert.ok(onTime.badgeBg.includes("emerald"));
        assert.strictEqual(onTime.icon, "⏱️");
        assert.strictEqual(onTime.label, "ON TIME");

        const expedite = getSlaBadgeStyle("APPROACHING_SLA", "si");
        assert.strictEqual(expedite.level, "APPROACHING_SLA");
        assert.ok(expedite.badgeBg.includes("amber"));
        assert.strictEqual(expedite.icon, "⏳");
        assert.strictEqual(expedite.label, "ඉක්මන් කරන්න");

        const overdue = getSlaBadgeStyle("OVERDUE", "ta");
        assert.strictEqual(overdue.level, "OVERDUE");
        assert.ok(overdue.badgeBg.includes("rose"));
        assert.ok(overdue.borderClass.includes("animate-pulse"));
        assert.strictEqual(overdue.icon, "⚠️");
        assert.strictEqual(overdue.label, "தாமதம்");
      });

      it("renders SlaBadge component with elapsed timer", () => {
        const html = renderToStaticMarkup(
          React.createElement(SlaBadge, {
            urgency: "OVERDUE",
            elapsedText: "28:15",
            lang: "en",
          }),
        );
        assert.ok(html.includes('data-testid="sla-badge-overdue"'));
        assert.ok(html.includes("OVERDUE"));
        assert.ok(html.includes("28:15"));
        assert.ok(html.includes("tabular-nums-lkr"));
      });
    });

    describe("Ticket Department Badge", () => {
      it("resolves styles for KOT, BOT, and POS", () => {
        const kot = getTicketDepartmentStyle("KOT", "en");
        assert.strictEqual(kot.label, "KITCHEN KOT");
        assert.strictEqual(kot.icon, "🍳");
        assert.ok(kot.badgeClass.includes("amber"));

        const bot = getTicketDepartmentStyle("BOT", "si");
        assert.strictEqual(bot.label, "බාර් BOT");
        assert.strictEqual(bot.icon, "🍸");
        assert.ok(bot.badgeClass.includes("sky"));

        const pos = getTicketDepartmentStyle("POS", "ta");
        assert.strictEqual(pos.label, "பணியாளர் POS");
        assert.strictEqual(pos.icon, "📝");
        assert.ok(pos.badgeClass.includes("purple"));
      });

      it("renders TicketDepartmentBadge component correctly", () => {
        const html = renderToStaticMarkup(
          React.createElement(TicketDepartmentBadge, {
            ticketType: "BOT",
            lang: "en",
          }),
        );
        assert.ok(html.includes('data-testid="ticket-department-badge"'));
        assert.ok(html.includes("BAR BOT"));
        assert.ok(html.includes("🍸"));
      });
    });

    describe("Destination Badge", () => {
      it("resolves destination types: Table, Room, Cabana, Takeaway", () => {
        const table = getDestinationBadgeStyle("TABLE", "en");
        assert.strictEqual(table.label, "Table");
        assert.strictEqual(table.icon, "🍽️");

        const room = getDestinationBadgeStyle("ROOM", "si");
        assert.strictEqual(room.label, "කාමරය");
        assert.strictEqual(room.icon, "🛏️");

        const cabana = getDestinationBadgeStyle("CABANA", "ta");
        assert.strictEqual(cabana.label, "கபானா");
        assert.strictEqual(cabana.icon, "🏖️");

        const takeaway = getDestinationBadgeStyle("TAKEAWAY", "en");
        assert.strictEqual(takeaway.label, "Takeaway");
        assert.strictEqual(takeaway.icon, "🛍️");
      });

      it("renders DestinationBadge component with destination number", () => {
        const html = renderToStaticMarkup(
          React.createElement(DestinationBadge, {
            destinationType: "ROOM",
            destinationNumber: "204",
            lang: "en",
          }),
        );
        assert.ok(html.includes('data-testid="destination-badge"'));
        assert.ok(html.includes("Room 204"));
        assert.ok(html.includes("🛏️"));
      });
    });

    describe("Dietary & Allergen Badge", () => {
      it("resolves dietary tokens for Halal, Vegan, Gluten Free, Nut Free, Spicy", () => {
        const halal = getDietaryBadgeStyle("HALAL");
        assert.ok(halal.badgeClass.includes("sky"));
        assert.strictEqual(halal.icon, "☪️");

        const vegan = getDietaryBadgeStyle("VEGAN");
        assert.ok(vegan.badgeClass.includes("emerald"));
        assert.strictEqual(vegan.icon, "🌱");

        const spicy = getDietaryBadgeStyle("SPICY");
        assert.ok(spicy.badgeClass.includes("rose"));
        assert.strictEqual(spicy.icon, "🌶️");

        const unknown = getDietaryBadgeStyle("CUSTOM_DIET");
        assert.ok(unknown.badgeClass.includes("slate"));
      });

      it("renders DietaryBadge component correctly", () => {
        const html = renderToStaticMarkup(
          React.createElement(DietaryBadge, {
            dietary: "GLUTEN_FREE",
          }),
        );
        assert.ok(html.includes('data-testid="dietary-badge-gluten_free"'));
        assert.ok(html.includes("GLUTEN FREE"));
        assert.ok(html.includes("🌾"));
      });
    });

    describe("Meal Plan Badge", () => {
      it("resolves distinct Apple dynamic colors for all 5 statutory meal plans", () => {
        assert.ok(getMealPlanBadgeStyle("AI").includes("purple"));
        assert.ok(getMealPlanBadgeStyle("FB").includes("indigo"));
        assert.ok(getMealPlanBadgeStyle("HB").includes("sky"));
        assert.ok(getMealPlanBadgeStyle("BB").includes("emerald"));
        assert.ok(getMealPlanBadgeStyle("RO").includes("slate"));
      });

      it("renders MealPlanBadge component correctly", () => {
        const html = renderToStaticMarkup(
          React.createElement(MealPlanBadge, {
            planCode: "HB",
          }),
        );
        assert.ok(html.includes('data-testid="meal-plan-badge-hb"'));
        assert.ok(html.includes("HB"));
      });
    });
  });
});
