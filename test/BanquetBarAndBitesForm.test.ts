/**
 * Unit Tests for Step 332: Per-Table Sri Lankan Bite Plates, Corkage & Bar Configurator (BanquetBarAndBitesForm.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BanquetBarAndBitesForm,
  DEFAULT_BITE_PLATTERS,
  DEFAULT_CHASERS,
  calculateBarAndBitesGrandTotal,
  calculateBitesSubtotal,
  calculateChasersSubtotal,
  calculateCorkageFee,
} from "../src/admin/banquets/index.js";

describe("Step 332: Per-Table Sri Lankan Bite Plates, Corkage & Bar Configurator (BanquetBarAndBitesForm.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Calculation & Domain Logic
  // --------------------------------------------------------------------------
  describe("1. Pure Financial & Logistics Calculators", () => {
    it("calculateBitesSubtotal calculates per-table platters across all tables", () => {
      const selectedBites = new Map<string, number>([
        ["bite-hbc", 1], // LKR 6,800
        ["bite-devilled-chicken", 1], // LKR 4,500
        ["bite-cashew-peas", 1], // LKR 5,200
      ]);

      // 6,800 + 4,500 + 5,200 = LKR 16,500 per table * 25 tables = LKR 412,500
      const subtotal = calculateBitesSubtotal(25, selectedBites, DEFAULT_BITE_PLATTERS);
      assert.strictEqual(subtotal, 412500);
    });

    it("calculateCorkageFee calculates excess bottle fees beyond waiver", () => {
      // 35 bottles, 15 waiver = 20 excess * LKR 1,500 = LKR 30,000
      const res = calculateCorkageFee(35, 15, 1500);
      assert.strictEqual(res.billableBottles, 20);
      assert.strictEqual(res.totalFeeLkr, 30000);

      // Within waiver
      const withinWaiver = calculateCorkageFee(12, 15, 1500);
      assert.strictEqual(withinWaiver.billableBottles, 0);
      assert.strictEqual(withinWaiver.totalFeeLkr, 0);
    });

    it("calculateChasersSubtotal calculates mixer costs based on unit prices", () => {
      const chasersMap = new Map<string, number>([
        ["chaser-soda", 50], // 50 * 350 = 17,500
        ["chaser-egb", 50], // 50 * 400 = 20,000
        ["chaser-coke", 30], // 30 * 400 = 12,000
      ]);

      const subtotal = calculateChasersSubtotal(chasersMap, DEFAULT_CHASERS);
      assert.strictEqual(subtotal, 49500);
    });

    it("calculateBarAndBitesGrandTotal sums bites, corkage, and chasers", () => {
      const selectedBites = new Map<string, number>([
        ["bite-hbc", 1], // 6,800
      ]);
      const chasersMap = new Map<string, number>([
        ["chaser-soda", 10], // 3,500
      ]);

      // 10 tables * 6,800 = 68,000 bites
      // 20 bottles - 15 waiver = 5 excess * 1,500 = 7,500 corkage
      // 3,500 chasers
      // Total = 68,000 + 7,500 + 3,500 = 79,000
      const summary = calculateBarAndBitesGrandTotal(10, selectedBites, 20, 15, 1500, chasersMap);
      assert.strictEqual(summary.totalBitesCostLkr, 68000);
      assert.strictEqual(summary.billableCorkageBottlesCount, 5);
      assert.strictEqual(summary.totalCorkageFeeLkr, 7500);
      assert.strictEqual(summary.totalChasersCostLkr, 3500);
      assert.strictEqual(summary.grandTotalBarAndBitesLkr, 79000);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Server-Side Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    it("renders default bar & bites configurator with event title and KPI summary", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBarAndBitesForm, {
          eventTitle: "Kavinda & Tharushi Poruwa Wedding",
          initialTablesCount: 25,
          language: "en",
        }),
      );

      assert.ok(
        html.includes("Banquet Bar, Corkage &amp; Devilled Bites Configurator") ||
          html.includes("Banquet Bar, Corkage & Devilled Bites Configurator"),
      );
      assert.ok(
        html.includes("Kavinda &amp; Tharushi Poruwa Wedding") ||
          html.includes("Kavinda & Tharushi Poruwa Wedding"),
      );
      assert.ok(html.includes("Devilled Bites Subtotal"));
      assert.ok(html.includes("Corkage Fee Subtotal"));
      assert.ok(
        html.includes("Grand Total Bar &amp; Bites Quote") ||
          html.includes("Grand Total Bar & Bites Quote"),
      );
    });

    it("renders all Sri Lankan devilled bite platters", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBarAndBitesForm, {
          language: "en",
        }),
      );

      assert.ok(html.includes("Hot Butter Cuttlefish (HBC)"));
      assert.ok(html.includes("Spicy Devilled Chicken"));
      assert.ok(html.includes("Slow-Braised Devilled Pork Belly"));
      assert.ok(
        html.includes("Fried Cashew Nuts &amp; Green Peas") ||
          html.includes("Fried Cashew Nuts & Green Peas"),
      );
      assert.ok(html.includes("Jumbo Devilled Prawns"));
      assert.ok(html.includes("Batter-Fried Crispy Mushrooms"));
    });

    it("renders corkage waiver policy and chasers", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBarAndBitesForm, {
          language: "en",
        }),
      );

      assert.ok(html.includes("Client Brought Liquor Bottles"));
      assert.ok(html.includes("Free Corkage Waiver Bottles"));
      assert.ok(html.includes("Elephant House Soda"));
      assert.ok(html.includes("Elephant House Ginger Beer (EGB)"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBarAndBitesForm, {
          language: "si",
        }),
      );

      assert.ok(html.includes("උත්සව බාර්, කෝකේජ් සහ ඩෙවිල්ඩ් බයිට්ස් සැකැස්ම"));
      assert.ok(html.includes("ශ්‍රී ලාංකික ඩෙවිල්ඩ් බයිට්ස් (මේසයකට)"));
      assert.ok(html.includes("කෝකේජ් (Corkage) ප්‍රතිපත්තිය"));
      assert.ok(html.includes("සැකැස්ම සුරකින්න"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetBarAndBitesForm, {
          language: "ta",
        }),
      );

      assert.ok(
        html.includes("மண்டப பார், கார்க்கேஜ் &amp; சிற்றுண்டி கட்டமைப்பு") ||
          html.includes("மண்டப பார், கார்க்கேஜ் & சிற்றுண்டி கட்டமைப்பு"),
      );
      assert.ok(html.includes("இலங்கை டெவில்ட் சிற்றுண்டிகள் (மேசைக்கு)"));
      assert.ok(html.includes("அமைப்பைச் சேமிக்கவும்"));
    });
  });
});
