/**
 * Unit Test Suite for Step 420: SustainabilityReportCard
 * (`test/SustainabilityReportCard.test.ts`)
 *
 * Implements Step 420 (Phase 17.20) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Central Environmental Authority (CEA) / SLTDA Green Certification Sustainability Tracker (`SustainabilityReportCard.tsx`).
 *
 * Validates:
 * 1. Multi-tenant header with SLTDA registration, CEA EPL license, and NSTC certification badge
 * 2. Executive KPI cards (Eco score, Electricity intensity, Water intensity, Landfill diversion %)
 * 3. 6 Resource intensity pillars (Electricity, Water, LPG, Diesel, Carbon, Waste Diversion)
 * 4. Energy ledger with CEB Grid power, Solar PV generation, and Rainwater harvesting
 * 5. Circular economy metrics (Zero-plastic glass bottling, Organic composting)
 * 6. Central Environmental Authority (CEA) compliance tests (Effluent BOD/COD, Acoustic dB)
 * 7. 5-Section CSV export generator (`generateSustainabilityReportCsv`)
 * 8. Status and certification badge color mapping
 * 9. React 19 SSR rendering and type contracts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CertificationLevel,
  DEFAULT_SUSTAINABILITY_DATA,
  type MetricStatus,
  SustainabilityReportCard,
  type SustainabilityReportCardProps,
  generateSustainabilityReportCsv,
  getCertificationBadgeClasses,
  getStatusBadgeClasses,
  roundMetric,
  triggerFileDownload,
} from "../src/admin/reports/SustainabilityReportCard.js";

describe("Step 420: CEA & SLTDA Green Sustainability Tracker (SustainabilityReportCard.tsx)", () => {
  it("renders executive header with hotel metadata, CEA EPL license, and certification badge", () => {
    const props: SustainabilityReportCardProps = {
      initialData: DEFAULT_SUSTAINABILITY_DATA,
    };

    const html = renderToStaticMarkup(React.createElement(SustainabilityReportCard, props));

    assert.ok(
      html.includes("CEA &amp; SLTDA Green Sustainability Tracker") ||
        html.includes("CEA & SLTDA Green Sustainability Tracker"),
    );
    assert.ok(
      html.includes("The Heritance Galle Fort &amp; Resort") ||
        html.includes("The Heritance Galle Fort & Resort"),
    );
    assert.ok(html.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(html.includes("CEA/EPL/SP/2026/0412"));
    assert.ok(html.includes("GOLD CERTIFIED"));
    assert.ok(html.includes("March 2026"));
  });

  it("renders bento KPI cards with eco score, electricity intensity, and water intensity", () => {
    const html = renderToStaticMarkup(
      React.createElement(SustainabilityReportCard, { initialData: DEFAULT_SUSTAINABILITY_DATA }),
    );

    assert.ok(html.includes("Overall Sustainability Index"));
    assert.ok(html.includes("88")); // Score
    assert.ok(html.includes("Electricity Intensity"));
    assert.ok(html.includes("14.8")); // kWh / GN
    assert.ok(html.includes("Water Intensity"));
    assert.ok(html.includes("275")); // Liters / GN
    assert.ok(html.includes("Landfill Waste Diversion"));
    assert.ok(html.includes("84.5%"));
  });

  it("renders all resource intensity benchmarks with SLTDA targets", () => {
    const html = renderToStaticMarkup(
      React.createElement(SustainabilityReportCard, { initialData: DEFAULT_SUSTAINABILITY_DATA }),
    );

    assert.ok(html.includes("Electricity Consumption"));
    assert.ok(html.includes("Fresh Water Intensity"));
    assert.ok(html.includes("Kitchen Thermal LPG"));
    assert.ok(html.includes("Generator Backup Diesel"));
    assert.ok(html.includes("Carbon Footprint Intensity"));
    assert.ok(html.includes("Landfill Waste Diversion"));
  });

  it("generates comprehensive 5-section CSV report with utility and CEA compliance data", () => {
    const csv = generateSustainabilityReportCsv(DEFAULT_SUSTAINABILITY_DATA);

    // Header
    assert.ok(
      csv.includes(
        "SRI LANKA HOTEL MANAGEMENT SYSTEM - SUSTAINABILITY & GREEN CERTIFICATION REPORT",
      ),
    );
    assert.ok(csv.includes("The Heritance Galle Fort & Resort"));
    assert.ok(csv.includes("CEA/EPL/SP/2026/0412"));
    assert.ok(csv.includes("GOLD"));

    // Section 1: Resource Intensity
    assert.ok(csv.includes("SECTION 1: RESOURCE CONSUMPTION PER OCCUPIED GUEST NIGHT"));
    assert.ok(csv.includes("Electricity Consumption"));
    assert.ok(csv.includes("Fresh Water Intensity"));

    // Section 2: Utility Ledger
    assert.ok(csv.includes("SECTION 2: UTILITY LEDGER & ENERGY MIX"));
    assert.ok(csv.includes("CEB Grid Electricity Consumption (kWh):"));
    assert.ok(csv.includes("Rooftop Solar Generation (kWh):"));
    assert.ok(csv.includes("Rainwater Harvesting (Liters):"));

    // Section 3: Waste & Carbon
    assert.ok(csv.includes("SECTION 3: WASTE CIRCULARITY & CARBON FOOTPRINT"));
    assert.ok(csv.includes("8400")); // Glass bottles
    assert.ok(csv.includes("84.5%")); // Diversion

    // Section 4: CEA EPL
    assert.ok(csv.includes("SECTION 4: CENTRAL ENVIRONMENTAL AUTHORITY (CEA) EPL STATUS"));
    assert.ok(csv.includes("14.5 (Standard <= 30 mg/L)")); // BOD
    assert.ok(csv.includes("COMPLIANT"));

    // Section 5: Audit Seal
    assert.ok(csv.includes("SECTION 5: CRYPTOGRAPHIC AUDIT VERIFICATION"));
    assert.ok(csv.includes(DEFAULT_SUSTAINABILITY_DATA.auditSealSha256));
  });

  it("accurately maps metric status badge classes", () => {
    assert.ok(getStatusBadgeClasses("OPTIMAL").includes("emerald"));
    assert.ok(getStatusBadgeClasses("COMPLIANT").includes("blue"));
    assert.ok(getStatusBadgeClasses("EXCEEDING_BENCHMARK").includes("amber"));
    assert.ok(getStatusBadgeClasses("UNKNOWN" as MetricStatus).includes("zinc"));
  });

  it("accurately maps green certification badge classes", () => {
    assert.ok(getCertificationBadgeClasses("PLATINUM").includes("emerald"));
    assert.ok(getCertificationBadgeClasses("GOLD").includes("amber"));
    assert.ok(getCertificationBadgeClasses("SILVER").includes("zinc"));
    assert.ok(getCertificationBadgeClasses("BRONZE").includes("orange"));
    assert.ok(getCertificationBadgeClasses("AUDIT_PENDING").includes("zinc"));
    assert.ok(getCertificationBadgeClasses("OTHER" as CertificationLevel).includes("zinc"));
  });

  it("handles triggerFileDownload gracefully in SSR/Node", () => {
    assert.doesNotThrow(() => {
      triggerFileDownload("sustainability.csv", "sample,content");
    });
  });

  it("roundMetric helper supports configurable decimal places", () => {
    assert.strictEqual(roundMetric(14.856, 1), 14.9);
    assert.strictEqual(roundMetric(14.854, 2), 14.85);
  });
});
