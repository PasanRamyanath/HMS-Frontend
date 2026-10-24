import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DISCREPANCY_ALERTS,
  DiscrepancyAlertBar,
  type DiscrepancyAlertItem,
  calculateDiscrepancySummary,
  formatDiscrepancyLkr,
  getDiscrepancyText,
  isDiscrepancyMatchingFilter,
  resolveDiscrepancyTypeBadge,
  resolveSeverityBadge,
} from "../src/admin/housekeeping/DiscrepancyAlertBar.js";

const noop = () => undefined;

describe("Step 316: Room Discrepancy Alert Banner (DiscrepancyAlertBar.tsx)", () => {
  describe("1. Pure Financial & Discrepancy Metrics Calculation", () => {
    it("formats LKR currency cleanly with Sri Lankan locale and two decimals", () => {
      assert.equal(formatDiscrepancyLkr(40302.9), "Rs. 40,302.90");
      assert.equal(formatDiscrepancyLkr(0), "Rs. 0.00");
      assert.equal(formatDiscrepancyLkr(Number.NaN), "Rs. 0.00");
    });

    it("aggregates active discrepancies, counting sleeps, skips, and total financial risk", () => {
      const summary = calculateDiscrepancySummary(DEFAULT_DISCREPANCY_ALERTS);
      assert.equal(summary.totalActiveCount, 3);
      assert.equal(summary.sleepCount, 1);
      assert.equal(summary.skipCount, 1);
      assert.equal(summary.personsMismatchCount, 1);
      // 40302.9 + 98085.75 + 9404 = 147792.65
      assert.equal(summary.totalRiskAmountLkr, 147792.65);
    });

    it("ignores resolved items when computing active metrics", () => {
      const withResolved: DiscrepancyAlertItem[] = [
        ...DEFAULT_DISCREPANCY_ALERTS,
        {
          discrepancyId: "disc-resolved",
          roomId: "rm-999",
          roomNumber: "999",
          discrepancyType: "SKIP",
          severity: "HIGH",
          frontDeskStatus: "OCCUPIED",
          housekeepingStatus: "OBSERVED_VACANT",
          registeredGuestsCount: 1,
          observedGuestsCount: 0,
          outstandingFolioBalanceLkr: 50000,
          estimatedRevenueRiskLkr: 60000,
          attendantName: "Kamal",
          flaggedAtIso: "2026-10-20T10:00:00Z",
          resolved: true,
        },
      ];

      const summary = calculateDiscrepancySummary(withResolved);
      assert.equal(summary.totalActiveCount, 3);
      assert.equal(summary.skipCount, 1);
      assert.equal(summary.totalRiskAmountLkr, 147792.65);
    });
  });

  describe("2. Dynamic Apple HIG System Badges & Filters", () => {
    it("resolves distinct styling and icons for SLEEP, SKIP, and PERSONS_MISMATCH", () => {
      const sleepBadge = resolveDiscrepancyTypeBadge("SLEEP");
      assert.equal(sleepBadge.icon, "Stop");
      assert.match(sleepBadge.style, /rose/);

      const skipBadge = resolveDiscrepancyTypeBadge("SKIP");
      assert.equal(skipBadge.icon, "Skip");
      assert.match(skipBadge.style, /amber/);

      const personsBadge = resolveDiscrepancyTypeBadge("PERSONS_MISMATCH");
      assert.equal(personsBadge.icon, "Pax");
      assert.match(personsBadge.style, /purple/);
    });

    it("resolves severity badge tokens for CRITICAL, HIGH, and MEDIUM", () => {
      const crit = resolveSeverityBadge("CRITICAL");
      assert.equal(crit.label, "CRITICAL");
      assert.match(crit.style, /animate-pulse/);

      const high = resolveSeverityBadge("HIGH");
      assert.equal(high.label, "HIGH RISK");

      const med = resolveSeverityBadge("MEDIUM");
      assert.equal(med.label, "MEDIUM");
    });

    it("filters discrepancy items by conflict category", () => {
      const item: DiscrepancyAlertItem = {
        discrepancyId: "test-item",
        roomId: "rm-101",
        roomNumber: "101",
        discrepancyType: "SLEEP",
        severity: "CRITICAL",
        frontDeskStatus: "VACANT",
        housekeepingStatus: "OBSERVED_SLEPT",
        registeredGuestsCount: 0,
        observedGuestsCount: 1,
        outstandingFolioBalanceLkr: 0,
        estimatedRevenueRiskLkr: 25000,
        attendantName: "Kamal",
        flaggedAtIso: "2026-10-20T08:00:00Z",
        resolved: false,
      };

      assert.equal(isDiscrepancyMatchingFilter(item, "ALL"), true);
      assert.equal(isDiscrepancyMatchingFilter(item, "SLEEP"), true);
      assert.equal(isDiscrepancyMatchingFilter(item, "SKIP"), false);
      assert.equal(isDiscrepancyMatchingFilter(item, "PERSONS_MISMATCH"), false);
    });
  });

  describe("3. Trilingual Localization Catalog", () => {
    it("returns valid text mappings for en, si, and ta", () => {
      const en = getDiscrepancyText("en");
      const si = getDiscrepancyText("si");
      const ta = getDiscrepancyText("ta");

      assert.match(en.bannerTitle, /Discrepancies/i);
      assert.match(si.bannerTitle, /කාමර තත්ත්ව විෂමතා/);
      assert.match(ta.bannerTitle, /அறை நிலை முரண்பாடுகள்/);
    });
  });

  describe("4. React Static Markup Rendering", () => {
    it("renders DiscrepancyAlertBar with active counts, badges, and >= 44x44pt buttons", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DiscrepancyAlertBar, {
          propertyTitle: "Bentota Beach Luxury Pavilion",
          dutyManagerName: "Damith Weerasinghe",
          language: "en",
          initialDiscrepancies: DEFAULT_DISCREPANCY_ALERTS,
          onResolveDiscrepancy: noop,
          onDismissBanner: noop,
        }),
      );

      // Verify title and counts
      assert.match(markup, /Active Room Status Discrepancies/);
      assert.match(markup, /1 SLEEP/);
      assert.match(markup, /1 SKIP/);
      assert.match(markup, /Review &amp; Resolve/);

      // Verify touch targets and classes
      assert.match(markup, /min-h-\[44px\]/);
      assert.match(markup, /tabular-nums-lkr/);
      assert.match(markup, /apple-liquid-glass/);
    });

    it("returns empty markup when all discrepancies are resolved", () => {
      const allResolved = DEFAULT_DISCREPANCY_ALERTS.map((d) => ({
        ...d,
        resolved: true,
      }));

      const markup = renderToStaticMarkup(
        React.createElement(DiscrepancyAlertBar, {
          initialDiscrepancies: allResolved,
          onResolveDiscrepancy: noop,
        }),
      );

      assert.equal(markup, "");
    });

    it("renders Sinhala localization correctly in static markup", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DiscrepancyAlertBar, {
          propertyTitle: "ගාල්ල බීච් රිසෝට්",
          dutyManagerName: "කමල්",
          language: "si",
          initialDiscrepancies: DEFAULT_DISCREPANCY_ALERTS,
          onResolveDiscrepancy: noop,
        }),
      );

      assert.match(markup, /කාමර තත්ත්ව විෂමතා හඳුනාගෙන ඇත/);
      assert.match(markup, /විසඳන්න/);
    });
  });
});
