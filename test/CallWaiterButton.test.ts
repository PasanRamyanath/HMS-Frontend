import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CallWaiterButton,
  type CallWaiterButtonProps,
  type WaiterCallPayload,
  getCallWaiterStrings,
} from "../src/qr/CallWaiterButton.js";

describe("CallWaiterButton (Step 272)", () => {
  describe("1. Trilingual Localization Strings", () => {
    it("provides complete trilingual dictionaries for English, Sinhala, and Tamil", () => {
      const en = getCallWaiterStrings("en");
      const si = getCallWaiterStrings("si");
      const ta = getCallWaiterStrings("ta");

      assert.strictEqual(en.callWaiter, "Call Waiter");
      assert.strictEqual(si.callWaiter, "සේවකයා අමතන්න");
      assert.strictEqual(ta.callWaiter, "பணியாளரை அழைக்கவும்");

      assert.strictEqual(en.requestBill, "Request Bill");
      assert.strictEqual(si.requestBill, "බිල්පත ඉල්ලන්න");
      assert.strictEqual(ta.requestBill, "பில் கோரவும்");

      assert.ok(en.assistanceTitle.includes("Assistance"));
      assert.ok(si.assistanceTitle.includes("සහයක්"));
      assert.ok(ta.assistanceTitle.includes("உதவி"));

      assert.ok(en.waterRefill.includes("Water"));
      assert.ok(si.waterRefill.includes("වතුර"));
      assert.ok(ta.waterRefill.includes("தண்ணீர்"));

      assert.ok(en.lankaQr.includes("LankaQR"));
      assert.ok(si.lankaQr.includes("LankaQR"));
      assert.ok(ta.lankaQr.includes("LankaQR"));
    });

    it("falls back to English when unknown language is passed", () => {
      // @ts-expect-error Testing fallback
      const fallback = getCallWaiterStrings("fr");
      assert.strictEqual(fallback.callWaiter, "Call Waiter");
    });
  });

  describe("2. Static Rendering & Variants", () => {
    it("renders floating variant with >= 44x44pt touch target and Apple Liquid Glass", () => {
      const props: CallWaiterButtonProps = {
        tableOrRoomNumber: "Table 14",
        language: "en",
        variant: "floating",
      };

      const html = renderToStaticMarkup(React.createElement(CallWaiterButton, props));

      assert.ok(html.includes("call-waiter-floating-container"));
      assert.ok(html.includes("call-waiter-fab"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("Table 14"));
      assert.ok(html.includes("Call Waiter"));
      assert.ok(html.includes("🛎️"));
    });

    it("renders inline variant with dual action buttons (Call Waiter & Request Bill)", () => {
      const props: CallWaiterButtonProps = {
        tableOrRoomNumber: "Poolside Lounger 08",
        language: "en",
        variant: "inline",
      };

      const html = renderToStaticMarkup(React.createElement(CallWaiterButton, props));

      assert.ok(html.includes("call-waiter-inline-container"));
      assert.ok(html.includes("call-waiter-inline-btn"));
      assert.ok(html.includes("request-bill-inline-btn"));
      assert.ok(html.includes("Poolside Lounger 08"));
      assert.ok(html.includes("Call Waiter"));
      assert.ok(html.includes("Request Bill"));
    });

    it("renders Sinhala localization correctly in markup", () => {
      const props: CallWaiterButtonProps = {
        tableOrRoomNumber: "මේසය 05",
        language: "si",
        variant: "inline",
      };

      const html = renderToStaticMarkup(React.createElement(CallWaiterButton, props));
      assert.ok(html.includes("මේසය 05"));
      assert.ok(html.includes("සේවකයා අමතන්න"));
      assert.ok(html.includes("බිල්පත ඉල්ලන්න"));
    });

    it("renders Tamil localization correctly in markup", () => {
      const props: CallWaiterButtonProps = {
        tableOrRoomNumber: "மேசை 12",
        language: "ta",
        variant: "floating",
      };

      const html = renderToStaticMarkup(React.createElement(CallWaiterButton, props));
      assert.ok(html.includes("மேசை 12"));
      assert.ok(html.includes("பணியாளரை அழைக்கவும்"));
    });
  });

  describe("3. WaiterCallPayload Interface & Attributes", () => {
    it("constructs valid CALL_WAITER payload with reason and timestamp", () => {
      const payload: WaiterCallPayload = {
        tableOrRoomNumber: "Table 22",
        callType: "CALL_WAITER",
        reason: "Water Refill",
        timestamp: new Date().toISOString(),
      };

      assert.strictEqual(payload.tableOrRoomNumber, "Table 22");
      assert.strictEqual(payload.callType, "CALL_WAITER");
      assert.strictEqual(payload.reason, "Water Refill");
      assert.strictEqual(payload.paymentPreference, undefined);
      assert.ok(payload.timestamp.includes("T"));
    });

    it("constructs valid REQUEST_PHYSICAL_BILL payload with payment preference", () => {
      const payload: WaiterCallPayload = {
        tableOrRoomNumber: "Table 04",
        callType: "REQUEST_PHYSICAL_BILL",
        paymentPreference: "LANKA_QR",
        timestamp: new Date().toISOString(),
      };

      assert.strictEqual(payload.tableOrRoomNumber, "Table 04");
      assert.strictEqual(payload.callType, "REQUEST_PHYSICAL_BILL");
      assert.strictEqual(payload.paymentPreference, "LANKA_QR");
      assert.strictEqual(payload.reason, undefined);
    });
  });
});
