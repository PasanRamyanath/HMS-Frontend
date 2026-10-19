import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AUTHORIZED_CREDIT_ROLES,
  CREDIT_NOTE_REASONS,
  CreditNoteModal,
  type CreditNoteModalProps,
  type CreditNoteReason,
  type CreditNoteReversalTaxBreakdown,
  type CreditNoteSubmissionPayload,
  type CreditNoteType,
  REFUND_METHODS,
  type RefundMethod,
  type TargetInvoiceDetails,
  calculateCreditReversal,
  generateCreditNoteNumber,
  isAuthorizedRole,
  roundLkr,
  validateCreditNoteInput,
} from "../src/admin/folios/CreditNoteModal.js";

describe("Step 217: CreditNoteModal & Tax Invoice Void / Adjustment", () => {
  const mockInvoice: TargetInvoiceDetails = {
    invoiceId: "INV-2026-00892",
    invoiceNumber: "INV-2026-00892",
    folioId: "FOLIO-2026-4401",
    guestFullName: "Sir Reginald Sterling",
    roomNumber: "Ocean Villa 101",
    invoiceDate: "2026-10-18T10:00:00Z",
    baseAmountLkr: 100000,
    grandTotalLkr: 134343,
    previouslyCreditedBaseLkr: 0,
    previouslyCreditedTotalLkr: 0,
    lineItems: [
      {
        lineId: "LINE-1",
        description: "Ocean Villa Room Charge (2 Nights)",
        department: "ROOM",
        baseAmountLkr: 80000,
        totalAmountLkr: 107474.4,
      },
      {
        lineId: "LINE-2",
        description: "Seafood Platter Dinner",
        department: "FNB",
        baseAmountLkr: 20000,
        totalAmountLkr: 26868.6,
      },
    ],
  };

  describe("1. Pure Calculation & Reversal Math", () => {
    it("rounds numbers half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(1234.564), 1234.56);
      assert.strictEqual(roundLkr(1234.565), 1234.57);
    });

    it("accurately computes 4-stage compounding tax reversal for full invoice base", () => {
      const breakdown = calculateCreditReversal(100000, 134343, 0);

      // Base: 100,000
      assert.strictEqual(breakdown.baseLkr, 100000);
      // SC 10%: 10,000
      assert.strictEqual(breakdown.scLkr, 10000);
      // Subtotal after SC: 110,000
      assert.strictEqual(breakdown.subtotalAfterScLkr, 110000);
      // TDL 1%: 1,100
      assert.strictEqual(breakdown.tdlLkr, 1100);
      // SSCL 2.5%: 2,750
      assert.strictEqual(breakdown.ssclLkr, 2750);
      // VAT Base: 110,000 + 2,750 = 112,750
      assert.strictEqual(breakdown.vatBaseLkr, 112750);
      // VAT 18%: 20,295
      assert.strictEqual(breakdown.vatLkr, 20295);
      // Grand Total: 110000 + 1100 + 2750 + 20295 = 134,145
      assert.strictEqual(breakdown.grandTotalLkr, 134145);
      // Remaining Balance: 134343 - 134145 = 198
      assert.strictEqual(breakdown.remainingBalanceLkr, 198);
    });

    it("accurately computes partial reversal and remaining invoice balance", () => {
      const breakdown = calculateCreditReversal(50000, 134343, 0);

      assert.strictEqual(breakdown.baseLkr, 50000);
      assert.strictEqual(breakdown.scLkr, 5000);
      assert.strictEqual(breakdown.subtotalAfterScLkr, 55000);
      assert.strictEqual(breakdown.tdlLkr, 550);
      assert.strictEqual(breakdown.ssclLkr, 1375);
      assert.strictEqual(breakdown.vatBaseLkr, 56375);
      assert.strictEqual(breakdown.vatLkr, 10147.5);
      assert.strictEqual(breakdown.grandTotalLkr, 67072.5);
      assert.strictEqual(breakdown.remainingBalanceLkr, 67270.5);
    });

    it("generates sequential credit note numbers formatted as CN-YYYY-XXXXX", () => {
      const cn = generateCreditNoteNumber(2026, 42);
      assert.strictEqual(cn, "CN-2026-00042");

      const defaultCn = generateCreditNoteNumber();
      assert.strictEqual(defaultCn, "CN-2026-00001");
    });

    it("validates authorized roles strictly", () => {
      assert.strictEqual(isAuthorizedRole("SUPER_ADMIN"), true);
      assert.strictEqual(isAuthorizedRole("GENERAL_MANAGER"), true);
      assert.strictEqual(isAuthorizedRole("FINANCE_CONTROLLER"), true);
      assert.strictEqual(isAuthorizedRole("ACCOUNTANT"), true);
      assert.strictEqual(isAuthorizedRole("WAITER"), false);
      assert.strictEqual(isAuthorizedRole("HOUSEKEEPING"), false);
      assert.strictEqual(isAuthorizedRole(undefined), false);
    });
  });

  describe("2. Statutory Input & Role Validation", () => {
    it("rejects unauthorized staff role attempting to issue credit note", () => {
      const res = validateCreditNoteInput(
        "FULL_VOID",
        100000,
        100000,
        "Valid reason here",
        "1234",
        "FRONT_DESK_RECEPTIONIST",
        [],
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("not have authorization"));
    });

    it("rejects invalid or missing manager PIN", () => {
      const res = validateCreditNoteInput(
        "FULL_VOID",
        100000,
        100000,
        "Valid reason description",
        "12",
        "GENERAL_MANAGER",
        [],
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("PIN"));
    });

    it("rejects short or empty justification description", () => {
      const res = validateCreditNoteInput(
        "FULL_VOID",
        100000,
        100000,
        "Err",
        "1234",
        "GENERAL_MANAGER",
        [],
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("justification"));
    });

    it("rejects LINE_ITEM_REVERSAL when no line item is selected", () => {
      const res = validateCreditNoteInput(
        "LINE_ITEM_REVERSAL",
        0,
        100000,
        "Valid reason description",
        "1234",
        "GENERAL_MANAGER",
        [],
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("select at least one line item"));
    });

    it("rejects credit base exceeding max available allowable base", () => {
      const res = validateCreditNoteInput(
        "PARTIAL_AMOUNT",
        150000,
        100000,
        "Valid reason description",
        "1234",
        "GENERAL_MANAGER",
        [],
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("exceeds allowable balance"));
    });

    it("accepts valid credit note inputs", () => {
      const res = validateCreditNoteInput(
        "FULL_VOID",
        100000,
        100000,
        "Duplicate checkout billing mistake rectified",
        "9988",
        "FINANCE_CONTROLLER",
        [],
      );
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errorMessage, undefined);
    });
  });

  describe("3. Static Markup & HIG Accessibility", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(CreditNoteModal, {
          isOpen: false,
          onClose: () => undefined,
          onIssueCreditNote: async () => undefined,
          invoice: mockInvoice,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders open modal with invoice details, reasons, and statutory breakdown", () => {
      const html = renderToStaticMarkup(
        React.createElement(CreditNoteModal, {
          isOpen: true,
          onClose: () => undefined,
          onIssueCreditNote: async () => undefined,
          invoice: mockInvoice,
          currentUserRole: "GENERAL_MANAGER",
        }),
      );

      // Dialog title
      assert.ok(html.includes("Issue Credit Note / Tax Adjustment"));
      // Original invoice number & guest
      assert.ok(html.includes("INV-2026-00892"));
      assert.ok(html.includes("Sir Reginald Sterling"));
      assert.ok(html.includes("Ocean Villa 101"));
      // Statutory Reason Options
      for (const r of CREDIT_NOTE_REASONS) {
        assert.ok(html.includes(r.label));
      }
      // Refund methods
      for (const m of REFUND_METHODS) {
        assert.ok(html.includes(m.icon));
      }
      // Proportional tax reversal section
      assert.ok(html.includes("Proportional Statutory Tax Reversal"));
      assert.ok(html.includes("IRD VAT Act Sec. 20"));
      // Manager PIN authorization
      assert.ok(html.includes("Management Authorization Required"));
      assert.ok(html.includes("GENERAL_MANAGER"));
      assert.ok(html.includes("4-digit PIN"));
    });

    it("verifies type definitions and authorized roles constant", () => {
      assert.ok(AUTHORIZED_CREDIT_ROLES.includes("SUPER_ADMIN"));
      const cnType: CreditNoteType = "FULL_VOID";
      const cnReason: CreditNoteReason = "BILLING_ERROR";
      const refMethod: RefundMethod = "ORIGINAL_PAYMENT_METHOD";
      const taxRev: CreditNoteReversalTaxBreakdown = {
        baseLkr: 1000,
        scLkr: 100,
        subtotalAfterScLkr: 1100,
        tdlLkr: 11,
        ssclLkr: 27.5,
        vatBaseLkr: 1127.5,
        vatLkr: 202.95,
        grandTotalLkr: 1341.45,
        remainingBalanceLkr: 0,
      };
      const subPayload: CreditNoteSubmissionPayload = {
        creditNoteNumber: "CN-2026-00001",
        invoiceId: "INV-1",
        invoiceNumber: "INV-1",
        folioId: "FOLIO-1",
        creditNoteType: cnType,
        reason: cnReason,
        reasonDescription: "Correction",
        refundMethod: refMethod,
        creditedBaseLkr: 1000,
        taxReversal: taxRev,
        selectedLineIds: [],
        managerPin: "1234",
        authorizedByRole: "SUPER_ADMIN",
        authorizedByUserId: "USR-1",
        timestamp: "2026-10-19T10:00:00Z",
      };
      const props: CreditNoteModalProps = {
        isOpen: true,
        onClose: () => undefined,
        onIssueCreditNote: () => undefined,
        invoice: mockInvoice,
      };

      assert.strictEqual(cnType, "FULL_VOID");
      assert.strictEqual(cnReason, "BILLING_ERROR");
      assert.strictEqual(refMethod, "ORIGINAL_PAYMENT_METHOD");
      assert.strictEqual(taxRev.baseLkr, 1000);
      assert.strictEqual(subPayload.creditNoteNumber, "CN-2026-00001");
      assert.strictEqual(props.isOpen, true);
    });
  });
});
