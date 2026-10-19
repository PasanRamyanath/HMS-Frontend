import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DMC_CONTRACTS,
  DEFAULT_SPLIT_FOLIO_RULES,
  type DmcContract,
  DmcContractManager,
  type DmcContractManagerProps,
  type DmcCurrency,
  type DmcPartnerTier,
  type SeasonalContractRate,
  type SplitFolioRule,
  calculateCreditUtilization,
  validateDmcContract,
} from "../src/admin/frontdesk/DmcContractManager.js";

describe("DMC & Travel Agent Contract Directory (DmcContractManager.tsx)", () => {
  describe("Credit Utilization Math (calculateCreditUtilization)", () => {
    it("calculates utilization and available credit under safe thresholds (< 60%)", () => {
      // Limit 10M, Used 4M -> 40% used, 6M available, green
      const res = calculateCreditUtilization(10000000, 4000000);
      assert.strictEqual(res.availableLkr, 6000000);
      assert.strictEqual(res.utilizationPercent, 40);
      assert.strictEqual(res.isOverLimit, false);
      assert.strictEqual(res.statusColor, "green");
    });

    it("assigns amber status when utilization is between 60% and 84%", () => {
      // Limit 10M, Used 7M -> 70% used, amber
      const res = calculateCreditUtilization(10000000, 7000000);
      assert.strictEqual(res.availableLkr, 3000000);
      assert.strictEqual(res.utilizationPercent, 70);
      assert.strictEqual(res.isOverLimit, false);
      assert.strictEqual(res.statusColor, "amber");
    });

    it("assigns red status when utilization reaches or exceeds 85%", () => {
      // Limit 10M, Used 9M -> 90% used, red
      const res = calculateCreditUtilization(10000000, 9000000);
      assert.strictEqual(res.availableLkr, 1000000);
      assert.strictEqual(res.utilizationPercent, 90);
      assert.strictEqual(res.isOverLimit, false);
      assert.strictEqual(res.statusColor, "red");
    });

    it("flags over-limit credit lines with red status and 0 available", () => {
      // Limit 5M, Used 6M -> 100% clamped, over limit, red
      const res = calculateCreditUtilization(5000000, 6000000);
      assert.strictEqual(res.availableLkr, 0);
      assert.strictEqual(res.utilizationPercent, 100);
      assert.strictEqual(res.isOverLimit, true);
      assert.strictEqual(res.statusColor, "red");
    });

    it("handles zero credit limit safely", () => {
      const res = calculateCreditUtilization(0, 0);
      assert.strictEqual(res.availableLkr, 0);
      assert.strictEqual(res.utilizationPercent, 0);
      assert.strictEqual(res.isOverLimit, false);
    });
  });

  describe("Contract Validation (validateDmcContract)", () => {
    it("passes validation for complete DMC contract data", () => {
      const valid: Partial<DmcContract> = {
        companyName: "Jetwing Travels",
        contractCode: "DMC-JETWING-2026",
        creditLimitLkr: 5000000,
        creditDays: 30,
        contactEmail: "res@jetwing.lk",
      };
      const res = validateDmcContract(valid);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it("fails when company name is too short or missing", () => {
      const res = validateDmcContract({ companyName: "A" });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /legal name/i);
    });

    it("fails when contract code is missing", () => {
      const res = validateDmcContract({ companyName: "Aitken Spence", contractCode: "" });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /contract code/i);
    });

    it("fails when credit limit is negative", () => {
      const res = validateDmcContract({
        companyName: "Walkers Tours",
        contractCode: "DMC-WALKERS",
        creditLimitLkr: -100,
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /credit limit/i);
    });

    it("fails when email is invalid or missing @", () => {
      const res = validateDmcContract({
        companyName: "Diethelm Travel",
        contractCode: "DMC-DIETHELM",
        creditLimitLkr: 1000000,
        creditDays: 30,
        contactEmail: "invalid-email",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /email/i);
    });
  });

  describe("Default Presets & Catalog", () => {
    it("exports major Sri Lankan DMCs in DEFAULT_DMC_CONTRACTS", () => {
      assert.ok(DEFAULT_DMC_CONTRACTS.length >= 5);
      const codes = DEFAULT_DMC_CONTRACTS.map((c) => c.contractCode);
      assert.ok(codes.includes("DMC-AITKEN-2026"));
      assert.ok(codes.includes("DMC-WALKERS-2026"));
      assert.ok(codes.includes("DMC-JETWING-2026"));
      assert.ok(codes.includes("DMC-DIETHELM-2026"));
      assert.ok(codes.includes("DMC-BESPOKE-2026"));
    });

    it("enforces standard split-folio rules: Room+Meals to DMC, Extras to Guest", () => {
      assert.ok(DEFAULT_SPLIT_FOLIO_RULES.length >= 4);

      const roomRule = DEFAULT_SPLIT_FOLIO_RULES.find((r) => r.department === "ACCOMMODATION");
      assert.strictEqual(roomRule?.targetFolio, "DMC_MASTER");

      const mealRule = DEFAULT_SPLIT_FOLIO_RULES.find((r) => r.department === "MEALS");
      assert.strictEqual(mealRule?.targetFolio, "DMC_MASTER");

      const barRule = DEFAULT_SPLIT_FOLIO_RULES.find((r) => r.department === "BEVERAGE_EXTRAS");
      assert.strictEqual(barRule?.targetFolio, "GUEST_EXTRAS");

      const spaRule = DEFAULT_SPLIT_FOLIO_RULES.find((r) => r.department === "SPA");
      assert.strictEqual(spaRule?.targetFolio, "GUEST_EXTRAS");
    });

    it("verifies type definitions are constructible", () => {
      const currency: DmcCurrency = "USD";
      const tier: DmcPartnerTier = "KEY_ACCOUNT";
      const rule: SplitFolioRule = {
        department: "ACCOMMODATION",
        targetFolio: "DMC_MASTER",
        percentage: 100,
        description: "Test",
      };
      const rate: SeasonalContractRate = {
        id: "rate-1",
        seasonName: "PEAK",
        roomType: "Deluxe Ocean Villa",
        mealPlan: "HB",
        netRate: 220,
        currency,
      };
      const props: DmcContractManagerProps = {
        readOnly: true,
      };
      assert.strictEqual(tier, "KEY_ACCOUNT");
      assert.strictEqual(rate.netRate, 220);
      assert.strictEqual(rule.targetFolio, "DMC_MASTER");
      assert.strictEqual(props.readOnly, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders aggregate KPI metrics banner", () => {
      const html = renderToStaticMarkup(React.createElement(DmcContractManager, {}));

      assert.ok(html.includes("Active Tour Operator Contracts"));
      assert.ok(html.includes("Total Outstanding City Ledger"));
      assert.ok(html.includes("Total Credit Facilities Granted"));
    });

    it("renders contracts with company names, codes, and credit progress bars", () => {
      const html = renderToStaticMarkup(React.createElement(DmcContractManager, {}));

      assert.ok(html.includes("Aitken Spence Travels"));
      assert.ok(html.includes("DMC-AITKEN-2026"));
      assert.ok(html.includes("Walkers Tours"));
      assert.ok(html.includes("DMC-WALKERS-2026"));
      assert.ok(html.includes("Jetwing Travels"));
      assert.ok(html.includes("30 Days Net"));
      assert.ok(html.includes("Split-Folio Billing Rule:"));
    });

    it("renders search input and category filter segmented controls", () => {
      const html = renderToStaticMarkup(React.createElement(DmcContractManager, {}));

      assert.ok(html.includes("Search by tour company"));
      assert.ok(html.includes("All Agencies"));
      assert.ok(html.includes("Key Accounts"));
      assert.ok(html.includes("Preferred"));
      assert.ok(html.includes("Boutique"));
    });

    it("hides registration button and edit controls when readOnly is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(DmcContractManager, {
          readOnly: true,
        }),
      );

      assert.ok(!html.includes("+ Register New DMC Contract"));
      assert.ok(!html.includes("Edit Terms"));
    });
  });
});
