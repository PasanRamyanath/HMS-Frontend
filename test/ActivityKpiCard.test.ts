/**
 * Unit Test Suite for Step 371: ActivityKpiCard
 *
 * Validates:
 * 1. Pure calculation logic:
 *    - computeOverallSpaRoomUtilization
 *    - computeOverallTherapistUtilization
 *    - computePerformanceRating
 *    - simulateAncillaryRevPor
 * 2. Preset data integrity and domain invariants:
 *    - DEFAULT_SPA_ROOMS, DEFAULT_THERAPISTS, DEFAULT_EXCURSIONS, DEFAULT_REVPOR_DATA
 * 3. Trilingual translations (en, si, ta)
 * 4. Component rendering with Apple HIG and Liquid Glass classes via React 19 renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ACTIVITY_KPI_TRANSLATIONS,
  ActivityKpiCard,
  DEFAULT_EXCURSIONS,
  DEFAULT_REVPOR_DATA,
  DEFAULT_SPA_ROOM_UTILIZATIONS,
  DEFAULT_THERAPISTS,
  type SpaRoomUtilizationMetric,
  type TherapistUtilizationMetric,
  computeOverallSpaRoomUtilization,
  computeOverallTherapistUtilization,
  computePerformanceRating,
  simulateAncillaryRevPor,
} from "../src/admin/activities/ActivityKpiCard.js";

describe("Step 371: ActivityKpiCard & Ancillary RevPOR Engine", () => {
  describe("1. Pure Calculation Helpers", () => {
    it("computes overall spa room utilization accurately", () => {
      assert.equal(computeOverallSpaRoomUtilization([]), 0);

      const zeroOperatingRooms: SpaRoomUtilizationMetric[] = [
        {
          roomId: "R1",
          roomName: "Test Room",
          category: "Massage",
          operatingHours: 0,
          bookedHours: 0,
          utilizationPct: 0,
          treatmentsCount: 0,
          revenueLkr: 0,
        },
      ];
      assert.equal(computeOverallSpaRoomUtilization(zeroOperatingRooms), 0);

      // Total operating: 10 + 10 = 20, Total booked: 7 + 8 = 15 -> 75%
      const sampleRooms: SpaRoomUtilizationMetric[] = [
        {
          roomId: "R1",
          roomName: "Room A",
          category: "Steam",
          operatingHours: 10,
          bookedHours: 7,
          utilizationPct: 70,
          treatmentsCount: 5,
          revenueLkr: 50000,
        },
        {
          roomId: "R2",
          roomName: "Room B",
          category: "Shirodhara",
          operatingHours: 10,
          bookedHours: 8,
          utilizationPct: 80,
          treatmentsCount: 6,
          revenueLkr: 60000,
        },
      ];
      assert.equal(computeOverallSpaRoomUtilization(sampleRooms), 75.0);
    });

    it("computes overall therapist utilization accurately", () => {
      assert.equal(computeOverallTherapistUtilization([]), 0);

      const sampleTherapists: TherapistUtilizationMetric[] = [
        {
          therapistId: "T1",
          therapistName: "Dr. Silva",
          role: "DOCTOR_VAIDYA",
          scheduledHours: 8,
          activeTreatmentHours: 6,
          utilizationPct: 75,
          treatmentsCount: 6,
          earnedIncentiveLkr: 15000,
          guestRatingAvg: 4.9,
        },
        {
          therapistId: "T2",
          therapistName: "Therapist Perera",
          role: "THERAPIST",
          scheduledHours: 8,
          activeTreatmentHours: 6,
          utilizationPct: 75,
          treatmentsCount: 5,
          earnedIncentiveLkr: 10000,
          guestRatingAvg: 4.8,
        },
      ];
      // (6 + 6) / (8 + 8) = 12 / 16 = 75%
      assert.equal(computeOverallTherapistUtilization(sampleTherapists), 75.0);
    });

    it("computes RevPOR performance ratings with threshold boundaries", () => {
      assert.equal(computePerformanceRating(100, 0), "ON_TARGET");
      assert.equal(computePerformanceRating(7000, 6500), "ABOVE_TARGET"); // +7.69% >= 2%
      assert.equal(computePerformanceRating(6000, 6500), "BELOW_TARGET"); // -7.69% <= -2%
      assert.equal(computePerformanceRating(6510, 6500), "ON_TARGET"); // +0.15% within +/- 2%
    });

    it("simulates interactive Ancillary RevPOR sensitivity accurately", () => {
      const result = simulateAncillaryRevPor(DEFAULT_REVPOR_DATA, 42, 10, 5);
      assert.ok(result.simulatedRevPorLkr > 0);
      assert.ok(result.simulatedRevPorUsd > 0);
      assert.ok(typeof result.varianceFromBasePct === "number");
      assert.ok(result.simulatedNetRevenueLkr > 0);

      // Testing boundary where occupied rooms is 0 (should default safe room floor to 1)
      const zeroRoomsSim = simulateAncillaryRevPor(DEFAULT_REVPOR_DATA, 0, 0, 0);
      assert.ok(zeroRoomsSim.simulatedRevPorLkr > 0);
    });
  });

  describe("2. Preset Data & Domain Integrity", () => {
    it("verifies default spa rooms data contracts", () => {
      assert.ok(DEFAULT_SPA_ROOM_UTILIZATIONS.length >= 4);
      for (const room of DEFAULT_SPA_ROOM_UTILIZATIONS) {
        assert.ok(room.operatingHours > 0);
        assert.ok(room.bookedHours >= 0 && room.bookedHours <= room.operatingHours);
        assert.ok(room.utilizationPct >= 0 && room.utilizationPct <= 100);
        assert.ok(room.revenueLkr > 0);
      }
    });

    it("verifies default therapists data contracts", () => {
      assert.ok(DEFAULT_THERAPISTS.length >= 4);
      for (const t of DEFAULT_THERAPISTS) {
        assert.ok(t.scheduledHours > 0);
        assert.ok(t.activeTreatmentHours <= t.scheduledHours);
        assert.ok(t.guestRatingAvg >= 1 && t.guestRatingAvg <= 5);
        assert.ok(t.earnedIncentiveLkr > 0);
      }
    });

    it("verifies default excursions ranking and markup percentages", () => {
      assert.ok(DEFAULT_EXCURSIONS.length >= 5);
      let totalSharePct = 0;
      for (const ex of DEFAULT_EXCURSIONS) {
        assert.ok(ex.grossRevenueLkr > ex.vendorPayoutLkr);
        assert.equal(ex.netHotelMarkupLkr, ex.grossRevenueLkr - ex.vendorPayoutLkr);
        assert.ok(ex.markupMarginPct >= 20 && ex.markupMarginPct <= 50);
        totalSharePct += ex.shareOfTotalPct;
      }
      // Share of total should sum to approximately 100%
      assert.ok(totalSharePct >= 99 && totalSharePct <= 101);
    });

    it("verifies default RevPOR summary consistency", () => {
      assert.ok(DEFAULT_REVPOR_DATA.occupiedRoomNights > 0);
      assert.ok(DEFAULT_REVPOR_DATA.occupancyRatePct <= 100);
      assert.ok(DEFAULT_REVPOR_DATA.ancillaryRevPorLkr > 0);
      assert.equal(
        DEFAULT_REVPOR_DATA.performanceRating,
        computePerformanceRating(
          DEFAULT_REVPOR_DATA.ancillaryRevPorLkr,
          DEFAULT_REVPOR_DATA.targetAncillaryRevPorLkr,
        ),
      );
    });
  });

  describe("3. Trilingual Localization Contracts", () => {
    it("ensures all languages have full dictionary entries", () => {
      for (const lang of ["en", "si", "ta"] as const) {
        const dict = ACTIVITY_KPI_TRANSLATIONS[lang];
        assert.ok(dict.title.length > 0);
        assert.ok(dict.subtitle.length > 0);
        assert.ok(dict.tabOverview.length > 0);
        assert.ok(dict.tabSpa.length > 0);
        assert.ok(dict.tabExcursions.length > 0);
        assert.ok(dict.tabSimulator.length > 0);
        assert.ok(dict.ancillaryRevPor.length > 0);
        assert.ok(dict.spaRoomUtil.length > 0);
        assert.ok(dict.therapistUtil.length > 0);
      }
    });
  });

  describe("4. Static Markup Rendering & Apple HIG Compliance", () => {
    it("renders ActivityKpiCard with default props without crashing", () => {
      const html = renderToStaticMarkup(React.createElement(ActivityKpiCard));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("Activity Revenue &amp; Therapist Utilization"));
      assert.ok(html.includes("Ancillary RevPOR"));
      assert.ok(html.includes("Mahaweli Suite") === false); // Overview tab is default
    });

    it("renders Sinhala localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityKpiCard, { initialLanguage: "si" }),
      );
      assert.ok(html.includes(ACTIVITY_KPI_TRANSLATIONS.si.title));
      assert.ok(html.includes(ACTIVITY_KPI_TRANSLATIONS.si.tabOverview));
    });

    it("renders Tamil localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityKpiCard, { initialLanguage: "ta" }),
      );
      assert.ok(html.includes(ACTIVITY_KPI_TRANSLATIONS.ta.title.replace("&", "&amp;")));
      assert.ok(html.includes(ACTIVITY_KPI_TRANSLATIONS.ta.tabOverview));
    });

    it("renders export button and touch targets with >= 44px min-height", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityKpiCard, {
          onExportReport: () => {
            /* no-op handler for test */
          },
        }),
      );
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes(ACTIVITY_KPI_TRANSLATIONS.en.exportReport));
    });
  });
});
