/**
 * Unit Tests for Guest Liability Waiver Signature Modal
 * (HMS-Frontend/test/ActivityWaiverModal.test.ts)
 *
 * Covers Step 370 (Phase 15.20):
 * - Canvas-based signature pad interactions and clearing.
 * - Form validation (guest name, NIC/passport, emergency contacts, minor consent, signature).
 * - Multi-category risk profiles (Water Sports, Adventure Treks, Safari, Aerial Extreme).
 * - Trilingual localization (English, Sinhala, Tamil) and Apple HIG Liquid Glass dialog.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ActivityRiskProfile,
  type ActivityWaiverGuestDetails,
  ActivityWaiverModal,
  type ActivityWaiverPayload,
  STANDARD_ACTIVITY_PROFILES,
  SignatureCanvas,
  WAIVER_TRANSLATIONS,
  getRiskLevelBadgeClass,
  validateWaiverForm,
} from "../src/admin/activities/ActivityWaiverModal.js";

describe("Step 370: ActivityWaiverModal & Guest Liability Waiver System", () => {
  const noop = () => undefined;
  const sampleActivity: ActivityRiskProfile = STANDARD_ACTIVITY_PROFILES[0] || {
    id: "SCUBA_DEFAULT",
    name: "Default Scuba",
    category: "WATER_SPORTS",
    riskLevel: "HIGH",
    minimumAge: 12,
    mandatorySafetyGear: ["BCD", "Regulator"],
    contraindications: ["Asthma"],
    description: "Default diving activity",
  };

  const validGuest: ActivityWaiverGuestDetails = {
    guestName: "Lucas Vance",
    roomNumber: "Ocean Villa 204",
    guestNicOrPassport: "P88992211",
    nationality: "Australian",
    emergencyContactName: "Hannah Vance",
    emergencyContactPhone: "+61 412 345 678",
    emergencyContactRelation: "Spouse",
    travelInsuranceProvider: "Allianz Global",
    travelInsurancePolicyNo: "AU-2026-99128",
  };

  describe("1. Standard Activity Profiles & Risk Badges", () => {
    it("contains pre-configured profiles across water sports, treks, and aerial activities", () => {
      assert.strictEqual(STANDARD_ACTIVITY_PROFILES.length >= 5, true);
      const categories = STANDARD_ACTIVITY_PROFILES.map((p) => p.category);
      assert.ok(categories.includes("WATER_SPORTS"));
      assert.ok(categories.includes("ADVENTURE_TREKS"));
      assert.ok(categories.includes("AERIAL_EXTREME"));
    });

    it("maps risk level to appropriate Apple Dynamic Color badge classes", () => {
      assert.ok(getRiskLevelBadgeClass("LOW").includes("emerald"));
      assert.ok(getRiskLevelBadgeClass("MODERATE").includes("sky"));
      assert.ok(getRiskLevelBadgeClass("HIGH").includes("amber"));
      assert.ok(getRiskLevelBadgeClass("EXTREME").includes("rose"));
    });
  });

  describe("2. Pure Form Validation Logic (validateWaiverForm)", () => {
    it("rejects when participant name is empty or whitespace", () => {
      const invalidGuest: ActivityWaiverGuestDetails = { ...validGuest, guestName: "   " };
      const res = validateWaiverForm(invalidGuest, false, "", true, true);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errors.guestName, "Participant name is required.");
    });

    it("rejects when NIC or passport is missing", () => {
      const invalidGuest: ActivityWaiverGuestDetails = { ...validGuest, guestNicOrPassport: "" };
      const res = validateWaiverForm(invalidGuest, false, "", true, true);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errors.guestNicOrPassport, "NIC or Passport number is required.");
    });

    it("rejects when emergency contact name or phone is missing", () => {
      const invalidGuest: ActivityWaiverGuestDetails = {
        ...validGuest,
        emergencyContactName: "",
        emergencyContactPhone: "",
      };
      const res = validateWaiverForm(invalidGuest, false, "", true, true);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.emergencyContactName);
      assert.ok(res.errors.emergencyContactPhone);
    });

    it("rejects when participant is minor but guardian name is omitted", () => {
      const res = validateWaiverForm(validGuest, true, "   ", true, true);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errors.guardianName, "Parent/Guardian name is required for minors.");
    });

    it("rejects when legal waiver terms are not accepted", () => {
      const res = validateWaiverForm(validGuest, false, "", false, true);
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errors.termsAccepted?.includes("accept the liability waiver terms"));
    });

    it("rejects when digital signature has no strokes", () => {
      const res = validateWaiverForm(validGuest, false, "", true, false);
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.errors.signature, "Digital signature is required.");
    });

    it("accepts when all required fields, terms, and signature strokes are provided", () => {
      const res = validateWaiverForm(validGuest, false, "", true, true);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(Object.keys(res.errors).length, 0);
    });

    it("accepts minor participant when guardian name is provided", () => {
      const res = validateWaiverForm(validGuest, true, "Eleanor Vance", true, true);
      assert.strictEqual(res.isValid, true);
    });
  });

  describe("3. Static Markup Rendering & Apple HIG Verification", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityWaiverModal, {
          isOpen: false,
          onClose: noop,
          tenantId: "TENANT-NILAVELI",
          activity: sampleActivity,
          onSaveWaiver: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal dialog with Liquid Glass styling and activity details when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityWaiverModal, {
          isOpen: true,
          onClose: noop,
          tenantId: "TENANT-NILAVELI",
          activity: sampleActivity,
          initialGuest: validGuest,
          onSaveWaiver: noop,
        }),
      );

      assert.ok(html.includes("Activity Liability Waiver &amp; Risk Release"));
      assert.ok(html.includes("Pigeon Island Marine Sanctuary Scuba Diving"));
      assert.ok(html.includes("Lucas Vance"));
      assert.ok(html.includes("Ocean Villa 204"));
      assert.ok(html.includes("P88992211"));
      assert.ok(html.includes("HIGH"));
      assert.ok(html.includes("<canvas"));
      assert.ok(html.includes("Sign above the line"));
      assert.ok(html.includes("min-h-[44px]"));
    });

    it("renders Sinhala localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityWaiverModal, {
          isOpen: true,
          onClose: noop,
          tenantId: "TENANT-NILAVELI",
          activity: sampleActivity,
          onSaveWaiver: noop,
          lang: "si",
        }),
      );

      assert.ok(html.includes(WAIVER_TRANSLATIONS.si.title));
      assert.ok(html.includes(WAIVER_TRANSLATIONS.si.guestInfo));
      assert.ok(html.includes(WAIVER_TRANSLATIONS.si.submitBtn));
    });

    it("renders Tamil localization accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActivityWaiverModal, {
          isOpen: true,
          onClose: noop,
          tenantId: "TENANT-NILAVELI",
          activity: sampleActivity,
          onSaveWaiver: noop,
          lang: "ta",
        }),
      );

      assert.ok(html.includes(WAIVER_TRANSLATIONS.ta.title));
      assert.ok(html.includes(WAIVER_TRANSLATIONS.ta.guestInfo));
      assert.ok(html.includes(WAIVER_TRANSLATIONS.ta.submitBtn));
    });

    it("renders SignatureCanvas subcomponent with guide line", () => {
      const ref = { current: null };
      const html = renderToStaticMarkup(
        React.createElement(SignatureCanvas, {
          canvasRef: ref,
          hasStrokes: false,
          onStroke: noop,
          onClear: noop,
          clearLabel: "Clear",
          error: "Signature required",
        }),
      );

      assert.ok(html.includes("<canvas"));
      assert.ok(html.includes("Sign above the line"));
      assert.ok(html.includes("Signature required"));
    });

    it("verifies constructible contract payload interface", () => {
      const payload: ActivityWaiverPayload = {
        waiverId: "WVR-20261025-001",
        tenantId: "TENANT-TEST",
        activityId: sampleActivity.id,
        activityName: sampleActivity.name,
        activityCategory: sampleActivity.category,
        riskLevel: sampleActivity.riskLevel,
        guest: validGuest,
        medicalFitness: {
          canSwimUnaided: true,
          hasCardioConditions: false,
          hasRespiratoryOrAsthma: false,
          isPregnant: false,
          hasBackOrSpinalInjuries: false,
          notUnderInfluence: true,
          takesPrescriptionMeds: false,
        },
        isMinor: false,
        termsAccepted: true,
        signatureDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        signedAtIso: new Date().toISOString(),
      };

      assert.strictEqual(payload.activityId, "SCUBA_PIGEON_ISLAND");
      assert.strictEqual(payload.guest.guestName, "Lucas Vance");
      assert.strictEqual(payload.medicalFitness.canSwimUnaided, true);
    });
  });
});
