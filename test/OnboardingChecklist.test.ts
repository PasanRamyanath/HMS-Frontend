import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_READINESS_STATE,
  ONBOARDING_STEPS,
  OnboardingChecklist,
  type OnboardingChecklistProps,
  type OnboardingStepId,
  type PropertyReadinessState,
  type ReadinessProgress,
  calculateReadinessProgress,
  getStepActionButtonClass,
  getStepContainerClass,
  isStepComplete,
} from "../src/admin/settings/OnboardingChecklist.js";

describe("Property Onboarding Checklist & Launch Readiness (OnboardingChecklist.tsx)", () => {
  describe("Step Definitions & Domain Contract", () => {
    it("defines exactly 5 sequential onboarding steps", () => {
      assert.equal(ONBOARDING_STEPS.length, 5);
      const stepIds: OnboardingStepId[] = ONBOARDING_STEPS.map((s) => s.id);
      assert.deepEqual(stepIds, ["TAX_CONFIG", "ROOMS", "MENU", "QR_PRINT", "TEST_ORDER"]);
    });

    it("verifies each step has required metadata and action paths", () => {
      for (const step of ONBOARDING_STEPS) {
        assert.ok(step.stepNumber >= 1 && step.stepNumber <= 5);
        assert.ok(step.title.length > 5);
        assert.ok(step.shortTitle.length > 0);
        assert.ok(step.description.length > 10);
        assert.ok(step.actionLabel.length > 0);
        assert.ok(step.path.startsWith("/admin/"));
        assert.ok(step.estimatedMinutes > 0);
        assert.equal(step.isRequired, true);
      }
    });

    it("defaults readiness state to all false", () => {
      assert.equal(DEFAULT_READINESS_STATE.isTaxConfigured, false);
      assert.equal(DEFAULT_READINESS_STATE.hasRoomsConfigured, false);
      assert.equal(DEFAULT_READINESS_STATE.hasMenuItemsConfigured, false);
      assert.equal(DEFAULT_READINESS_STATE.hasQrStandsPrinted, false);
      assert.equal(DEFAULT_READINESS_STATE.hasTestOrderExecuted, false);
    });
  });

  describe("Readiness Calculation Pure Helpers (calculateReadinessProgress)", () => {
    it("calculates 0% readiness when no setup steps are finished", () => {
      const progress: ReadinessProgress = calculateReadinessProgress(DEFAULT_READINESS_STATE);
      assert.equal(progress.completedCount, 0);
      assert.equal(progress.totalCount, 5);
      assert.equal(progress.percentage, 0);
      assert.equal(progress.isAllComplete, false);
      assert.equal(progress.nextPendingStep?.id, "TAX_CONFIG");
    });

    it("calculates 20% progress when only tax config is done", () => {
      const state: PropertyReadinessState = {
        ...DEFAULT_READINESS_STATE,
        isTaxConfigured: true,
      };
      const progress = calculateReadinessProgress(state);
      assert.equal(progress.completedCount, 1);
      assert.equal(progress.percentage, 20);
      assert.equal(progress.isAllComplete, false);
      assert.equal(progress.nextPendingStep?.id, "ROOMS");
    });

    it("calculates 60% progress when 3 milestones are complete", () => {
      const state: PropertyReadinessState = {
        isTaxConfigured: true,
        hasRoomsConfigured: true,
        hasMenuItemsConfigured: true,
        hasQrStandsPrinted: false,
        hasTestOrderExecuted: false,
      };
      const progress = calculateReadinessProgress(state);
      assert.equal(progress.completedCount, 3);
      assert.equal(progress.percentage, 60);
      assert.equal(progress.isAllComplete, false);
      assert.equal(progress.nextPendingStep?.id, "QR_PRINT");
    });

    it("calculates 100% readiness when all 5 setup milestones pass", () => {
      const state: PropertyReadinessState = {
        isTaxConfigured: true,
        hasRoomsConfigured: true,
        hasMenuItemsConfigured: true,
        hasQrStandsPrinted: true,
        hasTestOrderExecuted: true,
      };
      const progress = calculateReadinessProgress(state);
      assert.equal(progress.completedCount, 5);
      assert.equal(progress.percentage, 100);
      assert.equal(progress.isAllComplete, true);
      assert.equal(progress.nextPendingStep, null);
    });
  });

  describe("isStepComplete Helper", () => {
    it("accurately maps all 5 step IDs to corresponding readiness fields", () => {
      const allDoneState: PropertyReadinessState = {
        isTaxConfigured: true,
        hasRoomsConfigured: true,
        hasMenuItemsConfigured: true,
        hasQrStandsPrinted: true,
        hasTestOrderExecuted: true,
      };
      const noneDoneState: PropertyReadinessState = {
        isTaxConfigured: false,
        hasRoomsConfigured: false,
        hasMenuItemsConfigured: false,
        hasQrStandsPrinted: false,
        hasTestOrderExecuted: false,
      };

      for (const step of ONBOARDING_STEPS) {
        assert.equal(isStepComplete(step.id, allDoneState), true);
        assert.equal(isStepComplete(step.id, noneDoneState), false);
      }
    });
  });

  describe("Style Helper Functions", () => {
    it("returns correct CSS classes for done, next, and pending steps", () => {
      assert.match(getStepContainerClass(true, false), /emerald/);
      assert.match(getStepContainerClass(false, true), /apple-blue/);
      assert.match(getStepContainerClass(false, false), /slate/);

      assert.match(getStepActionButtonClass(true, false), /slate/);
      assert.match(getStepActionButtonClass(false, true), /apple-blue/);
      assert.match(getStepActionButtonClass(false, false), /apple-liquid-glass/);
    });
  });

  describe("Component Static Markup & Auto-Hiding Behavior", () => {
    it("renders the onboarding banner with 5 steps when incomplete", () => {
      const props: OnboardingChecklistProps = {
        propertyName: "Galle Fort Lighthouse Villa",
        readiness: {
          isTaxConfigured: true,
          hasRoomsConfigured: false,
        },
      };

      const html = renderToStaticMarkup(React.createElement(OnboardingChecklist, props));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Sri Lankan Statutory Tax Configuration"));
      assert.ok(html.includes("Room Inventory &amp; Dual-Currency Tariffs"));
      assert.ok(html.includes("F&amp;B Dining &amp; Room Service Menu"));
      assert.ok(html.includes("Contactless QR Standees &amp; Table Tents"));
      assert.ok(html.includes("End-to-End Simulation Test Order"));
      assert.ok(html.includes("1/5 Done"));
      assert.ok(html.includes("20%"));
    });

    it("auto-hides (renders empty output) when all 5 readiness milestones pass and autoHideWhenComplete is true", () => {
      const props: OnboardingChecklistProps = {
        readiness: {
          isTaxConfigured: true,
          hasRoomsConfigured: true,
          hasMenuItemsConfigured: true,
          hasQrStandsPrinted: true,
          hasTestOrderExecuted: true,
        },
        autoHideWhenComplete: true,
      };

      const html = renderToStaticMarkup(React.createElement(OnboardingChecklist, props));
      assert.equal(html, "");
    });

    it("renders successfully even when 100% complete if autoHideWhenComplete is disabled", () => {
      const props: OnboardingChecklistProps = {
        readiness: {
          isTaxConfigured: true,
          hasRoomsConfigured: true,
          hasMenuItemsConfigured: true,
          hasQrStandsPrinted: true,
          hasTestOrderExecuted: true,
        },
        autoHideWhenComplete: false,
      };

      const html = renderToStaticMarkup(React.createElement(OnboardingChecklist, props));
      assert.ok(html.includes("5/5 Done"));
      assert.ok(html.includes("100%"));
    });

    it("renders collapsed mode without step list when initiallyCollapsed is true", () => {
      const props: OnboardingChecklistProps = {
        initiallyCollapsed: true,
        readiness: {
          isTaxConfigured: false,
        },
      };

      const html = renderToStaticMarkup(React.createElement(OnboardingChecklist, props));
      assert.ok(html.includes("Property Launch Readiness"));
      assert.ok(html.includes("0/5 Done"));
      // When collapsed, the full step description rows are omitted
      assert.equal(html.includes("Configure 10% Service Charge"), false);
    });
  });
});
