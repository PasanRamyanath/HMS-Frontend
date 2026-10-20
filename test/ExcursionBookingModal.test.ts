/**
 * ExcursionBookingModal Test Suite
 * (HMS-Frontend/test/ExcursionBookingModal.test.ts)
 *
 * Verifies Step 355:
 * - Safari Jeep & Excursion Desk booking modal.
 * - Third-party vendor pass-through vs taxable hotel markup split.
 * - 4-stage compounding statutory taxes on hotel markup only.
 * - Early morning departure detection (< 07:30 AM) & packed breakfast prompt.
 * - Trilingual localization (en, si, ta) and Apple HIG compliance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BreakfastDietaryType,
  EXCURSION_PRESETS,
  EXCURSION_TRANSLATIONS,
  ExcursionBookingModal,
  type ExcursionBookingModalProps,
  type ExcursionBookingPayload,
  type ExcursionFinancialSummary,
  type ExcursionFormValidationResult,
  type ExcursionModalTranslations,
  type ExcursionPresetOption,
  type ExcursionType,
  type ExcursionVehicleType,
  type PackedBreakfastRequest,
  SC_RATE,
  SSCL_RATE,
  TDL_RATE,
  VAT_RATE,
  calculateExcursionFinancials,
  isEarlyMorningPickup,
  roundLkr,
  validateExcursionForm,
} from "../src/admin/activities/ExcursionBookingModal.js";

describe("Step 355: Safari Jeep & Excursion Booking Modal (ExcursionBookingModal.tsx)", () => {
  describe("1. Statutory Financial Math & Pass-Through Split", () => {
    it("safely rounds currency values to 2 decimal places with roundLkr", () => {
      assert.equal(roundLkr(100.456), 100.46);
      assert.equal(roundLkr(100.454), 100.45);
      assert.equal(roundLkr(0), 0);
      assert.equal(roundLkr(Number.NaN), 0);
      assert.equal(roundLkr(Number.POSITIVE_INFINITY), 0);
    });

    it("verifies standard Sri Lankan tax rate constants", () => {
      assert.equal(SC_RATE, 0.1);
      assert.equal(TDL_RATE, 0.01);
      assert.equal(SSCL_RATE, 0.025);
      assert.equal(VAT_RATE, 0.18);
    });

    it("accurately splits SC-exempt pass-through tickets and compounds taxes on hotel markup", () => {
      // Example: Yala National Park:
      // Vendor Pass-Through (Park Permit): 28,000 LKR (Exempt from 10% SC and hotel tax)
      // Hotel Handling Markup: 15,000 LKR
      const passThrough = 28000;
      const markup = 15000;

      const result: ExcursionFinancialSummary = calculateExcursionFinancials(passThrough, markup);

      // SC = 15,000 * 10% = 1,500
      assert.equal(result.serviceChargeLkr, 1500);

      // Base + SC = 16,500
      // TDL = 16,500 * 1% = 165
      assert.equal(result.tdlLkr, 165);

      // SSCL = 16,500 * 2.5% = 412.50
      assert.equal(result.ssclLkr, 412.5);

      // VAT Base = 16,500 + 412.50 = 16,912.50
      // VAT = 16,912.50 * 18% = 3,044.25
      assert.equal(result.vatLkr, 3044.25);

      // Total Hotel Taxes = 1,500 + 165 + 412.50 + 3,044.25 = 5,121.75
      assert.equal(result.totalHotelTaxesLkr, 5121.75);

      // Total Hotel Payable = 15,000 + 5,121.75 = 20,121.75
      assert.equal(result.totalHotelPayableLkr, 20121.75);

      // Grand Total = 20,121.75 + 28,000 = 48,121.75
      assert.equal(result.grandTotalPayableLkr, 48121.75);
      assert.equal(result.vendorPassThroughLkr, 28000);
      assert.equal(result.hotelMarkupLkr, 15000);
    });

    it("handles zero markup and zero pass-through safely", () => {
      const zeroFin = calculateExcursionFinancials(0, 0);
      assert.equal(zeroFin.grandTotalPayableLkr, 0);
      assert.equal(zeroFin.totalHotelTaxesLkr, 0);
      assert.equal(zeroFin.serviceChargeLkr, 0);

      const passOnly = calculateExcursionFinancials(10000, 0);
      assert.equal(passOnly.vendorPassThroughLkr, 10000);
      assert.equal(passOnly.hotelMarkupLkr, 0);
      assert.equal(passOnly.totalHotelTaxesLkr, 0);
      assert.equal(passOnly.grandTotalPayableLkr, 10000);
    });
  });

  describe("2. Early-Morning Departure & Packed Breakfast Detection", () => {
    it("detects early morning departures before 07:30 AM", () => {
      assert.equal(isEarlyMorningPickup("05:00"), true);
      assert.equal(isEarlyMorningPickup("05:30"), true);
      assert.equal(isEarlyMorningPickup("06:00"), true);
      assert.equal(isEarlyMorningPickup("07:00"), true);
      assert.equal(isEarlyMorningPickup("07:30"), true);
    });

    it("rejects daytime and afternoon times as early morning", () => {
      assert.equal(isEarlyMorningPickup("07:31"), false);
      assert.equal(isEarlyMorningPickup("08:00"), false);
      assert.equal(isEarlyMorningPickup("08:30"), false);
      assert.equal(isEarlyMorningPickup("13:30"), false);
      assert.equal(isEarlyMorningPickup("18:00"), false);
    });

    it("safely handles invalid time strings", () => {
      assert.equal(isEarlyMorningPickup(""), false);
      assert.equal(isEarlyMorningPickup("invalid"), false);
      assert.equal(isEarlyMorningPickup("99:99"), false);
    });
  });

  describe("3. Form Validation & Excursion Presets", () => {
    it("validates that required fields are present and well-formed", () => {
      const valid = validateExcursionForm(
        "304",
        "Hans Gruber",
        "05:00",
        2,
        28000,
        15000,
        "+94 77 123 4567",
      );
      assert.equal(valid.isValid, true);
      assert.deepEqual(valid.errors, {});
    });

    it("detects missing room number and guest name", () => {
      const missing = validateExcursionForm("", "", "05:00", 2, 28000, 15000, "");
      assert.equal(missing.isValid, false);
      assert.ok(missing.errors.roomNumber);
      assert.ok(missing.errors.guestName);
    });

    it("detects invalid adult count (< 1)", () => {
      const invalidAdults = validateExcursionForm(
        "304",
        "Hans Gruber",
        "05:00",
        0,
        28000,
        15000,
        "",
      );
      assert.equal(invalidAdults.isValid, false);
      assert.ok(invalidAdults.errors.adultsCount);
    });

    it("detects invalid pickup time format", () => {
      const invalidTime = validateExcursionForm("304", "Hans Gruber", "5pm", 2, 28000, 15000, "");
      assert.equal(invalidTime.isValid, false);
      assert.ok(invalidTime.errors.pickupTime);
    });

    it("contains authentic Sri Lankan excursion presets", () => {
      assert.ok(EXCURSION_PRESETS.length >= 8);

      const yala = EXCURSION_PRESETS.find((p) => p.id === "YALA_SAFARI");
      assert.ok(yala);
      assert.equal(yala?.defaultPickupTime, "05:00");
      assert.equal(yala?.recommendedVehicle, "SAFARI_JEEP_4X4");
      assert.equal(yala?.parkPermitIncluded, true);

      const mirissa = EXCURSION_PRESETS.find((p) => p.id === "MIRISSA_WHALE_WATCHING");
      assert.ok(mirissa);
      assert.equal(mirissa?.defaultPickupTime, "05:30");

      const tea = EXCURSION_PRESETS.find((p) => p.id === "TEA_FACTORY_TRAIL");
      assert.ok(tea);
      assert.equal(tea?.recommendedVehicle, "PREMIUM_SEDAN");
    });
  });

  describe("4. React Static Rendering & Trilingual HIG Presentation", () => {
    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExcursionBookingModal, {
          isOpen: false,
          onClose: () => undefined,
          onConfirmBooking: (_p: ExcursionBookingPayload) => undefined,
        }),
      );
      assert.equal(html, "");
    });

    it("renders modal dialog in English with Early Morning Packed Breakfast alert", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExcursionBookingModal, {
          isOpen: true,
          initialRoomNumber: "304",
          initialGuestName: "Hans Gruber",
          lang: "en",
          onClose: () => undefined,
          onConfirmBooking: (_p: ExcursionBookingPayload) => undefined,
        }),
      );

      assert.ok(html.includes("Excursion &amp; Safari Desk Booking"));
      assert.ok(html.includes("Hans Gruber"));
      assert.ok(html.includes("304"));
      assert.ok(html.includes("Early Morning Departure Detected"));
      assert.ok(html.includes("Packed Breakfast Boxes"));
      assert.ok(html.includes("Toyota 4x4 Safari Jeep"));
      assert.ok(html.includes("Total Guest Bill"));
      assert.ok(html.includes("48,121.75 LKR"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders Sinhala localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExcursionBookingModal, {
          isOpen: true,
          lang: "si",
          onClose: () => undefined,
          onConfirmBooking: (_p: ExcursionBookingPayload) => undefined,
        }),
      );

      assert.ok(html.includes(EXCURSION_TRANSLATIONS.si.modalTitle));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.si.earlyMorningAlert));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.si.requestBreakfastBox));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.si.totalGuestBill));
    });

    it("renders Tamil localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExcursionBookingModal, {
          isOpen: true,
          lang: "ta",
          onClose: () => undefined,
          onConfirmBooking: (_p: ExcursionBookingPayload) => undefined,
        }),
      );

      assert.ok(html.includes(EXCURSION_TRANSLATIONS.ta.modalTitle));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.ta.earlyMorningAlert));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.ta.requestBreakfastBox));
      assert.ok(html.includes(EXCURSION_TRANSLATIONS.ta.totalGuestBill));
    });

    it("verifies exported types and constructs mock objects safely", () => {
      const dummyPreset: ExcursionPresetOption = {
        id: "WILPATTU_SAFARI",
        name: "Wilpattu Safari",
        defaultPickupTime: "05:00",
        defaultDurationHours: 6,
        defaultVendorFeeLkr: 30000,
        defaultHotelMarkupLkr: 18000,
        recommendedVehicle: "SAFARI_JEEP_4X4",
        parkPermitIncluded: true,
        destination: "Wilpattu Entrance",
      };
      assert.equal(dummyPreset.id, "WILPATTU_SAFARI");

      const dummyVehicle: ExcursionVehicleType = "MINI_COACH";
      assert.equal(dummyVehicle, "MINI_COACH");

      const dummyType: ExcursionType = "TEA_FACTORY_TRAIL";
      assert.equal(dummyType, "TEA_FACTORY_TRAIL");

      const dummyDietary: BreakfastDietaryType = "SRI_LANKAN";
      assert.equal(dummyDietary, "SRI_LANKAN");

      const dummyBreakfast: PackedBreakfastRequest = {
        requested: true,
        boxCount: 2,
        dietaryType: "SRI_LANKAN",
        readyTime: "04:30",
        specialInstructions: "Banana leaf wrap",
      };
      assert.equal(dummyBreakfast.requested, true);

      const dummyValidation: ExcursionFormValidationResult = {
        isValid: true,
        errors: {},
      };
      assert.equal(dummyValidation.isValid, true);

      const dummyTranslations: Partial<ExcursionModalTranslations> = {
        modalTitle: "Test Title",
      };
      assert.equal(dummyTranslations.modalTitle, "Test Title");

      const dummyProps: Partial<ExcursionBookingModalProps> = {
        isOpen: true,
      };
      assert.equal(dummyProps.isOpen, true);
    });
  });
});
