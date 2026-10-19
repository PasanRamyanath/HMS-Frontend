import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RegisterStep2,
  type RegisterStep2Data,
  type RegisterStep2Props,
  SAAS_TIER_OPTIONS,
  SRI_LANKAN_HOTEL_CITIES,
  type SaasPlanTier,
  TAX_PRESET_OPTIONS,
  isValidSltdaRegNo,
  isValidTin,
  isValidVatRegNo,
  validateStep2Form,
} from "../src/admin/auth/RegisterStep2.js";
import { BusinessType, TaxCategory } from "../src/generated/graphql.js";

describe("Hotel SaaS Onboarding Wizard — Step 2 (RegisterStep2.tsx)", () => {
  describe("TIN & Registration Validation (isValidTin, isValidSltdaRegNo, isValidVatRegNo)", () => {
    it("validates 9-digit Sri Lankan Inland Revenue Department TIN numbers", () => {
      assert.strictEqual(isValidTin("100234567"), true);
      assert.strictEqual(isValidTin("987654321"), true);
      assert.strictEqual(isValidTin(" 100234567 "), true);
    });

    it("rejects invalid TIN numbers (too short, too long, non-numeric)", () => {
      assert.strictEqual(isValidTin("1234"), false);
      assert.strictEqual(isValidTin("1234567890"), false);
      assert.strictEqual(isValidTin(""), false);
    });

    it("validates SLTDA registration numbers", () => {
      assert.strictEqual(isValidSltdaRegNo("SLTDA/SQA/PRO/00492"), true);
      assert.strictEqual(isValidSltdaRegNo("SLTDA/BOU/2024/012"), true);
      assert.strictEqual(isValidSltdaRegNo("HTL-12345"), true);
    });

    it("rejects invalid or empty SLTDA registration numbers", () => {
      assert.strictEqual(isValidSltdaRegNo(""), false);
      assert.strictEqual(isValidSltdaRegNo("123"), false);
      assert.strictEqual(isValidSltdaRegNo("!@#$"), false);
    });

    it("validates IRD VAT registration numbers", () => {
      assert.strictEqual(isValidVatRegNo("100234567"), true);
      assert.strictEqual(isValidVatRegNo("100234567-7000"), true);
      assert.strictEqual(isValidVatRegNo(""), true); // Optional for non-VAT properties
    });

    it("rejects invalid VAT registration numbers", () => {
      assert.strictEqual(isValidVatRegNo("12345"), false);
      assert.strictEqual(isValidVatRegNo("100234567-70"), false);
    });
  });

  describe("Form Validation (validateStep2Form)", () => {
    const validData: RegisterStep2Data = {
      businessType: BusinessType.BoutiqueVilla,
      shopName: "Galle Fort Lighthouse Villa",
      city: "Galle",
      sltdaRegNo: "SLTDA/SQA/PRO/00492",
      tinNo: "100234567",
      vatRegNo: "100234567-7000",
      taxCategory: TaxCategory.FullServiceHotelVat,
      saasTier: "PRO_RESORT",
    };

    it("returns null for valid property onboarding data", () => {
      assert.strictEqual(validateStep2Form(validData), null);
    });

    it("returns error if property or hotel name is missing", () => {
      const err = validateStep2Form({ ...validData, shopName: "   " });
      assert.ok(err?.includes("Property or hotel"));
    });

    it("returns error if city is missing", () => {
      const err = validateStep2Form({ ...validData, city: "" });
      assert.ok(err?.includes("City"));
    });

    it("returns error if SLTDA license is invalid", () => {
      const err = validateStep2Form({ ...validData, sltdaRegNo: "x" });
      assert.ok(err?.includes("SLTDA"));
    });

    it("returns error if TIN number is invalid", () => {
      const err = validateStep2Form({ ...validData, tinNo: "123" });
      assert.ok(err?.includes("TIN"));
    });

    it("requires VAT registration number when FullServiceHotelVat tax category is selected", () => {
      const err = validateStep2Form({ ...validData, vatRegNo: undefined });
      assert.ok(err?.includes("VAT Registration Number is required"));
    });

    it("allows omitting VAT registration number for BoutiqueNonVat category", () => {
      const nonVatData: RegisterStep2Data = {
        ...validData,
        taxCategory: TaxCategory.BoutiqueNonVat,
        vatRegNo: undefined,
      };
      assert.strictEqual(validateStep2Form(nonVatData), null);
    });
  });

  describe("Constants & Presets", () => {
    it("exports valid SaaS tier and Tax preset options", () => {
      assert.strictEqual(SAAS_TIER_OPTIONS.length, 3);
      assert.strictEqual(TAX_PRESET_OPTIONS.length, 4);
      assert.ok(SRI_LANKAN_HOTEL_CITIES.includes("Colombo"));
      assert.ok(SRI_LANKAN_HOTEL_CITIES.includes("Galle"));
      assert.ok(SRI_LANKAN_HOTEL_CITIES.includes("Kandy"));
    });
  });

  describe("Component Static Rendering (RegisterStep2)", () => {
    it("renders step 2 form with header, progress bar, and all fields", () => {
      const html = renderToStaticMarkup(React.createElement(RegisterStep2));

      assert.ok(html.includes("Property &amp; Tax Profile"));
      assert.ok(html.includes("Property Profile &amp; Statutory Tax Setup"));
      assert.ok(html.includes("hotel-name"));
      assert.ok(html.includes("hotel-city"));
      assert.ok(html.includes("business-type"));
      assert.ok(html.includes("sltda-reg"));
      assert.ok(html.includes("ird-tin"));
      assert.ok(html.includes("ird-vat"));
      assert.ok(html.includes("Statutory Tax Preset"));
      assert.ok(html.includes("Cloud SaaS Subscription Plan Tier"));
      assert.ok(html.includes("Complete Setup &amp; Proceed to Verify"));
      assert.ok(html.includes("Back"));
    });

    it("pre-populates inputs when initialData is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(RegisterStep2, {
          initialData: {
            shopName: "Mirissa Ocean Retreat",
            city: "Mirissa",
            sltdaRegNo: "SLTDA/RES/00199",
            tinNo: "900123456",
          },
        }),
      );

      assert.ok(html.includes("Mirissa Ocean Retreat"));
      assert.ok(html.includes("SLTDA/RES/00199"));
      assert.ok(html.includes("900123456"));
    });

    it("renders with back callback without throwing", () => {
      let backed = false;
      const html = renderToStaticMarkup(
        React.createElement(RegisterStep2, {
          onBack: () => {
            backed = true;
          },
        }),
      );

      assert.ok(html.includes("Back"));
      assert.strictEqual(backed, false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies RegisterStep2Data, RegisterStep2Props and SaasPlanTier are constructible", () => {
      const tier: SaasPlanTier = "ENTERPRISE_CHAIN";
      const data: RegisterStep2Data = {
        businessType: BusinessType.CityHotel,
        shopName: "Colombo Grand Towers",
        city: "Colombo",
        sltdaRegNo: "SLTDA/CTY/2026/001",
        tinNo: "888123456",
        vatRegNo: "888123456-7000",
        taxCategory: TaxCategory.FullServiceHotelVat,
        saasTier: tier,
      };
      const props: RegisterStep2Props = {
        initialData: data,
        onComplete: (_d) => {
          /* noop */
        },
        onBack: () => {
          /* noop */
        },
      };

      assert.strictEqual(tier, "ENTERPRISE_CHAIN");
      assert.strictEqual(props.initialData?.city, "Colombo");
    });
  });
});
