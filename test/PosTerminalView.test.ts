/**
 * Unit Tests for Step 282: Touch-Friendly Restaurant & Counter POS Terminal View (PosTerminalView.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_POS_MENU_ITEMS,
  type PosCartItem,
  type PosOrderPayload,
  type PosSettlementPayload,
  type PosTaxSummary,
  PosTerminalView,
  type PosTerminalViewProps,
  calculatePosTaxSummary,
  formatLkr,
  roundRupees,
} from "../src/staff/pos/index.js";

describe("Step 282: Touch-Friendly Restaurant & Counter POS Terminal View (PosTerminalView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Sri Lankan 4-Stage Statutory Tax Engine & Currency Helpers
  // --------------------------------------------------------------------------
  describe("1. Statutory 4-Stage Tax Math & Takeaway Exemption", () => {
    it("rounds numbers accurately to 2 decimal places and handles non-finite", () => {
      assert.strictEqual(roundRupees(100.456), 100.46);
      assert.strictEqual(roundRupees(0), 0);
      assert.strictEqual(roundRupees(Number.NaN), 0);
      assert.strictEqual(roundRupees(Number.POSITIVE_INFINITY), 0);
    });

    it("formats LKR currency strings with two decimal places", () => {
      const formatted = formatLkr(4800);
      assert.ok(formatted.startsWith("LKR"));
      assert.ok(formatted.includes("4,800.00"));
    });

    it("calculates 4-stage compounding taxes for Dine-In (with 10% Service Charge)", () => {
      // Base = 10,000 LKR
      // SC 10% = 1,000 LKR -> Subtotal after SC = 11,000 LKR
      // TDL 1% = 110 LKR
      // SSCL 2.5% = 275 LKR
      // VAT Base = 11,000 + 110 + 275 = 11,385 LKR
      // VAT 18% = 11,385 * 0.18 = 2,049.30 LKR
      // Grand Total = 11,385 + 2,049.30 = 13,434.30 LKR
      const summary = calculatePosTaxSummary(10000, "DINE_IN", 310);

      assert.strictEqual(summary.grossSubtotalLkr, 10000);
      assert.strictEqual(summary.serviceChargeLkr, 1000);
      assert.strictEqual(summary.tdlLkr, 110);
      assert.strictEqual(summary.ssclLkr, 275);
      assert.strictEqual(summary.vatLkr, 2049.3);
      assert.strictEqual(summary.grandTotalLkr, 13434.3);
      assert.strictEqual(summary.approxUsd, 43.34);
    });

    it("waives 10% Service Charge on Walk-In Takeaway orders", () => {
      // Base = 10,000 LKR
      // SC = 0 LKR -> Subtotal after SC = 10,000 LKR
      // TDL 1% = 100 LKR
      // SSCL 2.5% = 250 LKR
      // VAT Base = 10,000 + 100 + 250 = 10,350 LKR
      // VAT 18% = 10,350 * 0.18 = 1,863.00 LKR
      // Grand Total = 10,350 + 1,863 = 12,213.00 LKR
      const summary = calculatePosTaxSummary(10000, "TAKEAWAY", 310);

      assert.strictEqual(summary.grossSubtotalLkr, 10000);
      assert.strictEqual(summary.serviceChargeLkr, 0);
      assert.strictEqual(summary.tdlLkr, 100);
      assert.strictEqual(summary.ssclLkr, 250);
      assert.strictEqual(summary.vatLkr, 1863);
      assert.strictEqual(summary.grandTotalLkr, 12213);
      assert.strictEqual(summary.approxUsd, 39.4);
    });

    it("handles zero and negative amounts cleanly", () => {
      const summary = calculatePosTaxSummary(0, "DINE_IN");
      assert.strictEqual(summary.grossSubtotalLkr, 0);
      assert.strictEqual(summary.grandTotalLkr, 0);
      assert.strictEqual(summary.approxUsd, 0);

      const summaryNeg = calculatePosTaxSummary(-500, "DINE_IN");
      assert.strictEqual(summaryNeg.grossSubtotalLkr, 0);
      assert.strictEqual(summaryNeg.grandTotalLkr, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Rendering & UI Structure
  // --------------------------------------------------------------------------
  describe("2. React Static Rendering & POS Layout", () => {
    it("renders POS header with terminal info, server name, and sync status", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTerminalView, {
          terminalName: "Beach Cabana POS 02",
          serverName: "Nimal S.",
          isOnline: true,
        }),
      );

      assert.ok(html.includes('data-testid="pos-terminal-view"'));
      assert.ok(html.includes("Restaurant &amp; Bar POS"));
      assert.ok(html.includes("Beach Cabana POS 02"));
      assert.ok(html.includes("Nimal S."));
      assert.ok(html.includes("LIVE SYNC"));
    });

    it("renders category filters and authentic Sri Lankan menu item catalog", () => {
      const html = renderToStaticMarkup(React.createElement(PosTerminalView));

      // Category pills
      assert.ok(html.includes("All Items"));
      assert.ok(html.includes("Mains &amp; Curries"));
      assert.ok(html.includes("Hoppers &amp; Roti"));
      assert.ok(html.includes("Fresh Seafood"));
      assert.ok(html.includes("Short Eats &amp; Bites"));
      assert.ok(html.includes("Bar &amp; Drinks"));

      // Sample dishes
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("Negombo Hot Butter Cuttlefish"));
      assert.ok(html.includes("Chicken Kottu Roti"));
      assert.ok(html.includes("Egg Hopper Set"));
      assert.ok(html.includes("Lion Lager Draught Pint"));
    });

    it("renders active bill side panel with 4 order modes", () => {
      const html = renderToStaticMarkup(React.createElement(PosTerminalView));

      assert.ok(html.includes("Dine-In Table"));
      assert.ok(html.includes("Room Charge"));
      assert.ok(html.includes("Poolside"));
      assert.ok(html.includes("Takeaway"));
      assert.ok(html.includes("No items on active bill"));
      assert.ok(html.includes("Tap any menu item to add"));
    });

    it("renders table map button when onOpenTableMap is passed", () => {
      const noop = () => {
        // no-op
      };
      const html = renderToStaticMarkup(
        React.createElement(PosTerminalView, {
          onOpenTableMap: noop,
        }),
      );

      assert.ok(html.includes("Table Map"));
    });

    it("renders localized interface in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(PosTerminalView, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("ආපනශාලා සහ බාර් POS"));
      assert.ok(htmlSi.includes("සියලුම කෑම"));
      assert.ok(htmlSi.includes("ප්රධාන ආහාර සහ කරි"));
      assert.ok(htmlSi.includes("යාපනය කලපු කකුළු කරිය"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(PosTerminalView, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("உணவகம் &amp; பார் POS"));
      assert.ok(htmlTa.includes("அனைத்து பொருட்கள்"));
      assert.ok(htmlTa.includes("யாழ்ப்பாணம் நண்டு கறி"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Type Safety & Constructible Contracts
  // --------------------------------------------------------------------------
  describe("3. Constructible Domain Types", () => {
    it("validates constructible PosOrderPayload and PosSettlementPayload", () => {
      const cartItem: PosCartItem = {
        id: "cart-01",
        menuItemId: "pos-item-01",
        name: "Jaffna Lagoon Crab Curry",
        station: "KITCHEN",
        unitPriceLkr: 4800,
        quantity: 2,
        notes: "Extra spicy",
      };

      const taxSummary: PosTaxSummary = calculatePosTaxSummary(9600, "DINE_IN");

      const orderPayload: PosOrderPayload = {
        orderId: "ord-test-01",
        orderType: "DINE_IN",
        destination: "Table 04",
        paxCount: 4,
        items: [cartItem],
        taxSummary,
        createdAt: new Date().toISOString(),
      };

      const settlementPayload: PosSettlementPayload = {
        ...orderPayload,
        paymentMethod: "CASH",
        amountTenderedLkr: 15000,
        changeReturnedLkr: 2103.47,
        settledAt: new Date().toISOString(),
      };

      const props: PosTerminalViewProps = {
        initialItems: DEFAULT_POS_MENU_ITEMS,
        isOnline: true,
      };

      assert.strictEqual(orderPayload.paxCount, 4);
      assert.strictEqual(settlementPayload.paymentMethod, "CASH");
      assert.strictEqual(props.isOnline, true);
    });
  });
});
