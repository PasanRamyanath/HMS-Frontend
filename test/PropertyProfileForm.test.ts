import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BUSINESS_TYPE_OPTIONS,
  DEFAULT_PROPERTY_PROFILE,
  type PropertyProfileData,
  PropertyProfileForm,
  type PropertyProfileFormProps,
  validatePropertyProfile,
} from "../src/admin/settings/PropertyProfileForm.js";
import { BusinessType } from "../src/generated/graphql.js";

describe("Property Profile & Branding Settings Form (PropertyProfileForm.tsx)", () => {
  describe("Validation Logic (validatePropertyProfile)", () => {
    it("returns zero errors for valid property profile data", () => {
      const validData: PropertyProfileData = {
        ...DEFAULT_PROPERTY_PROFILE,
        shopName: "Tangalle Ocean Breeze Resort",
        contactPhone: "+94719876543",
        city: "Tangalle",
        email: "info@oceanbreeze.lk",
      };

      const errors = validatePropertyProfile(validData);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when property name is missing or too short", () => {
      const invalid: PropertyProfileData = {
        ...DEFAULT_PROPERTY_PROFILE,
        shopName: "A",
      };

      const errors = validatePropertyProfile(invalid);
      assert.ok(errors.shopName, "Should have error for short shopName");
    });

    it("flags error when contact phone is not a valid Sri Lankan mobile", () => {
      const invalid: PropertyProfileData = {
        ...DEFAULT_PROPERTY_PROFILE,
        contactPhone: "12345",
      };

      const errors = validatePropertyProfile(invalid);
      assert.ok(errors.contactPhone, "Should reject invalid Sri Lankan phone");
    });

    it("accepts local 07X format and validates without errors", () => {
      const withLocalPhone: PropertyProfileData = {
        ...DEFAULT_PROPERTY_PROFILE,
        contactPhone: "0771234567",
      };

      const errors = validatePropertyProfile(withLocalPhone);
      assert.equal(errors.contactPhone, undefined);
    });

    it("flags error when email format is malformed", () => {
      const invalidEmail: PropertyProfileData = {
        ...DEFAULT_PROPERTY_PROFILE,
        email: "not-an-email",
      };

      const errors = validatePropertyProfile(invalidEmail);
      assert.ok(errors.email, "Should reject invalid email");
    });
  });

  describe("Component Rendering", () => {
    it("renders default property form with inputs, segmented control, and dropdown", () => {
      const html = renderToStaticMarkup(React.createElement(PropertyProfileForm));

      assert.ok(
        html.includes("Property Profile &amp; Visual Branding") ||
          html.includes("Property Profile & Visual Branding"),
        "Should render form header",
      );
      assert.ok(
        html.includes("Galle Fort Lighthouse Villa"),
        "Should render default property name",
      );
      assert.ok(html.includes("+94771234567"), "Should render default phone");
      assert.ok(html.includes("Galle"), "Should render city option");
      assert.ok(html.includes("Colombo"), "Should include Colombo city in dropdown");
      assert.ok(
        html.includes("Property Hero Banner (3:1 Aspect Ratio)"),
        "Should render banner label",
      );
      assert.ok(html.includes("Hotel Square Logo (1:1 Ratio)"), "Should render logo label");
      assert.ok(html.includes("Save Property Profile"), "Should have submit button");
    });

    it("renders custom initial data", () => {
      const custom: Partial<PropertyProfileData> = {
        shopName: "Kandy Hilltop Sanctuary",
        city: "Kandy",
        contactPhone: "+94778889999",
        businessType: BusinessType.BeachResort,
      };

      const html = renderToStaticMarkup(
        React.createElement(PropertyProfileForm, {
          initialData: custom,
        }),
      );

      assert.ok(html.includes("Kandy Hilltop Sanctuary"), "Should display custom property name");
      assert.ok(html.includes("+94778889999"), "Should display custom phone");
    });

    it("renders saving spinner when isSaving is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(PropertyProfileForm, {
          isSaving: true,
        }),
      );

      assert.ok(html.includes("Saving Changes..."), "Should display saving spinner label");
    });

    it("renders cancel button when onCancel callback is provided", () => {
      let cancelled = false;
      const html = renderToStaticMarkup(
        React.createElement(PropertyProfileForm, {
          onCancel: () => {
            cancelled = true;
          },
        }),
      );

      assert.ok(html.includes("Cancel"), "Should render cancel button");
      assert.equal(cancelled, false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates BusinessType options and default properties", () => {
      assert.equal(BUSINESS_TYPE_OPTIONS.length, 4);
      assert.equal(DEFAULT_PROPERTY_PROFILE.businessType, BusinessType.BoutiqueVilla);

      const props: PropertyProfileFormProps = {
        isSaving: false,
      };
      assert.equal(props.isSaving, false);
    });
  });
});
