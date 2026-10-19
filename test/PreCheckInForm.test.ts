import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ArrivalTransportMode,
  DEFAULT_FORM_STATE,
  DEFAULT_PRE_CHECKIN_SUMMARY,
  IDENTITY_SEGMENTS,
  POPULAR_FLIGHT_CHIPS,
  PreCheckInForm,
  type PreCheckInFormProps,
  type PreCheckInFormState,
  type PreCheckInIdentityType,
  type PreCheckInPayload,
  type PreCheckInReservationSummary,
  TRANSPORT_OPTIONS,
  type ValidationResult,
  createInitialFormState,
  validateEtaTime,
  validateFlightNumber,
  validatePassportNumber,
  validatePreCheckInForm,
  validateSriLankanNic,
} from "../src/qr/booking/PreCheckInForm.js";

describe("Contactless Mobile Pre-Check-In Form (PreCheckInForm.tsx)", () => {
  describe("1. Constants & Default State", () => {
    it("defines default summary with complete reservation details", () => {
      const s: PreCheckInReservationSummary = DEFAULT_PRE_CHECKIN_SUMMARY;
      assert.strictEqual(s.tenantId, "tenant-galle-fort");
      assert.strictEqual(s.bookingReference, "SL-BKG-2026-89412");
      assert.strictEqual(s.hotelName, "Galle Fort Lighthouse Villa");
      assert.strictEqual(s.hotelCity, "Galle");
      assert.strictEqual(s.roomTypeName, "Deluxe Ocean View Villa");
      assert.strictEqual(s.mealPlanName, "Half Board (HB)");
      assert.strictEqual(s.nights, 3);
      assert.strictEqual(s.adultsCount, 2);
    });

    it("defines identity segments and transport modes", () => {
      assert.strictEqual(IDENTITY_SEGMENTS.length, 2);
      const identityIds: PreCheckInIdentityType[] = IDENTITY_SEGMENTS.map((s) => s.id);
      assert.deepStrictEqual(identityIds, ["SRI_LANKAN_NIC", "FOREIGN_PASSPORT"]);

      assert.strictEqual(TRANSPORT_OPTIONS.length, 4);
      const transportIds: ArrivalTransportMode[] = TRANSPORT_OPTIONS.map((t) => t.id);
      assert.deepStrictEqual(transportIds, ["FLIGHT", "PRIVATE_VEHICLE", "TRAIN", "OTHER"]);

      assert.ok(POPULAR_FLIGHT_CHIPS.includes("UL 504"));
      assert.ok(POPULAR_FLIGHT_CHIPS.includes("EK 652"));
    });

    it("createInitialFormState provides default state and merges partial overrides", () => {
      const defaultState: PreCheckInFormState = createInitialFormState();
      assert.strictEqual(defaultState.guestFullName, DEFAULT_FORM_STATE.guestFullName);
      assert.strictEqual(defaultState.identityType, "SRI_LANKAN_NIC");
      assert.strictEqual(defaultState.sltdaDeclarationAgreed, true);

      const customState: PreCheckInFormState = createInitialFormState({
        guestFullName: "Emma Watson",
        identityType: "FOREIGN_PASSPORT",
        identityNumber: "PA9876543",
      });
      assert.strictEqual(customState.guestFullName, "Emma Watson");
      assert.strictEqual(customState.identityType, "FOREIGN_PASSPORT");
      assert.strictEqual(customState.identityNumber, "PA9876543");
      assert.strictEqual(customState.estimatedArrivalTime, "14:30");
    });
  });

  describe("2. Pure Validation Functions", () => {
    it("validateSriLankanNic validates old 9-digit (V/X) and new 12-digit formats", () => {
      assert.strictEqual(validateSriLankanNic("881234567V"), true);
      assert.strictEqual(validateSriLankanNic("923456789x"), true);
      assert.strictEqual(validateSriLankanNic("198812345678"), true);
      assert.strictEqual(validateSriLankanNic("200198765432"), true);

      assert.strictEqual(validateSriLankanNic("123"), false);
      assert.strictEqual(validateSriLankanNic("8812345678"), false);
      assert.strictEqual(validateSriLankanNic("ABCD12345"), false);
    });

    it("validatePassportNumber validates alphanumeric passport numbers", () => {
      assert.strictEqual(validatePassportNumber("N1234567"), true);
      assert.strictEqual(validatePassportNumber("PA9876543"), true);
      assert.strictEqual(validatePassportNumber("C123456"), true);

      assert.strictEqual(validatePassportNumber("12"), false);
      assert.strictEqual(validatePassportNumber("invalid-characters-!@#"), false);
    });

    it("validateFlightNumber validates standard airline flight codes", () => {
      assert.strictEqual(validateFlightNumber("UL 504"), true);
      assert.strictEqual(validateFlightNumber("EK652"), true);
      assert.strictEqual(validateFlightNumber("QR 668"), true);
      assert.strictEqual(validateFlightNumber(""), true); // optional

      assert.strictEqual(validateFlightNumber("INVALID_FLIGHT_CODE_TOO_LONG"), false);
    });

    it("validateEtaTime validates 24-hour time strings", () => {
      assert.strictEqual(validateEtaTime("14:30"), true);
      assert.strictEqual(validateEtaTime("09:15"), true);
      assert.strictEqual(validateEtaTime("00:00"), true);
      assert.strictEqual(validateEtaTime("23:59"), true);

      assert.strictEqual(validateEtaTime("24:00"), false);
      assert.strictEqual(validateEtaTime("14:65"), false);
      assert.strictEqual(validateEtaTime("invalid"), false);
    });

    it("validatePreCheckInForm validates full valid form and returns payload", () => {
      const validForm = {
        guestFullName: "Nimal Perera",
        guestEmail: "nimal@example.lk",
        guestPhone: "+94771234567",
        identityType: "SRI_LANKAN_NIC" as PreCheckInIdentityType,
        identityNumber: "199012345678",
        transportMode: "PRIVATE_VEHICLE" as ArrivalTransportMode,
        flightNumber: "",
        estimatedArrivalTime: "15:00",
        chauffeurRequired: true,
        vehiclePlate: "WP CAD-5678",
        specialRequests: "Ceylon spiced tea on arrival",
        signatureDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        sltdaDeclarationAgreed: true,
      };

      const result: ValidationResult<PreCheckInPayload> = validatePreCheckInForm(
        validForm,
        "tenant-1",
        "res-101",
      );
      assert.strictEqual(result.isValid, true);
      assert.ok(result.value);
      assert.strictEqual(result.value.guestFullName, "Nimal Perera");
      assert.strictEqual(result.value.identityNumber, "199012345678");
      assert.strictEqual(result.value.chauffeurRequired, true);
      assert.strictEqual(result.value.vehiclePlate, "WP CAD-5678");
    });

    it("validatePreCheckInForm rejects invalid name or email", () => {
      const invalidName = {
        ...DEFAULT_FORM_STATE,
        guestFullName: "Al",
      };
      const resName = validatePreCheckInForm(invalidName, "t1", "r1");
      assert.strictEqual(resName.isValid, false);
      assert.ok(resName.error?.includes("full legal name"));

      const invalidEmail = {
        ...DEFAULT_FORM_STATE,
        guestEmail: "not-an-email",
      };
      const resEmail = validatePreCheckInForm(invalidEmail, "t1", "r1");
      assert.strictEqual(resEmail.isValid, false);
      assert.ok(resEmail.error?.includes("valid email"));
    });

    it("validatePreCheckInForm rejects invalid NIC or passport", () => {
      const invalidNic = {
        ...DEFAULT_FORM_STATE,
        identityType: "SRI_LANKAN_NIC" as PreCheckInIdentityType,
        identityNumber: "bad-nic",
      };
      const resNic = validatePreCheckInForm(invalidNic, "t1", "r1");
      assert.strictEqual(resNic.isValid, false);
      assert.ok(resNic.error?.includes("Sri Lankan NIC"));

      const invalidPassport = {
        ...DEFAULT_FORM_STATE,
        identityType: "FOREIGN_PASSPORT" as PreCheckInIdentityType,
        identityNumber: "12",
      };
      const resPassport = validatePreCheckInForm(invalidPassport, "t1", "r1");
      assert.strictEqual(resPassport.isValid, false);
      assert.ok(resPassport.error?.includes("Passport"));
    });

    it("validatePreCheckInForm rejects missing signature or SLTDA agreement", () => {
      const missingSig = {
        ...DEFAULT_FORM_STATE,
        signatureDataUrl: "",
      };
      const resSig = validatePreCheckInForm(missingSig, "t1", "r1");
      assert.strictEqual(resSig.isValid, false);
      assert.ok(resSig.error?.includes("signature"));

      const noTerms = {
        ...DEFAULT_FORM_STATE,
        sltdaDeclarationAgreed: false,
      };
      const resTerms = validatePreCheckInForm(noTerms, "t1", "r1");
      assert.strictEqual(resTerms.isValid, false);
      assert.ok(resTerms.error?.includes("SLTDA"));
    });
  });

  describe("3. Static Markup & Component Rendering", () => {
    it("renders pre-check-in form with all sections", () => {
      const props: PreCheckInFormProps = {
        summary: DEFAULT_PRE_CHECKIN_SUMMARY,
      };
      const html = renderToStaticMarkup(React.createElement(PreCheckInForm, props));

      assert.ok(html.includes("Contactless Mobile Pre-Check-In"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("SL-BKG-2026-89412"));
      assert.ok(html.includes("Primary Guest Government Identity"));
      assert.ok(html.includes("Sri Lankan NIC"));
      assert.ok(html.includes("Foreign Passport"));
      assert.ok(html.includes("Arrival Mode &amp; Estimated Check-In Time"));
      assert.ok(html.includes("Flight (BIA Colombo)"));
      assert.ok(html.includes("Private Vehicle / Taxi"));
      assert.ok(html.includes("I am traveling with a Chauffeur / Driver Guide"));
      assert.ok(html.includes("Digital Signature Pad"));
      assert.ok(
        html.includes("Sri Lanka Tourism Development Authority (SLTDA) Act No. 38 of 2005"),
      );
      assert.ok(html.includes("Complete Fast-Track Pre-Check-In"));
    });

    it("renders with custom initial payload values", () => {
      const props: PreCheckInFormProps = {
        summary: DEFAULT_PRE_CHECKIN_SUMMARY,
        initialPayload: {
          guestFullName: "Saman Kumara",
          identityType: "SRI_LANKAN_NIC",
          identityNumber: "197512345678",
          transportMode: "FLIGHT",
          flightNumber: "UL 504",
          chauffeurRequired: true,
          vehiclePlate: "WP CAD-1234",
        },
      };
      const html = renderToStaticMarkup(React.createElement(PreCheckInForm, props));

      assert.ok(html.includes("Saman Kumara"));
      assert.ok(html.includes("197512345678"));
      assert.ok(html.includes("UL 504"));
      assert.ok(html.includes("WP CAD-1234"));
    });

    it("renders back to voucher button when onBackToVoucher is provided", () => {
      let backClicked = false;
      const props: PreCheckInFormProps = {
        summary: DEFAULT_PRE_CHECKIN_SUMMARY,
        onBackToVoucher: () => {
          backClicked = true;
        },
      };
      const html = renderToStaticMarkup(React.createElement(PreCheckInForm, props));
      assert.ok(html.includes("Back to E-Voucher"));
      assert.strictEqual(backClicked, false); // static markup does not click
    });
  });
});
