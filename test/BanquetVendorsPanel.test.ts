/**
 * Unit Tests for Step 334: External Vendor & Traditional Cultural Add-Ons Tracker (BanquetVendorsPanel.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BanquetVendor,
  BanquetVendorsPanel,
  DEFAULT_BANQUET_VENDORS,
  DEFAULT_VENDOR_MEAL_CONFIG,
  calculateVendorsSummary,
  filterVendors,
  getCategoryGroup,
  getCategoryLabel,
  getClearanceStatusBadgeStyle,
  getClearanceStatusLabel,
  getNextClearanceStatus,
  isValidSriLankanNicOrPassport,
} from "../src/admin/banquets/index.js";

const noop = (): void => {
  /* no-op for tests */
};

describe("Step 334: External Vendor & Cultural Add-Ons Tracker (BanquetVendorsPanel.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Calculation & Summaries
  // --------------------------------------------------------------------------
  describe("1. Pure Calculation & Summaries", () => {
    it("calculateVendorsSummary aggregates crew, meal boxes, royalties and technical specs accurately", () => {
      const summary = calculateVendorsSummary(DEFAULT_BANQUET_VENDORS, DEFAULT_VENDOR_MEAL_CONFIG);

      // Total count
      assert.strictEqual(summary.totalVendorsCount, 6);

      // Headcount: 6 (decor) + 5 (ashtaka) + 8 (dancers) + 7 (band) + 4 (photo) + 2 (cake) = 32
      assert.strictEqual(summary.totalCrewHeadcount, 32);

      // Meal boxes: 6 + 5 + 8 + 7 + 4 + 0 = 30
      assert.strictEqual(summary.totalMealBoxesCount, 30);

      // Cost: 30 boxes * 1,800 LKR = 54,000 LKR
      assert.strictEqual(summary.totalMealBoxesCostLkr, 54000);

      // Royalties: 0 (decor) + 0 (ashtaka) + 0 (dancers) + 25000 (band) + 10000 (photo) + 5000 (cake) = 40,000 LKR
      assert.strictEqual(summary.totalExternalVendorFeesLkr, 40000);

      // 3-Phase power: 1 (band)
      assert.strictEqual(summary.threePhasePowerCount, 1);

      // Green rooms: 3 (ashtaka, dancers, band)
      assert.strictEqual(summary.greenRoomsAllocatedCount, 3);

      // Approved gate passes: 5 (approved or checked-in or completed)
      assert.strictEqual(summary.approvedGatePassesCount, 5);

      // Checked-in: 1 (photo studio)
      assert.strictEqual(summary.checkedInVendorsCount, 1);
    });

    it("calculateVendorsSummary correctly applies custom buffet rate for buffet access meals", () => {
      const customVendors: readonly BanquetVendor[] = [
        {
          id: "v-custom",
          category: "BAND_DJ",
          companyName: "VIP Band",
          contactPerson: "Mahesh",
          contactPhone: "+94 77 111 2222",
          leadPersonNicOrPassport: "881234567V",
          isInHousePartner: true,
          clearanceStatus: "APPROVED",
          arrivalTimeEta: "10:00",
          departureTimeEtd: "18:00",
          crewHeadcount: 5,
          mealBoxCount: 5,
          mealBoxType: "BUFFET_ACCESS",
          powerRequirement: { needsThreePhase: false, safetyBreakerVerified: true },
          needsGreenRoom: false,
          soundAgreementSigned: true,
          externalVendorFeeLkr: 0,
          specialInstructions: "",
        },
      ];

      const customConfig = {
        vendorMealRateLkr: 1500,
        vendorBuffetRateLkr: 4000,
        mealServiceTime: "14:00",
        mealServingLocation: "Terrace",
      };

      const summary = calculateVendorsSummary(customVendors, customConfig);
      assert.strictEqual(summary.totalMealBoxesCostLkr, 5 * 4000); // 20,000 LKR
    });
  });

  // --------------------------------------------------------------------------
  // 2. Category Grouping & Filtering
  // --------------------------------------------------------------------------
  describe("2. Category Grouping & Filtering", () => {
    it("getCategoryGroup maps vendors to high-level filter groups", () => {
      assert.strictEqual(getCategoryGroup("PORUWA_DECORATOR"), "CULTURAL");
      assert.strictEqual(getCategoryGroup("ASHTAKA_JAYAMANGALA"), "CULTURAL");
      assert.strictEqual(getCategoryGroup("KANDYAN_DANCERS"), "CULTURAL");
      assert.strictEqual(getCategoryGroup("BAND_DJ"), "MUSIC_AV");
      assert.strictEqual(getCategoryGroup("LIGHTING_AV"), "MUSIC_AV");
      assert.strictEqual(getCategoryGroup("PHOTOGRAPHER_VIDEOGRAPHER"), "VISUALS_DECOR");
      assert.strictEqual(getCategoryGroup("WEDDING_CAKE"), "VISUALS_DECOR");
      assert.strictEqual(getCategoryGroup("OTHER"), "OTHER");
    });

    it("filterVendors handles tab filtering correctly", () => {
      const cultural = filterVendors(DEFAULT_BANQUET_VENDORS, "CULTURAL", "");
      assert.strictEqual(cultural.length, 3);

      const musicAv = filterVendors(DEFAULT_BANQUET_VENDORS, "MUSIC_AV", "");
      assert.strictEqual(musicAv.length, 1);

      const visuals = filterVendors(DEFAULT_BANQUET_VENDORS, "VISUALS_DECOR", "");
      assert.strictEqual(visuals.length, 2);

      const meals = filterVendors(DEFAULT_BANQUET_VENDORS, "MEAL_BOXES", "");
      // All have meals except cake (which has 0)
      assert.strictEqual(meals.length, 5);
    });

    it("filterVendors searches across company, contact, phone, and NIC", () => {
      const searchByName = filterVendors(DEFAULT_BANQUET_VENDORS, "ALL", "Lassana");
      assert.strictEqual(searchByName.length, 1);
      assert.strictEqual(searchByName[0]?.category, "PORUWA_DECORATOR");

      const searchByPhone = filterVendors(DEFAULT_BANQUET_VENDORS, "ALL", "888 9911");
      assert.strictEqual(searchByPhone.length, 1);
      assert.strictEqual(searchByPhone[0]?.category, "ASHTAKA_JAYAMANGALA");

      const searchByNic = filterVendors(DEFAULT_BANQUET_VENDORS, "ALL", "753098765v");
      assert.strictEqual(searchByNic.length, 1);
      assert.strictEqual(searchByNic[0]?.category, "BAND_DJ");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Status Transitions & Sri Lankan Identification Validation
  // --------------------------------------------------------------------------
  describe("3. Status Transitions & ID Validation", () => {
    it("getNextClearanceStatus cycles through clearance stages predictably", () => {
      assert.strictEqual(getNextClearanceStatus("PENDING_REVIEW"), "APPROVED");
      assert.strictEqual(getNextClearanceStatus("APPROVED"), "CHECKED_IN");
      assert.strictEqual(getNextClearanceStatus("CHECKED_IN"), "TEARDOWN_COMPLETED");
      assert.strictEqual(getNextClearanceStatus("TEARDOWN_COMPLETED"), "APPROVED");
      assert.strictEqual(getNextClearanceStatus("REJECTED"), "PENDING_REVIEW");
    });

    it("getClearanceStatusBadgeStyle returns valid style classes", () => {
      const approvedStyle = getClearanceStatusBadgeStyle("APPROVED");
      assert.ok(approvedStyle.bg.includes("emerald"));
      assert.ok(approvedStyle.text.includes("emerald"));

      const pendingStyle = getClearanceStatusBadgeStyle("PENDING_REVIEW");
      assert.ok(pendingStyle.bg.includes("amber"));

      const rejectedStyle = getClearanceStatusBadgeStyle("REJECTED");
      assert.ok(rejectedStyle.bg.includes("rose"));
    });

    it("isValidSriLankanNicOrPassport validates Sri Lankan old NIC, new NIC, and passports", () => {
      // Old NIC (9 digits + V/X)
      assert.strictEqual(isValidSriLankanNicOrPassport("821543210V"), true);
      assert.strictEqual(isValidSriLankanNicOrPassport("912345678v"), true);
      assert.strictEqual(isValidSriLankanNicOrPassport("753098765X"), true);

      // New NIC (12 digits)
      assert.strictEqual(isValidSriLankanNicOrPassport("199023456789"), true);
      assert.strictEqual(isValidSriLankanNicOrPassport("200012345678"), true);

      // Passports (letter + 7-8 digits)
      assert.strictEqual(isValidSriLankanNicOrPassport("N1234567"), true);
      assert.strictEqual(isValidSriLankanNicOrPassport("A12345678"), true);

      // Invalid
      assert.strictEqual(isValidSriLankanNicOrPassport("1234"), false);
      assert.strictEqual(isValidSriLankanNicOrPassport("ABC1234"), false);
      assert.strictEqual(isValidSriLankanNicOrPassport(""), false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Trilingual Label Translation
  // --------------------------------------------------------------------------
  describe("4. Trilingual Translation", () => {
    it("getCategoryLabel translates categories into Sinhala and Tamil", () => {
      assert.strictEqual(getCategoryLabel("PORUWA_DECORATOR", "en"), "Poruwa & Floral Decorator");
      assert.strictEqual(getCategoryLabel("PORUWA_DECORATOR", "si"), "පෝරු සහ මල් සැරසිලි");
      assert.strictEqual(getCategoryLabel("PORUWA_DECORATOR", "ta"), "போரு & மலர் அலங்காரம்");

      assert.strictEqual(getCategoryLabel("BAND_DJ", "en"), "Live Band / DJ");
      assert.strictEqual(getCategoryLabel("BAND_DJ", "si"), "සංගීත කණ්ඩායම / DJ");
      assert.strictEqual(getCategoryLabel("BAND_DJ", "ta"), "இசைக்குழு / DJ");
    });

    it("getClearanceStatusLabel translates status across languages", () => {
      assert.strictEqual(getClearanceStatusLabel("APPROVED", "en"), "Approved Gate Pass");
      assert.strictEqual(getClearanceStatusLabel("APPROVED", "si"), "අනුමතයි");
      assert.strictEqual(getClearanceStatusLabel("APPROVED", "ta"), "ஒப்புதல்");
    });
  });

  // --------------------------------------------------------------------------
  // 5. Static React Rendering & Integration
  // --------------------------------------------------------------------------
  describe("5. Static React Rendering & Integration", () => {
    it("renders BanquetVendorsPanel in English cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetVendorsPanel, {
          initialVendors: DEFAULT_BANQUET_VENDORS,
          reservationTitle: "Kasun & Sanduni's Wedding Reception",
          hallName: "Grand Ballroom & Outdoor Poruwa Lawn",
          eventDate: "2026-11-18",
          language: "en",
          onVendorsChange: noop,
          onPrintGatePasses: noop,
        }),
      );

      assert.ok(html.includes("External Vendors &amp; Traditional Cultural Services"));
      assert.ok(html.includes("Lassana Flora &amp; Poruwa Artisans"));
      assert.ok(html.includes("Kalyana Mangala Ashtaka Troupe"));
      assert.ok(html.includes("Flame Wedding Sextet &amp; DJ Express"));
      assert.ok(html.includes("3-Phase"));
      assert.ok(html.includes("Kitchen Crew Meal Requisition Summary"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders BanquetVendorsPanel in Sinhala cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetVendorsPanel, {
          initialVendors: DEFAULT_BANQUET_VENDORS,
          language: "si",
          onVendorsChange: noop,
        }),
      );

      assert.ok(html.includes("බාහිර සේවා සැපයුම්කරුවන් සහ සාම්ප්රදායික මංගල සේවා"));
      assert.ok(html.includes("පෝරුව සහ සංස්කෘතික"));
      assert.ok(html.includes("මුළුතැන්ගෙයි ආහාර පෙට්ටි"));
    });

    it("renders BanquetVendorsPanel in Tamil cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetVendorsPanel, {
          initialVendors: DEFAULT_BANQUET_VENDORS,
          language: "ta",
          onVendorsChange: noop,
        }),
      );

      assert.ok(html.includes("வெளிப்புற விற்பனையாளர்கள் மற்றும் பாரம்பரிய கலாச்சார சேவைகள்"));
      assert.ok(html.includes("போரு &amp; கலாச்சாரம்"));
      assert.ok(html.includes("சமையலறை உணவுப் பெட்டிகள்"));
    });
  });
});
