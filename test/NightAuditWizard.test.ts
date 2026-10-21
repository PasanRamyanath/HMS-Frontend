/**
 * Unit Test Suite for Step 403: NightAuditWizard
 * (`test/NightAuditWizard.test.ts`)
 *
 * Implements Step 403 (Phase 17.03) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Pre-audit readiness checklist and manual 23:59 SLST night audit trigger.
 *
 * Validates:
 * 1. Default pre-audit exception rendering (Arrivals, Departures, Open POS, Discrepancies)
 * 2. Hospitality performance KPI bento grid (ADR, RevPAR, Occupancy %, SLTDA Guest Nights)
 * 3. 4-stage statutory tax pool forecasting (10% SC, 1% TDL, 2.5% SSCL, 18% VAT)
 * 4. Custom forecast and pre-check props rendering
 * 5. Apple HIG interactive elements, touch targets, and typography
 * 6. React 19 SSR compatibility via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_FORECAST,
  type NightAuditExecutionPayload,
  type NightAuditForecast,
  NightAuditWizard,
  type NightAuditWizardProps,
  type PreAuditCheckItem,
} from "../src/admin/reports/NightAuditWizard.js";

describe("Step 403: Pre-Audit Readiness Checklist & Manual Night Audit Trigger (NightAuditWizard.tsx)", () => {
  it("renders default pre-checks across Arrivals, Departures, Open POS, and Discrepancies", () => {
    const html = renderToStaticMarkup(
      React.createElement(NightAuditWizard, {
        tenantId: "cinnamon-grand-cmb",
        currentBusinessDate: "2026-10-21",
      }),
    );

    assert.ok(html.includes("Night Audit Wizard &amp; Statutory Pre-Checks"));
    assert.ok(html.includes("2026-10-21"));
    assert.ok(html.includes("23:59 SLST"));
    assert.ok(html.includes("Pending Arrival (Potential No-Show)"));
    assert.ok(html.includes("Overstay / Pending Departure"));
    assert.ok(html.includes("Unsettled Open Restaurant Order"));
    assert.ok(html.includes("Room Discrepancy (Skip / Sleep)"));
  });

  it("renders hospitality performance KPIs (ADR, RevPAR, Occupancy %, Guest Nights)", () => {
    const html = renderToStaticMarkup(
      React.createElement(NightAuditWizard, {
        tenantId: "cinnamon-grand-cmb",
        currentBusinessDate: "2026-10-21",
        forecast: DEFAULT_FORECAST,
      }),
    );

    assert.ok(html.includes("Average Daily Rate (ADR)"));
    assert.ok(html.includes("RevPAR (Yield)"));
    assert.ok(html.includes("Room Occupancy Rate"));
    assert.ok(html.includes("SLTDA Guest Nights"));
    assert.ok(html.includes("78.3%"));
    assert.ok(html.includes("112")); // Foreign guest nights
    assert.ok(html.includes("48")); // Domestic guest nights
  });

  it("renders 4-stage compounding statutory tax pools preview", () => {
    const html = renderToStaticMarkup(
      React.createElement(NightAuditWizard, {
        tenantId: "cinnamon-grand-cmb",
        currentBusinessDate: "2026-10-21",
      }),
    );

    assert.ok(html.includes("10% SC Pool"));
    assert.ok(html.includes("1% SLTDA TDL"));
    assert.ok(html.includes("2.5% IRD SSCL"));
    assert.ok(html.includes("18% IRD VAT"));
    assert.ok(html.includes("Grand Total"));
  });

  it("renders custom pre-check exception items and ready state", () => {
    const customItems: PreAuditCheckItem[] = [
      {
        id: "custom-01",
        category: "ARRIVAL",
        title: "Late Arrival Flight #UL-504",
        subtitle: "Room 501 • Hans Schmidt",
        details: "Flight delayed by 2 hours.",
        suggestedAction: "Keep Active",
        status: "RESOLVED",
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(NightAuditWizard, {
        tenantId: "heritance-kandalama",
        currentBusinessDate: "2026-10-22",
        preCheckItems: customItems,
      }),
    );

    assert.ok(html.includes("Late Arrival Flight #UL-504"));
    assert.ok(html.includes("Ready for Posting"));
    assert.ok(html.includes("Actioned"));
  });

  it("renders button with Apple HIG >= 44x44pt touch target and liquid glass classes", () => {
    const html = renderToStaticMarkup(
      React.createElement(NightAuditWizard, {
        tenantId: "cinnamon-grand-cmb",
        currentBusinessDate: "2026-10-21",
      }),
    );

    assert.ok(html.includes("min-h-[44px]"));
    assert.ok(html.includes("tabular-nums-lkr"));
    assert.ok(html.includes("backdrop-blur-xl"));
    assert.ok(html.includes("Run Night Audit Now"));
  });

  it("conforms to TypeScript type contracts for wizard props, forecast, and execution payload", () => {
    const payload: NightAuditExecutionPayload = {
      businessDate: "2026-10-21",
      tenantId: "cinnamon-grand-cmb",
      actorUserId: "user-auditor-01",
      postRoomCharges: true,
      rolloverBusinessDate: true,
      resolvedItemIds: ["item-1"],
      notes: "Audit executed",
    };

    const forecast: NightAuditForecast = DEFAULT_FORECAST;

    const props: NightAuditWizardProps = {
      tenantId: "cinnamon-grand-cmb",
      currentBusinessDate: "2026-10-21",
      forecast,
      onRunNightAudit: (p) => {
        assert.strictEqual(p.businessDate, payload.businessDate);
      },
    };

    assert.strictEqual(props.tenantId, "cinnamon-grand-cmb");
    assert.strictEqual(payload.postRoomCharges, true);
  });
});
