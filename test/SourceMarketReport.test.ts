/**
 * Unit Test Suite for Step 418: SourceMarketReport
 * (`test/SourceMarketReport.test.ts`)
 *
 * Implements Step 418 (Phase 17.18) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Travel Agent / DMC Production & Nationality Source Market Leaderboard (`SourceMarketReport.tsx`).
 *
 * Validates:
 * 1. Multi-tenant header with SLTDA registration, period, and locked CBSL USD rate
 * 2. Executive KPI cards (Direct booking share %, Blended ADR LKR/USD, Lead time, Total revenue)
 * 3. Travel agent & DMC production leaderboard (Walkers Tours, Aitken Spence, Booking.com, etc.)
 * 4. Nationality source market origin ranking (UK, Germany, Domestic Sri Lanka, India, etc.)
 * 5. Channel mix & profitability insights (Direct vs OTA vs DMC vs Corporate)
 * 6. SLTDA statutory compliance metrics
 * 7. 4-Section CSV export generator (`generateSourceMarketReportCsv`)
 * 8. Channel badge colors and financial roundLkr helper
 * 9. Safe non-browser download fallback
 * 10. React 19 SSR rendering and type contracts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ChannelCategory,
  DEFAULT_SOURCE_MARKET_DATA,
  SourceMarketReport,
  type SourceMarketReportProps,
  generateSourceMarketReportCsv,
  getChannelBadgeColor,
  roundLkr,
  triggerFileDownload,
} from "../src/admin/reports/SourceMarketReport.js";

describe("Step 418: Travel Agent / DMC Production & Nationality Source Market Leaderboard (SourceMarketReport.tsx)", () => {
  it("renders executive header with hotel metadata, SLTDA reg, and locked USD rate", () => {
    const props: SourceMarketReportProps = {
      initialData: DEFAULT_SOURCE_MARKET_DATA,
    };

    const html = renderToStaticMarkup(React.createElement(SourceMarketReport, props));

    assert.ok(
      html.includes("DMC Production &amp; Source Market Leaderboard") ||
        html.includes("DMC Production & Source Market Leaderboard"),
    );
    assert.ok(
      html.includes("The Heritance Galle Fort &amp; Resort") ||
        html.includes("The Heritance Galle Fort & Resort"),
    );
    assert.ok(html.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(html.includes("March 2026 (Month-to-Date)"));
    assert.ok(html.includes("305.50"));
    assert.ok(html.includes("SLTDA Inbound Audited"));
  });

  it("renders bento KPI cards with direct booking ratio and blended ADR", () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceMarketReport, { initialData: DEFAULT_SOURCE_MARKET_DATA }),
    );

    assert.ok(html.includes("Direct Booking Share"));
    assert.ok(html.includes("38.5%"));
    assert.ok(html.includes("Blended ADR"));
    assert.ok(html.includes("161.92")); // USD ADR
    assert.ok(html.includes("28 Days")); // Lead time
    assert.ok(html.includes("Total Production Revenue"));
  });

  it("renders top travel agent and DMC production partners in the leaderboard", () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceMarketReport, { initialData: DEFAULT_SOURCE_MARKET_DATA }),
    );

    // Direct
    assert.ok(
      html.includes("Hotel Direct &amp; Official Web") ||
        html.includes("Hotel Direct & Official Web"),
    );
    // OTAs
    assert.ok(html.includes("Booking.com"));
    assert.ok(html.includes("Agoda"));
    // DMCs
    assert.ok(html.includes("Walkers Tours"));
    assert.ok(html.includes("Aitken Spence Travels"));
    assert.ok(html.includes("Jetwing Travels"));

    // License numbers
    assert.ok(html.includes("SLTDA/TA/0012"));
    assert.ok(html.includes("SLTDA/TA/0008"));
  });

  it("generates comprehensive 4-section CSV report with production and nationality markets", () => {
    const csv = generateSourceMarketReportCsv(DEFAULT_SOURCE_MARKET_DATA);

    // Header
    assert.ok(csv.includes("SRI LANKA HOTEL MANAGEMENT SYSTEM"));
    assert.ok(csv.includes("The Heritance Galle Fort & Resort"));
    assert.ok(csv.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(csv.includes("305.50"));

    // Section 1: DMC Production
    assert.ok(csv.includes("SECTION 1: TRAVEL AGENT & DMC PRODUCTION LEADERBOARD"));
    assert.ok(csv.includes("Walkers Tours"));
    assert.ok(csv.includes("Booking.com"));
    assert.ok(csv.includes("Aitken Spence Travels"));

    // Section 2: Nationality Source Markets
    assert.ok(csv.includes("SECTION 2: NATIONALITY SOURCE MARKET LEADERBOARD"));
    assert.ok(csv.includes("United Kingdom"));
    assert.ok(csv.includes("Germany"));
    assert.ok(csv.includes("Sri Lanka (Domestic)"));
    assert.ok(csv.includes("India"));

    // Section 3: Profitability Summary
    assert.ok(csv.includes("SECTION 3: CHANNEL DISTRIBUTION & PROFITABILITY SUMMARY"));
    assert.ok(csv.includes("Direct Booking Share %:"));
    assert.ok(csv.includes("38.50%"));

    // Section 4: Audit Seal
    assert.ok(csv.includes("SECTION 4: CRYPTOGRAPHIC AUDIT VERIFICATION"));
    assert.ok(csv.includes(DEFAULT_SOURCE_MARKET_DATA.auditSealSha256));
  });

  it("accurately maps channel badge colors across all categories", () => {
    const directColor = getChannelBadgeColor("DIRECT");
    const dmcColor = getChannelBadgeColor("DMC");
    const otaColor = getChannelBadgeColor("OTA");
    const corpColor = getChannelBadgeColor("CORPORATE");
    const defaultColor = getChannelBadgeColor("OTHER" as ChannelCategory);

    assert.ok(directColor.includes("emerald"));
    assert.ok(dmcColor.includes("blue"));
    assert.ok(otaColor.includes("amber"));
    assert.ok(corpColor.includes("purple"));
    assert.ok(defaultColor.includes("zinc"));
  });

  it("handles triggerFileDownload gracefully in SSR/Node", () => {
    assert.doesNotThrow(() => {
      triggerFileDownload("sample.csv", "name,revenue");
    });
  });

  it("roundLkr helper maintains strict integer-cent precision", () => {
    assert.strictEqual(roundLkr(52000.126), 52000.13);
    assert.strictEqual(roundLkr(52000.124), 52000.12);
  });
});
