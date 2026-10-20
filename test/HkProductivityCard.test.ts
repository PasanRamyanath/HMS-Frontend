import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AttendantCleaningRecord,
  DEFAULT_ATTENDANT_RECORDS,
  HkProductivityCard,
  calculateAttendantProductivityMetrics,
  calculateHkProductivitySummary,
  formatHkLkr,
  getHkProductivityText,
  isAttendantMatchingFilter,
  resolvePerformanceTierBadge,
  resolveShiftBadge,
} from "../src/admin/housekeeping/HkProductivityCard.js";

const noop = () => undefined;

describe("Step 320: Housekeeping Turnaround Time & Productivity Report (HkProductivityCard.tsx)", () => {
  describe("1. Pure Financial & Turnaround Speed Calculations", () => {
    it("formats LKR currency amounts with integer rounding and Rs. prefix", () => {
      assert.equal(formatHkLkr(12500), "Rs. 12,500");
      assert.equal(formatHkLkr(40500), "Rs. 40,500");
      assert.equal(formatHkLkr(0), "Rs. 0");
      assert.equal(formatHkLkr(Number.NaN), "Rs. 0");
      assert.equal(formatHkLkr(Number.POSITIVE_INFINITY), "Rs. 0");
    });

    it("calculates attendant turnaround averages and classifies top performers accurately", () => {
      const topAttendant = DEFAULT_ATTENDANT_RECORDS[0]; // Sunil Bandara
      assert.ok(topAttendant, "Sunil Bandara record must exist");

      const metrics = calculateAttendantProductivityMetrics(topAttendant);
      // Checkout: 240 / 6 = 40 min
      assert.equal(metrics.avgMinutesPerCheckout, 40);
      // Stayover: 168 / 8 = 21 min
      assert.equal(metrics.avgMinutesPerStayover, 21);
      assert.equal(metrics.avgMinutesPerTurndown, 0);
      assert.equal(metrics.totalRoomsServiced, 14);
      // Hours: (240 + 168) / 60 = 408 / 60 = 6.8 hrs
      assert.equal(metrics.totalCleaningHours, 6.8);
      // Benchmark: <=45m checkout, <=25m stayover, score >= 95% -> TOP_PERFORMER
      assert.equal(metrics.performanceTier, "TOP_PERFORMER");
    });

    it("classifies attendants exceeding benchmark duration as NEEDS_COACHING", () => {
      const coachingAttendant = DEFAULT_ATTENDANT_RECORDS[3]; // Roshan Alwis
      assert.ok(coachingAttendant, "Roshan Alwis record must exist");

      const metrics = calculateAttendantProductivityMetrics(coachingAttendant);
      // Checkout: 228 / 4 = 57 min (> 50 min)
      assert.equal(metrics.avgMinutesPerCheckout, 57);
      // Stayover: 160 / 5 = 32 min (> 30 min)
      assert.equal(metrics.avgMinutesPerStayover, 32);
      assert.equal(metrics.performanceTier, "NEEDS_COACHING");
    });

    it("handles zero cleans gracefully without division by zero", () => {
      const emptyRecord: AttendantCleaningRecord = {
        attendantId: "hk-999",
        attendantName: "Trainee Attendant",
        shift: "NIGHT",
        checkoutCleansCount: 0,
        totalCheckoutMinutes: 0,
        stayoverCleansCount: 0,
        totalStayoverMinutes: 0,
        turndownCleansCount: 0,
        totalTurndownMinutes: 0,
        supervisorScoreAvgPct: 90.0,
        guestRatingAvg: 5.0,
        calculatedBonusLkr: 0,
        monthlyTargetRooms: 100,
      };

      const metrics = calculateAttendantProductivityMetrics(emptyRecord);
      assert.equal(metrics.avgMinutesPerCheckout, 0);
      assert.equal(metrics.avgMinutesPerStayover, 0);
      assert.equal(metrics.avgMinutesPerTurndown, 0);
      assert.equal(metrics.totalRoomsServiced, 0);
      assert.equal(metrics.totalCleaningHours, 0);
      assert.equal(metrics.performanceTier, "ON_TARGET");
    });

    it("computes overall property productivity summary and identifies top performer", () => {
      const summary = calculateHkProductivitySummary(DEFAULT_ATTENDANT_RECORDS);
      assert.equal(summary.totalAttendantsActive, 5);
      // Checkouts: 6 + 5 + 2 + 4 + 1 = 18
      // Stayovers: 8 + 7 + 4 + 5 + 3 = 27
      // Turndowns: 0 + 0 + 16 + 0 + 14 = 30
      // Total rooms: 18 + 27 + 30 = 75
      assert.equal(summary.totalRoomsCleanedToday, 75);
      // Total checkout min: 240 + 220 + 92 + 228 + 42 = 822. 822 / 18 = 45.7 min
      assert.equal(summary.overallAvgCheckoutMinutes, 45.7);
      // Total stayover min: 168 + 161 + 104 + 160 + 66 = 659. 659 / 27 = 24.4 min
      assert.equal(summary.overallAvgStayoverMinutes, 24.4);
      // Top performer by supervisor score: Sunil Bandara (98.5%)
      assert.equal(summary.topPerformerName, "Sunil Bandara");
      // Total bonus pool: 12500 + 8500 + 10000 + 2000 + 7500 = 40500 LKR
      assert.equal(summary.totalBonusPoolAwardedLkr, 40500);
    });

    it("returns zero metrics when record array is empty", () => {
      const summary = calculateHkProductivitySummary([]);
      assert.equal(summary.totalAttendantsActive, 0);
      assert.equal(summary.totalRoomsCleanedToday, 0);
      assert.equal(summary.overallAvgCheckoutMinutes, 0);
      assert.equal(summary.overallAvgStayoverMinutes, 0);
      assert.equal(summary.topPerformerName, "N/A");
      assert.equal(summary.totalBonusPoolAwardedLkr, 0);
    });
  });

  describe("2. Performance Badges, Shift Types & Filter Verification", () => {
    it("resolves distinctive icons and styles for all 3 performance tiers", () => {
      const t = getHkProductivityText("en");
      const top = resolvePerformanceTierBadge("TOP_PERFORMER", t);
      assert.equal(top.icon, "🌟");
      assert.equal(top.label, "Star Attendant");
      assert.match(top.style, /amber/);

      const target = resolvePerformanceTierBadge("ON_TARGET", t);
      assert.equal(target.icon, "🎯");
      assert.equal(target.label, "On Target");
      assert.match(target.style, /emerald/);

      const coaching = resolvePerformanceTierBadge("NEEDS_COACHING", t);
      assert.equal(coaching.icon, "⚠️");
      assert.equal(coaching.label, "Needs Coaching");
      assert.match(coaching.style, /rose/);
    });

    it("resolves shift badges for morning, evening, and night", () => {
      const t = getHkProductivityText("en");
      assert.equal(resolveShiftBadge("MORNING", t).icon, "🌅");
      assert.equal(resolveShiftBadge("EVENING", t).icon, "🌇");
      assert.equal(resolveShiftBadge("NIGHT", t).icon, "🌙");
    });

    it("filters attendants by performance tier tab and search query", () => {
      const sample = DEFAULT_ATTENDANT_RECORDS[0]; // Sunil Bandara, hk-101, MORNING, TOP_PERFORMER
      assert.ok(sample, "sample must exist in fixtures");

      assert.equal(isAttendantMatchingFilter(sample, "ALL", ""), true);
      assert.equal(isAttendantMatchingFilter(sample, "TOP_PERFORMER", ""), true);
      assert.equal(isAttendantMatchingFilter(sample, "ON_TARGET", ""), false);
      assert.equal(isAttendantMatchingFilter(sample, "NEEDS_COACHING", ""), false);

      // Search by name
      assert.equal(isAttendantMatchingFilter(sample, "ALL", "sunil"), true);
      assert.equal(isAttendantMatchingFilter(sample, "ALL", "Bandara"), true);

      // Search by ID
      assert.equal(isAttendantMatchingFilter(sample, "ALL", "hk-101"), true);

      // Search by shift
      assert.equal(isAttendantMatchingFilter(sample, "ALL", "morning"), true);

      // Non-matching
      assert.equal(isAttendantMatchingFilter(sample, "ALL", "Priyani"), false);
    });
  });

  describe("3. Trilingual Localization", () => {
    it("provides complete translations in English, Sinhala, and Tamil", () => {
      const en = getHkProductivityText("en");
      const si = getHkProductivityText("si");
      const ta = getHkProductivityText("ta");

      assert.match(en.title, /Turnaround Time & Productivity/);
      assert.match(si.title, /කාමර පිරිසිදු කිරීමේ කාලය/);
      assert.match(ta.title, /செயல்திறன்/);

      assert.equal(en.bonusPoolLabel, "Incentive Pool Awarded");
      assert.equal(si.bonusPoolLabel, "මුළු දිරිදීමනා අරමුදල");
      assert.equal(ta.bonusPoolLabel, "மொத்த ஊக்குவிப்பு நிதி");
    });
  });

  describe("4. React Static Markup & Apple HIG Design System", () => {
    it("renders Apple Liquid Glass container and tabular numerals", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkProductivityCard, {
          propertyTitle: "Heritance Kandalama Eco Sanctuary",
          onAwardBonus: noop,
          onExportReport: noop,
        }),
      );

      assert.match(html, /apple-liquid-glass/);
      assert.match(html, /tabular-nums-lkr/);
      assert.match(html, /Heritance Kandalama Eco Sanctuary/);
      assert.match(html, /Sunil Bandara/);
      assert.match(html, /Rs\. 40,500/);
    });

    it("verifies minimum touch targets comply with Apple HIG (>= 44pt)", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkProductivityCard, {
          language: "en",
        }),
      );

      assert.match(html, /min-h-\[44px\]/);
    });

    it("renders Sinhala localization in static markup", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkProductivityCard, {
          language: "si",
        }),
      );

      assert.match(html, /කාමර පිරිසිදු කිරීමේ කාලය/);
      assert.match(html, /ක්‍රියාකාරී සේවකයින්/);
    });
  });
});
