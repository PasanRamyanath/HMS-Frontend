import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CBSL_STATUTORY_DECLARATION,
  DEFAULT_DEALER_PROFILE,
  type ForeignCurrencyCode,
  type FxAuthorizedDealerProfile,
  type FxDenominationNote,
  FxEncashmentReceipt,
  type FxEncashmentReceiptProps,
  type FxEncashmentTransaction,
  type FxGuestPassportProfile,
  type FxPayoutMode,
  type FxPurpose,
  SAMPLE_FX_TRANSACTION,
  calculateForeignTotal,
  calculateLkrPayout,
  formatBuyingRate,
  formatFxAmount,
  getCurrencySymbol,
  getPurposeLabel,
  validateNoteSerials,
} from "../src/admin/folios/FxEncashmentReceipt.js";

describe("Step 212: FxEncashmentReceipt & CBSL Foreign Currency Encashment Certificate", () => {
  describe("1. Currency Symbol & Formatters", () => {
    it("returns correct symbols for major currencies", () => {
      assert.strictEqual(getCurrencySymbol("USD"), "$");
      assert.strictEqual(getCurrencySymbol("EUR"), "€");
      assert.strictEqual(getCurrencySymbol("GBP"), "£");
      assert.strictEqual(getCurrencySymbol("JPY"), "¥");
      assert.strictEqual(getCurrencySymbol("CNY"), "¥");
      assert.strictEqual(getCurrencySymbol("AED"), "AED ");
      assert.strictEqual(getCurrencySymbol("CHF"), "CHF ");
      assert.strictEqual(getCurrencySymbol("INR"), "₹");
    });

    it("formats foreign currency amount with 2 decimal places and code", () => {
      assert.strictEqual(formatFxAmount(350, "USD"), "USD $350.00");
      assert.strictEqual(formatFxAmount(1250.5, "EUR"), "EUR €1,250.50");
      assert.strictEqual(formatFxAmount(50000, "JPY"), "JPY ¥50,000.00");
    });

    it("formats buying exchange rate with 4 decimal places", () => {
      assert.strictEqual(formatBuyingRate(304.5, "USD"), "1.00 USD = LKR 304.5000");
      assert.strictEqual(formatBuyingRate(328.7512, "EUR"), "1.00 EUR = LKR 328.7512");
    });
  });

  describe("2. Pure Calculation Helpers", () => {
    it("calculates total foreign currency across notes array", () => {
      const notes: ReadonlyArray<FxDenominationNote> = [
        { denomination: 100, count: 3, serialNumbers: ["A1", "A2", "A3"] },
        { denomination: 50, count: 2, serialNumbers: ["B1", "B2"] },
        { denomination: 20, count: 5, serialNumbers: ["C1", "C2", "C3", "C4", "C5"] },
      ];
      // 300 + 100 + 100 = 500
      assert.strictEqual(calculateForeignTotal(notes), 500);
    });

    it("ignores notes with negative or non-finite count/denomination", () => {
      const invalidNotes: ReadonlyArray<FxDenominationNote> = [
        { denomination: 100, count: 2, serialNumbers: ["A1", "A2"] },
        { denomination: Number.NaN, count: 2, serialNumbers: [] },
        { denomination: 50, count: -1, serialNumbers: [] },
      ];
      assert.strictEqual(calculateForeignTotal(invalidNotes), 200);
    });

    it("calculates LKR payout amount with half-up rounding", () => {
      // 350 USD * 304.5 LKR = 106,575.00 LKR
      assert.strictEqual(calculateLkrPayout(350, 304.5), 106575);

      // Safe checks for zero or non-finite
      assert.strictEqual(calculateLkrPayout(0, 300), 0);
      assert.strictEqual(calculateLkrPayout(100, 0), 0);
      assert.strictEqual(calculateLkrPayout(Number.NaN, 300), 0);
    });

    it("validates serial numbers array matches note count exactly", () => {
      assert.strictEqual(
        validateNoteSerials({ denomination: 100, count: 2, serialNumbers: ["SN1", "SN2"] }),
        true,
      );
      assert.strictEqual(
        validateNoteSerials({ denomination: 100, count: 2, serialNumbers: ["SN1"] }),
        false,
      );
      assert.strictEqual(
        validateNoteSerials({ denomination: 100, count: 2, serialNumbers: ["SN1", "  "] }),
        false,
      );
      assert.strictEqual(
        validateNoteSerials({ denomination: 100, count: 0, serialNumbers: [] }),
        false,
      );
    });

    it("returns human-readable label for purpose of encashment", () => {
      assert.strictEqual(
        getPurposeLabel("HOTEL_BILL_SETTLEMENT"),
        "Hotel Accommodation & Folio Settlement",
      );
      assert.strictEqual(
        getPurposeLabel("INCIDENTAL_EXPENSES"),
        "Incidental F&B / Tour / Travel Expenses",
      );
      assert.strictEqual(getPurposeLabel("PERSONAL_TRAVEL"), "Personal Expenses / Domestic Travel");
    });
  });

  describe("3. Presets & Defaults Integrity", () => {
    it("ensures default dealer profile has CBSL license and TIN", () => {
      assert.ok(DEFAULT_DEALER_PROFILE.cbslLicenseNo.startsWith("CBSL/"));
      assert.strictEqual(DEFAULT_DEALER_PROFILE.hotelTin, "102938475");
      assert.ok(DEFAULT_DEALER_PROFILE.dealerTradeName.length > 0);
    });

    it("ensures sample transaction is valid and matches serial note requirements", () => {
      assert.strictEqual(SAMPLE_FX_TRANSACTION.currency, "USD");
      assert.ok(SAMPLE_FX_TRANSACTION.notes.every(validateNoteSerials));
      assert.strictEqual(calculateForeignTotal(SAMPLE_FX_TRANSACTION.notes), 350);
      assert.strictEqual(calculateLkrPayout(350, SAMPLE_FX_TRANSACTION.buyingExchangeRate), 106575);
    });

    it("verifies CBSL statutory declaration text cites Foreign Exchange Act No. 12 of 2017", () => {
      assert.ok(CBSL_STATUTORY_DECLARATION.includes("Foreign Exchange Act, No. 12 of 2017"));
      assert.ok(CBSL_STATUTORY_DECLARATION.includes("Central Bank of Sri Lanka"));
    });
  });

  describe("4. Static Markup Rendering (FxEncashmentReceipt)", () => {
    it("renders official certificate with CBSL headers and trilingual titles", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
        }),
      );

      assert.ok(html.includes("Central Bank of Sri Lanka (CBSL)"));
      assert.ok(html.includes("Certificate of Foreign Currency Encashment"));
      assert.ok(html.includes("විදේශ මුදල් පරිවර්තන සහතිකය"));
      assert.ok(html.includes("அந்நியச் செலாவணி மாற்றச் சான்றிதழ்"));
      assert.ok(html.includes("CBSL/DFE/MC/2026/088"));
    });

    it("renders hotel dealer information and cashier shift details", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
        }),
      );

      assert.ok(html.includes("The Grand Cinnamon Resort &amp; Spa"));
      assert.ok(html.includes("102938475"));
      assert.ok(html.includes("Kumari Bandara"));
      assert.ok(html.includes("SHIFT-2026-10-19-M"));
    });

    it("renders guest passport, nationality, and room number", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
        }),
      );

      assert.ok(html.includes("Arthur Pendelton-Hayes"));
      assert.ok(html.includes("GB98234710"));
      assert.ok(html.includes("British"));
      assert.ok(html.includes("Ocean Villa 302"));
    });

    it("renders denomination notes table with serial numbers and amounts", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
        }),
      );

      assert.ok(html.includes("MB48921044A"));
      assert.ok(html.includes("MB48921045A"));
      assert.ok(html.includes("LF89230119B"));
      assert.ok(html.includes("KB39100239C"));
      assert.ok(html.includes("USD $350.00"));
      assert.ok(html.includes("1.00 USD = LKR 304.5000"));
      assert.ok(html.includes("106,575.00"));
    });

    it("renders dual signature lines for customer and cashier", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
        }),
      );

      assert.ok(html.includes("Signature of Foreign Tourist / Guest"));
      assert.ok(html.includes("Authorized Signature &amp; Official Stamp"));
    });

    it("renders custom signature images when provided", () => {
      const txWithSigs: FxEncashmentTransaction = {
        ...SAMPLE_FX_TRANSACTION,
        customerSignatureUrl: "data:image/png;base64,mockCustSig",
        cashierSignatureUrl: "data:image/png;base64,mockCashierSig",
      };

      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: txWithSigs,
        }),
      );

      assert.ok(html.includes('alt="Customer Signature"'));
      assert.ok(html.includes('alt="Cashier Signature"'));
    });

    it("hides control buttons when showControls is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: SAMPLE_FX_TRANSACTION,
          showControls: false,
        }),
      );

      assert.ok(!html.includes("Print Official Certificate"));
    });

    it("renders folio credit disbursement indicator correctly", () => {
      const folioTx: FxEncashmentTransaction = {
        ...SAMPLE_FX_TRANSACTION,
        payoutMode: "FOLIO_CREDIT",
        guest: {
          ...SAMPLE_FX_TRANSACTION.guest,
          folioId: "FOL-998811",
        },
      };

      const html = renderToStaticMarkup(
        React.createElement(FxEncashmentReceipt, {
          transaction: folioTx,
        }),
      );

      assert.ok(html.includes("Credited to Folio #FOL-998811"));
    });

    it("validates all exported types and prop interfaces compile cleanly", () => {
      const currency: ForeignCurrencyCode = "GBP";
      const mode: FxPayoutMode = "CASH_LKR";
      const purpose: FxPurpose = "INCIDENTAL_EXPENSES";
      const dealer: FxAuthorizedDealerProfile = DEFAULT_DEALER_PROFILE;
      const guest: FxGuestPassportProfile = SAMPLE_FX_TRANSACTION.guest;
      const props: FxEncashmentReceiptProps = {
        transaction: SAMPLE_FX_TRANSACTION,
      };

      assert.strictEqual(currency, "GBP");
      assert.strictEqual(mode, "CASH_LKR");
      assert.strictEqual(purpose, "INCIDENTAL_EXPENSES");
      assert.ok(dealer.hotelTin);
      assert.ok(guest.passportNumber);
      assert.ok(props.transaction.receiptNumber);
    });
  });
});
