/**
 * Unit Tests for Step 329: Banquet & Wedding Availability Calendar (BanquetCalendar.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetCalendar,
  DEFAULT_BANQUET_BOOKINGS,
  calculateCalendarSummary,
  computeCalendarGrid,
  computeDaysRemaining,
  formatCurrencyLkr,
  getSlotBadgeColor,
  isHoldExpiringSoon,
} from "../src/admin/banquets/index.js";

describe("Step 329: Banquet & Wedding Availability Calendar (BanquetCalendar.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Domain Helper Functions", () => {
    it("formatCurrencyLkr formats LKR amounts without decimal fractions", () => {
      const formatted = formatCurrencyLkr(2625000);
      assert.ok(formatted.includes("2,625,000") || formatted.includes("26,25,000"));
      assert.ok(formatted.includes("LKR") || formatted.includes("Rs"));
    });

    it("computeCalendarGrid calculates correct grid offset and total days for October 2026", () => {
      // Oct 1, 2026 is a Thursday (day 4: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
      const grid = computeCalendarGrid(2026, 10);
      // October has 31 days
      const validDays = grid.filter((c) => c !== null);
      assert.strictEqual(validDays.length, 31);
      assert.strictEqual(validDays[0], "2026-10-01");
      assert.strictEqual(validDays[30], "2026-10-31");

      // First 4 cells should be null for leading days before Thursday
      assert.strictEqual(grid[0], null);
      assert.strictEqual(grid[1], null);
      assert.strictEqual(grid[2], null);
      assert.strictEqual(grid[3], null);
      assert.strictEqual(grid[4], "2026-10-01");
    });

    it("computeDaysRemaining calculates remaining days accurately", () => {
      assert.strictEqual(computeDaysRemaining(undefined), null);

      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const days = computeDaysRemaining(futureDate);
      assert.ok(days !== null && days >= 4 && days <= 6);

      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const pastDays = computeDaysRemaining(pastDate);
      assert.ok(pastDays !== null && pastDays <= 0);
    });

    it("isHoldExpiringSoon detects holds expiring within 3 days", () => {
      const baseHold = DEFAULT_BANQUET_BOOKINGS[2];
      assert.ok(baseHold !== undefined);

      const expiringBooking = {
        ...baseHold,
        status: "TENTATIVE_HOLD" as const,
        holdExpiryDateIso: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      };
      assert.strictEqual(isHoldExpiringSoon(expiringBooking), true);

      const distantBooking = {
        ...baseHold,
        status: "TENTATIVE_HOLD" as const,
        holdExpiryDateIso: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      };
      assert.strictEqual(isHoldExpiringSoon(distantBooking), false);

      const baseConfirmed = DEFAULT_BANQUET_BOOKINGS[0];
      assert.ok(baseConfirmed !== undefined);

      const confirmedBooking = {
        ...baseConfirmed,
        status: "DEPOSIT_PAID_CONFIRMED" as const,
      };
      assert.strictEqual(isHoldExpiringSoon(confirmedBooking), false);
    });

    it("calculateCalendarSummary aggregates metrics for month accurately", () => {
      const summary = calculateCalendarSummary(DEFAULT_BANQUET_BOOKINGS, 2026, 10);
      assert.strictEqual(summary.totalBookingsInMonth, 5);
      assert.strictEqual(summary.confirmedCount, 2);
      assert.strictEqual(summary.tentativeHoldCount, 1);
      assert.strictEqual(summary.completedCount, 1);
      // Confirmed deposits: 650,000 + 450,000 = 1,100,000 + Completed: 1,000,000 = 2,100,000
      assert.strictEqual(summary.totalAdvanceDepositsLkr, 2100000);
    });

    it("getSlotBadgeColor returns Apple HIG semantic classes for all statuses", () => {
      assert.ok(getSlotBadgeColor("DEPOSIT_PAID_CONFIRMED").includes("emerald"));
      assert.ok(getSlotBadgeColor("TENTATIVE_HOLD").includes("amber"));
      assert.ok(getSlotBadgeColor("COMPLETED").includes("sky"));
      assert.ok(getSlotBadgeColor("CANCELLED").includes("zinc"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Server-Side Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    it("renders default calendar view with October 2026 and property title", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          propertyName: "Galle Face Heritage Hotel",
          language: "en",
        }),
      );

      assert.ok(html.includes("Galle Face Heritage Hotel"));
      assert.ok(
        html.includes("Banquet &amp; Wedding Availability Calendar") ||
          html.includes("Banquet & Wedding"),
      );
      assert.ok(html.includes("October 2026"));
      assert.ok(
        html.includes("Kavinda &amp; Tharushi Poruwa Wedding") ||
          html.includes("Kavinda & Tharushi"),
      );
      assert.ok(
        html.includes("Senaka &amp; Niluka Homecoming Dinner") || html.includes("Senaka & Niluka"),
      );
    });

    it("highlights Auspicious Nekath wedding dates with purple badges", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          language: "en",
        }),
      );

      assert.ok(html.includes("nekath-badge-2026-10-18"));
      assert.ok(html.includes("nekath-badge-2026-10-24"));
      assert.ok(html.includes("Auspicious Nekath"));
    });

    it("highlights Full Moon Poya Day with amber dry-day indicator", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          language: "en",
        }),
      );

      assert.ok(html.includes("poya-badge-2026-10-25"));
      assert.ok(html.includes("Poya (Dry Day)"));
      assert.ok(html.includes("Dry Day (No Alcohol)"));
    });

    it("renders Morning (Poruwa) and Evening (Homecoming) slot actions on dates", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          language: "en",
        }),
      );

      // Morning slot icon
      assert.ok(html.includes("Day"));
      assert.ok(html.includes("Morning (Poruwa)"));
      // Evening slot icon
      assert.ok(html.includes("Night"));
      assert.ok(html.includes("Evening (Homecoming)"));
      assert.ok(html.includes("Available"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          language: "si",
        }),
      );

      assert.ok(html.includes("මංගල හා උත්සව ශාලා වෙන්කිරීම් දිනදර්ශනය"));
      assert.ok(html.includes("සුබ නැකත් දිනය"));
      assert.ok(html.includes("පෝය දිනය (Dry Day)"));
      assert.ok(html.includes("තහවුරුයි"));
      assert.ok(html.includes("තාවකාලිකයි"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetCalendar, {
          initialYear: 2026,
          initialMonth: 10,
          language: "ta",
        }),
      );

      assert.ok(html.includes("மண்டப முன்பதிவு மற்றும் சுபமுகூர்த்த நாட்காட்டி"));
      assert.ok(html.includes("சுப முகூர்த்த நாள்"));
      assert.ok(html.includes("பௌர்ணமி (மதுவிலக்கு நாள்)"));
      assert.ok(html.includes("உறுதியானது"));
    });
  });
});
