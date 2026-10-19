import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_FORECAST_RESERVATIONS,
  type DietaryFlag,
  type ForecastReservation,
  type MealPlanCode,
  MealPlanForecastCard,
  type MealPlanForecastCardProps,
  type MealSession,
  type MealSessionCount,
  addDaysToIso,
  aggregateDailyStayStats,
  compute7DayMealForecast,
  computeDailyMealForecast,
  computeSessionCovers,
  doesReservationIncludeMeal,
  formatDayHeader,
  formatDietaryBadge,
} from "../src/admin/frontdesk/MealPlanForecastCard.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_RESERVATION_HB: ForecastReservation = {
  reservationId: "res-hb-1",
  bookingReference: "KDY-HB-1",
  guestName: "Samantha Wickramasinghe",
  roomNumber: "101",
  mealPlan: "HB",
  adults: 2,
  children: 1,
  checkInDate: "2026-10-19",
  checkOutDate: "2026-10-22",
  driverAccompanying: true,
  driverMealsIncluded: true,
  dietaryFlags: ["HALAL"],
  dietaryNotes: "Halal meals requested",
};

const SAMPLE_RESERVATION_FB: ForecastReservation = {
  reservationId: "res-fb-2",
  bookingReference: "KDY-FB-2",
  guestName: "Dr. Rohitha Senaratne",
  roomNumber: "202",
  mealPlan: "FB",
  adults: 3,
  children: 2,
  checkInDate: "2026-10-18",
  checkOutDate: "2026-10-21",
  driverAccompanying: true,
  driverMealsIncluded: true,
  dietaryFlags: ["VEGETARIAN"],
};

const SAMPLE_RESERVATION_RO: ForecastReservation = {
  reservationId: "res-ro-3",
  bookingReference: "KDY-RO-3",
  guestName: "Nihal Jayawardena",
  roomNumber: "303",
  mealPlan: "RO",
  adults: 1,
  children: 0,
  checkInDate: "2026-10-19",
  checkOutDate: "2026-10-20",
};

describe("Daily Kitchen Meal-Plan Headcount Sheet (MealPlanForecastCard.tsx)", () => {
  describe("Date Utility (addDaysToIso)", () => {
    it("adds days accurately within the same month", () => {
      assert.strictEqual(addDaysToIso("2026-10-19", 1), "2026-10-20");
      assert.strictEqual(addDaysToIso("2026-10-19", 5), "2026-10-24");
    });

    it("handles month rollover accurately", () => {
      assert.strictEqual(addDaysToIso("2026-10-31", 1), "2026-11-01");
      assert.strictEqual(addDaysToIso("2026-12-31", 1), "2027-01-01");
    });

    it("handles negative days accurately", () => {
      assert.strictEqual(addDaysToIso("2026-10-19", -1), "2026-10-18");
    });
  });

  describe("Meal Inclusion Rules (doesReservationIncludeMeal)", () => {
    it("returns false if date is outside check-in/out window", () => {
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, "2026-10-17", "DINNER"),
        false,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, "2026-10-23", "BREAKFAST"),
        false,
      );
    });

    it("evaluates check-in day: no breakfast, dinner included for HB/FB/AI, lunch only for FB/AI", () => {
      const checkInDate = "2026-10-19";
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkInDate, "BREAKFAST"),
        false,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkInDate, "LUNCH"),
        false,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkInDate, "DINNER"),
        true,
      );

      // Full board receives lunch on check-in
      const resFbCheckIn: ForecastReservation = {
        ...SAMPLE_RESERVATION_FB,
        checkInDate: "2026-10-19",
      };
      assert.strictEqual(doesReservationIncludeMeal(resFbCheckIn, checkInDate, "LUNCH"), true);
      assert.strictEqual(doesReservationIncludeMeal(resFbCheckIn, checkInDate, "DINNER"), true);
    });

    it("evaluates check-out day: breakfast included for non-RO, no lunch or dinner", () => {
      const checkOutDate = "2026-10-22";
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkOutDate, "BREAKFAST"),
        true,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkOutDate, "LUNCH"),
        false,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, checkOutDate, "DINNER"),
        false,
      );

      // RO guest receives no breakfast on checkout
      const resRoCheckOut: ForecastReservation = {
        ...SAMPLE_RESERVATION_RO,
        checkOutDate: "2026-10-22",
      };
      assert.strictEqual(
        doesReservationIncludeMeal(resRoCheckOut, checkOutDate, "BREAKFAST"),
        false,
      );
    });

    it("evaluates mid-stay days: standard meal plan entitlements", () => {
      const midStayDate = "2026-10-20";
      // HB receives Breakfast and Dinner, but not Lunch
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, midStayDate, "BREAKFAST"),
        true,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, midStayDate, "LUNCH"),
        false,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_HB, midStayDate, "DINNER"),
        true,
      );

      // FB receives Breakfast, Lunch, and Dinner
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_FB, midStayDate, "BREAKFAST"),
        true,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_FB, midStayDate, "LUNCH"),
        true,
      );
      assert.strictEqual(
        doesReservationIncludeMeal(SAMPLE_RESERVATION_FB, midStayDate, "DINNER"),
        true,
      );

      // RO receives no meals
      const resRoMidStay: ForecastReservation = {
        ...SAMPLE_RESERVATION_RO,
        checkInDate: "2026-10-18",
        checkOutDate: "2026-10-22",
      };
      assert.strictEqual(doesReservationIncludeMeal(resRoMidStay, midStayDate, "BREAKFAST"), false);
      assert.strictEqual(doesReservationIncludeMeal(resRoMidStay, midStayDate, "LUNCH"), false);
      assert.strictEqual(doesReservationIncludeMeal(resRoMidStay, midStayDate, "DINNER"), false);
    });
  });

  describe("Day Header Formatter (formatDayHeader)", () => {
    it("returns 'Today' for identical dates", () => {
      assert.strictEqual(formatDayHeader("2026-10-19", "2026-10-19"), "Today");
    });

    it("returns 'Tomorrow' for the next day", () => {
      assert.strictEqual(formatDayHeader("2026-10-20", "2026-10-19"), "Tomorrow");
    });

    it("returns formatted day and date string for subsequent days", () => {
      const res = formatDayHeader("2026-10-21", "2026-10-19");
      assert.match(res, /Wed, 21 Oct/);
    });
  });

  describe("Session Covers Calculator (computeSessionCovers)", () => {
    it("tallies adults, children, and driver meals for active reservations", () => {
      const list = [SAMPLE_RESERVATION_HB, SAMPLE_RESERVATION_FB];
      // On 2026-10-19:
      // HB is on check-in day: Dinner only (2 adults, 1 child, 1 driver)
      // FB is on mid-stay day: Breakfast, Lunch, Dinner (3 adults, 2 children, 1 driver)
      const dinner = computeSessionCovers(list, "2026-10-19", "DINNER");
      assert.strictEqual(dinner.adults, 5); // 2 + 3
      assert.strictEqual(dinner.children, 3); // 1 + 2
      assert.strictEqual(dinner.drivers, 2); // 1 + 1
      assert.strictEqual(dinner.totalCovers, 10);

      const lunch = computeSessionCovers(list, "2026-10-19", "LUNCH");
      assert.strictEqual(lunch.adults, 3); // FB only
      assert.strictEqual(lunch.children, 2);
      assert.strictEqual(lunch.drivers, 1);
      assert.strictEqual(lunch.totalCovers, 6);
    });
  });

  describe("Daily Stay Stats Aggregator (aggregateDailyStayStats)", () => {
    it("aggregates contributing rooms, meal plan counts, and dietary flags", () => {
      const list = [SAMPLE_RESERVATION_HB, SAMPLE_RESERVATION_FB, SAMPLE_RESERVATION_RO];
      const stats = aggregateDailyStayStats(list, "2026-10-19");

      assert.strictEqual(stats.contributing.length, 3);
      assert.strictEqual(stats.mealPlans.HB, 3); // 2 adults + 1 child
      assert.strictEqual(stats.mealPlans.FB, 5); // 3 adults + 2 children
      assert.strictEqual(stats.mealPlans.RO, 1); // 1 adult
      assert.strictEqual(stats.dietary.HALAL, 2); // 2 adults
      assert.strictEqual(stats.dietary.VEGETARIAN, 3); // 3 adults
    });
  });

  describe("Daily & 7-Day Forecast Computation", () => {
    it("computes full daily forecast structure with sessions and totals", () => {
      const forecast = computeDailyMealForecast(
        [SAMPLE_RESERVATION_HB, SAMPLE_RESERVATION_FB],
        "2026-10-19",
        "2026-10-19",
      );

      assert.strictEqual(forecast.date, "2026-10-19");
      assert.strictEqual(forecast.isToday, true);
      assert.strictEqual(forecast.dayName, "Today");
      assert.strictEqual(forecast.breakfast.totalCovers, 6); // FB only (3 adults + 2 children + 1 driver)
      assert.strictEqual(forecast.lunch.totalCovers, 6); // FB only
      assert.strictEqual(forecast.dinner.totalCovers, 10); // FB (6) + HB (4)
      assert.strictEqual(forecast.totalDailyCovers, 22);
    });

    it("computes 7-day forecast array covering 7 consecutive dates", () => {
      const forecast7 = compute7DayMealForecast(DEFAULT_FORECAST_RESERVATIONS, "2026-10-19");

      assert.strictEqual(forecast7.length, 7);
      assert.strictEqual(forecast7[0]?.date, "2026-10-19");
      assert.strictEqual(forecast7[1]?.date, "2026-10-20");
      assert.strictEqual(forecast7[6]?.date, "2026-10-25");
      assert.ok((forecast7[0]?.totalDailyCovers ?? 0) > 0);
    });
  });

  describe("Dietary Badge Formatter (formatDietaryBadge)", () => {
    it("maps all dietary flags to emoji and descriptive label", () => {
      const flags: DietaryFlag[] = [
        "VEGETARIAN",
        "VEGAN",
        "HALAL",
        "JAIN",
        "GLUTEN_FREE",
        "NUT_ALLERGY",
        "SEAFOOD_ALLERGY",
      ];
      for (const flag of flags) {
        const badge = formatDietaryBadge(flag);
        assert.ok(badge.label.length > 0);
        assert.ok(badge.emoji.length > 0);
      }
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies MealPlanCode and MealSession unions", () => {
      const plans: MealPlanCode[] = ["RO", "BB", "HB", "FB", "AI"];
      const sessions: MealSession[] = ["BREAKFAST", "LUNCH", "DINNER"];
      assert.strictEqual(plans.length, 5);
      assert.strictEqual(sessions.length, 3);
    });

    it("verifies DayMealForecast and MealSessionCount contract shapes", () => {
      const sessionCount: MealSessionCount = {
        session: "BREAKFAST",
        adults: 10,
        children: 2,
        drivers: 1,
        totalCovers: 13,
      };
      assert.strictEqual(sessionCount.totalCovers, 13);
    });
  });

  describe("Static Markup Rendering (MealPlanForecastCard)", () => {
    it("renders default forecast card with sample reservations and kitchen sheet headers", () => {
      const props: MealPlanForecastCardProps = {
        hotelName: "Earl's Regency Kandy",
        selectedDate: "2026-10-19",
        restaurantCapacity: 120,
        onSelectDate: noop,
        onPrintForecast: noop,
      };

      const html = renderToStaticMarkup(React.createElement(MealPlanForecastCard, props));

      assert.match(html, /Executive Chef Meal-Plan Headcount Forecast/);
      assert.match(html, /Earl&#x27;s Regency Kandy|Earl's Regency Kandy/);
      assert.match(html, /Print Kitchen Dispatch/);
      assert.match(html, /Breakfast Buffet/);
      assert.match(html, /Lunch Buffet \/ Set/);
      assert.match(html, /Dinner Buffet \/ Gala/);
      assert.match(html, /Statutory Allergen &amp; Special Diet Headcount/);
      assert.match(html, /In-House &amp; Arriving Guests Meal Manifest/);
      assert.match(html, /Samantha Wickramasinghe/);
      assert.match(html, /KDY-RES-101/);
      assert.match(html, /Driver Rice &amp; Curry/);
    });

    it("renders empty manifest state cleanly when reservations array is empty", () => {
      const props: MealPlanForecastCardProps = {
        reservations: [],
        selectedDate: "2026-10-19",
      };

      const html = renderToStaticMarkup(React.createElement(MealPlanForecastCard, props));

      assert.match(html, /No active reservations found for this date\./);
      assert.match(html, /0 covers/);
    });
  });
});
