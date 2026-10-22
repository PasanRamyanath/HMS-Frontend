import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeColorPicker } from "../src/admin/settings/ThemeColorPicker.js";
import {
  DEFAULT_THEME_COLOR,
  PRESET_THEME_PALETTES,
  adjustBrightness,
  applyThemeColor,
  getContrastTextColor,
  getStoredThemeColor,
  hexToRgb,
  isValidHexColor,
  resetThemeColor,
  subscribeToThemeColor,
} from "../src/lib/themeColor.js";

describe("Sri Lanka HMS Dynamic Theme Color & Palette Engine (themeColor.ts)", () => {
  describe("1. Hex Validation (isValidHexColor)", () => {
    it("accepts valid 3, 6, and 8-digit hexadecimal colors", () => {
      assert.strictEqual(isValidHexColor("#0D7450"), true);
      assert.strictEqual(isValidHexColor("#fff"), true);
      assert.strictEqual(isValidHexColor("#0284C7"), true);
      assert.strictEqual(isValidHexColor("#E8772EFF"), true);
      assert.strictEqual(isValidHexColor(" #7C3AED "), true);
    });

    it("rejects invalid hex strings", () => {
      assert.strictEqual(isValidHexColor(""), false);
      assert.strictEqual(isValidHexColor("emerald"), false);
      assert.strictEqual(isValidHexColor("#12"), false);
      assert.strictEqual(isValidHexColor("#12345"), false);
      assert.strictEqual(isValidHexColor("#GGGGGG"), false);
      assert.strictEqual(isValidHexColor("rgb(0,0,0)"), false);
    });
  });

  describe("2. RGB Parsing & Color Calculations", () => {
    it("parses 6-digit hex to RGB accurately", () => {
      const rgb = hexToRgb("#0D7450");
      assert.ok(rgb);
      assert.strictEqual(rgb.r, 13);
      assert.strictEqual(rgb.g, 116);
      assert.strictEqual(rgb.b, 80);
    });

    it("parses 3-digit shorthand hex to RGB", () => {
      const rgb = hexToRgb("#FFF");
      assert.ok(rgb);
      assert.strictEqual(rgb.r, 255);
      assert.strictEqual(rgb.g, 255);
      assert.strictEqual(rgb.b, 255);
    });

    it("returns null for malformed hex strings", () => {
      assert.strictEqual(hexToRgb("invalid"), null);
      assert.strictEqual(hexToRgb("#1234"), null);
    });

    it("adjusts brightness within [0, 255] boundaries", () => {
      const darkened = adjustBrightness("#0D7450", -20);
      assert.ok(darkened.startsWith("#"));
      assert.notStrictEqual(darkened, "#0D7450");

      const brightened = adjustBrightness("#0D7450", 30);
      assert.ok(brightened.startsWith("#"));
      assert.notStrictEqual(brightened, "#0D7450");
    });

    it("determines high-contrast readable text color", () => {
      // Dark emerald should use white text
      assert.strictEqual(getContrastTextColor("#0D7450"), "#FFFFFF");
      // Black should use white text
      assert.strictEqual(getContrastTextColor("#000000"), "#FFFFFF");
      // White/light yellow should use dark slate text
      assert.strictEqual(getContrastTextColor("#FFFFFF"), "#0F172A");
      assert.strictEqual(getContrastTextColor("#FEF08A"), "#0F172A");
    });
  });

  describe("3. Presets & Storage Engine", () => {
    it("contains 8 curated Ceylon luxury presets with valid colors", () => {
      assert.strictEqual(PRESET_THEME_PALETTES.length, 8);
      for (const preset of PRESET_THEME_PALETTES) {
        assert.ok(preset.id);
        assert.ok(preset.name);
        assert.ok(preset.subtitle);
        assert.ok(preset.emoji);
        assert.ok(isValidHexColor(preset.hex), `Invalid hex for ${preset.name}`);
      }
    });

    it("defaults to Ceylon Botanical Emerald (#0D7450)", () => {
      assert.strictEqual(DEFAULT_THEME_COLOR, "#0D7450");
      assert.strictEqual(getStoredThemeColor(), "#0D7450");
    });

    it("supports subscribing to theme updates and resetting", () => {
      let notifiedColor = "";
      const unsubscribe = subscribeToThemeColor((color) => {
        notifiedColor = color;
      });

      applyThemeColor("#0284C7");
      assert.strictEqual(notifiedColor, "#0284C7");
      resetThemeColor();
      assert.strictEqual(notifiedColor, DEFAULT_THEME_COLOR);
      assert.ok(typeof unsubscribe === "function");
      unsubscribe();
    });
  });

  describe("4. Static React Markup & UI Verification (ThemeColorPicker)", () => {
    it("renders ThemeColorPicker with header, presets grid, and custom inputs", () => {
      const html = renderToStaticMarkup(React.createElement(ThemeColorPicker));

      assert.ok(html.includes("Platform Theme &amp; Brand Palette"));
      assert.ok(html.includes("Curated Ceylon Luxury Palettes"));
      assert.ok(html.includes("Ceylon Emerald"));
      assert.ok(html.includes("Ocean Sapphire"));
      assert.ok(html.includes("Sunset Coral"));
      assert.ok(html.includes("Royal Amethyst"));
      assert.ok(html.includes("Kandyan Gold"));
      assert.ok(html.includes("Obsidian Slate"));
      assert.ok(html.includes("Custom Hex Code"));
      assert.ok(html.includes("Live Preview Across Components"));
      assert.ok(html.includes("Reset Default"));
    });
  });
});
