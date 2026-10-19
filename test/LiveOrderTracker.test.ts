import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SAMPLE_ORDER,
  type LiveOrderData,
  type LiveOrderStatus,
  LiveOrderTracker,
  type LiveOrderTrackerProps,
  ORDER_STAGES,
  type OrderItemDetail,
  type StageDefinition,
  calculateRemainingSeconds,
  formatMinutesSeconds,
  getOrderStageIndex,
  getTrackerText,
} from "../src/qr/LiveOrderTracker.js";

describe("Step 262: Real-Time Order Status Tracker (LiveOrderTracker.tsx)", () => {
  describe("1. Pure Progression & Formatting Utilities", () => {
    it("returns correct zero-indexed stage for linear progression", () => {
      assert.strictEqual(getOrderStageIndex("PLACED"), 0);
      assert.strictEqual(getOrderStageIndex("KITCHEN_PREP"), 1);
      assert.strictEqual(getOrderStageIndex("OUT_FOR_DELIVERY"), 2);
      assert.strictEqual(getOrderStageIndex("DELIVERED"), 3);
      assert.strictEqual(getOrderStageIndex("CANCELLED"), -1);
      assert.strictEqual(getOrderStageIndex("REJECTED"), -1);
    });

    it("formats minutes and seconds accurately into tabular MM:SS format", () => {
      assert.strictEqual(formatMinutesSeconds(0), "00:00");
      assert.strictEqual(formatMinutesSeconds(-10), "00:00");
      assert.strictEqual(formatMinutesSeconds(5), "00:05");
      assert.strictEqual(formatMinutesSeconds(65), "01:05");
      assert.strictEqual(formatMinutesSeconds(840), "14:00");
      assert.strictEqual(formatMinutesSeconds(3661), "61:01");
    });

    it("calculates remaining seconds relative to current time", () => {
      assert.strictEqual(calculateRemainingSeconds(null), 0);
      assert.strictEqual(calculateRemainingSeconds(undefined), 0);
      assert.strictEqual(calculateRemainingSeconds("invalid-date"), 0);

      const pastIso = new Date(Date.now() - 60 * 1000).toISOString();
      assert.strictEqual(calculateRemainingSeconds(pastIso), 0);

      const futureIso = new Date(Date.now() + 60 * 1000).toISOString();
      const rem = calculateRemainingSeconds(futureIso);
      assert.ok(rem >= 55 && rem <= 65);
    });
  });

  describe("2. Trilingual Localization Catalog", () => {
    it("returns complete translations for English, Sinhala, and Tamil", () => {
      const en = getTrackerText("en");
      assert.strictEqual(en.orderHeader, "Live Order Status");
      assert.strictEqual(en.stages.PLACED.title, "Order Placed");
      assert.strictEqual(en.stages.KITCHEN_PREP.title, "Cooking in Kitchen");
      assert.strictEqual(en.stages.OUT_FOR_DELIVERY.title, "On the Way to You");
      assert.strictEqual(en.stages.DELIVERED.title, "Delivered & Enjoy!");

      const si = getTrackerText("si");
      assert.strictEqual(si.orderHeader, "සජීවී ඇණවුම් තත්ත්වය");
      assert.strictEqual(si.stages.PLACED.title, "ඇණවුම භාරගැනිණි");
      assert.strictEqual(si.stages.KITCHEN_PREP.title, "ආහාර පිළියෙල කෙරේ");

      const ta = getTrackerText("ta");
      assert.strictEqual(ta.orderHeader, "நேரலை ஆர்டர் நிலை");
      assert.strictEqual(ta.stages.PLACED.title, "ஆர்டர் பெறப்பட்டது");
      assert.strictEqual(ta.stages.KITCHEN_PREP.title, "சமையலறையில் தயாராகிறது");
    });
  });

  describe("3. Order Stages Configuration", () => {
    it("defines 4 sequential order progress stages", () => {
      assert.strictEqual(ORDER_STAGES.length, 4);
      const keys = ORDER_STAGES.map((s: StageDefinition) => s.key);
      assert.deepStrictEqual(keys, ["PLACED", "KITCHEN_PREP", "OUT_FOR_DELIVERY", "DELIVERED"]);
    });
  });

  describe("4. Static Markup Rendering", () => {
    it("renders default order tracker with active kitchen status and dishes", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveOrderTracker, {
          orderId: "ord-test-104",
          language: "en",
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="live-order-tracker"'));

      // Location & Header
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Live Order Status"));
      assert.ok(html.includes("#ORD-104-5892"));

      // Active stage callout
      assert.ok(html.includes("Cooking in Kitchen"));

      // Assigned server
      assert.ok(html.includes("Sunil (Villa Butler)"));

      // Dishes
      assert.ok(html.includes("Sri Lankan Rice &amp; 5 Vegetable Curries"));
      assert.ok(html.includes("Fresh Mirissa King Coconut"));

      // Total LKR formatted
      assert.ok(html.includes("6,450"));
    });

    it("renders in Sinhala language correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveOrderTracker, {
          orderId: "ord-test-104",
          language: "si",
        }),
      );

      assert.ok(html.includes("සජීවී ඇණවුම් තත්ත්වය"));
      assert.ok(html.includes("ආහාර පිළියෙල කෙරේ"));
      assert.ok(html.includes("සේවක සහාය පතන්න"));
    });

    it("renders delivered state when order is completed", () => {
      const completedOrder: LiveOrderData = {
        ...DEFAULT_SAMPLE_ORDER,
        status: "DELIVERED",
        estimatedDeliveryAt: null,
      };

      const html = renderToStaticMarkup(
        React.createElement(LiveOrderTracker, {
          orderId: "ord-test-104",
          initialOrder: completedOrder,
          language: "en",
        }),
      );

      assert.ok(html.includes("Delivered &amp; Enjoy!"));
      assert.ok(html.includes("Delivered &amp; Ready!"));
    });
  });

  describe("5. TypeScript Interface Constructibility", () => {
    it("constructs type-safe order items and order models", () => {
      const status: LiveOrderStatus = "OUT_FOR_DELIVERY";
      const item: OrderItemDetail = {
        id: "dish-99",
        name: "Devilled Calamari",
        quantity: 2,
        portion: "Spicy Large",
        itemTotalLkr: 3200,
      };

      const orderData: LiveOrderData = {
        orderId: "ord-555",
        orderReference: "ORD-555-01",
        locationName: "Cabana 02",
        status,
        placedAt: "2026-10-19T10:00:00Z",
        items: [item],
        grandTotalLkr: 3200,
      };

      assert.strictEqual(orderData.status, "OUT_FOR_DELIVERY");
      assert.strictEqual(orderData.items[0]?.name, "Devilled Calamari");
    });

    it("constructs valid LiveOrderTrackerProps", () => {
      const props: LiveOrderTrackerProps = {
        orderId: "ord-test-1",
        language: "ta",
        usdExchangeRate: 315,
        onBackToMenu: () => {
          /* noop */
        },
        onCallButler: () => {
          /* noop */
        },
        testId: "custom-tracker-test",
      };

      assert.strictEqual(props.orderId, "ord-test-1");
      assert.strictEqual(props.testId, "custom-tracker-test");
    });
  });
});
