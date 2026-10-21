import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MODULE_CATALOG,
  PLAN_TIER_SPECS,
  TenantPlanConfigModal,
  calculateTotalMonthlyBill,
  formatPriceLkr,
  isModuleActive,
} from "../src/admin/superadmin/TenantPlanConfigModal.js";

describe("Step 456 (Phase 19.06): Tenant SaaS Subscription Tier & Feature Flag Manager (TenantPlanConfigModal.tsx)", () => {
  describe("1. SaaS Tier Specifications & Invariants", () => {
    it("defines 3 Sri Lankan SaaS tiers: STARTER, GROWTH, and ENTERPRISE", () => {
      assert.ok(PLAN_TIER_SPECS.STARTER_QR_ONLY);
      assert.ok(PLAN_TIER_SPECS.GROWTH_PMS_PLUS_QR);
      assert.ok(PLAN_TIER_SPECS.ENTERPRISE_RESORT_ERP);
    });

    it("configures STARTER_QR_ONLY at LKR 4,500/mo with QR ordering and KDS", () => {
      const starter = PLAN_TIER_SPECS.STARTER_QR_ONLY;
      assert.strictEqual(starter.monthlyPriceLkr, 4500);
      assert.strictEqual(starter.maxRooms, 15);
      assert.strictEqual(starter.maxMonthlyQrOrders, 1500);
      assert.ok(starter.includedModules.includes("qrMenuAndOrdering"));
      assert.ok(starter.includedModules.includes("kdsKitchen"));
      assert.ok(starter.includedModules.includes("lankaQrPay"));
      assert.strictEqual(starter.includedModules.includes("banquets"), false);
      assert.strictEqual(starter.includedModules.includes("payrollEpfEtf"), false);
    });

    it("configures GROWTH_PMS_PLUS_QR at LKR 12,500/mo with front-desk PMS and tax engine", () => {
      const growth = PLAN_TIER_SPECS.GROWTH_PMS_PLUS_QR;
      assert.strictEqual(growth.monthlyPriceLkr, 12500);
      assert.strictEqual(growth.maxRooms, 40);
      assert.strictEqual(growth.maxMonthlyQrOrders, 10000);
      assert.ok(growth.includedModules.includes("frontDeskPms"));
      assert.ok(growth.includedModules.includes("tapeChart"));
      assert.ok(growth.includedModules.includes("housekeeping"));
      assert.ok(growth.includedModules.includes("taxSltdaIrd"));
      assert.strictEqual(growth.includedModules.includes("payrollEpfEtf"), false);
    });

    it("configures ENTERPRISE_RESORT_ERP at LKR 24,500/mo with all 13 modules unlimited", () => {
      const enterprise = PLAN_TIER_SPECS.ENTERPRISE_RESORT_ERP;
      assert.strictEqual(enterprise.monthlyPriceLkr, 24500);
      assert.strictEqual(enterprise.maxRooms, "UNLIMITED");
      assert.strictEqual(enterprise.maxMonthlyQrOrders, "UNLIMITED");
      assert.strictEqual(enterprise.includedModules.length, 13);
      assert.ok(enterprise.includedModules.includes("banquets"));
      assert.ok(enterprise.includedModules.includes("payrollEpfEtf"));
      assert.ok(enterprise.includedModules.includes("multiProperty"));
    });

    it("catalogs 13 modular hospitality feature flags", () => {
      assert.strictEqual(MODULE_CATALOG.length, 13);
      const keys = MODULE_CATALOG.map((m) => m.key);
      assert.ok(keys.includes("qrMenuAndOrdering"));
      assert.ok(keys.includes("banquets"));
      assert.ok(keys.includes("payrollEpfEtf"));
      assert.ok(keys.includes("multiProperty"));
      assert.ok(keys.includes("auditLogSha256"));
    });
  });

  describe("2. Bill Calculation & Module Entitlements", () => {
    it("calculates base monthly bill with no add-ons", () => {
      assert.strictEqual(calculateTotalMonthlyBill("STARTER_QR_ONLY", []), 4500);
      assert.strictEqual(calculateTotalMonthlyBill("GROWTH_PMS_PLUS_QR", []), 12500);
      assert.strictEqual(calculateTotalMonthlyBill("ENTERPRISE_RESORT_ERP", []), 24500);
    });

    it("calculates bill with optional add-on modules on starter plan", () => {
      // Starter (4500) + Banquets (3500) = 8000
      const bill = calculateTotalMonthlyBill("STARTER_QR_ONLY", ["banquets"]);
      assert.strictEqual(bill, 8000);

      // Starter (4500) + Banquets (3500) + Payroll (4500) = 12500
      const bill2 = calculateTotalMonthlyBill("STARTER_QR_ONLY", ["banquets", "payrollEpfEtf"]);
      assert.strictEqual(bill2, 12500);
    });

    it("does not charge add-on fees for modules already included in base tier", () => {
      // Growth already includes taxSltdaIrd and housekeeping
      const bill = calculateTotalMonthlyBill("GROWTH_PMS_PLUS_QR", ["taxSltdaIrd", "housekeeping"]);
      assert.strictEqual(bill, 12500);

      // Enterprise already includes all modules
      const billEnt = calculateTotalMonthlyBill("ENTERPRISE_RESORT_ERP", [
        "banquets",
        "payrollEpfEtf",
        "multiProperty",
      ]);
      assert.strictEqual(billEnt, 24500);
    });

    it("evaluates module active status based on tier inclusion and add-ons", () => {
      assert.strictEqual(isModuleActive("qrMenuAndOrdering", "STARTER_QR_ONLY", []), true);
      assert.strictEqual(isModuleActive("banquets", "STARTER_QR_ONLY", []), false);
      assert.strictEqual(isModuleActive("banquets", "STARTER_QR_ONLY", ["banquets"]), true);
    });

    it("supports custom entitlement overrides", () => {
      // Force enable banquets via override
      assert.strictEqual(
        isModuleActive("banquets", "STARTER_QR_ONLY", [], { banquets: true }),
        true,
      );
      // Force disable banquets on enterprise via override
      assert.strictEqual(
        isModuleActive("banquets", "ENTERPRISE_RESORT_ERP", [], { banquets: false }),
        false,
      );
    });

    it("formats LKR currency strings cleanly", () => {
      assert.strictEqual(formatPriceLkr(4500), "LKR 4,500");
      assert.strictEqual(formatPriceLkr(12500), "LKR 12,500");
      assert.strictEqual(formatPriceLkr(24500), "LKR 24,500");
    });
  });

  describe("3. Static Modal Markup & Apple HIG Liquid Glass Accessibility", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(TenantPlanConfigModal, {
          isOpen: false,
          tenantId: "tenant-galle-fort",
          tenantName: "Galle Fort Boutique",
        }),
      );

      assert.strictEqual(html, "");
    });

    it("renders dialog with tenant details and plan tier choices when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(TenantPlanConfigModal, {
          isOpen: true,
          tenantId: "tenant-galle-fort",
          tenantName: "Galle Fort Boutique Villa",
        }),
      );

      assert.ok(html.includes("Galle Fort Boutique Villa"));
      assert.ok(html.includes("tenant-galle-fort"));
      assert.ok(html.includes("Starter QR Ordering"));
      assert.ok(html.includes("Growth PMS + QR"));
      assert.ok(html.includes("Enterprise Resort ERP"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders modular feature toggles and switches", () => {
      const html = renderToStaticMarkup(
        React.createElement(TenantPlanConfigModal, {
          isOpen: true,
          tenantId: "tenant-kandy-hills",
          tenantName: "Kandy Hills Sanctuary",
        }),
      );

      assert.ok(html.includes('role="switch"'));
      assert.ok(html.includes("Contactless QR Menu &amp; Ordering"));
      assert.ok(html.includes("Kitchen Display System (KDS)"));
      assert.ok(html.includes("SLTDA &amp; IRD Compounding Tax Engine"));
      assert.ok(html.includes("EPF/ETF Payroll &amp; 10% SC Pool"));
    });

    it("renders net monthly subscription bill in modal footer", () => {
      const html = renderToStaticMarkup(
        React.createElement(TenantPlanConfigModal, {
          isOpen: true,
          tenantId: "tenant-bentota-ocean",
          tenantName: "Bentota Ocean Palms",
          currentPlan: "GROWTH_PMS_PLUS_QR",
        }),
      );

      assert.ok(html.includes("Net Monthly Subscription Bill:"));
      assert.ok(html.includes("LKR 12,500"));
      assert.ok(html.includes("Save Plan Entitlements"));
      assert.ok(html.includes("Cancel"));
    });
  });
});
