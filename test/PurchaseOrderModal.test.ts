/**
 * Unit Test Suite for Step 379: PurchaseOrderModal
 *
 * Validates:
 * 1. Pure financial & numbering helpers:
 *    - generatePoNumber (formats PO-YYYYMM-XXXX)
 *    - calculatePoLineFinancials (Qty x Unit Cost + VAT)
 *    - calculatePoTotals (aggregates subtotal, VAT, total LKR, units)
 * 2. PR to PO conversion:
 *    - convertRequisitionToPo (applies supplier VAT rate, copies line items)
 * 3. Dispatch channels (WhatsApp & SMS):
 *    - generateWhatsAppOrderMessage (Sri Lankan formatted text)
 *    - generateWhatsAppOrderUrl (wa.me sanitized Sri Lankan country code)
 *    - generateSmsOrderSummary (compact SMS text)
 * 4. Validation logic:
 *    - validatePurchaseOrder (verifies PO number, supplier, dates, items)
 * 5. Trilingual localization integrity (en, si, ta)
 * 6. React 19 component rendering via renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PO_TRANSLATIONS,
  PurchaseOrderModal,
  type PurchaseOrderModel,
  calculatePoLineFinancials,
  calculatePoTotals,
  convertRequisitionToPo,
  generatePoNumber,
  generateSmsOrderSummary,
  generateWhatsAppOrderMessage,
  generateWhatsAppOrderUrl,
  validatePurchaseOrder,
} from "../src/admin/inventory/PurchaseOrderModal.js";
import type { PurchaseRequisitionModel } from "../src/admin/inventory/PurchaseRequisitionModal.js";
import { DEFAULT_STOCK_ITEMS } from "../src/admin/inventory/StockItemManager.js";
import { DEFAULT_SUPPLIERS } from "../src/admin/inventory/SupplierDirectory.js";

describe("Step 379: PurchaseOrderModal & WhatsApp/Print Dispatcher", () => {
  describe("1. Pure Financial & Numbering Helpers", () => {
    it("generates formatted PO number with year, month, and 4-digit sequence", () => {
      const fixedDate = new Date("2026-10-20T10:00:00Z");
      const poNum1 = generatePoNumber(1, fixedDate);
      const poNum42 = generatePoNumber(42, fixedDate);

      assert.equal(poNum1, "PO-202610-0001");
      assert.equal(poNum42, "PO-202610-0042");
    });

    it("calculates line item financials without VAT (0%)", () => {
      const result = calculatePoLineFinancials({
        orderedQuantity: 25,
        unitCostLkr: 450,
        vatRatePercent: 0,
      });

      assert.equal(result.lineSubtotalLkr, 11250);
      assert.equal(result.vatAmountLkr, 0);
      assert.equal(result.lineTotalLkr, 11250);
    });

    it("calculates line item financials with statutory Sri Lankan 18% VAT", () => {
      const result = calculatePoLineFinancials({
        orderedQuantity: 10,
        unitCostLkr: 1000,
        vatRatePercent: 18,
      });

      assert.equal(result.lineSubtotalLkr, 10000);
      assert.equal(result.vatAmountLkr, 1800);
      assert.equal(result.lineTotalLkr, 11800);
    });

    it("handles edge cases and zero/negative numbers cleanly in line financials", () => {
      const result = calculatePoLineFinancials({
        orderedQuantity: -5,
        unitCostLkr: 0,
        vatRatePercent: -10,
      });

      assert.equal(result.lineSubtotalLkr, 0);
      assert.equal(result.vatAmountLkr, 0);
      assert.equal(result.lineTotalLkr, 0);
    });

    it("aggregates PO totals across multiple line items", () => {
      const items = [
        { lineSubtotalLkr: 10000, vatAmountLkr: 1800, lineTotalLkr: 11800, orderedQuantity: 10 },
        { lineSubtotalLkr: 5000, vatAmountLkr: 0, lineTotalLkr: 5000, orderedQuantity: 5 },
      ];

      const totals = calculatePoTotals(items);
      assert.equal(totals.subtotalLkr, 15000);
      assert.equal(totals.vatTotalLkr, 1800);
      assert.equal(totals.totalLkr, 16800);
      assert.equal(totals.itemCount, 2);
      assert.equal(totals.totalUnits, 15);
    });
  });

  describe("2. Requisition to Purchase Order Conversion", () => {
    const mockRequisition: PurchaseRequisitionModel = {
      id: "pr-mock-001",
      tenantId: "tenant-galle-fort",
      prNumber: "PR-202610-0012",
      department: "KITCHEN",
      reason: "ROUTINE_PAR_RESTOCK",
      requestedByStaffId: "staff-1",
      requestedByStaffName: "Chef Nuwan",
      requisitionDate: "2026-10-20",
      requiredByDate: "2026-10-22",
      items: [
        {
          stockItemId: "stock-samba-001",
          sku: "DRY-RICE-001",
          name: "Keeri Samba Rice",
          category: "DRY_STORE",
          unitOfMeasure: "kg",
          currentStock: 15,
          parLevel: 50,
          quantityRequested: 50,
          estimatedUnitCostLkr: 280,
          estimatedLineTotalLkr: 14000,
        },
      ],
      totalEstimatedCostLkr: 14000,
      status: "APPROVED",
      notes: "Urgent for weekend buffet",
      createdAt: "2026-10-20T08:00:00Z",
      updatedAt: "2026-10-20T08:00:00Z",
    };

    it("converts approved PR into PO draft with supplier credit terms and VAT", () => {
      const supplier = DEFAULT_SUPPLIERS[0]; // VAT registered supplier
      assert.ok(supplier, "Default supplier should exist");
      const poDraft = convertRequisitionToPo(
        mockRequisition,
        supplier,
        "PO-202610-0005",
        "Procurement Head",
      );

      assert.equal(poDraft.poNumber, "PO-202610-0005");
      assert.equal(poDraft.requisitionId, "pr-mock-001");
      assert.equal(poDraft.requisitionNumber, "PR-202610-0012");
      assert.equal(poDraft.supplierId, supplier.id);
      assert.equal(poDraft.supplierName, supplier.name);
      assert.equal(poDraft.creditTerms, supplier.creditTerms);
      assert.equal(poDraft.items.length, 1);
      assert.equal(poDraft.status, "DRAFT");
      assert.equal(poDraft.paymentStatus, "UNPAID");

      // Verify VAT application for VAT-registered supplier
      const firstItem = poDraft.items[0];
      assert.ok(firstItem, "First item should be present");
      assert.equal(firstItem.vatRatePercent, 18);
      assert.equal(firstItem.lineSubtotalLkr, 14000);
      assert.equal(firstItem.vatAmountLkr, 2520);
      assert.equal(firstItem.lineTotalLkr, 16520);
      assert.equal(poDraft.totalLkr, 16520);
    });
  });

  describe("3. Dispatch Channels (WhatsApp & SMS)", () => {
    const mockPo: PurchaseOrderModel = {
      id: "po-1",
      tenantId: "tenant-1",
      poNumber: "PO-202610-0001",
      department: "KITCHEN",
      supplierId: "sup-1",
      supplierName: "Araliya Rice Mills",
      supplierContactPerson: "Sunil Silva",
      supplierPhone: "0771234567",
      supplierWhatsapp: "0771234567",
      creditTerms: "30_DAYS",
      orderDate: "2026-10-20",
      expectedDeliveryDate: "2026-10-21",
      deliveryLocation: "Main Kitchen Receiving Dock",
      items: [
        {
          stockItemId: "item-1",
          sku: "DRY-RICE-001",
          name: "Keeri Samba Rice",
          category: "DRY_STORE",
          unitOfMeasure: "kg",
          orderedQuantity: 100,
          receivedQuantity: 0,
          unitCostLkr: 280,
          lineSubtotalLkr: 28000,
          vatRatePercent: 0,
          vatAmountLkr: 0,
          lineTotalLkr: 28000,
        },
      ],
      subtotalLkr: 28000,
      vatTotalLkr: 0,
      totalLkr: 28000,
      status: "ISSUED",
      paymentStatus: "UNPAID",
      specialInstructions: "Deliver before 8:00 AM",
      issuedBy: "Chef Amal",
      createdAt: "2026-10-20T08:00:00Z",
      updatedAt: "2026-10-20T08:00:00Z",
    };

    it("generates formatted WhatsApp message containing order specifics", () => {
      const msg = generateWhatsAppOrderMessage(mockPo, "Grand Serendib Hotel");
      assert.ok(msg.includes("*PURCHASE ORDER: PO-202610-0001*"));
      assert.ok(msg.includes("*Grand Serendib Hotel*"));
      assert.ok(msg.includes("Supplier: Araliya Rice Mills"));
      assert.ok(msg.includes("Keeri Samba Rice"));
      assert.ok(msg.includes("Qty: 100 kg @ LKR 280.00 = LKR 28000.00"));
      assert.ok(msg.includes("GRAND TOTAL: LKR 28000.00"));
      assert.ok(msg.includes("Deliver before 8:00 AM"));
      assert.ok(msg.includes("Issued By: Chef Amal"));
    });

    it("generates wa.me URL with sanitized Sri Lankan international dial code", () => {
      const url = generateWhatsAppOrderUrl("0771234567", "Hello PO");
      assert.ok(url.startsWith("https://wa.me/94771234567?text="));
      assert.ok(url.includes("Hello%20PO"));
    });

    it("generates concise SMS summary", () => {
      const sms = generateSmsOrderSummary(mockPo, "Grand Serendib");
      assert.ok(sms.includes("Grand Serendib PO PO-202610-0001: 1 items, Total LKR 28000."));
      assert.ok(sms.includes("Deliv: 2026-10-21"));
    });
  });

  describe("4. Purchase Order Validation", () => {
    it("rejects incomplete PO without supplier or items", () => {
      const emptyPo: Partial<PurchaseOrderModel> = {
        poNumber: "",
        items: [],
      };
      const validation = validatePurchaseOrder(emptyPo);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.poNumber);
      assert.ok(validation.errors.supplierId);
      assert.ok(validation.errors.orderDate);
      assert.ok(validation.errors.expectedDeliveryDate);
      assert.ok(validation.errors.items);
    });

    it("rejects PO when an item has zero or negative quantity", () => {
      const invalidItemPo: Partial<PurchaseOrderModel> = {
        poNumber: "PO-202610-0001",
        supplierId: "sup-1",
        orderDate: "2026-10-20",
        expectedDeliveryDate: "2026-10-21",
        items: [
          {
            stockItemId: "item-1",
            sku: "SKU-1",
            name: "Item 1",
            category: "DRY_STORE",
            unitOfMeasure: "kg",
            orderedQuantity: 0,
            receivedQuantity: 0,
            unitCostLkr: 100,
            lineSubtotalLkr: 0,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 0,
          },
        ],
      };
      const validation = validatePurchaseOrder(invalidItemPo);
      assert.equal(validation.isValid, false);
      assert.ok(validation.errors.itemsQuantity);
    });

    it("accepts well-formed PO", () => {
      const validPo: Partial<PurchaseOrderModel> = {
        poNumber: "PO-202610-0001",
        supplierId: "sup-1",
        orderDate: "2026-10-20",
        expectedDeliveryDate: "2026-10-21",
        items: [
          {
            stockItemId: "item-1",
            sku: "SKU-1",
            name: "Item 1",
            category: "DRY_STORE",
            unitOfMeasure: "kg",
            orderedQuantity: 10,
            receivedQuantity: 0,
            unitCostLkr: 100,
            lineSubtotalLkr: 1000,
            vatRatePercent: 0,
            vatAmountLkr: 0,
            lineTotalLkr: 1000,
          },
        ],
      };
      const validation = validatePurchaseOrder(validPo);
      assert.equal(validation.isValid, true);
    });
  });

  describe("5. Trilingual Localization Contracts", () => {
    it("ensures all languages have complete title, tabs, and actions", () => {
      for (const lang of ["en", "si", "ta"] as const) {
        const t = PO_TRANSLATIONS[lang];
        assert.ok(t.title.length > 0);
        assert.ok(t.tabs.orderForm.length > 0);
        assert.ok(t.tabs.printPreview.length > 0);
        assert.ok(t.tabs.dispatch.length > 0);
        assert.ok(t.actions.issuePo.length > 0);
        assert.ok(t.actions.sendWhatsapp.length > 0);
        assert.ok(t.actions.printA4.length > 0);
        assert.ok(t.financials.grandTotal.length > 0);
      }
    });
  });

  describe("6. React 19 Component Static Rendering", () => {
    const noop = () => {
      /* no-op for static rendering */
    };

    it("renders modal dialog in open state with default order form tab", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PurchaseOrderModal, {
          isOpen: true,
          onClose: noop,
          onSavePo: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          hotelName: "Grand Serendib Bentota",
        }),
      );

      assert.ok(markup.includes("Purchase Order (PO) Generator"));
      assert.ok(markup.includes("PO Editor"));
      assert.ok(markup.includes("A4 Print Preview"));
      assert.ok(markup.includes("WhatsApp &amp; Dispatch"));
      assert.ok(markup.includes("Send WhatsApp Order"));
      assert.ok(markup.includes("Print A4 Copy"));
      assert.ok(markup.includes("Issue &amp; Finalize PO"));
    });

    it("renders Sinhala localization properly", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PurchaseOrderModal, {
          isOpen: true,
          onClose: noop,
          onSavePo: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          language: "si",
        }),
      );

      assert.ok(markup.includes(PO_TRANSLATIONS.si.title));
      assert.ok(markup.includes(PO_TRANSLATIONS.si.tabs.orderForm));
      assert.ok(markup.includes(PO_TRANSLATIONS.si.actions.issuePo));
    });

    it("renders Tamil localization properly", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PurchaseOrderModal, {
          isOpen: true,
          onClose: noop,
          onSavePo: noop,
          suppliers: DEFAULT_SUPPLIERS,
          stockItems: DEFAULT_STOCK_ITEMS,
          language: "ta",
        }),
      );

      assert.ok(markup.includes(PO_TRANSLATIONS.ta.title));
      assert.ok(markup.includes(PO_TRANSLATIONS.ta.tabs.orderForm));
      assert.ok(markup.includes(PO_TRANSLATIONS.ta.actions.issuePo));
    });
  });
});
