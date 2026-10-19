import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_AVG_OTA_COMMISSION_PERCENT,
  DEFAULT_PAYHERE_GATEWAY_FEE_PERCENT,
  computeDirectBookingNetSavings,
  computeEffectiveCommissionPercent,
  computeOtaNetPayable,
  computeProjectedDirectSavings,
} from "../src/admin/channels/channelRateMath.js";

describe("Sri Lankan Hospitality Channel Rate & Commission Economics (channelRateMath.ts)", () => {
  describe("1. Default Market Constants", () => {
    it("defines Sri Lankan standard PayHere payment gateway fee as 2.5%", () => {
      assert.strictEqual(DEFAULT_PAYHERE_GATEWAY_FEE_PERCENT, 2.5);
    });

    it("defines Sri Lankan market average OTA commission rate as 18.0%", () => {
      assert.strictEqual(DEFAULT_AVG_OTA_COMMISSION_PERCENT, 18.0);
    });
  });

  describe("2. Direct Booking Net Margin Savings (computeDirectBookingNetSavings)", () => {
    it("calculates Booking.com 18% vs PayHere 2.5% net direct advantage (15.5%)", () => {
      // LKR 6,840,000 gross revenue
      // Net savings = 6,840,000 * 0.155 = 1,060,200
      const savings = computeDirectBookingNetSavings(6840000, 18.0, 2.5);
      assert.strictEqual(savings, 1060200);
    });

    it("calculates Agoda 15% vs PayHere 2.5% net direct advantage (12.5%)", () => {
      // LKR 3,780,000 gross revenue
      // Net savings = 3,780,000 * 0.125 = 472,500
      const savings = computeDirectBookingNetSavings(3780000, 15.0);
      assert.strictEqual(savings, 472500);
    });

    it("calculates Airbnb 3.0% host-only fee vs PayHere 2.5% net advantage (0.5%)", () => {
      // LKR 1,820,000 gross revenue
      // Net savings = 1,820,000 * 0.005 = 9,100
      const savings = computeDirectBookingNetSavings(1820000, 3.0, 2.5);
      assert.strictEqual(savings, 9100);
    });

    it("clamps net savings to zero if payment gateway fee equals or exceeds OTA commission", () => {
      // If OTA fee is 2.0% and gateway fee is 2.5%, direct has no positive commission delta
      const savings = computeDirectBookingNetSavings(1000000, 2.0, 2.5);
      assert.strictEqual(savings, 0);
    });

    it("safely handles non-positive gross revenue or commission", () => {
      assert.strictEqual(computeDirectBookingNetSavings(0, 18.0), 0);
      assert.strictEqual(computeDirectBookingNetSavings(-50000, 18.0), 0);
      assert.strictEqual(computeDirectBookingNetSavings(1000000, 0), 0);
      assert.strictEqual(computeDirectBookingNetSavings(1000000, -5), 0);
    });
  });

  describe("3. Projected Direct Website Savings (computeProjectedDirectSavings)", () => {
    it("calculates projected savings on LKR 10,000,000 at 18% standard OTA commission", () => {
      assert.strictEqual(computeProjectedDirectSavings(10000000, 0.18), 1800000);
    });

    it("uses default 18% market rate when rate argument is omitted", () => {
      assert.strictEqual(computeProjectedDirectSavings(1000000), 180000);
    });

    it("safely handles zero and negative revenue", () => {
      assert.strictEqual(computeProjectedDirectSavings(0), 0);
      assert.strictEqual(computeProjectedDirectSavings(-100000), 0);
      assert.strictEqual(computeProjectedDirectSavings(500000, 0), 0);
      assert.strictEqual(computeProjectedDirectSavings(500000, -0.15), 0);
    });
  });

  describe("4. Effective Commission Rate Calculation (computeEffectiveCommissionPercent)", () => {
    it("computes exact commission percentage rounded to 1 decimal place", () => {
      // Gross 15,390,000, Commission 2,295,300 -> 14.9142... -> 14.9%
      assert.strictEqual(computeEffectiveCommissionPercent(15390000, 2295300), 14.9);

      // Gross 6,840,000, Commission 1,231,200 -> 18.0%
      assert.strictEqual(computeEffectiveCommissionPercent(6840000, 1231200), 18.0);

      // Gross 1,820,000, Commission 54,600 -> 3.0%
      assert.strictEqual(computeEffectiveCommissionPercent(1820000, 54600), 3.0);
    });

    it("safely returns 0 when gross or commission is zero or negative", () => {
      assert.strictEqual(computeEffectiveCommissionPercent(0, 1000), 0);
      assert.strictEqual(computeEffectiveCommissionPercent(-10000, 1000), 0);
      assert.strictEqual(computeEffectiveCommissionPercent(10000, 0), 0);
      assert.strictEqual(computeEffectiveCommissionPercent(10000, -500), 0);
    });
  });

  describe("5. Net Revenue Payable to Property (computeOtaNetPayable)", () => {
    it("computes net revenue payable to hotel after OTA commission deduction", () => {
      // Gross 6,840,000 - Commission 1,231,200 = 5,608,800
      assert.strictEqual(computeOtaNetPayable(6840000, 1231200), 5608800);
    });

    it("clamps payable amount to zero if commission exceeds gross", () => {
      assert.strictEqual(computeOtaNetPayable(10000, 15000), 0);
      assert.strictEqual(computeOtaNetPayable(0, 5000), 0);
      assert.strictEqual(computeOtaNetPayable(-1000, 5000), 0);
    });
  });
});
