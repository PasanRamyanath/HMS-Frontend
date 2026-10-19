import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CleaningStatus,
  type CsvImportError,
  type CsvImportResult,
  type HeaderIndexMap,
  type ImportedRoomRow,
  buildHeaderIndexMap,
  generateRoomCsvTemplate,
  parseRoomCsvString,
  readRoomCsvFile,
  splitCsvLine,
} from "../src/admin/rooms/csvRoomImporter.js";

describe("Bulk CSV Room & Rate Importer (csvRoomImporter.ts)", () => {
  describe("RFC 4180 CSV Line Tokenizer (splitCsvLine)", () => {
    it("splits standard comma-separated values cleanly", () => {
      const line = "101,Deluxe,1,North Wing,2,1,28000,95,CLEAN,Balcony";
      const fields = splitCsvLine(line);
      assert.deepEqual(fields, [
        "101",
        "Deluxe",
        "1",
        "North Wing",
        "2",
        "1",
        "28000",
        "95",
        "CLEAN",
        "Balcony",
      ]);
    });

    it("preserves commas inside double-quoted strings", () => {
      const line =
        '201,"Colonial Suite, Heritage Wing",2,Villa 1,4,2,65000,220,CLEAN,"King bed, sea view"';
      const fields = splitCsvLine(line);
      assert.equal(fields[0], "201");
      assert.equal(fields[1], "Colonial Suite, Heritage Wing");
      assert.equal(fields[9], "King bed, sea view");
    });

    it("handles escaped quotes within quoted fields", () => {
      const line = '301,"Deluxe ""Royal"" Suite",3,Main Wing,2,1,45000,150,CLEAN,"Notes"';
      const fields = splitCsvLine(line);
      assert.equal(fields[0], "301");
      assert.equal(fields[1], 'Deluxe "Royal" Suite');
    });

    it("handles empty fields and trailing commas", () => {
      const line = "102,Deluxe,,,2,,25000,85,,";
      const fields = splitCsvLine(line);
      assert.equal(fields[0], "102");
      assert.equal(fields[1], "Deluxe");
      assert.equal(fields[2], "");
      assert.equal(fields[3], "");
      assert.equal(fields[4], "2");
      assert.equal(fields[5], "");
      assert.equal(fields[6], "25000");
      assert.equal(fields[7], "85");
    });
  });

  describe("Header Index Resolver (buildHeaderIndexMap)", () => {
    it("resolves canonical header names", () => {
      const header =
        "Room Number,Room Type,Floor,Wing,Max Adults,Max Children,Rate LKR,Rate USD,Status,Notes";
      const map: HeaderIndexMap = buildHeaderIndexMap(header);
      assert.equal(map.roomNumber, 0);
      assert.equal(map.roomType, 1);
      assert.equal(map.floor, 2);
      assert.equal(map.wing, 3);
      assert.equal(map.maxAdults, 4);
      assert.equal(map.maxChildren, 5);
      assert.equal(map.rateLkr, 6);
      assert.equal(map.rateUsd, 7);
      assert.equal(map.status, 8);
      assert.equal(map.notes, 9);
    });

    it("resolves alternative header aliases flexibly", () => {
      const header =
        "Unit,Category,Level,Building,Adults,Children,Resident Rate,Foreign Rate,Housekeeping,Remarks";
      const map = buildHeaderIndexMap(header);
      assert.equal(map.roomNumber, 0);
      assert.equal(map.roomType, 1);
      assert.equal(map.floor, 2);
      assert.equal(map.wing, 3);
      assert.equal(map.maxAdults, 4);
      assert.equal(map.maxChildren, 5);
      assert.equal(map.rateLkr, 6);
      assert.equal(map.rateUsd, 7);
      assert.equal(map.status, 8);
      assert.equal(map.notes, 9);
    });

    it("sets column index to -1 when a column is absent", () => {
      const header = "Room,Type";
      const map = buildHeaderIndexMap(header);
      assert.equal(map.roomNumber, 0);
      assert.equal(map.roomType, 1);
      assert.equal(map.floor, -1);
      assert.equal(map.wing, -1);
      assert.equal(map.rateLkr, -1);
    });
  });

  describe("CSV Content Parser & Validator (parseRoomCsvString)", () => {
    it("successfully parses sample CSV template without any errors", () => {
      const csv = generateRoomCsvTemplate();
      const result: CsvImportResult = parseRoomCsvString(csv);

      assert.equal(result.success, true);
      assert.equal(result.validRows.length, 5);
      assert.equal(result.errors.length, 0);
      assert.equal(result.skippedRows, 0);

      const firstRow: ImportedRoomRow = result.validRows[0] as ImportedRoomRow;
      assert.equal(firstRow.roomNumber, "101");
      assert.equal(firstRow.roomTypeName, "Deluxe Ocean View");
      assert.equal(firstRow.floor, "1");
      assert.equal(firstRow.wing, "North Beach Wing");
      assert.equal(firstRow.maxAdults, 2);
      assert.equal(firstRow.maxChildren, 1);
      assert.equal(firstRow.baseRateLkr, 28000);
      assert.equal(firstRow.baseRateUsd, 95);
      assert.equal(firstRow.cleaningStatus, "CLEAN");
    });

    it("parses different cleaning statuses accurately", () => {
      const csv = [
        "Room,Type,Status",
        "101,Deluxe,CLEAN",
        "102,Deluxe,DIRTY",
        "103,Deluxe,IN_PROGRESS",
        "104,Deluxe,INSPECTED",
        "105,Deluxe,UNKNOWN",
      ].join("\n");

      const result = parseRoomCsvString(csv);
      assert.equal(result.success, true);
      assert.equal(result.validRows.length, 5);

      const statuses: CleaningStatus[] = result.validRows.map((r) => r.cleaningStatus);
      assert.deepEqual(statuses, ["CLEAN", "DIRTY", "IN_PROGRESS", "INSPECTED", "CLEAN"]);
    });

    it("detects and flags duplicate room numbers", () => {
      const csv = [
        "Room,Type,Rate LKR",
        "101,Deluxe,25000",
        "102,Deluxe,25000",
        "101,Suite,45000", // duplicate
      ].join("\n");

      const result = parseRoomCsvString(csv);
      assert.equal(result.success, false);
      assert.equal(result.validRows.length, 2);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0]?.field, "roomNumber");
      assert.equal(result.errors[0]?.rowNumber, 4);
      assert.ok(result.errors[0]?.message.includes("Duplicate room number"));
    });

    it("rejects file with missing room number header", () => {
      const csv = ["Type,Rate LKR", "Deluxe,25000"].join("\n");
      const result = parseRoomCsvString(csv);
      assert.equal(result.success, false);
      assert.equal(result.validRows.length, 0);
      assert.equal(result.errors[0]?.field, "roomNumber");
    });

    it("rejects file with less than 2 lines", () => {
      const csv = "Room Number,Type";
      const result = parseRoomCsvString(csv);
      assert.equal(result.success, false);
      assert.equal(result.validRows.length, 0);
      assert.equal(result.errors[0]?.field, "header");
    });

    it("ignores comments starting with # and empty lines", () => {
      const csv = [
        "# Sri Lankan Hotel Rooms Export",
        "Room,Type,Rate LKR",
        "",
        "101,Deluxe,25000",
        "   ",
        "# Ground floor rooms",
        "102,Deluxe,25000",
      ].join("\n");

      const result = parseRoomCsvString(csv);
      assert.equal(result.success, true);
      assert.equal(result.validRows.length, 2);
    });

    it("flags empty room numbers in rows", () => {
      const csv = ["Room,Type", ",Deluxe", "202,Suite"].join("\n");
      const result = parseRoomCsvString(csv);
      assert.equal(result.success, false);
      assert.equal(result.validRows.length, 1);
      assert.equal(result.skippedRows, 1);
      assert.equal(result.errors[0]?.field, "roomNumber");
    });

    it("strips currency symbols and thousands commas from rates", () => {
      const csv = ["Room,Type,Rate LKR,Rate USD", '101,Deluxe,"Rs. 35,000","$ 120.50"'].join("\n");

      const result = parseRoomCsvString(csv);
      assert.equal(result.success, true);
      assert.equal(result.validRows[0]?.baseRateLkr, 35000);
      assert.equal(result.validRows[0]?.baseRateUsd, 120.5);
    });
  });

  describe("generateRoomCsvTemplate Helper", () => {
    it("returns a valid non-empty CSV template", () => {
      const template = generateRoomCsvTemplate();
      assert.ok(template.includes("Room Number"));
      assert.ok(template.includes("Deluxe Ocean View"));
      assert.ok(template.includes("Colonial Suite"));
      assert.ok(template.includes("Private Pool Villa"));
    });
  });

  describe("readRoomCsvFile Native FileReader Wrapper", () => {
    it("successfully parses CSV file using mock FileReader", async () => {
      const csvContent = generateRoomCsvTemplate();

      // Mock browser File and FileReader environment
      class MockFileReader {
        public onload: ((e: { target: { result: string } }) => void) | null = null;
        public onerror: (() => void) | null = null;
        public readAsText(_blob: unknown, _encoding?: string) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: csvContent } });
            }
          }, 0);
        }
      }

      const originalFileReader = globalThis.FileReader;
      // @ts-expect-error Mock FileReader in test
      globalThis.FileReader = MockFileReader;

      try {
        const fakeFile = {} as File;
        const result = await readRoomCsvFile(fakeFile);
        assert.equal(result.success, true);
        assert.equal(result.validRows.length, 5);
      } finally {
        globalThis.FileReader = originalFileReader;
      }
    });

    it("rejects when FileReader encounters an error", async () => {
      class FailingMockFileReader {
        public onload: unknown = null;
        public onerror: (() => void) | null = null;
        public error = new Error("Disk read failure");
        public readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      }

      const originalFileReader = globalThis.FileReader;
      // @ts-expect-error Mock FileReader in test
      globalThis.FileReader = FailingMockFileReader;

      try {
        const fakeFile = {} as File;
        await assert.rejects(readRoomCsvFile(fakeFile), /Disk read failure/);
      } finally {
        globalThis.FileReader = originalFileReader;
      }
    });

    it("verifies exported types and result structures", () => {
      const err: CsvImportError = {
        rowNumber: 2,
        field: "roomNumber",
        message: "Required",
        rawValue: "",
      };
      assert.equal(err.field, "roomNumber");
    });
  });
});
