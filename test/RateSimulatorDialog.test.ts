import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_RATE_MATRICES } from "../src/admin/rooms/RateMatrixGrid.js";
import {
  type ChildSimulationGuest,
  DEFAULT_BABY_COT_RATE_LKR,
  DEFAULT_DRIVER_BED_RATE_LKR,
  DEFAULT_DRIVER_MEAL_RATE_LKR,
  DEFAULT_EXCHANGE_RATE_USD_LKR,
  DEFAULT_EXTRA_BED_RATE_LKR,
  type QuoteFormatOptions,
  RateSimulatorDialog,
  type RateSimulatorDialogProps,
  type SimulatorPricingModel,
  type SimulatorResidency,
  type StaySimulationInput,
  type StaySimulationResult,
  calculateSingleChildMeals,
  calculateStatutoryTaxes,
  calculateStaySimulation,
  formatEmailQuote,
  formatMealPlanLabel,
  formatUsd,
  formatWhatsAppQuote,
  generateDateRange,
  resolveSeasonMultiplier,
  roundCent,
} from "../src/admin/rooms/RateSimulatorDialog.js";
import { DEFAULT_ROOM_TYPES, type RoomTypeModel } from "../src/admin/rooms/RoomTypeManager.js";
import {
  SRI_LANKAN_SEASON_PRESETS,
  type SeasonalBand,
} from "../src/admin/rooms/SeasonalBandsEditor.js";
import { MealPlan } from "../src/generated/graphql.js";

describe("Interactive Rate Quote Simulator & WhatsApp Formatter (RateSimulatorDialog.tsx)", () => {
  const sampleRoom: RoomTypeModel = DEFAULT_ROOM_TYPES[0] ?? {
    id: "rt-dlx-ocean",
    code: "DLX-OCN",
    name: "Deluxe Ocean View",
    description: "Ocean view room",
    baseRateResidentLkr: 42000,
    baseRateForeignUsd: 140,
    maxOccupancyAdults: 3,
    maxOccupancyChildren: 2,
    extraBedMax: 1,
    totalRoomCount: 10,
    amenities: ["Ocean View"],
    photos: [],
    isActive: true,
  };
  const sampleMatrix = DEFAULT_RATE_MATRICES[0] ?? {
    roomTypeId: "rt-dlx-ocean",
    roomTypeCode: "DLX-OCN",
    roomTypeName: "Deluxe Ocean View",
    baseRoResidentLkr: 42000,
    baseRoForeignUsd: 140,
    pricingBasis: "PER_ROOM" as const,
    mealPlanRates: {
      [MealPlan.Ro]: { residentSupplementLkr: 0, foreignSupplementUsd: 0 },
      [MealPlan.Bb]: { residentSupplementLkr: 4500, foreignSupplementUsd: 15 },
      [MealPlan.Hb]: { residentSupplementLkr: 11000, foreignSupplementUsd: 35 },
      [MealPlan.Fb]: { residentSupplementLkr: 18000, foreignSupplementUsd: 58 },
      [MealPlan.Ai]: { residentSupplementLkr: 26000, foreignSupplementUsd: 85 },
    },
  };

  describe("Utility & Mathematical Rounding Helpers", () => {
    it("rounds currency amounts to exact half-up cents with epsilon guard", () => {
      assert.equal(roundCent(100.254), 100.25);
      assert.equal(roundCent(100.256), 100.26);
      assert.equal(roundCent(100.0), 100.0);
    });

    it("formats USD currency strings accurately", () => {
      assert.equal(formatUsd(140), "$140.00 USD");
      assert.equal(formatUsd(1234.56), "$1,234.56 USD");
    });

    it("generates date range arrays accurately", () => {
      const range = generateDateRange("2026-12-20", "2026-12-23");
      assert.deepEqual(range, ["2026-12-20", "2026-12-21", "2026-12-22"]);
    });

    it("handles invalid or inverted check-in/out dates gracefully", () => {
      const range = generateDateRange("2026-12-25", "2026-12-20");
      assert.deepEqual(range, ["2026-12-25"]);
    });
  });

  describe("Seasonal Calendar Multiplier Resolution", () => {
    it("resolves European Winter Super Peak season (+40%) in December", () => {
      const season = resolveSeasonMultiplier("2026-12-20", SRI_LANKAN_SEASON_PRESETS);
      assert.equal(season.name, "European Winter Super Peak (Christmas & New Year)");
      assert.equal(season.multiplier, 1.4);
    });

    it("falls back to standard tariffs (1.0x) for non-seasonal dates", () => {
      const season = resolveSeasonMultiplier("2026-11-15", SRI_LANKAN_SEASON_PRESETS);
      assert.equal(season.name, "Standard Tariffs");
      assert.equal(season.multiplier, 1.0);
    });

    it("ignores inactive seasonal bands", () => {
      const inactiveBand: SeasonalBand = {
        id: "inactive-test",
        name: "Inactive High Season",
        seasonType: "PEAK",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        rateAdjustmentType: "PERCENTAGE_MULTIPLIER",
        adjustmentValue: 1.5,
        minimumStayNights: 2,
        isActive: false,
      };
      const res = resolveSeasonMultiplier("2026-04-10", [inactiveBand]);
      assert.equal(res.name, "Standard Tariffs");
      assert.equal(res.multiplier, 1.0);
    });
  });

  describe("Child Policy Meal Supplement Calculations", () => {
    const adultMealRate = 10000; // 10,000 LKR HB supplement

    it("evaluates infant (age 0-5) as 100% complimentary dining", () => {
      assert.equal(calculateSingleChildMeals({ ageYears: 2 }, adultMealRate), 0);
      assert.equal(calculateSingleChildMeals({ ageYears: 5 }, adultMealRate), 0);
    });

    it("evaluates junior child (age 6-11) as 50% meal supplement", () => {
      assert.equal(calculateSingleChildMeals({ ageYears: 6 }, adultMealRate), 5000);
      assert.equal(calculateSingleChildMeals({ ageYears: 10 }, adultMealRate), 5000);
    });

    it("evaluates teen child (age 12+) as 100% full adult meal supplement", () => {
      assert.equal(calculateSingleChildMeals({ ageYears: 12 }, adultMealRate), 10000);
      assert.equal(calculateSingleChildMeals({ ageYears: 16 }, adultMealRate), 10000);
    });
  });

  describe("Statutory Sri Lankan Tax Compounding (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)", () => {
    const taxRates = { sc: 10, tdl: 1, sscl: 2.5, vat: 18 };

    it("computes TAX_EXCLUSIVE compounding taxes matching IRD benchmark", () => {
      // 100,000 LKR base supply:
      // SC = 10,000
      // TDL = 1,000
      // SSCL = (100,000 + 10,000) * 2.5% = 2,750
      // VAT = (100,000 + 10,000 + 2,750) * 18% = 20,295
      // Total tax = 10,000 + 1,000 + 2,750 + 20,295 = 34,045
      // Gross = 134,045
      const res = calculateStatutoryTaxes(100000, "TAX_EXCLUSIVE", taxRates);
      assert.equal(res.netLkr, 100000);
      assert.equal(res.taxes.scLkr, 10000);
      assert.equal(res.taxes.tdlLkr, 1000);
      assert.equal(res.taxes.ssclLkr, 2750);
      assert.equal(res.taxes.vatLkr, 20295);
      assert.equal(res.taxes.totalTaxesLkr, 34045);
      assert.equal(res.grossLkr, 134045);
    });

    it("extracts TAX_INCLUSIVE net base backwards so gross equals published price", () => {
      const grossPublished = 134045;
      const res = calculateStatutoryTaxes(grossPublished, "TAX_INCLUSIVE", taxRates);
      assert.equal(res.grossLkr, grossPublished);
      // Net base extracted should be close to 100,000
      assert.ok(Math.abs(res.netLkr - 100000) <= 1.0);
    });
  });

  describe("Comprehensive Multi-Night Stay Simulation (calculateStaySimulation)", () => {
    it("computes 3-night Resident Half-Board booking with child and driver quarters", () => {
      const residency: SimulatorResidency = "RESIDENT";
      const pricingModel: SimulatorPricingModel = "TAX_EXCLUSIVE";
      const children: ReadonlyArray<ChildSimulationGuest> = [
        { ageYears: 8, needsExtraBed: false, needsBabyCot: false },
      ];
      const input: StaySimulationInput = {
        checkInDate: "2026-12-20",
        checkOutDate: "2026-12-23",
        roomType: sampleRoom,
        rateMatrix: sampleMatrix,
        residency,
        adultCount: 2,
        children,
        mealPlan: MealPlan.Hb,
        extraBedsCount: 0,
        babyCotsCount: 0,
        driverQuartersRequired: true,
        driverMealsRequired: true,
        pricingModel,
        seasonalBands: SRI_LANKAN_SEASON_PRESETS,
        exchangeRateUsdLkr: DEFAULT_EXCHANGE_RATE_USD_LKR,
      };
      const res: StaySimulationResult = calculateStaySimulation(input);

      assert.equal(res.totalNights, 3);
      assert.equal(res.roomTypeName, "Deluxe Ocean View");
      assert.equal(res.residency, "RESIDENT");
      assert.equal(res.mealPlan, MealPlan.Hb);
      assert.equal(res.pricingModel, "TAX_EXCLUSIVE");

      // Peak season multiplier: 1.4x on 42,000 LKR = 58,800 LKR per night
      // 3 nights base room = 176,400 LKR
      assert.equal(res.totalBaseRoomLkr, 176400);

      // HB adult supplement: 11,000 LKR * 2 adults = 22,000 LKR per night
      // 3 nights adult meals = 66,000 LKR
      assert.equal(res.totalAdultMealsLkr, 66000);

      // Junior child (8 yrs) 50% of 11,000 = 5,500 LKR per night
      // 3 nights child meals = 16,500 LKR
      assert.equal(res.totalChildMealsLkr, 16500);

      // Driver quarters: 2,500 bed + 1,500 meal = 4,000 LKR per night
      // 3 nights driver = 12,000 LKR
      assert.equal(res.totalDriverQuartersLkr, 12000);

      assert.ok(res.totalServiceChargeLkr > 0);
      assert.ok(res.totalVatLkr > 0);
      assert.ok(res.grandTotalLkr > 270900);
      assert.ok(res.grandTotalUsd > 0);
    });

    it("computes Foreign Tourist booking in USD converted via exchange rate", () => {
      const res = calculateStaySimulation({
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-12",
        roomType: sampleRoom, // 140 USD base
        rateMatrix: sampleMatrix, // 35 USD HB supplement
        residency: "FOREIGN",
        adultCount: 2,
        children: [],
        mealPlan: MealPlan.Hb,
        extraBedsCount: 0,
        babyCotsCount: 0,
        driverQuartersRequired: false,
        driverMealsRequired: false,
        pricingModel: "TAX_EXCLUSIVE",
        seasonalBands: SRI_LANKAN_SEASON_PRESETS,
        exchangeRateUsdLkr: 300.0,
      });

      assert.equal(res.totalNights, 2);
      assert.equal(res.residency, "FOREIGN");
      // Base: 140 USD * 300 LKR = 42,000 LKR per night * 2 nights = 84,000 LKR
      assert.equal(res.totalBaseRoomLkr, 84000);
      // HB: 35 USD * 300 LKR = 10,500 LKR * 2 adults = 21,000 LKR * 2 nights = 42,000 LKR
      assert.equal(res.totalAdultMealsLkr, 42000);
      assert.equal(res.exchangeRateUsdLkr, 300.0);
    });

    it("verifies default supplement constants exist and are positive", () => {
      assert.equal(DEFAULT_EXTRA_BED_RATE_LKR, 6000);
      assert.equal(DEFAULT_BABY_COT_RATE_LKR, 1500);
      assert.equal(DEFAULT_DRIVER_BED_RATE_LKR, 2500);
      assert.equal(DEFAULT_DRIVER_MEAL_RATE_LKR, 1500);
    });
  });

  describe("WhatsApp & Email Quotation Formatting", () => {
    it("formats a WhatsApp quotation with emojis, markdown asterisks and polite call-to-action", () => {
      const simulation = calculateStaySimulation({
        checkInDate: "2026-12-20",
        checkOutDate: "2026-12-23",
        roomType: sampleRoom,
        rateMatrix: sampleMatrix,
        residency: "RESIDENT",
        adultCount: 2,
        children: [{ ageYears: 8 }],
        mealPlan: MealPlan.Hb,
        extraBedsCount: 0,
        babyCotsCount: 0,
        driverQuartersRequired: true,
        driverMealsRequired: true,
        pricingModel: "TAX_EXCLUSIVE",
      });

      const options: QuoteFormatOptions = {
        hotelName: "Mirissa Bay Ocean Villas",
        hotelPhone: "+94 41 225 9999",
        guestName: "Mr. Perera",
        validityHours: 48,
      };
      const whatsappText = formatWhatsAppQuote(simulation, options);

      assert.ok(whatsappText.includes("🏨 *Mirissa Bay Ocean Villas*"));
      assert.ok(whatsappText.includes("Dear Mr. Perera,"));
      assert.ok(whatsappText.includes("📅 *Stay Period*: 2026-12-20 to 2026-12-23 (3 Nights)"));
      assert.ok(whatsappText.includes("🛏️ *Room Category*: Deluxe Ocean View"));
      assert.ok(whatsappText.includes("🍽️ *Meal Plan*: Half Board (HB — Breakfast & Dinner)"));
      assert.ok(whatsappText.includes("🌟 *GRAND TOTAL*"));
      assert.ok(whatsappText.includes("📞 *Call / WhatsApp Us*: +94 41 225 9999"));
      assert.ok(whatsappText.includes("valid for *48 hours*"));
    });

    it("formats an email quotation with structured text and validity notice", () => {
      const simulation = calculateStaySimulation({
        checkInDate: "2026-12-20",
        checkOutDate: "2026-12-22",
        roomType: sampleRoom,
        rateMatrix: sampleMatrix,
        residency: "FOREIGN",
        adultCount: 1,
        children: [],
        mealPlan: MealPlan.Bb,
        extraBedsCount: 0,
        babyCotsCount: 0,
        driverQuartersRequired: false,
        driverMealsRequired: false,
        pricingModel: "TAX_EXCLUSIVE",
      });

      const emailText = formatEmailQuote(simulation, {
        hotelName: "Mirissa Bay Ocean Villas",
        validityHours: 72,
      });

      assert.ok(emailText.includes("Subject: Stay Quotation - Deluxe Ocean View"));
      assert.ok(emailText.includes("Duration:       2 Night(s)"));
      assert.ok(emailText.includes("International Guest"));
      assert.ok(emailText.includes("valid for 72 hours"));
    });

    it("formats meal plan labels correctly", () => {
      assert.equal(formatMealPlanLabel(MealPlan.Ro), "Room Only (RO)");
      assert.equal(formatMealPlanLabel(MealPlan.Bb), "Bed & Breakfast (BB)");
      assert.equal(formatMealPlanLabel(MealPlan.Hb), "Half Board (HB — Breakfast & Dinner)");
      assert.equal(formatMealPlanLabel(MealPlan.Fb), "Full Board (FB — Breakfast, Lunch & Dinner)");
      assert.equal(formatMealPlanLabel(MealPlan.Ai), "All Inclusive (AI — Meals & Beverages)");
    });
  });

  describe("React Component Rendering (RateSimulatorDialog)", () => {
    it("renders closed dialog as null", () => {
      const closedProps: RateSimulatorDialogProps = {
        isOpen: false,
        onClose: () => undefined,
      };
      const html = renderToStaticMarkup(React.createElement(RateSimulatorDialog, closedProps));
      assert.equal(html, "");
    });

    it("renders open dialog with simulator tabs and action buttons", () => {
      const openProps: RateSimulatorDialogProps = {
        isOpen: true,
        onClose: () => undefined,
        hotelName: "Araliya Beach Resort",
      };
      const html = renderToStaticMarkup(React.createElement(RateSimulatorDialog, openProps));

      assert.ok(html.includes("Interactive Rate Quote Simulator"));
      assert.ok(html.includes("Residency Tier &amp; Dual-Currency Standard"));
      assert.ok(html.includes("Copy Quote for WhatsApp"));
      assert.ok(html.includes("Copy Email"));
      assert.ok(html.includes("Stay Quote Summary"));
    });
  });
});
