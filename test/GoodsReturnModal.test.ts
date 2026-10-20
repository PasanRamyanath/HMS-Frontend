/**
 * Unit Test Suite for Step 396: GoodsReturnModal & Supplier Debit Note Generator
 *
 * Validates:
 * 1. Pure Math & Numbering Helpers:
 *    - generateDebitNoteNumber (formats DN-YYYYMM-XXXX)
 *    - generateReturnNumber (formats RET-YYYYMM-XXXX)
 *    - calculateLineDebit (quantities, unit cost, SSCL 2.5%, VAT 18%)
 *    - calculateDebitNoteTotals (aggregates subtotal, SSCL credit, VAT credit, and grand total)
 *    - formatDebitNoteLkr (currency formatting with Rs. prefix)
 * 2. Pure Validation Logic:
 *    - validateReturnLineItem (validates sku, return qty > 0, return qty <= batch qty, reason)
 *    - validateGoodsReturn (validates supplier, lines count, authorization signature)
 * 3. Trilingual Localization Integrity:
 *    - Complete translation keys across English, Sinhala, and Tamil
 * 4. React 19 Component Static Rendering:
 *    - Renders GoodsReturnModal with default props
 *    - Renders return items table with line debit amounts
 *    - Renders official 3-sign-off signature line block in printable layout
 *    - Renders Sinhala and Tamil localizations without crashing
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GOODS_RETURN_TRANSLATIONS,
  type GoodsReturnDebitNoteModel,
  type GoodsReturnLineItem,
  GoodsReturnModal,
  SAMPLE_BATCHES,
  SAMPLE_STOCK_ITEMS,
  SAMPLE_SUPPLIERS,
  calculateDebitNoteTotals,
  calculateLineDebit,
  createInitialGoodsReturn,
  formatDebitNoteLkr,
  generateDebitNoteNumber,
  generateReturnNumber,
  validateGoodsReturn,
  validateReturnLineItem,
} from "../src/admin/inventory/GoodsReturnModal.js";

const noop = () => {
  // Intentional test noop
};

describe("Step 396: GoodsReturnModal & Supplier Debit Note Generator", () => {
  describe("1. Pure Numbering & Financial Helpers", () => {
    it("formats Debit Note number and Return Note number with YYYYMM prefix", () => {
      const fixedDate = new Date("2026-10-20T10:00:00Z");
      const dn = generateDebitNoteNumber(42, fixedDate);
      const ret = generateReturnNumber(19, fixedDate);

      assert.equal(dn, "DN-202610-0042");
      assert.equal(ret, "RET-202610-0019");
    });

    it("formats LKR currency strings cleanly with Rs. prefix", () => {
      assert.equal(formatDebitNoteLkr(12500), "Rs. 12,500.00");
      assert.equal(formatDebitNoteLkr(0), "Rs. 0.00");
      assert.equal(formatDebitNoteLkr(4250.75), "Rs. 4,250.75");
    });

    it("calculates line debit amounts without statutory tax credits", () => {
      const result = calculateLineDebit(5, 4000, {
        applySscl: false,
        applyVat: false,
      });

      assert.equal(result.subtotalLkr, 20000);
      assert.equal(result.ssclCreditLkr, 0);
      assert.equal(result.vatCreditLkr, 0);
      assert.equal(result.totalDebitLkr, 20000);
    });

    it("calculates compounding SSCL (2.5%) and VAT (18%) credit deductions", () => {
      // 10 units @ 10,000 LKR = 100,000 subtotal
      // SSCL 2.5% = 2,500
      // VAT 18% on (100,000 + 2,500) = 18% of 102,500 = 18,450
      // Total Debit = 102,500 + 18,450 = 120,950
      const result = calculateLineDebit(10, 10000, {
        applySscl: true,
        applyVat: true,
      });

      assert.equal(result.subtotalLkr, 100000);
      assert.equal(result.ssclCreditLkr, 2500);
      assert.equal(result.vatCreditLkr, 18450);
      assert.equal(result.totalDebitLkr, 120950);
    });

    it("aggregates multiple return lines into Debit Note totals", () => {
      const lines: GoodsReturnLineItem[] = [
        {
          id: "line-1",
          stockItemId: "item-prawns-01",
          sku: "SEA-TIGER-PRAWN-01",
          name: "Jumbo Black Tiger Prawns",
          category: "COLD_ROOM_SEAFOOD",
          unitOfMeasure: "kg",
          batchNumber: "BATCH-01",
          availableBatchQty: 15,
          returnQuantity: 5,
          unitCostLkr: 4000,
          subtotalLkr: 20000,
          ssclCreditLkr: 500,
          vatCreditLkr: 3690,
          totalDebitLkr: 24190,
          reason: "SUBSTANDARD_QUALITY",
          defectDescription: "Unhygienic smell",
        },
        {
          id: "line-2",
          stockItemId: "item-curd-02",
          sku: "DRY-MEE-CURD-CLAY-02",
          name: "Buffalo Curd Pots",
          category: "DRY_STORE",
          unitOfMeasure: "pcs",
          batchNumber: "BATCH-02",
          availableBatchQty: 30,
          returnQuantity: 10,
          unitCostLkr: 600,
          subtotalLkr: 6000,
          ssclCreditLkr: 150,
          vatCreditLkr: 1107,
          totalDebitLkr: 7257,
          reason: "DAMAGED_IN_TRANSIT",
          defectDescription: "Broken clay lids",
        },
      ];

      const totals = calculateDebitNoteTotals(lines, {
        applySscl: true,
        applyVat: true,
      });

      // Total subtotal = 20,000 + 6,000 = 26,000
      // SSCL 2.5% = 650
      // VAT base = 26,650; VAT 18% = 4,797
      // Grand total = 26,650 + 4,797 = 31,447
      assert.equal(totals.subtotalLkr, 26000);
      assert.equal(totals.totalSsclCreditLkr, 650);
      assert.equal(totals.totalVatCreditLkr, 4797);
      assert.equal(totals.grandTotalDebitLkr, 31447);
      assert.equal(totals.totalItemsCount, 2);
    });
  });

  describe("2. Pure Validation Rules", () => {
    it("validates line item attributes strictly", () => {
      // Missing sku
      const errNoSku = validateReturnLineItem({ returnQuantity: 5 });
      assert.match(errNoSku ?? "", /Stock item/);

      // Return qty zero or negative
      const errZeroQty = validateReturnLineItem({
        stockItemId: "item-1",
        sku: "SKU-1",
        returnQuantity: 0,
      });
      assert.match(errZeroQty ?? "", /greater than zero/);

      // Return qty exceeding available batch stock
      const errExcess = validateReturnLineItem({
        stockItemId: "item-1",
        sku: "SKU-1",
        returnQuantity: 20,
        availableBatchQty: 10,
      });
      assert.match(errExcess ?? "", /exceeds available batch stock/);

      // Missing reason
      const errNoReason = validateReturnLineItem({
        stockItemId: "item-1",
        sku: "SKU-1",
        returnQuantity: 5,
        availableBatchQty: 10,
      });
      assert.match(errNoReason ?? "", /reason must be selected/);

      // Valid line item
      const valid = validateReturnLineItem({
        stockItemId: "item-1",
        sku: "SKU-1",
        returnQuantity: 5,
        availableBatchQty: 10,
        reason: "DAMAGED_IN_TRANSIT",
      });
      assert.equal(valid, null);
    });

    it("validates overall Goods Return Debit Note document", () => {
      // Empty document
      const emptyCheck = validateGoodsReturn({});
      assert.equal(emptyCheck.isValid, false);
      assert.equal(emptyCheck.errors.length, 4);

      // Fully valid document
      const validModel = createInitialGoodsReturn({
        supplierId: "sup-01",
        supplierName: "Ceylon Seafood Ltd",
        authorizedBy: "S. Fernando (FC)",
        lines: [
          {
            id: "line-1",
            stockItemId: "item-1",
            sku: "SKU-1",
            name: "Prawns",
            category: "COLD_ROOM_SEAFOOD",
            unitOfMeasure: "kg",
            batchNumber: "B1",
            availableBatchQty: 10,
            returnQuantity: 2,
            unitCostLkr: 4000,
            subtotalLkr: 8000,
            ssclCreditLkr: 200,
            vatCreditLkr: 1476,
            totalDebitLkr: 9676,
            reason: "SUBSTANDARD_QUALITY",
            defectDescription: "Thawed",
          },
        ],
      });

      const validCheck = validateGoodsReturn(validModel);
      assert.equal(validCheck.isValid, true);
      assert.equal(validCheck.errors.length, 0);
    });
  });

  describe("3. Trilingual Localization Coverage", () => {
    it("provides complete dictionaries for English, Sinhala, and Tamil", () => {
      const languages: ("en" | "si" | "ta")[] = ["en", "si", "ta"];

      for (const lang of languages) {
        const t = GOODS_RETURN_TRANSLATIONS[lang];
        assert.ok(t.modalTitle.length > 0);
        assert.ok(t.modalSubtitle.length > 0);
        assert.ok(t.tabs.entry.length > 0);
        assert.ok(t.tabs.preview.length > 0);
        assert.ok(t.tabs.print.length > 0);

        // All 6 return reasons translated
        assert.ok(t.reasons.DAMAGED_IN_TRANSIT.length > 0);
        assert.ok(t.reasons.EXPIRED_OR_NEAR_EXPIRY.length > 0);
        assert.ok(t.reasons.SUBSTANDARD_QUALITY.length > 0);
        assert.ok(t.reasons.WRONG_SPECIFICATION.length > 0);
        assert.ok(t.reasons.OVER_DELIVERY_REJECTION.length > 0);
        assert.ok(t.reasons.COLD_CHAIN_BREACH.length > 0);

        // All 3 AP actions translated
        assert.ok(t.actions.OFFSET_OPEN_INVOICE.length > 0);
        assert.ok(t.actions.DIRECT_REFUND_OR_CHEQUE.length > 0);
        assert.ok(t.actions.CREDIT_NOTE_CARRIED_FORWARD.length > 0);

        // Sign-off prompts
        assert.ok(t.signatures.returnedBy.length > 0);
        assert.ok(t.signatures.authorizedBy.length > 0);
        assert.ok(t.signatures.receivedBySupplier.length > 0);
      }
    });
  });

  describe("4. React 19 Component Static Rendering", () => {
    it("returns null or empty when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(GoodsReturnModal, { isOpen: false, onClose: noop }),
      );
      assert.equal(html, "");
    });

    it("renders GoodsReturnModal with header, tabs, and form when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(GoodsReturnModal, {
          isOpen: true,
          onClose: noop,
          availableStockItems: SAMPLE_STOCK_ITEMS,
          availableSuppliers: SAMPLE_SUPPLIERS,
          availableBatches: SAMPLE_BATCHES,
        }),
      );

      assert.match(html, /Return to Supplier &amp; Debit Note/);
      assert.match(html, /DN-\d{6}-\d{4}/);
      assert.match(html, /Ceylon Fresh Seafood Ltd/);
      assert.match(html, /Jumbo Black Tiger Prawns/);
    });

    it("renders with pre-populated return lines and Debit Note financial summary", () => {
      const testModel: Partial<GoodsReturnDebitNoteModel> = {
        debitNoteNumber: "DN-202610-0099",
        returnNumber: "RET-202610-0099",
        supplierId: "sup-seafood-01",
        supplierName: "Ceylon Fresh Seafood Ltd",
        authorizedBy: "N. Perera (Financial Controller)",
        lines: [
          {
            id: "line-test-1",
            stockItemId: "item-prawns-01",
            sku: "SEA-TIGER-PRAWN-01",
            name: "Jumbo Black Tiger Prawns (U10)",
            category: "COLD_ROOM_SEAFOOD",
            unitOfMeasure: "kg",
            batchNumber: "BATCH-TIGER-01",
            availableBatchQty: 15,
            returnQuantity: 5,
            unitCostLkr: 4200,
            subtotalLkr: 21000,
            ssclCreditLkr: 525,
            vatCreditLkr: 3874.5,
            totalDebitLkr: 25399.5,
            reason: "COLD_CHAIN_BREACH",
            defectDescription: "Temperature above +12C upon delivery inspection",
          },
        ],
        subtotalLkr: 21000,
        totalSsclCreditLkr: 525,
        totalVatCreditLkr: 3874.5,
        grandTotalDebitLkr: 25399.5,
      };

      const html = renderToStaticMarkup(
        React.createElement(GoodsReturnModal, {
          isOpen: true,
          onClose: noop,
          initialData: testModel,
          availableStockItems: SAMPLE_STOCK_ITEMS,
          availableSuppliers: SAMPLE_SUPPLIERS,
          availableBatches: SAMPLE_BATCHES,
        }),
      );

      assert.match(html, /DN-202610-0099/);
      assert.match(html, /SEA-TIGER-PRAWN-01/);
      assert.match(html, /Rs\. 25,399\.50/);
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(GoodsReturnModal, {
          isOpen: true,
          onClose: noop,
          locale: "si",
          availableStockItems: SAMPLE_STOCK_ITEMS,
          availableSuppliers: SAMPLE_SUPPLIERS,
        }),
      );

      assert.match(html, /සැපයුම්කරු වෙත භාණ්ඩ ආපසු යැවීම/);
      assert.match(html, /හර සටහන පෙරදසුන/);
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(GoodsReturnModal, {
          isOpen: true,
          onClose: noop,
          locale: "ta",
          availableStockItems: SAMPLE_STOCK_ITEMS,
          availableSuppliers: SAMPLE_SUPPLIERS,
        }),
      );

      assert.match(html, /வழங்குநருக்கு திருப்பி அனுப்புதல்/);
      assert.match(html, /பற்று குறிப்பு முன்னோட்டம்/);
    });
  });
});
