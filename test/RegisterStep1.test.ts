import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type PasswordStrength,
  RegisterStep1,
  type RegisterStep1Data,
  type RegisterStep1Props,
  computePasswordStrength,
  isValidEmail,
  isValidSriLankanPhone,
  normalizeSriLankanPhone,
  validateStep1Form,
} from "../src/admin/auth/RegisterStep1.js";

describe("Hotel SaaS Onboarding Wizard — Step 1 (RegisterStep1.tsx)", () => {
  describe("Sri Lankan Phone Normalization (normalizeSriLankanPhone)", () => {
    it("normalizes 10-digit Sri Lankan number starting with 0", () => {
      assert.strictEqual(normalizeSriLankanPhone("0771234567"), "+94771234567");
      assert.strictEqual(normalizeSriLankanPhone("0719876543"), "+94719876543");
    });

    it("normalizes 11-digit number starting with 94 without plus", () => {
      assert.strictEqual(normalizeSriLankanPhone("94771234567"), "+94771234567");
    });

    it("normalizes 9-digit number starting with 7", () => {
      assert.strictEqual(normalizeSriLankanPhone("771234567"), "+94771234567");
    });

    it("preserves formatted numbers and cleans non-digit characters", () => {
      assert.strictEqual(normalizeSriLankanPhone("+94 77 123 4567"), "+94771234567");
      assert.strictEqual(normalizeSriLankanPhone("077-123-4567"), "+94771234567");
    });
  });

  describe("Validation Utilities (isValidSriLankanPhone, isValidEmail)", () => {
    it("validates legitimate Sri Lankan mobile numbers", () => {
      assert.strictEqual(isValidSriLankanPhone("+94771234567"), true);
      assert.strictEqual(isValidSriLankanPhone("0771234567"), true);
      assert.strictEqual(isValidSriLankanPhone("0712345678"), true);
      assert.strictEqual(isValidSriLankanPhone("0720000000"), true);
      assert.strictEqual(isValidSriLankanPhone("0751112233"), true);
      assert.strictEqual(isValidSriLankanPhone("0768889900"), true);
      assert.strictEqual(isValidSriLankanPhone("0781234567"), true);
    });

    it("rejects invalid phone numbers", () => {
      assert.strictEqual(isValidSriLankanPhone(""), false);
      assert.strictEqual(isValidSriLankanPhone("0112345678"), false); // Landline
      assert.strictEqual(isValidSriLankanPhone("12345"), false);
      assert.strictEqual(isValidSriLankanPhone("+14155552671"), false);
    });

    it("validates legitimate email addresses", () => {
      assert.strictEqual(isValidEmail("owner@gallefortvilla.lk"), true);
      assert.strictEqual(isValidEmail("admin@resort-chain.com"), true);
    });

    it("rejects malformed email addresses", () => {
      assert.strictEqual(isValidEmail(""), false);
      assert.strictEqual(isValidEmail("plainaddress"), false);
      assert.strictEqual(isValidEmail("owner@"), false);
      assert.strictEqual(isValidEmail("@domain.com"), false);
    });
  });

  describe("Password Strength Computation (computePasswordStrength)", () => {
    it("classifies short passwords (< 8 chars) as WEAK", () => {
      assert.strictEqual(computePasswordStrength("12345"), "WEAK");
      assert.strictEqual(computePasswordStrength("Pass1!"), "WEAK");
    });

    it("classifies 8+ char passwords with 2 character sets as MEDIUM", () => {
      assert.strictEqual(computePasswordStrength("password123"), "MEDIUM");
      assert.strictEqual(computePasswordStrength("PasswordOnly"), "MEDIUM");
    });

    it("classifies 10+ char passwords with 3+ character sets as STRONG", () => {
      assert.strictEqual(computePasswordStrength("Ceylon@Hotel2026"), "STRONG");
      assert.strictEqual(computePasswordStrength("SecureP@ss99"), "STRONG");
    });
  });

  describe("Form Validation (validateStep1Form)", () => {
    const validData: RegisterStep1Data = {
      orgName: "Ceylon Heritage Villas",
      fullName: "Kasun Perera",
      email: "kasun@ceylonvillas.lk",
      phone: "+94771234567",
      password: "SuperSecretPassword123!",
    };

    it("returns null for completely valid registration data", () => {
      assert.strictEqual(validateStep1Form(validData), null);
    });

    it("returns error if organization name is missing", () => {
      const err = validateStep1Form({ ...validData, orgName: "   " });
      assert.ok(err?.includes("Organization"));
    });

    it("returns error if full name is missing", () => {
      const err = validateStep1Form({ ...validData, fullName: "" });
      assert.ok(err?.includes("Full name"));
    });

    it("returns error if email is invalid", () => {
      const err = validateStep1Form({ ...validData, email: "invalid-email" });
      assert.ok(err?.includes("email"));
    });

    it("returns error if phone number is invalid", () => {
      const err = validateStep1Form({ ...validData, phone: "123" });
      assert.ok(err?.includes("Sri Lankan mobile"));
    });

    it("returns error if password is weak", () => {
      const err = validateStep1Form({ ...validData, password: "123" });
      assert.ok(err?.includes("Password"));
    });
  });

  describe("Component Static Rendering (RegisterStep1)", () => {
    it("renders step 1 form with header, progress bar, and all input fields", () => {
      const html = renderToStaticMarkup(React.createElement(RegisterStep1));

      assert.ok(html.includes("Owner &amp; Organization"));
      assert.ok(html.includes("Property &amp; Tax"));
      assert.ok(html.includes("Set Up Your Hotel SaaS Account"));
      assert.ok(html.includes("org-name"));
      assert.ok(html.includes("full-name"));
      assert.ok(html.includes("register-email"));
      assert.ok(html.includes("register-phone"));
      assert.ok(html.includes("register-password"));
      assert.ok(html.includes("Continue to Property Profile"));
      assert.ok(html.includes("Sign In"));
    });

    it("pre-populates inputs when initialData is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(RegisterStep1, {
          initialData: {
            orgName: "Sigiriya Boutique Resorts",
            fullName: "Amara Silva",
            email: "amara@sigiriya.lk",
            phone: "0771234567",
          },
        }),
      );

      assert.ok(html.includes("Sigiriya Boutique Resorts"));
      assert.ok(html.includes("Amara Silva"));
      assert.ok(html.includes("amara@sigiriya.lk"));
      assert.ok(html.includes("0771234567"));
    });

    it("renders with navigation callbacks without throwing", () => {
      let navigated = false;
      const html = renderToStaticMarkup(
        React.createElement(RegisterStep1, {
          onNavigateSignIn: () => {
            navigated = true;
          },
        }),
      );

      assert.ok(html.includes("Set Up Your Hotel SaaS Account"));
      assert.strictEqual(navigated, false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies RegisterStep1Data, RegisterStep1Props and PasswordStrength are constructible", () => {
      const strength: PasswordStrength = "STRONG";
      const data: RegisterStep1Data = {
        orgName: "Mirissa Bay Resorts",
        fullName: "Dilshan Perera",
        email: "dilshan@mirissa.lk",
        phone: "+94779876543",
        password: "Secret123Password!",
      };
      const props: RegisterStep1Props = {
        initialData: data,
        onNext: (_d) => {
          /* noop */
        },
        onNavigateSignIn: () => {
          /* noop */
        },
      };

      assert.strictEqual(strength, "STRONG");
      assert.strictEqual(props.initialData?.orgName, "Mirissa Bay Resorts");
    });
  });
});
