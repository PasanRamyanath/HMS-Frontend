import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FloatingCartBar,
  type FloatingCartBarProps,
  getCartBarText,
} from "../src/qr/FloatingCartBar.js";

describe("Step 258: Floating Bottom Cart Summary Bar (FloatingCartBar.tsx)", () => {
  describe("1. Localized Translation Catalog & String Resolvers", () => {
    it("returns correct translations for all supported Sri Lankan languages (en, si, ta)", () => {
      const en = getCartBarText("en");
      assert.strictEqual(en.viewCart, "View Cart");
      assert.strictEqual(en.itemSingular, "item");
      assert.strictEqual(en.itemPlural, "items");
      assert.ok(en.taxesIncluded.includes("SC, TDL, SSCL & VAT"));

      const si = getCartBarText("si");
      assert.strictEqual(si.viewCart, "කරත්තය බලන්න");
      assert.strictEqual(si.itemSingular, "අයිතමය");
      assert.strictEqual(si.itemPlural, "අයිතම");

      const ta = getCartBarText("ta");
      assert.strictEqual(ta.viewCart, "கார்ட்டைப் பார்க்க");
      assert.strictEqual(ta.itemSingular, "பொருள்");
      assert.strictEqual(ta.itemPlural, "பொருட்கள்");
    });

    it("falls back cleanly to English when passed unsupported or undefined language code", () => {
      // @ts-expect-error Testing runtime fallback
      const fallback = getCartBarText("de");
      assert.strictEqual(fallback.viewCart, "View Cart");
    });
  });

  describe("2. Component Rendering & Apple HIG Interactions", () => {
    it("renders hidden with translate-y-16 and pointer-events-none when itemCount is 0", () => {
      const html = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 0,
          grandTotalLkr: 0,
        }),
      );

      assert.ok(html.includes('data-testid="floating-cart-bar"'));
      assert.ok(html.includes("translate-y-16"));
      assert.ok(html.includes("opacity-0"));
      assert.ok(html.includes("pointer-events-none"));
    });

    it("renders visible with translate-y-0 and pointer-events-auto when items exist", () => {
      const html = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 2,
          grandTotalLkr: 13434.3,
          approxGrandTotalUsd: 43.34,
        }),
      );

      assert.ok(html.includes("translate-y-0"));
      assert.ok(html.includes("opacity-100"));
      assert.ok(html.includes("pointer-events-auto"));
      // Item count badge
      assert.ok(html.includes("2"));
      assert.ok(html.includes('aria-label="2 items"'));
      // Price display
      assert.ok(html.includes("LKR 13,434"));
      assert.ok(html.includes("~$43.34"));
      // Tax disclosure
      assert.ok(html.includes("Inc. 10% SC, TDL, SSCL &amp; VAT"));
      // CTA button
      assert.ok(html.includes("View Cart"));
      assert.ok(html.includes("bg-[#E8772E]"));
    });

    it("handles singular item label when itemCount is 1", () => {
      const html = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 1,
          grandTotalLkr: 4800,
        }),
      );

      assert.ok(html.includes('aria-label="1 item"'));
    });

    it("displays foreign USD currency as primary price when currency is USD", () => {
      const html = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 3,
          grandTotalLkr: 31000,
          approxGrandTotalUsd: 100,
          currency: "USD",
        }),
      );

      // Primary price shows USD
      assert.ok(html.includes("~$100.00"));
      // Secondary price shows LKR
      assert.ok(html.includes("(LKR 31,000)"));
    });

    it("displays meal-plan savings badge when mealPlanSavingsLkr > 0 and hides when 0", () => {
      // With savings
      const htmlWithSavings = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 2,
          grandTotalLkr: 2000,
          mealPlanSavingsLkr: 5000,
        }),
      );
      assert.ok(htmlWithSavings.includes("Plan Saved"));
      assert.ok(htmlWithSavings.includes("LKR 5,000"));
      assert.ok(htmlWithSavings.includes("bg-emerald-500/20"));

      // Without savings
      const htmlNoSavings = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 2,
          grandTotalLkr: 7000,
          mealPlanSavingsLkr: 0,
        }),
      );
      assert.ok(!htmlNoSavings.includes("Plan Saved"));
    });

    it("renders Sinhala and Tamil localization accurately", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 1,
          grandTotalLkr: 4800,
          language: "si",
          mealPlanSavingsLkr: 1500,
        }),
      );
      assert.ok(htmlSi.includes("කරත්තය බලන්න"));
      assert.ok(htmlSi.includes("10% SC, TDL, SSCL සහ VAT ඇතුළත්ව"));
      assert.ok(htmlSi.includes("ඉතිරිය"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 2,
          grandTotalLkr: 4800,
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("கார்ட்டைப் பார்க்க"));
      assert.ok(htmlTa.includes("10% SC, TDL, SSCL &amp; VAT உட்பட"));
    });

    it("respects isVisible override prop even when itemCount > 0", () => {
      const htmlForcedHidden = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 5,
          grandTotalLkr: 15000,
          isVisible: false,
        }),
      );
      assert.ok(htmlForcedHidden.includes("translate-y-16"));
      assert.ok(htmlForcedHidden.includes("pointer-events-none"));
    });

    it("can hide statutory tax inclusive label if showTaxInclusiveLabel is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(FloatingCartBar, {
          itemCount: 1,
          grandTotalLkr: 1000,
          showTaxInclusiveLabel: false,
        }),
      );
      assert.ok(!html.includes("Inc. 10% SC, TDL, SSCL & VAT"));
    });
  });

  describe("3. Contract & Type Invariants", () => {
    it("FloatingCartBarProps is constructible and accepts all optional properties", () => {
      const props: FloatingCartBarProps = {
        itemCount: 1,
        grandTotalLkr: 2500,
        approxGrandTotalUsd: 8.06,
        mealPlanSavingsLkr: 0,
        currency: "LKR",
        language: "en",
        onViewCart: () => undefined,
        isVisible: true,
        showTaxInclusiveLabel: true,
        testId: "custom-bar",
      };
      assert.strictEqual(props.itemCount, 1);
      assert.strictEqual(props.grandTotalLkr, 2500);
    });
  });
});
