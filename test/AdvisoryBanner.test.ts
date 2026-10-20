/**
 * Unit Test Suite for Step 372: AdvisoryBanner (Weather & Sea/Park Advisory)
 *
 * Validates:
 * 1. Pure helper logic:
 *    - filterActiveAdvisories
 *    - getAdvisoryThemeClasses
 *    - resolveNoticeMessage
 *    - resolveActionLabel
 * 2. Preset resort advisory integrity (Whale boat, Yala safari, Monsoon reef)
 * 3. Trilingual message resolution across English, Sinhala, and Tamil
 * 4. Component rendering with Apple HIG and Liquid Glass classes via React 19 renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdvisoryBanner,
  type AdvisoryNotice,
  DEFAULT_RESORT_ADVISORIES,
  filterActiveAdvisories,
  getAdvisoryThemeClasses,
  resolveActionLabel,
  resolveNoticeMessage,
} from "../src/qr/AdvisoryBanner.js";

describe("Step 372: AdvisoryBanner & Excursion Weather/Park Intelligence", () => {
  describe("1. Pure Helper Logic", () => {
    it("filters active advisories by effectiveUntil timestamp", () => {
      const now = "2026-06-15T10:00:00Z";
      const sampleNotices: AdvisoryNotice[] = [
        {
          id: "n-1",
          severity: "SUCCESS",
          category: "DEPARTURE_CONFIRMED",
          message: "Active Future Notice",
          effectiveUntil: "2026-06-15T12:00:00Z",
        },
        {
          id: "n-2",
          severity: "WARNING",
          category: "WEATHER_SEA",
          message: "Expired Notice",
          effectiveUntil: "2026-06-15T08:00:00Z",
        },
        {
          id: "n-3",
          severity: "INFO",
          category: "GENERAL",
          message: "Indefinite Notice",
        },
      ];

      const active = filterActiveAdvisories(sampleNotices, now);
      assert.equal(active.length, 2);
      assert.equal(active[0]?.id, "n-1");
      assert.equal(active[1]?.id, "n-3");
    });

    it("maps severity to appropriate Apple Dynamic Color theme classes", () => {
      const successTheme = getAdvisoryThemeClasses("SUCCESS");
      assert.ok(successTheme.container.includes("emerald"));
      assert.ok(successTheme.badge.includes("emerald"));

      const warningTheme = getAdvisoryThemeClasses("WARNING");
      assert.ok(warningTheme.container.includes("amber"));

      const alertTheme = getAdvisoryThemeClasses("CRITICAL_ALERT");
      assert.ok(alertTheme.container.includes("rose"));

      const infoTheme = getAdvisoryThemeClasses("INFO");
      assert.ok(infoTheme.container.includes("sky"));
    });

    it("resolves trilingual messages and action labels accurately", () => {
      const notice = DEFAULT_RESORT_ADVISORIES[0];
      assert.ok(notice);

      assert.equal(resolveNoticeMessage(notice, "en"), notice.message);
      assert.equal(resolveNoticeMessage(notice, "si"), notice.trilingualMessage?.si);
      assert.equal(resolveNoticeMessage(notice, "ta"), notice.trilingualMessage?.ta);

      assert.equal(resolveActionLabel(notice, "en"), "View Details");
      assert.equal(resolveActionLabel(notice, "si"), "තොරතුරු බලන්න");
      assert.equal(resolveActionLabel(notice, "ta"), "விவரங்களை பார்க்க");

      // Fallback test
      const noticeWithoutTrilingual: AdvisoryNotice = {
        id: "no-tri",
        severity: "INFO",
        category: "GENERAL",
        message: "Plain English notice",
        actionLabel: "Click Here",
      };
      assert.equal(resolveNoticeMessage(noticeWithoutTrilingual, "si"), "Plain English notice");
      assert.equal(resolveActionLabel(noticeWithoutTrilingual, "si"), "Click Here");
    });
  });

  describe("2. Preset Resort Advisories Integrity", () => {
    it("contains pre-configured advisories with valid categories and emojis", () => {
      assert.ok(DEFAULT_RESORT_ADVISORIES.length >= 3);
      for (const notice of DEFAULT_RESORT_ADVISORIES) {
        assert.ok(notice.id.length > 0);
        assert.ok(notice.message.length > 0);
        assert.ok(notice.iconEmoji?.length);
        assert.ok(notice.trilingualMessage?.en);
        assert.ok(notice.trilingualMessage?.si);
        assert.ok(notice.trilingualMessage?.ta);
      }
    });
  });

  describe("3. Static Markup Rendering & Apple HIG Compliance", () => {
    it("returns null when notices array is empty", () => {
      const html = renderToStaticMarkup(React.createElement(AdvisoryBanner, { notices: [] }));
      assert.equal(html, "");
    });

    it("renders first active notice with Apple Liquid Glass and touch target styling", () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvisoryBanner, {
          notices: DEFAULT_RESORT_ADVISORIES,
          onActionClick: () => {
            /* no-op handler for test */
          },
        }),
      );

      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("Mirissa Morning Whale Boat"));
      assert.ok(html.includes("Port Captain &amp; Concierge Desk"));
      assert.ok(html.includes("View Details"));
    });

    it("renders Sinhala localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvisoryBanner, {
          notices: DEFAULT_RESORT_ADVISORIES,
          language: "si",
        }),
      );
      assert.ok(html.includes("මිරිස්ස උදෑසන තල්මසුන් නැරඹීමේ බෝට්ටුව"));
    });

    it("renders Tamil localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvisoryBanner, {
          notices: DEFAULT_RESORT_ADVISORIES,
          language: "ta",
        }),
      );
      assert.ok(html.includes("மிரிஸ்ஸ காலை திமிங்கல படகு"));
    });

    it("renders carousel pagination when multiple notices exist", () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvisoryBanner, {
          notices: DEFAULT_RESORT_ADVISORIES,
        }),
      );
      assert.ok(html.includes("Previous advisory"));
      assert.ok(html.includes("Next advisory"));
      assert.ok(html.includes(`1/${DEFAULT_RESORT_ADVISORIES.length}`));
    });
  });
});
