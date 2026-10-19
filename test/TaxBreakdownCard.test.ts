import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TAX_CONFIG,
  QUICK_AMOUNT_PRESETS,
  TAX_PRESETS,
  type TaxAuditWalkResult,
  type TaxAuditWalkStage,
  TaxBreakdownCard,
  type TaxBreakdownCardProps,
  type TaxCalculationMode,
  type TaxCardConfig,
  type TaxPresetId,
  calculateTaxWalk,
  computeTaxMultiplier,
  roundLkr,
} from "../src/admin/folios/TaxBreakdownCard.js";

describe("Step 205: TaxBreakdownCard & Statutory Audit Walk", () => {
  describe("1. Exact Rounding Helper (roundLkr)", () => {
    it("handles non-finite numbers safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(100.004), 100);
      assert.strictEqual(roundLkr(100.005), 100.01);
      assert.strictEqual(roundLkr(134343), 134343);
    });
  });

  describe("2. Statutory Multiplier Derivation (computeTaxMultiplier)", () => {
    it("derives exact 1.34343x multiplier for standard luxury VAT hotel", () => {
      const multiplier = computeTaxMultiplier(DEFAULT_TAX_CONFIG);
      assert.strictEqual(multiplier, 1.34343);
    });

    it("derives exact 1.2213x multiplier for SC-exempt rate", () => {
      const scExempt = TAX_PRESETS.find((p) => p.id === "SC_EXEMPT_VAT");
      assert.ok(scExempt);
      const multiplier = computeTaxMultiplier(scExempt.config);
      assert.strictEqual(multiplier, 1.2213);
    });

    it("derives exact 1.111x multiplier for boutique non-VAT hotel", () => {
      const boutique = TAX_PRESETS.find((p) => p.id === "BOUTIQUE_NON_VAT");
      assert.ok(boutique);
      const multiplier = computeTaxMultiplier(boutique.config);
      assert.strictEqual(multiplier, 1.111);
    });

    it("derives exact 1.005x multiplier for small guesthouse 0.5% TDL concession", () => {
      const guesthouse = TAX_PRESETS.find((p) => p.id === "SMALL_GUESTHOUSE");
      assert.ok(guesthouse);
      const multiplier = computeTaxMultiplier(guesthouse.config);
      assert.strictEqual(multiplier, 1.005);
    });

    it("derives 1.0x multiplier for tax-exempt concession", () => {
      const exempt = TAX_PRESETS.find((p) => p.id === "TAX_EXEMPT");
      assert.ok(exempt);
      const multiplier = computeTaxMultiplier(exempt.config);
      assert.strictEqual(multiplier, 1);
    });
  });

  describe("3. Forward Mode 4-Stage Compounding Audit Walk (calculateTaxWalk)", () => {
    it("computes exact IRD & SLTDA stages for 100,000 LKR base supply", () => {
      const walk = calculateTaxWalk(100000, "FORWARD", DEFAULT_TAX_CONFIG);

      assert.strictEqual(walk.mode, "FORWARD");
      assert.strictEqual(walk.baseSupplyLkr, 100000);
      assert.strictEqual(walk.serviceChargeLkr, 10000); // Stage 1 SC (10%)
      assert.strictEqual(walk.subtotalAfterScLkr, 110000); // Subtotal A
      assert.strictEqual(walk.tdlLkr, 1100); // Stage 2 TDL (1%)
      assert.strictEqual(walk.ssclLkr, 2750); // Stage 3 SSCL (2.5%)
      assert.strictEqual(walk.vatBaseLkr, 113850); // VAT Base = 110000 + 1100 + 2750
      assert.strictEqual(walk.vatLkr, 20493); // Stage 4 VAT (18% of 113850)
      assert.strictEqual(walk.grandTotalLkr, 134343); // 110000 + 1100 + 2750 + 20493
      assert.strictEqual(walk.totalTaxesAndLeviesLkr, 34343);
      assert.strictEqual(walk.effectiveMultiplier, 1.34343);

      // Verify stages array
      assert.strictEqual(walk.stages.length, 8);
      assert.strictEqual(walk.stages[0]?.code, "BASE");
      assert.strictEqual(walk.stages[1]?.code, "SC");
      assert.strictEqual(walk.stages[2]?.code, "SUBTOTAL_A");
      assert.strictEqual(walk.stages[3]?.code, "TDL");
      assert.strictEqual(walk.stages[4]?.code, "SSCL");
      assert.strictEqual(walk.stages[5]?.code, "VAT_BASE");
      assert.strictEqual(walk.stages[6]?.code, "VAT");
      assert.strictEqual(walk.stages[7]?.code, "GRAND_TOTAL");
    });
  });

  describe("4. Reverse Mode (Inclusive) Audit Walk (calculateTaxWalk)", () => {
    it("derives exact 100,000 LKR net base from 134,343 LKR all-inclusive quotation", () => {
      const walk = calculateTaxWalk(134343, "REVERSE", DEFAULT_TAX_CONFIG);

      assert.strictEqual(walk.mode, "REVERSE");
      assert.strictEqual(walk.grandTotalLkr, 134343);
      assert.strictEqual(walk.baseSupplyLkr, 100000);
      assert.strictEqual(walk.serviceChargeLkr, 10000);
      assert.strictEqual(walk.subtotalAfterScLkr, 110000);
      assert.strictEqual(walk.tdlLkr, 1100);
      assert.strictEqual(walk.ssclLkr, 2750);
      assert.strictEqual(walk.vatBaseLkr, 113850);
      assert.strictEqual(walk.vatLkr, 20493);
      assert.strictEqual(walk.effectiveMultiplier, 1.34343);
    });

    it("handles reverse mode on SC-exempt 122,130 LKR all-inclusive quotation", () => {
      const scExempt = TAX_PRESETS.find((p) => p.id === "SC_EXEMPT_VAT");
      assert.ok(scExempt);
      const walk = calculateTaxWalk(122130, "REVERSE", scExempt.config);

      assert.strictEqual(walk.mode, "REVERSE");
      assert.strictEqual(walk.grandTotalLkr, 122130);
      assert.strictEqual(walk.baseSupplyLkr, 100000);
      assert.strictEqual(walk.serviceChargeLkr, 0);
      assert.strictEqual(walk.tdlLkr, 1000);
      assert.strictEqual(walk.ssclLkr, 2500);
      assert.strictEqual(walk.vatBaseLkr, 103500);
      assert.strictEqual(walk.vatLkr, 18630);
      assert.strictEqual(walk.effectiveMultiplier, 1.2213);
    });
  });

  describe("5. Presets & Static Constants", () => {
    it("provides all 5 standard Sri Lankan hospitality tax presets", () => {
      assert.strictEqual(TAX_PRESETS.length, 5);
      assert.deepStrictEqual(QUICK_AMOUNT_PRESETS, [10000, 25000, 50000, 100000, 250000]);
    });
  });

  describe("6. Type Integrity Verification", () => {
    it("verifies exported types and shapes are constructible", () => {
      const mode: TaxCalculationMode = "FORWARD";
      assert.strictEqual(mode, "FORWARD");

      const presetId: TaxPresetId = "LUXURY_VAT_HOTEL";
      assert.strictEqual(presetId, "LUXURY_VAT_HOTEL");

      const config: TaxCardConfig = DEFAULT_TAX_CONFIG;
      assert.strictEqual(config.enableSC, true);

      const stage: TaxAuditWalkStage = {
        stageNumber: 0,
        code: "BASE",
        name: "Base",
        statutoryCitation: "Taxable",
        rateDisplay: "100%",
        formulaDisplay: "B",
        amountLkr: 50000,
        isCumulativeSubtotal: false,
      };
      assert.strictEqual(stage.code, "BASE");

      const walk: TaxAuditWalkResult = calculateTaxWalk(50000, "FORWARD");
      assert.strictEqual(walk.baseSupplyLkr, 50000);

      const props: TaxBreakdownCardProps = {
        initialAmountLkr: 50000,
        initialMode: "FORWARD",
        title: "Test Tax Inspector",
      };
      assert.strictEqual(props.title, "Test Tax Inspector");
    });
  });

  describe("7. React Static DOM Rendering & Apple HIG Verification", () => {
    it("renders live tax inspector with preset chips, audit table, and summary bar", () => {
      const html = renderToStaticMarkup(
        React.createElement(TaxBreakdownCard, {
          initialAmountLkr: 100000,
          initialMode: "FORWARD",
        }),
      );

      // Header and certifications
      assert.ok(html.includes("Sri Lankan Hospitality Statutory Tax Inspector"));
      assert.ok(html.includes("IRD &amp; SLTDA Certified"));

      // Mode toggles
      assert.ok(html.includes("Forward (Exclusive)"));
      assert.ok(html.includes("Reverse (Inclusive)"));

      // Preset chips
      assert.ok(html.includes("Luxury VAT Hotel (Standard)"));
      assert.ok(html.includes("SC-Exempt / Government Rate"));
      assert.ok(html.includes("Boutique Non-VAT (&lt; LKR 60M)"));

      // Multiplier badge
      assert.ok(html.includes("Statutory Multiplier:"));
      assert.ok(html.includes("1.34343x"));

      // Stages in table
      assert.ok(html.includes("Base Supply (B)"));
      assert.ok(html.includes("10% Service Charge (SC)"));
      assert.ok(html.includes("Subtotal After SC (A)"));
      assert.ok(html.includes("Tourism Development Levy (TDL)"));
      assert.ok(html.includes("Social Security Contribution Levy (SSCL)"));
      assert.ok(html.includes("Combined VAT Base"));
      assert.ok(html.includes("Value Added Tax (VAT)"));
      assert.ok(html.includes("Grand Total Payable (G)"));

      // Statutory Citations
      assert.ok(html.includes("Shop &amp; Office Employees Act"));
      assert.ok(html.includes("Tourism Act No. 38 of 2005 (SLTDA)"));
      assert.ok(html.includes("SSCL Act No. 25 of 2022 (IRD)"));
      assert.ok(html.includes("Value Added Tax Act No. 14 of 2002"));

      // Revenue split summary bar
      assert.ok(html.includes("Statutory Revenue Split"));
      assert.ok(html.includes("Net Hotel Supply:"));
      assert.ok(html.includes("Government &amp; Staff:"));

      // Apple HIG styling classes
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("rounded-2xl"));
    });
  });
});
