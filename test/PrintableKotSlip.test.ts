/**
 * Unit Tests for Step 280: 80mm Thermal KOT / BOT Ticket Auto-Print View (PrintableKotSlip.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type KotPrintableItem,
  PrintableKotSlip,
  type PrintableKotSlipProps,
  type SlipTicketType,
  computeTotalItemCount,
  formatKotTimestamp,
  getSlipTitle,
} from "../src/staff/kds/index.js";

describe("Step 280: 80mm Thermal KOT / BOT Ticket Auto-Print View (PrintableKotSlip.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Calculation & Formatting Helpers
  // --------------------------------------------------------------------------
  describe("1. Formatting & Totals Helpers", () => {
    it("formatKotTimestamp formats ISO dates to YYYY-MM-DD HH:MM:SS", () => {
      const formatted = formatKotTimestamp("2026-10-19T14:32:05.000Z");
      assert.strictEqual(formatted, "2026-10-19 14:32:05");

      // Falls back safely if undefined
      const fallback = formatKotTimestamp(undefined);
      assert.ok(fallback.length === 19);
      assert.ok(fallback.includes("-") && fallback.includes(":"));
    });

    it("computeTotalItemCount calculates the total quantity of items", () => {
      const items: readonly KotPrintableItem[] = [
        { id: "1", name: "Jaffna Lagoon Crab Curry", quantity: 2 },
        { id: "2", name: "Ceylon Pol Roti", quantity: 3 },
        { id: "3", name: "King Coconut", quantity: 1 },
      ];
      assert.strictEqual(computeTotalItemCount(items), 6);
      assert.strictEqual(computeTotalItemCount([]), 0);
    });

    it("getSlipTitle returns trilingual titles for KOT and BOT slips", () => {
      // KOT titles
      assert.strictEqual(getSlipTitle("KOT", "en").title, "KITCHEN ORDER TICKET (KOT)");
      assert.strictEqual(getSlipTitle("KOT", "si").title, "කුස්සි ඇණවුම් පත්‍රිකාව (KOT)");
      assert.strictEqual(getSlipTitle("KOT", "ta").title, "சமையலறை ஆர்டர் சீட்டு (KOT)");

      // BOT titles
      assert.strictEqual(getSlipTitle("BOT", "en").title, "BAR ORDER TICKET (BOT)");
      assert.strictEqual(getSlipTitle("BOT", "si").title, "බාර් ඇණවුම් පත්‍රිකාව (BOT)");
      assert.strictEqual(getSlipTitle("BOT", "ta").title, "பார் ஆர்டர் சீட்டு (BOT)");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Rendering & Thermal Layout Standards
  // --------------------------------------------------------------------------
  describe("2. React Static Rendering & 80mm Print CSS", () => {
    const sampleItems: readonly KotPrintableItem[] = [
      {
        id: "item-101",
        name: "Jaffna Lagoon Crab Curry",
        quantity: 2,
        portion: "Large Clay Pot",
        spiceLevel: "Extra Hot Sri Lankan 🌶️🌶️🌶️",
        modifiers: ["Extra Roast Paan (2 pcs)", "Thick Coconut Gravy"],
        specialInstructions: "Guest requested mild salt on the roast paan",
      },
      {
        id: "item-102",
        name: "Mirissa King Coconut (Thambili)",
        quantity: 2,
        glassware: "Chilled Whole Coconut",
        garnishes: ["Bamboo Straw"],
      },
    ];

    it("renders complete 80mm KOT thermal slip with all order details", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableKotSlip, {
          slipType: "KOT",
          hotelName: "Cinnamon Wild Yala",
          departmentName: "Main Hot Kitchen",
          ticketNumber: "K-1021",
          orderId: "ord-8839210-kds",
          orderType: "Room Dining",
          destination: "Room 104 (Jungle Chalet)",
          serverName: "Kamal Perera",
          createdAt: "2026-10-19T14:32:05.000Z",
          guestNotes: "Guest is severely allergic to dairy. Keep cookware separate.",
          items: sampleItems,
        }),
      );

      // Container and print style
      assert.ok(html.includes('data-testid="printable-kot-slip"'));
      assert.ok(html.includes("@page {"));
      assert.ok(html.includes("80mm auto"));

      // Header
      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Main Hot Kitchen"));
      assert.ok(html.includes("KITCHEN ORDER TICKET (KOT)"));

      // Ticket metadata
      assert.ok(html.includes("TICKET: #K-1021"));
      assert.ok(html.includes("[Room Dining]"));
      assert.ok(html.includes("DEST: Room 104 (Jungle Chalet)"));
      assert.ok(html.includes("SERVER: Kamal Perera"));
      assert.ok(html.includes("ORDER: #ord-8839"));
      assert.ok(html.includes("TIME: 2026-10-19 14:32:05"));

      // Allergy Callout Box
      assert.ok(html.includes("*** ATTENTION / ALLERGY ***"));
      assert.ok(html.includes("Guest is severely allergic to dairy"));

      // Items
      assert.ok(html.includes("2x"));
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("PORTION: Large Clay Pot"));
      assert.ok(html.includes("SPICE: Extra Hot Sri Lankan"));
      assert.ok(html.includes("+ Extra Roast Paan (2 pcs)"));
      assert.ok(html.includes("+ Thick Coconut Gravy"));
      assert.ok(html.includes("INSTRUCTION: Guest requested mild salt"));

      // Second Item
      assert.ok(html.includes("Mirissa King Coconut (Thambili)"));
      assert.ok(html.includes("GLASS: Chilled Whole Coconut"));
      assert.ok(html.includes("GARNISH: Bamboo Straw"));

      // Total count & End demarcation
      assert.ok(html.includes("TOTAL ITEMS:"));
      assert.ok(html.includes("4")); // 2 + 2 = 4
      assert.ok(html.includes("--- END OF TICKET #K-1021 ---"));
    });

    it("renders BOT slip for bar dispense queue", () => {
      const barItems: readonly KotPrintableItem[] = [
        {
          id: "bot-1",
          name: "Ceylon Coconut Arrack Sour",
          quantity: 2,
          glassware: "Coupe Glass",
          garnishes: ["Dehydrated Lime Wheel"],
          modifiers: ["Aquafaba Foam", "Old Reserve 47 Arrack"],
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(PrintableKotSlip, {
          slipType: "BOT",
          hotelName: "Heritance Ahungalla",
          departmentName: "Pool Bar & Sunset Lounge",
          ticketNumber: "B-501",
          orderId: "ord-bot-99201",
          orderType: "Poolside",
          destination: "Pool Lounger #08",
          serverName: "Suresh Naidu",
          items: barItems,
        }),
      );

      assert.ok(html.includes("BAR ORDER TICKET (BOT)"));
      assert.ok(html.includes("TICKET: #B-501"));
      assert.ok(html.includes("DEST: Pool Lounger #08"));
      assert.ok(html.includes("Ceylon Coconut Arrack Sour"));
      assert.ok(html.includes("GLASS: Coupe Glass"));
      assert.ok(html.includes("GARNISH: Dehydrated Lime Wheel"));
    });

    it("renders in Sinhala and Tamil localization", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(PrintableKotSlip, {
          ticketNumber: "K-101",
          orderId: "ord-1",
          destination: "Table 01",
          items: sampleItems,
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("කුස්සි ඇණවුම් පත්‍රිකාව (KOT)"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(PrintableKotSlip, {
          ticketNumber: "K-102",
          orderId: "ord-2",
          destination: "Table 02",
          items: sampleItems,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("சமையலறை ஆர்டர் சீட்டு (KOT)"));
    });

    it("validates constructible types and interfaces", () => {
      const type: SlipTicketType = "KOT";
      const props: PrintableKotSlipProps = {
        slipType: type,
        ticketNumber: "K-999",
        orderId: "ord-999",
        destination: "Takeaway Counter",
        items: [],
      };
      assert.strictEqual(props.ticketNumber, "K-999");
      assert.strictEqual(props.slipType, "KOT");
    });
  });
});
