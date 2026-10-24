/**
 * CSV / JSON Menu Import & Export Utility (menuImportExport.ts)
 * Purpose-built for Sri Lankan hotels, resorts, and multi-property chains
 * sharing, archiving, and migrating food, beverage, and service menus.
 * Strictly adheres to zero-console noise and explicit Result<T, E> patterns.
 */

// ============================================================================
// Types & Domain Models
// ============================================================================

export interface ExportMenuCategory {
  readonly id: string;
  readonly nameEn: string;
  readonly nameSi: string;
  readonly nameTa: string;
  readonly descriptionEn?: string | undefined;
  readonly iconKey?: string | undefined;
  readonly displayOrder: number;
  readonly isActive: boolean;
}

export interface ExportMenuItem {
  readonly id: string;
  readonly code: string;
  readonly categoryId: string;
  readonly titleEn: string;
  readonly titleSi: string;
  readonly titleTa: string;
  readonly descriptionEn?: string | undefined;
  readonly descriptionSi?: string | undefined;
  readonly descriptionTa?: string | undefined;
  readonly priceLkr: number;
  readonly isVegetarian: boolean;
  readonly isVegan: boolean;
  readonly isHalal: boolean;
  readonly isGlutenFree: boolean;
  readonly spicyLevel: number; // 0..3
  readonly isAvailable: boolean;
  readonly displayOrder: number;
  readonly prepTimeMins?: number | undefined;
}

export interface MenuExportBundle {
  readonly schemaVersion: "1.0.0";
  readonly exportedAt: string; // ISO 8601
  readonly propertyMetadata?:
    | {
        readonly tenantId?: string | undefined;
        readonly propertyName?: string | undefined;
      }
    | undefined;
  readonly categories: ReadonlyArray<ExportMenuCategory>;
  readonly items: ReadonlyArray<ExportMenuItem>;
}

export interface MenuImportError {
  readonly code:
    | "INVALID_JSON"
    | "INVALID_SCHEMA"
    | "MALFORMED_CSV"
    | "EMPTY_CSV"
    | "MISSING_REQUIRED_FIELD"
    | "INVALID_PRICE";
  readonly message: string;
  readonly rowNumber?: number | undefined;
  readonly field?: string | undefined;
}

export type MenuImportResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: MenuImportError };

export interface MenuImportDiff {
  readonly addedItems: ReadonlyArray<ExportMenuItem>;
  readonly updatedItems: ReadonlyArray<{
    readonly incoming: ExportMenuItem;
    readonly existing: ExportMenuItem;
    readonly priceChanged: boolean;
  }>;
  readonly unchangedCount: number;
}

// ============================================================================
// CSV Headers & Escaping Resolvers
// ============================================================================

export const MENU_CSV_HEADERS: ReadonlyArray<string> = [
  "id",
  "code",
  "categoryId",
  "titleEn",
  "titleSi",
  "titleTa",
  "descriptionEn",
  "descriptionSi",
  "descriptionTa",
  "priceLkr",
  "isVegetarian",
  "isVegan",
  "isHalal",
  "isGlutenFree",
  "spicyLevel",
  "isAvailable",
  "displayOrder",
  "prepTimeMins",
];

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i += 2;
        continue;
      }
      insideQuotes = !insideQuotes;
      i += 1;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = "";
      i += 1;
      continue;
    }

    currentValue += char;
    i += 1;
  }

  values.push(currentValue.trim());
  return values;
}

// ============================================================================
// JSON Export & Import Resolvers (Cognitive Complexity <= 12)
// ============================================================================

export function exportMenuToJson(bundle: MenuExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function validateMenuBundle(data: unknown): MenuImportResult<MenuExportBundle> {
  if (!data || typeof data !== "object") {
    return {
      ok: false,
      error: { code: "INVALID_SCHEMA", message: "Root must be a valid JSON object." },
    };
  }

  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion !== "1.0.0") {
    return {
      ok: false,
      error: {
        code: "INVALID_SCHEMA",
        message: `Unsupported schema version: ${String(obj.schemaVersion)}. Expected '1.0.0'.`,
      },
    };
  }

  if (!Array.isArray(obj.categories)) {
    return {
      ok: false,
      error: { code: "INVALID_SCHEMA", message: "'categories' must be an array." },
    };
  }

  if (!Array.isArray(obj.items)) {
    return {
      ok: false,
      error: { code: "INVALID_SCHEMA", message: "'items' must be an array." },
    };
  }

  return {
    ok: true,
    value: data as MenuExportBundle,
  };
}

export function parseMenuFromJson(jsonString: string): MenuImportResult<MenuExportBundle> {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    return validateMenuBundle(parsed);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: err instanceof Error ? err.message : "Failed to parse JSON string.",
      },
    };
  }
}

// ============================================================================
// CSV Export & Import Resolvers (Cognitive Complexity <= 12)
// ============================================================================

export function exportMenuItemsToCsv(items: ReadonlyArray<ExportMenuItem>): string {
  const rows: string[] = [MENU_CSV_HEADERS.join(",")];

  for (const item of items) {
    const values = [
      escapeCsvField(item.id),
      escapeCsvField(item.code),
      escapeCsvField(item.categoryId),
      escapeCsvField(item.titleEn),
      escapeCsvField(item.titleSi),
      escapeCsvField(item.titleTa),
      escapeCsvField(item.descriptionEn ?? ""),
      escapeCsvField(item.descriptionSi ?? ""),
      escapeCsvField(item.descriptionTa ?? ""),
      escapeCsvField(item.priceLkr),
      escapeCsvField(item.isVegetarian),
      escapeCsvField(item.isVegan),
      escapeCsvField(item.isHalal),
      escapeCsvField(item.isGlutenFree),
      escapeCsvField(item.spicyLevel),
      escapeCsvField(item.isAvailable),
      escapeCsvField(item.displayOrder),
      escapeCsvField(item.prepTimeMins ?? ""),
    ];
    rows.push(values.join(","));
  }

  return rows.join("\n");
}

function parseBooleanVal(val?: string, defaultVal = false): boolean {
  if (!val) return defaultVal;
  const normalized = val.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseItemDietary(rawVeg?: string, rawVegan?: string, rawHalal?: string, rawGf?: string) {
  return {
    isVegetarian: parseBooleanVal(rawVeg, false),
    isVegan: parseBooleanVal(rawVegan, false),
    isHalal: parseBooleanVal(rawHalal, false),
    isGlutenFree: parseBooleanVal(rawGf, false),
  };
}

function parsePriceField(rawPrice: string | undefined, rowIndex: number): MenuImportResult<number> {
  const priceLkr = Number(rawPrice);
  if (Number.isNaN(priceLkr) || priceLkr < 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_PRICE",
        message: `Row ${rowIndex}: Invalid price '${rawPrice}'. Must be a non-negative number.`,
        rowNumber: rowIndex,
        field: "priceLkr",
      },
    };
  }
  return { ok: true, value: priceLkr };
}

function mapCsvRowToMenuItem(cols: string[], rowIndex: number): MenuImportResult<ExportMenuItem> {
  const [
    id,
    code,
    categoryId,
    titleEn,
    titleSi = "",
    titleTa = "",
    descriptionEn,
    descriptionSi,
    descriptionTa,
    rawPrice,
    rawVeg,
    rawVegan,
    rawHalal,
    rawGf,
    rawSpicy,
    rawAvail,
    rawOrder,
    rawPrep,
  ] = cols;

  if (!id || !code || !titleEn || !categoryId) {
    return {
      ok: false,
      error: {
        code: "MISSING_REQUIRED_FIELD",
        message: `Row ${rowIndex}: 'id', 'code', 'categoryId', and 'titleEn' are mandatory.`,
        rowNumber: rowIndex,
      },
    };
  }

  const priceResult = parsePriceField(rawPrice, rowIndex);
  if (!priceResult.ok) return priceResult;

  const dietary = parseItemDietary(rawVeg, rawVegan, rawHalal, rawGf);

  const item: ExportMenuItem = {
    id,
    code,
    categoryId,
    titleEn,
    titleSi,
    titleTa,
    descriptionEn: descriptionEn || undefined,
    descriptionSi: descriptionSi || undefined,
    descriptionTa: descriptionTa || undefined,
    priceLkr: priceResult.value,
    ...dietary,
    spicyLevel: Math.max(0, Math.min(3, Number(rawSpicy) || 0)),
    isAvailable: parseBooleanVal(rawAvail, true),
    displayOrder: Number(rawOrder) || rowIndex,
    prepTimeMins: rawPrep ? Number(rawPrep) || undefined : undefined,
  };

  return { ok: true, value: item };
}

export function parseMenuItemsFromCsv(
  csvContent: string,
): MenuImportResult<ReadonlyArray<ExportMenuItem>> {
  if (!csvContent || csvContent.trim().length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY_CSV", message: "CSV content is empty." },
    };
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return {
      ok: false,
      error: { code: "EMPTY_CSV", message: "CSV contains headers but no data rows." },
    };
  }

  const items: ExportMenuItem[] = [];

  for (let idx = 1; idx < lines.length; idx += 1) {
    const line = lines[idx] as string;
    const cols = parseCsvLine(line);
    const parsedRow = mapCsvRowToMenuItem(cols, idx + 1);

    if (!parsedRow.ok) {
      return parsedRow;
    }

    items.push(parsedRow.value);
  }

  return { ok: true, value: items };
}

// ============================================================================
// Multi-Property Catalog Diff Engine (Cognitive Complexity <= 12)
// ============================================================================

export function diffMenuCatalog(
  existingItems: ReadonlyArray<ExportMenuItem>,
  importedItems: ReadonlyArray<ExportMenuItem>,
): MenuImportDiff {
  const existingMap = new Map(existingItems.map((item) => [item.id, item]));
  const added: ExportMenuItem[] = [];
  const updated: Array<{
    readonly incoming: ExportMenuItem;
    readonly existing: ExportMenuItem;
    readonly priceChanged: boolean;
  }> = [];
  let unchangedCount = 0;

  for (const incoming of importedItems) {
    const existing = existingMap.get(incoming.id);

    if (!existing) {
      added.push(incoming);
      continue;
    }

    const priceChanged = existing.priceLkr !== incoming.priceLkr;
    const titleChanged = existing.titleEn !== incoming.titleEn;
    const availChanged = existing.isAvailable !== incoming.isAvailable;

    if (priceChanged || titleChanged || availChanged) {
      updated.push({ incoming, existing, priceChanged });
    } else {
      unchangedCount += 1;
    }
  }

  return {
    addedItems: added,
    updatedItems: updated,
    unchangedCount,
  };
}
