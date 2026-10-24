import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AyurvedaConsultationModal,
  type AyurvedaConsultationModalProps,
  type AyurvedaConsultationPlan,
  type AyurvedicDietType,
  CONSULTATION_TRANSLATIONS,
  type ConsultationModalTab,
  type ConsultationTranslations,
  DEFAULT_CONSULTATION_PLAN,
  DEFAULT_THERAPIES_SEED,
  type DietaryPrescription,
  type DoshaScores,
  type DoshaType,
  type PatientVitals,
  type PrescribedTherapyItem,
} from "../src/admin/activities/index.js";

const noop = () => undefined;

describe("Step 353: AyurvedaConsultationModal — Ayurveda Doctor Dosha Consultation & KDS Diet Card", () => {
  describe("1. Modal Lifecycle & Static Rendering", () => {
    it("returns null when isOpen is false", () => {
      const props: AyurvedaConsultationModalProps = {
        isOpen: false,
        onClose: noop,
      };
      const html = renderToStaticMarkup(React.createElement(AyurvedaConsultationModal, props));
      assert.strictEqual(html, "");
    });

    it("renders modal dialog with doctor consultation details and patient info", () => {
      const html = renderToStaticMarkup(
        React.createElement(AyurvedaConsultationModal, {
          isOpen: true,
          guestName: "Baroness Von Weber",
          roomNumber: "SUITE-201",
          doctorName: "Dr. Priyantha (Vaidya)",
          onClose: noop,
        }),
      );

      assert.ok(html.includes("Baroness Von Weber"));
      assert.ok(html.includes("SUITE-201"));
      assert.ok(html.includes("Dr. Priyantha (Vaidya)"));
      assert.ok(html.includes("Ayurvedic Doctor (Vaidya) Consultation"));
      assert.ok(html.includes("KDS Sync Active for Room SUITE-201"));
    });

    it("renders trilingual translations accurately in Sinhala and Tamil", () => {
      const siHtml = renderToStaticMarkup(
        React.createElement(AyurvedaConsultationModal, {
          isOpen: true,
          language: "si",
          onClose: noop,
        }),
      );
      assert.ok(siHtml.includes(CONSULTATION_TRANSLATIONS.si.title));
      assert.ok(siHtml.includes("ප්රකෘති දේහ ස්වභාවය"));

      const taHtml = renderToStaticMarkup(
        React.createElement(AyurvedaConsultationModal, {
          isOpen: true,
          language: "ta",
          onClose: noop,
        }),
      );
      assert.ok(taHtml.includes(CONSULTATION_TRANSLATIONS.ta.title));
      assert.ok(taHtml.includes("பிரகிருதி"));
    });
  });

  describe("2. Default Consultation Seed Data & Dosha Balance", () => {
    it("provides valid initial consultation seed structure and typed contracts", () => {
      const plan: AyurvedaConsultationPlan = DEFAULT_CONSULTATION_PLAN;
      const primaryDosha: DoshaType = plan.primaryDosha;
      assert.strictEqual(primaryDosha, "VATA_PITTA");

      const scores: DoshaScores = plan.doshaScores;
      assert.strictEqual(scores.vataPct, 50);
      assert.strictEqual(scores.pittaPct, 35);
      assert.strictEqual(scores.kaphaPct, 15);

      const vitals: PatientVitals = plan.vitals;
      assert.strictEqual(vitals.systolicBp, 122);
      assert.strictEqual(vitals.diastolicBp, 78);

      const diet: DietaryPrescription = plan.diet;
      const dietType: AyurvedicDietType = diet.dietType;
      assert.strictEqual(dietType, "VATA_PACIFYING_WARM");
      assert.strictEqual(diet.syncWithRoomKds, true);

      const defaultTherapies: readonly PrescribedTherapyItem[] = DEFAULT_THERAPIES_SEED;
      assert.ok(defaultTherapies.length >= 4);
      assert.strictEqual(plan.totalTherapiesCostLkr, 57500);

      const tabs: readonly ConsultationModalTab[] = ["DOSHA", "VITALS", "DIET_KDS", "THERAPIES"];
      assert.strictEqual(tabs.length, 4);

      const enTranslations: ConsultationTranslations = CONSULTATION_TRANSLATIONS.en;
      assert.ok(enTranslations.title.includes("Vaidya"));
    });
  });
});
