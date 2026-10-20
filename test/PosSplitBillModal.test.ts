/**
 * Unit Tests for Step 287: POS Bill Split Modal (PosSplitBillModal.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type PosCartItem,
  PosSplitBillModal,
  calculateEqualSplitBills,
  calculateItemSplitBills,
  calculateSeatSplitBills,
} from "../src/staff/pos/index.js";

describe("Step 287: POS Bill Split Modal (PosSplitBillModal.tsx)", () => {
  const sampleItems: readonly PosCartItem[] = [
    {
      id: "cart-1",
      menuItemId: "menu-crab-curry",
      name: "Jaffna Lagoon Crab Curry",
      nameSi: "යාපනය කලපු කකුළු කරිය",
      nameTa: "யாழ்ப்பாண நண்டு கறி",
      unitPriceLkr: 4800,
      quantity: 2,
      station: "KITCHEN",
      seatNumber: 1,
    },
    {
      id: "cart-2",
      menuItemId: "menu-lion-lager",
      name: "Lion Lager 625ml",
      nameSi: "ලයන් ලැගර්",
      nameTa: "லயன் லாகர்",
      unitPriceLkr: 1100,
      quantity: 2,
      station: "BAR",
      seatNumber: 2,
    },
    {
      id: "cart-3",
      menuItemId: "menu-wattalappam",
      name: "Kitul Jaggery Watalappan",
      nameSi: "කිතුල් හකුරු වටලප්පන්",
      nameTa: "கித்துள் வத்தலப்பம்",
      unitPriceLkr: 850,
      quantity: 1,
      station: "KITCHEN",
      seatNumber: 1,
    },
  ];

  const totalBase = sampleItems.reduce((acc, it) => acc + it.unitPriceLkr * it.quantity, 0);
  // 4800*2 = 9600 + 1100*2 = 2200 + 850 = 12650 LKR

  const noop = () => {
    // test no-op
  };

  // --------------------------------------------------------------------------
  // 1. Pure Calculation Functions: Equal Split
  // --------------------------------------------------------------------------
  describe("1. calculateEqualSplitBills (Equal Split Engine)", () => {
    it("splits evenly across 2 diners with penny-perfect sum matching original base", () => {
      const split = calculateEqualSplitBills(totalBase, 2, "DINE_IN");
      assert.strictEqual(split.length, 2);

      const sumBase = split.reduce((acc, b) => acc + b.grossSubtotalLkr, 0);
      assert.strictEqual(Math.round(sumBase * 100) / 100, totalBase);
      assert.strictEqual(split[0]?.grossSubtotalLkr, 6325);
      assert.strictEqual(split[1]?.grossSubtotalLkr, 6325);

      // Verify each split bill has 4-stage tax summary computed
      for (const bill of split) {
        assert.ok(bill.taxSummary.grandTotalLkr > bill.grossSubtotalLkr);
        assert.ok(bill.taxSummary.serviceChargeLkr > 0);
        assert.ok(bill.taxSummary.vatLkr > 0);
      }
    });

    it("splits with remainder cent adjustment across 3 diners", () => {
      // 12650 / 3 = 4216.6666...
      const split = calculateEqualSplitBills(totalBase, 3, "DINE_IN");
      assert.strictEqual(split.length, 3);

      const sumBase = split.reduce((acc, b) => acc + b.grossSubtotalLkr, 0);
      assert.strictEqual(Math.round(sumBase * 100) / 100, totalBase);

      assert.strictEqual(split[0]?.grossSubtotalLkr, 4216.66);
      assert.strictEqual(split[1]?.grossSubtotalLkr, 4216.66);
      assert.strictEqual(split[2]?.grossSubtotalLkr, 4216.68);
    });

    it("clamps diner count safely between 1 and 12", () => {
      const splitMin = calculateEqualSplitBills(5000, 0);
      assert.strictEqual(splitMin.length, 1);
      assert.strictEqual(splitMin[0]?.grossSubtotalLkr, 5000);

      const splitMax = calculateEqualSplitBills(12000, 20);
      assert.strictEqual(splitMax.length, 12);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pure Calculation Functions: Item Split
  // --------------------------------------------------------------------------
  describe("2. calculateItemSplitBills (Custom Item Allocation Engine)", () => {
    it("allocates items to specific sub-bills correctly", () => {
      const assignments: Record<string, string> = {
        "cart-1": "bill-1", // 9600 LKR
        "cart-2": "bill-2", // 2200 LKR
        "cart-3": "bill-2", // 850 LKR
      };

      const bills = calculateItemSplitBills(assignments, sampleItems, 2, "DINE_IN");
      assert.strictEqual(bills.length, 2);

      const billA = bills.find((b) => b.subBillId === "bill-1");
      const billB = bills.find((b) => b.subBillId === "bill-2");

      assert.ok(billA);
      assert.ok(billB);

      assert.strictEqual(billA.grossSubtotalLkr, 9600);
      assert.strictEqual(billB.grossSubtotalLkr, 3050);

      const sumBase = billA.grossSubtotalLkr + billB.grossSubtotalLkr;
      assert.strictEqual(sumBase, totalBase);
      assert.strictEqual(billA.items.length, 1);
      assert.strictEqual(billB.items.length, 2);
    });

    it("defaults unassigned items to bill-1", () => {
      const bills = calculateItemSplitBills({}, sampleItems, 2, "DINE_IN");
      const billA = bills.find((b) => b.subBillId === "bill-1");
      const billB = bills.find((b) => b.subBillId === "bill-2");

      assert.ok(billA);
      assert.ok(billB);
      assert.strictEqual(billA.grossSubtotalLkr, totalBase);
      assert.strictEqual(billB.grossSubtotalLkr, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. React Static Rendering & Apple HIG Modal UI
  // --------------------------------------------------------------------------
  describe("3. React Static Rendering & UI Components", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosSplitBillModal, {
          isOpen: false,
          onClose: noop,
          orderItems: sampleItems,
          onConfirmSplit: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders dialog with apple liquid glass modal when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosSplitBillModal, {
          isOpen: true,
          onClose: noop,
          orderItems: sampleItems,
          destination: "Table 04",
          onConfirmSplit: noop,
        }),
      );

      assert.ok(html.includes("dialog"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("Split Restaurant Table Bill"));
      assert.ok(html.includes("Table 04"));
      assert.ok(html.includes("Equal Split"));
      assert.ok(html.includes("Split by Item"));
      assert.ok(html.includes("Split by Seat"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("Split 1 of 2"));
      assert.ok(html.includes("Split 2 of 2"));
    });

    it("renders items when calculateItemSplitBills or seat split is called", () => {
      const seatBills = calculateSeatSplitBills(sampleItems, "DINE_IN");
      assert.strictEqual(seatBills.length, 2);
      assert.strictEqual(seatBills[0]?.label, "Seat 1");
      assert.strictEqual(seatBills[1]?.label, "Seat 2");
      assert.strictEqual(seatBills[0]?.items.length, 2); // crab curry & watalappan
      assert.strictEqual(seatBills[1]?.items.length, 1); // lion beer
    });

    it("supports Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosSplitBillModal, {
          isOpen: true,
          onClose: noop,
          orderItems: sampleItems,
          language: "si",
          onConfirmSplit: noop,
        }),
      );

      assert.ok(html.includes("ආපනශාලා බිල්පත බෙදීම"));
      assert.ok(html.includes("සමානව බෙදීම"));
      assert.ok(html.includes("කෑම අනුව බෙදීම"));
    });

    it("supports Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosSplitBillModal, {
          isOpen: true,
          onClose: noop,
          orderItems: sampleItems,
          language: "ta",
          onConfirmSplit: noop,
        }),
      );

      assert.ok(html.includes("உணவக பில்லைப் பிரித்தல்"));
      assert.ok(html.includes("சமமாக பிரித்தல்"));
      assert.ok(html.includes("உணவு வாரியாக"));
    });
  });
});
