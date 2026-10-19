import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type LoginMode,
  LoginView,
  type LoginViewProps,
  executeCredentialsLogin,
  executePinShiftUnlock,
  isValidStaffIdentifier,
  normalizeStaffIdentifier,
} from "../src/admin/auth/LoginView.js";

describe("Apple HIG Liquid Glass Sign-In & Shift Unlock (LoginView.tsx)", () => {
  describe("Staff Identifier Normalization (normalizeStaffIdentifier)", () => {
    it("converts 10-digit Sri Lankan phone starting with 0 to +94 format", () => {
      assert.strictEqual(normalizeStaffIdentifier("0771234567"), "+94771234567");
      assert.strictEqual(normalizeStaffIdentifier("0719876543"), "+94719876543");
    });

    it("preserves already normalized +94 numbers and email addresses", () => {
      assert.strictEqual(normalizeStaffIdentifier("+94771234567"), "+94771234567");
      assert.strictEqual(
        normalizeStaffIdentifier("reception@kandy-hills.lk"),
        "reception@kandy-hills.lk",
      );
      assert.strictEqual(normalizeStaffIdentifier("EMP-1024"), "EMP-1024");
    });

    it("trims surrounding whitespace cleanly", () => {
      assert.strictEqual(normalizeStaffIdentifier("  0771234567  "), "+94771234567");
      assert.strictEqual(normalizeStaffIdentifier("  kasun@resort.lk  "), "kasun@resort.lk");
    });
  });

  describe("Staff Identifier Validation (isValidStaffIdentifier)", () => {
    it("validates legitimate email addresses", () => {
      assert.strictEqual(isValidStaffIdentifier("admin@resort.lk"), true);
      assert.strictEqual(isValidStaffIdentifier("gm@hotel-chain.com"), true);
    });

    it("validates legitimate Sri Lankan mobile numbers", () => {
      assert.strictEqual(isValidStaffIdentifier("+94771234567"), true);
      assert.strictEqual(isValidStaffIdentifier("0771234567"), true);
      assert.strictEqual(isValidStaffIdentifier("0712345678"), true);
    });

    it("validates alphanumeric staff ID codes", () => {
      assert.strictEqual(isValidStaffIdentifier("EMP-1024"), true);
      assert.strictEqual(isValidStaffIdentifier("STAFF_42"), true);
    });

    it("rejects empty or invalid inputs", () => {
      assert.strictEqual(isValidStaffIdentifier(""), false);
      assert.strictEqual(isValidStaffIdentifier("   "), false);
      assert.strictEqual(isValidStaffIdentifier("!@#$"), false);
    });
  });

  describe("Credentials Authentication Logic (executeCredentialsLogin)", () => {
    it("returns error when password is missing and passkey is not enabled", async () => {
      const result = await executeCredentialsLogin("kasun@resort.lk", "", false, "tenant-colombo");
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "MISSING_PASSWORD");
      }
    });
  });

  describe("Quick PIN Shift Unlock Logic (executePinShiftUnlock)", () => {
    it("successfully unlocks shift with valid 4 to 6 digit numeric PIN", () => {
      const result = executePinShiftUnlock("EMP-101", "1234", "tenant-colombo");
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.staffId, "EMP-101");
        assert.strictEqual(result.value.tenantId, "tenant-colombo");
      }
    });

    it("rejects invalid PIN formats", () => {
      const shortResult = executePinShiftUnlock("EMP-101", "12", "tenant-colombo");
      assert.strictEqual(shortResult.ok, false);
      if (!shortResult.ok) {
        assert.strictEqual(shortResult.error.code, "INVALID_PIN");
      }

      const alphaResult = executePinShiftUnlock("EMP-101", "abcd", "tenant-colombo");
      assert.strictEqual(alphaResult.ok, false);
      if (!alphaResult.ok) {
        assert.strictEqual(alphaResult.error.code, "INVALID_PIN");
      }
    });
  });

  describe("Component Static Rendering (LoginView)", () => {
    it("renders credentials login mode by default with glass card and form elements", () => {
      const html = renderToStaticMarkup(React.createElement(LoginView));

      assert.ok(html.includes("Sri Lanka Cloud HMS"));
      assert.ok(html.includes("Staff Sign In"));
      assert.ok(html.includes("Quick PIN Shift"));
      assert.ok(html.includes("staff-identifier"));
      assert.ok(html.includes("staff-password"));
      assert.ok(html.includes("Sign in with Passkey / Biometrics"));
      assert.ok(html.includes("Sign In to Hotel PMS"));
      assert.ok(html.includes("Register Hotel Property"));
    });

    it("renders quick PIN shift unlock mode when initialMode is PIN_SHIFT", () => {
      const html = renderToStaticMarkup(
        React.createElement(LoginView, { initialMode: "PIN_SHIFT" }),
      );

      assert.ok(html.includes("staff-pin"));
      assert.ok(html.includes("Operational Shift PIN (4–6 Digits)"));
      assert.ok(html.includes("Unlock Staff Shift"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders with custom tenantId and navigation callbacks without throwing", () => {
      let registered = false;
      let forgot = false;

      const html = renderToStaticMarkup(
        React.createElement(LoginView, {
          defaultTenantId: "tenant-custom-resort",
          onNavigateRegister: () => {
            registered = true;
          },
          onNavigateForgotPassword: () => {
            forgot = true;
          },
        }),
      );

      assert.ok(html.includes("Sri Lanka Cloud HMS"));
      assert.strictEqual(registered, false);
      assert.strictEqual(forgot, false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies LoginMode and LoginViewProps are constructible", () => {
      const mode: LoginMode = "CREDENTIALS";
      const props: LoginViewProps = {
        initialMode: mode,
        defaultTenantId: "tenant-test",
        onSuccess: (_s) => {
          /* noop */
        },
        onError: (_e) => {
          /* noop */
        },
      };

      assert.strictEqual(props.initialMode, "CREDENTIALS");
      assert.strictEqual(props.defaultTenantId, "tenant-test");
    });
  });
});
