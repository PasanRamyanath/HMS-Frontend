import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_AVAILABLE_BEDS,
  DEFAULT_BED_RATE_LKR,
  DEFAULT_MEAL_RATE_LKR,
  DEFAULT_OUTSIDE_ALLOWANCE_LKR,
  type DriverBedOption,
  type DriverQuartersData,
  type DriverQuartersMode,
  DriverQuartersSubform,
  type DriverQuartersSubformProps,
  calculateDriverQuartersCost,
  generateDriverVoucherCode,
  validateSriLankanDriverPhone,
} from "../src/admin/frontdesk/DriverQuartersSubform.js";

describe("Chauffeur & Driver Quarters Sub-Form (DriverQuartersSubform.tsx)", () => {
  describe("Sri Lankan Driver Phone Number Validation (validateSriLankanDriverPhone)", () => {
    it("validates standard 10-digit Sri Lankan mobile numbers starting with 07", () => {
      const res = validateSriLankanDriverPhone("0771234567");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalized, "+94771234567");
      assert.strictEqual(res.error, undefined);
    });

    it("validates mobile numbers with international prefix +947", () => {
      const res = validateSriLankanDriverPhone("+94712345678");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalized, "+94712345678");
    });

    it("handles spaced and hyphenated formatting", () => {
      const res = validateSriLankanDriverPhone("076 - 987 6543");
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalized, "+94769876543");
    });

    it("validates all active Sri Lankan mobile telco prefixes (70, 71, 72, 74, 75, 76, 77, 78)", () => {
      const prefixes = ["70", "71", "72", "74", "75", "76", "77", "78"];
      for (const prefix of prefixes) {
        const phone = `0${prefix}1234567`;
        const res = validateSriLankanDriverPhone(phone);
        assert.strictEqual(res.isValid, true, `Expected ${phone} to be valid`);
      }
    });

    it("rejects non-mobile numbers or invalid prefixes", () => {
      // Landline Colombo (011)
      const res1 = validateSriLankanDriverPhone("0112345678");
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.error);

      // Short number
      const res2 = validateSriLankanDriverPhone("077123");
      assert.strictEqual(res2.isValid, false);

      // Empty string
      const res3 = validateSriLankanDriverPhone("");
      assert.strictEqual(res3.isValid, false);

      // Disallowed prefix 073
      const res4 = validateSriLankanDriverPhone("0731234567");
      assert.strictEqual(res4.isValid, false);
    });
  });

  describe("Quarters Cost Calculation (calculateDriverQuartersCost)", () => {
    it("calculates on-site dorm bed cost correctly without meals", () => {
      const cost = calculateDriverQuartersCost(
        "ON_SITE_BED",
        3, // nights
        2500, // bed rate
        1500, // meal rate
        3500, // outside rate
        false, // meals
      );

      assert.strictEqual(cost.totalBedCostLkr, 7500);
      assert.strictEqual(cost.totalMealCostLkr, 0);
      assert.strictEqual(cost.totalOutsideAllowanceLkr, 0);
      assert.strictEqual(cost.grandTotalLkr, 7500);
    });

    it("calculates on-site dorm bed cost with staff meals included", () => {
      const cost = calculateDriverQuartersCost(
        "ON_SITE_BED",
        2, // nights
        2500,
        1500,
        3500,
        true, // include meals
      );

      assert.strictEqual(cost.totalBedCostLkr, 5000);
      assert.strictEqual(cost.totalMealCostLkr, 3000);
      assert.strictEqual(cost.totalOutsideAllowanceLkr, 0);
      assert.strictEqual(cost.grandTotalLkr, 8000);
    });

    it("calculates outside allowance voucher cost correctly", () => {
      const cost = calculateDriverQuartersCost(
        "OUTSIDE_ALLOWANCE",
        4, // nights
        2500,
        1500,
        3500,
        false,
      );

      assert.strictEqual(cost.totalBedCostLkr, 0);
      assert.strictEqual(cost.totalMealCostLkr, 0);
      assert.strictEqual(cost.totalOutsideAllowanceLkr, 14000);
      assert.strictEqual(cost.grandTotalLkr, 14000);
    });

    it("calculates outside allowance voucher with meal vouchers", () => {
      const cost = calculateDriverQuartersCost("OUTSIDE_ALLOWANCE", 1, 2500, 1500, 3500, true);

      assert.strictEqual(cost.totalBedCostLkr, 0);
      assert.strictEqual(cost.totalMealCostLkr, 1500);
      assert.strictEqual(cost.totalOutsideAllowanceLkr, 3500);
      assert.strictEqual(cost.grandTotalLkr, 5000);
    });
  });

  describe("Voucher Code Generation (generateDriverVoucherCode)", () => {
    it("generates formatted voucher code with phone suffix", () => {
      const code = generateDriverVoucherCode("0771234567");
      assert.strictEqual(code, "VCH-DRV-4567");
    });

    it("provides fallback code when phone is empty", () => {
      const code = generateDriverVoucherCode("");
      assert.strictEqual(code, "VCH-DRV-8821");
    });
  });

  describe("Default Presets & Catalog", () => {
    it("exports standard statutory default rates and dormitory bed list", () => {
      assert.strictEqual(DEFAULT_BED_RATE_LKR, 2500);
      assert.strictEqual(DEFAULT_MEAL_RATE_LKR, 1500);
      assert.strictEqual(DEFAULT_OUTSIDE_ALLOWANCE_LKR, 3500);
      assert.ok(DEFAULT_AVAILABLE_BEDS.length >= 4);
      assert.ok(DEFAULT_AVAILABLE_BEDS.some((b) => b.isAvailable));
    });

    it("ensures type definitions can be constructed", () => {
      const mode: DriverQuartersMode = "ON_SITE_BED";
      const bed: DriverBedOption = {
        id: "test-bed-1",
        bedNumber: "Bed T-1",
        dormBlock: "Test Annex",
        isAvailable: true,
        hasLocker: true,
      };
      const data: DriverQuartersData = {
        driverAccompanying: true,
        mode,
        assignedBedId: bed.id,
        assignedBedNumber: bed.bedNumber,
        driverName: "Kamal Silva",
        driverPhone: "0771234567",
        vehicleNumber: "WP CAD-4821",
        includeMeals: true,
        nightsCount: 2,
        nightlyBedRateLkr: 2500,
        nightlyMealAllowanceLkr: 1500,
        nightlyOutsideAllowanceLkr: 3500,
        totalBedCostLkr: 5000,
        totalMealCostLkr: 3000,
        totalOutsideAllowanceLkr: 0,
        grandTotalLkr: 8000,
        isValid: true,
      };
      const props: DriverQuartersSubformProps = {
        value: data,
        nightsCount: 2,
      };
      assert.ok(props.value?.driverAccompanying);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders default collapsed toggle when driverAccompanying is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersSubform, {
          value: { driverAccompanying: false },
        }),
      );

      assert.ok(html.includes("Accompanying Chauffeur / Guide"));
      assert.ok(html.includes("Dormitory lodging"));
      // Subform details should not be rendered
      assert.ok(!html.includes("Chauffeur / Driver Name"));
    });

    it("renders expanded subform with On-Site dorm beds when driverAccompanying is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersSubform, {
          value: {
            driverAccompanying: true,
            mode: "ON_SITE_BED",
            driverName: "Sunil Perera",
            driverPhone: "0771234567",
            vehicleNumber: "WP CAB-1942",
          },
          nightsCount: 3,
        }),
      );

      assert.ok(html.includes("On-Site Dorm Bed"));
      assert.ok(html.includes("Outside Allowance Voucher"));
      assert.ok(html.includes("Bed D-01"));
      assert.ok(html.includes("Chauffeur Annex Block A"));
      assert.ok(html.includes("Sunil Perera"));
      assert.ok(html.includes("0771234567"));
      assert.ok(html.includes("WP CAB-1942"));
      assert.ok(html.includes("Dormitory Lodging (3 nights)"));
    });

    it("renders Outside Allowance Voucher details when mode is OUTSIDE_ALLOWANCE", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersSubform, {
          value: {
            driverAccompanying: true,
            mode: "OUTSIDE_ALLOWANCE",
            driverName: "Nimal Fernando",
            driverPhone: "0712345678",
          },
          nightsCount: 2,
        }),
      );

      assert.ok(html.includes("Outside Rest House Cash Allowance"));
      assert.ok(html.includes("VCH-DRV-5678"));
      assert.ok(html.includes("Outside Lodging Allowance (2 nights)"));
    });

    it("renders disabled state on inputs when disabled prop is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersSubform, {
          value: {
            driverAccompanying: true,
            driverName: "Sunil Perera",
          },
          disabled: true,
        }),
      );

      assert.ok(html.includes("disabled"));
    });
  });
});
