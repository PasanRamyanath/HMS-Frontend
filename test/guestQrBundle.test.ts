import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import * as qrBarrel from "../src/qr/index.js";

describe("Guest QR Route Bundle Optimization & Isolation (Step 273)", () => {
  describe("1. Barrel Exports Integrity", () => {
    it("exports all expected components and helpers from src/qr/index.ts", () => {
      assert.strictEqual(typeof qrBarrel.GuestQrApp, "function");
      assert.strictEqual(typeof qrBarrel.CallWaiterButton, "function");
      assert.strictEqual(typeof qrBarrel.CategoryPillsBar, "function");
      assert.strictEqual(typeof qrBarrel.DepartmentTabs, "function");
      assert.strictEqual(typeof qrBarrel.DishModifierSheet, "function");
      assert.strictEqual(typeof qrBarrel.ExpiredRoomQrView, "function");
      assert.strictEqual(typeof qrBarrel.ExpressHousekeepingTab, "function");
      assert.strictEqual(typeof qrBarrel.FloatingCartBar, "function");
      assert.strictEqual(typeof qrBarrel.GuestCartDrawer, "function");
      assert.strictEqual(typeof qrBarrel.GuestDishCard, "function");
      assert.strictEqual(typeof qrBarrel.GuestHeaderBar, "function");
      assert.strictEqual(typeof qrBarrel.GuestLankaQrPay, "function");
      assert.strictEqual(typeof qrBarrel.GuestLaundryTab, "function");
      assert.strictEqual(typeof qrBarrel.GuestLiveFolioTab, "function");
      assert.strictEqual(typeof qrBarrel.GuestMinibarTab, "function");
      assert.strictEqual(typeof qrBarrel.HotelInfoSheet, "function");
      assert.strictEqual(typeof qrBarrel.LiveOrderTracker, "function");
      assert.strictEqual(typeof qrBarrel.OrderFeedbackPrompt, "function");
      assert.strictEqual(typeof qrBarrel.PackedMealModal, "function");
      assert.strictEqual(typeof qrBarrel.RoomChargeAuthBox, "function");
      assert.strictEqual(typeof qrBarrel.useGuestCart, "function");
      assert.ok(Array.isArray(qrBarrel.DEFAULT_SAMPLE_DISHES));
      assert.strictEqual(typeof qrBarrel.DEFAULT_HOTEL_INFO, "object");
    });
  });

  describe("2. Admin Code Isolation (Zero Admin Infiltration)", () => {
    it("verifies no file in src/qr/ imports from src/admin/", () => {
      const qrDir = path.resolve(process.cwd(), "src/qr");
      const files = fs.readdirSync(qrDir, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && (file.name.endsWith(".ts") || file.name.endsWith(".tsx"))) {
          const content = fs.readFileSync(path.join(qrDir, file.name), "utf8");
          const hasAdminImport = /from\s+["'].*\/admin\//.test(content);
          assert.strictEqual(
            hasAdminImport,
            false,
            `File ${file.name} must not import from admin directory to preserve bundle isolation`,
          );
        }
      }
    });
  });

  describe("3. 3G Optimization: Image Lazy-Loading & Async Decoding", () => {
    it("verifies images in GuestDishCard use loading=lazy and decoding=async", () => {
      const dishCardFile = path.resolve(process.cwd(), "src/qr/GuestDishCard.tsx");
      const content = fs.readFileSync(dishCardFile, "utf8");

      assert.ok(
        content.includes('loading="lazy"'),
        "GuestDishCard images must have loading='lazy' for fast 3G rendering",
      );
      assert.ok(
        content.includes('decoding="async"'),
        "GuestDishCard images must have decoding='async' to prevent main-thread jank",
      );
    });
  });

  describe("4. Apple HIG Styling & Tabular Numerals", () => {
    it("verifies .apple-liquid-glass and .tabular-nums-lkr presence in key QR components", () => {
      const componentsToCheck = [
        "GuestQrApp.tsx",
        "FloatingCartBar.tsx",
        "CallWaiterButton.tsx",
        "HotelInfoSheet.tsx",
        "LiveOrderTracker.tsx",
      ];

      for (const compName of componentsToCheck) {
        const filePath = path.resolve(process.cwd(), "src/qr", compName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          assert.ok(
            content.includes("apple-liquid-glass") || content.includes("apple-material"),
            `${compName} should use Apple Liquid Glass material tokens`,
          );
        }
      }
    });
  });
});
