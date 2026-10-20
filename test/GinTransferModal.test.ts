/**
 * Unit Test Suite for Step 383: GinTransferModal & FIFO Stock Transfer
 * (`test/GinTransferModal.test.ts`)
 *
 * Validates:
 * 1. Pure numbering & FIFO deduction helpers:
 *    - generateGinNumber (formats GIN-YYYYMM-XXXX)
 *    - deductFifoBatchesForTransfer (chronological FIFO depletion & COGS)
 *    - calculateGinTotals (aggregates units & department valuation)
 * 2. Validation logic:
 *    - validateGinTransfer (source, destination, issuer, receiver, items)
 * 3. Trilingual localization coverage (en, si, ta)
 * 4. React 19 component rendering via renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GIN_TRANSLATIONS,
  GinTransferModal,
  type GoodsIssueNoteModel,
  calculateGinTotals,
  deductFifoBatchesForTransfer,
  generateGinNumber,
  validateGinTransfer,
} from "../src/admin/inventory/GinTransferModal.js";
import type { FifoBatchRecord } from "../src/admin/inventory/GrnModal.js";
import { DEFAULT_STOCK_ITEMS } from "../src/admin/inventory/StockItemManager.js";

const noop = () => {
  // test no-op
};

const SAMPLE_BATCHES: readonly FifoBatchRecord[] = [
  {
    batchId: "GRN-202610-0001-MILK-01",
    stockItemId: "item-01",
    sku: "FB-DAI-001",
    grnNumber: "GRN-202610-0001",
    initialQuantity: 20,
    remainingQuantity: 20,
    unitCostLkr: 300,
    receivedDate: "2026-10-15",
    supplierName: "Ceylon Dairy Farm",
    storageLocation: "Chiller-A",
  },
  {
    batchId: "GRN-202610-0002-MILK-02",
    stockItemId: "item-01",
    sku: "FB-DAI-001",
    grnNumber: "GRN-202610-0002",
    initialQuantity: 30,
    remainingQuantity: 30,
    unitCostLkr: 330, // Price increased in later batch
    receivedDate: "2026-10-18",
    supplierName: "Ceylon Dairy Farm",
    storageLocation: "Chiller-A",
  },
];

describe("Step 383: GinTransferModal & FIFO Stock Transfer", () => {
  describe("1. Pure Numbering & FIFO Deduction Helpers", () => {
    it("generates formatted GIN number with year, month, and sequence", () => {
      const fixedDate = new Date("2026-10-20T10:00:00Z");
      const gin1 = generateGinNumber(1, fixedDate);
      const gin55 = generateGinNumber(55, fixedDate);

      assert.equal(gin1, "GIN-202610-0001");
      assert.equal(gin55, "GIN-202610-0055");
    });

    it("depletes single batch completely within available stock", () => {
      const result = deductFifoBatchesForTransfer(SAMPLE_BATCHES, "item-01", 10, 300);

      assert.equal(result.isShortfall, false);
      assert.equal(result.availableStock, 50);
      assert.equal(result.allocations.length, 1);
      assert.equal(result.allocations[0]?.batchId, "GRN-202610-0001-MILK-01");
      assert.equal(result.allocations[0]?.deductedQuantity, 10);
      assert.equal(result.allocations[0]?.unitCostLkr, 300);
      assert.equal(result.totalCogsLkr, 3000);
      assert.equal(result.effectiveUnitCostLkr, 300);
    });

    it("depletes multiple batches in chronological sequence (FIFO oldest first)", () => {
      // Need 25 L: 20 L from batch 1 @ 300 = 6,000, 5 L from batch 2 @ 330 = 1,650 -> Total = 7,650
      const result = deductFifoBatchesForTransfer(SAMPLE_BATCHES, "item-01", 25, 300);

      assert.equal(result.isShortfall, false);
      assert.equal(result.allocations.length, 2);
      assert.equal(result.allocations[0]?.batchId, "GRN-202610-0001-MILK-01");
      assert.equal(result.allocations[0]?.deductedQuantity, 20);
      assert.equal(result.allocations[1]?.batchId, "GRN-202610-0002-MILK-02");
      assert.equal(result.allocations[1]?.deductedQuantity, 5);
      assert.equal(result.totalCogsLkr, 7650);
      // Effective average unit cost: 7650 / 25 = 306
      assert.equal(result.effectiveUnitCostLkr, 306);
    });

    it("flags shortfall when requested transfer quantity exceeds available stock", () => {
      const result = deductFifoBatchesForTransfer(SAMPLE_BATCHES, "item-01", 60, 300);

      assert.equal(result.isShortfall, true);
      assert.equal(result.availableStock, 50);
    });

    it("falls back gracefully when item has no active batches", () => {
      const result = deductFifoBatchesForTransfer([], "item-empty", 5, 450);

      assert.equal(result.allocations.length, 0);
      assert.equal(result.totalCogsLkr, 2250);
      assert.equal(result.effectiveUnitCostLkr, 450);
    });

    it("calculates summary totals across multiple transfer lines", () => {
      const items = [
        {
          stockItemId: "item-01",
          sku: "FB-DAI-001",
          name: "Fresh Milk 1L",
          category: "DRY_STORE" as const,
          unitOfMeasure: "L" as const,
          availableQuantity: 50,
          requestedQuantity: 20,
          issuedQuantity: 20,
          unitCostLkr: 300,
          totalCostLkr: 6000,
          allocations: [],
          isShortfall: false,
        },
        {
          stockItemId: "item-02",
          sku: "FB-DAI-002",
          name: "Butter 227g",
          category: "DRY_STORE" as const,
          unitOfMeasure: "pcs" as const,
          availableQuantity: 10,
          requestedQuantity: 5,
          issuedQuantity: 5,
          unitCostLkr: 900,
          totalCostLkr: 4500,
          allocations: [],
          isShortfall: false,
        },
      ];

      const totals = calculateGinTotals(items);

      assert.equal(totals.totalItemsCount, 2);
      assert.equal(totals.totalRequestedUnits, 25);
      assert.equal(totals.totalIssuedUnits, 25);
      assert.equal(totals.totalTransferCostLkr, 10500);
      assert.equal(totals.hasShortfalls, false);
    });
  });

  describe("2. Validation Logic", () => {
    it("flags missing required fields", () => {
      const invalidGin: Partial<GoodsIssueNoteModel> = {
        ginNumber: "",
        sourceLocation: "",
        issueDate: "",
        issuedBy: "",
        receivedBy: "",
        items: [],
      };

      const res = validateGinTransfer(invalidGin);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.ginNumber);
      assert.ok(res.errors.sourceLocation);
      assert.ok(res.errors.destinationDepartment);
      assert.ok(res.errors.issueDate);
      assert.ok(res.errors.issuedBy);
      assert.ok(res.errors.receivedBy);
      assert.ok(res.errors.items);
    });

    it("accepts a completely filled Goods Issue Note", () => {
      const validGin: Partial<GoodsIssueNoteModel> = {
        ginNumber: "GIN-202610-0001",
        sourceLocation: "Central Main Store",
        destinationDepartment: "KITCHEN",
        issueDate: "2026-10-20",
        issuedBy: "Sunil Storekeeper",
        receivedBy: "Chef Nimal",
        items: [
          {
            stockItemId: "item-01",
            sku: "FB-DAI-001",
            name: "Fresh Milk 1L",
            category: "DRY_STORE",
            unitOfMeasure: "L",
            availableQuantity: 50,
            requestedQuantity: 10,
            issuedQuantity: 10,
            unitCostLkr: 300,
            totalCostLkr: 3000,
            allocations: [],
            isShortfall: false,
          },
        ],
      };

      const res = validateGinTransfer(validGin);
      assert.equal(res.isValid, true);
      assert.equal(Object.keys(res.errors).length, 0);
    });
  });

  describe("3. Trilingual Localization Integrity", () => {
    it("provides complete translations across all 3 languages", () => {
      const langs = ["en", "si", "ta"] as const;
      for (const lang of langs) {
        const dict = GIN_TRANSLATIONS[lang];
        assert.ok(dict.title);
        assert.ok(dict.subtitle);
        assert.ok(dict.tabs.transferForm);
        assert.ok(dict.tabs.fifoAllocations);
        assert.ok(dict.tabs.printVoucher);
        assert.ok(dict.fields.ginNumber);
        assert.ok(dict.fields.destinationDept);
        assert.ok(dict.fields.issuedBy);
        assert.ok(dict.actions.confirmTransfer);
      }
    });
  });

  describe("4. React 19 SSR Static Markup", () => {
    it("renders GinTransferModal in English without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GinTransferModal, {
          isOpen: true,
          onClose: noop,
          onSaveGin: noop,
          stockItems: DEFAULT_STOCK_ITEMS,
          availableBatches: SAMPLE_BATCHES,
          currentUserName: "Kamal Storekeeper",
          language: "en",
        }),
      );

      assert.ok(html.includes("Goods Issue Note"));
      assert.ok(html.includes("GIN-"));
      assert.ok(html.includes("Kamal Storekeeper"));
    });

    it("renders GinTransferModal in Sinhala without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GinTransferModal, {
          isOpen: true,
          onClose: noop,
          onSaveGin: noop,
          stockItems: DEFAULT_STOCK_ITEMS,
          availableBatches: SAMPLE_BATCHES,
          language: "si",
        }),
      );

      assert.ok(html.includes("භාණ්ඩ නිකුත් කිරීමේ සටහන"));
    });

    it("renders GinTransferModal in Tamil without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GinTransferModal, {
          isOpen: true,
          onClose: noop,
          onSaveGin: noop,
          stockItems: DEFAULT_STOCK_ITEMS,
          availableBatches: SAMPLE_BATCHES,
          language: "ta",
        }),
      );

      assert.ok(html.includes("பொருட்கள் வழங்குக் குறிப்பு"));
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(GinTransferModal, {
          isOpen: false,
          onClose: noop,
          onSaveGin: noop,
          stockItems: DEFAULT_STOCK_ITEMS,
        }),
      );

      assert.equal(html, "");
    });
  });
});
