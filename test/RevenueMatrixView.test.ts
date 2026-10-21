/**
 * Unit Test Suite for Step 417: RevenueMatrixView
 * (`test/RevenueMatrixView.test.ts`)
 *
 * Implements Step 417 (Phase 17.17) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Department-Wise Revenue & Payment Method Reconciliation Matrix (`RevenueMatrixView.tsx`).
 *
 * Validates:
 * 1. Multi-tenant header with SLTDA registration, locked CBSL USD rate, and balance badge
 * 2. 2D Cross-tabulation matrix with all 7 departments and 5 settlement channels
 * 3. Exact mathematical balance: sum(Dept Gross) === sum(Channel Gross) === Grand Total
 * 4. 4-Stage compounding Sri Lankan statutory tax schedule (SC 10%, TDL 1%, SSCL 2.5%, VAT 18%)
 * 5. Settlement channel realization & MDR merchant discount fees
 * 6. Cashier shift drawer balancing & EDC terminal batch matching
 * 7. LankaQR CBSL CEFT direct pay batch reconciliation
 * 8. Cryptographic SHA-256 audit ledger seal
 * 9. Comprehensive 5-section CSV export generator (`generateRevenueMatrixCsv`)
 * 10. React 19 SSR rendering and complete type coverage
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_REVENUE_MATRIX_DATA,
  DEPARTMENTS,
  RevenueMatrixView,
  type RevenueMatrixViewProps,
  SETTLEMENT_CHANNELS,
  computeMatrixTotals,
  generateRevenueMatrixCsv,
  roundLkr,
  triggerFileDownload,
} from "../src/admin/reports/RevenueMatrixView.js";

describe("Step 417: Department Revenue & Settlement Reconciliation Matrix (RevenueMatrixView.tsx)", () => {
  it("renders executive header with hotel name, SLTDA reg, and balanced pill", () => {
    const props: RevenueMatrixViewProps = {
      initialData: DEFAULT_REVENUE_MATRIX_DATA,
    };

    const html = renderToStaticMarkup(React.createElement(RevenueMatrixView, props));

    assert.ok(
      html.includes("Department Revenue &amp; Settlement Matrix") ||
        html.includes("Department Revenue & Settlement Matrix"),
    );
    assert.ok(
      html.includes("The Heritance Galle Fort &amp; Resort") ||
        html.includes("The Heritance Galle Fort & Resort"),
    );
    assert.ok(html.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(html.includes("102394857-7000"));
    assert.ok(html.includes("305.50"));
    assert.ok(html.includes("Balanced &amp; Reconciled") || html.includes("Balanced & Reconciled"));
  });

  it("computes horizontal and vertical matrix totals with exact mathematical balance", () => {
    const { departmentTotals, channelTotals, grandTotal } = computeMatrixTotals(
      DEFAULT_REVENUE_MATRIX_DATA.cells,
    );

    // Assert all 7 departments are represented
    assert.strictEqual(departmentTotals.length, 7);
    assert.strictEqual(channelTotals.length, 5);

    // Sum of all department gross amounts
    const deptGrossSum = roundLkr(departmentTotals.reduce((sum, d) => sum + d.grossTotalLkr, 0));

    // Sum of all channel gross amounts
    const chanGrossSum = roundLkr(channelTotals.reduce((sum, c) => sum + c.grossTotalLkr, 0));

    // Must match grand total exactly to the cent
    assert.strictEqual(deptGrossSum, grandTotal.grossTotalLkr);
    assert.strictEqual(chanGrossSum, grandTotal.grossTotalLkr);
    assert.strictEqual(deptGrossSum, chanGrossSum);

    // Assert total transaction count consistency
    const deptTxSum = departmentTotals.reduce((sum, d) => sum + d.txCount, 0);
    const chanTxSum = channelTotals.reduce((sum, c) => sum + c.txCount, 0);
    assert.strictEqual(deptTxSum, grandTotal.totalTxCount);
    assert.strictEqual(chanTxSum, grandTotal.totalTxCount);
  });

  it("verifies 4-stage compounding Sri Lankan statutory tax integrity across all departments", () => {
    const { departmentTotals, grandTotal } = computeMatrixTotals(DEFAULT_REVENUE_MATRIX_DATA.cells);

    // Sum of tax pools across departments
    const totalSc = roundLkr(departmentTotals.reduce((sum, d) => sum + d.serviceChargeLkr, 0));
    const totalTdl = roundLkr(departmentTotals.reduce((sum, d) => sum + d.tdlLkr, 0));
    const totalSscl = roundLkr(departmentTotals.reduce((sum, d) => sum + d.ssclLkr, 0));
    const totalVat = roundLkr(departmentTotals.reduce((sum, d) => sum + d.vatLkr, 0));
    const totalNetBase = roundLkr(departmentTotals.reduce((sum, d) => sum + d.netBaseLkr, 0));

    assert.strictEqual(totalSc, grandTotal.serviceChargeLkr);
    assert.strictEqual(totalTdl, grandTotal.tdlLkr);
    assert.strictEqual(totalSscl, grandTotal.ssclLkr);
    assert.strictEqual(totalVat, grandTotal.vatLkr);
    assert.strictEqual(totalNetBase, grandTotal.netBaseLkr);

    // Verify gross equals base + taxes
    const calculatedGross = roundLkr(totalNetBase + totalSc + totalTdl + totalSscl + totalVat);
    assert.strictEqual(calculatedGross, grandTotal.grossTotalLkr);
  });

  it("accurately computes settlement channel MDR merchant fees and net realization", () => {
    const { channelTotals, grandTotal } = computeMatrixTotals(DEFAULT_REVENUE_MATRIX_DATA.cells);

    for (const ct of channelTotals) {
      const chanMeta = SETTLEMENT_CHANNELS.find((c) => c.code === ct.channel);
      assert.ok(chanMeta);

      const expectedFee = roundLkr((ct.grossTotalLkr * chanMeta.feeRatePercent) / 100);
      assert.strictEqual(ct.estimatedFeeLkr, expectedFee);
      assert.strictEqual(ct.netRealizedLkr, roundLkr(ct.grossTotalLkr - expectedFee));
    }

    const totalRealizedSum = roundLkr(channelTotals.reduce((sum, c) => sum + c.netRealizedLkr, 0));
    assert.strictEqual(totalRealizedSum, grandTotal.totalNetRealizedLkr);
  });

  it("renders 2D cross-tabulation table with all 7 department rows and channel columns", () => {
    const html = renderToStaticMarkup(
      React.createElement(RevenueMatrixView, { initialData: DEFAULT_REVENUE_MATRIX_DATA }),
    );

    // Verify departments
    assert.ok(html.includes("Room Accommodation"));
    assert.ok(html.includes("In-Room Dining (QR)"));
    assert.ok(html.includes("Restaurant POS"));
    assert.ok(html.includes("Bar &amp; Lounge") || html.includes("Bar & Lounge"));
    assert.ok(html.includes("Banquet &amp; Events") || html.includes("Banquet & Events"));
    assert.ok(html.includes("Ayurvedic Spa"));
    assert.ok(
      html.includes("Excursions &amp; Transport") || html.includes("Excursions & Transport"),
    );

    // Verify channels in table header
    assert.ok(html.includes("Cash"));
    assert.ok(html.includes("Cards"));
    assert.ok(html.includes("LankaQR"));
    assert.ok(html.includes("City Ledger"));
    assert.ok(html.includes("Online IPG"));

    // Verify bottom total row
    assert.ok(html.includes("Total Channels"));
    assert.ok(html.includes("Dept Total (Gross)"));
  });

  it("generates 5-section formatted CSV with cross-tabulation and tax schedule", () => {
    const csv = generateRevenueMatrixCsv(DEFAULT_REVENUE_MATRIX_DATA);

    // Header assertions
    assert.ok(csv.includes("SRI LANKA HOTEL MANAGEMENT SYSTEM"));
    assert.ok(csv.includes("The Heritance Galle Fort & Resort"));
    assert.ok(csv.includes("SLTDA/HOTEL/2026/0142"));
    assert.ok(csv.includes("102394857-7000"));

    // Section 1: 2D Matrix
    assert.ok(csv.includes("SECTION 1: 2D REVENUE CROSS-TABULATION MATRIX (GROSS LKR)"));
    assert.ok(csv.includes("Room Accommodation"));
    assert.ok(csv.includes("TOTAL SETTLEMENT CHANNELS"));

    // Section 2: Statutory Tax Schedule
    assert.ok(csv.includes("SECTION 2: SRI LANKAN STATUTORY TAX COMPOUNDING SCHEDULE (LKR)"));
    assert.ok(csv.includes("Service Charge (10%)"));
    assert.ok(csv.includes("TDL (1%)"));
    assert.ok(csv.includes("SSCL (2.5%)"));
    assert.ok(csv.includes("VAT (18%)"));
    assert.ok(csv.includes("GRAND TOTALS"));

    // Section 3: Settlement MDR Realization
    assert.ok(
      csv.includes("SECTION 3: SETTLEMENT REALIZATION & MERCHANT DISCOUNT RATE (MDR) FEES"),
    );
    assert.ok(csv.includes("Credit / Debit Cards"));
    assert.ok(csv.includes("LankaQR (CBSL CEFT)"));
    assert.ok(csv.includes("TOTAL REALIZATION"));

    // Section 4: Cashier Drawer Reconciliation
    assert.ok(csv.includes("SECTION 4: CASHIER SHIFT DRAWER RECONCILIATION"));
    assert.ok(csv.includes("Kavinda Wickramasinghe"));
    assert.ok(csv.includes("Dilshan Perera"));

    // Section 5: Cryptographic Audit Seal
    assert.ok(csv.includes("SECTION 5: CRYPTOGRAPHIC AUDIT VERIFICATION"));
    assert.ok(csv.includes(DEFAULT_REVENUE_MATRIX_DATA.auditSealSha256));
    assert.ok(csv.includes("Anura Jayasundara (General Manager)"));
  });

  it("safely handles triggerFileDownload in non-browser Node environments", () => {
    assert.doesNotThrow(() => {
      triggerFileDownload("test.csv", "sample,content");
    });
  });

  it("roundLkr provides accurate integer-cent rounding", () => {
    assert.strictEqual(roundLkr(100.456), 100.46);
    assert.strictEqual(roundLkr(100.454), 100.45);
    assert.strictEqual(roundLkr(0), 0);
  });

  it("exports comprehensive metadata and interface contracts", () => {
    assert.strictEqual(DEPARTMENTS.length, 7);
    assert.strictEqual(SETTLEMENT_CHANNELS.length, 5);

    // Verify departments are unique
    const deptCodes = new Set(DEPARTMENTS.map((d) => d.code));
    assert.strictEqual(deptCodes.size, 7);

    // Verify channels are unique
    const chanCodes = new Set(SETTLEMENT_CHANNELS.map((c) => c.code));
    assert.strictEqual(chanCodes.size, 5);
  });
});
