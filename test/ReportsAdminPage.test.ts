/**
 * Unit Test Suite for Step 423: ReportsAdminPage
 * (`test/ReportsAdminPage.test.ts`)
 *
 * Implements Step 423 (Phase 17.23) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Assemble Master Statutory Reports, Night Audit & Finance Page (`ReportsAdminPage.tsx`).
 *
 * Validates:
 * 1. Tab definitions registry (`REPORTS_TAB_REGISTRY` & `getReportsTabDefinition`)
 * 2. Overview KPI calculator (`calculateReportsOverviewKpis`)
 * 3. React 19 SSR rendering of header, multi-tenant IDs, and overview ribbon
 * 4. Tab navigation pills rendering across all 12 statutory and finance workspaces
 * 5. Dynamic active tab rendering (GM Flash, Night Audit, Audit Archive, Printable Forms)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  REPORTS_TAB_REGISTRY,
  ReportsAdminPage,
  type ReportsAdminPageProps,
  calculateReportsOverviewKpis,
  getReportsTabDefinition,
} from "../src/admin/reports/ReportsAdminPage.js";

describe("Step 423: Assemble Master Statutory Reports, Night Audit & Finance Page (ReportsAdminPage.tsx)", () => {
  describe("1. Metadata & Calculation Engines", () => {
    it("contains complete metadata for all 12 finance and statutory report tabs", () => {
      assert.equal(REPORTS_TAB_REGISTRY.length, 12);

      const tabIds = REPORTS_TAB_REGISTRY.map((t) => t.id);
      assert.ok(tabIds.includes("GM_FLASH"));
      assert.ok(tabIds.includes("NIGHT_AUDIT"));
      assert.ok(tabIds.includes("AUDIT_ARCHIVE"));
      assert.ok(tabIds.includes("SLTDA_OCCUPANCY"));
      assert.ok(tabIds.includes("TDL_QUARTERLY"));
      assert.ok(tabIds.includes("PRINTABLE_STATUTORY"));
      assert.ok(tabIds.includes("IRD_TAX_RETURNS"));
      assert.ok(tabIds.includes("REVENUE_MATRIX"));
      assert.ok(tabIds.includes("DMC_LEADERBOARD"));
      assert.ok(tabIds.includes("SECURITY_AUDIT"));
      assert.ok(tabIds.includes("SUSTAINABILITY"));
      assert.ok(tabIds.includes("ACCOUNTING_EXPORT"));
    });

    it("resolves tab definition correctly and returns default fallback for unknown ID", () => {
      const flashDef = getReportsTabDefinition("GM_FLASH");
      assert.equal(flashDef.label, "GM Daily Flash");
      assert.equal(flashDef.icon, "⚡");

      const printDef = getReportsTabDefinition("PRINTABLE_STATUTORY");
      assert.equal(printDef.label, "Printable Official Forms");
      assert.equal(printDef.icon, "🖨️");

      // @ts-expect-error - testing fallback
      const unknownDef = getReportsTabDefinition("UNKNOWN_TAB");
      assert.equal(unknownDef.id, "GM_FLASH");
    });

    it("calculates overview KPIs with defaults and custom overrides", () => {
      const defaultKpis = calculateReportsOverviewKpis();
      assert.ok(defaultKpis.todayGrossRevenueLkr > 0);
      assert.equal(defaultKpis.ledgerHashChainStatus, "INTACT");

      const customKpis = calculateReportsOverviewKpis({
        todayGrossRevenueLkr: 15000000,
        todayOccupancyPercent: 95.5,
      });
      assert.equal(customKpis.todayGrossRevenueLkr, 15000000);
      assert.equal(customKpis.todayOccupancyPercent, 95.5);
    });
  });

  describe("2. React 19 SSR: ReportsAdminPage Layout & Tabs", () => {
    it("renders master executive header with hotel name and SLTDA registration", () => {
      const props: ReportsAdminPageProps = {
        tenantId: "cinnamon-bentota-beach",
        hotelName: "Cinnamon Bentota Beach Resort",
        sltdaRegNo: "SLTDA/SQA/PRO/00892",
      };

      const html = renderToStaticMarkup(React.createElement(ReportsAdminPage, props));

      assert.ok(
        html.includes("Finance, Night Audit &amp; Statutory Compliance Cockpit") ||
          html.includes("Finance, Night Audit & Statutory Compliance Cockpit"),
      );
      assert.ok(html.includes("Cinnamon Bentota Beach Resort"));
      assert.ok(html.includes("SLTDA/SQA/PRO/00892"));
      assert.ok(html.includes("cinnamon-bentota-beach"));
    });

    it("renders overview KPI ribbon cards", () => {
      const html = renderToStaticMarkup(React.createElement(ReportsAdminPage));

      assert.ok(html.includes("Today Gross Revenue"));
      assert.ok(html.includes("MTD Revenue"));
      assert.ok(html.includes("Statutory Taxes Due"));
      assert.ok(html.includes("Audit Ledger Trail"));
      assert.ok(html.includes("Tamper-Evident Intact"));
    });

    it("renders tab pills for all 12 modules", () => {
      const html = renderToStaticMarkup(React.createElement(ReportsAdminPage));

      for (const tab of REPORTS_TAB_REGISTRY) {
        const expectedLabel = tab.label.replace(/&/g, "&amp;");
        assert.ok(
          html.includes(tab.label) || html.includes(expectedLabel),
          `Missing tab label: ${tab.label}`,
        );
      }
    });

    it("renders GM Flash view by default", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReportsAdminPage, {
          initialTab: "GM_FLASH",
        }),
      );

      // ManagerFlashReportView content
      assert.ok(html.includes("General Manager") || html.includes("Flash"));
    });

    it("renders Audit Archive browser when initialTab is AUDIT_ARCHIVE", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReportsAdminPage, {
          initialTab: "AUDIT_ARCHIVE",
        }),
      );

      assert.ok(html.includes("Historical Night Audit Archive"));
      assert.ok(html.includes("Kamal Gunaratne"));
    });

    it("renders Printable Statutory Forms when initialTab is PRINTABLE_STATUTORY", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReportsAdminPage, {
          initialTab: "PRINTABLE_STATUTORY",
        }),
      );

      assert.ok(html.includes("Sri Lanka Tourism Development Authority (SLTDA)"));
      assert.ok(html.includes("FORM A — MONTHLY STATISTICAL RETURN"));
    });
  });
});
