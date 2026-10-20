import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TOWEL_LOANS,
  PoolTowelTracker,
  calculateTowelStockSummary,
  evaluateLoanOverdue,
  formatTowelLkr,
  getPoolTowelText,
  isLoanMatchingFilter,
  resolveDepositMethodDetails,
  resolvePoolZoneDetails,
  resolveTowelLoanStatusDetails,
  resolveTowelTypeDetails,
} from "../src/staff/housekeeping/PoolTowelTracker.js";

const noop = () => undefined;

describe("Step 319: Pool & Beach Towel Deposit Tracker (PoolTowelTracker.tsx)", () => {
  describe("1. Pure Financial & Towel Inventory Stock Calculations", () => {
    it("formats LKR currency amounts with rounded integer values and Rs. prefix", () => {
      assert.equal(formatTowelLkr(3500), "Rs. 3,500");
      assert.equal(formatTowelLkr(7000), "Rs. 7,000");
      assert.equal(formatTowelLkr(0), "Rs. 0");
      assert.equal(formatTowelLkr(Number.NaN), "Rs. 0");
      assert.equal(formatTowelLkr(Number.POSITIVE_INFINITY), "Rs. 0");
    });

    it("evaluates overdue loans based on 240-minute threshold accurately", () => {
      const now = "2026-10-20T14:00:00Z";
      // 1 hour ago -> false
      assert.equal(evaluateLoanOverdue("2026-10-20T13:00:00Z", now), false);
      // 3 hours 59 min ago -> false
      assert.equal(evaluateLoanOverdue("2026-10-20T10:01:00Z", now), false);
      // Exactly 4 hours ago -> true
      assert.equal(evaluateLoanOverdue("2026-10-20T10:00:00Z", now), true);
      // 6 hours ago -> true
      assert.equal(evaluateLoanOverdue("2026-10-20T08:00:00Z", now), true);
      // Invalid dates -> false
      assert.equal(evaluateLoanOverdue("invalid-date", now), false);
      assert.equal(evaluateLoanOverdue("2026-10-20T10:00:00Z", "invalid-now"), false);
    });

    it("calculates par-stock balance, soiled laundry counts, and lost towel fees", () => {
      // DEFAULT_TOWEL_LOANS:
      // ln-001: ACTIVE, 2 issued, 0 returned -> active = 2
      // ln-002: OVERDUE, 4 issued, 0 returned -> active = 4, overdue = 4
      // ln-003: RETURNED, 2 issued, 2 returned -> dirty = 2
      // ln-004: LOST_CHARGED, 2 issued, 1 returned, fee = 3500 -> lost = 1, fee = 3500, dirty = 1
      // ln-005: ACTIVE, 1 issued, 0 returned -> active = 1
      // Totals:
      // active: 2 + 4 + 1 = 7
      // overdue: 4
      // dirty laundry: 2 + 1 = 3
      // lost: 1, fee: 3500
      // Par stock (base 200): 200 - 7 - 3 - 1 = 189
      const summary = calculateTowelStockSummary(DEFAULT_TOWEL_LOANS, 200);
      assert.equal(summary.activeTowelsLoaned, 7);
      assert.equal(summary.overdueTowelsCount, 4);
      assert.equal(summary.dirtyTowelsLaundryBin, 3);
      assert.equal(summary.totalLostTowelsCount, 1);
      assert.equal(summary.totalLostRevenueLkr, 3500);
      assert.equal(summary.cleanParStockAvailable, 189);
    });

    it("returns zero metrics and full base par stock when loans array is empty", () => {
      const summary = calculateTowelStockSummary([], 150);
      assert.equal(summary.cleanParStockAvailable, 150);
      assert.equal(summary.activeTowelsLoaned, 0);
      assert.equal(summary.dirtyTowelsLaundryBin, 0);
      assert.equal(summary.overdueTowelsCount, 0);
      assert.equal(summary.totalLostTowelsCount, 0);
      assert.equal(summary.totalLostRevenueLkr, 0);
    });
  });

  describe("2. Towel Badges, Deposit Types & Filter Verification", () => {
    it("resolves distinctive icons and styles for all 3 towel types", () => {
      const t = getPoolTowelText("en");
      const blue = resolveTowelTypeDetails("POOL_BLUE_STRIPE", t);
      assert.equal(blue.icon, "🏊");
      assert.equal(blue.label, "Pool Blue Stripe");
      assert.match(blue.badgeStyle, /cyan/);

      const yellow = resolveTowelTypeDetails("BEACH_CABANA_YELLOW", t);
      assert.equal(yellow.icon, "🏖️");
      assert.equal(yellow.label, "Beach Cabana Gold");
      assert.match(yellow.badgeStyle, /amber/);

      const spa = resolveTowelTypeDetails("LUXURY_SPA_WHITE", t);
      assert.equal(spa.icon, "✨");
      assert.equal(spa.label, "Luxury Spa White");
      assert.match(spa.badgeStyle, /purple/);
    });

    it("resolves deposit method icons and labels", () => {
      const t = getPoolTowelText("en");
      assert.equal(resolveDepositMethodDetails("TOWEL_TOKEN_CARD", t).icon, "🎟️");
      assert.equal(resolveDepositMethodDetails("ROOM_KEY_CARD", t).icon, "🔑");
      assert.equal(resolveDepositMethodDetails("DIRECT_ROOM_FOLIO_HOLD", t).icon, "📋");
    });

    it("resolves pool zones and status badges", () => {
      const t = getPoolTowelText("en");
      assert.equal(resolvePoolZoneDetails("MAIN_INFINITY_POOL", t).icon, "🌊");
      assert.equal(resolvePoolZoneDetails("BEACH_FRONT_CABANAS", t).icon, "🌴");
      assert.equal(resolvePoolZoneDetails("LAGOON_POOL", t).icon, "🪷");
      assert.equal(resolvePoolZoneDetails("AYURVEDA_WELLNESS_POOL", t).icon, "🧘");

      const overdueBadge = resolveTowelLoanStatusDetails("OVERDUE");
      assert.match(overdueBadge.style, /animate-pulse/);
      assert.match(overdueBadge.style, /rose/);

      const returnedBadge = resolveTowelLoanStatusDetails("RETURNED");
      assert.match(returnedBadge.style, /emerald/);
    });

    it("filters loans by status tab and multi-field search query", () => {
      const sample = DEFAULT_TOWEL_LOANS[0]; // Villa 102, Nimal Perera, TC-042, ACTIVE
      assert.ok(sample, "sample must exist in fixtures");

      assert.equal(isLoanMatchingFilter(sample, "ALL", ""), true);
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", ""), true);
      assert.equal(isLoanMatchingFilter(sample, "OVERDUE", ""), false);
      assert.equal(isLoanMatchingFilter(sample, "RETURNED", ""), false);

      // Search by room
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "102"), true);
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "Villa"), true);

      // Search by guest
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "nimal"), true);

      // Search by token
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "TC-042"), true);

      // Search by zone
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "infinity"), true);

      // Non-matching
      assert.equal(isLoanMatchingFilter(sample, "ACTIVE", "Cabana 09"), false);
    });
  });

  describe("3. Trilingual Localization", () => {
    it("provides translations in English, Sinhala, and Tamil", () => {
      const en = getPoolTowelText("en");
      const si = getPoolTowelText("si");
      const ta = getPoolTowelText("ta");

      assert.match(en.title, /Pool & Beach Towel/);
      assert.match(si.title, /තටාක සහ වෙරළ තුවා/);
      assert.match(ta.title, /நீச்சல் குளம்/);

      assert.equal(en.cleanParStockLabel, "Clean Par Stock");
      assert.equal(si.cleanParStockLabel, "පිරිසිදු තුවා තොගය");
      assert.equal(ta.cleanParStockLabel, "தூய துண்டு இருப்பு");
    });
  });

  describe("4. React Static Markup & Apple HIG Design System", () => {
    it("renders Apple Liquid Glass container and tabular numerals", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoolTowelTracker, {
          propertyTitle: "Cinnamon Bentota Beach Resort",
          initialStockAvailable: 250,
          onIssueTowelLoan: noop,
          onReturnTowel: noop,
          onReportLostTowel: noop,
          onSwapFreshTowel: noop,
        }),
      );

      assert.match(html, /apple-liquid-glass/);
      assert.match(html, /tabular-nums-lkr/);
      assert.match(html, /Cinnamon Bentota Beach Resort/);
      assert.match(html, /Villa 102/);
      assert.match(html, /Nimal Perera/);
      assert.match(html, /TC-042/);
    });

    it("verifies minimum touch targets comply with Apple HIG (>= 44pt)", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoolTowelTracker, {
          language: "en",
        }),
      );

      assert.match(html, /min-h-\[44px\]/);
    });

    it("renders Tamil localization correctly in static markup", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoolTowelTracker, {
          language: "ta",
        }),
      );

      assert.match(html, /நீச்சல் குளம்/);
      assert.match(html, /வழங்கப்பட்டவை/);
    });
  });
});
