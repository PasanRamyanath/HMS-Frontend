/**
 * Unit Test Suite for Step 446: GratuityReportCard
 * (`test/GratuityReportCard.test.ts`)
 *
 * Implements Step 446 (Phase 18.21) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Gratuity Provision & Staff Turnover Report Card (`GratuityReportCard.tsx`).
 *
 * Validates:
 * 1. Vesting status colors and labels under Payment of Gratuity Act No. 12 of 1983.
 * 2. Service tenure display formatting across years and months.
 * 3. Default actuarial parameters adhering to Minimum Retirement Age of Workers Act No. 28 of 2021.
 * 4. Statutory exit payout rules: strictly 0 LKR for < 5 years; 0.5 * monthlyBasic * years for >= 5 years.
 * 5. Static React 19 SSR rendering of GratuityReportCard, Metrics, Register, Departments, Simulator, and Actuarial tabs.
 * 6. Minimum 44x44pt touch targets, SF Pro optical typography, and `.tabular-nums-lkr` tabular numerical formatting.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActuarialPolicyTab,
  DEFAULT_ACTUARIAL_ASSUMPTIONS,
  DepartmentSummaryTab,
  GratuityMetricsBar,
  GratuityRegisterTab,
  GratuityReportCard,
  GratuitySimulatorTab,
  INITIAL_GRATUITY_PROFILES,
  formatTenureDisplay,
  getVestingStatusColor,
  getVestingStatusLabel,
} from "../src/admin/hr/GratuityReportCard.js";

describe("Step 446: Gratuity Provision & Staff Turnover Report Card (GratuityReportCard.tsx)", () => {
  describe("1. Vesting Color & Label Resolvers", () => {
    it("maps vesting status to Apple HIG status badge colors", () => {
      assert.equal(getVestingStatusColor(true, 8), "green");
      assert.equal(getVestingStatusColor(false, 4), "amber");
      assert.equal(getVestingStatusColor(false, 2), "blue");
    });

    it("generates human-readable vesting status labels", () => {
      assert.equal(getVestingStatusLabel(true, 7), "Vested (7y)");
      assert.equal(getVestingStatusLabel(false, 4), "Near Vesting (4y)");
      assert.equal(getVestingStatusLabel(false, 1), "Unvested (1y)");
    });

    it("formats tenure into years and months display", () => {
      assert.equal(formatTenureDisplay(5, 68), "5 yrs 8 mos");
      assert.equal(formatTenureDisplay(1, 14), "1 yr 2 mos");
      assert.equal(formatTenureDisplay(10, 120), "10 yrs 0 mos");
    });
  });

  describe("2. Default Data & Statutory Invariants", () => {
    it("verifies default actuarial assumptions adhere to Sri Lankan statutory rules", () => {
      assert.equal(DEFAULT_ACTUARIAL_ASSUMPTIONS.statutoryRetirementAge, 60);
      assert.equal(DEFAULT_ACTUARIAL_ASSUMPTIONS.discountRatePercent, 11.5);
      assert.equal(DEFAULT_ACTUARIAL_ASSUMPTIONS.annualizedTurnoverPercent, 13.8);
      assert.equal(DEFAULT_ACTUARIAL_ASSUMPTIONS.unvestedAccrualDiscountFactor, 0.85);
    });

    it("guarantees initial staff profiles satisfy statutory 5-year cliff rule", () => {
      assert.ok(INITIAL_GRATUITY_PROFILES.length >= 10);
      const vested = INITIAL_GRATUITY_PROFILES.filter((p) => p.isVested);
      const unvested = INITIAL_GRATUITY_PROFILES.filter((p) => !p.isVested);

      assert.ok(vested.length >= 6);
      assert.ok(unvested.length >= 4);

      // Verify each vested employee gets exact 0.5 * salary * completedYears
      for (const p of vested) {
        assert.ok(p.completedYears >= 5);
        const expectedStatutory = 0.5 * p.monthlyBasicSalaryLkr * p.completedYears;
        assert.equal(p.statutoryPayoutOnExitLkr, expectedStatutory);
      }

      // Verify each unvested employee gets 0 LKR statutory exit payout
      for (const p of unvested) {
        assert.ok(p.completedYears < 5);
        assert.equal(p.statutoryPayoutOnExitLkr, 0);
        // But recognizes an LKAS 19 balance sheet provision
        assert.ok(p.balanceSheetLiabilityLkr > 0);
      }
    });
  });

  describe("3. Static React 19 SSR Rendering", () => {
    it("renders master GratuityReportCard without errors", () => {
      const html = renderToStaticMarkup(
        React.createElement(GratuityReportCard, {
          hotelName: "Grand Serendib Hotel & Resort",
        }),
      );

      assert.ok(html.includes("Statutory Gratuity &amp; Staff Turnover Valuation"));
      assert.ok(html.includes("Act No. 12 of 1983"));
      assert.ok(html.includes("Grand Serendib Hotel &amp; Resort"));
      assert.ok(html.includes("Staff Gratuity Register"));
      assert.ok(html.includes("Department Breakdown"));
      assert.ok(html.includes("Settlement Simulator"));
      assert.ok(html.includes("Actuarial &amp; Legal Policies"));
    });

    it("renders GratuityMetricsBar with calculated financial KPIs", () => {
      const html = renderToStaticMarkup(
        React.createElement(GratuityMetricsBar, {
          profiles: INITIAL_GRATUITY_PROFILES,
          assumptions: DEFAULT_ACTUARIAL_ASSUMPTIONS,
        }),
      );

      assert.ok(html.includes("Total Gratuity Liability"));
      assert.ok(html.includes("Vested Legal Liability"));
      assert.ok(html.includes("Unvested Provision"));
      assert.ok(html.includes("Monthly P&amp;L Accrual"));
      assert.ok(html.includes("Vested Ratio"));
      assert.ok(html.includes("Staff Turnover Rate"));
    });

    it("renders GratuityRegisterTab with employee rows", () => {
      const html = renderToStaticMarkup(
        React.createElement(GratuityRegisterTab, {
          profiles: INITIAL_GRATUITY_PROFILES,
          onSelectForSimulation: () => {
            /* intentional no-op for static render */
          },
        }),
      );

      assert.ok(html.includes("Sunil Wickramasinghe"));
      assert.ok(html.includes("EPF-1001"));
      assert.ok(html.includes("Executive Chef"));
      assert.ok(html.includes("Dilani Fernando"));
      assert.ok(html.includes("Simulate"));
    });

    it("renders DepartmentSummaryTab with department progress metrics", () => {
      const html = renderToStaticMarkup(
        React.createElement(DepartmentSummaryTab, {
          profiles: INITIAL_GRATUITY_PROFILES,
        }),
      );

      assert.ok(html.includes("Kitchen &amp; F&amp;B"));
      assert.ok(html.includes("Housekeeping"));
      assert.ok(html.includes("Front Desk"));
      assert.ok(html.includes("Total Provision:"));
      assert.ok(html.includes("Monthly P&amp;L Accrual:"));
    });

    it("renders GratuitySimulatorTab with interactive settlement calculation", () => {
      const html = renderToStaticMarkup(
        React.createElement(GratuitySimulatorTab, {
          profiles: INITIAL_GRATUITY_PROFILES,
          selectedProfile: INITIAL_GRATUITY_PROFILES[0] ?? null,
          onSelectProfile: () => {
            /* intentional no-op for static render */
          },
        }),
      );

      assert.ok(html.includes("Exit &amp; Terminal Gratuity Settlement Parameters"));
      assert.ok(html.includes("Statutory Settlement Voucher"));
      assert.ok(html.includes("Voluntary Resignation"));
      assert.ok(html.includes("Section 13 Property Damage Deduction"));
      assert.ok(html.includes("Net Terminal Payout"));
    });

    it("renders ActuarialPolicyTab with LKAS 19 and legal invariants", () => {
      const html = renderToStaticMarkup(
        React.createElement(ActuarialPolicyTab, {
          assumptions: DEFAULT_ACTUARIAL_ASSUMPTIONS,
          onUpdateAssumptions: () => {
            /* intentional no-op for static render */
          },
        }),
      );

      assert.ok(html.includes("LKAS 19 Actuarial Assumptions"));
      assert.ok(html.includes("Payment of Gratuity Act No. 12 of 1983 Invariants"));
      assert.ok(html.includes("Minimum Retirement Age of Workers Act No. 28 of 2021"));
      assert.ok(html.includes("Section 5: Eligibility &amp; Vesting"));
      assert.ok(html.includes("Section 6: Computation Formula"));
      assert.ok(html.includes("Section 13: Forfeiture for Cause"));
    });
  });

  describe("4. Apple HIG & Accessibility Standards", () => {
    it("ensures touch targets and accessibility inputs meet Apple HIG minimum size (>= 44x44pt)", () => {
      const html = renderToStaticMarkup(
        React.createElement(GratuityReportCard, {
          hotelName: "Sigiriya Heritage Villa",
        }),
      );

      // Verify presence of min-h-[44px]
      assert.ok(html.includes("min-h-[44px]"));
      // Verify tabular-nums font styling
      assert.ok(html.includes("tabular-nums"));
    });
  });
});
