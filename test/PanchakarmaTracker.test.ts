import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PANCHAKARMA_GUESTS,
  type DailyPanchakarmaRecord,
  type DailyTherapySession,
  type PanchakarmaDurationDays,
  type PanchakarmaGuestProfile,
  type PanchakarmaKpiSummary,
  type PanchakarmaStage,
  PanchakarmaTracker,
  type PanchakarmaTrackerProps,
  type PrimaryDoshaType,
  type SessionCompletionStatus,
  calculatePanchakarmaKpiSummary,
  getPanchakarmaTranslations,
  getSessionStatusBadgeClass,
  getStageBadgeClass,
} from "../src/admin/activities/PanchakarmaTracker.js";

describe("Step 363: Ayurveda Multi-Day Panchakarma Package Progress Tracker (PanchakarmaTracker.tsx)", () => {
  describe("1. Pure KPI Summary & Clinical Aggregations", () => {
    it("aggregates clinical retreat KPIs accurately across sample in-house patients", () => {
      const summary: PanchakarmaKpiSummary = calculatePanchakarmaKpiSummary(
        DEFAULT_PANCHAKARMA_GUESTS,
      );

      // In-house patients: 3
      assert.strictEqual(summary.inHouseGuestsCount, 3);

      // Total scheduled today: 3 guests * 2 sessions = 6
      assert.strictEqual(summary.totalScheduledTodayCount, 6);

      // Completed today: Lady Sarah morning (1) + Henrik morning (1) + Clara morning (1) = 3
      assert.strictEqual(summary.completedTodayCount, 3);

      // Deep detox (Pradhanakarma): Lady Sarah (Day 6) + Clara (Day 12) = 2
      assert.strictEqual(summary.deepDetoxPhaseCount, 2);

      // Graduating within 2 days: Henrik (Day 5 of 7, remaining 2 days) = 1
      assert.strictEqual(summary.graduatingThisWeekCount, 1);

      // Average progress percentage: (43% + 71% + 57%) / 3 = 57%
      assert.ok(summary.avgProgressPercent >= 55 && summary.avgProgressPercent <= 60);
    });

    it("handles empty patient list gracefully", () => {
      const emptySummary = calculatePanchakarmaKpiSummary([]);
      assert.strictEqual(emptySummary.inHouseGuestsCount, 0);
      assert.strictEqual(emptySummary.completedTodayCount, 0);
      assert.strictEqual(emptySummary.totalScheduledTodayCount, 0);
      assert.strictEqual(emptySummary.deepDetoxPhaseCount, 0);
      assert.strictEqual(emptySummary.graduatingThisWeekCount, 0);
      assert.strictEqual(emptySummary.avgProgressPercent, 0);
    });

    it("returns correct CSS badge classes for session statuses and retreat stages", () => {
      assert.ok(getSessionStatusBadgeClass("COMPLETED").includes("emerald"));
      assert.ok(getSessionStatusBadgeClass("IN_PROGRESS").includes("sky"));
      assert.ok(getSessionStatusBadgeClass("PENDING").includes("amber"));
      assert.ok(getSessionStatusBadgeClass("CONTRAINDICATED_SKIPPED").includes("rose"));

      assert.ok(getStageBadgeClass("PURVAKARMA_PREP").includes("indigo"));
      assert.ok(getStageBadgeClass("PRADHANAKARMA_DETOX").includes("amber"));
      assert.ok(getStageBadgeClass("PASCHATKARMA_REJUV").includes("emerald"));
    });
  });

  describe("2. Trilingual Localization & Translations", () => {
    it("provides complete translations in English, Sinhala, and Tamil", () => {
      const en = getPanchakarmaTranslations("en");
      assert.strictEqual(en.title, "Multi-Day Panchakarma Retreat Progress Tracker");
      assert.strictEqual(en.kpiInHouse, "In-House Retreat Patients");
      assert.strictEqual(en.stageDetox, "Pradhanakarma (Deep Detox)");

      const si = getPanchakarmaTranslations("si");
      assert.strictEqual(si.title, "පංචකර්ම නේවාසික ප්රතිකාර ප්රගති පුවරුව");
      assert.strictEqual(si.kpiInHouse, "නේවාසික රෝගීන්");
      assert.strictEqual(si.stageDetox, "ප්රධානකර්ම (ශෝධනය)");

      const ta = getPanchakarmaTranslations("ta");
      assert.strictEqual(ta.title, "பஞ்சகர்மா சிகிச்சை முன்னேற்ற கண்காணிப்பு");
      assert.strictEqual(ta.kpiInHouse, "தங்கி சிகிச்சை பெறுவோர்");
    });
  });

  describe("3. Static React Markup & Component Rendering", () => {
    it("renders PanchakarmaTracker with patient cards, progress bars, and therapy sessions", () => {
      const html = renderToStaticMarkup(
        React.createElement(PanchakarmaTracker, {
          initialGuests: DEFAULT_PANCHAKARMA_GUESTS,
          language: "en",
          testId: "custom-panchakarma-test",
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="custom-panchakarma-test"'));
      assert.ok(html.includes("Multi-Day Panchakarma Retreat Progress Tracker"));

      // Inpatient cards
      assert.ok(html.includes('data-testid="panchakarma-guest-PK-1001"'));
      assert.ok(html.includes("Lady Sarah Cavendish"));
      assert.ok(html.includes("Ayurveda Villa 02"));
      assert.ok(html.includes("14-Day Deep Shodhana &amp; Metabolic Reset"));
      assert.ok(html.includes("Dr. Priyantha Weerasinghe (BAMS)"));

      // Sessions
      assert.ok(html.includes("Virechana Purgation Snehana Preparation &amp; Abhyanga"));
      assert.ok(html.includes("Ksheeradhara (Herbal Medicated Milk Pouring)"));
      assert.ok(html.includes("Mung Bean Mudga Yusha"));

      // Vitals
      assert.ok(html.includes("118/76 mmHg"));
      assert.ok(html.includes("Pulse: 68 bpm"));
    });

    it("renders Sinhala localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PanchakarmaTracker, {
          initialGuests: DEFAULT_PANCHAKARMA_GUESTS,
          language: "si",
        }),
      );

      assert.ok(html.includes("පංචකර්ම නේවාසික ප්රතිකාර ප්රගති පුවරුව"));
      assert.ok(html.includes("නේවාසික රෝගීන්"));
      assert.ok(html.includes("උදෑසන ප්රතිකාර වාරය"));
      assert.ok(html.includes("ප්රධානකර්ම"));
    });

    it("renders Tamil localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PanchakarmaTracker, {
          initialGuests: DEFAULT_PANCHAKARMA_GUESTS,
          language: "ta",
        }),
      );

      assert.ok(html.includes("பஞ்சகர்மா சிகிச்சை முன்னேற்ற கண்காணிப்பு"));
      assert.ok(html.includes("தங்கி சிகிச்சை பெறுவோர்"));
    });
  });

  describe("4. TypeScript Domain Constructibility & Types", () => {
    it("constructs type-safe PanchakarmaGuestProfile, DailyTherapySession and props", () => {
      const duration: PanchakarmaDurationDays = 21;
      const dosha: PrimaryDoshaType = "TRIDOSHA";
      const status: SessionCompletionStatus = "COMPLETED";
      const stage: PanchakarmaStage = "PASCHATKARMA_REJUV";

      const session: DailyTherapySession = {
        treatmentName: "Nasyam Herbal Nasal Drops",
        therapistName: "Anoma",
        scheduledTime: "10:00 AM",
        status,
        clinicalRemarks: "Clear breathing passages",
      };

      const record: DailyPanchakarmaRecord = {
        dayNumber: 21,
        date: "2026-10-31",
        stage,
        morningTherapy: session,
        afternoonTherapy: session,
        prescribedDiet: "Fresh Gotukola porridge",
        doctorReviewed: true,
        bloodPressure: "115/75 mmHg",
        pulseRateBpm: 66,
        weightKg: 60.5,
      };

      const guest: PanchakarmaGuestProfile = {
        id: "PK-TEST-99",
        registrationRef: "AYU-TEST-001",
        guestName: "Lord Mountbatten",
        roomNumber: "Villa 10",
        programTitle: "21-Day Rasayana Immersion",
        totalDays: duration,
        currentDay: 21,
        startDate: "2026-10-10",
        expectedEndDate: "2026-10-31",
        attendingVaidya: "Dr. Priyantha",
        dominantDosha: dosha,
        dailyRecords: [record],
      };

      assert.strictEqual(guest.totalDays, 21);
      assert.strictEqual(guest.dominantDosha, "TRIDOSHA");

      const props: PanchakarmaTrackerProps = {
        initialGuests: [guest],
        language: "en",
        onUpdateSession: () => {
          /* noop */
        },
      };

      assert.strictEqual(props.language, "en");
    });
  });
});
