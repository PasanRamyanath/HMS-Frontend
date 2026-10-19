import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CATEGORY_PRESETS,
  type CategoryPresetConfig,
  type FolioChargeCategory,
  type FormValidationInput,
  PostFolioLineModal,
  type PostFolioLineModalProps,
  QUICK_ADD_AMOUNTS,
  REASON_CODE_OPTIONS,
  type TaxCalculationResult,
  calculateLineTaxes,
  getCategoryPreset,
  roundLkr,
  validatePostFolioLineForm,
} from "../src/admin/folios/PostFolioLineModal.js";
import { Department } from "../src/generated/graphql.js";

describe("Step 204: PostFolioLineModal & Statutory Tax Engine", () => {
  describe("1. Exact Rounding Helper (roundLkr)", () => {
    it("handles non-finite numbers safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(100.004), 100);
      assert.strictEqual(roundLkr(100.005), 100.01);
      assert.strictEqual(roundLkr(100.006), 100.01);
      assert.strictEqual(roundLkr(13434.3), 13434.3);
    });
  });

  describe("2. Statutory 4-Stage Tax Compounding (calculateLineTaxes)", () => {
    it("computes 10% SC -> 1% TDL -> 2.5% SSCL -> 18% VAT for standard 10,000 LKR base", () => {
      const breakdown = calculateLineTaxes(10000, false);

      // Stage 0: Base
      assert.strictEqual(breakdown.baseSupplyLkr, 10000);
      assert.strictEqual(breakdown.isServiceChargeExempt, false);

      // Stage 1: 10% SC
      assert.strictEqual(breakdown.serviceChargeLkr, 1000);
      assert.strictEqual(breakdown.subtotalAfterScLkr, 11000);

      // Stage 2: 1% TDL on Subtotal A
      assert.strictEqual(breakdown.tdlLkr, 110);

      // Stage 3: 2.5% SSCL on Subtotal A
      assert.strictEqual(breakdown.ssclLkr, 275);

      // VAT Base = Subtotal A + TDL + SSCL = 11000 + 110 + 275 = 11385
      assert.strictEqual(breakdown.vatBaseLkr, 11385);

      // Stage 4: 18% VAT = 11385 * 0.18 = 2049.30
      assert.strictEqual(breakdown.vatLkr, 2049.3);

      // Grand Total = 11000 + 110 + 275 + 2049.30 = 13434.30
      assert.strictEqual(breakdown.totalGrossLkr, 13434.3);

      // Effective multiplier = 13434.30 / 10000 = 1.34343
      assert.strictEqual(breakdown.effectiveMultiplier, 1.34343);
    });

    it("computes SC-Exempt rates with 1.2213x multiplier for 10,000 LKR damage/breakage", () => {
      const breakdown = calculateLineTaxes(10000, true);

      // Stage 0: Base
      assert.strictEqual(breakdown.baseSupplyLkr, 10000);
      assert.strictEqual(breakdown.isServiceChargeExempt, true);

      // Stage 1: SC is 0
      assert.strictEqual(breakdown.serviceChargeLkr, 0);
      assert.strictEqual(breakdown.subtotalAfterScLkr, 10000);

      // Stage 2: 1% TDL on Subtotal A
      assert.strictEqual(breakdown.tdlLkr, 100);

      // Stage 3: 2.5% SSCL on Subtotal A
      assert.strictEqual(breakdown.ssclLkr, 250);

      // VAT Base = 10000 + 100 + 250 = 10350
      assert.strictEqual(breakdown.vatBaseLkr, 10350);

      // Stage 4: 18% VAT = 10350 * 0.18 = 1863
      assert.strictEqual(breakdown.vatLkr, 1863);

      // Grand Total = 10000 + 100 + 250 + 1863 = 12213
      assert.strictEqual(breakdown.totalGrossLkr, 12213);

      // Effective multiplier = 12213 / 10000 = 1.2213
      assert.strictEqual(breakdown.effectiveMultiplier, 1.2213);
    });

    it("correctly reverses statutory taxes for negative manager rebates (-5,000 LKR)", () => {
      const breakdown = calculateLineTaxes(-5000, true);

      assert.strictEqual(breakdown.baseSupplyLkr, -5000);
      assert.strictEqual(breakdown.serviceChargeLkr, 0);
      assert.strictEqual(breakdown.subtotalAfterScLkr, -5000);
      assert.strictEqual(breakdown.tdlLkr, -50);
      assert.strictEqual(breakdown.ssclLkr, -125);
      assert.strictEqual(breakdown.vatBaseLkr, -5175);
      assert.strictEqual(breakdown.vatLkr, -931.5);
      assert.strictEqual(breakdown.totalGrossLkr, -6106.5);
      assert.strictEqual(breakdown.effectiveMultiplier, 1.2213);
    });

    it("supports custom tax rate overrides for specific guesthouse / small enterprise regimes", () => {
      const breakdown = calculateLineTaxes(10000, false, {
        scRate: 0.1,
        tdlRate: 0.005, // 0.5% small guesthouse concession
        ssclRate: 0.025,
        vatRate: 0.18,
      });

      assert.strictEqual(breakdown.serviceChargeLkr, 1000);
      assert.strictEqual(breakdown.subtotalAfterScLkr, 11000);
      assert.strictEqual(breakdown.tdlLkr, 55); // 11000 * 0.005
    });
  });

  describe("3. Presets & Reason Codes", () => {
    it("provides all mandatory hospitality charge categories", () => {
      const categories: FolioChargeCategory[] = [
        "LAUNDRY",
        "MINIBAR",
        "EARLY_CHECKIN",
        "LATE_CHECKOUT",
        "DAMAGE_BREAKAGE",
        "MANAGER_REBATE",
        "MISC_SERVICE",
      ];

      for (const cat of categories) {
        const preset = getCategoryPreset(cat);
        assert.strictEqual(preset.category, cat);
        assert.ok(preset.label.length > 0);
        assert.ok(preset.defaultDescription.length > 0);
        assert.ok(preset.defaultAmountLkr > 0);
      }
    });

    it("identifies MANAGER_REBATE as a rebate concession and DAMAGE_BREAKAGE as SC-exempt", () => {
      const rebate = getCategoryPreset("MANAGER_REBATE");
      assert.strictEqual(rebate.isRebate, true);
      assert.strictEqual(rebate.defaultDepartment, Department.FrontOffice);

      const damage = getCategoryPreset("DAMAGE_BREAKAGE");
      assert.strictEqual(damage.isRebate, false);
      assert.strictEqual(damage.defaultScExempt, true);
      assert.strictEqual(damage.defaultDepartment, Department.Housekeeping);
    });

    it("verifies statutory reason code list and justification flags", () => {
      assert.ok(REASON_CODE_OPTIONS.length >= 6);
      const serviceRecovery = REASON_CODE_OPTIONS.find((r) => r.code === "SERVICE_RECOVERY");
      assert.ok(serviceRecovery);
      assert.strictEqual(serviceRecovery?.requiresJustification, true);

      const earlyArrival = REASON_CODE_OPTIONS.find((r) => r.code === "EARLY_ARRIVAL_AGREED");
      assert.ok(earlyArrival);
      assert.strictEqual(earlyArrival?.requiresJustification, false);
    });

    it("includes quick-add currency presets and presets array", () => {
      assert.deepStrictEqual(QUICK_ADD_AMOUNTS, [1000, 2500, 5000, 10000, 25000]);
      assert.strictEqual(CATEGORY_PRESETS.length, 7);
    });
  });

  describe("4. Form Validation Logic (validatePostFolioLineForm)", () => {
    it("rejects empty description or whitespace-only description", () => {
      const result = validatePostFolioLineForm({
        description: "   ",
        unitPriceLkr: 1000,
        quantity: 1,
        isReasonRequired: false,
        notes: "",
      });
      assert.strictEqual(result, "Please enter a valid description for this charge.");
    });

    it("rejects non-positive amounts and quantities less than 1", () => {
      const priceResult = validatePostFolioLineForm({
        description: "Laundry",
        unitPriceLkr: 0,
        quantity: 1,
        isReasonRequired: false,
        notes: "",
      });
      assert.strictEqual(priceResult, "Amount must be greater than zero.");

      const qtyResult = validatePostFolioLineForm({
        description: "Laundry",
        unitPriceLkr: 1000,
        quantity: 0,
        isReasonRequired: false,
        notes: "",
      });
      assert.strictEqual(qtyResult, "Quantity must be at least 1.");
    });

    it("enforces justification notes for concessions and damage charges", () => {
      const err = validatePostFolioLineForm({
        description: "GM Goodwill Concession",
        unitPriceLkr: 5000,
        quantity: 1,
        isReasonRequired: true,
        notes: "bad", // < 5 chars
      });
      assert.strictEqual(
        err,
        "Manager concessions and damage charges require at least 5 characters of documented justification.",
      );

      const valid = validatePostFolioLineForm({
        description: "GM Goodwill Concession",
        unitPriceLkr: 5000,
        quantity: 1,
        isReasonRequired: true,
        notes: "Authorized by GM for AC outage in Villa 104",
      });
      assert.strictEqual(valid, null);
    });
  });

  describe("5. React Static DOM Rendering & Apple HIG Compliance", () => {
    it("renders modal with category presets, SC-exempt toggle, and live 4-stage tax card", () => {
      const html = renderToStaticMarkup(
        React.createElement(PostFolioLineModal, {
          isOpen: true,
          onClose: () => {
            /* no-op for static render */
          },
          onSubmit: () => {
            /* no-op for static render */
          },
          guestContext: {
            guestFullName: "Alexander von Bergmann",
            roomNumber: "Villa 104",
            bookingReference: "BK-GALLE-7718",
            dmcContractName: "Aitken Spence Travels Sri Lanka",
          },
        }),
      );

      // Guest context verification
      assert.ok(html.includes("Alexander von Bergmann"));
      assert.ok(html.includes("Villa 104"));
      assert.ok(html.includes("Aitken Spence Travels Sri Lanka"));

      // Sub-folio destination choices
      assert.ok(html.includes("Guest Personal Folio"));
      assert.ok(html.includes("DMC Master Folio"));

      // Charge categories
      assert.ok(html.includes("Laundry &amp; Dry Cleaning"));
      assert.ok(html.includes("Minibar Restock"));
      assert.ok(html.includes("Early Check-In"));
      assert.ok(html.includes("Damage &amp; Breakage"));
      assert.ok(html.includes("Manager Rebate / Concession"));

      // Statutory tax breakdown card
      assert.ok(html.includes("Statutory 4-Stage Tax Breakdown (IRD &amp; SLTDA)"));
      assert.ok(html.includes("1.34343x Standard"));
      assert.ok(html.includes("Stage 0 Base"));
      assert.ok(html.includes("Stage 1 SC"));
      assert.ok(html.includes("Stage 2 &amp; 3 Levies"));
      assert.ok(html.includes("Stage 4 VAT (18%)"));

      // SC-Exempt toggle
      assert.ok(html.includes("Exempt 10% Service Charge (SC-Free)"));

      // Apple HIG styling classes
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("rounded-2xl"));
    });
  });

  describe("6. Type Integrity Verification", () => {
    it("verifies exported types and shapes are constructible", () => {
      const samplePreset: CategoryPresetConfig = {
        category: "LAUNDRY",
        label: "Laundry",
        defaultDepartment: Department.Housekeeping,
        defaultDescription: "Laundry",
        defaultAmountLkr: 3500,
        defaultScExempt: false,
        isRebate: false,
      };
      assert.strictEqual(samplePreset.category, "LAUNDRY");

      const sampleTax: TaxCalculationResult = {
        baseSupplyLkr: 1000,
        isServiceChargeExempt: false,
        serviceChargeLkr: 100,
        subtotalAfterScLkr: 1100,
        tdlLkr: 11,
        ssclLkr: 27.5,
        vatBaseLkr: 1138.5,
        vatLkr: 204.93,
        totalGrossLkr: 1343.43,
        effectiveMultiplier: 1.34343,
      };
      assert.strictEqual(sampleTax.baseSupplyLkr, 1000);

      const sampleInput: FormValidationInput = {
        description: "Laundry",
        unitPriceLkr: 1000,
        quantity: 1,
        isReasonRequired: false,
        notes: "",
      };
      assert.strictEqual(sampleInput.description, "Laundry");

      const sampleProps: PostFolioLineModalProps = {
        isOpen: true,
        onClose: () => {
          /* no-op */
        },
        onSubmit: () => {
          /* no-op */
        },
      };
      assert.strictEqual(sampleProps.isOpen, true);
    });
  });
});
