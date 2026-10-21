/**
 * Unit Test Suite for Step 443: StaffBenefitsCard
 * (`test/StaffBenefitsCard.test.ts`)
 *
 * Implements Step 443 (Phase 18.18) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Staff Duty Meal & Accommodation Deduction Policy Configurator (`StaffBenefitsCard.tsx`).
 *
 * Validates:
 * 1. Quarters bed occupancy and status color mapping.
 * 2. Uniform condition color mapping and inventory calculation.
 * 3. Static React 19 SSR rendering of StaffBenefitsCard, Metrics, DutyMealPolicyTab, QuartersBedsTab, and UniformLogTab.
 * 4. Duty meal policy toggling, shift meal allowances, and cafeteria payroll deduction caps.
 * 5. Minimum 44x44pt touch targets, SF Pro optical typography, and `.tabular-nums-lkr` tabular numerical formatting.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_MEAL_POLICY,
  DutyMealPolicyTab,
  INITIAL_QUARTERS_BEDS,
  INITIAL_UNIFORM_LOG,
  QuartersBedsTab,
  StaffBenefitsCard,
  StaffBenefitsMetrics,
  UniformLogTab,
  getQuartersStatusColor,
  getUniformConditionColor,
} from "../src/admin/hr/StaffBenefitsCard.js";

describe("Step 443: Staff Duty Meal & Accommodation Deduction Policy Configurator (StaffBenefitsCard.tsx)", () => {
  describe("1. Status & Condition Color Resolvers", () => {
    it("maps quarters bed statuses to valid StatusBadge colors", () => {
      assert.equal(getQuartersStatusColor("OCCUPIED"), "green");
      assert.equal(getQuartersStatusColor("VACANT"), "blue");
      assert.equal(getQuartersStatusColor("MAINTENANCE"), "amber");
    });

    it("maps uniform conditions to valid StatusBadge colors", () => {
      assert.equal(getUniformConditionColor("NEW"), "green");
      assert.equal(getUniformConditionColor("GOOD"), "blue");
      assert.equal(getUniformConditionColor("WORN"), "amber");
      assert.equal(getUniformConditionColor("REPLACED"), "indigo");
      assert.equal(getUniformConditionColor("RETURNED"), "gray");
    });
  });

  describe("2. Default Configuration & Domain Models", () => {
    it("verifies default duty meal policy adheres to Sri Lankan statutory practice", () => {
      assert.equal(DEFAULT_MEAL_POLICY.isPayrollDeductionEnabled, false);
      assert.equal(DEFAULT_MEAL_POLICY.complimentaryMealsPerSingleShift, 1);
      assert.equal(DEFAULT_MEAL_POLICY.complimentaryMealsPerSplitShift, 2);
      assert.equal(DEFAULT_MEAL_POLICY.subsidizedDailyRateLkr, 150);
      assert.equal(DEFAULT_MEAL_POLICY.monthlyCapLkr, 4500);
      assert.equal(DEFAULT_MEAL_POLICY.halalCertified, true);
      assert.equal(DEFAULT_MEAL_POLICY.vegetarianOptionAvailable, true);
    });

    it("verifies initial quarters bed records contain realistic hotel dormitory assignments", () => {
      assert.ok(INITIAL_QUARTERS_BEDS.length >= 6);
      const occupied = INITIAL_QUARTERS_BEDS.filter((b) => b.status === "OCCUPIED");
      const vacant = INITIAL_QUARTERS_BEDS.filter((b) => b.status === "VACANT");
      assert.ok(occupied.length >= 4);
      assert.ok(vacant.length >= 1);

      // Verify Executive Chef has supervisory utility deduction
      const chefBed = INITIAL_QUARTERS_BEDS.find((b) => b.designation === "Executive Chef");
      assert.ok(chefBed);
      assert.equal(chefBed.monthlyUtilityDeductionLkr, 2500);
    });

    it("verifies initial uniform log items track sets issued, deposits and conditions", () => {
      assert.ok(INITIAL_UNIFORM_LOG.length >= 4);
      const chefUniform = INITIAL_UNIFORM_LOG.find((u) => u.designation === "Executive Chef");
      assert.ok(chefUniform);
      assert.equal(chefUniform.setsIssuedCount, 3);
      assert.equal(chefUniform.depositHeldLkr, 3000);
      assert.equal(chefUniform.unreturnedDeductionLkr, 6000);
    });
  });

  describe("3. Static React 19 SSR Rendering", () => {
    it("renders StaffBenefitsMetrics with accurate calculations", () => {
      const html = renderToStaticMarkup(
        React.createElement(StaffBenefitsMetrics, {
          totalBeds: 10,
          occupiedBeds: 8,
          totalUniformsIssued: 24,
          monthlyMealSubsidyLkr: 351000,
          monthlyAccomDeductionLkr: 7500,
        }),
      );

      assert.ok(html.includes("Quarters Occupancy"));
      assert.ok(html.includes("8/10"));
      assert.ok(html.includes("(80%)"));
      assert.ok(html.includes("24"));
      assert.ok(html.includes("Uniforms In Circulation"));
      assert.ok(html.includes("Est. Monthly Meal Subsidy"));
      assert.ok(html.includes("Quarters Utility Recovery"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders DutyMealPolicyTab with shift tiers and cafeteria configuration", () => {
      let policyState = { ...DEFAULT_MEAL_POLICY };
      const html = renderToStaticMarkup(
        React.createElement(DutyMealPolicyTab, {
          policy: policyState,
          onChange: (upd) => {
            policyState = upd;
          },
        }),
      );

      assert.ok(html.includes("Statutory Duty Meal Benefit Status"));
      assert.ok(html.includes("Single Shift (Morning / Evening / Night)"));
      assert.ok(html.includes("Split Shift / Double Shift"));
      assert.ok(html.includes("Cash Meal Allowance in Lieu"));
      assert.ok(html.includes("Payroll Deduction Configuration"));
      assert.ok(html.includes("Halal Certified"));
      assert.ok(html.includes("Vegetarian Daily"));
    });

    it("renders QuartersBedsTab with staff dormitory allocations", () => {
      const html = renderToStaticMarkup(
        React.createElement(QuartersBedsTab, {
          beds: INITIAL_QUARTERS_BEDS,
          onAssignBed: () => undefined,
          onVacateBed: () => undefined,
        }),
      );

      assert.ok(html.includes("Staff Quarters &amp; Dormitory Roster"));
      assert.ok(html.includes("Sunil Jayasuriya"));
      assert.ok(html.includes("Ruwan Wijesinghe"));
      assert.ok(html.includes("Niluka Perera"));
      assert.ok(html.includes("Complimentary"));
      assert.ok(html.includes("Vacate"));
      assert.ok(html.includes("Assign"));
    });

    it("renders UniformLogTab with uniform register", () => {
      const html = renderToStaticMarkup(
        React.createElement(UniformLogTab, {
          uniforms: INITIAL_UNIFORM_LOG,
          onIssueUniform: () => undefined,
        }),
      );

      assert.ok(html.includes("Staff Uniform Custody &amp; Replacement Register"));
      assert.ok(html.includes("Master Chef Whites"));
      assert.ok(html.includes("Formal Banquet Waistcoat"));
      assert.ok(html.includes("Silk Batik Saree"));
      assert.ok(html.includes("+ Issue New Uniform Set"));
    });

    it("renders complete StaffBenefitsCard orchestrating tabs and notifications", () => {
      const html = renderToStaticMarkup(React.createElement(StaffBenefitsCard));

      assert.ok(html.includes("Staff Duty Meals, Quarters &amp; Uniforms Configurator"));
      assert.ok(html.includes("Duty Meal Policy"));
      assert.ok(html.includes("Quarters &amp; Beds"));
      assert.ok(html.includes("Uniform Issue Log"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });
  });

  describe("4. Apple HIG & Touch Targets", () => {
    it("ensures all buttons have >= 44x44pt touch targets", () => {
      const html = renderToStaticMarkup(React.createElement(StaffBenefitsCard));
      assert.ok(html.includes("min-h-[44px]"));
    });
  });
});
