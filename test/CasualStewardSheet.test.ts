/**
 * Unit Test Suite: Step 346 (Phase 14.21) — CasualStewardSheet.tsx
 *
 * Verifies the Casual Banquet Waiter / Steward Attendance & Payout Sheet:
 * 1. Sri Lankan National Identity Card (NIC) Validation (isValidSriLankanNic)
 * 2. Individual Steward Payout Calculation (computeStewardPayout)
 * 3. Function Labor Aggregation & Ratio Derivation (computeCasualSheetSummary)
 * 4. Formatters & Status Badge Resolvers (formatStewardCurrency, resolveAttendanceStatusBadge, etc.)
 * 5. React 19 Component Static Rendering & Apple HIG Verification (Bento, Table, A4 Cashier Voucher)
 * 6. Trilingual Localization (English, Sinhala, Tamil)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidSriLankanNic } from "../src/admin/banquets/BanquetBookingModal.js";
import {
  CasualStewardSheet,
  DEFAULT_CASUAL_STEWARDS,
  DEFAULT_EVENT_HEADER_INFO,
  computeCasualSheetSummary,
  computeStewardPayout,
  formatStewardCurrency,
  formatStewardHours,
  resolveAttendanceStatusBadge,
  resolvePayoutStatusBadge,
} from "../src/admin/banquets/CasualStewardSheet.js";

describe("Step 346: CasualStewardSheet — Casual Banquet Waiter Attendance & Payout Engine", () => {
  describe("1. Sri Lankan National Identity Card (NIC) Validation (isValidSriLankanNic)", () => {
    it("validates old 9-digit NIC with 'V' or 'v' or 'X' or 'x'", () => {
      assert.strictEqual(isValidSriLankanNic("901234567V"), true);
      assert.strictEqual(isValidSriLankanNic("882345678v"), true);
      assert.strictEqual(isValidSriLankanNic("951876543X"), true);
      assert.strictEqual(isValidSriLankanNic("921876543x"), true);
    });

    it("validates new 12-digit NIC format", () => {
      assert.strictEqual(isValidSriLankanNic("199418501234"), true);
      assert.strictEqual(isValidSriLankanNic("200109802345"), true);
    });

    it("rejects invalid NIC numbers with incorrect lengths or characters", () => {
      assert.strictEqual(isValidSriLankanNic(""), false);
      assert.strictEqual(isValidSriLankanNic("12345"), false);
      assert.strictEqual(isValidSriLankanNic("9012345678"), false);
      assert.strictEqual(isValidSriLankanNic("1994185012345"), false); // 13 digits
      assert.strictEqual(isValidSriLankanNic("901234567A"), false); // Invalid letter
      assert.strictEqual(isValidSriLankanNic("ABC123456789"), false);
    });
  });

  describe("2. Individual Steward Payout Calculation (computeStewardPayout)", () => {
    it("computes payout with overtime, night allowance and tips share", () => {
      const steward = {
        id: "STW-TEST-1",
        fullName: "Sunil Shantha",
        nic: "901234567V",
        phone: "+94 77 123 4567",
        role: "TABLE_RUNNER" as const,
        agency: "HOTEL_CASUAL_POOL" as const,
        scheduledHours: 8,
        actualHours: 9.5, // 1.5 hrs OT
        baseFunctionAllowanceLkr: 5000,
        overtimeHourlyRateLkr: 600, // 1.5 * 600 = 900
        nightTravelAllowanceLkr: 1000,
        tipsShareLkr: 600,
        attendanceStatus: "COMPLETED" as const,
        payoutStatus: "AUTHORIZED_FOR_CASH" as const,
        receiptSignatureCollected: false,
      };

      const payout = computeStewardPayout(steward);
      assert.strictEqual(payout.baseAllowanceLkr, 5000);
      assert.strictEqual(payout.overtimeHours, 1.5);
      assert.strictEqual(payout.overtimePayLkr, 900);
      assert.strictEqual(payout.nightAllowanceLkr, 1000);
      assert.strictEqual(payout.tipsShareLkr, 600);
      assert.strictEqual(payout.totalPayoutLkr, 7500); // 5000 + 900 + 1000 + 600
    });

    it("zeroes out payout if steward is marked ABSENT", () => {
      const baseSteward = DEFAULT_CASUAL_STEWARDS[0];
      assert.ok(baseSteward);
      const absentSteward = {
        ...baseSteward,
        attendanceStatus: "ABSENT" as const,
      };

      const payout = computeStewardPayout(absentSteward);
      assert.strictEqual(payout.totalPayoutLkr, 0);
      assert.strictEqual(payout.baseAllowanceLkr, 0);
      assert.strictEqual(payout.overtimePayLkr, 0);
    });

    it("handles zero overtime when actual hours are less than or equal to scheduled", () => {
      const baseSteward = DEFAULT_CASUAL_STEWARDS[0];
      assert.ok(baseSteward);
      const steward = {
        ...baseSteward,
        actualHours: 7.5,
        scheduledHours: 8,
        baseFunctionAllowanceLkr: 4500,
        nightTravelAllowanceLkr: 1000,
        tipsShareLkr: 500,
      };

      const payout = computeStewardPayout(steward);
      assert.strictEqual(payout.overtimeHours, 0);
      assert.strictEqual(payout.overtimePayLkr, 0);
      assert.strictEqual(payout.totalPayoutLkr, 6000); // 4500 + 1000 + 500
    });
  });

  describe("3. Function Labor Aggregation & Ratio Derivation (computeCasualSheetSummary)", () => {
    it("aggregates steward headcount, wages, allowances, and cashier disbursement", () => {
      const summary = computeCasualSheetSummary(DEFAULT_CASUAL_STEWARDS, 250);

      assert.strictEqual(summary.totalStewardsCount, 6);
      assert.strictEqual(summary.presentCount, 6);
      assert.strictEqual(summary.absentCount, 0);
      // 250 pax / 6 stewards = 1 : 42 pax
      assert.strictEqual(summary.stewardToGuestRatio, "1 : 42 pax");

      assert.ok(summary.totalBaseWagesLkr > 20000);
      assert.ok(summary.totalOvertimePayLkr > 0);
      assert.ok(summary.totalAllowancesLkr > 0);
      assert.strictEqual(
        summary.totalNetPayoutLkr,
        summary.totalCashDisbursedLkr + summary.totalPendingDisbursementLkr,
      );
    });

    it("handles sheet with absent stewards correctly", () => {
      const stw0 = DEFAULT_CASUAL_STEWARDS[0];
      const stw1 = DEFAULT_CASUAL_STEWARDS[1];
      assert.ok(stw0 && stw1);
      const withAbsent = [stw0, { ...stw1, attendanceStatus: "ABSENT" as const }];

      const summary = computeCasualSheetSummary(withAbsent, 100);
      assert.strictEqual(summary.totalStewardsCount, 2);
      assert.strictEqual(summary.presentCount, 1);
      assert.strictEqual(summary.absentCount, 1);
      assert.strictEqual(summary.stewardToGuestRatio, "1 : 100 pax");
    });
  });

  describe("4. Formatters & Status Badge Resolvers", () => {
    it("formats LKR currency and shift hours accurately", () => {
      assert.strictEqual(formatStewardCurrency(6000), "LKR 6,000");
      assert.strictEqual(formatStewardCurrency(0), "LKR 0");
      assert.strictEqual(formatStewardHours(8.5), "8.5 hrs");
    });

    it("resolves attendance badge styles for all states", () => {
      assert.ok(resolveAttendanceStatusBadge("COMPLETED").text.includes("emerald"));
      assert.ok(resolveAttendanceStatusBadge("CHECKED_IN").text.includes("blue"));
      assert.ok(resolveAttendanceStatusBadge("SCHEDULED").text.includes("slate"));
      assert.ok(resolveAttendanceStatusBadge("REPLACED").text.includes("purple"));
      assert.ok(resolveAttendanceStatusBadge("ABSENT").text.includes("rose"));
    });

    it("resolves payout badge styles for all states", () => {
      assert.ok(resolvePayoutStatusBadge("PAID_CASH_DISBURSED").text.includes("emerald"));
      assert.ok(resolvePayoutStatusBadge("AUTHORIZED_FOR_CASH").text.includes("amber"));
      assert.ok(resolvePayoutStatusBadge("PENDING_APPROVAL").text.includes("slate"));
    });
  });

  describe("5. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("renders casual steward sheet with bento summary, table, and printable voucher", () => {
      const html = renderToStaticMarkup(
        React.createElement(CasualStewardSheet, {
          eventInfo: DEFAULT_EVENT_HEADER_INFO,
          initialStewards: DEFAULT_CASUAL_STEWARDS,
          hotelName: "The Grand Cinnamon Resort",
          language: "en",
        }),
      );

      // Apple HIG & Liquid Glass
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));

      // Event details
      assert.ok(
        html.includes("Dilan &amp; Rashmi Wedding Reception") ||
          html.includes("Dilan & Rashmi Wedding Reception"),
      );
      assert.ok(html.includes("Grand Lotus Ballroom"));
      assert.ok(html.includes("EVT-2026-0889"));

      // Bento cards
      assert.ok(html.includes("Stewards Hired"));
      assert.ok(html.includes("Total Function Wages"));
      assert.ok(html.includes("Cash Disbursed"));
      assert.ok(html.includes("Pending Payout"));

      // Stewards listed
      assert.ok(html.includes("Nalin Kumara Perera"));
      assert.ok(html.includes("199418501234"));
      assert.ok(html.includes("Chaminda Roshan Silva"));
      assert.ok(html.includes("901234567V"));

      // Printable A4 Petty Cash Voucher
      assert.ok(html.includes("print:block"));
      assert.ok(html.includes("Banquet Operations Manager"));
      assert.ok(
        html.includes("Food &amp; Beverage Director") || html.includes("Food & Beverage Director"),
      );
      assert.ok(html.includes("General Cashier / Paymaster"));
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const sinhalaHtml = renderToStaticMarkup(
        React.createElement(CasualStewardSheet, {
          language: "si",
        }),
      );
      assert.ok(sinhalaHtml.includes("භෝජන සංග්‍රහ අනියම් සේවක පැමිණීම"));
      assert.ok(sinhalaHtml.includes("සේවක සංඛ්‍යාව"));
      assert.ok(sinhalaHtml.includes("මුළු කාර්ය වේතනය"));

      const tamilHtml = renderToStaticMarkup(
        React.createElement(CasualStewardSheet, {
          language: "ta",
        }),
      );
      assert.ok(tamilHtml.includes("விருந்து தற்காலிக ஊழியர் வருகை"));
      assert.ok(tamilHtml.includes("பணியமர்த்தப்பட்ட ஊழியர்கள்"));
      assert.ok(tamilHtml.includes("மொத்த ஊதியம்"));
    });
  });
});
