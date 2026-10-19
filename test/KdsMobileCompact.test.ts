/**
 * Unit Tests for Step 278: Smartphone Single-Column Compact KDS Mode for Small Hotel Kitchens (KdsMobileCompact.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KdsMobileCompact,
  type KdsMobileCompactProps,
  type KdsMobileTab,
  getTabLabel,
} from "../src/staff/kds/index.js";

describe("Step 278: Smartphone Single-Column Compact KDS Mode (KdsMobileCompact.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Tab Label Formatting & Trilingual Support
  // --------------------------------------------------------------------------
  describe("1. Tab Label Formatting & Trilingual Support", () => {
    it("formats English tab labels with counts", () => {
      assert.strictEqual(getTabLabel("NEW_ORDER", 4, "en"), "New (4)");
      assert.strictEqual(getTabLabel("COOKING", 2, "en"), "Cooking (2)");
      assert.strictEqual(getTabLabel("READY_TO_DELIVER", 1, "en"), "Ready (1)");
    });

    it("formats Sinhala tab labels with counts", () => {
      assert.strictEqual(getTabLabel("NEW_ORDER", 5, "si"), "අලුත් (5)");
      assert.strictEqual(getTabLabel("COOKING", 3, "si"), "පිසින (3)");
      assert.strictEqual(getTabLabel("READY_TO_DELIVER", 2, "si"), "සූදානම් (2)");
    });

    it("formats Tamil tab labels with counts", () => {
      assert.strictEqual(getTabLabel("NEW_ORDER", 3, "ta"), "புதிய (3)");
      assert.strictEqual(getTabLabel("COOKING", 1, "ta"), "சமைக்கிறது (1)");
      assert.strictEqual(getTabLabel("READY_TO_DELIVER", 4, "ta"), "தயார் (4)");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Component Static Rendering & Segmented Tabs
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering & Segmented Tabs", () => {
    it("renders compact KDS view with header, segmented tab bar, and active tickets", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, {}));

      // Header elements
      assert.ok(html.includes("Kitchen KDS"));
      assert.ok(html.includes("Compact"));
      assert.ok(html.includes('data-testid="kds-mobile-compact"'));

      // Segmented Tab Bar options
      assert.ok(html.includes("New"));
      assert.ok(html.includes("Cooking"));
      assert.ok(html.includes("Ready"));

      // Default tab is NEW_ORDER -> contains K-101 and K-104
      assert.ok(html.includes("K-101"));
      assert.ok(html.includes("K-104"));
      // Should not contain cooking order K-102 on default NEW_ORDER tab
      assert.ok(!html.includes("K-102"));
    });

    it("renders cooking tickets when defaultTab is COOKING", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsMobileCompact, { defaultTab: "COOKING" }),
      );

      assert.ok(html.includes("K-102"));
      assert.ok(html.includes("Table 04 (Verandah)"));
      // Should not show new order K-101
      assert.ok(!html.includes("K-101"));
    });

    it("renders ready to deliver tickets when defaultTab is READY_TO_DELIVER", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsMobileCompact, { defaultTab: "READY_TO_DELIVER" }),
      );

      assert.ok(html.includes("K-103"));
      assert.ok(html.includes("Table 12 (Poolside Deck)"));
      // Should not show new order K-101 or cooking order K-102
      assert.ok(!html.includes("K-101"));
      assert.ok(!html.includes("K-102"));
    });

    it("displays empty state placeholder when selected tab queue has zero orders", () => {
      const html = renderToStaticMarkup(
        React.createElement(KdsMobileCompact, {
          initialOrders: [],
          defaultTab: "NEW_ORDER",
        }),
      );

      assert.ok(html.includes("No tickets in this queue"));
    });

    it("renders dining category filter pills in header", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, {}));

      assert.ok(html.includes("All"));
      assert.ok(html.includes("Rooms"));
      assert.ok(html.includes("Dine-In"));
      assert.ok(html.includes("Takeaway"));
    });

    it("renders mobile system action controls: mute, test chime, and wake-lock", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, {}));

      assert.ok(html.includes("🔔")); // Unmuted bell button
      assert.ok(html.includes("🎵")); // Chime test button
      assert.ok(html.includes("💡")); // Screen wake-lock button
    });
  });

  // --------------------------------------------------------------------------
  // 3. Localization & ReadOnly Mode
  // --------------------------------------------------------------------------
  describe("3. Localization & ReadOnly Mode", () => {
    it("renders compact KDS in Sinhala localization", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, { language: "si" }));

      assert.ok(html.includes("කුස්සිය (KDS)"));
      assert.ok(html.includes("අලුත්"));
      assert.ok(html.includes("පිසින"));
      assert.ok(html.includes("සූදානම්"));
      assert.ok(html.includes("කාමර"));
    });

    it("renders compact KDS in Tamil localization", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, { language: "ta" }));

      assert.ok(html.includes("சமையலறை"));
      assert.ok(html.includes("புதிய"));
      assert.ok(html.includes("சமைக்கிறது"));
      assert.ok(html.includes("தயார்"));
      assert.ok(html.includes("அறை"));
    });

    it("hides advance action buttons when readOnly is enabled", () => {
      const html = renderToStaticMarkup(React.createElement(KdsMobileCompact, { readOnly: true }));

      assert.ok(!html.includes("Start Cooking"));
      assert.ok(!html.includes("↩️"));
    });

    it("validates all exported types are constructible", () => {
      const tab: KdsMobileTab = "NEW_ORDER";
      const props: KdsMobileCompactProps = {
        defaultTab: tab,
        language: "en",
        readOnly: false,
      };
      assert.strictEqual(props.defaultTab, "NEW_ORDER");
      assert.strictEqual(props.language, "en");
    });
  });
});
