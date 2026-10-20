/**
 * Unit Test Suite for Step 391: SupplierPayablesView (AP & GRN Payment Tracker)
 * (`test/SupplierPayablesView.test.ts`)
 *
 * Validates:
 * 1. Pure AP & Aging Calculation Helpers:
 *    - calculateDaysOverdue
 *    - classifyAgingCategory
 *    - derivePayableStatus
 *    - calculatePayableInvoiceState
 *    - calculateSupplierPayablesSummary
 *    - applyPaymentSettlement
 * 2. Trilingual Localization Coverage (en, si, ta)
 * 3. React 19 Component Static Rendering via renderToStaticMarkup:
 *    - Outstanding Invoices Tab & Aging Badges
 *    - Localized views in Sinhala and Tamil
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PAYABLES_TRANSLATIONS,
  type SupplierPayableInvoice,
  SupplierPayablesView,
  applyPaymentSettlement,
  calculateDaysOverdue,
  calculatePayableInvoiceState,
  calculateSupplierPayablesSummary,
  classifyAgingCategory,
  derivePayableStatus,
} from "../src/admin/inventory/SupplierPayablesView.js";

const noop = () => {
  // test dummy handler
};

describe("Step 391: Supplier Accounts Payable (AP) & GRN Payment Tracker", () => {
  describe("1. Pure Financial & AP Aging Calculations", () => {
    it("calculates exact calendar days overdue relative to reference date", () => {
      const ref = "2026-10-20T12:00:00Z";
      const pastDue = "2026-10-10"; // 10 days overdue
      assert.strictEqual(calculateDaysOverdue(pastDue, ref), 10);

      const futureDue = "2026-10-25"; // Due in 5 days
      assert.strictEqual(calculateDaysOverdue(futureDue, ref), -5);

      const todayDue = "2026-10-20";
      assert.strictEqual(calculateDaysOverdue(todayDue, ref), 0);
    });

    it("classifies overdue days into standard AP aging buckets", () => {
      assert.strictEqual(classifyAgingCategory(-5), "CURRENT");
      assert.strictEqual(classifyAgingCategory(0), "CURRENT");
      assert.strictEqual(classifyAgingCategory(1), "OVERDUE_1_30");
      assert.strictEqual(classifyAgingCategory(30), "OVERDUE_1_30");
      assert.strictEqual(classifyAgingCategory(31), "OVERDUE_31_60");
      assert.strictEqual(classifyAgingCategory(60), "OVERDUE_31_60");
      assert.strictEqual(classifyAgingCategory(61), "OVERDUE_61_PLUS");
      assert.strictEqual(classifyAgingCategory(120), "OVERDUE_61_PLUS");
    });

    it("derives payable status based on balance and due date", () => {
      assert.strictEqual(derivePayableStatus(0, 10000, 15), "PAID");
      assert.strictEqual(derivePayableStatus(5000, 10000, -2), "PARTIALLY_PAID");
      assert.strictEqual(derivePayableStatus(5000, 10000, 5), "PARTIALLY_PAID");
      assert.strictEqual(derivePayableStatus(10000, 10000, 10), "OVERDUE");
      assert.strictEqual(derivePayableStatus(10000, 10000, -3), "UNPAID");
    });

    it("calculates live invoice state with WHT deductions and aging", () => {
      const rawInvoice = {
        payableId: "AP-TEST-01",
        grnId: "GRN-01",
        grnNumber: "GRN-01",
        poNumber: "PO-01",
        supplierId: "sup-01",
        supplierName: "Test Supplier",
        supplierCategory: "COLD_ROOM_SEAFOOD" as const,
        supplierInvoiceNumber: "INV-001",
        invoiceDate: "2026-09-20",
        dueDate: "2026-10-05", // 15 days overdue as of 2026-10-20
        grossAmountLkr: 100000,
        withholdingTaxLkr: 2500, // 2.5% WHT
        netPayableLkr: 97500,
        paidAmountLkr: 0,
        paymentTerms: "Net 15 Days",
        settlements: [],
      };

      const refDate = "2026-10-20";
      const processed = calculatePayableInvoiceState(rawInvoice, refDate);
      assert.strictEqual(processed.balanceDueLkr, 97500);
      assert.strictEqual(processed.daysOverdue, 15);
      assert.strictEqual(processed.agingCategory, "OVERDUE_1_30");
      assert.strictEqual(processed.status, "OVERDUE");
    });

    it("aggregates AP ledger summary across all aging buckets", () => {
      const sampleInvoices: SupplierPayableInvoice[] = [
        {
          payableId: "AP-1",
          grnId: "G1",
          grnNumber: "G1",
          poNumber: "P1",
          supplierId: "S1",
          supplierName: "Current Supplier",
          supplierCategory: "DRY_STORE",
          supplierInvoiceNumber: "INV-1",
          invoiceDate: "2026-10-15",
          dueDate: "2026-10-25",
          grossAmountLkr: 50000,
          withholdingTaxLkr: 0,
          netPayableLkr: 50000,
          paidAmountLkr: 0,
          balanceDueLkr: 50000,
          status: "UNPAID",
          agingCategory: "CURRENT",
          daysOverdue: -5,
          paymentTerms: "Net 10",
          settlements: [],
        },
        {
          payableId: "AP-2",
          grnId: "G2",
          grnNumber: "G2",
          poNumber: "P2",
          supplierId: "S2",
          supplierName: "Overdue Supplier",
          supplierCategory: "VEGETABLE_MARKET",
          supplierInvoiceNumber: "INV-2",
          invoiceDate: "2026-09-10",
          dueDate: "2026-09-30",
          grossAmountLkr: 100000,
          withholdingTaxLkr: 2500,
          netPayableLkr: 97500,
          paidAmountLkr: 47500,
          balanceDueLkr: 50000,
          status: "PARTIALLY_PAID",
          agingCategory: "OVERDUE_1_30",
          daysOverdue: 20,
          paymentTerms: "Net 20",
          settlements: [],
        },
        {
          payableId: "AP-3",
          grnId: "G3",
          grnNumber: "G3",
          poNumber: "P3",
          supplierId: "S3",
          supplierName: "Settled Supplier",
          supplierCategory: "LIQUOR_BAR",
          supplierInvoiceNumber: "INV-3",
          invoiceDate: "2026-09-01",
          dueDate: "2026-09-20",
          grossAmountLkr: 80000,
          withholdingTaxLkr: 0,
          netPayableLkr: 80000,
          paidAmountLkr: 80000,
          balanceDueLkr: 0,
          status: "PAID",
          agingCategory: "CURRENT",
          daysOverdue: 0,
          paymentTerms: "Net 20",
          settlements: [],
        },
      ];

      const summary = calculateSupplierPayablesSummary(sampleInvoices);
      assert.strictEqual(summary.totalInvoicesCount, 3);
      assert.strictEqual(summary.totalGrossLkr, 230000);
      assert.strictEqual(summary.totalWhtLkr, 2500);
      assert.strictEqual(summary.totalNetPayableLkr, 227500);
      assert.strictEqual(summary.totalPaidLkr, 127500);
      assert.strictEqual(summary.totalBalanceDueLkr, 100000);
      assert.strictEqual(summary.currentDueLkr, 50000);
      assert.strictEqual(summary.overdue1To30Lkr, 50000);
      assert.strictEqual(summary.overdueInvoicesCount, 1);
    });

    it("returns zero summary for an empty invoice array", () => {
      const summary = calculateSupplierPayablesSummary([]);
      assert.strictEqual(summary.totalInvoicesCount, 0);
      assert.strictEqual(summary.totalBalanceDueLkr, 0);
      assert.strictEqual(summary.overdueInvoicesCount, 0);
    });

    it("applies payment settlement and recalculates outstanding balance", () => {
      const invoice: SupplierPayableInvoice = {
        payableId: "AP-SETTLE-01",
        grnId: "G1",
        grnNumber: "G1",
        poNumber: "P1",
        supplierId: "S1",
        supplierName: "Supplier X",
        supplierCategory: "COLD_ROOM_SEAFOOD",
        supplierInvoiceNumber: "INV-X",
        invoiceDate: "2026-10-01",
        dueDate: "2026-10-15",
        grossAmountLkr: 50000,
        withholdingTaxLkr: 0,
        netPayableLkr: 50000,
        paidAmountLkr: 10000,
        balanceDueLkr: 40000,
        status: "PARTIALLY_PAID",
        agingCategory: "OVERDUE_1_30",
        daysOverdue: 5,
        paymentTerms: "Net 14",
        settlements: [],
      };

      const updated = applyPaymentSettlement(
        invoice,
        {
          payableId: "AP-SETTLE-01",
          invoiceNumber: "INV-X",
          paymentDate: "2026-10-20",
          amountPaidLkr: 40000,
          paymentMethod: "BANK_TRANSFER",
          referenceNumber: "CEFT-00123",
          bankName: "Commercial Bank",
          recordedBy: "Sunil W.",
          notes: "Final clearing",
        },
        "SET-TEST-99",
      );

      assert.strictEqual(updated.paidAmountLkr, 50000);
      assert.strictEqual(updated.balanceDueLkr, 0);
      assert.strictEqual(updated.status, "PAID");
      assert.strictEqual(updated.settlements.length, 1);
      assert.strictEqual(updated.settlements[0]?.settlementId, "SET-TEST-99");
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = PAYABLES_TRANSLATIONS[lang];
        assert.ok(dict.title, `Missing title in ${lang}`);
        assert.ok(dict.subtitle, `Missing subtitle in ${lang}`);
        assert.ok(dict.tabs.invoices, `Missing tab invoices in ${lang}`);
        assert.ok(dict.tabs.aging, `Missing tab aging in ${lang}`);
        assert.ok(dict.tabs.history, `Missing tab history in ${lang}`);
        assert.ok(dict.tabs.printVoucher, `Missing tab voucher in ${lang}`);
        assert.ok(dict.kpi.totalBalance, `Missing KPI totalBalance in ${lang}`);
        assert.ok(dict.agingBadges.CURRENT, `Missing CURRENT badge in ${lang}`);
        assert.ok(dict.statusBadges.UNPAID, `Missing UNPAID badge in ${lang}`);
        assert.ok(dict.paymentMethods.BANK_TRANSFER, `Missing BANK_TRANSFER in ${lang}`);
        assert.ok(dict.columns.invoiceDetails, `Missing column in ${lang}`);
        assert.ok(dict.modal.title, `Missing modal title in ${lang}`);
        assert.ok(dict.buttons.recordPayment, `Missing button in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders default invoices with table headers and KPI cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupplierPayablesView, {
          onRecordSettlement: noop,
        }),
      );

      assert.ok(html.includes("Supplier Accounts Payable"));
      assert.ok(html.includes("Negombo Fresh Fishery Cooperative"));
      assert.ok(html.includes("Ambewela Farm Organics"));
      assert.ok(html.includes("Rockland Distilleries"));
      assert.ok(html.includes("Ceypetco Bulk Fuel Distribution"));
      assert.ok(html.includes("Diversey Ceylon Hygiene"));
      assert.ok(html.includes("Pay Invoice"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupplierPayablesView, {
          language: "si",
          onRecordSettlement: noop,
        }),
      );

      assert.ok(html.includes("සැපයුම්කරුවන්ගේ ගෙවීම් (AP) සහ පියවීම් ලෙජරය"));
      assert.ok(html.includes("මුළු ගෙවිය යුතු මුදල"));
      assert.ok(html.includes("ගෙවීමක් කරන්න"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupplierPayablesView, {
          language: "ta",
          onRecordSettlement: noop,
        }),
      );

      assert.ok(html.includes("வழங்குநர் கணக்குகள் (AP)"));
      assert.ok(html.includes("மொத்த நிலுவைத்தொகை"));
      assert.ok(html.includes("செலுத்துக"));
    });
  });
});
