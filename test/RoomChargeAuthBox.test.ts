import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RoomChargeAuthBox,
  type RoomChargeAuthBoxProps,
  type RoomChargeAuthResult,
  type ValidationOutcome,
  getAuthBoxText,
  validateIdentityLast4,
  validateRoomPin,
} from "../src/qr/RoomChargeAuthBox.js";

describe("Step 260: Room Charge Verification Prompt (RoomChargeAuthBox.tsx)", () => {
  describe("1. Pure Validation Engines", () => {
    it("validates 4-digit numeric check-in room PINs", () => {
      // Valid PINs
      assert.strictEqual(validateRoomPin("4819").isValid, true);
      assert.strictEqual(validateRoomPin("0000").isValid, true);
      assert.strictEqual(validateRoomPin(" 1234 ").isValid, true); // trimmed

      // Invalid PINs
      assert.strictEqual(validateRoomPin("").isValid, false);
      assert.strictEqual(validateRoomPin("123").isValid, false);
      assert.strictEqual(validateRoomPin("12345").isValid, false);
      assert.strictEqual(validateRoomPin("12a4").isValid, false);
      assert.strictEqual(validateRoomPin("abcd").isValid, false);
      assert.strictEqual(validateRoomPin("12-4").isValid, false);
    });

    it("validates last 4 characters of NIC or Passport", () => {
      // Valid 4-character codes (handles modern NICs, old V/X NICs, foreign passports)
      assert.strictEqual(validateIdentityLast4("1234").isValid, true);
      assert.strictEqual(validateIdentityLast4("123v").isValid, true); // uppercase normalized
      assert.strictEqual(validateIdentityLast4("123X").isValid, true);
      assert.strictEqual(validateIdentityLast4("N789").isValid, true);
      assert.strictEqual(validateIdentityLast4(" ab12 ").isValid, true);

      // Invalid codes
      assert.strictEqual(validateIdentityLast4("").isValid, false);
      assert.strictEqual(validateIdentityLast4("123").isValid, false);
      assert.strictEqual(validateIdentityLast4("12345").isValid, false);
      assert.strictEqual(validateIdentityLast4("12#4").isValid, false);
      assert.strictEqual(validateIdentityLast4("12 4").isValid, false);
    });
  });

  describe("2. Localized Translation Catalog & String Resolvers", () => {
    it("returns correct translations for all supported Sri Lankan languages (en, si, ta)", () => {
      const en = getAuthBoxText("en");
      assert.strictEqual(en.title, "Verify Room Folio Charge");
      assert.strictEqual(en.pinTabLabel, "4-Digit PIN");
      assert.strictEqual(en.idTabLabel, "NIC / Passport Last-4");
      assert.strictEqual(en.authorizeButton, "Confirm & Charge Room");

      const si = getAuthBoxText("si");
      assert.strictEqual(si.title, "කාමර ගිණුමට එකතු කිරීම තහවුරු කරන්න");
      assert.strictEqual(si.pinTabLabel, "අංක 4 PIN");
      assert.strictEqual(si.idTabLabel, "හැඳුනුම්පත් අග අංක 4");

      const ta = getAuthBoxText("ta");
      assert.strictEqual(ta.title, "அறை கட்டணத்தை உறுதிப்படுத்தவும்");
      assert.strictEqual(ta.pinTabLabel, "4-இலக்க PIN");
      assert.strictEqual(ta.idTabLabel, "NIC / பாஸ்போர்ட் கடைசி 4");
    });

    it("falls back to English when passed unsupported language code", () => {
      // @ts-expect-error Testing runtime fallback
      const fallback = getAuthBoxText("it");
      assert.strictEqual(fallback.title, "Verify Room Folio Charge");
    });
  });

  describe("3. Component Static Rendering & Layout Verification", () => {
    it("renders room number, grand total in LKR, and security badge", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomChargeAuthBox, {
          roomNumber: "Ocean Villa 104",
          grandTotalLkr: 13434.3,
          guestDisplayName: "Mr. Pasan Perera",
          onAuthorize: () => undefined,
          onCancel: () => undefined,
        }),
      );

      assert.ok(html.includes('data-testid="room-charge-auth-box"'));
      assert.ok(html.includes("Ocean Villa 104"));
      assert.ok(html.includes("Mr. Pasan Perera"));
      assert.ok(html.includes("LKR 13,434"));
      assert.ok(html.includes("4-Digit PIN"));
      assert.ok(html.includes("NIC / Passport Last-4"));
      assert.ok(html.includes("Confirm &amp; Charge Room"));
      assert.ok(html.includes("Cancel / Use Another Payment"));
    });

    it("displays server error message when serverError prop is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomChargeAuthBox, {
          roomNumber: "Room 202",
          grandTotalLkr: 4800,
          serverError: "Invalid PIN. 2 attempts remaining.",
          onAuthorize: () => undefined,
        }),
      );

      assert.ok(html.includes("Invalid PIN. 2 attempts remaining."));
      assert.ok(html.includes('role="alert"'));
    });

    it("renders in submitting state when isSubmitting is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomChargeAuthBox, {
          roomNumber: "Room 305",
          grandTotalLkr: 2500,
          isSubmitting: true,
          onAuthorize: () => undefined,
        }),
      );

      assert.ok(html.includes("Verifying Folio..."));
      assert.ok(html.includes("disabled"));
    });

    it("renders accurately in Sinhala and Tamil language modes", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(RoomChargeAuthBox, {
          roomNumber: "Room 101",
          grandTotalLkr: 5000,
          language: "si",
          onAuthorize: () => undefined,
          onCancel: () => undefined,
        }),
      );
      assert.ok(htmlSi.includes("කාමර ගිණුමට එකතු කිරීම තහවුරු කරන්න"));
      assert.ok(htmlSi.includes("තහවුරු කර කාමරයට එක් කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(RoomChargeAuthBox, {
          roomNumber: "Room 101",
          grandTotalLkr: 5000,
          language: "ta",
          onAuthorize: () => undefined,
        }),
      );
      assert.ok(htmlTa.includes("அறை கட்டணத்தை உறுதிப்படுத்தவும்"));
      assert.ok(htmlTa.includes("உறுதிசெய்து அறையில் சேர்க்கவும்"));
    });
  });

  describe("4. Contract & Type Invariants", () => {
    it("RoomChargeAuthBoxProps and RoomChargeAuthResult are constructible and strictly typed", () => {
      const result: RoomChargeAuthResult = {
        method: "ROOM_PIN",
        code: "4819",
        roomNumber: "Villa 101",
        grandTotalLkr: 12000,
      };
      assert.strictEqual(result.method, "ROOM_PIN");
      assert.strictEqual(result.code, "4819");

      const props: RoomChargeAuthBoxProps = {
        roomNumber: "Villa 101",
        grandTotalLkr: 12000,
        guestDisplayName: "Guest",
        language: "en",
        onAuthorize: () => undefined,
        onCancel: () => undefined,
        initialMethod: "ROOM_PIN",
        serverError: null,
        isSubmitting: false,
        testId: "custom-auth-box",
      };
      assert.strictEqual(props.roomNumber, "Villa 101");
      const outcome: ValidationOutcome = {
        isValid: true,
        errorMessage: null,
      };
      assert.strictEqual(outcome.isValid, true);
    });
  });
});
