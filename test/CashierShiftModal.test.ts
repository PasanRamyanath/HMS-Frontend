import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CashierShiftClosePayload,
  CashierShiftModal,
  type CashierShiftModalProps,
  type CashierShiftSession,
  DEFAULT_SHIFT_SESSION,
  type DenominationCount,
  type ForeignCurrencyDropEnvelope,
  SRI_LANKAN_DENOMINATIONS,
  type ShiftType,
  type VarianceStatus,
  calculateBankDrop,
  calculateCountedNotesTotal,
  calculateExpectedCash,
  calculateVariance,
  getVarianceBadgeInfo,
  roundLkr,
} from "../src/admin/folios/CashierShiftModal.js";

describe("Step 213: CashierShiftModal & Cash Drawer Drop Reconciliation", () => {
  describe("1. Pure Financial Calculation Helpers", () => {
    it("rounds numbers half-up to 2 decimal places safely", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(1234.564), 1234.56);
      assert.strictEqual(roundLkr(1234.565), 1234.57);
    });

    it("calculates expected cash: opening + cash collections - fx payout - petty cash", () => {
      // 50,000 + 185,000 - 45,000 - 5,000 = 185,000
      const expected = calculateExpectedCash({
        openingFloatLkr: 50000,
        systemCashCollectedLkr: 185000,
        systemFxEncashmentPaidOutLkr: 45000,
        systemPettyCashPaidOutLkr: 5000,
      });
      assert.strictEqual(expected, 185000);
    });

    it("handles missing or NaN figures safely in calculateExpectedCash", () => {
      const expected = calculateExpectedCash({
        openingFloatLkr: 50000,
        systemCashCollectedLkr: Number.NaN,
        systemFxEncashmentPaidOutLkr: 0,
        systemPettyCashPaidOutLkr: 5000,
      });
      assert.strictEqual(expected, 45000);
    });

    it("calculates total physical counted cash from notes and coins", () => {
      const counts: ReadonlyArray<DenominationCount> = [
        { denomination: 5000, count: 20, label: "Rs. 5,000 Note" }, // 100,000
        { denomination: 1000, count: 15, label: "Rs. 1,000 Note" }, // 15,000
        { denomination: 500, count: 10, label: "Rs. 500 Note" }, // 5,000
      ];
      const coins = 350.5;
      // 100,000 + 15,000 + 5,000 + 350.5 = 120,350.5
      const total = calculateCountedNotesTotal(counts, coins);
      assert.strictEqual(total, 120350.5);
    });

    it("handles negative and zero note counts safely in calculateCountedNotesTotal", () => {
      const counts: ReadonlyArray<DenominationCount> = [
        { denomination: 5000, count: -5, label: "Rs. 5,000" },
        { denomination: 1000, count: 2, label: "Rs. 1,000" },
      ];
      assert.strictEqual(calculateCountedNotesTotal(counts, -10), 2000);
    });

    it("computes variance accurately with BALANCED, OVERAGE, and SHORTAGE statuses", () => {
      // Balanced
      const balanced = calculateVariance(185000, 185000);
      assert.strictEqual(balanced.varianceLkr, 0);
      assert.strictEqual(balanced.status, "BALANCED");

      // Overage (+2,500)
      const overage = calculateVariance(187500, 185000);
      assert.strictEqual(overage.varianceLkr, 2500);
      assert.strictEqual(overage.status, "OVERAGE");

      // Shortage (-1,000)
      const shortage = calculateVariance(184000, 185000);
      assert.strictEqual(shortage.varianceLkr, -1000);
      assert.strictEqual(shortage.status, "SHORTAGE");
    });

    it("calculates drop-safe banking envelope amount accurately", () => {
      // Counted: 185,000 - Retained next float: 50,000 = 135,000
      assert.strictEqual(calculateBankDrop(185000, 50000), 135000);
      // Clamps to 0 if float exceeds counted cash
      assert.strictEqual(calculateBankDrop(40000, 50000), 0);
      assert.strictEqual(calculateBankDrop(-100, 50000), 0);
    });

    it("returns appropriate badge classes and labels for variance statuses", () => {
      const bInfo = getVarianceBadgeInfo("BALANCED");
      assert.ok(bInfo.badgeClass.includes("emerald"));
      assert.ok(bInfo.label.includes("Perfect Balance"));

      const oInfo = getVarianceBadgeInfo("OVERAGE");
      assert.ok(oInfo.badgeClass.includes("amber"));
      assert.ok(oInfo.label.includes("Cash Overage"));

      const sInfo = getVarianceBadgeInfo("SHORTAGE");
      assert.ok(sInfo.badgeClass.includes("rose"));
      assert.ok(sInfo.label.includes("Cash Shortage"));
    });
  });

  describe("2. Presets & Default Shift Integrity", () => {
    it("includes standard Central Bank of Sri Lanka note denominations", () => {
      assert.strictEqual(SRI_LANKAN_DENOMINATIONS.length, 6);
      const denoms = SRI_LANKAN_DENOMINATIONS.map((d) => d.denomination);
      assert.deepStrictEqual(denoms, [5000, 1000, 500, 100, 50, 20]);
    });

    it("ensures default shift session has valid drawer and financial values", () => {
      assert.strictEqual(DEFAULT_SHIFT_SESSION.shiftType, "MORNING");
      assert.strictEqual(DEFAULT_SHIFT_SESSION.openingFloatLkr, 50000);
      assert.strictEqual(DEFAULT_SHIFT_SESSION.foreignEnvelopes.length, 2);
      assert.ok(DEFAULT_SHIFT_SESSION.foreignEnvelopes.some((e) => e.currency === "USD"));
      assert.ok(DEFAULT_SHIFT_SESSION.foreignEnvelopes.some((e) => e.currency === "EUR"));
    });
  });

  describe("3. Static Markup Rendering (CashierShiftModal)", () => {
    it("renders modal when isOpen is true with cashier details and financial cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(CashierShiftModal, {
          isOpen: true,
          onClose: () => undefined,
          onCompleteHandover: () => undefined,
          shiftSession: DEFAULT_SHIFT_SESSION,
        }),
      );

      assert.ok(html.includes("Cashier Shift Handover &amp; Drawer Drop"));
      assert.ok(html.includes("Chaminda Rathnayake"));
      assert.ok(html.includes("USR-CSH-002"));
      assert.ok(html.includes("Front Desk Cash Drawer #1"));
      assert.ok(html.includes("Expected System Cash"));
      assert.ok(html.includes("Actual Physical Cash Counted"));
      assert.ok(html.includes("Variance (Over / Short)"));
    });

    it("renders denomination counting table with notes and coins inputs", () => {
      const html = renderToStaticMarkup(
        React.createElement(CashierShiftModal, {
          isOpen: true,
          onClose: () => undefined,
          onCompleteHandover: () => undefined,
          shiftSession: DEFAULT_SHIFT_SESSION,
        }),
      );

      assert.ok(html.includes("Rs. 5,000 Note"));
      assert.ok(html.includes("Rs. 1,000 Note"));
      assert.ok(html.includes("Rs. 500 Note"));
      assert.ok(html.includes("Coins Total (Rs. 10, 5, 2, 1)"));
    });

    it("renders foreign currency envelopes section", () => {
      const html = renderToStaticMarkup(
        React.createElement(CashierShiftModal, {
          isOpen: true,
          onClose: () => undefined,
          onCompleteHandover: () => undefined,
          shiftSession: DEFAULT_SHIFT_SESSION,
        }),
      );

      assert.ok(html.includes("USD 350"));
      assert.ok(html.includes("EUR 100"));
      assert.ok(html.includes("ENV-FX-2026-0041"));
      assert.ok(html.includes("ENV-FX-2026-0042"));
      assert.ok(html.includes("Foreign Currency Envelopes to Drop to Safe"));
    });

    it("renders closing drop calculation and incoming cashier fields", () => {
      const html = renderToStaticMarkup(
        React.createElement(CashierShiftModal, {
          isOpen: true,
          onClose: () => undefined,
          onCompleteHandover: () => undefined,
          shiftSession: DEFAULT_SHIFT_SESSION,
        }),
      );

      assert.ok(html.includes("Retained Float for Next Shift"));
      assert.ok(html.includes("Drop-Safe Banking Envelope Amount"));
      assert.ok(html.includes("Incoming Relieving Cashier Name / ID"));
      assert.ok(html.includes("Handover Remarks"));
      assert.ok(html.includes("Finalize Shift Handover &amp; Drop Cash"));
    });

    it("does not render modal contents when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(CashierShiftModal, {
          isOpen: false,
          onClose: () => undefined,
          onCompleteHandover: () => undefined,
          shiftSession: DEFAULT_SHIFT_SESSION,
        }),
      );

      assert.strictEqual(html, "");
    });

    it("validates all exported types and interfaces compile cleanly", () => {
      const shift: ShiftType = "NIGHT_AUDIT";
      const status: VarianceStatus = "OVERAGE";
      const denom: DenominationCount = {
        denomination: 5000,
        count: 10,
        label: "Rs. 5,000",
      };
      const env: ForeignCurrencyDropEnvelope = {
        currency: "GBP",
        amount: 200,
        noteCount: 4,
        envelopeSerial: "ENV-01",
      };
      const session: CashierShiftSession = DEFAULT_SHIFT_SESSION;
      const payload: CashierShiftClosePayload = {
        shiftId: "S-1",
        closingTimestamp: "2026-10-19",
        openingFloatLkr: 50000,
        expectedCashLkr: 185000,
        actualCountedCashLkr: 185000,
        varianceLkr: 0,
        varianceStatus: "BALANCED",
        denominationCounts: [denom],
        coinsTotalLkr: 0,
        nextShiftFloatLkr: 50000,
        bankDropSafeLkr: 135000,
        foreignEnvelopesDropped: [env],
        relievingCashierUserId: "USR-02",
        relievingCashierName: "Name",
        handoverRemarks: "All good",
      };
      const props: CashierShiftModalProps = {
        isOpen: true,
        onClose: () => undefined,
        onCompleteHandover: () => undefined,
      };

      assert.strictEqual(shift, "NIGHT_AUDIT");
      assert.strictEqual(status, "OVERAGE");
      assert.ok(session.shiftId);
      assert.ok(payload.shiftId);
      assert.ok(props.isOpen);
    });
  });
});
