import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ALL_MEAL_PLANS,
  BankPromoManager,
  type BankPromoManagerProps,
  type BankPromoOffer,
  BankPromoOfferCard,
  DEFAULT_BANK_PROMO_OFFERS,
  PROMO_TAB_OPTIONS,
  type PromoFilterTab,
  type PromoFormData,
  SRI_LANKAN_BANKS,
  type SriLankanBank,
  buildOfferFromForm,
  computePromoMetrics,
  filterPromoOffers,
  getOfferBadgeDetails,
  validatePromoFormData,
} from "../src/admin/channels/BankPromoManager.js";

const noop = () => {
  // Static render callback placeholder
};

describe("Sri Lankan Bank Promotion & Coupon Manager (BankPromoManager.tsx)", () => {
  const sampleOffers: ReadonlyArray<BankPromoOffer> = [
    {
      id: "promo-sampath-test",
      title: "Sampath Cards 25% Off Full Board & Half Board Stays",
      description: "Exclusive 25% discount for Sampath Platinum cardholders.",
      promoType: "BANK_CARD_BIN",
      bank: "SAMPATH",
      binPrefixes: ["406175", "453267"],
      discountType: "PERCENTAGE",
      discountValue: 25,
      maxDiscountCapLkr: 35000,
      validFrom: "2026-11-01",
      validUntil: "2026-12-15",
      blackoutDates: ["2026-11-23"],
      eligibleMealPlans: ["HB", "FB"],
      minNights: 2,
      isActive: true,
      currentRedemptions: 40,
      maxRedemptions: 100,
      totalDiscountLkr: 1000000,
      totalDirectRevenueLkr: 4000000,
    },
    {
      id: "promo-combank-test",
      title: "ComBank 20% Off Weekend Escapes",
      promoType: "BANK_CARD_BIN",
      bank: "COMMERCIAL",
      binPrefixes: ["401245"],
      discountType: "PERCENTAGE",
      discountValue: 20,
      validFrom: "2026-11-01",
      validUntil: "2026-11-30",
      blackoutDates: [],
      eligibleMealPlans: ["BB", "HB", "FB"],
      minNights: 1,
      isActive: true,
      currentRedemptions: 20,
      totalDiscountLkr: 400000,
      totalDirectRevenueLkr: 2000000,
    },
    {
      id: "promo-direct-coupon-test",
      title: "Direct Guest Welcome Coupon",
      promoType: "PROMO_COUPON",
      promoCode: "DIRECT15",
      binPrefixes: [],
      discountType: "PERCENTAGE",
      discountValue: 15,
      maxDiscountCapLkr: 15000,
      validFrom: "2026-10-01",
      validUntil: "2026-12-31",
      blackoutDates: [],
      eligibleMealPlans: ["RO", "BB", "HB", "FB"],
      minNights: 1,
      isActive: false, // Paused
      currentRedemptions: 10,
      totalDiscountLkr: 150000,
      totalDirectRevenueLkr: 1000000,
    },
  ];

  describe("1. Bank Presets & Metadata Standards", () => {
    it("configures 8 major Sri Lankan banks with default 6-digit BIN prefixes", () => {
      const bankKeys = Object.keys(SRI_LANKAN_BANKS) as SriLankanBank[];
      assert.strictEqual(bankKeys.length, 8);
      assert.ok(bankKeys.includes("SAMPATH"));
      assert.ok(bankKeys.includes("COMMERCIAL"));
      assert.ok(bankKeys.includes("HNB"));
      assert.ok(bankKeys.includes("DFCC"));
      assert.ok(bankKeys.includes("NDB"));
      assert.ok(bankKeys.includes("BOC"));
      assert.ok(bankKeys.includes("PEOPLES"));
      assert.ok(bankKeys.includes("NTB_AMEX"));

      for (const key of bankKeys) {
        const meta = SRI_LANKAN_BANKS[key];
        assert.ok(meta.displayName.length > 0);
        assert.ok(meta.defaultBins.length > 0);
        for (const bin of meta.defaultBins) {
          assert.strictEqual(bin.length, 6, `BIN ${bin} must be 6 digits`);
        }
      }
    });

    it("verifies default promo offers include bank promotions and direct coupons", () => {
      assert.ok(DEFAULT_BANK_PROMO_OFFERS.length >= 6);
      const sampath = DEFAULT_BANK_PROMO_OFFERS.find((o) => o.bank === "SAMPATH");
      assert.ok(sampath);
      assert.strictEqual(sampath.discountValue, 25);
      assert.deepStrictEqual(sampath.eligibleMealPlans, ["HB", "FB"]);

      const coupon = DEFAULT_BANK_PROMO_OFFERS.find((o) => o.promoType === "PROMO_COUPON");
      assert.ok(coupon);
      assert.strictEqual(coupon.promoCode, "DIRECT15");
    });

    it("provides the 5 standard filter tabs", () => {
      assert.strictEqual(PROMO_TAB_OPTIONS.length, 5);
      const tabIds = PROMO_TAB_OPTIONS.map((t) => t.id);
      assert.deepStrictEqual(tabIds, ["ALL", "BANK_CARDS", "PROMO_COUPONS", "ACTIVE", "PAUSED"]);
    });

    it("lists all 4 Sri Lankan hospitality meal plans", () => {
      assert.deepStrictEqual(ALL_MEAL_PLANS, ["RO", "BB", "HB", "FB"]);
    });
  });

  describe("2. Pure Metrics & Aggregation Engine", () => {
    it("computes totals for active count, redemptions, direct revenue, and discount given", () => {
      const metrics = computePromoMetrics(sampleOffers);
      assert.strictEqual(metrics.totalOffers, 3);
      assert.strictEqual(metrics.activeOffers, 2);
      assert.strictEqual(metrics.totalRedemptions, 70); // 40 + 20 + 10
      assert.strictEqual(metrics.totalDiscountLkr, 1550000); // 1M + 400k + 150k
      assert.strictEqual(metrics.totalDirectRevenueLkr, 7000000); // 4M + 2M + 1M
      // Average discount: (25 + 20 + 15) / 3 = 20%
      assert.strictEqual(metrics.averageDiscountRatePercent, 20);
    });

    it("handles empty offer list gracefully", () => {
      const metrics = computePromoMetrics([]);
      assert.strictEqual(metrics.totalOffers, 0);
      assert.strictEqual(metrics.activeOffers, 0);
      assert.strictEqual(metrics.totalRedemptions, 0);
      assert.strictEqual(metrics.totalDiscountLkr, 0);
      assert.strictEqual(metrics.totalDirectRevenueLkr, 0);
      assert.strictEqual(metrics.averageDiscountRatePercent, 0);
    });
  });

  describe("3. Multi-Axis Filtering Engine", () => {
    it("filters by tab selection", () => {
      const selectedTab: PromoFilterTab = "BANK_CARDS";
      const bankOnly = filterPromoOffers(sampleOffers, selectedTab, "ALL", "");
      assert.strictEqual(bankOnly.length, 2);
      assert.ok(bankOnly.every((o) => o.promoType === "BANK_CARD_BIN"));

      const couponTab: PromoFilterTab = "PROMO_COUPONS";
      const couponsOnly = filterPromoOffers(sampleOffers, couponTab, "ALL", "");
      assert.strictEqual(couponsOnly.length, 1);
      const firstCoupon = couponsOnly[0];
      assert.ok(firstCoupon);
      assert.strictEqual(firstCoupon.promoCode, "DIRECT15");

      const activeOnly = filterPromoOffers(sampleOffers, "ACTIVE", "ALL", "");
      assert.strictEqual(activeOnly.length, 2);

      const pausedOnly = filterPromoOffers(sampleOffers, "PAUSED", "ALL", "");
      assert.strictEqual(pausedOnly.length, 1);
      const firstPaused = pausedOnly[0];
      assert.ok(firstPaused);
      assert.strictEqual(firstPaused.id, "promo-direct-coupon-test");
    });

    it("filters by partner bank", () => {
      const sampathOnly = filterPromoOffers(sampleOffers, "ALL", "SAMPATH", "");
      assert.strictEqual(sampathOnly.length, 1);
      const firstSampath = sampathOnly[0];
      assert.ok(firstSampath);
      assert.strictEqual(firstSampath.bank, "SAMPATH");

      const hnbOnly = filterPromoOffers(sampleOffers, "ALL", "HNB", "");
      assert.strictEqual(hnbOnly.length, 0);
    });

    it("filters by search query matching title, promo code, bank, or card BIN", () => {
      // By title keyword
      const byTitle = filterPromoOffers(sampleOffers, "ALL", "ALL", "Escapes");
      assert.strictEqual(byTitle.length, 1);
      const firstByTitle = byTitle[0];
      assert.ok(firstByTitle);
      assert.strictEqual(firstByTitle.id, "promo-combank-test");

      // By promo coupon code
      const byCode = filterPromoOffers(sampleOffers, "ALL", "ALL", "DIRECT15");
      assert.strictEqual(byCode.length, 1);

      // By card BIN prefix
      const byBin = filterPromoOffers(sampleOffers, "ALL", "ALL", "406175");
      assert.strictEqual(byBin.length, 1);
      const firstByBin = byBin[0];
      assert.ok(firstByBin);
      assert.strictEqual(firstByBin.id, "promo-sampath-test");
    });
  });

  describe("4. Form Validation & Domain Building", () => {
    const validBankForm: PromoFormData = {
      title: "Sampath Bank Weekend 20% Off",
      description: "Weekend promo",
      promoType: "BANK_CARD_BIN",
      bank: "SAMPATH",
      binPrefixes: "406175, 453267",
      promoCode: "",
      discountType: "PERCENTAGE",
      discountValue: 20,
      maxDiscountCapLkr: "30000",
      validFrom: "2026-11-01",
      validUntil: "2026-11-30",
      blackoutDates: "2026-11-23",
      eligibleMealPlans: ["HB", "FB"],
      minNights: 2,
      maxRedemptions: "50",
      isActive: true,
    };

    it("validates successful promo form without errors", () => {
      const error = validatePromoFormData(validBankForm);
      assert.strictEqual(error, null);
    });

    it("rejects empty title", () => {
      const error = validatePromoFormData({ ...validBankForm, title: "  " });
      assert.strictEqual(error, "Promotion title is required.");
    });

    it("rejects zero or negative discount value", () => {
      const error = validatePromoFormData({ ...validBankForm, discountValue: 0 });
      assert.strictEqual(error, "Discount value must be greater than zero.");
    });

    it("rejects percentage discount greater than 100%", () => {
      const error = validatePromoFormData({ ...validBankForm, discountValue: 125 });
      assert.strictEqual(error, "Percentage discount cannot exceed 100%.");
    });

    it("rejects inverted validity dates", () => {
      const error = validatePromoFormData({
        ...validBankForm,
        validFrom: "2026-12-01",
        validUntil: "2026-11-01",
      });
      assert.strictEqual(error, "Valid from date cannot be after valid until date.");
    });

    it("rejects bank promo offer without card BINs", () => {
      const error = validatePromoFormData({ ...validBankForm, binPrefixes: " " });
      assert.strictEqual(error, "At least one card BIN prefix (6 digits) is required.");
    });

    it("rejects coupon promo offer without coupon code", () => {
      const error = validatePromoFormData({
        ...validBankForm,
        promoType: "PROMO_COUPON",
        promoCode: "  ",
      });
      assert.strictEqual(error, "Promo coupon code is required.");
    });

    it("rejects empty eligible meal plans", () => {
      const error = validatePromoFormData({ ...validBankForm, eligibleMealPlans: [] });
      assert.strictEqual(error, "Select at least one eligible meal plan.");
    });

    it("builds clean BankPromoOffer from form data parsing numbers and BINs", () => {
      const offer = buildOfferFromForm(validBankForm);
      assert.strictEqual(offer.title, "Sampath Bank Weekend 20% Off");
      assert.strictEqual(offer.promoType, "BANK_CARD_BIN");
      assert.strictEqual(offer.bank, "SAMPATH");
      assert.deepStrictEqual(offer.binPrefixes, ["406175", "453267"]);
      assert.strictEqual(offer.discountValue, 20);
      assert.strictEqual(offer.maxDiscountCapLkr, 30000);
      assert.strictEqual(offer.minNights, 2);
      assert.strictEqual(offer.maxRedemptions, 50);
      assert.strictEqual(offer.currentRedemptions, 0);
      assert.strictEqual(offer.isActive, true);
    });
  });

  describe("5. Component Static Markup Rendering", () => {
    it("renders BankPromoManager with top KPI metrics, filters, and promo cards", () => {
      const props: BankPromoManagerProps = {
        initialOffers: sampleOffers,
        onSaveOffer: noop,
        onToggleActive: noop,
        onDeleteOffer: noop,
      };
      const html = renderToStaticMarkup(React.createElement(BankPromoManager, props));

      // Header title & button
      assert.ok(html.includes("Bank Card &amp; Direct Promo Offers"));
      assert.ok(html.includes("New Promotion Offer"));

      // Bento KPI grid
      assert.ok(html.includes("Active Bank Offers"));
      assert.ok(html.includes("Direct Redemptions"));
      assert.ok(html.includes("Direct Revenue Locked"));
      assert.ok(html.includes("Guest Discounts Passed"));

      // Offers
      assert.ok(html.includes("Sampath Cards 25% Off Full Board &amp; Half Board Stays"));
      assert.ok(html.includes("ComBank 20% Off Weekend Escapes"));
      assert.ok(html.includes("Direct Guest Welcome Coupon"));

      // Discount badges
      assert.ok(html.includes("25% OFF"));
      assert.ok(html.includes("20% OFF"));
      assert.ok(html.includes("15% OFF"));
    });

    it("renders BankPromoOfferCard with action buttons and accessibility attributes", () => {
      const targetOffer = sampleOffers[0];
      assert.ok(targetOffer);
      const html = renderToStaticMarkup(
        React.createElement(BankPromoOfferCard, {
          offer: targetOffer,
          onToggleActive: noop,
          onEdit: noop,
          onDelete: noop,
        }),
      );

      assert.ok(html.includes("Sampath"));
      assert.ok(html.includes("Pause Offer"));
      assert.ok(
        html.includes('aria-label="Edit Sampath Cards 25% Off Full Board &amp; Half Board Stays"'),
      );
      assert.ok(
        html.includes(
          'aria-label="Delete Sampath Cards 25% Off Full Board &amp; Half Board Stays"',
        ),
      );
      assert.ok(html.includes("Meal Plans:"));
      assert.ok(html.includes("HB, FB"));
      assert.ok(html.includes("≥ 2 nights"));
      assert.ok(html.includes("40 / 100"));
    });

    it("renders empty state message when no promotions match", () => {
      const html = renderToStaticMarkup(
        React.createElement(BankPromoManager, {
          initialOffers: [],
          onSaveOffer: noop,
          onToggleActive: noop,
          onDeleteOffer: noop,
        }),
      );

      assert.ok(html.includes("No Promotion Offers Found"));
      assert.ok(html.includes("Try adjusting your search criteria"));
    });

    it("evaluates offer badge styling for coupons vs bank cards", () => {
      const firstSample = sampleOffers[0];
      assert.ok(firstSample);
      const bankBadge = getOfferBadgeDetails(firstSample);
      assert.strictEqual(bankBadge.label, "Sampath");
      assert.strictEqual(bankBadge.statusColor, "green");

      const thirdSample = sampleOffers[2];
      assert.ok(thirdSample);
      const couponBadge = getOfferBadgeDetails(thirdSample);
      assert.strictEqual(couponBadge.label, "Coupon: DIRECT15");
      assert.strictEqual(couponBadge.statusColor, "gray"); // Inactive
    });
  });
});
