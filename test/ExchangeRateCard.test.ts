import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_EXCHANGE_RATES,
  ExchangeRateCard,
  type ExchangeRateCardProps,
  type ExchangeRateConfig,
  type SupportedForeignCurrency,
  convertForeignToLkr,
  convertLkrToForeign,
  formatForeignCurrency,
  roundCents,
  validateExchangeRates,
} from "../src/admin/settings/ExchangeRateCard.js";

describe("Central Bank of Sri Lanka (CBSL) Exchange Rate Manager (ExchangeRateCard.tsx)", () => {
  describe("Mathematical Conversions & Currency Formatting", () => {
    it("converts foreign currency to LKR accurately with cent precision", () => {
      // 100 USD @ 304.50 = Rs 30,450.00
      const lkrFromUsd = convertForeignToLkr(100, 304.5);
      assert.equal(lkrFromUsd, 30450);

      // 50 EUR @ 331.25 = Rs 16,562.50
      const lkrFromEur = convertForeignToLkr(50, 331.25);
      assert.equal(lkrFromEur, 16562.5);

      // 75.25 GBP @ 388.70 = Rs 29,249.68
      const lkrFromGbp = convertForeignToLkr(75.25, 388.7);
      assert.equal(lkrFromGbp, 29249.68);
    });

    it("converts LKR to foreign currency accurately", () => {
      // Rs 30,450 / 304.50 = 100 USD
      const usdFromLkr = convertLkrToForeign(30450, 304.5);
      assert.equal(usdFromLkr, 100);

      // Rs 100,000 / 331.25 = 301.89 EUR
      const eurFromLkr = convertLkrToForeign(100000, 331.25);
      assert.equal(eurFromLkr, 301.89);
    });

    it("handles zero or negative conversions safely without NaN", () => {
      assert.equal(convertForeignToLkr(0, 300), 0);
      assert.equal(convertForeignToLkr(-50, 300), 0);
      assert.equal(convertForeignToLkr(100, 0), 0);
      assert.equal(convertForeignToLkr(100, -1), 0);

      assert.equal(convertLkrToForeign(0, 300), 0);
      assert.equal(convertLkrToForeign(-1000, 300), 0);
      assert.equal(convertLkrToForeign(1000, 0), 0);
    });

    it("formats foreign currency with standard ISO symbols and code suffixes", () => {
      assert.equal(formatForeignCurrency(100, "USD"), "$100.00 USD");
      assert.equal(formatForeignCurrency(250.5, "EUR"), "€250.50 EUR");
      assert.equal(formatForeignCurrency(1234.56, "GBP"), "£1,234.56 GBP");
    });

    it("rounds cents with roundCents helper", () => {
      assert.equal(roundCents(123.456), 123.46);
      assert.equal(roundCents(123.454), 123.45);
    });
  });

  describe("Validation Logic (validateExchangeRates)", () => {
    it("returns zero errors for default CBSL rates", () => {
      const errors = validateExchangeRates(DEFAULT_EXCHANGE_RATES);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when USD rate is out of realistic Sri Lankan rupee range", () => {
      const invalidLow: ExchangeRateConfig = {
        ...DEFAULT_EXCHANGE_RATES,
        cbslUsdRateLkr: 50,
      };
      const errorsLow = validateExchangeRates(invalidLow);
      assert.ok(errorsLow.cbslUsdRateLkr, "Should reject USD < 100");

      const invalidHigh: ExchangeRateConfig = {
        ...DEFAULT_EXCHANGE_RATES,
        cbslUsdRateLkr: 1500,
      };
      const errorsHigh = validateExchangeRates(invalidHigh);
      assert.ok(errorsHigh.cbslUsdRateLkr, "Should reject USD > 1000");
    });

    it("flags error when EUR or GBP rate is invalid", () => {
      const invalidEur: ExchangeRateConfig = {
        ...DEFAULT_EXCHANGE_RATES,
        cbslEurRateLkr: 0,
      };
      const errorsEur = validateExchangeRates(invalidEur);
      assert.ok(errorsEur.cbslEurRateLkr, "Should reject non-positive EUR");

      const invalidGbp: ExchangeRateConfig = {
        ...DEFAULT_EXCHANGE_RATES,
        cbslGbpRateLkr: -10,
      };
      const errorsGbp = validateExchangeRates(invalidGbp);
      assert.ok(errorsGbp.cbslGbpRateLkr, "Should reject negative GBP");
    });
  });

  describe("Component Static Rendering & Types", () => {
    it("renders CBSL exchange rates card with currency cards and calculator", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExchangeRateCard, {
          initialRates: DEFAULT_EXCHANGE_RATES,
        }),
      );

      assert.ok(html.includes("Central Bank of Sri Lanka (CBSL) Exchange Rates"));
      assert.ok(html.includes("US Dollar"));
      assert.ok(html.includes("Euro"));
      assert.ok(html.includes("British Pound"));
      assert.ok(html.includes("304.5"));
      assert.ok(html.includes("331.25"));
      assert.ok(html.includes("388.7"));
      assert.ok(html.includes("Manual Rate Override"));
      assert.ok(html.includes("Interactive Folio Currency Converter"));
    });

    it("accepts valid props and constructs exported types cleanly", () => {
      const props: ExchangeRateCardProps = {
        initialRates: DEFAULT_EXCHANGE_RATES,
        readOnly: true,
      };
      assert.equal(props.readOnly, true);

      const curr: SupportedForeignCurrency = "EUR";
      assert.equal(curr, "EUR");
    });
  });
});
