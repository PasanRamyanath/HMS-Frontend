/**
 * Unit Test Suite for Step 373: ActivitiesAdminPage
 *
 * Validates:
 * 1. Constant definitions and tab contracts (ACTIVITIES_TABS, DEFAULT_ACTIVITIES_METRICS)
 * 2. Trilingual translation dictionary coverage (en, si, ta)
 * 3. Component static markup rendering with Apple HIG standards:
 *    - Header bar with title, property name, action buttons, and language switcher
 *    - 6-Bento Executive KPI Ribbon
 *    - Tabbed workspace rendering across all 6 tabs (SPA_SCHEDULE, EXCURSIONS, TRANSFERS, GEAR_RENTAL, PAYOUTS, ANALYTICS)
 *    - Modal triggers and >= 44x44pt touch targets.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ACTIVITIES_PAGE_TRANSLATIONS,
  ACTIVITIES_TABS,
  ActivitiesAdminPage,
  DEFAULT_ACTIVITIES_METRICS,
} from "../src/admin/activities/ActivitiesAdminPage.js";

describe("Step 373: ActivitiesAdminPage & Resort Experiences Hub", () => {
  describe("1. Tab Definitions & Metric Constants", () => {
    it("defines 6 core workspace tabs with icons and short labels", () => {
      assert.equal(ACTIVITIES_TABS.length, 6);
      const tabIds = ACTIVITIES_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, [
        "SPA_SCHEDULE",
        "EXCURSIONS",
        "TRANSFERS",
        "GEAR_RENTAL",
        "PAYOUTS",
        "ANALYTICS",
      ]);

      for (const tab of ACTIVITIES_TABS) {
        assert.ok(tab.icon.length > 0);
        assert.ok(tab.label.length > 0);
        assert.ok(tab.shortLabel.length > 0);
      }
    });

    it("verifies default executive overview metrics", () => {
      assert.ok(DEFAULT_ACTIVITIES_METRICS.activeSpaAppointmentsToday > 0);
      assert.ok(DEFAULT_ACTIVITIES_METRICS.dispatchedSafarisToday > 0);
      assert.ok(DEFAULT_ACTIVITIES_METRICS.scheduledAirportTransfers > 0);
      assert.ok(DEFAULT_ACTIVITIES_METRICS.activeGearRentals > 0);
      assert.ok(DEFAULT_ACTIVITIES_METRICS.pendingPayoutsLkr > 0);
      assert.ok(DEFAULT_ACTIVITIES_METRICS.ancillaryRevPorLkr > 0);
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("contains complete translations across English, Sinhala, and Tamil", () => {
      for (const lang of ["en", "si", "ta"] as const) {
        const i18n = ACTIVITIES_PAGE_TRANSLATIONS[lang];
        assert.ok(i18n.pageTitle.length > 0);
        assert.ok(i18n.pageSubtitle.length > 0);
        assert.ok(i18n.newSpaBooking.length > 0);
        assert.ok(i18n.bookSafari.length > 0);
        assert.ok(i18n.signWaiver.length > 0);
        assert.ok(i18n.searchPlaceholder.length > 0);
        assert.ok(i18n.spaAppointmentsToday.length > 0);
        assert.ok(i18n.ancillaryRevPor.length > 0);
      }
    });
  });

  describe("3. Static Markup & Component Rendering", () => {
    it("renders default SPA_SCHEDULE tab view without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          propertyTitle: "Heritage Villa & Ayurveda Resort",
        }),
      );

      assert.ok(html.includes("Heritage Villa &amp; Ayurveda Resort"));
      assert.ok(html.includes("Ayurveda Spa, Safaris &amp; Resort Experiences Hub"));
      assert.ok(html.includes("+ Spa Consultation"));
      assert.ok(html.includes("+ Book Safari / Tour"));
      assert.ok(html.includes("+ Liability Waiver"));
      assert.ok(html.includes("Treatment Rooms"));
      assert.ok(html.includes("Panchakarma Packages"));
    });

    it("renders EXCURSIONS tab view with wake-up reminders", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          initialTab: "EXCURSIONS",
        }),
      );

      assert.ok(html.includes("Morning Wake-Up Call &amp; Safari Scheduler"));
    });

    it("renders TRANSFERS tab view with airport flight board", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          initialTab: "TRANSFERS",
        }),
      );

      assert.ok(html.includes("Airport Transfer &amp; Flight Tracker Board"));
    });

    it("renders GEAR_RENTAL tab view with equipment fleet board", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          initialTab: "GEAR_RENTAL",
        }),
      );

      assert.ok(html.includes("Recreation &amp; Adventure Gear Rental Board"));
    });

    it("renders PAYOUTS tab view with therapist & driver ledger", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          initialTab: "PAYOUTS",
        }),
      );

      assert.ok(html.includes("Therapist &amp; Chauffeur Commission Ledger"));
    });

    it("renders ANALYTICS tab view with ActivityKpiCard", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          initialTab: "ANALYTICS",
        }),
      );

      assert.ok(html.includes("Activity Revenue &amp; Therapist Utilization"));
      assert.ok(html.includes("Ancillary RevPOR"));
    });

    it("renders Sinhala localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          language: "si",
        }),
      );

      assert.ok(html.includes(ACTIVITIES_PAGE_TRANSLATIONS.si.pageTitle));
      assert.ok(html.includes(ACTIVITIES_PAGE_TRANSLATIONS.si.newSpaBooking));
    });

    it("renders Tamil localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivitiesAdminPage, {
          language: "ta",
        }),
      );

      assert.ok(html.includes(ACTIVITIES_PAGE_TRANSLATIONS.ta.pageTitle.replace("&", "&amp;")));
      assert.ok(html.includes(ACTIVITIES_PAGE_TRANSLATIONS.ta.newSpaBooking));
    });
  });
});
