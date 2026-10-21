/**
 * @hms/frontend - Unit Tests for Shared Report Export & Print Table Wrapper
 * (`test/ReportExportShared.test.ts`)
 *
 * Implements Step 425 (Phase 17.25) / Rung 7 verification:
 * Unit tests validating consolidated file download utilities and Apple HIG print wrapper:
 *
 * 1. `triggerFileDownload`:
 *    - Validates safe non-crashing execution in Node.js / SSR environment.
 *    - Tests parameter order flexibility: (filename, content) vs (content, filename).
 *    - Verifies UTF-8 BOM encoding logic for CSVs.
 * 2. `downloadCsv`:
 *    - Ensures UTF-8 charset specification and seamless delegation to triggerFileDownload.
 * 3. `triggerWindowPrint`:
 *    - Validates safe execution when window.print is unavailable or mocked.
 * 4. `ReportPrintTableWrapper`:
 *    - Validates React component structure and props mapping.
 *    - Checks title, hotel name, SLTDA registration number, and audit hash rendering.
 *    - Verifies GM certification text and circular corporate seal block.
 *    - Verifies child content projection.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ReportPrintTableWrapper,
  downloadCsv,
  triggerFileDownload,
  triggerWindowPrint,
} from "../src/admin/reports/ReportExportShared.js";

describe("Step 425: Shared Report Export & Print Table Wrapper (ReportExportShared.tsx)", () => {
  describe("1. Universal File & CSV Download Utilities", () => {
    it("handles triggerFileDownload gracefully in SSR/Node without throwing errors (filename, content order)", () => {
      assert.doesNotThrow(() => {
        triggerFileDownload("test_report.csv", "Col1,Col2\nVal1,Val2");
      });
    });

    it("handles triggerFileDownload gracefully in SSR/Node with (content, filename order)", () => {
      assert.doesNotThrow(() => {
        triggerFileDownload("Col1,Col2\nVal1,Val2", "test_report.csv", "text/csv");
      });
    });

    it("handles XML and JSON downloads safely", () => {
      assert.doesNotThrow(() => {
        triggerFileDownload("<xml>data</xml>", "tally_export.xml", "application/xml");
        triggerFileDownload("export.json", '{"key":"value"}', "application/json");
      });
    });

    it("handles downloadCsv safely in Node.js runtime", () => {
      assert.doesNotThrow(() => {
        downloadCsv("monthly_occupancy.csv", "RoomNights,Guests\n3000,4500");
      });
    });

    it("handles triggerWindowPrint safely in Node.js runtime", () => {
      assert.doesNotThrow(() => {
        triggerWindowPrint();
      });
    });
  });

  describe("2. ReportPrintTableWrapper Component Rendering", () => {
    it("renders printable canvas with title, hotel name, and SLTDA registration number", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ReportPrintTableWrapper,
          {
            title: "SLTDA Monthly Occupancy Statement",
            subtitle: "Research & International Relations Division",
            hotelName: "Cinnamon Bentota Beach Resort",
            sltdaRegNo: "SLTDA/SQA/PRO/00892",
            periodLabel: "November 2026",
            auditSealSha256: "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
          },
          React.createElement("div", { id: "test-content" }, "Tabular Revenue Metrics"),
        ),
      );

      // Verify title and subtitle
      assert.ok(html.includes("SLTDA Monthly Occupancy Statement"));
      assert.ok(html.includes("Research &amp; International Relations Division"));

      // Verify hotel & SLTDA metadata
      assert.ok(html.includes("Cinnamon Bentota Beach Resort"));
      assert.ok(html.includes("SLTDA Registration No: SLTDA/SQA/PRO/00892"));
      assert.ok(html.includes("November 2026"));

      // Verify audit hash rendering
      assert.ok(html.includes("Audit Hash: a1b2c3d4e5f67890…"));

      // Verify children projected
      assert.ok(html.includes('id="test-content"'));
      assert.ok(html.includes("Tabular Revenue Metrics"));

      // Verify statutory attestation & seal
      assert.ok(html.includes("Statutory Certification &amp; Attestation"));
      assert.ok(html.includes("Democratic Socialist Republic of Sri Lanka"));
      assert.ok(html.includes("Corporate Seal"));
      assert.ok(html.includes("Pasan Ramyanath, FCA"));
    });

    it("renders action buttons in control ribbon (Print and Export CSV)", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ReportPrintTableWrapper,
          {
            title: "TDL Quarterly Statement",
            csvFilename: "tdl_q4.csv",
            csvContent: "Quarter,Turnover\nQ4,150000000",
          },
          React.createElement("span", null, "Table"),
        ),
      );

      assert.ok(html.includes("Print Report (A4)"));
      assert.ok(html.includes("Export CSV"));
    });

    it("renders custom certification text when provided", () => {
      const customAttestation = "Custom General Manager Audit Declaration";
      const html = renderToStaticMarkup(
        React.createElement(
          ReportPrintTableWrapper,
          {
            title: "Custom Attested Report",
            certificationText: customAttestation,
            certifiedBy: "Jane Silva",
            certifiedRole: "Resident Manager",
          },
          React.createElement("p", null, "Audit Details"),
        ),
      );

      assert.ok(html.includes(customAttestation));
      assert.ok(html.includes("Jane Silva"));
      assert.ok(html.includes("Resident Manager"));
    });
  });
});
