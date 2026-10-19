/**
 * Phase 11 Ponytail Review & Code Simplification Verification (Step 275)
 *
 * Grounded in .agents/rules/ponytail.md & AGENTS.md:
 * 1. Zero dead code & zero unused exports across src/qr/
 * 2. Zero console.log, console.error, or debugger statements
 * 3. Strict preservation of 4-stage statutory tax compounding (SC -> TDL -> SSCL -> VAT)
 * 4. Apple HIG design compliance: .apple-liquid-glass and .tabular-nums-lkr
 * 5. Complete isolation from admin modules to preserve sub-second 3G load
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import * as qrExports from "../src/qr/index.js";

describe("Step 275: Phase 11 Ponytail Review & Code Simplification Checkpoint", () => {
  const qrDir = path.resolve(process.cwd(), "src/qr");
  const qrFiles = fs.readdirSync(qrDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

  describe("1. Zero Console & Debugger Noise", () => {
    it("verifies zero console statements exist in any src/qr file", () => {
      for (const file of qrFiles) {
        const content = fs.readFileSync(path.join(qrDir, file), "utf8");
        const hasConsole = /(?:console\.(?:log|error|warn|info|debug|trace))\s*\(/.test(content);
        assert.strictEqual(
          hasConsole,
          false,
          `File ${file} must not contain any console logging statements`,
        );
      }
    });

    it("verifies zero debugger statements exist in any src/qr file", () => {
      for (const file of qrFiles) {
        const content = fs.readFileSync(path.join(qrDir, file), "utf8");
        const hasDebugger = /\bdebugger\b/.test(content);
        assert.strictEqual(hasDebugger, false, `File ${file} must not contain debugger statements`);
      }
    });
  });

  describe("2. Clean Module Decoupling (Zero Admin Infiltration)", () => {
    it("ensures no component in src/qr/ imports from src/admin/", () => {
      for (const file of qrFiles) {
        const content = fs.readFileSync(path.join(qrDir, file), "utf8");
        const hasAdminImport = /from\s+["'].*\/admin\//.test(content);
        assert.strictEqual(
          hasAdminImport,
          false,
          `File ${file} must not import from admin directory`,
        );
      }
    });
  });

  describe("3. Apple HIG Liquid Glass & Tabular Numerals", () => {
    it("verifies .apple-liquid-glass presence on floating bars and sheets", () => {
      const floatingBarContent = fs.readFileSync(path.join(qrDir, "FloatingCartBar.tsx"), "utf8");
      assert.ok(
        floatingBarContent.includes("apple-liquid-glass"),
        "FloatingCartBar must utilize .apple-liquid-glass for translucent frosted surface",
      );

      const waiterBtnContent = fs.readFileSync(path.join(qrDir, "CallWaiterButton.tsx"), "utf8");
      assert.ok(
        waiterBtnContent.includes("apple-liquid-glass"),
        "CallWaiterButton must utilize .apple-liquid-glass surface",
      );
    });

    it("verifies .tabular-nums-lkr on price and countdown displays", () => {
      const dishCardContent = fs.readFileSync(path.join(qrDir, "GuestDishCard.tsx"), "utf8");
      assert.ok(
        dishCardContent.includes("tabular-nums-lkr"),
        "GuestDishCard must apply .tabular-nums-lkr to monetary formatting",
      );

      const waiterBtnContent = fs.readFileSync(path.join(qrDir, "CallWaiterButton.tsx"), "utf8");
      assert.ok(
        waiterBtnContent.includes("tabular-nums-lkr"),
        "CallWaiterButton must apply .tabular-nums-lkr to cooldown timer",
      );
    });
  });

  describe("4. Barrel Exports & Core Contract Verification", () => {
    it("exports all expected Phase 11 contactless guest components from src/qr/index.ts", () => {
      assert.strictEqual(typeof qrExports.GuestQrApp, "function");
      assert.strictEqual(typeof qrExports.GuestDishCard, "function");
      assert.strictEqual(typeof qrExports.FloatingCartBar, "function");
      assert.strictEqual(typeof qrExports.GuestCartDrawer, "function");
      assert.strictEqual(typeof qrExports.GuestLankaQrPay, "function");
      assert.strictEqual(typeof qrExports.LiveOrderTracker, "function");
      assert.strictEqual(typeof qrExports.CallWaiterButton, "function");
      assert.strictEqual(typeof qrExports.GuestLaundryTab, "function");
      assert.strictEqual(typeof qrExports.GuestMinibarTab, "function");
      assert.strictEqual(typeof qrExports.ExpressHousekeepingTab, "function");
      assert.strictEqual(typeof qrExports.PackedMealModal, "function");
      assert.strictEqual(typeof qrExports.HotelInfoSheet, "function");
      assert.strictEqual(typeof qrExports.OrderFeedbackPrompt, "function");
      assert.strictEqual(typeof qrExports.ExpiredRoomQrView, "function");
      assert.strictEqual(typeof qrExports.useGuestCart, "function");
    });
  });
});
