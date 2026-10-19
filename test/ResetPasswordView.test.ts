import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ResetPasswordView,
  type ResetPasswordViewProps,
  type ResetStage,
  executeConfirmReset,
  executeRequestOtp,
  normalizeResetUsername,
  parsePastedOtp,
  resolveResetHeader,
} from "../src/admin/auth/ResetPasswordView.js";

describe("Password Reset & SMSGo.lk / Email OTP Verification (ResetPasswordView.tsx)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ CodeDeliveryDetails: { Destination: "k***@r***.lk" } }), {
        status: 200,
        headers: { "Content-Type": "application/x-amz-json-1.1" },
      });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Username Normalization (normalizeResetUsername)", () => {
    it("converts 10-digit Sri Lankan mobile number starting with 0 to +94 format", () => {
      assert.strictEqual(normalizeResetUsername("0771234567"), "+94771234567");
      assert.strictEqual(normalizeResetUsername("0719876543"), "+94719876543");
    });

    it("preserves corporate email addresses and international format numbers", () => {
      assert.strictEqual(
        normalizeResetUsername("reception@kandy-hills.lk"),
        "reception@kandy-hills.lk",
      );
      assert.strictEqual(normalizeResetUsername("+94771234567"), "+94771234567");
    });

    it("trims surrounding whitespace cleanly", () => {
      assert.strictEqual(normalizeResetUsername("  0771234567  "), "+94771234567");
      assert.strictEqual(normalizeResetUsername("  manager@resort.lk  "), "manager@resort.lk");
    });
  });

  describe("Pasted OTP Parsing (parsePastedOtp)", () => {
    it("extracts 6 clean digits from numeric string", () => {
      assert.deepStrictEqual(parsePastedOtp("492015"), ["4", "9", "2", "0", "1", "5"]);
    });

    it("extracts 6 digits from SMS notification message text or dashed format", () => {
      assert.deepStrictEqual(parsePastedOtp("Your code is 839-201"), [
        "8",
        "3",
        "9",
        "2",
        "0",
        "1",
      ]);
      assert.deepStrictEqual(parsePastedOtp("SMSGo.lk OTP: 123456 expires in 5 mins"), [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
      ]);
    });

    it("returns null if input contains fewer than 6 digits", () => {
      assert.strictEqual(parsePastedOtp("123"), null);
      assert.strictEqual(parsePastedOtp("abcd"), null);
      assert.strictEqual(parsePastedOtp(""), null);
    });
  });

  describe("Header Resolution (resolveResetHeader)", () => {
    it("returns title and subtitle for REQUEST_CODE stage", () => {
      const header = resolveResetHeader("REQUEST_CODE", "");
      assert.strictEqual(header.title, "Reset Your Account Password");
      assert.ok(header.subtitle.includes("staff email or +94 phone"));
    });

    it("returns title and subtitle with destination for VERIFY_AND_RESET stage", () => {
      const header = resolveResetHeader("VERIFY_AND_RESET", "+94771234567");
      assert.strictEqual(header.title, "Verify OTP & Reset Password");
      assert.ok(header.subtitle.includes("+94771234567"));
    });

    it("returns title and subtitle for SUCCESS stage", () => {
      const header = resolveResetHeader("SUCCESS", "");
      assert.strictEqual(header.title, "Password Reset Successful");
      assert.ok(header.subtitle.includes("securely updated"));
    });
  });

  describe("Request OTP Logic (executeRequestOtp)", () => {
    it("rejects empty username input", async () => {
      const result = await executeRequestOtp("   ");
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "MISSING_USERNAME");
      }
    });

    it("successfully requests OTP and returns delivery destination", async () => {
      const result = await executeRequestOtp("0771234567");
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.destination, "k***@r***.lk");
      }
    });
  });

  describe("Confirm Reset Logic (executeConfirmReset)", () => {
    it("rejects OTP if not exactly 6 digits", async () => {
      const result = await executeConfirmReset({
        username: "user@hotel.lk",
        otp: "123",
        newPassword: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_OTP");
      }
    });

    it("rejects password shorter than 8 characters", async () => {
      const result = await executeConfirmReset({
        username: "user@hotel.lk",
        otp: "123456",
        newPassword: "short",
        confirmPassword: "short",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "WEAK_PASSWORD");
      }
    });

    it("rejects when new password and confirm password do not match", async () => {
      const result = await executeConfirmReset({
        username: "user@hotel.lk",
        otp: "123456",
        newPassword: "ValidPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "PASSWORD_MISMATCH");
      }
    });

    it("successfully confirms reset when all inputs are valid", async () => {
      const result = await executeConfirmReset({
        username: "user@hotel.lk",
        otp: "123456",
        newPassword: "ValidPassword123!",
        confirmPassword: "ValidPassword123!",
      });
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.confirmed, true);
      }
    });
  });

  describe("Component Static Rendering (ResetPasswordView)", () => {
    it("renders request code stage by default with input and submit button", () => {
      const html = renderToStaticMarkup(React.createElement(ResetPasswordView));

      assert.ok(html.includes("Reset Your Account Password"));
      assert.ok(html.includes("reset-username"));
      assert.ok(html.includes("Send Verification OTP"));
      assert.ok(html.includes("Sign In to PMS"));
    });

    it("pre-populates username when initialUsername is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(ResetPasswordView, {
          initialUsername: "receptionist@mirissa.lk",
        }),
      );

      assert.ok(html.includes("receptionist@mirissa.lk"));
    });

    it("renders with navigation callbacks without throwing", () => {
      let navigated = false;
      const html = renderToStaticMarkup(
        React.createElement(ResetPasswordView, {
          onNavigateSignIn: () => {
            navigated = true;
          },
        }),
      );

      assert.ok(html.includes("Reset Your Account Password"));
      assert.strictEqual(navigated, false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies ResetStage and ResetPasswordViewProps are constructible", () => {
      const stage: ResetStage = "VERIFY_AND_RESET";
      const props: ResetPasswordViewProps = {
        initialUsername: "admin@galle.lk",
        onSuccess: () => {
          /* noop */
        },
        onNavigateSignIn: () => {
          /* noop */
        },
      };

      assert.strictEqual(stage, "VERIFY_AND_RESET");
      assert.strictEqual(props.initialUsername, "admin@galle.lk");
    });
  });
});
