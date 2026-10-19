import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ArchiveDateRangePreset,
  type ArchiveFolioStatus,
  DEFAULT_ARCHIVE_FOLIOS,
  type FolioArchiveItem,
  type FolioArchiveKpiSummary,
  FolioArchiveList,
  type FolioArchiveListProps,
  type FolioPartitionType,
  calculateArchiveKpiSummary,
  exportFoliosToCsv,
  filterFolios,
  getArchiveStatusBadgeColor,
  matchesSearchQuery,
  roundLkr,
} from "../src/admin/folios/FolioArchiveList.js";

describe("Step 219: FolioArchiveList & Historical Invoice Archive", () => {
  describe("1. Pure Calculation & Filter Helpers", () => {
    it("rounds numbers half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(321948.254), 321948.25);
      assert.strictEqual(roundLkr(321948.255), 321948.26);
    });

    it("calculates accurate KPI summary metrics across historical archive folios", () => {
      const summary = calculateArchiveKpiSummary(DEFAULT_ARCHIVE_FOLIOS);

      // Excluding VOIDED folio (INV-2026-00406):
      // Invoiced: 321948 + 127437.75 + 60365.25 + 241461 = 751212
      assert.strictEqual(summary.totalInvoicedLkr, 751212);
      // Collected: 0 + 127437.75 + 60365.25 + 100000 = 287803
      assert.strictEqual(summary.totalCollectedLkr, 287803);
      // Outstanding: 321948 + 0 + 0 + 141461 = 463409
      assert.strictEqual(summary.totalOutstandingLkr, 463409);
      // Status counts:
      assert.strictEqual(summary.openCount, 1);
      assert.strictEqual(summary.closedCount, 2);
      assert.strictEqual(summary.cityLedgerCount, 1);
      assert.strictEqual(summary.voidedCount, 1);
      assert.strictEqual(summary.totalCount, 5);
    });

    it("maps archive statuses to appropriate Apple HIG status badge colors", () => {
      assert.strictEqual(getArchiveStatusBadgeColor("CLOSED"), "green");
      assert.strictEqual(getArchiveStatusBadgeColor("OPEN"), "blue");
      assert.strictEqual(getArchiveStatusBadgeColor("CITY_LEDGER"), "indigo");
      assert.strictEqual(getArchiveStatusBadgeColor("VOIDED"), "red");
      assert.strictEqual(getArchiveStatusBadgeColor("UNKNOWN" as ArchiveFolioStatus), "gray");
    });

    it("matches search query across multiple fields (invoice #, guest, NIC, room, DMC)", () => {
      const item = DEFAULT_ARCHIVE_FOLIOS[0];
      assert.ok(item);

      // Empty query matches everything
      assert.strictEqual(matchesSearchQuery(item, ""), true);
      // Invoice number match
      assert.strictEqual(matchesSearchQuery(item, "INV-2026-00410"), true);
      // Guest name match
      assert.strictEqual(matchesSearchQuery(item, "Alexander"), true);
      // Passport match
      assert.strictEqual(matchesSearchQuery(item, "P7829104"), true);
      // Room match
      assert.strictEqual(matchesSearchQuery(item, "Villa 301"), true);
      // DMC match
      assert.strictEqual(matchesSearchQuery(item, "Aitken Spence"), true);
      // Non-match
      assert.strictEqual(matchesSearchQuery(item, "NonExistent"), false);
    });

    it("filters folios by status, partition, and query", () => {
      // Status filter
      const closedOnly = filterFolios(DEFAULT_ARCHIVE_FOLIOS, "", "CLOSED", "ALL");
      assert.strictEqual(closedOnly.length, 2);

      const openOnly = filterFolios(DEFAULT_ARCHIVE_FOLIOS, "", "OPEN", "ALL");
      assert.strictEqual(openOnly.length, 1);

      // Partition filter
      const dmcOnly = filterFolios(DEFAULT_ARCHIVE_FOLIOS, "", "ALL", "DMC_DIRECT");
      assert.strictEqual(dmcOnly.length, 1);
      assert.strictEqual(dmcOnly[0]?.dmcName, "Aitken Spence Travels (Pvt) Ltd");

      // Combined query and status
      const searchRes = filterFolios(DEFAULT_ARCHIVE_FOLIOS, "Alexander", "CITY_LEDGER", "ALL");
      assert.strictEqual(searchRes.length, 1);
      assert.strictEqual(searchRes[0]?.invoiceNumber, "INV-2026-00410");
    });

    it("exports accountant-compliant CSV with statutory columns", () => {
      const csv = exportFoliosToCsv(DEFAULT_ARCHIVE_FOLIOS);

      // Headers check
      assert.ok(csv.includes("Invoice Number,Folio ID,Invoice Date"));
      assert.ok(csv.includes("Base Supply (LKR)"));
      assert.ok(csv.includes("VAT 18% (LKR)"));
      assert.ok(csv.includes("Grand Total Gross (LKR)"));

      // Row content check
      assert.ok(csv.includes('"INV-2026-00410"'));
      assert.ok(csv.includes('"Alexander von Humboldt"'));
      assert.ok(csv.includes('"Aitken Spence Travels (Pvt) Ltd"'));
      assert.ok(csv.includes('"CITY_LEDGER"'));
    });
  });

  describe("2. Static Markup & Component Rendering", () => {
    it("renders full folio archive list with KPI cards, filter bar, and data table", () => {
      const html = renderToStaticMarkup(
        React.createElement(FolioArchiveList, {
          folios: DEFAULT_ARCHIVE_FOLIOS,
        }),
      );

      // KPI cards
      assert.ok(html.includes("Total Revenue Invoiced"));
      assert.ok(html.includes("Total Settled &amp; Collected"));
      assert.ok(html.includes("Outstanding AR Balance"));
      assert.ok(html.includes("Statutory VAT &amp; SSCL"));

      // Filter bar & export
      assert.ok(html.includes("Export CSV"));
      assert.ok(html.includes("Partition:"));
      assert.ok(html.includes("All Partitions"));

      // Table rows
      assert.ok(html.includes("INV-2026-00410"));
      assert.ok(html.includes("Alexander von Humboldt"));
      assert.ok(html.includes("INV-2026-00409"));
      assert.ok(html.includes("Nisansala Jayawardena"));
      assert.ok(html.includes("INV-2026-00408"));
      assert.ok(html.includes("Sir Reginald Sterling"));
    });

    it("renders empty state message when no folios match specified filter", () => {
      const html = renderToStaticMarkup(
        React.createElement(FolioArchiveList, {
          folios: [],
        }),
      );

      assert.ok(html.includes("No historical invoices or folios match the specified filters."));
    });

    it("verifies constructible types and interfaces", () => {
      const preset: ArchiveDateRangePreset = "THIS_MONTH";
      const partition: FolioPartitionType = "GUEST_MASTER";
      const status: ArchiveFolioStatus = "CLOSED";
      const item: FolioArchiveItem | undefined = DEFAULT_ARCHIVE_FOLIOS[0];
      assert.ok(item);
      const summary: FolioArchiveKpiSummary = calculateArchiveKpiSummary([item]);
      const props: FolioArchiveListProps = {
        folios: [item],
        onSelectFolio: () => undefined,
        onPrintInvoice: () => undefined,
        onIssueCreditNote: () => undefined,
        onExportCsv: () => undefined,
      };

      assert.strictEqual(preset, "THIS_MONTH");
      assert.strictEqual(partition, "GUEST_MASTER");
      assert.strictEqual(status, "CLOSED");
      assert.strictEqual(summary.totalCount, 1);
      assert.ok(props.folios?.length);
    });
  });
});
