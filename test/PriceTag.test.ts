import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_CBSL_USD_RATE,
  type PriceCurrency,
  PriceTag,
  type PriceTagLayout,
  type PriceTagProps,
  type PriceTagSize,
  convertLkrToUsd,
  formatUsd,
  getPriceSizeClasses,
} from "../src/components/PriceTag.js";

describe("Tabular-Numeral Dual-Currency Price Component (PriceTag.tsx)", () => {
  describe("Currency Formatting & Conversion Utilities", () => {
    it("formats USD currency with dollar sign and suffix", () => {
      assert.strictEqual(formatUsd(335.857), "$335.86 USD");
      assert.strictEqual(formatUsd(10), "$10.00 USD");
      assert.strictEqual(formatUsd(0), "$0.00 USD");
    });

    it("converts LKR to USD accurately using benchmark rate", () => {
      assert.strictEqual(convertLkrToUsd(30000, 300), 100);
      assert.strictEqual(convertLkrToUsd(15000), 50); // uses DEFAULT_CBSL_USD_RATE = 300
      assert.strictEqual(convertLkrToUsd(10000, 0), 0);
      assert.strictEqual(convertLkrToUsd(10000, -5), 0);
    });

    it("returns correct sizing classes across sizes", () => {
      const sm = getPriceSizeClasses("sm");
      assert.ok(sm.primary.includes("text-sm"));

      const md = getPriceSizeClasses("md");
      assert.ok(md.primary.includes("text-lg"));

      const lg = getPriceSizeClasses("lg");
      assert.ok(lg.primary.includes("text-2xl"));

      const xl = getPriceSizeClasses("xl");
      assert.ok(xl.primary.includes("text-3xl"));

      const fallback = getPriceSizeClasses(undefined);
      assert.ok(fallback.primary.includes("text-lg"));
    });
  });

  describe("Static HTML Markup Rendering", () => {
    it("renders primary LKR price with tabular-nums-lkr and secondary USD price", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 100757.25,
          cbslUsdRate: 300.0,
        }),
      );

      assert.ok(markup.includes("tabular-nums-lkr"));
      assert.ok(markup.includes("LKR 100,757.25"));
      assert.ok(markup.includes("~$335.86 USD"));
    });

    it("renders inline layout and period label", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 45000,
          layout: "inline",
          periodLabel: "/ night",
        }),
      );

      assert.ok(markup.includes("items-baseline gap-2"));
      assert.ok(markup.includes("LKR 45,000.00"));
      assert.ok(markup.includes("/ night"));
      assert.ok(markup.includes("~$150.00 USD"));
    });

    it("omits secondary currency when layout is compact or showSecondary is false", () => {
      const compactMarkup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 12500,
          layout: "compact",
        }),
      );
      assert.ok(compactMarkup.includes("LKR 12,500.00"));
      assert.ok(!compactMarkup.includes("USD"));

      const noSecondaryMarkup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 12500,
          showSecondary: false,
        }),
      );
      assert.ok(!noSecondaryMarkup.includes("USD"));
    });

    it("renders discount badge and strikethrough styling", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 50000,
          strikethrough: true,
          discountPercent: 20,
        }),
      );

      assert.ok(markup.includes("line-through"));
      assert.ok(markup.includes("-20%"));
    });

    it("renders USD as primary currency when requested", () => {
      const markup = renderToStaticMarkup(
        React.createElement(PriceTag, {
          amountLkr: 60000,
          cbslUsdRate: 300,
          primaryCurrency: "USD",
        }),
      );

      assert.ok(markup.includes("$200.00 USD"));
      assert.ok(markup.includes("~LKR 60,000.00"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const _curr: PriceCurrency = "LKR";
      const _size: PriceTagSize = "xl";
      const _layout: PriceTagLayout = "stacked";

      const _props: PriceTagProps = {
        amountLkr: 85000,
        cbslUsdRate: DEFAULT_CBSL_USD_RATE,
        primaryCurrency: _curr,
        showSecondary: true,
        layout: _layout,
        size: _size,
        strikethrough: false,
        discountPercent: 10,
        periodLabel: "/ day",
        className: "custom-price-tag",
      };

      assert.strictEqual(_props.amountLkr, 85000);
      assert.strictEqual(_props.primaryCurrency, "LKR");
      assert.strictEqual(_props.size, "xl");
      assert.strictEqual(_props.layout, "stacked");
    });
  });
});
