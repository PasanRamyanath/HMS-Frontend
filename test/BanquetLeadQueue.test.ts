import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BanquetLeadHold,
  BanquetLeadQueue,
  DEFAULT_BANQUET_LEADS,
  buildWhatsAppFollowUpUrl,
  calculateLeadUrgency,
  computeLeadQueueStats,
  formatLeadCurrency,
} from "../src/admin/banquets/BanquetLeadQueue.js";

describe("Step 344: BanquetLeadQueue — Tentative Hold Expiry Alert & Sales Follow-Up Queue", () => {
  const MOCK_NOW_MS = 1792886400000; // Fixed deterministic timestamp

  describe("1. Pure Expiry & Urgency Calculation Engine", () => {
    it("flags tentative hold expiring within 14 hours as CRITICAL_48H", () => {
      const expires14h = new Date(MOCK_NOW_MS + 14 * 3600 * 1000).toISOString();
      const urgency = calculateLeadUrgency(expires14h, false, MOCK_NOW_MS);

      assert.strictEqual(urgency.status, "CRITICAL_48H");
      assert.strictEqual(urgency.isExpiringSoon, true);
      assert.strictEqual(urgency.isExpired, false);
      assert.strictEqual(urgency.hoursRemaining, 14);
      assert.strictEqual(urgency.countdownText, "14h remaining");
    });

    it("flags tentative hold expiring in 28 hours as CRITICAL_48H with day-hour countdown", () => {
      const expires28h = new Date(MOCK_NOW_MS + 28 * 3600 * 1000).toISOString();
      const urgency = calculateLeadUrgency(expires28h, false, MOCK_NOW_MS);

      assert.strictEqual(urgency.status, "CRITICAL_48H");
      assert.strictEqual(urgency.isExpiringSoon, true);
      assert.strictEqual(urgency.countdownText, "1d 4h remaining");
    });

    it("flags hold with > 48 hours remaining as WARNING_ACTIVE", () => {
      const expires96h = new Date(MOCK_NOW_MS + 96 * 3600 * 1000).toISOString();
      const urgency = calculateLeadUrgency(expires96h, false, MOCK_NOW_MS);

      assert.strictEqual(urgency.status, "WARNING_ACTIVE");
      assert.strictEqual(urgency.isExpiringSoon, false);
      assert.strictEqual(urgency.isExpired, false);
      assert.strictEqual(urgency.countdownText, "4 days remaining");
    });

    it("flags hold whose deadline passed as EXPIRED", () => {
      const expired4hAgo = new Date(MOCK_NOW_MS - 4 * 3600 * 1000).toISOString();
      const urgency = calculateLeadUrgency(expired4hAgo, false, MOCK_NOW_MS);

      assert.strictEqual(urgency.status, "EXPIRED");
      assert.strictEqual(urgency.isExpiringSoon, false);
      assert.strictEqual(urgency.isExpired, true);
      assert.strictEqual(urgency.countdownText, "Expired 4h ago");
    });

    it("returns CONFIRMED status when booking is confirmed regardless of date", () => {
      const anyDate = new Date(MOCK_NOW_MS - 100 * 3600 * 1000).toISOString();
      const urgency = calculateLeadUrgency(anyDate, true, MOCK_NOW_MS);

      assert.strictEqual(urgency.status, "CONFIRMED");
      assert.strictEqual(urgency.countdownText, "Confirmed Booking");
    });
  });

  describe("2. Pipeline Aggregation & Statistics Helper", () => {
    it("aggregates lead queue metrics and pipeline revenue accurately", () => {
      const testLeads: readonly BanquetLeadHold[] = [
        {
          id: "L1",
          clientName: "Lead 1",
          clientPhone: "+94 77 111 2222",
          clientEmail: "l1@gmail.com",
          requestedDate: "2026-11-20",
          session: "LUNCH_PORUWA",
          hallName: "Sapphire Ballroom",
          estimatedPax: 200,
          estimatedValueLkr: 2000000,
          holdPlacedIso: new Date(MOCK_NOW_MS - 48 * 3600 * 1000).toISOString(),
          holdExpiresIso: new Date(MOCK_NOW_MS + 10 * 3600 * 1000).toISOString(), // Critical 10h
          isConfirmed: false,
          assignedCoordinator: "Coordinator A",
        },
        {
          id: "L2",
          clientName: "Lead 2",
          clientPhone: "+94 77 333 4444",
          clientEmail: "l2@gmail.com",
          requestedDate: "2026-12-10",
          session: "DINNER_HOMECOMING",
          hallName: "Crystal Hall",
          estimatedPax: 150,
          estimatedValueLkr: 1500000,
          holdPlacedIso: new Date(MOCK_NOW_MS - 24 * 3600 * 1000).toISOString(),
          holdExpiresIso: new Date(MOCK_NOW_MS + 72 * 3600 * 1000).toISOString(), // Active 72h
          isConfirmed: false,
          assignedCoordinator: "Coordinator B",
        },
        {
          id: "L3",
          clientName: "Lead 3",
          clientPhone: "+94 77 555 6666",
          clientEmail: "l3@gmail.com",
          requestedDate: "2026-10-15",
          session: "LUNCH_PORUWA",
          hallName: "Sapphire Ballroom",
          estimatedPax: 250,
          estimatedValueLkr: 2500000,
          holdPlacedIso: new Date(MOCK_NOW_MS - 96 * 3600 * 1000).toISOString(),
          holdExpiresIso: new Date(MOCK_NOW_MS - 2 * 3600 * 1000).toISOString(), // Expired
          isConfirmed: false,
          assignedCoordinator: "Coordinator A",
        },
      ];

      const stats = computeLeadQueueStats(testLeads, MOCK_NOW_MS);

      assert.strictEqual(stats.totalLeadsCount, 3);
      assert.strictEqual(stats.expiringSoonCount, 1);
      assert.strictEqual(stats.activeHoldsCount, 1);
      assert.strictEqual(stats.expiredCount, 1);
      assert.strictEqual(stats.totalPipelineValueLkr, 6000000);
    });

    it("handles empty leads array safely", () => {
      const stats = computeLeadQueueStats([], MOCK_NOW_MS);
      assert.strictEqual(stats.totalLeadsCount, 0);
      assert.strictEqual(stats.expiringSoonCount, 0);
      assert.strictEqual(stats.activeHoldsCount, 0);
      assert.strictEqual(stats.expiredCount, 0);
      assert.strictEqual(stats.totalPipelineValueLkr, 0);
    });
  });

  describe("3. formatLeadCurrency & WhatsApp Follow-Up Generator", () => {
    it("formats LKR integers without decimals", () => {
      assert.strictEqual(formatLeadCurrency(2125000), "LKR 2,125,000");
      assert.strictEqual(formatLeadCurrency(0), "LKR 0");
      assert.strictEqual(formatLeadCurrency(Number.NaN), "LKR 0");
    });

    it("generates trilingual WhatsApp deep-links with clean phone normalization", () => {
      const lead = DEFAULT_BANQUET_LEADS[0];
      assert.ok(lead);

      // English
      const urlEn = buildWhatsAppFollowUpUrl(lead, "Cinnamon Grand", 14, "en");
      assert.match(urlEn, /https:\/\/wa\.me\/94779876543\?text=/);
      assert.match(urlEn, /Cinnamon%20Grand/);
      assert.match(urlEn, /14%20hours/);

      // Sinhala
      const urlSi = buildWhatsAppFollowUpUrl(lead, "Cinnamon Grand", 14, "si");
      assert.match(urlSi, /https:\/\/wa\.me\/94779876543\?text=/);
      assert.ok(decodeURIComponent(urlSi).includes("ආයුබෝවන්"));

      // Tamil
      const urlTa = buildWhatsAppFollowUpUrl(lead, "Cinnamon Grand", 14, "ta");
      assert.match(urlTa, /https:\/\/wa\.me\/94779876543\?text=/);
      assert.ok(decodeURIComponent(urlTa).includes("வணக்கம்"));
    });
  });

  describe("4. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("renders lead queue with bento counters, lead cards, and follow-up buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetLeadQueue, {
          initialLeads: DEFAULT_BANQUET_LEADS,
          hotelName: "The Grand Cinnamon Resort",
        }),
      );

      assert.match(html, /Tentative Hold Expiry &amp; Sales Follow-Up/);
      assert.match(html, /The Grand Cinnamon Resort/);
      assert.match(html, /Pipeline Value/);
      assert.match(html, /Malsha Fernando &amp; Dinuka Perera/);
      assert.match(html, /WhatsApp Follow-Up/);
      assert.match(html, /\+24h Extension/);
      assert.match(html, /Release Date/);
      assert.match(html, /Convert to Booking/);
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(BanquetLeadQueue, {
          initialLeads: DEFAULT_BANQUET_LEADS,
          language: "si",
        }),
      );
      assert.match(htmlSi, /තාවකාලික වෙන්කිරීම් කල්ඉකුත්වීම් සහ විකුණුම් පසු විපරම/);
      assert.match(htmlSi, /WhatsApp පණිවිඩය/);

      const htmlTa = renderToStaticMarkup(
        React.createElement(BanquetLeadQueue, {
          initialLeads: DEFAULT_BANQUET_LEADS,
          language: "ta",
        }),
      );
      assert.match(htmlTa, /தற்காலிக முன்பதிவு காலாவதி &amp; விற்பனை பின்தொடரல்/);
      assert.match(htmlTa, /WhatsApp பின்தொடரல்/);
    });

    it("renders clean empty state when initial leads array is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetLeadQueue, {
          initialLeads: [],
        }),
      );

      assert.match(html, /No tentative holds match the selected criteria/);
    });
  });
});
