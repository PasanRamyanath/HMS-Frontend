import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SMS_SETTINGS,
  SMS_PROVIDER_OPTIONS,
  type SmsProvider,
  type SmsSettingsData,
  SmsSettingsForm,
  type SmsSettingsFormProps,
  computeSmsSegments,
  sanitizeSenderMask,
  validateSmsSettings,
} from "../src/admin/settings/SmsSettingsForm.js";

describe("SMSGo.lk & Notify.lk Sender Mask Configuration (SmsSettingsForm.tsx)", () => {
  describe("Sender Mask Normalization & Segment Mathematics", () => {
    it("sanitizes TRCSL sender mask by removing non-alphanumeric chars and capping at 11 chars", () => {
      assert.equal(sanitizeSenderMask("hotel_breeze!"), "HOTELBREEZE");
      assert.equal(sanitizeSenderMask("tangalle-resort-spa"), "TANGALLERES"); // 11 chars
      assert.equal(sanitizeSenderMask("hms123"), "HMS123");
    });

    it("computes GSM 03.38 SMS segment counts accurately", () => {
      assert.deepEqual(computeSmsSegments(""), { length: 0, segments: 0 });
      assert.deepEqual(computeSmsSegments("Short SMS message"), { length: 17, segments: 1 });
      assert.deepEqual(computeSmsSegments("A".repeat(160)), { length: 160, segments: 1 });
      assert.deepEqual(computeSmsSegments("A".repeat(161)), { length: 161, segments: 2 });
      assert.deepEqual(computeSmsSegments("A".repeat(306)), { length: 306, segments: 2 });
      assert.deepEqual(computeSmsSegments("A".repeat(307)), { length: 307, segments: 3 });
    });
  });

  describe("Validation Logic (validateSmsSettings)", () => {
    it("returns zero errors for default valid SMS settings", () => {
      const errors = validateSmsSettings(DEFAULT_SMS_SETTINGS);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when sender mask is shorter than 3 or empty", () => {
      const invalidShort: SmsSettingsData = {
        ...DEFAULT_SMS_SETTINGS,
        senderMask: "AB",
      };
      const errors = validateSmsSettings(invalidShort);
      assert.ok(errors.senderMask, "Should flag sender mask shorter than 3 chars");
    });

    it("flags error when API key is missing", () => {
      const invalidKey: SmsSettingsData = {
        ...DEFAULT_SMS_SETTINGS,
        apiKey: "   ",
      };
      const errors = validateSmsSettings(invalidKey);
      assert.ok(errors.apiKey, "Should require API key");
    });
  });

  describe("Static Rendering & Template Verification", () => {
    it("renders SMS settings form with balance meter, provider options, and templates", () => {
      const html = renderToStaticMarkup(
        React.createElement(SmsSettingsForm, {
          initialData: DEFAULT_SMS_SETTINGS,
        }),
      );

      assert.ok(html.includes("SMSGo.lk &amp; Notify.lk Sender Mask Configuration"));
      assert.ok(html.includes("SMS Balance Meter"));
      assert.ok(html.includes("2,450 SMS Credits"));
      assert.ok(html.includes("TRCSL Approved Sender Mask"));
      assert.ok(html.includes("HOTELBREEZE"));
      assert.ok(html.includes("Booking Confirmation &amp; Deposit Receipt"));
      assert.ok(html.includes("Driver &amp; Transport Room Ready Alert"));
      assert.ok(html.includes("Guest Check-In Contactless QR Pass"));
      assert.ok(html.includes("Checkout &amp; IRD Statutory Tax Invoice"));
      assert.ok(html.includes("Live Test SMS Dispatcher"));
    });

    it("contains SMSGo.lk and Notify.lk provider options", () => {
      assert.equal(SMS_PROVIDER_OPTIONS.length, 2);
      assert.ok(SMS_PROVIDER_OPTIONS.some((o) => o.id === "SMSGO_LK"));
      assert.ok(SMS_PROVIDER_OPTIONS.some((o) => o.id === "NOTIFY_LK"));
    });

    it("verifies exported types and props are constructible", () => {
      const props: SmsSettingsFormProps = {
        initialData: DEFAULT_SMS_SETTINGS,
        isSaving: false,
      };
      assert.equal(props.isSaving, false);

      const provider: SmsProvider = "NOTIFY_LK";
      assert.equal(provider, "NOTIFY_LK");
    });
  });
});
