/**
 * Zero-Dependency Bulk CSV Room & Rate Importer.
 * Built for migrating Sri Lankan hotels, boutique villas, and rest houses
 * to import physical room inventory, capacities, and dual-currency tariffs.
 * Uses native string manipulation and FileReader (zero PapaParse dependency).
 */

// ============================================================================
// Types & Domain Models
// ============================================================================

export type CleaningStatus = "CLEAN" | "DIRTY" | "IN_PROGRESS" | "INSPECTED";

export interface ImportedRoomRow {
 readonly roomNumber: string;
 readonly roomTypeName: string;
 readonly floor: string;
 readonly wing: string;
 readonly maxAdults: number;
 readonly maxChildren: number;
 readonly baseRateLkr: number;
 readonly baseRateUsd: number;
 readonly cleaningStatus: CleaningStatus;
 readonly notes: string;
}

export interface CsvImportError {
 readonly rowNumber: number;
 readonly field: string;
 readonly message: string;
 readonly rawValue?: string | undefined;
}

export interface CsvImportResult {
 readonly success: boolean;
 readonly validRows: ReadonlyArray<ImportedRoomRow>;
 readonly errors: ReadonlyArray<CsvImportError>;
 readonly totalParsed: number;
 readonly skippedRows: number;
}

export interface HeaderIndexMap {
 readonly roomNumber: number;
 readonly roomType: number;
 readonly floor: number;
 readonly wing: number;
 readonly maxAdults: number;
 readonly maxChildren: number;
 readonly rateLkr: number;
 readonly rateUsd: number;
 readonly status: number;
 readonly notes: number;
}

// ============================================================================
// RFC 4180 Lightweight CSV Line Parser (Cognitive Complexity <= 12)
// ============================================================================

export function splitCsvLine(line: string): string[] {
 const fields: string[] = [];
 let currentField = "";
 let insideQuotes = false;
 let i = 0;

 while (i < line.length) {
 const char = line[i];

 if (char === '"') {
 if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
 currentField += '"';
 i += 2;
 continue;
 }
 insideQuotes = !insideQuotes;
 i += 1;
 continue;
 }

 if (char === "," && !insideQuotes) {
 fields.push(currentField.trim());
 currentField = "";
 i += 1;
 continue;
 }

 currentField += char;
 i += 1;
 }

 fields.push(currentField.trim());
 return fields;
}

// ============================================================================
// Header Index Resolver (Cognitive Complexity <= 12)
// ============================================================================

function normalizeHeader(header: string): string {
 return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveColumnIndex(
 normalizedHeaders: readonly string[],
 aliases: readonly string[],
): number {
 for (const alias of aliases) {
 const idx = normalizedHeaders.indexOf(alias);
 if (idx !== -1) {
 return idx;
 }
 }
 return -1;
}

export function buildHeaderIndexMap(headerLine: string): HeaderIndexMap {
 const rawHeaders = splitCsvLine(headerLine);
 const normalized = rawHeaders.map(normalizeHeader);

 return {
 roomNumber: resolveColumnIndex(normalized, ["roomnumber", "room", "roomno", "number", "unit"]),
 roomType: resolveColumnIndex(normalized, ["roomtype", "roomtypename", "type", "category"]),
 floor: resolveColumnIndex(normalized, ["floor", "floornumber", "level"]),
 wing: resolveColumnIndex(normalized, ["wing", "wingname", "building", "block", "section"]),
 maxAdults: resolveColumnIndex(normalized, ["maxadults", "adults", "pax", "capacityadults"]),
 maxChildren: resolveColumnIndex(normalized, ["maxchildren", "children", "capacitychildren"]),
 rateLkr: resolveColumnIndex(normalized, [
 "baseratelkr",
 "ratelkr",
 "lkr",
 "pricelkr",
 "residentrate",
 "residentratelkr",
 ]),
 rateUsd: resolveColumnIndex(normalized, [
 "baserateusd",
 "rateusd",
 "usd",
 "priceusd",
 "foreignrate",
 "foreignrateusd",
 ]),
 status: resolveColumnIndex(normalized, ["cleaningstatus", "status", "housekeeping"]),
 notes: resolveColumnIndex(normalized, ["notes", "remarks", "description", "features"]),
 };
}

// ============================================================================
// Field Validation Subroutines (Cognitive Complexity <= 12)
// ============================================================================

function extractRawField(fields: readonly string[], colIdx: number, defaultValue = ""): string {
 if (colIdx >= 0 && colIdx < fields.length) {
 return fields[colIdx]?.trim() ?? defaultValue;
 }
 return defaultValue;
}

function parseCapacityField(raw: string, defaultValue: number): number {
 if (!raw) {
 return defaultValue;
 }
 const parsed = Number.parseInt(raw, 10);
 return Number.isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

function parseRateField(raw: string, defaultValue: number): number {
 if (!raw) {
 return defaultValue;
 }
 const withoutPrefix = raw.replace(/^(?:Rs\.?|LKR|USD|\$)\s*/i, "").trim();
 const withoutCommas = withoutPrefix.replace(/,/g, "");
 const match = withoutCommas.match(/[0-9]+(?:\.[0-9]+)?/);
 if (!match) {
 return defaultValue;
 }
 const parsed = Number.parseFloat(match[0]);
 return Number.isNaN(parsed) ? defaultValue : Math.max(0, parsed);
}

function parseCleaningStatus(raw: string): CleaningStatus {
 const normalized = raw.toUpperCase().trim();
 switch (normalized) {
 case "DIRTY":
 return "DIRTY";
 case "IN_PROGRESS":
 return "IN_PROGRESS";
 case "INSPECTED":
 return "INSPECTED";
 default:
 return "CLEAN";
 }
}

interface ParsedRowEvaluation {
 readonly row: ImportedRoomRow | null;
 readonly errors: ReadonlyArray<CsvImportError>;
}

function validateRowFields(
 fields: readonly string[],
 map: HeaderIndexMap,
 rowNumber: number,
 seenRoomNumbers: Set<string>,
): ParsedRowEvaluation {
 const errors: CsvImportError[] = [];

 const roomNumber = extractRawField(fields, map.roomNumber);
 if (!roomNumber) {
 errors.push({
 rowNumber,
 field: "roomNumber",
 message: "Room number is required and cannot be empty.",
 });
 } else {
 const normalizedKey = roomNumber.toUpperCase();
 if (seenRoomNumbers.has(normalizedKey)) {
 errors.push({
 rowNumber,
 field: "roomNumber",
 message: `Duplicate room number '${roomNumber}' found in import file.`,
 rawValue: roomNumber,
 });
 } else {
 seenRoomNumbers.add(normalizedKey);
 }
 }

 const roomTypeName = extractRawField(fields, map.roomType, "Standard Deluxe");
 if (!roomTypeName) {
 errors.push({
 rowNumber,
 field: "roomType",
 message: "Room type / category is required.",
 });
 }

 const floor = extractRawField(fields, map.floor, "1");
 const wing = extractRawField(fields, map.wing, "Main Wing");
 const maxAdults = parseCapacityField(extractRawField(fields, map.maxAdults), 2);
 const maxChildren = parseCapacityField(extractRawField(fields, map.maxChildren), 1);
 const baseRateLkr = parseRateField(extractRawField(fields, map.rateLkr), 25000);
 const baseRateUsd = parseRateField(extractRawField(fields, map.rateUsd), 85);
 const cleaningStatus = parseCleaningStatus(extractRawField(fields, map.status));
 const notes = extractRawField(fields, map.notes, "");

 if (maxAdults < 1) {
 errors.push({
 rowNumber,
 field: "maxAdults",
 message: "Adult occupancy capacity must be at least 1 person.",
 rawValue: String(maxAdults),
 });
 }

 if (errors.length > 0) {
 return { row: null, errors };
 }

 return {
 row: {
 roomNumber,
 roomTypeName,
 floor,
 wing,
 maxAdults,
 maxChildren,
 baseRateLkr,
 baseRateUsd,
 cleaningStatus,
 notes,
 },
 errors: [],
 };
}

// ============================================================================
// Core CSV Importer Function
// ============================================================================

export function parseRoomCsvString(csvText: string): CsvImportResult {
 const cleaned = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
 const rawLines = cleaned.split("\n");

 const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));

 if (lines.length < 2) {
 return {
 success: false,
 validRows: [],
 errors: [
 {
 rowNumber: 1,
 field: "header",
 message: "CSV file must contain a header row and at least one room entry.",
 },
 ],
 totalParsed: 0,
 skippedRows: 0,
 };
 }

 const headerLine = lines[0] ?? "";
 const headerMap = buildHeaderIndexMap(headerLine);

 if (headerMap.roomNumber === -1) {
 return {
 success: false,
 validRows: [],
 errors: [
 {
 rowNumber: 1,
 field: "roomNumber",
 message: "Header row missing required 'Room Number' column.",
 },
 ],
 totalParsed: 0,
 skippedRows: 0,
 };
 }

 const validRows: ImportedRoomRow[] = [];
 const allErrors: CsvImportError[] = [];
 const seenRoomNumbers = new Set<string>();
 let skippedRows = 0;

 for (let idx = 1; idx < lines.length; idx += 1) {
 const line = lines[idx] ?? "";
 const rowNumber = idx + 1; // 1-indexed for human readability

 const fields = splitCsvLine(line);
 const evaluation = validateRowFields(fields, headerMap, rowNumber, seenRoomNumbers);

 if (evaluation.errors.length > 0) {
 allErrors.push(...evaluation.errors);
 skippedRows += 1;
 } else if (evaluation.row) {
 validRows.push(evaluation.row);
 }
 }

 return {
 success: allErrors.length === 0 && validRows.length > 0,
 validRows,
 errors: allErrors,
 totalParsed: validRows.length + skippedRows,
 skippedRows,
 };
}

// ============================================================================
// Native Browser FileReader Wrapper
// ============================================================================

export async function readRoomCsvFile(file: File): Promise<CsvImportResult> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();

 reader.onload = (event) => {
 const content = event.target?.result;
 if (typeof content === "string") {
 resolve(parseRoomCsvString(content));
 } else {
 reject(new Error("Unable to parse CSV file content as plain text."));
 }
 };

 reader.onerror = () => {
 reject(reader.error ?? new Error("FileReader encountered an unrecoverable IO error."));
 };

 reader.readAsText(file, "utf-8");
 });
}

// ============================================================================
// Sample CSV Template Generator
// ============================================================================

export function generateRoomCsvTemplate(): string {
 const headers = [
 "Room Number",
 "Room Type",
 "Floor",
 "Wing",
 "Max Adults",
 "Max Children",
 "Rate LKR",
 "Rate USD",
 "Status",
 "Notes",
 ].join(",");

 const rows = [
 '101,"Deluxe Ocean View",1,"North Beach Wing",2,1,28000,95,CLEAN,"King bed with balcony"',
 '102,"Deluxe Ocean View",1,"North Beach Wing",2,1,28000,95,CLEAN,"Twin beds with sea view"',
 '201,"Colonial Suite",2,"Heritage Villa",2,2,45000,150,INSPECTED,"Antique four-poster bed"',
 '202,"Grand Family Suite",2,"Heritage Villa",4,2,65000,220,CLEAN,"Two interconnecting suites"',
 'V-01,"Private Pool Villa",Ground,"Cabana Enclave",2,1,95000,320,CLEAN,"Plunge pool and outdoor shower"',
 ];

 return [headers, ...rows].join("\n");
}
