/**
 * Unit Tests for Step 289: Waiter / Room-Service Runner Delivery Dispatch Queue (RunnerDeliveryView.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DELIVERY_TICKETS,
  type RunnerDeliveryItem,
  RunnerDeliveryView,
  calculateDeliveryUrgency,
  filterDeliveryTickets,
  formatElapsedTimer,
  isTrayComplete,
} from "../src/staff/kds/index.js";

describe("Step 289: Waiter / Room-Service Runner Delivery Dispatch Queue (RunnerDeliveryView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Data Presets & Authenticity
  // --------------------------------------------------------------------------
  describe("1. Delivery Tickets Dataset", () => {
    it("contains authentic Sri Lankan room service and restaurant delivery tickets", () => {
      assert.ok(DEFAULT_DELIVERY_TICKETS.length >= 4);

      const destinations = DEFAULT_DELIVERY_TICKETS.map((t) => t.destination);
      assert.ok(destinations.includes("Room 302"));
      assert.ok(destinations.includes("Table 04"));
      assert.ok(destinations.includes("Pool Cabana 02"));
      assert.ok(destinations.includes("Room 104"));
    });

    it("includes allergen safety warnings for shellfish and eggs", () => {
      const room302 = DEFAULT_DELIVERY_TICKETS.find((t) => t.destination === "Room 302");
      assert.ok(room302);
      assert.ok(room302.allergens?.includes("Crab / Shellfish"));

      const table04 = DEFAULT_DELIVERY_TICKETS.find((t) => t.destination === "Table 04");
      assert.ok(table04);
      assert.ok(table04.allergens?.includes("Egg"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pure Calculation Helpers
  // --------------------------------------------------------------------------
  describe("2. Pure Calculation & Filtering Helpers", () => {
    it("formats elapsed timers into mm:ss accurately", () => {
      assert.strictEqual(formatElapsedTimer(0), "00:00");
      assert.strictEqual(formatElapsedTimer(75), "01:15");
      assert.strictEqual(formatElapsedTimer(180), "03:00");
      assert.strictEqual(formatElapsedTimer(615), "10:15");
      assert.strictEqual(formatElapsedTimer(-5), "00:00");
    });

    it("evaluates delivery urgency based on 8-minute target SLA", () => {
      // 2 mins elapsed (target 8m = 480s) -> remaining 360s -> NORMAL
      const normal = calculateDeliveryUrgency(120, 8);
      assert.strictEqual(normal.urgency, "NORMAL");
      assert.strictEqual(normal.label, "ON TIME");

      // 6m 30s elapsed -> remaining 90s (<= 120s) -> WARNING
      const warning = calculateDeliveryUrgency(390, 8);
      assert.strictEqual(warning.urgency, "WARNING");
      assert.strictEqual(warning.label, "EXPEDITE NOW");

      // 9 mins elapsed -> remaining -60s -> OVERDUE
      const overdue = calculateDeliveryUrgency(540, 8);
      assert.strictEqual(overdue.urgency, "OVERDUE");
      assert.strictEqual(overdue.label, "OVERDUE FOR DELIVERY");
    });

    it("filters delivery tickets by zone and destination", () => {
      const all = filterDeliveryTickets(DEFAULT_DELIVERY_TICKETS, "ALL");
      assert.strictEqual(all.length, DEFAULT_DELIVERY_TICKETS.length);

      const rooms = filterDeliveryTickets(DEFAULT_DELIVERY_TICKETS, "ROOMS");
      assert.strictEqual(rooms.length, 2);
      assert.ok(rooms.every((r) => r.destination.includes("Room")));

      const tables = filterDeliveryTickets(DEFAULT_DELIVERY_TICKETS, "TABLES");
      assert.strictEqual(tables.length, 1);
      assert.strictEqual(tables[0]?.destination, "Table 04");

      const cabanas = filterDeliveryTickets(DEFAULT_DELIVERY_TICKETS, "OUTDOOR_CABANAS");
      assert.strictEqual(cabanas.length, 1);
      assert.strictEqual(cabanas[0]?.destination, "Pool Cabana 02");
    });

    it("verifies tray completeness based on item checklist state", () => {
      const completeItems: readonly RunnerDeliveryItem[] = [
        { id: "1", name: "Crab Curry", quantity: 1, checkedOnTray: true },
        { id: "2", name: "Roast Paan", quantity: 2, checkedOnTray: true },
      ];
      assert.strictEqual(isTrayComplete(completeItems), true);

      const incompleteItems: readonly RunnerDeliveryItem[] = [
        { id: "1", name: "Crab Curry", quantity: 1, checkedOnTray: true },
        { id: "2", name: "King Coconut", quantity: 1, checkedOnTray: false },
      ];
      assert.strictEqual(isTrayComplete(incompleteItems), false);
      assert.strictEqual(isTrayComplete([]), true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. React Static Rendering & Apple HIG Smartphone UI
  // --------------------------------------------------------------------------
  describe("3. React Static Rendering & UI Layout", () => {
    it("renders active runner dispatch view with tickets and tray checklist", () => {
      const html = renderToStaticMarkup(
        React.createElement(RunnerDeliveryView, {
          runnerName: "Nuwan Bandara",
          initialTickets: DEFAULT_DELIVERY_TICKETS,
        }),
      );

      assert.ok(html.includes("runner-delivery-view"));
      assert.ok(
        html.includes("Room Service &amp; Runner Dispatch") ||
          html.includes("Room Service & Runner Dispatch"),
      );
      assert.ok(html.includes("Nuwan Bandara"));
      assert.ok(html.includes("Ready Orders"));
      assert.ok(html.includes("Rooms"));
      assert.ok(html.includes("Tables"));
      assert.ok(html.includes("Cabanas"));

      // Check destinations
      assert.ok(html.includes("Room 302"));
      assert.ok(html.includes("Table 04"));
      assert.ok(html.includes("Pool Cabana 02"));
      assert.ok(html.includes("Room 104"));

      // Check checklist items & actions
      assert.ok(html.includes("Ceylon Lagoon Crab Curry"));
      assert.ok(html.includes("Critical Allergen Alert"));
      assert.ok(html.includes("Crab / Shellfish"));
      assert.ok(html.includes("Out for Delivery"));
      assert.ok(html.includes("Confirm Delivered"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders celebration empty state when all orders are dispatched", () => {
      const html = renderToStaticMarkup(
        React.createElement(RunnerDeliveryView, {
          initialTickets: [],
        }),
      );

      assert.ok(html.includes("delivery-queue-empty"));
      assert.ok(html.includes("All Orders Dispatched!"));
    });

    it("supports Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(RunnerDeliveryView, {
          language: "si",
          initialTickets: DEFAULT_DELIVERY_TICKETS,
        }),
      );

      assert.ok(html.includes("කාමර සේවා සහ බෙදාහැරීම් පද්ධතිය"));
      assert.ok(html.includes("ක්රියාකාරී සේවකයා"));
      assert.ok(html.includes("සූදානම් ඇණවුම්"));
      assert.ok(html.includes("කාමර"));
      assert.ok(html.includes("බෙදාහැරීම තහවුරු කරන්න"));
    });

    it("supports Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(RunnerDeliveryView, {
          language: "ta",
          initialTickets: DEFAULT_DELIVERY_TICKETS,
        }),
      );

      assert.ok(html.includes("அறை சேவை மற்றும் டெலிவரி அமைப்பு"));
      assert.ok(html.includes("செயலில் உள்ள ஊழியர்"));
      assert.ok(html.includes("தயாரான ஆர்டர்கள்"));
      assert.ok(html.includes("அறைகள்"));
      assert.ok(html.includes("வழங்கப்பட்டதை உறுதிசெய்"));
    });
  });
});
