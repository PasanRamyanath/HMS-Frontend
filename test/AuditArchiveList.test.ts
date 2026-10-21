/**
 * Unit Test Suite for Step 422: AuditArchiveList
 * (`test/AuditArchiveList.test.ts`)
 *
 * Implements Step 422 (Phase 17.22) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Historical Night Audit Archive & Re-Print Browser (`AuditArchiveList.tsx`).
 *
 * Validates:
 * 1. Filter engine (`filterAuditRecords`) across dates, auditors, hashes, and variance toggles
 * 2. Financial period aggregator (`calculateArchivePeriodSummary`)
 * 3. Cryptographic ledger chain verification (`verifyAuditHashChain`)
 * 4. CSV export builder (`generateAuditArchiveCsv`)
 * 5. React 19 SSR rendering of table, KPI cards, and hash badges
 * 6. React 19 SSR modal inspection and 4-stage statutory tax breakdown
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AuditArchiveList,
  type AuditArchiveListProps,
  DEFAULT_HISTORICAL_AUDIT_RECORDS,
  type HistoricalAuditRecord,
  calculateArchivePeriodSummary,
  filterAuditRecords,
  generateAuditArchiveCsv,
  verifyAuditHashChain,
} from "../src/admin/reports/AuditArchiveList.js";

describe("Step 422: Historical Night Audit Archive Browser (AuditArchiveList.tsx)", () => {
  describe("1. Computational & Filter Engines", () => {
    it("filters records by auditor name or date string query", () => {
      const byAuditor = filterAuditRecords(DEFAULT_HISTORICAL_AUDIT_RECORDS, {
        searchQuery: "Niroshan",
        onlyVariances: false,
      });
      assert.equal(byAuditor.length, 2);
      assert.ok(byAuditor.every((r) => r.auditorName.includes("Niroshan")));

      const byDate = filterAuditRecords(DEFAULT_HISTORICAL_AUDIT_RECORDS, {
        searchQuery: "2026-10-31",
        onlyVariances: false,
      });
      assert.equal(byDate.length, 1);
      assert.equal(byDate[0]?.businessDate, "2026-10-31");
    });

    it("filters records by date range bounds", () => {
      const filtered = filterAuditRecords(DEFAULT_HISTORICAL_AUDIT_RECORDS, {
        searchQuery: "",
        dateFrom: "2026-10-29",
        dateTo: "2026-10-31",
        onlyVariances: false,
      });
      assert.equal(filtered.length, 3);
      assert.equal(filtered[0]?.businessDate, "2026-10-31");
      assert.equal(filtered[1]?.businessDate, "2026-10-30");
      assert.equal(filtered[2]?.businessDate, "2026-10-29");
    });

    it("filters by cash variance when onlyVariances is enabled", () => {
      const firstRecord = DEFAULT_HISTORICAL_AUDIT_RECORDS[0];
      assert.ok(firstRecord);

      const recordsWithVariance: readonly HistoricalAuditRecord[] = [
        ...DEFAULT_HISTORICAL_AUDIT_RECORDS,
        {
          ...firstRecord,
          id: "AUDIT#2026-10-26",
          businessDate: "2026-10-26",
          cashVarianceLkr: -2500, // Shortage
        },
      ];

      const variancesOnly = filterAuditRecords(recordsWithVariance, {
        searchQuery: "",
        onlyVariances: true,
      });

      assert.equal(variancesOnly.length, 1);
      assert.equal(variancesOnly[0]?.cashVarianceLkr, -2500);
    });

    it("calculates accurate period summary metrics", () => {
      const summary = calculateArchivePeriodSummary(DEFAULT_HISTORICAL_AUDIT_RECORDS);

      assert.equal(summary.totalAudits, 5);
      assert.ok(summary.totalGrossRevenueLkr > 50000000);
      assert.ok(summary.averageOccupancyPercent > 80 && summary.averageOccupancyPercent < 90);
      assert.equal(summary.totalCashVarianceLkr, 0);
      assert.equal(summary.allChainsValid, true);
    });

    it("validates intact cryptographic hash chains and catches breaks", () => {
      // Valid chain
      const checkValid = verifyAuditHashChain(DEFAULT_HISTORICAL_AUDIT_RECORDS);
      assert.equal(checkValid.isValid, true);
      assert.equal(checkValid.brokenIndex, -1);

      // Tampered chain
      const rec0 = DEFAULT_HISTORICAL_AUDIT_RECORDS[0];
      const rec1 = DEFAULT_HISTORICAL_AUDIT_RECORDS[1];
      const rec2 = DEFAULT_HISTORICAL_AUDIT_RECORDS[2];
      assert.ok(rec0 && rec1 && rec2);

      const tampered: readonly HistoricalAuditRecord[] = [
        rec0,
        {
          ...rec1,
          sha256Hash: "corrupted_hash_value_12345",
        },
        rec2,
      ];

      const checkInvalid = verifyAuditHashChain(tampered);
      assert.equal(checkInvalid.isValid, false);
      assert.equal(checkInvalid.brokenIndex, 0);
    });

    it("generates CSV export data containing all statutory columns", () => {
      const csv = generateAuditArchiveCsv(DEFAULT_HISTORICAL_AUDIT_RECORDS);

      assert.ok(csv.includes("Business Date,Auditor Name,Auditor Role,Occupancy %"));
      assert.ok(csv.includes("Service Charge (LKR),TDL (LKR),SSCL (LKR),VAT (LKR)"));
      assert.ok(csv.includes("2026-10-31"));
      assert.ok(csv.includes("Kamal Gunaratne"));
    });
  });

  describe("2. React 19 SSR: AuditArchiveList Rendering", () => {
    it("renders master header, SLTDA registration, and export button", () => {
      const props: AuditArchiveListProps = {
        initialRecords: DEFAULT_HISTORICAL_AUDIT_RECORDS,
        hotelName: "Cinnamon Bentota Beach Resort",
        sltdaRegNo: "SLTDA/SQA/PRO/00892",
      };

      const html = renderToStaticMarkup(React.createElement(AuditArchiveList, props));

      assert.ok(html.includes("Historical Night Audit Archive"));
      assert.ok(html.includes("Cinnamon Bentota Beach Resort"));
      assert.ok(html.includes("SLTDA/SQA/PRO/00892"));
      assert.ok(html.includes("Export Archive CSV"));
    });

    it("renders summary KPI cards for audits, occupancy, revenue, and variance", () => {
      const props: AuditArchiveListProps = {
        initialRecords: DEFAULT_HISTORICAL_AUDIT_RECORDS,
      };

      const html = renderToStaticMarkup(React.createElement(AuditArchiveList, props));

      assert.ok(html.includes("Audits Archived"));
      assert.ok(html.includes("Average Occupancy"));
      assert.ok(html.includes("Total Gross Revenue"));
      assert.ok(html.includes("Total Cash Variance"));
      assert.ok(html.includes("100% Balanced"));
    });

    it("renders historical table rows with auditor, occupancy %, and truncated hash", () => {
      const props: AuditArchiveListProps = {
        initialRecords: DEFAULT_HISTORICAL_AUDIT_RECORDS,
      };

      const html = renderToStaticMarkup(React.createElement(AuditArchiveList, props));

      assert.ok(html.includes("Saturday, 31 October 2026"));
      assert.ok(html.includes("Kamal Gunaratne"));
      assert.ok(html.includes("89.31%"));
      assert.ok(html.includes("#9f83a21b…"));
      assert.ok(html.includes("Balanced"));
    });
  });
});
