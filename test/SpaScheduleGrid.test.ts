import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SPA_APPOINTMENTS,
  DEFAULT_SPA_ROOMS,
  DEFAULT_SPA_THERAPISTS,
  OPERATING_HOURS,
  SPA_GRID_TRANSLATIONS,
  type SpaAppointment,
  type SpaAppointmentStatus,
  type SpaDayKpis,
  type SpaFolioPostSummary,
  type SpaGridTranslations,
  type SpaResourceViewMode,
  SpaScheduleGrid,
  type SpaScheduleGridProps,
  type SpaTherapist,
  type SpaTreatmentRoom,
  calculateSpaSlotFinancials,
  computeSpaDayKpis,
} from "../src/admin/activities/index.js";

const noop = () => undefined;

describe("Step 354: SpaScheduleGrid — Interactive Spa Therapist & Treatment Room Daily Schedule Grid", () => {
  describe("1. Pure Financial Math & 4-Stage Compounding Taxes", () => {
    it("computes accurate 4-stage compounding taxes for 1-click room folio posting", () => {
      const sampleApt: SpaAppointment = DEFAULT_SPA_APPOINTMENTS[0] as SpaAppointment;
      // Price is 16,500 LKR
      assert.strictEqual(sampleApt.priceLkr, 16500);

      const summary: SpaFolioPostSummary = calculateSpaSlotFinancials(sampleApt);

      assert.strictEqual(summary.appointmentId, sampleApt.id);
      assert.strictEqual(summary.guestName, "Lady Sarah Jenkins");
      assert.strictEqual(summary.roomNumber, "VILLA-104");
      assert.strictEqual(summary.baseSupplyLkr, 16500);

      // Stage 1: 10% Service Charge
      assert.strictEqual(summary.serviceChargeLkr, 1650);
      assert.strictEqual(summary.subtotalAfterScLkr, 18150);

      // Stage 2: 1% TDL
      assert.strictEqual(summary.tdlLkr, 181.5);

      // Stage 3: 2.5% SSCL
      assert.strictEqual(summary.ssclLkr, 453.75);

      // Stage 4: 18% VAT on (subtotalAfterSc + TDL + SSCL) = 18150 + 181.5 + 453.75 = 18785.25 * 0.18 = 3381.35
      assert.strictEqual(summary.vatLkr, 3381.35);

      // Grand Total = 18785.25 + 3381.35 = 22166.60 LKR
      assert.strictEqual(summary.grandTotalLkr, 22166.6);
    });

    it("aggregates daily spa KPI metrics accurately", () => {
      const kpis: SpaDayKpis = computeSpaDayKpis(DEFAULT_SPA_APPOINTMENTS);

      // 4 seed appointments: 2 CONFIRMED, 1 IN_PROGRESS, 1 COMPLETED
      assert.strictEqual(kpis.totalAppointments, 4);
      assert.strictEqual(kpis.confirmedCount, 2);
      assert.strictEqual(kpis.inProgressCount, 1);
      assert.strictEqual(kpis.completedCount, 1);

      // Total revenue = 16,500 + 7,500 + 24,500 + 9,500 = 58,000 LKR
      assert.strictEqual(kpis.totalRevenueLkr, 58000);

      // 3 unposted appointments = 16,500 + 7,500 + 24,500 = 48,500 LKR
      assert.strictEqual(kpis.totalUnpostedRevenueLkr, 48500);
    });
  });

  describe("2. Static Markup & Component Rendering", () => {
    it("renders grid with default treatment rooms and appointments", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpaScheduleGrid, {
          date: "2026-10-25",
          onDateChange: noop,
          onSelectAppointment: noop,
          onPostToRoomFolio: noop,
        }),
      );

      assert.ok(html.includes("Ayurveda Spa &amp; Treatment Schedule"));
      assert.ok(html.includes("Shirodhara Suite 1"));
      assert.ok(html.includes("Herbal Steam Bath Pavilion"));
      assert.ok(html.includes("Lady Sarah Jenkins"));
      assert.ok(html.includes("VILLA-104"));
      assert.ok(html.includes("Cleanup Buffer (15m)"));
    });

    it("renders trilingual localizations in Sinhala and Tamil", () => {
      const siHtml = renderToStaticMarkup(
        React.createElement(SpaScheduleGrid, {
          language: "si",
          onDateChange: noop,
        }),
      );
      assert.ok(siHtml.includes(SPA_GRID_TRANSLATIONS.si.title));
      assert.ok(siHtml.includes("ප්රතිකාර කාමර"));

      const taHtml = renderToStaticMarkup(
        React.createElement(SpaScheduleGrid, {
          language: "ta",
          onDateChange: noop,
        }),
      );
      assert.ok(taHtml.includes(SPA_GRID_TRANSLATIONS.ta.title));
      assert.ok(taHtml.includes("சிகிச்சை அறைகள்"));
    });
  });

  describe("3. Type Contracts and Fixture Coverage", () => {
    it("exposes valid and typed domain definitions", () => {
      const rooms: readonly SpaTreatmentRoom[] = DEFAULT_SPA_ROOMS;
      assert.ok(rooms.length >= 5);

      const therapists: readonly SpaTherapist[] = DEFAULT_SPA_THERAPISTS;
      assert.ok(therapists.length >= 4);

      const hours: readonly number[] = OPERATING_HOURS;
      assert.strictEqual(hours[0], 8);
      assert.strictEqual(hours[hours.length - 1], 20);

      const statuses: readonly SpaAppointmentStatus[] = [
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
      ];
      assert.strictEqual(statuses.length, 4);

      const viewModes: readonly SpaResourceViewMode[] = ["ROOM_VIEW", "THERAPIST_VIEW"];
      assert.strictEqual(viewModes.length, 2);

      const enTrans: SpaGridTranslations = SPA_GRID_TRANSLATIONS.en;
      assert.ok(enTrans.title.includes("Ayurveda"));

      const props: SpaScheduleGridProps = {
        date: "2026-10-25",
        rooms,
        therapists,
        appointments: DEFAULT_SPA_APPOINTMENTS,
        language: "en",
        onDateChange: noop,
        onSelectAppointment: noop,
        onSelectEmptySlot: noop,
        onPostToRoomFolio: noop,
      };
      assert.ok(props.rooms?.length);
    });
  });
});
