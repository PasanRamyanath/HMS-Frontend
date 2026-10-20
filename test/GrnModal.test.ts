/**
 * Unit Test Suite for Step 380: GrnModal & FIFO Batch Recorder
 *
 * Validates:
 * 1. Pure domain & numbering helpers:
 *    - generateGrnNumber (formats GRN-YYYYMM-XXXX)
 *    - detectPriceSpike (detects >10% inflation vs historical cost)
 *    - calculateGrnLineItemFinancials (Accepted Qty x Unit Cost + VAT)
 *    - calculateGrnTotals (aggregates subtotal, VAT, total LKR, units, spike count)
 * 2. FIFO batch generation:
 *    - generateFifoBatchesFromGrn (generates auditable FifoBatchRecord entries)
 * 3. PO conversion:
 *    - convertPoToGrn (transforms PO into pre-filled receiving inspection draft)
 * 4. Validation logic:
 *    - validateGrn (requires grnNumber, supplier, invoice no, items, and manager approval on spikes)
 * 5. Trilingual localization integrity (en, si, ta)
 * 6. React 19 component rendering via renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GRN_TRANSLATIONS,
  type GoodsReceivedNoteModel,
  GrnModal,
  calculateGrnLineItemFinancials,
  calculateGrnTotals,
  convertPoToGrn,
  detectPriceSpike,
  generateFifoBatchesFromGrn,
  generateGrnNumber,
  validateGrn,
} from "../src/admin/inventory/GrnModal.js";
import type { PurchaseOrderModel } from "../src/admin/inventory/PurchaseOrderModal.js";
import { DEFAULT_STOCK_ITEMS } from "../src/admin/inventory/StockItemManager.js";
import { DEFAULT_SUPPLIERS } from "../src/admin/inventory/SupplierDirectory.js";

const noop = () => {
  // intentional test noop
};

describe("Step 380: GrnModal & FIFO Batch Recorder", () => {
  describe("1. Pure Numbering & Financial Helpers", () => {
    it("generates formatted GRN number with year, month, and sequence", () => {
      const fixedDate = new Date("2026-10-20T10:00:00Z");
      const grn1 = generateGrnNumber(1, fixedDate);
      const grn99 = generateGrnNumber(99, fixedDate);

      assert.equal(grn1, "GRN-202610-0001");
      assert.equal(grn99, "GRN-202610-0099");
    });

    it("detects unit-price spike correctly when exceeding 10% threshold", () => {
      // 5% increase -> no spike
      const normal = detectPriceSpike(1050, 1000);
      assert.equal(normal.isSpike, false);
      assert.equal(normal.spikePercent, 5);

      // 10% increase exact -> no spike (must be >10%)
      const boundary = detectPriceSpike(1100, 1000);
      assert.equal(boundary.isSpike, false);

      // 15% increase -> spike!
      const spike = detectPriceSpike(1150, 1000);
      assert.equal(spike.isSpike, true);
      assert.equal(spike.spikePercent, 15);

      // Edge cases: zero or negative
      const zeroBase = detectPriceSpike(100, 0);
      assert.equal(zeroBase.isSpike, false);
      assert.equal(zeroBase.spikePercent, 0);

      const zeroInvoice = detectPriceSpike(0, 100);
      assert.equal(zeroInvoice.isSpike, false);
      assert.equal(zeroInvoice.spikePercent, 0);
    });

    it("calculates line item financials without VAT", () => {
      const result = calculateGrnLineItemFinancials({
        acceptedQuantity: 20,
        invoiceUnitCostLkr: 500,
        vatRatePercent: 0,
      });

      assert.equal(result.lineSubtotalLkr, 10000);
      assert.equal(result.vatAmountLkr, 0);
      assert.equal(result.lineTotalLkr, 10000);
    });

    it("calculates line item financials with 18% VAT", () => {
      const result = calculateGrnLineItemFinancials({
        acceptedQuantity: 10,
        invoiceUnitCostLkr: 2000,
        vatRatePercent: 18,
      });

      assert.equal(result.lineSubtotalLkr, 20000);
      assert.equal(result.vatAmountLkr, 3600);
      assert.equal(result.lineTotalLkr, 23600);
    });

    it("calculates GRN summary totals accurately across items", () => {
      const items = [
        {
          lineSubtotalLkr: 10000,
          vatAmountLkr: 0,
          lineTotalLkr: 10000,
          deliveredQuantity: 20,
          acceptedQuantity: 20,
          rejectedQuantity: 0,
          isPriceSpike: false,
        },
        {
          lineSubtotalLkr: 20000,
          vatAmountLkr: 3600,
          lineTotalLkr: 23600,
          deliveredQuantity: 12,
          acceptedQuantity: 10,
          rejectedQuantity: 2,
          isPriceSpike: true,
        },
      ];

      const totals = calculateGrnTotals(items);

      assert.equal(totals.subtotalLkr, 30000);
      assert.equal(totals.vatTotalLkr, 3600);
      assert.equal(totals.totalLkr, 33600);
      assert.equal(totals.itemCount, 2);
      assert.equal(totals.totalDeliveredUnits, 32);
      assert.equal(totals.totalAcceptedUnits, 30);
      assert.equal(totals.totalRejectedUnits, 2);
      assert.equal(totals.priceSpikeCount, 1);
    });
  });

  describe("2. FIFO Batch Generation", () => {
    it("generates discrete FIFO batch records from accepted GRN items", () => {
      const mockGrn: GoodsReceivedNoteModel = {
        id: "grn-test-01",
        tenantId: "tenant-ceylon-01",
        grnNumber: "GRN-202610-0012",
        supplierId: "sup-01",
        supplierName: "Ceylon Dairy Farm",
        supplierInvoiceNumber: "INV-9988",
        supplierInvoiceDate: "2026-10-20",
        receivingDate: "2026-10-20",
        department: "KITCHEN",
        receivingDockLocation: "Dock 1",
        receivingClerkName: "Kamal Perera",
        status: "CONFIRMED",
        hasPriceSpikes: false,
        managerApprovalOverride: false,
        subtotalLkr: 15000,
        vatTotalLkr: 0,
        totalLkr: 15000,
        createdAt: "2026-10-20T10:00:00Z",
        updatedAt: "2026-10-20T10:00:00Z",
        generatedBatches: [],
        items: [
          {
            stockItemId: "item-01",
            sku: "FB-DAI-001",
            name: "Highland Fresh Milk 1L",
            category: "DRY_STORE",
            unitOfMeasure: "L",
            orderedQuantity: 50,
            deliveredQuantity: 50,
            acceptedQuantity: 50,
            rejectedQuantity: 0,
            rejectionReason: "NONE",
            poUnitCostLkr: 300,
            invoiceUnitCostLkr: 300,
            lineSubtotalLkr: 15000,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 15000,
            batchNumber: "GRN-202610-0012-FB-DAI-001-01",
            expiryDate: "2026-10-27",
            storageLocation: "Chiller-A",
            isPriceSpike: false,
            priceSpikePercent: 0,
          },
          {
            stockItemId: "item-02",
            sku: "FB-DAI-002",
            name: "Spoiled Curd Pot",
            category: "DRY_STORE",
            unitOfMeasure: "pcs",
            orderedQuantity: 10,
            deliveredQuantity: 10,
            acceptedQuantity: 0, // All rejected
            rejectedQuantity: 10,
            rejectionReason: "DAMAGED",
            poUnitCostLkr: 400,
            invoiceUnitCostLkr: 400,
            lineSubtotalLkr: 0,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 0,
            batchNumber: "GRN-202610-0012-FB-DAI-002-02",
            storageLocation: "Disposal",
            isPriceSpike: false,
            priceSpikePercent: 0,
          },
        ],
      };

      const batches = generateFifoBatchesFromGrn(mockGrn);

      // Only the item with acceptedQuantity > 0 should produce a batch
      assert.equal(batches.length, 1);
      const batch = batches[0];
      assert.ok(batch);
      assert.equal(batch.batchId, "GRN-202610-0012-FB-DAI-001-01");
      assert.equal(batch.stockItemId, "item-01");
      assert.equal(batch.sku, "FB-DAI-001");
      assert.equal(batch.initialQuantity, 50);
      assert.equal(batch.remainingQuantity, 50);
      assert.equal(batch.unitCostLkr, 300);
      assert.equal(batch.expiryDate, "2026-10-27");
      assert.equal(batch.storageLocation, "Chiller-A");
      assert.equal(batch.supplierName, "Ceylon Dairy Farm");
    });
  });

  describe("3. PO to GRN Conversion", () => {
    it("converts a Purchase Order into a pre-filled GRN draft", () => {
      const mockPo: PurchaseOrderModel = {
        id: "po-100",
        tenantId: "tenant-01",
        poNumber: "PO-202610-0005",
        supplierId: "sup-01",
        supplierName: "Ceylon Dairy Farm",
        supplierContactPerson: "Nimal",
        supplierPhone: "0771234567",
        supplierWhatsapp: "0771234567",
        department: "KITCHEN",
        status: "ISSUED",
        orderDate: "2026-10-20",
        expectedDeliveryDate: "2026-10-22",
        creditTerms: "30_DAYS",
        deliveryLocation: "Central Receiving Dock",
        paymentStatus: "UNPAID",
        subtotalLkr: 20000,
        vatTotalLkr: 0,
        totalLkr: 20000,
        issuedBy: "Chef Sunil",
        createdAt: "2026-10-20T08:00:00Z",
        updatedAt: "2026-10-20T08:00:00Z",
        items: [
          {
            stockItemId: "item-01",
            sku: "FB-DAI-001",
            name: "Highland Fresh Milk 1L",
            category: "DRY_STORE",
            unitOfMeasure: "L",
            orderedQuantity: 40,
            receivedQuantity: 0,
            unitCostLkr: 300,
            lineSubtotalLkr: 12000,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 12000,
          },
        ],
      };

      const grnDraft = convertPoToGrn(mockPo, "GRN-202610-0044", "Receiver Perera");

      assert.equal(grnDraft.grnNumber, "GRN-202610-0044");
      assert.equal(grnDraft.poId, "po-100");
      assert.equal(grnDraft.poNumber, "PO-202610-0005");
      assert.equal(grnDraft.supplierId, "sup-01");
      assert.equal(grnDraft.supplierName, "Ceylon Dairy Farm");
      assert.equal(grnDraft.receivingClerkName, "Receiver Perera");
      assert.equal(grnDraft.items.length, 1);
      assert.equal(grnDraft.items[0]?.deliveredQuantity, 40);
      assert.equal(grnDraft.items[0]?.acceptedQuantity, 40);
      assert.equal(grnDraft.items[0]?.rejectedQuantity, 0);
      assert.equal(grnDraft.generatedBatches.length, 1);
    });
  });

  describe("4. Validation Logic", () => {
    it("flags missing required fields", () => {
      const invalidGrn: Partial<GoodsReceivedNoteModel> = {
        grnNumber: "",
        supplierId: "",
        supplierInvoiceNumber: "",
        receivingDate: "",
        items: [],
      };

      const res = validateGrn(invalidGrn);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.grnNumber);
      assert.ok(res.errors.supplierId);
      assert.ok(res.errors.supplierInvoiceNumber);
      assert.ok(res.errors.receivingDate);
      assert.ok(res.errors.items);
    });

    it("requires manager approval override when price spike is flagged", () => {
      const spikeGrn: Partial<GoodsReceivedNoteModel> = {
        grnNumber: "GRN-202610-0001",
        supplierId: "sup-01",
        supplierInvoiceNumber: "INV-1234",
        receivingDate: "2026-10-20",
        hasPriceSpikes: true,
        managerApprovalOverride: false,
        items: [
          {
            stockItemId: "item-01",
            sku: "FB-DAI-001",
            name: "Highland Fresh Milk 1L",
            category: "DRY_STORE",
            unitOfMeasure: "L",
            orderedQuantity: 10,
            deliveredQuantity: 10,
            acceptedQuantity: 10,
            rejectedQuantity: 0,
            poUnitCostLkr: 200,
            invoiceUnitCostLkr: 300,
            lineSubtotalLkr: 3000,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 3000,
            batchNumber: "B1",
            storageLocation: "Chiller",
            isPriceSpike: true,
            priceSpikePercent: 50,
          },
        ],
      };

      const res = validateGrn(spikeGrn);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.managerApproval);

      // Pass when override is checked
      const overriddenGrn = { ...spikeGrn, managerApprovalOverride: true };
      const validRes = validateGrn(overriddenGrn);
      assert.equal(validRes.isValid, true);
    });
  });

  describe("5. Trilingual Localization Integrity", () => {
    it("provides complete translation dictionaries across all 3 languages", () => {
      const langs = ["en", "si", "ta"] as const;
      for (const lang of langs) {
        const dict = GRN_TRANSLATIONS[lang];
        assert.ok(dict.title);
        assert.ok(dict.subtitle);
        assert.ok(dict.tabs.inspection);
        assert.ok(dict.tabs.fifoBatches);
        assert.ok(dict.tabs.printVoucher);
        assert.ok(dict.fields.grnNumber);
        assert.ok(dict.fields.supplier);
        assert.ok(dict.fields.invoiceNumber);
        assert.ok(dict.spikeAlert.title);
        assert.ok(dict.actions.confirmGrn);
        assert.ok(dict.reasons.DAMAGED);
      }
    });
  });

  describe("6. React 19 SSR Static Markup", () => {
    it("renders GrnModal in English without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GrnModal, {
          isOpen: true,
          onClose: noop,
          onSaveGrn: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          hotelName: "Sigiriya Heritage Villa",
          currentUserName: "Saman Perera",
          language: "en",
        }),
      );

      assert.ok(html.includes("Goods Received Note"));
      assert.ok(html.includes("Saman Perera"));
      assert.ok(html.includes("GRN-"));
    });

    it("renders GrnModal in Sinhala without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GrnModal, {
          isOpen: true,
          onClose: noop,
          onSaveGrn: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          language: "si",
        }),
      );

      assert.ok(html.includes("භාණ්ඩ භාරගැනීමේ සටහන"));
    });

    it("renders GrnModal in Tamil without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GrnModal, {
          isOpen: true,
          onClose: noop,
          onSaveGrn: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          language: "ta",
        }),
      );

      assert.ok(html.includes("பொருட்கள் பெற்றுக் குறிப்பு"));
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(GrnModal, {
          isOpen: false,
          onClose: noop,
          onSaveGrn: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
        }),
      );

      assert.equal(html, "");
    });
  });
});
