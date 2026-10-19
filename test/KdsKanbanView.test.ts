/**
 * Unit Tests for Step 276: Touch-First 3-Column Kitchen Display System (KDS) Kanban Board (KdsKanbanView.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_KDS_TICKETS,
  KdsKanbanView,
  type KdsKanbanViewProps,
  type KdsOrderItem,
  type KdsTicket,
  calculateSlaUrgency,
  filterKdsTickets,
  formatElapsedTimer,
  getAdvanceButtonText,
  getNextOrderStatus,
  getOrderTypeDetails,
  getPrevOrderStatus,
  getSlaBadgeTheme,
} from "../src/staff/kds/index.js";

describe("Step 276: Touch-First 3-Column Kitchen Display System (KDS) Kanban Board (KdsKanbanView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Calculations & Formatting Helpers
  // --------------------------------------------------------------------------
  describe("1. Pure Domain Calculations & Formatting Helpers", () => {
    it("formatElapsedTimer accurately formats seconds to MM:SS and H:MM:SS", () => {
      assert.strictEqual(formatElapsedTimer(0), "00:00");
      assert.strictEqual(formatElapsedTimer(59), "00:59");
      assert.strictEqual(formatElapsedTimer(60), "01:00");
      assert.strictEqual(formatElapsedTimer(245), "04:05");
      assert.strictEqual(formatElapsedTimer(3599), "59:59");
      assert.strictEqual(formatElapsedTimer(3600), "1:00:00");
      assert.strictEqual(formatElapsedTimer(3665), "1:01:05");
      assert.strictEqual(formatElapsedTimer(-10), "00:00");
      assert.strictEqual(formatElapsedTimer(Number.NaN), "00:00");
    });

    it("calculateSlaUrgency determines SLA urgency thresholds accurately", () => {
      // 20 minutes target = 1200 seconds
      // < 70% (< 840s) -> NORMAL
      assert.strictEqual(calculateSlaUrgency(400, 20), "NORMAL");
      assert.strictEqual(calculateSlaUrgency(839, 20), "NORMAL");

      // 70% - 100% (840s - 1200s) -> WARNING
      assert.strictEqual(calculateSlaUrgency(840, 20), "WARNING");
      assert.strictEqual(calculateSlaUrgency(1100, 20), "WARNING");
      assert.strictEqual(calculateSlaUrgency(1200, 20), "WARNING");

      // > 100% (> 1200s) -> OVERDUE
      assert.strictEqual(calculateSlaUrgency(1201, 20), "OVERDUE");
      assert.strictEqual(calculateSlaUrgency(1800, 20), "OVERDUE");

      // Edge case: targetMinutes <= 0
      assert.strictEqual(calculateSlaUrgency(100, 0), "NORMAL");
    });

    it("getSlaBadgeTheme provides theme colors and pulse flags for urgency levels", () => {
      const normal = getSlaBadgeTheme("NORMAL");
      assert.strictEqual(normal.pulse, false);
      assert.ok(normal.badgeText.includes("text-slate-300"));

      const warning = getSlaBadgeTheme("WARNING");
      assert.strictEqual(warning.pulse, false);
      assert.ok(warning.badgeText.includes("text-amber-400"));

      const overdue = getSlaBadgeTheme("OVERDUE");
      assert.strictEqual(overdue.pulse, true);
      assert.ok(overdue.badgeText.includes("text-red-400"));
    });

    it("getOrderTypeDetails maps order types with trilingual support", () => {
      const roomEn = getOrderTypeDetails("IN_ROOM_DINING", "en");
      assert.strictEqual(roomEn.label, "Room Dining");
      assert.strictEqual(roomEn.icon, "🛎️");

      const roomSi = getOrderTypeDetails("IN_ROOM_DINING", "si");
      assert.strictEqual(roomSi.label, "කාමර සේවාව");

      const roomTa = getOrderTypeDetails("IN_ROOM_DINING", "ta");
      assert.strictEqual(roomTa.label, "அறை சேவை");

      const table = getOrderTypeDetails("SEATED_TABLE", "en");
      assert.strictEqual(table.label, "Dine-In Table");
      assert.strictEqual(table.icon, "🍽️");

      const takeaway = getOrderTypeDetails("TAKEAWAY", "en");
      assert.strictEqual(takeaway.label, "Takeaway");
      assert.strictEqual(takeaway.icon, "🛍️");
    });

    it("getNextOrderStatus and getPrevOrderStatus manage status transitions cleanly", () => {
      assert.strictEqual(getNextOrderStatus("NEW_ORDER"), "COOKING");
      assert.strictEqual(getNextOrderStatus("COOKING"), "READY_TO_DELIVER");
      assert.strictEqual(getNextOrderStatus("READY_TO_DELIVER"), "COMPLETED");
      assert.strictEqual(getNextOrderStatus("COMPLETED"), null);

      assert.strictEqual(getPrevOrderStatus("NEW_ORDER"), null);
      assert.strictEqual(getPrevOrderStatus("COOKING"), "NEW_ORDER");
      assert.strictEqual(getPrevOrderStatus("READY_TO_DELIVER"), "COOKING");
      assert.strictEqual(getPrevOrderStatus("COMPLETED"), "READY_TO_DELIVER");
    });

    it("getAdvanceButtonText returns trilingual action labels", () => {
      assert.strictEqual(getAdvanceButtonText("NEW_ORDER", "en"), "Start Cooking");
      assert.strictEqual(getAdvanceButtonText("NEW_ORDER", "si"), "කුස්සියට ආරම්භ කරන්න");
      assert.strictEqual(getAdvanceButtonText("NEW_ORDER", "ta"), "சமைக்க தொடங்கு");

      assert.strictEqual(getAdvanceButtonText("COOKING", "en"), "Mark Plated & Ready");
      assert.strictEqual(getAdvanceButtonText("READY_TO_DELIVER", "en"), "Dispatched / Complete");
      assert.strictEqual(getAdvanceButtonText("COMPLETED", "en"), "");
    });

    it("filterKdsTickets filters tickets accurately by dining category", () => {
      const tickets: KdsTicket[] = [
        {
          orderId: "1",
          ticketNumber: "K-1",
          orderType: "IN_ROOM_DINING",
          destination: "Room 101",
          status: "NEW_ORDER",
          createdAt: new Date().toISOString(),
          elapsedSeconds: 10,
          targetMinutes: 20,
          items: [],
        },
        {
          orderId: "2",
          ticketNumber: "K-2",
          orderType: "SEATED_TABLE",
          destination: "Table 5",
          status: "COOKING",
          createdAt: new Date().toISOString(),
          elapsedSeconds: 15,
          targetMinutes: 20,
          items: [],
        },
        {
          orderId: "3",
          ticketNumber: "K-3",
          orderType: "TAKEAWAY",
          destination: "Takeaway",
          status: "NEW_ORDER",
          createdAt: new Date().toISOString(),
          elapsedSeconds: 5,
          targetMinutes: 15,
          items: [],
        },
      ];

      assert.strictEqual(filterKdsTickets(tickets, "ALL").length, 3);
      assert.strictEqual(filterKdsTickets(tickets, "IN_ROOM_DINING").length, 1);
      assert.strictEqual(filterKdsTickets(tickets, "SEATED_TABLE").length, 1);
      assert.strictEqual(filterKdsTickets(tickets, "TAKEAWAY").length, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Default Presets & Static Markup Verification
  // --------------------------------------------------------------------------
  describe("2. Default Presets & Static UI Rendering", () => {
    it("contains authentic Sri Lankan hotel KDS tickets in DEFAULT_KDS_TICKETS", () => {
      assert.ok(DEFAULT_KDS_TICKETS.length >= 4);

      const crabTicket = DEFAULT_KDS_TICKETS.find((t) => t.ticketNumber === "K-101");
      assert.ok(crabTicket);
      assert.strictEqual(crabTicket.orderType, "IN_ROOM_DINING");
      assert.strictEqual(crabTicket.destination, "Room 204 (Deluxe Ocean)");
      assert.ok(crabTicket.items.some((i) => i.name.includes("Crab Curry")));
      assert.ok(crabTicket.items.some((i) => i.name.includes("Pol Roti")));

      const kottuTicket = DEFAULT_KDS_TICKETS.find((t) => t.ticketNumber === "K-102");
      assert.ok(kottuTicket);
      assert.strictEqual(kottuTicket.orderType, "SEATED_TABLE");
      assert.ok(kottuTicket.items.some((i) => i.name.includes("Kottu Roti")));
    });

    it("renders KdsKanbanView component with 3 columns and header controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsKanbanView, {
          initialOrders: DEFAULT_KDS_TICKETS,
          language: "en",
        }),
      );

      // Verify header and title
      assert.ok(html.includes("Kitchen Display System"));
      assert.ok(html.includes("Live KDS"));

      // Verify 3 columns presence
      assert.ok(html.includes("New Orders"));
      assert.ok(html.includes("Cooking / In Prep"));
      assert.ok(html.includes("Ready to Deliver"));

      // Verify ticket cards presence
      assert.ok(html.includes("K-101"));
      assert.ok(html.includes("K-102"));
      assert.ok(html.includes("K-103"));
      assert.ok(html.includes("K-104"));

      // Verify item details
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("Mixed Seafood Kottu Roti"));
      assert.ok(html.includes("Extra Roast Paan (2 pcs)"));

      // Verify touch action buttons
      assert.ok(html.includes("Start Cooking"));
      assert.ok(html.includes("Mark Plated &amp; Ready") || html.includes("Mark Plated & Ready"));
      assert.ok(html.includes("Dispatched / Complete"));

      // Verify Apple Liquid Glass and Tabular Numeral styling classes
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders KdsKanbanView in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsKanbanView, {
          initialOrders: DEFAULT_KDS_TICKETS,
          language: "si",
        }),
      );

      assert.ok(html.includes("කුස්සි සංදර්ශකය (KDS)"));
      assert.ok(html.includes("අලුත් ඇණවුම්"));
      assert.ok(html.includes("පිසින වෙමින්"));
      assert.ok(html.includes("සූදානම්"));
      assert.ok(html.includes("කුස්සියට ආරම්භ කරන්න"));
    });

    it("renders KdsKanbanView in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsKanbanView, {
          initialOrders: DEFAULT_KDS_TICKETS,
          language: "ta",
        }),
      );

      assert.ok(html.includes("சமையலறை காட்சி"));
      assert.ok(html.includes("புதிய ஆர்டர்கள்"));
      assert.ok(html.includes("சமைக்கப்படுகிறது"));
      assert.ok(html.includes("தயார்"));
      assert.ok(html.includes("சமைக்க தொடங்கு"));
    });

    it("hides advance buttons when readOnly prop is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsKanbanView, {
          initialOrders: DEFAULT_KDS_TICKETS,
          readOnly: true,
        }),
      );

      assert.ok(!html.includes("Start Cooking"));
      assert.ok(!html.includes("Mark Plated &amp; Ready"));
    });

    it("verifies all exported types and interfaces are constructible", () => {
      const item: KdsOrderItem = {
        id: "test-01",
        name: "Egg Roti",
        quantity: 2,
        portion: "Single",
        spiceLevel: "Mild",
        modifiers: ["Extra Katta Sambol"],
        specialInstructions: "Less salt",
        dietary: ["VEGETARIAN"],
        isCompleted: false,
      };
      assert.strictEqual(item.quantity, 2);

      const ticket: KdsTicket = {
        orderId: "ord-test",
        ticketNumber: "T-99",
        orderType: "SEATED_TABLE",
        destination: "Table 1",
        status: "NEW_ORDER",
        createdAt: "2026-10-19T10:00:00Z",
        elapsedSeconds: 50,
        targetMinutes: 15,
        items: [item],
      };
      assert.strictEqual(ticket.ticketNumber, "T-99");

      const props: KdsKanbanViewProps = {
        initialOrders: [ticket],
        readOnly: false,
      };
      assert.strictEqual(props.readOnly, false);
    });
  });
});
