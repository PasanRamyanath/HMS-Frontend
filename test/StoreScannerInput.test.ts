import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_STORE_SKU_CATALOG,
  STORE_SCANNER_TRANSLATIONS,
  type StagedScanLine,
  StoreScannerInput,
  calculateStagedTotals,
  detectKeyboardWedgePattern,
  formatLkr,
  matchBarcodeOrSku,
} from "../src/admin/inventory/StoreScannerInput.js";

describe("Step 394: Smartphone Storekeeper Barcode / QR Scanner Input", () => {
  describe("1. Pure Math & Barcode Matching Logic", () => {
    it("calculates exact totals for staged inventory lines", () => {
      const item0 = DEFAULT_STORE_SKU_CATALOG[0];
      const item2 = DEFAULT_STORE_SKU_CATALOG[2];
      assert.ok(item0);
      assert.ok(item2);

      const mockLines: StagedScanLine[] = [
        {
          lineId: "line-1",
          item: item0, // 340 LKR
          quantity: 20, // 20 * 340 = 6,800
          unitCostLkr: 340,
          expiryDate: "2027-01-01",
          scannedAt: "2026-10-20T10:00:00Z",
          notes: "",
        },
        {
          lineId: "line-2",
          item: item2, // 4,250 LKR
          quantity: 4, // 4 * 4,250 = 17,000
          unitCostLkr: 4250,
          expiryDate: null,
          scannedAt: "2026-10-20T10:05:00Z",
          notes: "",
        },
      ];

      const totals = calculateStagedTotals(mockLines);
      assert.strictEqual(totals.totalLineCount, 2);
      assert.strictEqual(totals.totalItemQuantity, 24);
      assert.strictEqual(totals.totalValuationLkr, 23800);
    });

    it("handles empty staged lines cleanly", () => {
      const totals = calculateStagedTotals([]);
      assert.strictEqual(totals.totalLineCount, 0);
      assert.strictEqual(totals.totalItemQuantity, 0);
      assert.strictEqual(totals.totalValuationLkr, 0);
    });

    it("matches catalog item by exact EAN-13 barcode", () => {
      const matched = matchBarcodeOrSku("4792011003456", DEFAULT_STORE_SKU_CATALOG);
      assert.ok(matched);
      assert.strictEqual(matched?.sku, "LIQ-ARRACK-0750");
      assert.strictEqual(matched?.name, "Rockland Old Arrack Extra Fine 750ml");
    });

    it("matches catalog item by exact SKU code", () => {
      const matched = matchBarcodeOrSku("DRY-BASMATI-001", DEFAULT_STORE_SKU_CATALOG);
      assert.ok(matched);
      assert.strictEqual(matched?.barcode, "4792011001234");
    });

    it("matches catalog item case-insensitively with whitespace", () => {
      const matched = matchBarcodeOrSku("  bev-lion-keg30  ", DEFAULT_STORE_SKU_CATALOG);
      assert.ok(matched);
      assert.strictEqual(matched?.sku, "BEV-LION-KEG30");
    });

    it("matches catalog item by partial trade name", () => {
      const matched = matchBarcodeOrSku("Cinnamon Quills", DEFAULT_STORE_SKU_CATALOG);
      assert.ok(matched);
      assert.strictEqual(matched?.sku, "SPICE-CINNAMON-002");
    });

    it("returns null when no barcode or SKU matches query", () => {
      const matched = matchBarcodeOrSku("NONEXISTENT-999", DEFAULT_STORE_SKU_CATALOG);
      assert.strictEqual(matched, null);

      const empty = matchBarcodeOrSku("   ", DEFAULT_STORE_SKU_CATALOG);
      assert.strictEqual(empty, null);
    });

    it("detects rapid keystrokes characteristic of a hardware barcode wedge scanner", () => {
      // 13 keystrokes with ~15ms intervals
      const fastIntervals = [15, 12, 14, 18, 11, 16, 13, 15, 12, 14, 13, 15];
      assert.strictEqual(detectKeyboardWedgePattern(fastIntervals), true);

      // Human manual typing with ~180ms intervals
      const slowIntervals = [180, 220, 150, 300, 190];
      assert.strictEqual(detectKeyboardWedgePattern(slowIntervals), false);

      // Insufficient keystrokes
      assert.strictEqual(detectKeyboardWedgePattern([20, 20]), false);
    });

    it("formats LKR currency strings with Rs. symbol and two decimal places", () => {
      assert.strictEqual(formatLkr(1250), "Rs. 1,250.00");
      assert.strictEqual(formatLkr(0), "Rs. 0.00");
      assert.strictEqual(formatLkr(98500.5), "Rs. 98,500.50");
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = STORE_SCANNER_TRANSLATIONS[lang];
        assert.ok(dict.title, `Missing title in ${lang}`);
        assert.ok(dict.subtitle, `Missing subtitle in ${lang}`);
        assert.ok(dict.modes.camera, `Missing mode camera in ${lang}`);
        assert.ok(dict.modes.wedge, `Missing mode wedge in ${lang}`);
        assert.ok(dict.modes.manual, `Missing mode manual in ${lang}`);
        assert.ok(dict.transactions.GRN_INTAKE, `Missing GRN in ${lang}`);
        assert.ok(dict.transactions.GIN_TRANSFER, `Missing GIN in ${lang}`);
        assert.ok(dict.transactions.STOCK_AUDIT, `Missing Audit in ${lang}`);
        assert.ok(dict.qtyStepper, `Missing qtyStepper in ${lang}`);
        assert.ok(dict.unitCost, `Missing unitCost in ${lang}`);
        assert.ok(dict.commitBatch, `Missing commitBatch in ${lang}`);
        assert.ok(dict.emptyQueueMsg, `Missing emptyQueueMsg in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders default keyboard wedge scanner view with header, active item card, and staging list", () => {
      const html = renderToStaticMarkup(React.createElement(StoreScannerInput, {}));

      assert.ok(
        html.includes("Storekeeper Barcode &amp; QR Scanner") ||
          html.includes("Storekeeper Barcode & QR Scanner"),
      );
      assert.ok(html.includes("GRN Goods Receipt"));
      assert.ok(html.includes("GIN Kitchen Issue"));
      assert.ok(html.includes("Wedge / Gun"));
      assert.ok(html.includes("Ready for USB / Bluetooth barcode scanner trigger"));
      assert.ok(html.includes("Araliya Keeri Samba / Basmati Rice"));
      assert.ok(html.includes("DRY-BASMATI-001"));
      assert.ok(html.includes("Commit Batch to Store"));
    });

    it("renders in CAMERA mode with scanning reticle and torch button", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreScannerInput, {
          defaultMode: "CAMERA",
        }),
      );

      assert.ok(html.includes("Align Barcode or LankaQR inside optical frame"));
      assert.ok(html.includes("Flash"));
      assert.ok(html.includes("Quick Demo Barcodes:"));
    });

    it("renders in MANUAL_SEARCH mode with search input and filtered catalog", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreScannerInput, {
          defaultMode: "MANUAL_SEARCH",
        }),
      );

      assert.ok(html.includes("Type item name, SKU code, or EAN barcode..."));
      assert.ok(html.includes("Pure Ceylon Cinnamon Quills Grade ALBA"));
      assert.ok(html.includes("Lion Lager Draught Beer Keg 30 Liters"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreScannerInput, {
          language: "si",
        }),
      );

      assert.ok(html.includes("ගබඩා භාරකරු තීරුකේත (Barcode) සහ QR ස්කෑනරය"));
      assert.ok(html.includes("GRN භාණ්ඩ ලැබීම"));
      assert.ok(html.includes("GIN මුළුතැන්ගෙයි නිකුතුව"));
      assert.ok(html.includes("ගබඩාවට ඇතුළත් කරන්න"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreScannerInput, {
          language: "ta",
        }),
      );

      assert.ok(
        html.includes("களஞ்சிய காப்பாளர் பார்கோடு &amp; QR ஸ்கேனர்") ||
          html.includes("களஞ்சிய காப்பாளர் பார்கோடு & QR ஸ்கேனர்"),
      );
      assert.ok(html.includes("GRN பொருட்கள் பெறுதல்"));
      assert.ok(html.includes("களஞ்சியத்தில் சேமிக்கவும்"));
    });

    it("renders pre-populated staged inventory lines with valuation totals", () => {
      const arrackItem = DEFAULT_STORE_SKU_CATALOG[2];
      assert.ok(arrackItem);

      const stagedLines: StagedScanLine[] = [
        {
          lineId: "line-test-01",
          item: arrackItem, // Rockland Arrack 4250 LKR
          quantity: 10,
          unitCostLkr: 4250,
          expiryDate: "2028-06-30",
          scannedAt: "2026-10-20T12:00:00Z",
          notes: "Store receiving dock",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(StoreScannerInput, {
          initialStagedLines: stagedLines,
        }),
      );

      assert.ok(html.includes("Rockland Old Arrack Extra Fine 750ml"));
      assert.ok(html.includes("LIQ-ARRACK-0750"));
      assert.ok(html.includes("Rs. 42,500.00"));
      assert.ok(html.includes("Exp: 2028-06-30"));
    });
  });
});
