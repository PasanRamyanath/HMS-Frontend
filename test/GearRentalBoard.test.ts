import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ACTIVE_RENTALS,
  DEFAULT_GEAR_FLEET,
  type GearAsset,
  type GearCategory,
  type GearRentalAgreement,
  GearRentalBoard,
  type GearRentalBoardProps,
  type ReturnCondition,
  calculateGearKpiSummary,
  calculateRentalTaxes,
  getGearTranslations,
  getReturnConditionBadgeClass,
} from "../src/admin/activities/GearRentalBoard.js";

describe("Step 362: Bicycle, Scooter, Surfboard & Snorkel Gear Rental Tracker (GearRentalBoard.tsx)", () => {
  describe("1. Pure Financial Math & Compounding Taxes", () => {
    it("calculates 4-stage compounding Sri Lankan statutory taxes on rental fees", () => {
      // Base fee = 10,000 LKR
      const taxes = calculateRentalTaxes(10000);

      // SC 10% = 1000
      assert.strictEqual(taxes.scLkr, 1000);

      // Base + SC = 11,000
      // TDL 1% = 110
      assert.strictEqual(taxes.tdlLkr, 110);

      // SSCL 2.5% = 275
      assert.strictEqual(taxes.ssclLkr, 275);

      // VAT 18% on (11000 + 275 = 11275) = 2029.50
      assert.strictEqual(taxes.vatLkr, 2029.5);

      // Total taxes = 1000 + 110 + 275 + 2029.50 = 3414.50
      assert.strictEqual(taxes.totalTaxesLkr, 3414.5);

      // Grand total = 10000 + 3414.50 = 13414.50
      assert.strictEqual(taxes.grandTotalLkr, 13414.5);
    });

    it("handles zero base rental fee safely", () => {
      const taxes = calculateRentalTaxes(0);
      assert.strictEqual(taxes.scLkr, 0);
      assert.strictEqual(taxes.tdlLkr, 0);
      assert.strictEqual(taxes.ssclLkr, 0);
      assert.strictEqual(taxes.vatLkr, 0);
      assert.strictEqual(taxes.grandTotalLkr, 0);
    });

    it("aggregates fleet and rental KPIs accurately", () => {
      const summary = calculateGearKpiSummary(DEFAULT_GEAR_FLEET, DEFAULT_ACTIVE_RENTALS);

      // Total fleet = 8: 5 available, 2 on rental, 1 in maintenance
      assert.strictEqual(summary.availableFleetCount, 4);
      assert.strictEqual(summary.maintenanceCount, 1);

      // Active rentals = 3 (2 ACTIVE, 1 OVERDUE)
      assert.strictEqual(summary.activeRentalsCount, 3);
      assert.strictEqual(summary.overdueRentalsCount, 1);

      // Active rental value: 6045.30 + 4298.88 + 2418.12 = 12762.30
      assert.strictEqual(summary.activeRentalValueLkr, 12762.3);

      // Security deposits held: 5000 + 4000 + 2500 = 11500
      assert.strictEqual(summary.securityDepositsHeldLkr, 11500);
    });

    it("returns correct styling badge classes for equipment return conditions", () => {
      assert.ok(getReturnConditionBadgeClass("EXCELLENT").includes("emerald"));
      assert.ok(getReturnConditionBadgeClass("GOOD").includes("sky"));
      assert.ok(getReturnConditionBadgeClass("MINOR_DAMAGE").includes("amber"));
      assert.ok(getReturnConditionBadgeClass("MAJOR_DAMAGE").includes("rose"));
      assert.ok(getReturnConditionBadgeClass("LOST").includes("rose"));
    });
  });

  describe("2. Trilingual Localization & Translations", () => {
    it("provides complete translations in English, Sinhala, and Tamil", () => {
      const en = getGearTranslations("en");
      assert.strictEqual(en.title, "Recreation & Adventure Gear Rental Board");
      assert.strictEqual(en.categorySurfboard, "Surfboards");
      assert.strictEqual(en.categoryScooter, "Scooters");
      assert.strictEqual(en.checkoutButton, "Rent Gear");

      const si = getGearTranslations("si");
      assert.strictEqual(si.title, "ක්රීඩා සහ වික්රමාන්විත උපකරණ කුලියට දීමේ පුවරුව");
      assert.strictEqual(si.categoryBicycle, "පාපැදි");
      assert.strictEqual(si.returnButton, "ආපසු භාරගන්න");

      const ta = getGearTranslations("ta");
      assert.strictEqual(ta.title, "விளையாட்டு & சாகச உபகரண வாடகை பலகை");
      assert.strictEqual(ta.categoryKayakSup, "கயாக் & துடுப்பு பலகை");
    });
  });

  describe("3. Static React Markup & Component Rendering", () => {
    it("renders GearRentalBoard with KPIs, active rentals table, and fleet inventory cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(GearRentalBoard, {
          initialAssets: DEFAULT_GEAR_FLEET,
          initialRentals: DEFAULT_ACTIVE_RENTALS,
          language: "en",
          testId: "custom-gear-test",
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="custom-gear-test"'));
      assert.ok(html.includes("Recreation &amp; Adventure Gear Rental Board"));

      // Table & Headers
      assert.ok(html.includes('data-testid="active-rentals-table"'));
      assert.ok(html.includes("Torq Funboard 7&#x27;6&quot;"));
      assert.ok(html.includes("Giant Talon Mountain Bike 29&quot;"));
      assert.ok(html.includes("Cressi Panoramic Mask &amp; Dry Snorkel Set"));
      assert.ok(html.includes("OVERDUE"));

      // Fleet cards
      assert.ok(html.includes('data-testid="gear-asset-GEAR-001"'));
      assert.ok(html.includes('data-testid="gear-asset-GEAR-005"'));
      assert.ok(html.includes("Honda Dio 110cc Automatic Scooter"));
    });

    it("renders Sinhala localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(GearRentalBoard, {
          initialAssets: DEFAULT_GEAR_FLEET,
          initialRentals: DEFAULT_ACTIVE_RENTALS,
          language: "si",
        }),
      );

      assert.ok(html.includes("ක්රීඩා සහ වික්රමාන්විත උපකරණ කුලියට දීමේ පුවරුව"));
      assert.ok(html.includes("සර්ෆ්බෝඩ්"));
      assert.ok(html.includes("පාපැදි"));
      assert.ok(html.includes("ලබාගත හැකි"));
    });

    it("renders Tamil localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(GearRentalBoard, {
          initialAssets: DEFAULT_GEAR_FLEET,
          initialRentals: DEFAULT_ACTIVE_RENTALS,
          language: "ta",
        }),
      );

      assert.ok(html.includes("விளையாட்டு &amp; சாகச உபகரண வாடகை பலகை"));
      assert.ok(html.includes("கிடைக்கக்கூடியவை"));
    });
  });

  describe("4. TypeScript Domain Constructibility & Types", () => {
    it("constructs type-safe GearAsset and GearRentalAgreement objects", () => {
      const cat: Exclude<GearCategory, "ALL"> = "SURFBOARD";
      const condition: ReturnCondition = "EXCELLENT";

      const asset: GearAsset = {
        id: "GEAR-CUSTOM-01",
        assetTag: "SURF-CUSTOM-99",
        name: "Custom Fish 5'10\"",
        category: cat,
        description: "Twin fin retro fish",
        hourlyRateLkr: 2000,
        dailyRateLkr: 6000,
        defaultDepositLkr: 7000,
        status: "AVAILABLE",
        sizeOrSpec: '5\'10" x 20.5"',
        iconEmoji: "Surf",
      };

      assert.strictEqual(asset.category, "SURFBOARD");
      assert.strictEqual(asset.hourlyRateLkr, 2000);

      const agr: GearRentalAgreement = {
        id: "RNT-CUSTOM-01",
        rentalRef: "GR-TEST-001",
        gearId: asset.id,
        gearName: asset.name,
        gearCategory: asset.category,
        assetTag: asset.assetTag,
        roomNumber: "Villa 01",
        guestName: "Lady Sarah",
        rentedAt: "2026-10-21T06:00:00Z",
        expectedReturnAt: "2026-10-21T18:00:00Z",
        durationType: "DAILY",
        durationUnits: 1,
        baseRentalFeeLkr: 6000,
        taxesLkr: 2048.7,
        totalRentalChargedLkr: 8048.7,
        securityDepositLkr: 7000,
        helmetOrLeashIssued: true,
        status: "RETURNED",
        returnCondition: condition,
      };

      assert.strictEqual(agr.returnCondition, "EXCELLENT");

      const props: GearRentalBoardProps = {
        initialAssets: [asset],
        initialRentals: [agr],
        language: "en",
        usdExchangeRate: 310,
        onCheckoutRental: () => {
          /* noop */
        },
      };

      assert.strictEqual(props.language, "en");
    });
  });
});
