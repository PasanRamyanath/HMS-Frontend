/**
 * Unit Test Suite for Step 388: SpoilageAndStaffMealModal
 * (`test/SpoilageAndStaffMealModal.test.ts`)
 *
 * Validates:
 * 1. Pure write-off and spoilage calculation helpers:
 *    - calculateLineWriteOffTotalLkr
 *    - calculateSpoilageSummary
 *    - getWriteOffTypeBadgeColor
 * 2. Trilingual localization coverage (en, si, ta)
 * 3. React 19 component static rendering via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_WRITE_OFF_ITEMS,
  SPOILAGE_TRANSLATIONS,
  SpoilageAndStaffMealModal,
  type SpoilageEntryModel,
  calculateLineWriteOffTotalLkr,
  calculateSpoilageSummary,
  getWriteOffTypeBadgeColor,
} from "../src/admin/inventory/SpoilageAndStaffMealModal.js";

const noop = () => {
  // test no-op
};

describe("Step 388: Kitchen Spoilage, Breakage & Staff Meal Logger", () => {
  describe("1. Pure Financial Calculation Helpers", () => {
    it("calculates exact line total with 2-decimal LKR rounding", () => {
      const total = calculateLineWriteOffTotalLkr(3.5, 1200);
      assert.strictEqual(total, 4200);

      const fractional = calculateLineWriteOffTotalLkr(2.25, 450.5);
      assert.strictEqual(fractional, 1013.63);

      const zeroCase = calculateLineWriteOffTotalLkr(0, 1000);
      assert.strictEqual(zeroCase, 0);
    });

    it("aggregates entries into distinct operational expense buckets", () => {
      const sampleEntries: SpoilageEntryModel[] = [
        {
          entryId: "WO-01",
          date: "2026-10-20",
          stockItemId: "item-1",
          sku: "FB-01",
          itemName: "Chicken",
          unitOfMeasure: "kg",
          writeOffType: "STAFF_DUTY_MEAL",
          reasonCode: "STAFF_LUNCH",
          costCenter: "STAFF_WELFARE_FOOD",
          quantity: 10,
          unitCostLkr: 1000,
          totalCostLkr: 10000,
          recordedBy: "Chef",
          approvedBy: "Sous",
          notes: "",
        },
        {
          entryId: "WO-02",
          date: "2026-10-20",
          stockItemId: "item-2",
          sku: "FB-02",
          itemName: "Prawns",
          unitOfMeasure: "kg",
          writeOffType: "KITCHEN_SPOILAGE",
          reasonCode: "COLD_CHAIN_TEMPERATURE_FAILURE",
          costCenter: "KITCHEN_SPOILAGE_EXPENSE",
          quantity: 2,
          unitCostLkr: 3000,
          totalCostLkr: 6000,
          recordedBy: "Chef",
          approvedBy: "Sous",
          notes: "",
        },
        {
          entryId: "WO-03",
          date: "2026-10-20",
          stockItemId: "item-3",
          sku: "BAR-01",
          itemName: "Arrack",
          unitOfMeasure: "btl",
          writeOffType: "BREAKAGE_ACCIDENT",
          reasonCode: "TRANSIT_BREAKAGE",
          costCenter: "BEVERAGE_BREAKAGE_EXPENSE",
          quantity: 1,
          unitCostLkr: 3400,
          totalCostLkr: 3400,
          recordedBy: "Steward",
          approvedBy: "F&B",
          notes: "",
        },
        {
          entryId: "WO-04",
          date: "2026-10-20",
          stockItemId: "item-4",
          sku: "FB-04",
          itemName: "Rice",
          unitOfMeasure: "kg",
          writeOffType: "BUFFET_LEFTOVER",
          reasonCode: "UNCONSUMED_BUFFET_PAN",
          costCenter: "BANQUET_OVERFLOW_COST",
          quantity: 5,
          unitCostLkr: 200,
          totalCostLkr: 1000,
          recordedBy: "Chef",
          approvedBy: "Sous",
          notes: "",
        },
      ];

      const summary = calculateSpoilageSummary(sampleEntries);
      assert.strictEqual(summary.totalEntries, 4);
      assert.strictEqual(summary.totalQuantityKgOrUnits, 18);
      assert.strictEqual(summary.staffMealCostLkr, 10000);
      assert.strictEqual(summary.spoilageCostLkr, 6000);
      assert.strictEqual(summary.breakageCostLkr, 3400);
      assert.strictEqual(summary.buffetLeftoverCostLkr, 1000);
      assert.strictEqual(summary.totalWriteOffCostLkr, 20400);
    });

    it("maps write-off types to semantic status badge colors", () => {
      assert.strictEqual(getWriteOffTypeBadgeColor("STAFF_DUTY_MEAL"), "green");
      assert.strictEqual(getWriteOffTypeBadgeColor("KITCHEN_SPOILAGE"), "red");
      assert.strictEqual(getWriteOffTypeBadgeColor("BREAKAGE_ACCIDENT"), "amber");
      assert.strictEqual(getWriteOffTypeBadgeColor("BUFFET_LEFTOVER"), "blue");
      assert.strictEqual(getWriteOffTypeBadgeColor("VIP_TASTING_DEMO"), "gray");
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      for (const lang of ["en", "si", "ta"] as const) {
        const t = SPOILAGE_TRANSLATIONS[lang];
        assert.ok(t.title.length > 0);
        assert.ok(t.subtitle.length > 0);
        assert.ok(t.tabs.logNewEntry.length > 0);
        assert.ok(t.tabs.dailyLogRegister.length > 0);
        assert.ok(t.tabs.printWasteVoucher.length > 0);
        assert.ok(t.types.STAFF_DUTY_MEAL.length > 0);
        assert.ok(t.types.KITCHEN_SPOILAGE.length > 0);
        assert.ok(t.types.BREAKAGE_ACCIDENT.length > 0);
        assert.ok(t.kpi.totalStaffMeal.length > 0);
        assert.ok(t.kpi.totalSpoilage.length > 0);
        assert.ok(t.kpi.totalBreakage.length > 0);
      }
    });
  });

  describe("3. React 19 Component Static Rendering", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpoilageAndStaffMealModal, {
          isOpen: false,
          onClose: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal structure when isOpen is true with default entries", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpoilageAndStaffMealModal, {
          isOpen: true,
          onClose: noop,
          initialEntries: DEFAULT_WRITE_OFF_ITEMS,
          language: "en",
        }),
      );

      assert.ok(html.includes('data-testid="spoilage-staff-meal-modal"'));
      assert.ok(
        html.includes("Kitchen Spoilage, Breakage &amp; Staff Meal Logger") ||
          html.includes("Kitchen Spoilage, Breakage & Staff Meal Logger"),
      );
      assert.ok(html.includes("Ceylon Fresh Chicken Breast"));
      assert.ok(html.includes("Negombo Lagoon Tiger Prawns"));
      assert.ok(html.includes("Pelwatte Fresh Full Cream Milk"));
      assert.ok(html.includes("Rockland Old Arrack"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpoilageAndStaffMealModal, {
          isOpen: true,
          onClose: noop,
          language: "si",
        }),
      );

      assert.ok(html.includes("මුළුතැන්ගෙයි හානි, කැඩීම්"));
      assert.ok(html.includes("දෛනික ලේඛනය"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(SpoilageAndStaffMealModal, {
          isOpen: true,
          onClose: noop,
          language: "ta",
        }),
      );

      assert.ok(html.includes("சமையலறை சேதம், உடைப்பு"));
      assert.ok(html.includes("தினசரி பதிவு தாள்"));
    });
  });
});
