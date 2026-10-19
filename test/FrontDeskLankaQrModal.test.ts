import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LANKAQR_MERCHANT,
  DEFAULT_QR_VALIDITY_SECONDS,
  type DigitalWalletInfo,
  FrontDeskLankaQrModal,
  type FrontDeskLankaQrModalProps,
  type LankaQrGuestContext,
  type LankaQrMerchantContext,
  type LankaQrPaymentStatus,
  type LankaQrPaymentSuccessPayload,
  type LankaQrVerificationMethod,
  SUPPORTED_DIGITAL_WALLETS,
  TRILINGUAL_PROMPTS,
  buildDynamicLankaQrString,
  calculateUsdEquivalent,
  formatTimerSeconds,
  generateLankaQrTxnRef,
} from "../src/admin/folios/FrontDeskLankaQrModal.js";

describe("Step 207: FrontDeskLankaQrModal & Dynamic LankaQR Turn-Tablet Display", () => {
  describe("1. Pure Timer Formatting Helper (formatTimerSeconds)", () => {
    it("formats 0 and negative seconds to 00:00", () => {
      assert.strictEqual(formatTimerSeconds(0), "00:00");
      assert.strictEqual(formatTimerSeconds(-10), "00:00");
    });

    it("formats sub-minute seconds with zero-padding", () => {
      assert.strictEqual(formatTimerSeconds(5), "00:05");
      assert.strictEqual(formatTimerSeconds(45), "00:45");
      assert.strictEqual(formatTimerSeconds(59), "00:59");
    });

    it("formats multiple minutes correctly", () => {
      assert.strictEqual(formatTimerSeconds(60), "01:00");
      assert.strictEqual(formatTimerSeconds(125), "02:05");
      assert.strictEqual(formatTimerSeconds(300), "05:00");
      assert.strictEqual(formatTimerSeconds(DEFAULT_QR_VALIDITY_SECONDS), "05:00");
    });

    it("floors fractional numbers safely", () => {
      assert.strictEqual(formatTimerSeconds(60.9), "01:00");
    });
  });

  describe("2. Forex Equivalent Calculator (calculateUsdEquivalent)", () => {
    it("calculates exact USD equivalent rounded to two decimal places", () => {
      // 30,550 LKR at 305.50 rate = 100.00 USD
      const usd = calculateUsdEquivalent(30550, 305.5);
      assert.strictEqual(usd, 100);

      // 45,825 LKR at 305.50 rate = 150.00 USD
      const usd2 = calculateUsdEquivalent(45825, 305.5);
      assert.strictEqual(usd2, 150);
    });

    it("handles fractional cents rounding accurately", () => {
      // 1000 LKR at 305.50 = 3.2733... -> 3.27 USD
      const usd = calculateUsdEquivalent(1000, 305.5);
      assert.strictEqual(usd, 3.27);
    });

    it("returns 0 for invalid, zero, or negative inputs", () => {
      assert.strictEqual(calculateUsdEquivalent(0, 305.5), 0);
      assert.strictEqual(calculateUsdEquivalent(-5000, 305.5), 0);
      assert.strictEqual(calculateUsdEquivalent(5000, 0), 0);
      assert.strictEqual(calculateUsdEquivalent(5000, -300), 0);
      assert.strictEqual(calculateUsdEquivalent(Number.NaN, 305.5), 0);
      assert.strictEqual(calculateUsdEquivalent(5000, Number.POSITIVE_INFINITY), 0);
    });
  });

  describe("3. Transaction Reference Generator (generateLankaQrTxnRef)", () => {
    it("generates a unique reference with default LQR prefix", () => {
      const ref = generateLankaQrTxnRef();
      assert.ok(ref.startsWith("LQR-"), `Expected prefix LQR-, got ${ref}`);
      assert.ok(ref.length >= 8);
    });

    it("supports custom prefix", () => {
      const customRef = generateLankaQrTxnRef("TXN");
      assert.ok(customRef.startsWith("TXN-"), `Expected prefix TXN-, got ${customRef}`);
    });
  });

  describe("4. EMVCo LankaQR Dynamic Payload Generation (buildDynamicLankaQrString)", () => {
    it("builds valid dynamic EMVCo payload with Tag 01 set to 12 and CRC-16", () => {
      const payload = buildDynamicLankaQrString(DEFAULT_LANKAQR_MERCHANT, 25000, "FOLIO-991");

      // Tag 00 is format indicator "01"
      assert.ok(payload.startsWith("000201"), "Payload should start with Tag 00");

      // Dynamic QR Tag 01 must be "12"
      assert.ok(
        payload.includes("010212"),
        "Payload should contain dynamic point of initiation 010212",
      );

      // Merchant account information Tag 26 with COM.LANKAQR
      assert.ok(payload.includes("COM.LANKAQR"), "Payload should include COM.LANKAQR");
      assert.ok(
        payload.includes(DEFAULT_LANKAQR_MERCHANT.merchantId),
        "Payload should include merchant ID",
      );

      // Currency 144 is LKR
      assert.ok(payload.includes("5303144"), "Payload should include LKR currency code 144");

      // Transaction amount 25000.00
      assert.ok(payload.includes("540825000.00"), "Payload should include exact formatted amount");

      // Country code LK
      assert.ok(payload.includes("5802LK"), "Payload should include country LK");

      // Merchant Name and City
      assert.ok(
        payload.includes(DEFAULT_LANKAQR_MERCHANT.merchantName.slice(0, 10)),
        "Payload should include merchant name",
      );
      assert.ok(
        payload.includes(DEFAULT_LANKAQR_MERCHANT.merchantCity),
        "Payload should include city",
      );

      // Reference Tag 62 Subtag 05
      assert.ok(payload.includes("FOLIO-991"), "Payload should include reference");

      // Checksum tag 63
      assert.ok(payload.includes("6304"), "Payload should end with 6304 followed by 4 hex chars");
      assert.strictEqual(payload.length >= 100, true);
    });
  });

  describe("5. Constants & Configuration Integrity", () => {
    it("verifies default merchant properties", () => {
      assert.strictEqual(DEFAULT_LANKAQR_MERCHANT.merchantCity, "Tangalle");
      assert.strictEqual(DEFAULT_LANKAQR_MERCHANT.mcc, "7011");
      assert.strictEqual(DEFAULT_LANKAQR_MERCHANT.cbslUsdRateLkr, 305.5);
    });

    it("verifies trilingual prompts exist in English, Sinhala, and Tamil", () => {
      assert.ok(TRILINGUAL_PROMPTS.en.length > 0);
      assert.ok(TRILINGUAL_PROMPTS.si.includes("Alipay+"));
      assert.ok(TRILINGUAL_PROMPTS.ta.includes("Alipay+"));
    });

    it("verifies supported digital wallets list Sri Lankan banks and tourist wallets", () => {
      assert.ok(SUPPORTED_DIGITAL_WALLETS.length >= 8);
      const walletIds = SUPPORTED_DIGITAL_WALLETS.map((w: DigitalWalletInfo) => w.id);
      assert.ok(walletIds.includes("combank_qplus"));
      assert.ok(walletIds.includes("sampath_wepay"));
      assert.ok(walletIds.includes("alipay_plus"));
      assert.ok(walletIds.includes("frimi_hnb"));
    });
  });

  describe("6. React Component Static Rendering (FrontDeskLankaQrModal)", () => {
    const mockGuest: LankaQrGuestContext = {
      guestFullName: "Alexander Wright",
      roomNumber: "Villa 104",
      bookingReference: "BK-2026-8910",
      folioId: "FOL-8910-A",
      dmcContractName: "Aitken Spence Travels",
    };

    const mockMerchant: LankaQrMerchantContext = {
      merchantId: "MERCH-TEST-001",
      merchantName: "Bentota Bay Heritage Villa",
      merchantCity: "Bentota",
      mcc: "7011",
      cbslUsdRateLkr: 305.5,
    };

    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskLankaQrModal, {
          isOpen: false,
          onClose: () => undefined,
          amountLkr: 52000,
          guestContext: mockGuest,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders customer-facing turn-tablet display when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskLankaQrModal, {
          isOpen: true,
          onClose: () => undefined,
          amountLkr: 52000,
          guestContext: mockGuest,
          merchantContext: mockMerchant,
          validitySeconds: 240,
        }),
      );

      // Turn-tablet badge & Hotel Branding
      assert.ok(html.includes("Guest Turn-Tablet Display"));
      assert.ok(html.includes("Bentota Bay Heritage Villa"));
      assert.ok(html.includes("Bentota, Sri Lanka"));
      assert.ok(html.includes("Villa 104"));
      assert.ok(html.includes("Alexander Wright"));

      // Status badge
      assert.ok(html.includes("AWAITING SCAN"));

      // Formatted amounts
      assert.ok(html.includes("52,000.00"));
      assert.ok(html.includes("USD"));

      // Vector QR Code SVG
      assert.ok(html.includes("<svg"));
      assert.ok(html.includes("CBSL LankaQR"));

      // Trilingual Prompts
      assert.ok(html.includes(TRILINGUAL_PROMPTS.en));
      assert.ok(html.includes(TRILINGUAL_PROMPTS.si));
      assert.ok(html.includes(TRILINGUAL_PROMPTS.ta));

      // Supported Wallets
      assert.ok(html.includes("Q+"));
      assert.ok(html.includes("WePay"));
      assert.ok(html.includes("Alipay+"));

      // Receptionist controls
      assert.ok(html.includes("Turn Back to Cashier"));
      assert.ok(html.includes("Copy Payload"));
      assert.ok(html.includes("Manual Override"));
      assert.ok(html.includes("Simulate Paid"));
    });

    it("renders success state with checkmark and details when paid", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskLankaQrModal, {
          isOpen: true,
          onClose: () => undefined,
          amountLkr: 30550,
          guestContext: mockGuest,
          merchantContext: mockMerchant,
          initialStatus: "PAID",
        }),
      );

      // In initial status PAID without internal state, header displays PAID IN FULL
      assert.ok(html.includes("PAID IN FULL"));
    });

    it("renders expired state when status is EXPIRED", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskLankaQrModal, {
          isOpen: true,
          onClose: () => undefined,
          amountLkr: 30550,
          guestContext: mockGuest,
          merchantContext: mockMerchant,
          initialStatus: "EXPIRED",
        }),
      );

      assert.ok(html.includes("EXPIRED"));
      assert.ok(html.includes("QR Code Expired"));
      assert.ok(html.includes("Regenerate QR Code"));
    });

    it("exercises typescript interfaces and types safely", () => {
      const status: LankaQrPaymentStatus = "FAILED";
      const method: LankaQrVerificationMethod = "WEBHOOK";
      const successPayload: LankaQrPaymentSuccessPayload = {
        folioId: "FOL-1",
        amountLkr: 10000,
        transactionReference: "LQR-TEST-12345",
        payerBankOrWallet: "Sampath WePay",
        paidAtIso: "2026-10-19T10:00:00Z",
        emvcoPayload: "000201010212...",
        verificationMethod: method,
        notes: "Test payload",
      };

      const props: FrontDeskLankaQrModalProps = {
        isOpen: true,
        onClose: () => undefined,
        amountLkr: 10000,
        guestContext: mockGuest,
        merchantContext: mockMerchant,
        onPaymentReceived: () => undefined,
        onPrintReceipt: () => undefined,
        initialStatus: status,
      };

      assert.strictEqual(successPayload.verificationMethod, "WEBHOOK");
      assert.strictEqual(props.amountLkr, 10000);
    });
  });
});
