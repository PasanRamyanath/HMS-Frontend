/**
 * Unit Tests for Step 288: POS Quick Cash, Card, LankaQR & Room Folio Tender Panel (PosTenderModal.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LKR_CASH_DENOMINATIONS,
  type PosCartItem,
  type PosTaxSummary,
  PosTenderModal,
  SRI_LANKAN_CARD_BANKS,
  calculateCashChange,
  calculatePosTaxSummary,
  formatReceiptTimestamp,
  generateReceiptNumber,
} from "../src/staff/pos/index.js";

describe("Step 288: POS Quick Cash, Card, LankaQR & Room Folio Tender Panel (PosTenderModal.tsx)", () => {
  const sampleTaxSummary: PosTaxSummary = calculatePosTaxSummary(10000, "DINE_IN", 310);
  const sampleItems: readonly PosCartItem[] = [
    {
      id: "item-1",
      menuItemId: "menu-crab-curry",
      name: "Jaffna Lagoon Crab Curry",
      unitPriceLkr: 5000,
      quantity: 2,
      station: "KITCHEN",
    },
  ];

  const noop = () => {
    // test no-op
  };

  // --------------------------------------------------------------------------
  // 1. Pure Cash & Currency Calculation Functions
  // --------------------------------------------------------------------------
  describe("1. calculateCashChange & Cash Utilities", () => {
    it("handles exact cash tender correctly", () => {
      const calc = calculateCashChange(12650, 12650);
      assert.strictEqual(calc.changeLkr, 0);
      assert.strictEqual(calc.shortageLkr, 0);
      assert.strictEqual(calc.isExact, true);
      assert.strictEqual(calc.isSufficient, true);
    });

    it("calculates positive change when tendered exceeds total", () => {
      const calc = calculateCashChange(15000, 12650.5);
      assert.strictEqual(calc.changeLkr, 2349.5);
      assert.strictEqual(calc.shortageLkr, 0);
      assert.strictEqual(calc.isExact, false);
      assert.strictEqual(calc.isSufficient, true);
    });

    it("calculates balance shortage when tendered is less than total", () => {
      const calc = calculateCashChange(10000, 12650);
      assert.strictEqual(calc.changeLkr, 0);
      assert.strictEqual(calc.shortageLkr, 2650);
      assert.strictEqual(calc.isExact, false);
      assert.strictEqual(calc.isSufficient, false);
    });

    it("clamps negative tendered amounts to zero", () => {
      const calc = calculateCashChange(-500, 5000);
      assert.strictEqual(calc.tenderedLkr, 0);
      assert.strictEqual(calc.shortageLkr, 5000);
      assert.strictEqual(calc.isSufficient, false);
    });

    it("defines authentic Sri Lankan cash denominations", () => {
      assert.deepStrictEqual(LKR_CASH_DENOMINATIONS, [500, 1000, 2000, 5000]);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Receipt Generation & Date Formatters
  // --------------------------------------------------------------------------
  describe("2. Receipt & Banking Metadata", () => {
    it("generates 80mm thermal receipt identification numbers", () => {
      const rec = generateReceiptNumber("ord-table04-987654");
      assert.strictEqual(rec, "REC-987654");

      const recShort = generateReceiptNumber("abc");
      assert.strictEqual(recShort, "REC-000ABC");
    });

    it("formats receipt timestamp strings into standard date-time", () => {
      const fixedDate = new Date("2026-10-20T14:30:00.000Z");
      const formatted = formatReceiptTimestamp(fixedDate);
      assert.strictEqual(formatted, "2026-10-20 14:30:00");

      const current = formatReceiptTimestamp();
      assert.ok(current.length >= 19);
    });

    it("includes major Sri Lankan card acquiring banks and POS providers", () => {
      assert.strictEqual(SRI_LANKAN_CARD_BANKS.length, 5);
      const bankIds = SRI_LANKAN_CARD_BANKS.map((b) => b.id);
      assert.ok(bankIds.includes("COMMERCIAL_BANK"));
      assert.ok(bankIds.includes("SAMPATH_BANK"));
      assert.ok(bankIds.includes("HNB"));
      assert.ok(bankIds.includes("SEYLAN_BANK"));
      assert.ok(bankIds.includes("DIALOG_GENIE"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. React Static Rendering & Apple HIG Modal UI
  // --------------------------------------------------------------------------
  describe("3. React Static Rendering & Apple HIG UI", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTenderModal, {
          isOpen: false,
          onClose: noop,
          orderId: "ord-test-1",
          destination: "Table 04",
          grandTotalLkr: sampleTaxSummary.grandTotalLkr,
          taxSummary: sampleTaxSummary,
          onConfirmSettlement: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders dialog with apple liquid glass modal when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTenderModal, {
          isOpen: true,
          onClose: noop,
          orderId: "ord-test-101",
          destination: "Table 04",
          grandTotalLkr: sampleTaxSummary.grandTotalLkr,
          taxSummary: sampleTaxSummary,
          items: sampleItems,
          hotelName: "Ceylon Cloud Resort",
          onConfirmSettlement: noop,
        }),
      );

      assert.ok(html.includes("dialog"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("Tender Payment Settlement"));
      assert.ok(html.includes("Table 04"));
      assert.ok(html.includes("REC-EST101") || html.includes("REC-"));
      assert.ok(html.includes("Cash"));
      assert.ok(html.includes("Card POS"));
      assert.ok(html.includes("LankaQR"));
      assert.ok(html.includes("Room Charge"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("Exact Total"));
      assert.ok(html.includes("+Rs 500"));
      assert.ok(html.includes("+Rs 1,000"));
      assert.ok(html.includes("+Rs 5,000"));
      assert.ok(html.includes("Print 80mm Receipt"));
      assert.ok(
        html.includes("Complete &amp; Settle Bill") || html.includes("Complete & Settle Bill"),
      );

      // 80mm Thermal Receipt section
      assert.ok(html.includes("pos-thermal-receipt-80mm"));
      assert.ok(html.includes("Ceylon Cloud Resort"));
      assert.ok(html.includes("Jaffna Lagoon Crab Curry"));
      assert.ok(html.includes("SERVICE CHG (10%):"));
      assert.ok(html.includes("VAT (18%):"));
    });

    it("supports Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTenderModal, {
          isOpen: true,
          onClose: noop,
          orderId: "ord-test-102",
          destination: "Table 04",
          grandTotalLkr: sampleTaxSummary.grandTotalLkr,
          taxSummary: sampleTaxSummary,
          language: "si",
          onConfirmSettlement: noop,
        }),
      );

      assert.ok(html.includes("ගෙවීම් බේරුම්කරණය"));
      assert.ok(html.includes("මුදල්"));
      assert.ok(html.includes("කාඩ්පත්"));
      assert.ok(html.includes("ලංකා කිව්ආර්"));
      assert.ok(html.includes("කාමර ගිණුමට"));
      assert.ok(html.includes("නියමිත මුදල"));
      assert.ok(html.includes("බිල්පත බේරුම් කරන්න"));
    });

    it("supports Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTenderModal, {
          isOpen: true,
          onClose: noop,
          orderId: "ord-test-103",
          destination: "Table 04",
          grandTotalLkr: sampleTaxSummary.grandTotalLkr,
          taxSummary: sampleTaxSummary,
          language: "ta",
          onConfirmSettlement: noop,
        }),
      );

      assert.ok(html.includes("கட்டண தீர்வு"));
      assert.ok(html.includes("பணம்"));
      assert.ok(html.includes("அட்டை"));
      assert.ok(html.includes("லங்கா கியூஆர்"));
      assert.ok(html.includes("அறை கட்டணம்"));
      assert.ok(html.includes("சரியான தொகை"));
      assert.ok(html.includes("பில் தீர்க்கவும்"));
    });
  });
});
