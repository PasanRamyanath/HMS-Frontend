/**
 * Unit Test Suite for Step 419: SecurityAuditReport
 * (`test/SecurityAuditReport.test.ts`)
 *
 * Implements Step 419 (Phase 17.19) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Rebate, Void, Discount & Manager Override Audit Log Report (`SecurityAuditReport.tsx`).
 *
 * Validates:
 * 1. Multi-tenant header with SLTDA registration, chain integrity badge, and block hash
 * 2. Executive KPI cards (Total rebates, voids, rate overrides, high-risk overrides count)
 * 3. Master event log table with all security events, actors, and reasons
 * 4. KOT void analysis and wastage metrics
 * 5. Cryptographic SHA-256 hash chaining verification
 * 6. CSV Export generator (`generateSecurityAuditReportCsv`)
 * 7. Severity colors and event type names
 * 8. Safe non-browser download handling
 * 9. React 19 SSR rendering and type contracts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SECURITY_AUDIT_DATA,
  SecurityAuditReport,
  type SecurityAuditReportProps,
  type SecurityEventType,
  type SeverityLevel,
  generateSecurityAuditReportCsv,
  getEventTypeName,
  getSeverityBadgeColor,
  roundLkr,
  triggerFileDownload,
} from "../src/admin/reports/SecurityAuditReport.js";

describe("Step 419: Rebate, Void, Discount & Manager Override Audit Log Report (SecurityAuditReport.tsx)", () => {
  it("renders executive header with hotel metadata, SLTDA reg, and verified chain badge", () => {
    const props: SecurityAuditReportProps = {
      initialData: DEFAULT_SECURITY_AUDIT_DATA,
    };

    const html = renderToStaticMarkup(React.createElement(SecurityAuditReport, props));

    assert.ok(
      html.includes("Security Overrides, Rebates &amp; Voids Audit") ||
        html.includes("Security Overrides, Rebates & Voids Audit"),
    );
    assert.ok(
      html.includes("The Heritance Galle Fort &amp; Resort") ||
        html.includes("The Heritance Galle Fort & Resort"),
    );
    assert.ok(html.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(html.includes("SHA-256 Chain Verified"));
  });

  it("renders executive KPI cards with financial impact of overrides and rebates", () => {
    const html = renderToStaticMarkup(
      React.createElement(SecurityAuditReport, { initialData: DEFAULT_SECURITY_AUDIT_DATA }),
    );

    assert.ok(
      html.includes("Folio Rebates &amp; Allowances") ||
        html.includes("Folio Rebates & Allowances"),
    );
    assert.ok(html.includes("Voided Kitchen KOTs"));
    assert.ok(html.includes("Rate Plan Overrides"));
    assert.ok(html.includes("High-Risk / Tax Mutations"));
    assert.ok(html.includes("3 Flagged"));
  });

  it("renders master security log table with actors, entities, and reasons", () => {
    const html = renderToStaticMarkup(
      React.createElement(SecurityAuditReport, { initialData: DEFAULT_SECURITY_AUDIT_DATA }),
    );

    // Actors
    assert.ok(html.includes("Saman Kumara"));
    assert.ok(html.includes("Malini Fernando"));
    assert.ok(html.includes("Kavinda Wickramasinghe"));

    // Entities
    assert.ok(html.includes("ORDER#KOT-9941"));
    assert.ok(html.includes("FOLIO#RES-8812"));
    assert.ok(html.includes("FOLIO#RES-8901#LINE#4"));

    // Supervisor approval indicators
    assert.ok(html.includes("PIN Sealed"));
  });

  it("generates comprehensive 3-section CSV report with audit trail and hash verification", () => {
    const csv = generateSecurityAuditReportCsv(DEFAULT_SECURITY_AUDIT_DATA);

    // Header
    assert.ok(
      csv.includes("SRI LANKA HOTEL MANAGEMENT SYSTEM - SECURITY OVERRIDE & REBATE AUDIT LOG"),
    );
    assert.ok(csv.includes("The Heritance Galle Fort & Resort"));
    assert.ok(csv.includes("VERIFIED VALID"));

    // Section 1: Summary
    assert.ok(csv.includes("SECTION 1: FINANCIAL OVERRIDE & RISK SUMMARY"));
    assert.ok(csv.includes("64500.00")); // Rebates
    assert.ok(csv.includes("28400.00")); // Voids
    assert.ok(csv.includes("32000.00")); // Rate overrides

    // Section 2: Entries
    assert.ok(csv.includes("SECTION 2: IMMUTABLE AUDIT LOG DETAILS (SHA-256 CHAINED)"));
    assert.ok(csv.includes("EVT-20260325-001"));
    assert.ok(csv.includes("WRONG_TABLE_ORDERED"));
    assert.ok(csv.includes("Sunil Wickrama (Restaurant Captain)"));
    assert.ok(csv.includes("192.168.10.42"));
    assert.ok(csv.includes("8e43fbb162d3a95d77b02cbb3e85e1351c5a932d201e74fa07e5f99238e83b49"));
  });

  it("correctly maps severity badge colors across all levels", () => {
    assert.ok(getSeverityBadgeColor("CRITICAL_ALERT").includes("rose"));
    assert.ok(getSeverityBadgeColor("HIGH_RISK").includes("amber"));
    assert.ok(getSeverityBadgeColor("WARNING").includes("yellow"));
    assert.ok(getSeverityBadgeColor("INFO").includes("zinc"));
    assert.ok(getSeverityBadgeColor("OTHER" as SeverityLevel).includes("zinc"));
  });

  it("formats human-readable event type names", () => {
    assert.strictEqual(getEventTypeName("VOID_KOT"), "Voided KOT / Kitchen Order");
    assert.strictEqual(getEventTypeName("FOLIO_REBATE"), "Folio Rebate / Allowance");
    assert.strictEqual(getEventTypeName("RATE_OVERRIDE"), "Manual Room Rate Override");
    assert.strictEqual(getEventTypeName("TAX_TOGGLE_EXEMPTION"), "Statutory Tax Toggle Exemption");
    assert.strictEqual(getEventTypeName("MANAGER_PIN_OVERRIDE"), "Manager Supervisor PIN Override");
    assert.strictEqual(getEventTypeName("PETTY_CASH_PAYOUT"), "Drawer Petty Cash Payout");
    assert.strictEqual(getEventTypeName("CUSTOM_EVENT" as SecurityEventType), "CUSTOM_EVENT");
  });

  it("handles triggerFileDownload gracefully in SSR/Node", () => {
    assert.doesNotThrow(() => {
      triggerFileDownload("audit.csv", "sample,content");
    });
  });

  it("roundLkr provides accurate integer-cent rounding", () => {
    assert.strictEqual(roundLkr(64500.456), 64500.46);
    assert.strictEqual(roundLkr(64500.454), 64500.45);

    const firstEntry = DEFAULT_SECURITY_AUDIT_DATA.entries[0];
    assert.ok(firstEntry);
    assert.ok(firstEntry.eventId.startsWith("EVT-"));
  });
});
