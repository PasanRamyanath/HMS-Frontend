import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CategorySalesSummary,
  DEFAULT_SHIFT_SUMMARY,
  PosZReadModal,
  type ShiftReportSummary,
  Z_READ_TRANSLATIONS,
  calculateCashDrawerVariance,
  computeCategorySalesPercentages,
  formatShiftTimestamp,
  generateZReportThermalSlip,
  getPaymentMethodLabel,
  getReportModeLabel,
  verifyZReadManagerPin,
} from "../src/staff/pos/PosZReadModal.js";

describe("Step 294: PosZReadModal — Restaurant Outlet Daily X-Read & Z-Read End-of-Shift Summary", () => {
  describe("1. Pure Financial & Cash Drawer Balancing Engine", () => {
    it("calculates expected cash in drawer and variance correctly for balanced drawer", () => {
      // Opening 25000 + Cash Sales 19519.45 - Paid Outs 2500 = 42019.45
      const result = calculateCashDrawerVariance(25000, 19519.45, 2500, 42019.45);
      assert.strictEqual(result.expected, 42019.45);
      assert.strictEqual(result.variance, 0);
    });

    it("detects cash shortage when actual counted cash is less than expected", () => {
      // Expected: 42019.45, Actual: 41500 -> Shortage of -519.45
      const result = calculateCashDrawerVariance(25000, 19519.45, 2500, 41500);
      assert.strictEqual(result.expected, 42019.45);
      assert.strictEqual(result.variance, -519.45);
    });

    it("detects cash surplus when actual counted cash exceeds expected", () => {
      // Expected: 42019.45, Actual: 42500 -> Overage of +480.55
      const result = calculateCashDrawerVariance(25000, 19519.45, 2500, 42500);
      assert.strictEqual(result.expected, 42019.45);
      assert.strictEqual(result.variance, 480.55);
    });

    it("computes category sales percentages accurately and handles zero total", () => {
      const categories: readonly CategorySalesSummary[] = [
        { category: "FOOD", itemCount: 10, netAmountLkr: 60000, percentage: 0 },
        { category: "BEVERAGE", itemCount: 5, netAmountLkr: 40000, percentage: 0 },
      ];

      const computed = computeCategorySalesPercentages(categories);
      assert.strictEqual(computed[0]?.percentage, 60);
      assert.strictEqual(computed[1]?.percentage, 40);

      // Edge case: zero net
      const zeroCategories: readonly CategorySalesSummary[] = [
        { category: "FOOD", itemCount: 0, netAmountLkr: 0, percentage: 0 },
      ];
      const zeroComputed = computeCategorySalesPercentages(zeroCategories);
      assert.strictEqual(zeroComputed[0]?.percentage, 0);
    });
  });

  describe("2. Manager Authorization & Timestamp Utilities", () => {
    it("validates manager PIN correctly", () => {
      assert.strictEqual(verifyZReadManagerPin("8899", "8899"), true);
      assert.strictEqual(verifyZReadManagerPin("  8899  ", "8899"), true);
      assert.strictEqual(verifyZReadManagerPin("1234", "8899"), false);
      assert.strictEqual(verifyZReadManagerPin("", "8899"), false);
    });

    it("formats ISO shift timestamps cleanly for 80mm thermal printers", () => {
      assert.strictEqual(formatShiftTimestamp("2026-10-20T06:30:00Z"), "2026-10-20 06:30");
      assert.strictEqual(formatShiftTimestamp("2026-10-20T15:45:22Z"), "2026-10-20 15:45");
      assert.strictEqual(formatShiftTimestamp(""), "N/A");
    });
  });

  describe("3. Sri Lankan Statutory Taxes & 80mm Thermal Slip Generation", () => {
    it("generates complete 80mm thermal ASCII Z-Report with 4-stage tax compounding", () => {
      const slip = generateZReportThermalSlip(DEFAULT_SHIFT_SUMMARY);

      assert.ok(slip.includes("*** Z-READING (CLOSING) ***"));
      assert.ok(slip.includes("REPORT SEQUENCE:  Z-0084"));
      assert.ok(slip.includes("TERMINAL ID:      POS-01 (Main Dining)"));
      assert.ok(slip.includes("CASHIER:          Kavinda Wickramasinghe"));
      assert.ok(slip.includes("FOOD & MAINS"));
      assert.ok(slip.includes("BEVERAGES & COCKTAILS"));
      assert.ok(slip.includes("10% SERVICE CHARGE (SC):"));
      assert.ok(slip.includes("1% TOURISM DEV LEVY (TDL):"));
      assert.ok(slip.includes("2.5% SOCIAL SEC LEVY (SSCL):"));
      assert.ok(slip.includes("18% VALUE ADDED TAX (VAT):"));
      assert.ok(slip.includes("GROSS REVENUE:"));
      assert.ok(slip.includes("ROOM_FOLIO"));
      assert.ok(slip.includes("LANKA_QR"));
      assert.ok(slip.includes("ACTUAL COUNTED CASH:"));
      assert.ok(slip.includes("MANAGER SIGNATURE:"));
    });

    it("generates 80mm thermal ASCII X-Report for mid-shift inquiries", () => {
      const xSummary: ShiftReportSummary = {
        ...DEFAULT_SHIFT_SUMMARY,
        reportType: "X_READ",
        reportSequenceNumber: "X-0142",
      };

      const slip = generateZReportThermalSlip(xSummary);
      assert.ok(slip.includes("*** X-READING (INQUIRY) ***"));
      assert.ok(slip.includes("REPORT SEQUENCE:  X-0142"));
    });
  });

  describe("4. Trilingual Localization Labels", () => {
    it("returns trilingual labels for report modes", () => {
      assert.strictEqual(getReportModeLabel("X_READ", "en"), "X-Reading (Mid-Shift Inquiry)");
      assert.strictEqual(getReportModeLabel("X_READ", "si"), "X-වාර්තාව (විමසුම)");
      assert.strictEqual(getReportModeLabel("X_READ", "ta"), "X-அறிக்கை (விசாரணை)");

      assert.strictEqual(getReportModeLabel("Z_READ", "en"), "Z-Reading (Shift Closing Report)");
      assert.strictEqual(getReportModeLabel("Z_READ", "si"), "Z-වාර්තාව (අවසන් වැසීම)");
      assert.strictEqual(getReportModeLabel("Z_READ", "ta"), "Z-அறிக்கை (இறுதி மூடல்)");
    });

    it("returns trilingual labels for tender payment channels", () => {
      assert.strictEqual(getPaymentMethodLabel("ROOM_FOLIO", "en"), "Room Folio Postings");
      assert.strictEqual(getPaymentMethodLabel("ROOM_FOLIO", "si"), "කාමර ගිණුමට පැවරීම්");
      assert.strictEqual(getPaymentMethodLabel("ROOM_FOLIO", "ta"), "அறை கணக்கு");

      assert.strictEqual(getPaymentMethodLabel("LANKA_QR", "en"), "CBSL LankaQR");
      assert.strictEqual(getPaymentMethodLabel("LANKA_QR", "si"), "CBSL ලංකා QR");
      assert.strictEqual(getPaymentMethodLabel("LANKA_QR", "ta"), "லங்கா QR");
    });
  });

  describe("5. React Component Rendering & Apple HIG Verification", () => {
    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosZReadModal, {
          isOpen: false,
          onClose: () => undefined,
          onCommitZRead: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal dialog with Apple Liquid Glass and both X/Z mode tabs when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosZReadModal, {
          isOpen: true,
          onClose: () => undefined,
          onCommitZRead: () => undefined,
          language: "en",
        }),
      );

      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("Restaurant Shift Financial Summary"));
      assert.ok(html.includes("X-Read (Inquiry)"));
      assert.ok(html.includes("Z-Read (Closing)"));
      assert.ok(html.includes("Gross Revenue"));
      assert.ok(html.includes("Cash Drawer Reconciliation"));
      assert.ok(html.includes("Kavinda Wickramasinghe"));
    });

    it("renders trilingual modal in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(PosZReadModal, {
          isOpen: true,
          onClose: () => undefined,
          onCommitZRead: () => undefined,
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes(Z_READ_TRANSLATIONS.si.modalTitle));
      assert.ok(htmlSi.includes(Z_READ_TRANSLATIONS.si.tabZRead));

      const htmlTa = renderToStaticMarkup(
        React.createElement(PosZReadModal, {
          isOpen: true,
          onClose: () => undefined,
          onCommitZRead: () => undefined,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes(Z_READ_TRANSLATIONS.ta.modalTitle));
      assert.ok(htmlTa.includes(Z_READ_TRANSLATIONS.ta.tabZRead));
    });
  });
});
