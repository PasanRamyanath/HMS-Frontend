import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GuestCartDrawer,
  type GuestCartDrawerProps,
  getCartDrawerText,
} from "../src/qr/GuestCartDrawer.js";
import type { CartItem, CartTaxSummary } from "../src/qr/useGuestCart.js";

const SAMPLE_SUMMARY: CartTaxSummary = {
  grossSubtotalLkr: 7300,
  mealPlanSavingsLkr: 2500,
  netBaseSupplyLkr: 4800,
  serviceChargeLkr: 480,
  subtotalAfterScLkr: 5280,
  tdlLkr: 52.8,
  ssclLkr: 132,
  vatBaseLkr: 5464.8,
  vatLkr: 983.66,
  grandTotalLkr: 6448.46,
  approxGrandTotalUsd: 20.8,
};

const SAMPLE_ITEMS: ReadonlyArray<CartItem> = [
  {
    id: "cart-item-1",
    dishId: "DISH-LAGOON-CRAB",
    name: "Lagoon Jumbo Crab Curry",
    unitBasePriceLkr: 4800,
    quantity: 1,
    selectedPortion: { id: "p-full", name: { en: "Full Portion" }, priceAdjustmentLkr: 0 },
    selectedSpiceLevel: {
      id: "sp-spicy",
      name: { en: "Sri Lankan Spicy" },
      priceAdjustmentLkr: 0,
    },
    selectedAddOns: [
      { id: "ao-katta", name: { en: "Extra Katta Sambol" }, priceAdjustmentLkr: 350 },
    ],
    dietaryPreferences: ["HALAL", "CONTAINS_SHELLFISH"],
    specialInstructions: "Make it extra fiery with fresh kochchi chillies",
    freeOnMealPlans: ["AI"],
    isMealPlanCovered: false,
    mealPlanDiscountLkr: 0,
    effectiveLineTotalLkr: 5150,
  },
  {
    id: "cart-item-2",
    dishId: "DISH-EGG-HOPPERS",
    name: "Crispy Egg Hoppers & Katta Sambol",
    unitBasePriceLkr: 2500,
    quantity: 1,
    selectedPortion: undefined,
    selectedSpiceLevel: undefined,
    selectedAddOns: [],
    dietaryPreferences: ["HALAL"],
    specialInstructions: undefined,
    freeOnMealPlans: ["HB", "FB", "AI"],
    isMealPlanCovered: true,
    mealPlanDiscountLkr: 2500,
    effectiveLineTotalLkr: 0,
  },
];

describe("Step 259: Transparent Cart & 4-Stage Statutory Tax Review Sheet (GuestCartDrawer.tsx)", () => {
  describe("1. Localized Translation Catalog & String Resolvers", () => {
    it("returns correct translations for all supported Sri Lankan languages (en, si, ta)", () => {
      const en = getCartDrawerText("en");
      assert.strictEqual(en.drawerTitle, "Your Order");
      assert.strictEqual(en.emptyCartTitle, "Your cart is empty");
      assert.ok(en.serviceCharge.includes("10% Hotel Service Charge"));
      assert.ok(en.tourismLevy.includes("1% Tourism Development Levy"));
      assert.ok(en.ssclLevy.includes("2.5% Social Security Contribution"));
      assert.ok(en.vatTax.includes("18% Value Added Tax"));

      const si = getCartDrawerText("si");
      assert.strictEqual(si.drawerTitle, "ඔබගේ ඇණවුම");
      assert.strictEqual(si.emptyCartTitle, "කරත්තය හිස්ව පවතී");
      assert.ok(si.serviceCharge.includes("10% හෝටල් සේවා ගාස්තුව"));

      const ta = getCartDrawerText("ta");
      assert.strictEqual(ta.drawerTitle, "உங்கள் ஆர்டர்");
      assert.strictEqual(ta.emptyCartTitle, "உங்கள் கார்ட் காலியாக உள்ளது");
      assert.ok(ta.serviceCharge.includes("10% ஹோட்டல் சேவைக் கட்டணம்"));
    });

    it("falls back to English when passed unsupported language code", () => {
      // @ts-expect-error Testing fallback
      const fallback = getCartDrawerText("fr");
      assert.strictEqual(fallback.drawerTitle, "Your Order");
    });
  });

  describe("2. Component Static Rendering & Interactions", () => {
    it("renders empty cart illustration and browse button when items array is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCartDrawer, {
          isOpen: true,
          items: [],
          summary: {
            ...SAMPLE_SUMMARY,
            grossSubtotalLkr: 0,
            grandTotalLkr: 0,
            approxGrandTotalUsd: 0,
          },
          onIncrementItem: () => undefined,
          onDecrementItem: () => undefined,
          onRemoveItem: () => undefined,
          onClose: () => undefined,
        }),
      );

      assert.ok(html.includes('data-testid="guest-cart-drawer"'));
      assert.ok(html.includes("Your cart is empty"));
      assert.ok(html.includes("Browse Menu"));
      assert.ok(!html.includes("Proceed to Checkout"));
    });

    it("renders itemized cart with portions, spice, add-ons, and steppers when items are present", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCartDrawer, {
          isOpen: true,
          items: SAMPLE_ITEMS,
          summary: SAMPLE_SUMMARY,
          onIncrementItem: () => undefined,
          onDecrementItem: () => undefined,
          onRemoveItem: () => undefined,
          onClearCart: () => undefined,
          onClose: () => undefined,
        }),
      );

      // Header shows item count
      assert.ok(html.includes("Your Order (2)"));
      assert.ok(html.includes("Clear Cart"));

      // Items list
      assert.ok(html.includes("Lagoon Jumbo Crab Curry"));
      assert.ok(html.includes("Portion:"));
      assert.ok(html.includes("Full Portion"));
      assert.ok(html.includes("Spice:"));
      assert.ok(html.includes("Sri Lankan Spicy"));
      assert.ok(html.includes("Add-ons:"));
      assert.ok(html.includes("Extra Katta Sambol"));
      assert.ok(html.includes("Make it extra fiery with fresh kochchi chillies"));

      // Meal-Plan item display
      assert.ok(html.includes("Crispy Egg Hoppers &amp; Katta Sambol"));
      assert.ok(html.includes("Free on Meal Plan"));

      // Quantity buttons
      assert.ok(html.includes('aria-label="Increase Lagoon Jumbo Crab Curry"'));
      assert.ok(html.includes('aria-label="Decrease Lagoon Jumbo Crab Curry"'));
    });

    it("renders 4-stage compounding statutory taxes without hiding any government levy", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestCartDrawer, {
          isOpen: true,
          items: SAMPLE_ITEMS,
          summary: SAMPLE_SUMMARY,
          onIncrementItem: () => undefined,
          onDecrementItem: () => undefined,
          onRemoveItem: () => undefined,
          onClose: () => undefined,
        }),
      );

      // Accordion Title
      assert.ok(html.includes("Statutory Tax &amp; Service Charge Breakdown"));

      // Base
      assert.ok(html.includes("Net Food &amp; Beverage Base"));
      assert.ok(html.includes("LKR 7,300"));

      // Meal-Plan Savings
      assert.ok(html.includes("Meal-Plan Allowance Savings"));
      assert.ok(html.includes("−LKR 2,500"));

      // 10% SC
      assert.ok(html.includes("10% Hotel Service Charge (Staff SC)"));
      assert.ok(html.includes("+LKR 480"));

      // 1% TDL
      assert.ok(html.includes("1% Tourism Development Levy (SLTDA)"));
      assert.ok(html.includes("+LKR 53")); // rounded LKR 52.80 -> LKR 53

      // 2.5% SSCL
      assert.ok(html.includes("2.5% Social Security Contribution (SSCL)"));
      assert.ok(html.includes("+LKR 132"));

      // 18% VAT
      assert.ok(html.includes("18% Value Added Tax (Statutory VAT)"));
      assert.ok(html.includes("+LKR 984")); // rounded 983.66 -> LKR 984

      // Sticky Footer Grand Total
      assert.ok(html.includes("Total Payable"));
      assert.ok(html.includes("LKR 6,448"));
      assert.ok(html.includes("Proceed to Checkout"));
    });

    it("renders accurately in Sinhala and Tamil language modes", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(GuestCartDrawer, {
          isOpen: true,
          items: SAMPLE_ITEMS,
          summary: SAMPLE_SUMMARY,
          language: "si",
          onIncrementItem: () => undefined,
          onDecrementItem: () => undefined,
          onRemoveItem: () => undefined,
          onClearCart: () => undefined,
          onClose: () => undefined,
        }),
      );
      assert.ok(htmlSi.includes("ඔබගේ ඇණවුම"));
      assert.ok(htmlSi.includes("කරත්තය හිස් කරන්න"));
      assert.ok(htmlSi.includes("10% හෝටල් සේවා ගාස්තුව (SC)"));
      assert.ok(htmlSi.includes("ඇණවුම ඉදිරියට ගෙනයන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(GuestCartDrawer, {
          isOpen: true,
          items: SAMPLE_ITEMS,
          summary: SAMPLE_SUMMARY,
          language: "ta",
          onIncrementItem: () => undefined,
          onDecrementItem: () => undefined,
          onRemoveItem: () => undefined,
          onClearCart: () => undefined,
          onClose: () => undefined,
        }),
      );
      assert.ok(htmlTa.includes("உங்கள் ஆர்டர்"));
      assert.ok(htmlTa.includes("கார்ட்டை அழிக்கவும்"));
      assert.ok(htmlTa.includes("10% ஹோட்டல் சேவைக் கட்டணம் (SC)"));
      assert.ok(htmlTa.includes("தொடரவும்"));
    });
  });

  describe("3. Contract & Type Invariants", () => {
    it("GuestCartDrawerProps is cleanly constructible and strictly typed", () => {
      const props: GuestCartDrawerProps = {
        isOpen: true,
        items: SAMPLE_ITEMS,
        summary: SAMPLE_SUMMARY,
        guestMealPlan: "HB",
        currency: "LKR",
        language: "en",
        onIncrementItem: () => undefined,
        onDecrementItem: () => undefined,
        onRemoveItem: () => undefined,
        onClearCart: () => undefined,
        onClose: () => undefined,
        onProceedToCheckout: () => undefined,
        testId: "custom-cart-drawer",
      };
      assert.strictEqual(props.items.length, 2);
      assert.strictEqual(props.guestMealPlan, "HB");
    });
  });
});
