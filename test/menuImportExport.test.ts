import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type ExportMenuCategory,
  type ExportMenuItem,
  MENU_CSV_HEADERS,
  type MenuExportBundle,
  type MenuImportDiff,
  type MenuImportError,
  type MenuImportResult,
  diffMenuCatalog,
  escapeCsvField,
  exportMenuItemsToCsv,
  exportMenuToJson,
  parseCsvLine,
  parseMenuFromJson,
  parseMenuItemsFromCsv,
  validateMenuBundle,
} from "../src/admin/menus/menuImportExport.js";

describe("Step 245: CSV / JSON Menu Import & Export Utility (menuImportExport.ts)", () => {
  const sampleCategories: ReadonlyArray<ExportMenuCategory> = [
    {
      id: "cat-1",
      nameEn: "Rice & Curries",
      nameSi: "බත් සහ ව්‍යංජන",
      nameTa: "அரிசி மற்றும் கறி",
      displayOrder: 1,
      isActive: true,
      iconKey: "rice-bowl",
    },
  ];

  const sampleItems: ReadonlyArray<ExportMenuItem> = [
    {
      id: "item-1",
      code: "CUR-101",
      categoryId: "cat-1",
      titleEn: "Chicken Rice & Curry",
      titleSi: "කුකුළු මස් බත්",
      titleTa: "கோழி சாதம்",
      descriptionEn: "Steamed Samba rice with chicken, dhal, and sambol",
      descriptionSi: "සුවඳැති බත්",
      descriptionTa: "சுவையான சாதம்",
      priceLkr: 2250,
      isVegetarian: false,
      isVegan: false,
      isHalal: true,
      isGlutenFree: true,
      spicyLevel: 2,
      isAvailable: true,
      displayOrder: 1,
      prepTimeMins: 20,
    },
    {
      id: "item-2",
      code: "DES-201",
      categoryId: "cat-1",
      titleEn: 'Kithul "Special" Watalappan',
      titleSi: "වටලප්පන්",
      titleTa: "வட்டலாப்பம்",
      descriptionEn: "Traditional custard with kithul treacle, cashews, and spices",
      priceLkr: 850,
      isVegetarian: true,
      isVegan: false,
      isHalal: true,
      isGlutenFree: true,
      spicyLevel: 0,
      isAvailable: true,
      displayOrder: 2,
    },
  ];

  const sampleBundle: MenuExportBundle = {
    schemaVersion: "1.0.0",
    exportedAt: "2026-10-19T12:00:00.000Z",
    propertyMetadata: {
      tenantId: "tenant-amangalla",
      propertyName: "Amangalla Resort & Spa",
    },
    categories: sampleCategories,
    items: sampleItems,
  };

  describe("1. CSV Utilities & Escaping (escapeCsvField & parseCsvLine)", () => {
    it("escapes fields with commas, quotes, and newlines properly", () => {
      assert.strictEqual(escapeCsvField("Simple"), "Simple");
      assert.strictEqual(escapeCsvField('Special "Treacle"'), '"Special ""Treacle"""');
      assert.strictEqual(escapeCsvField("Rice, Curry and Dhal"), '"Rice, Curry and Dhal"');
      assert.strictEqual(escapeCsvField("Line 1\nLine 2"), '"Line 1\nLine 2"');
      assert.strictEqual(escapeCsvField(null), "");
      assert.strictEqual(escapeCsvField(undefined), "");
      assert.strictEqual(escapeCsvField(1500), "1500");
    });

    it("parses CSV line with quoted fields containing commas correctly", () => {
      const line = 'item-1,CUR-101,"Rice, Curry and Dhal",2250';
      const cols = parseCsvLine(line);
      assert.deepStrictEqual(cols, ["item-1", "CUR-101", "Rice, Curry and Dhal", "2250"]);
    });

    it("parses CSV line with escaped double quotes correctly", () => {
      const line = 'item-2,DES-201,"Kithul ""Special"" Watalappan",850';
      const cols = parseCsvLine(line);
      assert.deepStrictEqual(cols, ["item-2", "DES-201", 'Kithul "Special" Watalappan', "850"]);
    });
  });

  describe("2. JSON Menu Export & Import (exportMenuToJson & parseMenuFromJson)", () => {
    it("exports bundle to valid JSON string and round-trips cleanly", () => {
      const json = exportMenuToJson(sampleBundle);
      assert.ok(json.includes('"schemaVersion": "1.0.0"'));
      assert.ok(json.includes('"tenant-amangalla"'));

      const result = parseMenuFromJson(json);
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.schemaVersion, "1.0.0");
        assert.strictEqual(result.value.categories.length, 1);
        assert.strictEqual(result.value.items.length, 2);
        assert.strictEqual(result.value.items[0]?.code, "CUR-101");
      }
    });

    it("rejects invalid JSON syntax with INVALID_JSON error code", () => {
      const result = parseMenuFromJson("this is not valid json");
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_JSON");
      }
    });

    it("rejects unsupported schema version with INVALID_SCHEMA error code", () => {
      const invalidJson = JSON.stringify({
        schemaVersion: "2.0.0",
        categories: [],
        items: [],
      });
      const result = parseMenuFromJson(invalidJson);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_SCHEMA");
        assert.ok(result.error.message.includes("Unsupported schema version"));
      }
    });

    it("validates that categories and items are arrays", () => {
      const result = validateMenuBundle({
        schemaVersion: "1.0.0",
        categories: "not-an-array",
        items: [],
      });
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_SCHEMA");
      }
    });
  });

  describe("3. CSV Menu Export & Import (exportMenuItemsToCsv & parseMenuItemsFromCsv)", () => {
    it("exports menu items to CSV with headers and round-trips correctly", () => {
      const csv = exportMenuItemsToCsv(sampleItems);
      assert.ok(csv.startsWith(MENU_CSV_HEADERS.join(",")));
      assert.ok(csv.includes("CUR-101"));
      assert.ok(csv.includes("Chicken Rice & Curry"));

      const result = parseMenuItemsFromCsv(csv);
      assert.strictEqual(result.ok, true);
      if (result.ok) {
        assert.strictEqual(result.value.length, 2);
        assert.strictEqual(result.value[0]?.id, "item-1");
        assert.strictEqual(result.value[0]?.priceLkr, 2250);
        assert.strictEqual(result.value[0]?.isHalal, true);
        assert.strictEqual(result.value[1]?.titleEn, 'Kithul "Special" Watalappan');
      }
    });

    it("rejects empty CSV content with EMPTY_CSV error code", () => {
      const result = parseMenuItemsFromCsv("");
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "EMPTY_CSV");
      }
    });

    it("rejects CSV with header only and no data rows", () => {
      const result = parseMenuItemsFromCsv(MENU_CSV_HEADERS.join(","));
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "EMPTY_CSV");
      }
    });

    it("rejects rows with missing required fields with MISSING_REQUIRED_FIELD", () => {
      // Row missing titleEn and categoryId
      const csv = `${MENU_CSV_HEADERS.join(",")}\nitem-3,CUR-999,,,,,,,,,,,,,,`;
      const result = parseMenuItemsFromCsv(csv);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "MISSING_REQUIRED_FIELD");
        assert.strictEqual(result.error.rowNumber, 2);
      }
    });

    it("rejects rows with invalid price values with INVALID_PRICE", () => {
      const csv = `${MENU_CSV_HEADERS.join(",")}\nitem-4,CUR-888,cat-1,Valid Title,,,,,invalid_price,false,false,false,false,0,true,1,`;
      const result = parseMenuItemsFromCsv(csv);
      assert.strictEqual(result.ok, false);
      if (!result.ok) {
        assert.strictEqual(result.error.code, "INVALID_PRICE");
        assert.strictEqual(result.error.field, "priceLkr");
      }
    });
  });

  describe("4. Multi-Property Menu Diff Engine (diffMenuCatalog)", () => {
    it("identifies added, updated, and unchanged items across properties", () => {
      const existing: ReadonlyArray<ExportMenuItem> = [
        sampleItems[0] as ExportMenuItem, // CUR-101: 2250 LKR
        sampleItems[1] as ExportMenuItem, // DES-201: 850 LKR
      ];

      const incoming: ReadonlyArray<ExportMenuItem> = [
        {
          ...(sampleItems[0] as ExportMenuItem),
          priceLkr: 2450, // Price updated
        },
        sampleItems[1] as ExportMenuItem, // Unchanged
        {
          id: "item-new-3",
          code: "CUR-303",
          categoryId: "cat-1",
          titleEn: "Jaffna Crab Curry",
          titleSi: "යාපනයේ කකුළුවා",
          titleTa: "யாழ்ப்பாண நண்டு",
          priceLkr: 4200,
          isVegetarian: false,
          isVegan: false,
          isHalal: true,
          isGlutenFree: true,
          spicyLevel: 3,
          isAvailable: true,
          displayOrder: 3,
        },
      ];

      const diff = diffMenuCatalog(existing, incoming);
      assert.strictEqual(diff.addedItems.length, 1);
      assert.strictEqual(diff.addedItems[0]?.code, "CUR-303");
      assert.strictEqual(diff.updatedItems.length, 1);
      assert.strictEqual(diff.updatedItems[0]?.priceChanged, true);
      assert.strictEqual(diff.updatedItems[0]?.incoming.priceLkr, 2450);
      assert.strictEqual(diff.unchangedCount, 1);
    });
  });

  describe("5. Type Definitions & Verification", () => {
    it("verifies all exported interfaces and types are constructible", () => {
      const cat: ExportMenuCategory = sampleCategories[0] as ExportMenuCategory;
      const item: ExportMenuItem = sampleItems[0] as ExportMenuItem;
      const bundle: MenuExportBundle = sampleBundle;
      const err: MenuImportError = { code: "MALFORMED_CSV", message: "Error" };
      const res: MenuImportResult<number> = { ok: true, value: 42 };
      const diff: MenuImportDiff = {
        addedItems: [],
        updatedItems: [],
        unchangedCount: 0,
      };

      assert.ok(cat && item && bundle && err && res && diff);
    });
  });
});
