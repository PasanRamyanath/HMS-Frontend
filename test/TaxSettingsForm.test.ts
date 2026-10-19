import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TAX_SETTINGS,
  TAX_PRESET_OPTIONS,
  type TaxBreakdownCalculation,
  type TaxSettingsData,
  TaxSettingsForm,
  type TaxSettingsFormProps,
  computeSriLankanTaxBreakdown,
  roundCents,
  validateTaxSettings,
} from "../src/admin/settings/TaxSettingsForm.js";

describe("Sri Lankan Statutory Tax Configurator (TaxSettingsForm.tsx)", () => {
  describe("Mathematical Accuracy of 4-Stage Compounding (computeSriLankanTaxBreakdown)", () => {
    it("computes standard Luxury Hotel 4-stage tax compounding (34.34% effective load on Rs 75,000)", () => {
      const breakdown = computeSriLankanTaxBreakdown(75000, {
        enableSC: true,
        scRatePercent: 10.0,
        enableTDL: true,
        tdlRatePercent: 1.0,
        enableSSCL: true,
        ssclRatePercent: 2.5,
        enableVAT: true,
        vatRatePercent: 18.0,
      });

      assert.equal(breakdown.baseLkr, 75000);
      assert.equal(breakdown.scLkr, 7500); // 10% on 75,000
      assert.equal(breakdown.subtotalAfterScLkr, 82500); // 75,000 + 7,500
      assert.equal(breakdown.tdlLkr, 825); // 1% on 82,500
      assert.equal(breakdown.ssclLkr, 2062.5); // 2.5% on 82,500
      assert.equal(breakdown.vatBaseLkr, 85387.5); // 82,500 + 825 + 2,062.5
      assert.equal(breakdown.vatLkr, 15369.75); // 18% on 85,387.5
      assert.equal(breakdown.grandTotalLkr, 100757.25);
      assert.equal(breakdown.effectiveRatePercent, 34.34);
    });

    it("computes Small Guest House exemption (10% SC + 1% TDL only = 11.10%)", () => {
      const breakdown = computeSriLankanTaxBreakdown(75000, {
        enableSC: true,
        scRatePercent: 10.0,
        enableTDL: true,
        tdlRatePercent: 1.0,
        enableSSCL: false,
        ssclRatePercent: 2.5,
        enableVAT: false,
        vatRatePercent: 18.0,
      });

      assert.equal(breakdown.baseLkr, 75000);
      assert.equal(breakdown.scLkr, 7500);
      assert.equal(breakdown.tdlLkr, 825);
      assert.equal(breakdown.ssclLkr, 0);
      assert.equal(breakdown.vatLkr, 0);
      assert.equal(breakdown.grandTotalLkr, 83325);
      assert.equal(breakdown.effectiveRatePercent, 11.1);
    });

    it("computes Micro Tier exemption (10% SC + 0.5% TDL only = 10.55%)", () => {
      const breakdown = computeSriLankanTaxBreakdown(75000, {
        enableSC: true,
        scRatePercent: 10.0,
        enableTDL: true,
        tdlRatePercent: 0.5,
        enableSSCL: false,
        ssclRatePercent: 2.5,
        enableVAT: false,
        vatRatePercent: 18.0,
      });

      assert.equal(breakdown.grandTotalLkr, 82912.5);
      assert.equal(breakdown.effectiveRatePercent, 10.55);
    });

    it("handles zero base gracefully without NaN or negative numbers", () => {
      const breakdown = computeSriLankanTaxBreakdown(0, DEFAULT_TAX_SETTINGS);
      assert.equal(breakdown.baseLkr, 0);
      assert.equal(breakdown.grandTotalLkr, 0);
      assert.equal(breakdown.effectiveRatePercent, 0);
    });

    it("rounds cents accurately to 2 decimal places using roundCents", () => {
      assert.equal(roundCents(12.345), 12.35);
      assert.equal(roundCents(12.344), 12.34);
      assert.equal(roundCents(100.0), 100);
    });
  });

  describe("Validation Logic (validateTaxSettings)", () => {
    it("returns zero errors for valid statutory tax profile", () => {
      const errors = validateTaxSettings(DEFAULT_TAX_SETTINGS);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when SLTDA registration number is missing", () => {
      const invalid: TaxSettingsData = {
        ...DEFAULT_TAX_SETTINGS,
        sltdaRegNo: "   ",
      };
      const errors = validateTaxSettings(invalid);
      assert.ok(errors.sltdaRegNo, "Should require SLTDA registration");
    });

    it("flags error when IRD TIN is not exactly 9 digits", () => {
      const invalidShort: TaxSettingsData = {
        ...DEFAULT_TAX_SETTINGS,
        tinNo: "12345",
      };
      const errorsShort = validateTaxSettings(invalidShort);
      assert.ok(errorsShort.tinNo, "Should reject TIN shorter than 9 digits");

      const invalidLong: TaxSettingsData = {
        ...DEFAULT_TAX_SETTINGS,
        tinNo: "1234567890",
      };
      const errorsLong = validateTaxSettings(invalidLong);
      assert.ok(errorsLong.tinNo, "Should reject TIN longer than 9 digits");
    });

    it("requires VAT registration number only when VAT is enabled", () => {
      const vatWithoutReg: TaxSettingsData = {
        ...DEFAULT_TAX_SETTINGS,
        enableVAT: true,
        vatRegNo: "",
      };
      const errorsVat = validateTaxSettings(vatWithoutReg);
      assert.ok(errorsVat.vatRegNo, "Should require VAT Reg when VAT is enabled");

      const noVatWithoutReg: TaxSettingsData = {
        ...DEFAULT_TAX_SETTINGS,
        enableVAT: false,
        vatRegNo: "",
      };
      const errorsNoVat = validateTaxSettings(noVatWithoutReg);
      assert.equal(errorsNoVat.vatRegNo, undefined);
    });
  });

  describe("Static Rendering & Preset Verification", () => {
    it("renders statutory tax form with presets and live preview", () => {
      const html = renderToStaticMarkup(
        React.createElement(TaxSettingsForm, {
          initialData: DEFAULT_TAX_SETTINGS,
          sampleBaseLkr: 75000,
        }),
      );

      assert.ok(html.includes("Sri Lankan Statutory Tax &amp; SLTDA Configurator"));
      assert.ok(html.includes("SLTDA/SQA/HOT/00482"));
      assert.ok(html.includes("109845672"));
      assert.ok(html.includes("Live Statutory Folio Preview"));
      assert.ok(html.includes("+34.34% Total Loading"));
      assert.ok(html.includes("Grand Total Payable"));
    });

    it("contains all 4 preset options in TAX_PRESET_OPTIONS", () => {
      assert.equal(TAX_PRESET_OPTIONS.length, 4);
      assert.ok(TAX_PRESET_OPTIONS.some((o) => o.id === "LUXURY_VAT"));
      assert.ok(TAX_PRESET_OPTIONS.some((o) => o.id === "SMALL_GUESTHOUSE"));
      assert.ok(TAX_PRESET_OPTIONS.some((o) => o.id === "MICRO_TIER"));
      assert.ok(TAX_PRESET_OPTIONS.some((o) => o.id === "CUSTOM"));
    });

    it("accepts valid props conforming to TaxSettingsFormProps and verifies TaxBreakdownCalculation type shape", () => {
      const props: TaxSettingsFormProps = {
        initialData: DEFAULT_TAX_SETTINGS,
        sampleBaseLkr: 50000,
        isSaving: false,
      };
      assert.equal(props.sampleBaseLkr, 50000);

      const calc: TaxBreakdownCalculation = computeSriLankanTaxBreakdown(
        50000,
        DEFAULT_TAX_SETTINGS,
      );
      assert.equal(typeof calc.grandTotalLkr, "number");
    });
  });
});
