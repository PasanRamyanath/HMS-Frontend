import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CheckOutConfirmDialog,
  type CheckOutConfirmDialogProps,
  type CheckOutConfirmPayload,
  type CheckOutEligibility,
  type CheckOutReservationContext,
  type CityLedgerApprovalInfo,
  DEFAULT_CHECKOUT_RESERVATION,
  type HousekeepingPriority,
  type MinibarStatus,
  buildDepartureThankYouSms,
  generateQrHmacRevocationToken,
  validateCheckOutEligibility,
} from "../src/admin/folios/CheckOutConfirmDialog.js";

describe("Step 210: CheckOutConfirmDialog & One-Click Check-Out Workflow", () => {
  describe("1. Check-Out Eligibility Validator (validateCheckOutEligibility)", () => {
    it("permits check-out when folio balance is fully settled (0.00 LKR)", () => {
      const settledContext: CheckOutReservationContext = {
        ...DEFAULT_CHECKOUT_RESERVATION,
        balanceDueLkr: 0,
      };
      const result: CheckOutEligibility = validateCheckOutEligibility(settledContext, false);
      assert.strictEqual(result.canCheckOut, true);
      assert.strictEqual(result.requiresCityLedgerApproval, false);
      assert.strictEqual(result.reason, undefined);
    });

    it("blocks check-out when direct guest has an outstanding balance", () => {
      const balanceContext: CheckOutReservationContext = {
        ...DEFAULT_CHECKOUT_RESERVATION,
        balanceDueLkr: 45000,
        isCityLedgerDirectBill: false,
      };
      const result = validateCheckOutEligibility(balanceContext, false);
      assert.strictEqual(result.canCheckOut, false);
      assert.strictEqual(result.requiresCityLedgerApproval, false);
      assert.ok(result.reason?.includes("45,000"));
      assert.ok(result.reason?.includes("must be settled"));
    });

    it("blocks check-out for DMC booking with balance until City Ledger transfer is approved", () => {
      const dmcContext: CheckOutReservationContext = {
        ...DEFAULT_CHECKOUT_RESERVATION,
        balanceDueLkr: 150000,
        isCityLedgerDirectBill: true,
        dmcContractName: "Aitken Spence Travels",
      };
      const unapprovedResult = validateCheckOutEligibility(dmcContext, false);
      assert.strictEqual(unapprovedResult.canCheckOut, false);
      assert.strictEqual(unapprovedResult.requiresCityLedgerApproval, true);
      assert.ok(unapprovedResult.reason?.includes("City Ledger transfer approval"));

      const approvedResult = validateCheckOutEligibility(dmcContext, true);
      assert.strictEqual(approvedResult.canCheckOut, true);
      assert.strictEqual(approvedResult.requiresCityLedgerApproval, true);
    });
  });

  describe("2. Room QR HMAC Revocation Helper (generateQrHmacRevocationToken)", () => {
    it("generates formatted revocation token with room and reservation context", () => {
      const token = generateQrHmacRevocationToken("Villa 104", "RES-9042", "2026-10-19T12:00:00Z");
      assert.ok(token.startsWith("revoked_hmac_"), `Expected prefix revoked_hmac_, got ${token}`);
      assert.ok(token.length >= 16);
    });
  });

  describe("3. Departure Thank You SMS Builder (buildDepartureThankYouSms)", () => {
    it("creates polite trilingual departure blessing", () => {
      const sms = buildDepartureThankYouSms({
        hotelName: "Tangalle Breeze Resort",
        guestName: "Alexander",
        roomNumber: "104",
      });
      assert.ok(sms.includes("Ayubowan Alexander!"));
      assert.ok(sms.includes("Tangalle Breeze Resort"));
      assert.ok(sms.includes("Room 104"));
      assert.ok(sms.includes("ස්තූතියි"));
      assert.ok(sms.includes("நன்றி"));
    });
  });

  describe("4. Presets and Defaults Integrity", () => {
    it("verifies default checkout reservation properties", () => {
      assert.strictEqual(DEFAULT_CHECKOUT_RESERVATION.roomNumber, "Villa 104");
      assert.strictEqual(DEFAULT_CHECKOUT_RESERVATION.balanceDueLkr, 0);
      assert.strictEqual(DEFAULT_CHECKOUT_RESERVATION.keyCardsIssuedCount, 2);
      assert.strictEqual(DEFAULT_CHECKOUT_RESERVATION.nextArrivalExpectedToday, true);
    });
  });

  describe("5. React Component Static Markup Rendering (CheckOutConfirmDialog)", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(CheckOutConfirmDialog, {
          isOpen: false,
          onClose: () => undefined,
          reservation: DEFAULT_CHECKOUT_RESERVATION,
          onConfirmCheckOut: () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders dialog when isOpen is true with clearance, housekeeping, and QR revocation", () => {
      const html = renderToStaticMarkup(
        React.createElement(CheckOutConfirmDialog, {
          isOpen: true,
          onClose: () => undefined,
          reservation: DEFAULT_CHECKOUT_RESERVATION,
          onConfirmCheckOut: () => undefined,
          onSettleBalanceClick: () => undefined,
        }),
      );

      // Header
      assert.ok(html.includes("One-Click Check-Out Workflow"));
      assert.ok(html.includes("Villa 104"));
      assert.ok(html.includes("Alexander James Wright"));
      assert.ok(html.includes("FOLIO-2026-0991"));

      // Clearance complete
      assert.ok(html.includes("Folio Financial Clearance Complete"));
      assert.ok(html.includes("LKR 0.00"));

      // Turnover & Housekeeping
      assert.ok(html.includes("Housekeeping Room Turnover Status"));
      assert.ok(html.includes("Will Mark: DIRTY (VACANT)"));
      assert.ok(html.includes("Urgent Turnover"));
      assert.ok(html.includes("Push real-time alert to Housekeeping Mobile Runner App"));

      // Contactless QR Session Revocation
      assert.ok(html.includes("Room Contactless QR Session Revocation"));
      assert.ok(html.includes("REVOCATION ACTIVE"));
      assert.ok(html.includes(DEFAULT_CHECKOUT_RESERVATION.activeRoomQrHmacToken));

      // Key cards and minibar
      assert.ok(html.includes("Key Cards Returned"));
      assert.ok(html.includes("Minibar Inspection Status"));

      // Departure comms
      assert.ok(html.includes("Send &quot;Ayubowan&quot; Departure SMS"));

      // Action button
      assert.ok(html.includes("Confirm Check-Out &amp; Revoke Room QR"));
    });

    it("renders outstanding balance warning and disables check-out for unsettled direct guest", () => {
      const directGuestWithBalance: CheckOutReservationContext = {
        ...DEFAULT_CHECKOUT_RESERVATION,
        balanceDueLkr: 25000,
        isCityLedgerDirectBill: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(CheckOutConfirmDialog, {
          isOpen: true,
          onClose: () => undefined,
          reservation: directGuestWithBalance,
          onConfirmCheckOut: () => undefined,
          onSettleBalanceClick: () => undefined,
        }),
      );

      assert.ok(html.includes("Outstanding Balance Due — Payment Required"));
      assert.ok(html.includes("Settle Balance Now"));
      assert.ok(html.includes("disabled"));
    });

    it("renders City Ledger approval checkbox for DMC booking with balance", () => {
      const dmcWithBalance: CheckOutReservationContext = {
        ...DEFAULT_CHECKOUT_RESERVATION,
        balanceDueLkr: 120000,
        isCityLedgerDirectBill: true,
        dmcContractName: "Walkers Tours",
      };

      const html = renderToStaticMarkup(
        React.createElement(CheckOutConfirmDialog, {
          isOpen: true,
          onClose: () => undefined,
          reservation: dmcWithBalance,
          onConfirmCheckOut: () => undefined,
        }),
      );

      assert.ok(html.includes("DMC Corporate City Ledger Transfer"));
      assert.ok(html.includes("Walkers Tours"));
      assert.ok(html.includes("Approve balance transfer to City Ledger statement"));
    });

    it("exercises typescript interfaces and types safely", () => {
      const priority: HousekeepingPriority = "DEEP_CLEAN_MAINTENANCE";
      const status: MinibarStatus = "CONSUMPTION_POSTED";
      const clInfo: CityLedgerApprovalInfo = {
        dmcName: "Jetwing",
        approvalCode: "CL-001",
        amountTransferredLkr: 50000,
      };
      const payload: CheckOutConfirmPayload = {
        reservationId: "R-1",
        folioId: "F-1",
        roomNumber: "101",
        checkoutTimestampIso: "2026-10-19T12:00:00Z",
        keyCardsReturned: 2,
        minibarStatus: status,
        housekeepingPriority: priority,
        alertHousekeepingRunner: true,
        roomNewStatus: "DIRTY",
        qrTokenRevoked: true,
        revokedHmacToken: "revoked_123",
        cityLedgerApproval: clInfo,
        sendThankYouSms: true,
        sendInvoiceEmail: true,
        notes: "Test",
      };

      const props: CheckOutConfirmDialogProps = {
        isOpen: true,
        onClose: () => undefined,
        reservation: DEFAULT_CHECKOUT_RESERVATION,
        onConfirmCheckOut: () => undefined,
        hotelName: "Tangalle Breeze",
      };

      assert.strictEqual(payload.roomNewStatus, "DIRTY");
      assert.strictEqual(props.hotelName, "Tangalle Breeze");
    });
  });
});
