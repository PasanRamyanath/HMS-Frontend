/**
 * Unit Test Suite: Step 347 (Phase 14.22) — PublicBanquetInquiry.tsx
 *
 * Verifies the Public Wedding & Event Inquiry Form (/events/:tenantId):
 * 1. Pure Quotation & Statutory Tax Engine (calculateInquiryQuotation)
 * 2. Currency Formatting Helper (formatInquiryLkr)
 * 3. 1-Click WhatsApp Pre-Filled Inquiry Generator (buildInquiryWhatsAppUrl)
 * 4. React 19 Component Static Rendering & Apple HIG Verification (Steps, Halls, Menus, Bento Quote)
 * 5. Trilingual Localization (English, Sinhala, Tamil)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type InquiryQuoteSummary,
  PublicBanquetInquiry,
  type PublicBanquetInquiryData,
  type PublicBanquetInquiryProps,
  buildInquiryWhatsAppUrl,
  calculateInquiryQuotation,
  formatInquiryLkr,
} from "../src/qr/booking/PublicBanquetInquiry.js";

describe("Step 347: PublicBanquetInquiry — Public Wedding & Banquet Inquiry Portal", () => {
  describe("1. Pure Quotation & Statutory Tax Engine (calculateInquiryQuotation)", () => {
    it("accurately computes 4-stage compounding Sri Lankan taxes on menu packages", () => {
      // 200 pax * LKR 9,800 (Gold) = 1,960,000 base
      // SC 10% = 196,000 -> Taxable base = 2,156,000
      // TDL 1% = 21,560, SSCL 2.5% = 53,900
      // VAT 18% on (2,156,000 + 21,560 + 53,900) = 18% of 2,231,460 = 401,663 (rounded)
      // Total statutory taxes = 21,560 + 53,900 + 401,663 = 477,123
      // Grand Total = 1,960,000 + 196,000 + 477,123 = 2,633,123
      const quote: InquiryQuoteSummary = calculateInquiryQuotation(200, 9800, 305);

      assert.strictEqual(quote.baseMenuTotalLkr, 1960000);
      assert.strictEqual(quote.serviceCharge10PctLkr, 196000);
      assert.strictEqual(quote.statutoryTaxesLkr, 477123);
      assert.strictEqual(quote.grandTotalLkr, 2633123);
      assert.strictEqual(quote.grandTotalUsd, Math.round(2633123 / 305));
      assert.strictEqual(quote.perPaxNettLkr, Math.round(2633123 / 200));
    });

    it("handles zero or negative pax count safely by defaulting to 1 pax", () => {
      const quote = calculateInquiryQuotation(0, 8500);
      assert.strictEqual(quote.baseMenuTotalLkr, 8500);
      assert.strictEqual(quote.serviceCharge10PctLkr, 850);
      assert.ok(quote.grandTotalLkr > 8500);
    });

    it("handles zero plate rate without negative totals", () => {
      const quote = calculateInquiryQuotation(100, 0);
      assert.strictEqual(quote.baseMenuTotalLkr, 0);
      assert.strictEqual(quote.serviceCharge10PctLkr, 0);
      assert.strictEqual(quote.statutoryTaxesLkr, 0);
      assert.strictEqual(quote.grandTotalLkr, 0);
    });
  });

  describe("2. Currency Formatting Helper (formatInquiryLkr)", () => {
    it("formats LKR integers with thousands separators", () => {
      assert.strictEqual(formatInquiryLkr(2633123), "LKR 2,633,123");
      assert.strictEqual(formatInquiryLkr(0), "LKR 0");
      assert.strictEqual(formatInquiryLkr(9800.45), "LKR 9,800");
    });
  });

  describe("3. 1-Click WhatsApp Pre-Filled Inquiry Generator (buildInquiryWhatsAppUrl)", () => {
    it("constructs WhatsApp deep-link with normalized phone and encoded message in English", () => {
      const inquiry: PublicBanquetInquiryData = {
        tenantId: "tenant-cinnamon",
        eventType: "WEDDING_RECEPTION",
        eventDate: "2026-12-18",
        eventSlot: "MORNING_PORUWA",
        hallId: "HALL-LOTUS",
        paxCount: 250,
        menuTierId: "MENU-GOLD",
        coupleNames: "Kasun & Dinithi",
        contactPhone: "0771234567",
        contactEmail: "kasun@example.com",
      };
      const quote: InquiryQuoteSummary = calculateInquiryQuotation(250, 9800);
      const url = buildInquiryWhatsAppUrl(
        inquiry,
        "+94 77 123 4567",
        "The Grand Cinnamon Resort",
        quote,
        "en",
      );

      assert.ok(url.startsWith("https://wa.me/94771234567?text="));
      assert.ok(url.includes("Kasun%20%26%20Dinithi") || url.includes("Kasun"));
      assert.ok(url.includes("2026-12-18"));
      assert.ok(url.includes("WEDDING_RECEPTION"));
    });

    it("generates Sinhala and Tamil pre-filled inquiry messages accurately", () => {
      const inquiry: PublicBanquetInquiryData = {
        tenantId: "tenant-cinnamon",
        eventType: "PORUWA_CEREMONY",
        eventDate: "2026-11-20",
        eventSlot: "MORNING_PORUWA",
        hallId: "HALL-LOTUS",
        paxCount: 180,
        menuTierId: "MENU-SILVER",
        coupleNames: "Dilan & Rashmi",
        contactPhone: "0712345678",
        contactEmail: "dilan@example.com",
      };
      const quote: InquiryQuoteSummary = calculateInquiryQuotation(180, 8500);

      const siUrl = buildInquiryWhatsAppUrl(inquiry, "+94 77 000 0000", "Grand Hotel", quote, "si");
      assert.ok(decodeURIComponent(siUrl).includes("ආයුබෝවන් Grand Hotel!"));
      assert.ok(decodeURIComponent(siUrl).includes("Dilan & Rashmi"));

      const taUrl = buildInquiryWhatsAppUrl(inquiry, "+94 77 000 0000", "Grand Hotel", quote, "ta");
      assert.ok(decodeURIComponent(taUrl).includes("வணக்கம் Grand Hotel!"));
      assert.ok(decodeURIComponent(taUrl).includes("Dilan & Rashmi"));
    });
  });

  describe("4. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("renders wedding inquiry form with steps, hall cards, and floating quotation bar", () => {
      const props: PublicBanquetInquiryProps = {
        tenantId: "tenant-test",
        hotelName: "The Grand Cinnamon Resort & Spa",
        language: "en",
      };
      const html = renderToStaticMarkup(React.createElement(PublicBanquetInquiry, props));

      // Hero banner
      assert.ok(
        html.includes("Plan Your Dream Wedding &amp; Reception") ||
          html.includes("Plan Your Dream Wedding & Reception"),
      );
      assert.ok(
        html.includes("The Grand Cinnamon Resort &amp; Spa") ||
          html.includes("The Grand Cinnamon Resort & Spa"),
      );

      // 3 Steps
      assert.ok(html.includes("1. Date &amp; Hall") || html.includes("1. Date & Hall"));
      assert.ok(html.includes("2. Menu &amp; Guests") || html.includes("2. Menu & Guests"));
      assert.ok(html.includes("3. Instant Quote"));

      // Default Halls
      assert.ok(html.includes("Grand Lotus Ballroom"));
      assert.ok(html.includes("Palm Grove Ocean Lawn"));
      assert.ok(html.includes("Sapphire Banquet Suite"));

      // Menu Packages
      assert.ok(html.includes("Classic Bronze Wedding Buffet"));
      assert.ok(html.includes("Imperial Gold Wedding Buffet"));
      assert.ok(html.includes("Platinum Royal Grand Banquet"));

      // Quotation breakdown
      assert.ok(html.includes("Instant Estimated Quotation"));
      assert.ok(html.includes("10% Hotel Service Charge"));
      assert.ok(html.includes("Statutory Taxes (TDL, SSCL, VAT)"));
      assert.ok(html.includes("tabular-nums-lkr"));

      // WhatsApp Button
      assert.ok(html.includes("Inquire via WhatsApp"));
      assert.ok(html.includes("Submit Instant Inquiry"));
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const siHtml = renderToStaticMarkup(
        React.createElement(PublicBanquetInquiry, {
          language: "si",
        }),
      );
      assert.ok(siHtml.includes("ඔබගේ සිහින මංගල උත්සවය සැලසුම් කරන්න"));
      assert.ok(siHtml.includes("සුබ මංගල දිනය"));
      assert.ok(siHtml.includes("භෝජන ශාලාව තෝරන්න"));

      const taHtml = renderToStaticMarkup(
        React.createElement(PublicBanquetInquiry, {
          language: "ta",
        }),
      );
      assert.ok(taHtml.includes("உங்கள் கனவு திருமணத்தை திட்டமிடுங்கள்"));
      assert.ok(taHtml.includes("சுப முகூர்த்த திகதி"));
      assert.ok(taHtml.includes("மண்டபத்தைத் தேர்ந்தெடுக்கவும்"));
    });
  });
});
