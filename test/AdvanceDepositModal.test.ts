import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdvanceDepositModal,
  type AdvanceDepositModalProps,
  type AdvanceDepositPayload,
  type DepositMethod,
  type OnlineGateway,
  type ReservationDepositTarget,
  type SriLankanBank,
  buildDepositPayload,
  calculateDepositPreset,
  generateSignedPayHereUrl,
  validateDepositEntry,
} from "../src/admin/frontdesk/AdvanceDepositModal.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_TARGET: ReservationDepositTarget = {
  reservationId: "res-kandy-801",
  bookingReference: "KDY-RES-801",
  guestName: "Nimal Perera",
  guestMobile: "+94771234567",
  totalBookingAmountLkr: 150000,
  alreadyPaidLkr: 30000,
  outstandingLkr: 120000,
  hotelName: "Earl's Regency Kandy",
  tenantId: "tenant-earls-kandy",
};

describe("Advance Deposit & Pre-Arrival PayHere Link Generator (AdvanceDepositModal.tsx)", () => {
  describe("Deposit Preset Calculator (calculateDepositPreset)", () => {
    it("returns 0 if outstanding is zero or negative", () => {
      assert.strictEqual(calculateDepositPreset(0, 30), 0);
      assert.strictEqual(calculateDepositPreset(-5000, 30), 0);
    });

    it("returns 0 if percentage is zero or negative", () => {
      assert.strictEqual(calculateDepositPreset(100000, 0), 0);
      assert.strictEqual(calculateDepositPreset(100000, -10), 0);
    });

    it("calculates 20%, 30%, 50%, and 100% of outstanding balance accurately", () => {
      assert.strictEqual(calculateDepositPreset(120000, 20), 24000);
      assert.strictEqual(calculateDepositPreset(120000, 30), 36000);
      assert.strictEqual(calculateDepositPreset(120000, 50), 60000);
      assert.strictEqual(calculateDepositPreset(120000, 100), 120000);
    });

    it("caps calculated preset at total outstanding amount even if percentage exceeds 100", () => {
      assert.strictEqual(calculateDepositPreset(50000, 150), 50000);
    });
  });

  describe("PayHere Signed Checkout Link Generator (generateSignedPayHereUrl)", () => {
    it("creates a signed payment URL with lowercase hyphenated gateway path", () => {
      const res = generateSignedPayHereUrl({
        gateway: "PAYHERE",
        tenantId: "tenant-earls-kandy",
        orderId: "KDY-RES-801",
        amountLkr: 36000,
      });

      assert.match(res.url, /^https:\/\/pay\.ceylonhms\.com\/checkout\/payhere\?/);
      assert.match(res.url, /order_id=KDY-RES-801/);
      assert.match(res.url, /amount=36000/);
      assert.match(res.url, /hash=[0-9a-f]{8}/);
      assert.strictEqual(res.signatureHash.length, 8);
    });

    it("formats multi-word gateway identifiers into hyphenated slug", () => {
      const res = generateSignedPayHereUrl({
        gateway: "COMMERCIAL_BANK_IPG",
        tenantId: "tenant-earls-kandy",
        orderId: "KDY-RES-801",
        amountLkr: 50000,
      });

      assert.match(res.url, /^https:\/\/pay\.ceylonhms\.com\/checkout\/commercial-bank-ipg\?/);
    });

    it("produces deterministic signature hash for identical inputs", () => {
      const run1 = generateSignedPayHereUrl({
        gateway: "WEBXPAY",
        tenantId: "tenant-1",
        orderId: "ORD-99",
        amountLkr: 25000,
      });
      const run2 = generateSignedPayHereUrl({
        gateway: "WEBXPAY",
        tenantId: "tenant-1",
        orderId: "ORD-99",
        amountLkr: 25000,
      });

      assert.strictEqual(run1.signatureHash, run2.signatureHash);
      assert.strictEqual(run1.url, run2.url);
    });
  });

  describe("Deposit Entry Validator (validateDepositEntry)", () => {
    it("rejects zero or negative deposit amount", () => {
      const res = validateDepositEntry({
        method: "ONLINE_PAYMENT_LINK",
        reservationId: "res-1",
        depositAmountLkr: 0,
        gateway: "PAYHERE",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /greater than zero/);
    });

    it("rejects online payment link when gateway is missing", () => {
      const res = validateDepositEntry({
        method: "ONLINE_PAYMENT_LINK",
        reservationId: "res-1",
        depositAmountLkr: 25000,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /select an online payment gateway/);
    });

    it("accepts valid online payment link payload", () => {
      const res = validateDepositEntry({
        method: "ONLINE_PAYMENT_LINK",
        reservationId: "res-1",
        depositAmountLkr: 25000,
        gateway: "PAYHERE",
        expiryHours: 48,
        sendSmsLink: true,
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it("rejects bank transfer when bankName is missing", () => {
      const res = validateDepositEntry({
        method: "BANK_TRANSFER_SLIP",
        reservationId: "res-1",
        depositAmountLkr: 50000,
        transferReference: "CMB-DEP-1234",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /receiving Sri Lankan bank/);
    });

    it("rejects bank transfer when reference is missing or whitespace", () => {
      const res = validateDepositEntry({
        method: "BANK_TRANSFER_SLIP",
        reservationId: "res-1",
        depositAmountLkr: 50000,
        bankName: "COMMERCIAL_BANK",
        transferReference: "  ",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /valid bank transaction/);
    });

    it("rejects bank transfer when reference is fewer than 3 characters", () => {
      const res = validateDepositEntry({
        method: "BANK_TRANSFER_SLIP",
        reservationId: "res-1",
        depositAmountLkr: 50000,
        bankName: "COMMERCIAL_BANK",
        transferReference: "12",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /valid bank transaction/);
    });

    it("accepts valid bank transfer slip payload", () => {
      const res = validateDepositEntry({
        method: "BANK_TRANSFER_SLIP",
        reservationId: "res-1",
        depositAmountLkr: 50000,
        bankName: "SAMPATH_BANK",
        transferReference: "SMP-TX-998811",
        slipAttachmentUrl: "https://storage.ceylonhms.com/slips/smp-998811.webp",
      });
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies DepositMethod union types", () => {
      const m1: DepositMethod = "ONLINE_PAYMENT_LINK";
      const m2: DepositMethod = "BANK_TRANSFER_SLIP";
      assert.ok(m1 && m2);
    });

    it("verifies OnlineGateway union types", () => {
      const gws: OnlineGateway[] = ["PAYHERE", "WEBXPAY", "COMMERCIAL_BANK_IPG"];
      assert.strictEqual(gws.length, 3);
    });

    it("verifies SriLankanBank union types", () => {
      const banks: SriLankanBank[] = [
        "COMMERCIAL_BANK",
        "SAMPATH_BANK",
        "BANK_OF_CEYLON",
        "HATTON_NATIONAL_BANK",
        "NATIONS_TRUST_BANK",
        "PEOPLES_BANK",
      ];
      assert.strictEqual(banks.length, 6);
    });

    it("verifies AdvanceDepositPayload contract with exact optional properties", () => {
      const payload: AdvanceDepositPayload = {
        method: "ONLINE_PAYMENT_LINK",
        reservationId: "res-test",
        depositAmountLkr: 40000,
        gateway: "PAYHERE",
        signedPaymentUrl: "https://pay.ceylonhms.com/checkout/payhere?order_id=1",
        expiryHours: 48,
        sendSmsLink: true,
        bankName: undefined,
        transferReference: undefined,
        slipAttachmentUrl: undefined,
        notes: undefined,
      };
      assert.strictEqual(payload.depositAmountLkr, 40000);
    });
  });

  describe("Payload Builder (buildDepositPayload)", () => {
    it("constructs payload for online payment link mode", () => {
      const payload = buildDepositPayload({
        method: "ONLINE_PAYMENT_LINK",
        reservationId: "res-test-1",
        depositAmountLkr: 50000,
        gateway: "PAYHERE",
        signedUrl: "https://pay.ceylonhms.com/checkout/payhere?order_id=res-test-1",
        expiryHours: 24,
        sendSms: true,
        bankName: "COMMERCIAL_BANK",
        transferRef: "",
        slipUrl: "",
        notes: "Urgent pre-arrival link",
      });

      assert.strictEqual(payload.method, "ONLINE_PAYMENT_LINK");
      assert.strictEqual(payload.gateway, "PAYHERE");
      assert.strictEqual(payload.bankName, undefined);
      assert.strictEqual(payload.transferReference, undefined);
      assert.strictEqual(payload.notes, "Urgent pre-arrival link");
    });

    it("constructs payload for offline bank transfer mode", () => {
      const payload = buildDepositPayload({
        method: "BANK_TRANSFER_SLIP",
        reservationId: "res-test-2",
        depositAmountLkr: 75000,
        gateway: "WEBXPAY",
        signedUrl: "https://example.com",
        expiryHours: 48,
        sendSms: false,
        bankName: "COMMERCIAL_BANK",
        transferRef: "CMB-DEP-7788",
        slipUrl: "https://storage.ceylonhms.com/slip.webp",
        notes: "",
      });

      assert.strictEqual(payload.method, "BANK_TRANSFER_SLIP");
      assert.strictEqual(payload.bankName, "COMMERCIAL_BANK");
      assert.strictEqual(payload.transferReference, "CMB-DEP-7788");
      assert.strictEqual(payload.slipAttachmentUrl, "https://storage.ceylonhms.com/slip.webp");
      assert.strictEqual(payload.gateway, undefined);
      assert.strictEqual(payload.notes, undefined);
    });
  });

  describe("Static Markup Rendering (AdvanceDepositModal)", () => {
    it("renders null when isOpen is false", () => {
      const props: AdvanceDepositModalProps = {
        isOpen: false,
        onClose: noop,
        target: SAMPLE_TARGET,
        onRecordDeposit: noop,
      };
      const html = renderToStaticMarkup(React.createElement(AdvanceDepositModal, props));
      assert.strictEqual(html, "");
    });

    it("renders modal dialog with reservation and financial overview when open", () => {
      const props: AdvanceDepositModalProps = {
        isOpen: true,
        onClose: noop,
        target: SAMPLE_TARGET,
        onRecordDeposit: noop,
      };
      const html = renderToStaticMarkup(React.createElement(AdvanceDepositModal, props));

      assert.match(html, /Advance Deposit &amp; Pre-Arrival Link/);
      assert.match(html, /KDY-RES-801/);
      assert.match(html, /Nimal Perera/);
      assert.match(html, /Earl&#x27;s Regency Kandy|Earl's Regency Kandy/);
      assert.match(html, /LKR 120,000/);
      assert.match(html, /Online Payment Link/);
      assert.match(html, /Offline Bank Transfer/);
      assert.match(html, /PayHere/);
      assert.match(html, /Send payment link via SMSGo\.lk/);
    });
  });
});
