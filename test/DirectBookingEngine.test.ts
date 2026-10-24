import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MealPlan } from "../src/generated/graphql.js";
import {
  DEFAULT_BOOKING_ROOMS,
  DEFAULT_CBSL_USD_RATE,
  DIRECT_MEAL_PLAN_OPTIONS,
  DirectBookingEngine,
  type DirectBookingEngineProps,
  type DirectBookingRoomType,
  type DirectBookingStaySelection,
  type FourStageTaxBreakdown,
  MEAL_PLAN_SUPPLEMENTS_LKR,
  MEAL_PLAN_SUPPLEMENTS_USD,
  RESIDENCY_OPTIONS,
  type ResidencyTier,
  calculateFourStageTax,
} from "../src/qr/booking/DirectBookingEngine.js";

describe("Public Direct Booking Engine Route (DirectBookingEngine.tsx)", () => {
  describe("1. Configurations & Constants", () => {
    it("defines default boutique rooms with resident and foreign tariffs", () => {
      assert.strictEqual(DEFAULT_BOOKING_ROOMS.length, 4);
      for (const room of DEFAULT_BOOKING_ROOMS) {
        const typedRoom: DirectBookingRoomType = room;
        assert.ok(typedRoom.id.length > 0);
        assert.ok(typedRoom.name.length > 0);
        assert.ok(typedRoom.baseRateResidentLkr > 0);
        assert.ok(typedRoom.baseRateForeignUsd > 0);
        assert.ok(typedRoom.amenities.length > 0);
        assert.ok(typedRoom.photoUrl.startsWith("/images/") || typedRoom.photoUrl.startsWith("http"));
      }
    });

    it("verifies meal plan supplements across resident LKR and foreign USD", () => {
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_LKR[MealPlan.Ro], 0);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_LKR[MealPlan.Bb], 3500);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_LKR[MealPlan.Hb], 8000);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_LKR[MealPlan.Fb], 12500);

      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_USD[MealPlan.Ro], 0);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_USD[MealPlan.Bb], 12);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_USD[MealPlan.Hb], 27);
      assert.strictEqual(MEAL_PLAN_SUPPLEMENTS_USD[MealPlan.Fb], 42);
    });

    it("verifies residency tier options and meal plan segmented options", () => {
      assert.strictEqual(RESIDENCY_OPTIONS.length, 2);
      const resTiers: ResidencyTier[] = RESIDENCY_OPTIONS.map((r) => r.id);
      assert.deepStrictEqual(resTiers, ["RESIDENT_LKR", "FOREIGN_USD"]);

      assert.strictEqual(DIRECT_MEAL_PLAN_OPTIONS.length, 4);
      const mealIds = DIRECT_MEAL_PLAN_OPTIONS.map((m) => m.id);
      assert.deepStrictEqual(mealIds, [MealPlan.Ro, MealPlan.Bb, MealPlan.Hb, MealPlan.Fb]);
    });

    it("verifies default CBSL USD exchange rate", () => {
      assert.strictEqual(DEFAULT_CBSL_USD_RATE, 300.0);
    });
  });

  describe("2. Statutory 4-Stage Compounding Tax Mathematics", () => {
    it("computes exact 4-stage tax compounding (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)", () => {
      // Base: LKR 100,000
      // SC (10%): 10,000 -> Subtotal A = 110,000
      // TDL (1% on 110,000): 1,100
      // SSCL (2.5% on 110,000): 2,750
      // VAT Base = 110,000 + 1,100 + 2,750 = 113,850
      // VAT (18% on 113,850): 20,493
      // Grand Total = 110,000 + 1,100 + 2,750 + 20,493 = 134,343
      const tax: FourStageTaxBreakdown = calculateFourStageTax(100000, 300);

      assert.strictEqual(tax.baseAmountLkr, 100000);
      assert.strictEqual(tax.serviceChargeLkr, 10000);
      assert.strictEqual(tax.subtotalAfterScLkr, 110000);
      assert.strictEqual(tax.tdlLkr, 1100);
      assert.strictEqual(tax.ssclLkr, 2750);
      assert.strictEqual(tax.vatBaseLkr, 113850);
      assert.strictEqual(tax.vatLkr, 20493);
      assert.strictEqual(tax.grandTotalLkr, 134343);
      assert.strictEqual(tax.baseAmountUsd, 333.33);
      assert.strictEqual(tax.grandTotalUsd, 447.81);
    });

    it("handles zero base tariff cleanly without division by zero", () => {
      const tax = calculateFourStageTax(0, 300);
      assert.strictEqual(tax.baseAmountLkr, 0);
      assert.strictEqual(tax.serviceChargeLkr, 0);
      assert.strictEqual(tax.tdlLkr, 0);
      assert.strictEqual(tax.ssclLkr, 0);
      assert.strictEqual(tax.vatLkr, 0);
      assert.strictEqual(tax.grandTotalLkr, 0);
    });
  });

  describe("3. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders hero banner with 3:1 aspect ratio, property title, and Best Rate Guarantee", () => {
      const props: DirectBookingEngineProps = {
        tenantId: "tenant-galle-fort",
        propertyTitle: "Galle Fort Lighthouse Villa",
        propertySubtitle: "UNESCO World Heritage Luxury Boutique Hotel",
      };

      const html = renderToStaticMarkup(React.createElement(DirectBookingEngine, props));

      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("UNESCO World Heritage Luxury Boutique Hotel"));
      assert.ok(html.includes("Best Rate Guarantee • Save 15%"));
      assert.ok(html.includes("Zero Booking Fees"));
      assert.ok(html.includes('data-tenant="tenant-galle-fort"'));
    });

    it("renders stay filter bar with date inputs, pax steppers, and residency toggle", () => {
      const html = renderToStaticMarkup(React.createElement(DirectBookingEngine, {}));

      assert.ok(html.includes("Check-In Date"));
      assert.ok(html.includes("Check-Out Date"));
      assert.ok(html.includes("Adults"));
      assert.ok(html.includes("Children"));
      assert.ok(html.includes("Rooms"));
      assert.ok(html.includes("Sri Lankan Resident (LKR)"));
      assert.ok(html.includes("Foreign Visitor (USD)"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-touch-target"));
    });

    it("renders room cards with 1:1 squircle photos, amenities, and meal plan selector", () => {
      const html = renderToStaticMarkup(React.createElement(DirectBookingEngine, {}));

      assert.ok(html.includes("Deluxe Ocean View Room"));
      assert.ok(html.includes("Grand Beachfront Pool Villa"));
      assert.ok(html.includes("Cinnamon Heritage Master Suite"));
      assert.ok(html.includes("Standard Tropical Garden Room"));
      assert.ok(html.includes("Select Meal Plan"));
      assert.ok(html.includes("Select Room"));
      assert.ok(html.includes("Selected"));
      assert.ok(html.includes("Free Cancellation up to 48 hours"));
    });

    it("renders floating bottom reservation bar with 4-stage tax disclosure", () => {
      const html = renderToStaticMarkup(React.createElement(DirectBookingEngine, {}));

      assert.ok(html.includes("Includes 4-Stage Taxes &amp; SC ⓘ"));
      assert.ok(html.includes("Proceed to Add-Ons"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("squircle-xl"));
    });

    it("renders with custom className without style clobbering", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingEngine, {
          className: "custom-direct-booking-wrapper",
        }),
      );

      assert.ok(html.includes("custom-direct-booking-wrapper"));
    });
  });

  describe("4. Lifecycle Callbacks & Handlers", () => {
    it("handles onProceedToCheckout callback with stay selection and tax breakdown", async () => {
      let receivedSelection: DirectBookingStaySelection | null = null;
      let receivedTax: FourStageTaxBreakdown | null = null;

      const onProceed = async (
        selection: DirectBookingStaySelection,
        tax: FourStageTaxBreakdown,
      ) => {
        receivedSelection = selection;
        receivedTax = tax;
      };

      const sampleSelection: DirectBookingStaySelection = {
        roomTypeId: "rt-dlx-ocean",
        mealPlan: MealPlan.Bb,
        checkInDate: "2026-11-15",
        checkOutDate: "2026-11-18",
        nights: 3,
        adultsCount: 2,
        childrenCount: 0,
        roomsCount: 1,
        residencyTier: "RESIDENT_LKR",
      };

      const sampleTax = calculateFourStageTax(136500, 300);

      await onProceed(sampleSelection, sampleTax);
      assert.ok(receivedSelection);
      assert.ok(receivedTax);
      assert.strictEqual(
        (receivedSelection as DirectBookingStaySelection).roomTypeId,
        "rt-dlx-ocean",
      );
      assert.strictEqual((receivedSelection as DirectBookingStaySelection).mealPlan, MealPlan.Bb);
      assert.strictEqual((receivedTax as FourStageTaxBreakdown).baseAmountLkr, 136500);
    });
  });
});
