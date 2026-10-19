import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PAYMENT_SETTINGS,
  type LankaQrInput,
  type PaymentSettingsData,
  PaymentSettingsForm,
  type PaymentSettingsFormProps,
  SRI_LANKAN_BANKS,
  buildLankaQrPayload,
  crc16CcittFalse,
  formatTlv,
  validatePaymentSettings,
} from "../src/admin/settings/PaymentSettingsForm.js";

describe("Payment Gateways & LankaQR Merchant Settings Form (PaymentSettingsForm.tsx)", () => {
  describe("EMVCo TLV & CRC-16 Checksum Mathematics", () => {
    it("formats TLV blocks with 2-digit zero-padded lengths", () => {
      assert.equal(formatTlv("00", "01"), "000201");
      assert.equal(formatTlv("53", "144"), "5303144");
      assert.equal(formatTlv("58", "LK"), "5802LK");
    });

    it("verifies standard CRC-16/CCITT-FALSE check vector (123456789 -> 29B1)", () => {
      const vector = "123456789";
      assert.equal(crc16CcittFalse(vector), "29B1");
    });

    it("builds valid LankaQR EMVCo payload for static merchant presented QR", () => {
      const input: LankaQrInput = {
        merchantId: "000000000012345",
        merchantName: "Tangalle Breeze Resort",
        merchantCity: "Tangalle",
        mcc: "7011",
        isDynamic: false,
      };

      const payload = buildLankaQrPayload(input);
      assert.ok(
        payload.startsWith("000201010211"),
        "Must start with format 01 and static initiation 11",
      );
      assert.ok(payload.includes("COM.LANKAQR"), "Must contain COM.LANKAQR GUI");
      assert.ok(payload.includes("000000000012345"), "Must contain merchant ID");
      assert.ok(payload.includes("5303144"), "Must contain LKR currency tag");
      assert.ok(payload.includes("5802LK"), "Must contain LK country code");
      assert.ok(payload.includes("Tangalle Breeze Resort"), "Must contain merchant name");
      assert.ok(payload.includes("Tangalle"), "Must contain merchant city");
      assert.equal(payload.length > 50, true);
    });

    it("builds valid dynamic LankaQR EMVCo payload with exact amount in LKR", () => {
      const input: LankaQrInput = {
        merchantId: "000000000012345",
        merchantName: "Tangalle Breeze Resort",
        merchantCity: "Tangalle",
        amountLkr: 7500.5,
        referenceId: "FOLIO-1024",
      };

      const payload = buildLankaQrPayload(input);
      assert.ok(payload.startsWith("000201010212"), "Must start with dynamic initiation 12");
      assert.ok(payload.includes("54077500.50"), "Must contain exact formatted amount tag 54");
      assert.ok(payload.includes("FOLIO-1024"), "Must contain reference ID");
    });
  });

  describe("Validation Logic (validatePaymentSettings)", () => {
    it("returns zero errors for default payment configuration", () => {
      const errors = validatePaymentSettings(DEFAULT_PAYMENT_SETTINGS);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when PayHere is enabled but Merchant ID or Secret is missing", () => {
      const invalid: PaymentSettingsData = {
        ...DEFAULT_PAYMENT_SETTINGS,
        payHereEnabled: true,
        payHereMerchantId: "",
        payHereMerchantSecret: "",
      };

      const errors = validatePaymentSettings(invalid);
      assert.ok(errors.payHereMerchantId, "Should flag missing PayHere MID");
      assert.ok(errors.payHereMerchantSecret, "Should flag missing PayHere Secret");
    });

    it("flags error when WebXPay is enabled but keys are missing", () => {
      const invalid: PaymentSettingsData = {
        ...DEFAULT_PAYMENT_SETTINGS,
        webXPayEnabled: true,
        webXPayPublicKey: "",
        webXPaySecretKey: "",
      };

      const errors = validatePaymentSettings(invalid);
      assert.ok(errors.webXPayPublicKey, "Should flag missing WebXPay public key");
      assert.ok(errors.webXPaySecretKey, "Should flag missing WebXPay secret key");
    });

    it("flags error when LankaQR fields violate EMVCo specifications", () => {
      const invalid: PaymentSettingsData = {
        ...DEFAULT_PAYMENT_SETTINGS,
        lankaQrEnabled: true,
        lankaQrMerchantId: "",
        lankaQrMerchantName: "This Hotel Name Is Way Too Long To Fit The Twenty Five Char Limit",
        lankaQrMerchantCity: "CityNameExceedsFifteenChars",
        lankaQrMcc: "99", // not 4 digits
        settlementAccountNo: "",
      };

      const errors = validatePaymentSettings(invalid);
      assert.ok(errors.lankaQrMerchantId, "Should flag missing MID");
      assert.ok(errors.lankaQrMerchantName, "Should flag >25 char merchant name");
      assert.ok(errors.lankaQrMerchantCity, "Should flag >15 char merchant city");
      assert.ok(errors.lankaQrMcc, "Should flag non-4-digit MCC");
      assert.ok(errors.settlementAccountNo, "Should flag missing account number");
    });
  });

  describe("Static Rendering & Subcomponent Verification", () => {
    it("renders payment settings form with PayHere, WebXPay, and live LankaQR preview", () => {
      const html = renderToStaticMarkup(
        React.createElement(PaymentSettingsForm, {
          initialData: DEFAULT_PAYMENT_SETTINGS,
        }),
      );

      assert.ok(html.includes("Payment Gateways &amp; LankaQR Merchant Settings"));
      assert.ok(html.includes("PayHere Sri Lanka Gateway"));
      assert.ok(html.includes("WebXPay Sri Lanka Gateway"));
      assert.ok(html.includes("Central Bank LankaQR EMVCo"));
      assert.ok(html.includes("Live Bank App Verification QR"));
      assert.ok(html.includes("CBSL LankaQR"));
      assert.ok(html.includes("Commercial Bank of Ceylon"));
    });

    it("contains major Sri Lankan banks in SRI_LANKAN_BANKS", () => {
      assert.ok(SRI_LANKAN_BANKS.includes("Commercial Bank of Ceylon"));
      assert.ok(SRI_LANKAN_BANKS.includes("Sampath Bank"));
      assert.ok(SRI_LANKAN_BANKS.includes("Bank of Ceylon (BOC)"));
    });

    it("verifies exported types and props interfaces are constructible", () => {
      const props: PaymentSettingsFormProps = {
        initialData: DEFAULT_PAYMENT_SETTINGS,
        isSaving: false,
        readOnly: false,
      };
      assert.equal(props.isSaving, false);
    });
  });
});
