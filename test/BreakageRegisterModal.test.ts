/**
 * Unit Test Suite for Step 433: BreakageRegisterModal
 * (`test/BreakageRegisterModal.test.ts`)
 *
 * Implements Step 433 (Phase 18.08) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Breakage & Damaged Glassware/Linen Ledger Backing the SC Pool Deduction (`BreakageRegisterModal.tsx`).
 *
 * Validates:
 * 1. Breakage category definitions and Apple HIG styling tokens.
 * 2. Summary calculation of itemized broken assets against the SC breakage allowance.
 * 3. Accurate variance computation showing surplus returning to staff SC pool.
 * 4. Filter predicate matching by category, department, and search keywords.
 * 5. React 19 SSR component rendering of modal dialog, metrics, and incident table.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BREAKAGE_CATEGORY_DEFINITIONS,
  BREAKAGE_FILTER_OPTIONS,
  BreakageRegisterModal,
  DEFAULT_BREAKAGE_INCIDENTS,
  calculateBreakageSummary,
  matchesBreakageFilters,
} from "../src/admin/hr/BreakageRegisterModal.js";

describe("Step 433: Breakage & Damaged Glassware/Linen Ledger Modal (BreakageRegisterModal.tsx)", () => {
  describe("1. Category Definitions & Metadata", () => {
    it("defines standard hospitality breakage categories with icons and HIG colors", () => {
      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.GLASSWARE.label, "Glassware");
      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.GLASSWARE.color, "blue");

      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.CROCKERY.label, "Crockery / Plates");
      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.CROCKERY.color, "amber");

      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.LINEN.label, "Linen & Towels");
      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.LINEN.color, "indigo");

      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.KITCHEN_EQUIPMENT.label, "Kitchen Equipment");
      assert.equal(BREAKAGE_CATEGORY_DEFINITIONS.KITCHEN_EQUIPMENT.color, "red");
    });

    it("provides segmented control options covering all primary categories", () => {
      assert.ok(BREAKAGE_FILTER_OPTIONS.length >= 6);
      const catIds = BREAKAGE_FILTER_OPTIONS.map((o) => o.id);
      assert.ok(catIds.includes("ALL"));
      assert.ok(catIds.includes("GLASSWARE"));
      assert.ok(catIds.includes("CROCKERY"));
      assert.ok(catIds.includes("LINEN"));
    });
  });

  describe("2. Breakage Summary & SC Allowance Variance", () => {
    it("computes total items, total costs, and variance against permitted allowance", () => {
      const allowance = 172500.0; // 5% of LKR 3.45M SC
      const summary = calculateBreakageSummary(DEFAULT_BREAKAGE_INCIDENTS, allowance);

      assert.equal(summary.totalIncidents, 6);
      // Items sum: 6 + 8 + 12 + 10 + 15 + 1 = 52 items
      assert.equal(summary.totalItemsCount, 52);

      // Cost sum: 19500 + 32800 + 34200 + 14500 + 12750 + 28000 = 141,750 LKR
      assert.equal(summary.totalBreakageCostLkr, 141750.0);

      // Variance = Allowance 172,500 - 141,750 = 30,750 LKR (Unused allowance surplus)
      assert.equal(summary.varianceLkr, 30750.0);

      // Staff committee verified count (5 lines verified, 1 line pending)
      assert.equal(summary.verifiedLinesCount, 5);
    });
  });

  describe("3. Filter Predicate Matching", () => {
    it("filters incidents by category accurately", () => {
      const sample = DEFAULT_BREAKAGE_INCIDENTS[0];
      assert.ok(sample);

      assert.equal(matchesBreakageFilters(sample, "GLASSWARE", "ALL", ""), true);
      assert.equal(matchesBreakageFilters(sample, "LINEN", "ALL", ""), false);
      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", ""), true);
    });

    it("searches incidents by item name, location, or reported staff", () => {
      const sample = DEFAULT_BREAKAGE_INCIDENTS[0];
      assert.ok(sample);

      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", "Schott"), true);
      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", "Fine Dining"), true);
      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", "Roshan"), true);
      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", "EPF-1115"), true);
      assert.equal(matchesBreakageFilters(sample, "ALL", "ALL", "UnmatchedItem"), false);
    });
  });

  describe("4. React 19 SSR Component Rendering", () => {
    it("renders BreakageRegisterModal open dialog without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(BreakageRegisterModal, {
          isOpen: true,
          onClose: () => undefined,
          initialIncidents: DEFAULT_BREAKAGE_INCIDENTS,
          scBreakageAllowanceLkr: 172500.0,
        }),
      );

      assert.ok(html.includes("Breakage &amp; Damaged Linen Audit Ledger"));
      assert.ok(html.includes("Phase 18.08"));
      assert.ok(html.includes("SC Breakage Allowance"));
      assert.ok(html.includes("Total Audited Breakage"));
      assert.ok(html.includes("Unused Allowance (Staff Surplus)"));
      assert.ok(html.includes("Schott Zwiesel Crystal Red Wine Glasses"));
      assert.ok(html.includes("Noritake Porcelain Dinner Plates"));
      assert.ok(html.includes("Luxury Pool Towels"));
      assert.ok(html.includes("Record Breakage"));
    });

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(BreakageRegisterModal, {
          isOpen: false,
          onClose: () => undefined,
        }),
      );

      assert.equal(html, "");
    });
  });
});
