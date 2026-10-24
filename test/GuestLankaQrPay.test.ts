import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BankAppBadge,
  type CheckoutPaymentMethod,
  GuestLankaQrPay,
  type GuestLankaQrPayProps,
  type GuestPaymentResult,
  SUPPORTED_BANK_APPS,
  generatePaymentReference,
  getLankaQrPayText,
} from "../src/qr/GuestLankaQrPay.js";

describe("Step 261: Instant LankaQR & Alipay+ Scan-to-Pay Checkout View (GuestLankaQrPay.tsx)", () => {
  describe("1. Pure Payment Reference Generator", () => {
    it("generates structured LQR references with location tag", () => {
      const ref1 = generatePaymentReference("Table 04");
      assert.match(ref1, /^LQR-TABLE0-[A-Z0-9]+$/);

      const ref2 = generatePaymentReference("Pool Cabana #2");
      assert.match(ref2, /^LQR-POOLCA-[A-Z0-9]+$/);

      const refEmpty = generatePaymentReference("!@#$");
      assert.match(refEmpty, /^LQR-TBL-[A-Z0-9]+$/);
    });
  });

  describe("2. Trilingual Localization Catalog", () => {
    it("returns correct translations for English, Sinhala, and Tamil", () => {
      const en = getLankaQrPayText("en");
      assert.strictEqual(en.title, "Instant LankaQR Scan & Pay");
      assert.strictEqual(en.copyReference, "Copy Reference");
      assert.strictEqual(en.secureCbslBadge, "Central Bank of Sri Lanka Certified LankaQR");

      const si = getLankaQrPayText("si");
      assert.strictEqual(si.title, "ක්ෂණික LankaQR මඟින් ගෙවන්න");
      assert.strictEqual(si.copyReference, "අංකය පිටපත් කරන්න");
      assert.strictEqual(si.secureCbslBadge, "ශ්රී ලංකා මහ බැංකුව විසින් සහතික කළ LankaQR");

      const ta = getLankaQrPayText("ta");
      assert.strictEqual(ta.title, "உடனடி LankaQR ஸ்கேன் & கட்டணம்");
      assert.strictEqual(ta.copyReference, "குறிப்பை நகலெடு");
      assert.strictEqual(ta.secureCbslBadge, "இலங்கை மத்திய வங்கியால் சான்றளிக்கப்பட்ட LankaQR");
    });
  });

  describe("3. Supported Bank Apps & Wallets", () => {
    it("includes major Sri Lankan LankaQR certified mobile apps and Alipay+", () => {
      const appNames = SUPPORTED_BANK_APPS.map((a: BankAppBadge) => a.name);
      assert.ok(appNames.includes("CombBank Flash"));
      assert.ok(appNames.includes("Sampath WePay"));
      assert.ok(appNames.includes("BOC SmartPay"));
      assert.ok(appNames.includes("HNB SOLO"));
      assert.ok(appNames.includes("NTB FriMi"));
      assert.ok(appNames.includes("LOLC iPay"));
      assert.ok(appNames.includes("Alipay+"));
    });
  });

  describe("4. Static Markup Rendering", () => {
    it("renders dynamic LankaQR SVG with payable amount and merchant info", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestLankaQrPay, {
          locationName: "Table 12",
          amountLkr: 6450,
          merchantName: "Galle Fort Lighthouse Villa",
          merchantCity: "Galle",
          language: "en",
          onPaymentSuccess: () => {
            /* noop */
          },
        }),
      );

      // Contains root testid
      assert.ok(html.includes('data-testid="guest-lanka-qr-pay"'));

      // Contains formatted LKR amount (6,450.00)
      assert.ok(html.includes("6,450.00"));

      // Contains location name
      assert.ok(html.includes("Table 12"));

      // Contains CBSL badge
      assert.ok(html.includes("Central Bank of Sri Lanka Certified LankaQR"));

      // Contains embedded SVG elements
      assert.ok(html.includes("<svg"));

      // Contains bank badges
      assert.ok(html.includes("CombBank Flash"));
      assert.ok(html.includes("Alipay+"));

      // Contains copy reference button
      assert.ok(html.includes("Copy Reference"));
    });

    it("renders in Sinhala language correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestLankaQrPay, {
          locationName: "Cabana 03",
          amountLkr: 12500,
          language: "si",
          onPaymentSuccess: () => {
            /* noop */
          },
        }),
      );

      assert.ok(html.includes("ක්ෂණික LankaQR මඟින් ගෙවන්න"));
      assert.ok(html.includes("12,500.00"));
      assert.ok(html.includes("ශ්රී ලංකා මහ බැංකුව"));
    });
  });

  describe("5. TypeScript Interface Constructibility", () => {
    it("constructs type-safe payment result object", () => {
      const method: CheckoutPaymentMethod = "LANKA_QR";
      const result: GuestPaymentResult = {
        paymentMethod: method,
        referenceId: "LQR-TBL04-12345",
        amountLkr: 4800,
        paidAt: "2026-10-19T10:00:00Z",
        transactionId: "TXN-987654",
      };

      assert.strictEqual(result.paymentMethod, "LANKA_QR");
      assert.strictEqual(result.amountLkr, 4800);
    });

    it("constructs valid props structure", () => {
      const props: GuestLankaQrPayProps = {
        locationName: "Bar Counter 2",
        amountLkr: 3200,
        merchantId: "000000000099999",
        merchantName: "Bentota Surf Club",
        merchantCity: "Bentota",
        referenceId: "LQR-BAR02-REF01",
        language: "ta",
        onPaymentSuccess: () => {
          /* noop */
        },
        onCancel: () => {
          /* noop */
        },
        testId: "custom-qr-pay-testid",
      };

      assert.strictEqual(props.locationName, "Bar Counter 2");
      assert.strictEqual(props.testId, "custom-qr-pay-testid");
    });
  });
});
