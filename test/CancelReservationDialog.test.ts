import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CancelReservationDialog,
  type CancelReservationDialogProps,
  type CancelReservationPayload,
  type CancelReservationReservation,
  type CancellationReason,
  type CancellationType,
  type RefundMethod,
  type RetentionBreakdown,
  type RetentionFeePolicy,
  computeRetentionBreakdown,
  computeSettlementAmounts,
  roundLkr,
} from "../src/admin/frontdesk/CancelReservationDialog.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_RESERVATION: CancelReservationReservation = {
  reservationId: "res-gal-304",
  bookingReference: "GAL-2026-304",
  guestName: "Nimali Perera",
  guestPhone: "+94771234567",
  roomNumber: "304",
  roomTypeName: "Deluxe Ocean View",
  checkInDate: "2026-10-25",
  checkOutDate: "2026-10-28",
  nightCount: 3,
  ratePerNightLkr: 30000,
  totalBookingLkr: 90000,
  depositPaidLkr: 30000,
  driverBedAllocated: true,
  driverBedNumber: "D-12",
  channel: "Direct Website",
};

describe("Cancellation, No-Show & Retention Charge Handler (CancelReservationDialog.tsx)", () => {
  describe("1. Currency & Rupee Cent Rounding (roundLkr)", () => {
    it("rounds numbers accurately to 2 decimal places with Number.EPSILON", () => {
      assert.strictEqual(roundLkr(100.005), 100.01);
      assert.strictEqual(roundLkr(25000.554), 25000.55);
      assert.strictEqual(roundLkr(0), 0);
      assert.strictEqual(roundLkr(Number.NaN), 0);
    });
  });

  describe("2. Retention Breakdown & Sri Lankan Tax Compounding (computeRetentionBreakdown)", () => {
    it("computes zero charges when policy is WAIVE_FEE", () => {
      const res = computeRetentionBreakdown({
        policy: "WAIVE_FEE",
        ratePerNightLkr: 30000,
        totalBookingLkr: 90000,
        customAmountLkr: 15000,
        applyStatutoryTaxes: true,
      });

      assert.strictEqual(res.baseLkr, 0);
      assert.strictEqual(res.scLkr, 0);
      assert.strictEqual(res.tdlLkr, 0);
      assert.strictEqual(res.ssclLkr, 0);
      assert.strictEqual(res.vatLkr, 0);
      assert.strictEqual(res.totalRetentionLkr, 0);
    });

    it("computes FIRST_NIGHT retention charge with 4-stage tax compounding", () => {
      // Base: 30,000 LKR
      // SC (10%): 3,000 -> Subtotal: 33,000
      // TDL (1% of 33,000): 330
      // SSCL (2.5% of 33,000): 825
      // VAT Base: 33,000 + 330 + 825 = 34,155
      // VAT (18% of 34,155): 6,147.90
      // Total: 34,155 + 6,147.90 = 40,302.90
      const res = computeRetentionBreakdown({
        policy: "FIRST_NIGHT",
        ratePerNightLkr: 30000,
        totalBookingLkr: 90000,
        customAmountLkr: 0,
        applyStatutoryTaxes: true,
      });

      assert.strictEqual(res.baseLkr, 30000);
      assert.strictEqual(res.scLkr, 3000);
      assert.strictEqual(res.tdlLkr, 330);
      assert.strictEqual(res.ssclLkr, 825);
      assert.strictEqual(res.vatLkr, 6147.9);
      assert.strictEqual(res.totalRetentionLkr, 40302.9);
    });

    it("computes FULL_STAY retention charge based on total booking value", () => {
      const res = computeRetentionBreakdown({
        policy: "FULL_STAY",
        ratePerNightLkr: 30000,
        totalBookingLkr: 90000,
        customAmountLkr: 0,
        applyStatutoryTaxes: true,
      });

      assert.strictEqual(res.baseLkr, 90000);
      assert.strictEqual(res.scLkr, 9000);
      assert.strictEqual(res.tdlLkr, 990);
      assert.strictEqual(res.ssclLkr, 2475);
      assert.strictEqual(res.vatLkr, 18443.7);
      assert.strictEqual(res.totalRetentionLkr, 120908.7);
    });

    it("computes CUSTOM_AMOUNT retention charge", () => {
      const res = computeRetentionBreakdown({
        policy: "CUSTOM_AMOUNT",
        ratePerNightLkr: 30000,
        totalBookingLkr: 90000,
        customAmountLkr: 10000,
        applyStatutoryTaxes: true,
      });

      assert.strictEqual(res.baseLkr, 10000);
      assert.strictEqual(res.scLkr, 1000);
      assert.strictEqual(res.tdlLkr, 110);
      assert.strictEqual(res.ssclLkr, 275);
      assert.strictEqual(res.vatLkr, 2049.3);
      assert.strictEqual(res.totalRetentionLkr, 13434.3);
    });

    it("supports tax-exempt / tax-inclusive retention calculation without compounding", () => {
      const res = computeRetentionBreakdown({
        policy: "FIRST_NIGHT",
        ratePerNightLkr: 30000,
        totalBookingLkr: 90000,
        customAmountLkr: 0,
        applyStatutoryTaxes: false,
      });

      assert.strictEqual(res.baseLkr, 30000);
      assert.strictEqual(res.scLkr, 0);
      assert.strictEqual(res.tdlLkr, 0);
      assert.strictEqual(res.ssclLkr, 0);
      assert.strictEqual(res.vatLkr, 0);
      assert.strictEqual(res.totalRetentionLkr, 30000);
    });
  });

  describe("3. Settlement & Refund Derivation (computeSettlementAmounts)", () => {
    it("calculates net refund due when deposit exceeds retention fee", () => {
      // Paid 50,000 LKR deposit, retention is 30,000 LKR -> 20,000 LKR refund
      const settlement = computeSettlementAmounts(50000, 30000);
      assert.strictEqual(settlement.netRefundLkr, 20000);
      assert.strictEqual(settlement.guestBalanceDueLkr, 0);
    });

    it("calculates balance due when retention fee exceeds deposit paid", () => {
      // Paid 10,000 LKR deposit, retention is 40,302.90 LKR -> 30,302.90 LKR due
      const settlement = computeSettlementAmounts(10000, 40302.9);
      assert.strictEqual(settlement.netRefundLkr, 0);
      assert.strictEqual(settlement.guestBalanceDueLkr, 30302.9);
    });

    it("calculates exactly zero balance and zero refund when deposit equals retention", () => {
      const settlement = computeSettlementAmounts(30000, 30000);
      assert.strictEqual(settlement.netRefundLkr, 0);
      assert.strictEqual(settlement.guestBalanceDueLkr, 0);
    });
  });

  describe("4. Static UI Rendering & Apple HIG Compliance (renderToStaticMarkup)", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(CancelReservationDialog, {
          isOpen: false,
          onClose: noop,
          reservation: SAMPLE_RESERVATION,
          onConfirmCancellation: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders open modal dialog with booking reference and guest details", () => {
      const html = renderToStaticMarkup(
        React.createElement(CancelReservationDialog, {
          isOpen: true,
          onClose: noop,
          reservation: SAMPLE_RESERVATION,
          onConfirmCancellation: noop,
        }),
      );

      assert.ok(html.includes("Nimali Perera"));
      assert.ok(html.includes("GAL-2026-304"));
      assert.ok(html.includes("Room 304"));
      assert.ok(html.includes("Deluxe Ocean View"));
      assert.ok(html.includes("Cancel &amp; Release Room"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders driver quarters bed release option when bed is allocated", () => {
      const html = renderToStaticMarkup(
        React.createElement(CancelReservationDialog, {
          isOpen: true,
          onClose: noop,
          reservation: SAMPLE_RESERVATION,
          onConfirmCancellation: noop,
        }),
      );

      assert.ok(html.includes("Release allocated Driver Quarters bed (D-12)"));
    });

    it("omits driver bed release option when no bed was allocated", () => {
      const withoutDriverBed: CancelReservationReservation = {
        ...SAMPLE_RESERVATION,
        driverBedAllocated: false,
        driverBedNumber: undefined,
      };

      const html = renderToStaticMarkup(
        React.createElement(CancelReservationDialog, {
          isOpen: true,
          onClose: noop,
          reservation: withoutDriverBed,
          onConfirmCancellation: noop,
        }),
      );

      assert.strictEqual(html.includes("Release allocated Driver Quarters bed"), false);
    });

    it("disables interactive buttons when disabled prop is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(CancelReservationDialog, {
          isOpen: true,
          onClose: noop,
          reservation: SAMPLE_RESERVATION,
          onConfirmCancellation: noop,
          disabled: true,
        }),
      );

      assert.ok(html.includes("disabled"));
    });
  });

  describe("5. Type Definitions & Contract Verification", () => {
    it("ensures all exported domain types and contracts are constructible", () => {
      const sampleBreakdown: RetentionBreakdown = {
        baseLkr: 20000,
        scLkr: 2000,
        tdlLkr: 220,
        ssclLkr: 550,
        vatLkr: 4098.6,
        totalRetentionLkr: 26868.6,
      };

      const sampleType: CancellationType = "GUEST_CANCELLATION";
      const sampleReason: CancellationReason = "GUEST_CHANGE_OF_PLANS";
      const samplePolicy: RetentionFeePolicy = "FIRST_NIGHT";
      const sampleRefundMethod: RefundMethod = "ORIGINAL_PAYMENT";

      const samplePayload: CancelReservationPayload = {
        reservationId: "res-001",
        cancellationType: sampleType,
        reason: sampleReason,
        reasonNotes: "Flight cancelled",
        retentionPolicy: samplePolicy,
        retentionBreakdown: sampleBreakdown,
        depositPaidLkr: 30000,
        netRefundLkr: 3131.4,
        guestBalanceDueLkr: 0,
        refundMethod: sampleRefundMethod,
        releaseRoomInventory: true,
        releaseDriverBed: false,
      };

      const sampleProps: CancelReservationDialogProps = {
        isOpen: true,
        onClose: noop,
        reservation: SAMPLE_RESERVATION,
        onConfirmCancellation: noop,
        disabled: false,
      };

      assert.strictEqual(samplePayload.reservationId, "res-001");
      assert.strictEqual(sampleProps.isOpen, true);
    });
  });
});
