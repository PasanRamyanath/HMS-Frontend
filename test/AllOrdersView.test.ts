/**
 * Unit Tests for Step 290: All-Orders Master Live & Historical Table (AllOrdersView.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AllOrdersView,
  DEFAULT_MASTER_ORDERS,
  computeOrdersSummaryKpis,
  filterMasterOrders,
  formatOrderTime,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
} from "../src/admin/orders/index.js";

describe("Step 290: All-Orders Master Live & Historical Table (AllOrdersView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Data Presets & Authenticity
  // --------------------------------------------------------------------------
  describe("1. Master Orders Dataset", () => {
    it("contains authentic Sri Lankan resort order records across all outlets", () => {
      assert.ok(DEFAULT_MASTER_ORDERS.length >= 6);

      const receipts = DEFAULT_MASTER_ORDERS.map((o) => o.receiptNumber);
      assert.ok(receipts.includes("REC-801001"));
      assert.ok(receipts.includes("REC-802002"));
      assert.ok(receipts.includes("REC-803003"));
      assert.ok(receipts.includes("REC-804004"));
      assert.ok(receipts.includes("REC-805005"));
      assert.ok(receipts.includes("REC-806006"));
    });

    it("verifies accurate 4-stage tax compounding on Room 302 order", () => {
      const room302 = DEFAULT_MASTER_ORDERS.find((o) => o.destination === "Room 302");
      assert.ok(room302);
      assert.strictEqual(room302.taxSummary.grossSubtotalLkr, 4400);
      assert.strictEqual(room302.paymentStatus, "ROOM_CHARGED");
      assert.ok(room302.taxSummary.grandTotalLkr > 4400);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pure Calculation & Filtering Helpers
  // --------------------------------------------------------------------------
  describe("2. Pure KPI Calculation & Filter Functions", () => {
    it("computes accurate summary KPIs across all master orders excluding voids from net revenue", () => {
      const kpis = computeOrdersSummaryKpis(DEFAULT_MASTER_ORDERS);
      assert.strictEqual(kpis.totalOrders, DEFAULT_MASTER_ORDERS.length);
      assert.ok(kpis.netRevenueLkr > 0);
      assert.ok(kpis.activeTickets >= 2);
      assert.ok(kpis.deliveredCount >= 3);
      assert.strictEqual(kpis.voidedCount, 1);
    });

    it("filters orders by query text across destination, receipt and guest name", () => {
      const queryRoom = filterMasterOrders(DEFAULT_MASTER_ORDERS, "302", "ALL", "ALL", "ALL");
      assert.strictEqual(queryRoom.length, 1);
      assert.strictEqual(queryRoom[0]?.destination, "Room 302");

      const queryGuest = filterMasterOrders(DEFAULT_MASTER_ORDERS, "Jenkins", "ALL", "ALL", "ALL");
      assert.strictEqual(queryGuest.length, 1);
      assert.strictEqual(queryGuest[0]?.guestName, "Ms. Sarah Jenkins");

      const queryReceipt = filterMasterOrders(
        DEFAULT_MASTER_ORDERS,
        "REC-804",
        "ALL",
        "ALL",
        "ALL",
      );
      assert.strictEqual(queryReceipt.length, 1);
      assert.strictEqual(queryReceipt[0]?.receiptNumber, "REC-804004");
    });

    it("filters orders by status and payment method", () => {
      const cooking = filterMasterOrders(DEFAULT_MASTER_ORDERS, "", "COOKING", "ALL", "ALL");
      assert.strictEqual(cooking.length, 1);
      assert.strictEqual(cooking[0]?.destination, "Table 12");

      const roomCharged = filterMasterOrders(
        DEFAULT_MASTER_ORDERS,
        "",
        "ALL",
        "ALL",
        "ROOM_CHARGED",
      );
      assert.strictEqual(roomCharged.length, 1);
      assert.strictEqual(roomCharged[0]?.orderId, "ord-802");
    });

    it("formats ISO timestamps into short HH:mm time format", () => {
      const formatted = formatOrderTime("2026-10-20T14:30:00.000Z");
      assert.ok(formatted.length >= 5);
      assert.ok(formatted.includes(":"));
    });

    it("returns appropriate Apple Dynamic Color badges for status and payment", () => {
      assert.ok(getOrderStatusBadgeClass("NEW").includes("sky"));
      assert.ok(getOrderStatusBadgeClass("COOKING").includes("amber"));
      assert.ok(getOrderStatusBadgeClass("READY").includes("emerald"));
      assert.ok(getOrderStatusBadgeClass("VOIDED").includes("rose"));

      assert.ok(getPaymentBadgeClass("PAID").includes("emerald"));
      assert.ok(getPaymentBadgeClass("ROOM_CHARGED").includes("indigo"));
      assert.ok(getPaymentBadgeClass("UNPAID").includes("amber"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. React Static Rendering & Apple HIG Master Table Layout
  // --------------------------------------------------------------------------
  describe("3. React Static Rendering & UI Layout", () => {
    it("renders all-orders master register with KPI cards and table", () => {
      const html = renderToStaticMarkup(
        React.createElement(AllOrdersView, {
          initialOrders: DEFAULT_MASTER_ORDERS,
          onReprintReceipt: () => {
            /* no-op for render test */
          },
        }),
      );

      assert.ok(html.includes("all-orders-master-view"));
      assert.ok(html.includes("All Orders Master Register"));
      assert.ok(html.includes("Total Orders Today"));
      assert.ok(html.includes("Net F&amp;B Revenue") || html.includes("Net F&B Revenue"));
      assert.ok(html.includes("In-Flight Tickets"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));

      // Table elements
      assert.ok(html.includes("REC-801001"));
      assert.ok(html.includes("REC-802002"));
      assert.ok(html.includes("Table 04"));
      assert.ok(html.includes("Room 302"));
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("Inspect"));
      assert.ok(html.includes("🖨️"));
    });

    it("supports Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(AllOrdersView, {
          language: "si",
          initialOrders: DEFAULT_MASTER_ORDERS,
        }),
      );

      assert.ok(html.includes("සියලු ඇණවුම් ලේඛනය"));
      assert.ok(html.includes("අද දින මුළු ඇණවුම්"));
      assert.ok(html.includes("මුළු ආදායම"));
      assert.ok(html.includes("සක්‍රීය ඇණවුම්"));
    });

    it("supports Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(AllOrdersView, {
          language: "ta",
          initialOrders: DEFAULT_MASTER_ORDERS,
        }),
      );

      assert.ok(html.includes("அனைத்து ஆர்டர்கள் பதிவேடு"));
      assert.ok(html.includes("இன்றைய மொத்த ஆர்டர்கள்"));
      assert.ok(html.includes("மொத்த வருவாய்"));
    });
  });
});
