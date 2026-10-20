/**
 * Unit Tests for Step 336: Staged Wedding Deposit Schedule & PayHere Payment Link Tracker (BanquetDepositSchedule.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetDepositSchedule,
  DEFAULT_BANQUET_DEPOSIT_MILESTONES,
  calculateDepositScheduleSummary,
  formatDaysRemaining,
  generateLankaQrPayload,
  generatePayHerePaymentLink,
  getPaymentMethodLabel,
  getPaymentStatusBadgeStyle,
  getPaymentStatusLabel,
  isMilestoneOverdue,
} from "../src/admin/banquets/index.js";

const noop = (): void => {
  /* no-op for tests */
};

describe("Step 336: Staged Wedding Deposit Schedule & Payment Link Tracker (BanquetDepositSchedule.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Calculation & Gateway Link Generators
  // --------------------------------------------------------------------------
  describe("1. Pure Calculation & Gateway Link Generators", () => {
    it("calculateDepositScheduleSummary calculates balances, percentages and next due milestone accurately", () => {
      const summary = calculateDepositScheduleSummary(DEFAULT_BANQUET_DEPOSIT_MILESTONES, 2783800);

      // Total quote
      assert.strictEqual(summary.totalFunctionValueLkr, 2783800);

      // Paid: Stage 1 (695,950) + Stage 2 (1,391,900) = 2,087,850
      assert.strictEqual(summary.totalPaidAmountLkr, 2087850);

      // Balance: 2,783,800 - 2,087,850 = 695,950
      assert.strictEqual(summary.totalBalanceDueLkr, 695950);

      // Paid percentage: 2,087,850 / 2,783,800 = 75%
      assert.strictEqual(Math.round(summary.paidPercentage), 75);

      // Paid milestones count
      assert.strictEqual(summary.paidMilestonesCount, 2);
      assert.strictEqual(summary.milestonesCount, 3);

      // Next due milestone: Stage 3 (Final settlement)
      assert.ok(summary.nextDueMilestone);
      assert.strictEqual(summary.nextDueMilestone?.stage, "FINAL_SETTLEMENT");
    });

    it("generatePayHerePaymentLink creates valid checkout URL", () => {
      const link = generatePayHerePaymentLink("RES-9988", "mil-01", 50000);
      assert.ok(link.startsWith("https://payhere.lk/pay/checkout"));
      assert.ok(link.includes("res=RES-9988"));
      assert.ok(link.includes("mil=mil-01"));
      assert.ok(link.includes("amt=50000.00"));
      assert.ok(link.includes("curr=LKR"));
    });

    it("generateLankaQrPayload constructs valid CBSL EMVCo string payload", () => {
      const payload = generateLankaQrPayload("RES-9988", "mil-01", 50000);
      assert.ok(payload.startsWith("00020101021226400010s.lk.lankaqr"));
      assert.ok(payload.includes("540850000.00")); // Amount tag 54
      assert.ok(payload.includes("5802LK")); // Country LK tag 58
      assert.ok(payload.includes("RES-9988-mil-01")); // Reference
    });

    it("isMilestoneOverdue correctly identifies overdue dates while respecting paid/waived status", () => {
      // Past date but paid -> false
      assert.strictEqual(isMilestoneOverdue("2020-01-01", "PAID"), false);
      // Past date and waived -> false
      assert.strictEqual(isMilestoneOverdue("2020-01-01", "WAIVED"), false);
      // Past date and pending -> true
      assert.strictEqual(isMilestoneOverdue("2020-01-01", "PENDING"), true);
      // Future date and pending -> false
      assert.strictEqual(isMilestoneOverdue("2099-01-01", "PENDING"), false);
    });

    it("formatDaysRemaining returns numeric difference between today and due date", () => {
      const futureDays = formatDaysRemaining("2099-01-01");
      assert.ok(futureDays > 1000);

      const pastDays = formatDaysRemaining("2020-01-01");
      assert.ok(pastDays < 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Status & Method Label Localization
  // --------------------------------------------------------------------------
  describe("2. Status & Method Label Localization", () => {
    it("getPaymentStatusBadgeStyle returns valid Apple HIG color tokens", () => {
      const paidStyle = getPaymentStatusBadgeStyle("PAID");
      assert.ok(paidStyle.bg.includes("emerald"));
      assert.ok(paidStyle.text.includes("emerald"));

      const overdueStyle = getPaymentStatusBadgeStyle("OVERDUE");
      assert.ok(overdueStyle.bg.includes("rose"));

      const pendingStyle = getPaymentStatusBadgeStyle("PENDING");
      assert.ok(pendingStyle.bg.includes("amber"));
    });

    it("getPaymentStatusLabel localizes statuses across English, Sinhala, and Tamil", () => {
      assert.strictEqual(getPaymentStatusLabel("PAID", "en"), "Paid & Settled");
      assert.strictEqual(getPaymentStatusLabel("PAID", "si"), "ගෙවා ඇත");
      assert.strictEqual(getPaymentStatusLabel("PAID", "ta"), "செலுத்தப்பட்டது");

      assert.strictEqual(getPaymentStatusLabel("OVERDUE", "en"), "Overdue");
      assert.strictEqual(getPaymentStatusLabel("OVERDUE", "si"), "කල් ඉකුත් වී ඇත");
      assert.strictEqual(getPaymentStatusLabel("OVERDUE", "ta"), "தாமதமானது");
    });

    it("getPaymentMethodLabel returns clean Sri Lankan channel names", () => {
      assert.strictEqual(getPaymentMethodLabel("LANKA_QR"), "CBSL LankaQR (Instant CEFT)");
      assert.strictEqual(getPaymentMethodLabel("PAYHERE_ONLINE"), "PayHere Online (Visa/Master)");
      assert.strictEqual(
        getPaymentMethodLabel("BANK_TRANSFER"),
        "Bank Direct Credit (Sampath/ComBank)",
      );
      assert.strictEqual(getPaymentMethodLabel("CREDIT_CARD_POS"), "Front Desk POS Terminal");
      assert.strictEqual(getPaymentMethodLabel("CASH"), "Front Desk Cash Receipt");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Static React Rendering & Integration
  // --------------------------------------------------------------------------
  describe("3. Static React Rendering & Integration", () => {
    it("renders BanquetDepositSchedule in English cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetDepositSchedule, {
          reservationId: "RES-BNQ-9482",
          functionTitle: "Kasun & Sanduni's Wedding Reception",
          functionDate: "2026-11-18",
          totalQuoteAmountLkr: 2783800,
          clientName: "Mr. Kasun Rajapaksha",
          clientPhone: "+94 77 123 4567",
          initialMilestones: DEFAULT_BANQUET_DEPOSIT_MILESTONES,
          language: "en",
          onMilestonesChange: noop,
          onSendSmsReminder: noop,
          onPrintReceipt: noop,
        }),
      );

      assert.ok(html.includes("Staged Wedding Deposit Schedule &amp; Payment Link Tracker"));
      assert.ok(html.includes("Total Function Value"));
      assert.ok(html.includes("Initial Booking Advance (Date Lock)"));
      assert.ok(html.includes("60-Day Menu &amp; Headcount Confirmation"));
      assert.ok(html.includes("7-Day Final Guaranteed Balance Settlement"));
      assert.ok(html.includes("CBSL LankaQR Dynamic Code"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("PayHere Link"));
      assert.ok(html.includes("SMS Alert"));
    });

    it("renders BanquetDepositSchedule in Sinhala cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetDepositSchedule, {
          reservationId: "RES-BNQ-9482",
          language: "si",
          onMilestonesChange: noop,
        }),
      );

      assert.ok(html.includes("අත්තිකාරම් ගෙවීම් කාලසටහන සහ PayHere ගෙවීම් පියවර"));
      assert.ok(html.includes("මුළු ඇස්තමේන්තුව"));
      assert.ok(html.includes("ලැබුණු අත්තිකාරම්"));
      assert.ok(html.includes("මූලික වෙන්කිරීමේ අත්තිකාරම (දිනය තහවුරු කිරීම)"));
    });

    it("renders BanquetDepositSchedule in Tamil cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetDepositSchedule, {
          reservationId: "RES-BNQ-9482",
          language: "ta",
          onMilestonesChange: noop,
        }),
      );

      assert.ok(html.includes("படிமுறை திருமண வைப்பு அட்டவணை &amp; PayHere இணைப்பு கண்காணிப்பாளர்"));
      assert.ok(html.includes("மொத்த நிகழ்வு மதிப்பு"));
      assert.ok(html.includes("பெறப்பட்ட முன்பணம்"));
    });
  });
});
