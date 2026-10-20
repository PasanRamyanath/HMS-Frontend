/**
 * Unit Tests for Step 330: Sri Lankan Wedding & Banquet Booking Wizard (BanquetBookingModal.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BANQUET_PACKAGE_RATES,
  BanquetBookingModal,
  DEFAULT_SUITE_OPTIONS,
  calculateBanquetFinancials,
  isHoneymoonSuiteEligible,
  isValidSriLankanNic,
} from "../src/admin/banquets/index.js";

describe("Step 330: Sri Lankan Wedding & Banquet Booking Wizard (BanquetBookingModal.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Helper & Domain Rule Validation
  // --------------------------------------------------------------------------
  describe("1. Pure Helper & Domain Rule Validation", () => {
    it("isValidSriLankanNic validates both 9-digit (old) and 12-digit (new) formats and passports", () => {
      // Old format (9 digits + V/X)
      assert.strictEqual(isValidSriLankanNic("955841234V"), true);
      assert.strictEqual(isValidSriLankanNic("881234567x"), true);
      // New format (12 digits)
      assert.strictEqual(isValidSriLankanNic("199558401234"), true);
      assert.strictEqual(isValidSriLankanNic("200012345678"), true);
      // Passport format
      assert.strictEqual(isValidSriLankanNic("N1234567"), true);
      assert.strictEqual(isValidSriLankanNic("A12345678"), true);

      // Invalid formats
      assert.strictEqual(isValidSriLankanNic("12345"), false);
      assert.strictEqual(isValidSriLankanNic("invalid-nic"), false);
      assert.strictEqual(isValidSriLankanNic("1995584012345"), false); // 13 digits
    });

    it("isHoneymoonSuiteEligible requires WEDDING_PORUWA or HOMECOMING and >= 150 pax", () => {
      assert.strictEqual(isHoneymoonSuiteEligible("WEDDING_PORUWA", 150), true);
      assert.strictEqual(isHoneymoonSuiteEligible("WEDDING_PORUWA", 250), true);
      assert.strictEqual(isHoneymoonSuiteEligible("HOMECOMING", 180), true);

      // Below threshold
      assert.strictEqual(isHoneymoonSuiteEligible("WEDDING_PORUWA", 149), false);
      assert.strictEqual(isHoneymoonSuiteEligible("HOMECOMING", 80), false);

      // Non-wedding functions
      assert.strictEqual(isHoneymoonSuiteEligible("CORPORATE_GALA", 300), false);
      assert.strictEqual(isHoneymoonSuiteEligible("BIRTHDAY_PARTY", 200), false);
    });

    it("calculateBanquetFinancials calculates plate, bite tables, and balance due accurately", () => {
      // 250 pax at LKR 7,500 + 10 bite tables at LKR 25,000, deposit LKR 500,000
      const fin = calculateBanquetFinancials(250, 7500, 10, 500000);
      assert.strictEqual(fin.plateTotalLkr, 1875000);
      assert.strictEqual(fin.bitesTotalLkr, 250000);
      assert.strictEqual(fin.estimatedGrandTotalLkr, 2125000);
      assert.strictEqual(fin.balanceDueLkr, 1625000);
    });

    it("BANQUET_PACKAGE_RATES provides statutory menu tiers", () => {
      assert.strictEqual(BANQUET_PACKAGE_RATES.SILVER, 5200);
      assert.strictEqual(BANQUET_PACKAGE_RATES.GOLD, 6500);
      assert.strictEqual(BANQUET_PACKAGE_RATES.PLATINUM, 7500);
      assert.strictEqual(BANQUET_PACKAGE_RATES.ROYAL_KANDYAN, 8900);
    });

    it("DEFAULT_SUITE_OPTIONS contains Honeymoon and Presidential suites", () => {
      assert.strictEqual(DEFAULT_SUITE_OPTIONS.length, 3);
      assert.strictEqual(DEFAULT_SUITE_OPTIONS[0]?.roomNumber, "401");
      assert.strictEqual(DEFAULT_SUITE_OPTIONS[0]?.roomType, "Ocean Honeymoon Suite");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Server-Side Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    const noopClose = (): void => {
      // no-op test close
    };
    const noopSubmit = async (): Promise<void> => {
      // no-op test submit
    };

    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBookingModal, {
          isOpen: false,
          onClose: noopClose,
          onSubmitBooking: noopSubmit,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders open modal with Stepper navigation and Event & Hall fields", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBookingModal, {
          isOpen: true,
          language: "en",
          onClose: noopClose,
          onSubmitBooking: noopSubmit,
        }),
      );

      assert.ok(
        html.includes("Banquet &amp; Wedding Reservation Wizard") ||
          html.includes("Banquet & Wedding Reservation Wizard"),
      );
      assert.ok(html.includes("1. Event &amp; Hall") || html.includes("1. Event & Hall"));
      assert.ok(html.includes("2. Client &amp; NICs") || html.includes("2. Client & NICs"));
      assert.ok(html.includes("3. Menu &amp; Bites") || html.includes("3. Menu & Bites"));
      assert.ok(html.includes("4. Honeymoon Suite"));
      assert.ok(html.includes("5. Deposit &amp; Confirm") || html.includes("5. Deposit & Confirm"));
      assert.ok(html.includes("Traditional Poruwa Wedding"));
      assert.ok(
        html.includes("Kavinda &amp; Tharushi Poruwa Wedding") ||
          html.includes("Kavinda & Tharushi Poruwa Wedding"),
      );
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBookingModal, {
          isOpen: true,
          language: "si",
          onClose: noopClose,
          onSubmitBooking: noopSubmit,
        }),
      );

      assert.ok(html.includes("මංගල හා උත්සව වෙන්කිරීමේ පියවර මාර්ගෝපදේශය"));
      assert.ok(html.includes("1. උත්සවය සහ ශාලාව"));
      assert.ok(html.includes("2. යුවළ සහ හැඳුනුම්පත්"));
      assert.ok(html.includes("මීළඟ පියවර"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBookingModal, {
          isOpen: true,
          language: "ta",
          onClose: noopClose,
          onSubmitBooking: noopSubmit,
        }),
      );

      assert.ok(html.includes("மண்டப மற்றும் திருமண முன்பதிவு வழிகாட்டி"));
      assert.ok(html.includes("1. நிகழ்வு &amp; மண்டபம்") || html.includes("1. நிகழ்வு & மண்டபம்"));
      assert.ok(html.includes("அடுத்த படி"));
    });
  });
});
