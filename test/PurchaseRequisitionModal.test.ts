/**
 * Unit Test Suite for Step 378: PurchaseRequisitionModal
 *
 * Validates:
 * 1. Pure calculation & auto-fill logic:
 *    - calculateRequisitionTotals
 *    - autoFillFromLowStock (scans currentStock <= parLevel, calculates recommended safety buffer)
 *    - generatePrNumber
 * 2. Requisition reasons & metadata:
 *    - REQUISITION_REASONS (Routine Par, Banquet Event, High Occupancy, Emergency)
 * 3. Trilingual localization integrity (en, si, ta)
 * 4. React 19 component rendering via renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PR_TRANSLATIONS,
  type PurchaseRequisitionLineItem,
  PurchaseRequisitionModal,
  type PurchaseRequisitionReason,
  REQUISITION_REASONS,
  autoFillFromLowStock,
  calculateRequisitionTotals,
  generatePrNumber,
} from "../src/admin/inventory/PurchaseRequisitionModal.js";
import { DEFAULT_STOCK_ITEMS } from "../src/admin/inventory/StockItemManager.js";

describe("Step 378: PurchaseRequisitionModal & 1-Click Low-Stock Auto-Fill", () => {
  describe("1. Pure Calculation & Auto-Fill Helpers", () => {
    it("auto-fills requisition items from stock at or below par level", () => {
      const lowStockLines = autoFillFromLowStock(DEFAULT_STOCK_ITEMS);

      assert.ok(lowStockLines.length > 0, "Should auto-fill low stock items from defaults");

      for (const line of lowStockLines) {
        assert.ok(
          line.currentStock <= line.parLevel,
          `Item ${line.sku} must have currentStock <= parLevel to be auto-filled`,
        );
        assert.ok(line.quantityRequested > 0, "Requested quantity must be positive");
        assert.equal(
          line.estimatedLineTotalLkr,
          Math.round((line.quantityRequested * line.estimatedUnitCostLkr + Number.EPSILON) * 100) /
            100,
        );
      }
    });

    it("filters auto-fill by department correctly", () => {
      const kitchenLines = autoFillFromLowStock(DEFAULT_STOCK_ITEMS, "KITCHEN");
      assert.ok(kitchenLines.length >= 1);

      // Verify all items belong to kitchen stock
      for (const line of kitchenLines) {
        const original = DEFAULT_STOCK_ITEMS.find((i) => i.id === line.stockItemId);
        assert.equal(original?.department, "KITCHEN");
      }
    });

    it("flags depleted items (currentStock = 0) with URGENT remarks", () => {
      const autoFilled = autoFillFromLowStock(DEFAULT_STOCK_ITEMS);
      const depleted = autoFilled.find((l) => l.currentStock === 0);

      assert.ok(depleted, "Defaults should contain at least 1 depleted item");
      assert.match(depleted?.remarks ?? "", /URGENT/i);
    });

    it("calculates requisition sum totals accurately", () => {
      const sampleLines: PurchaseRequisitionLineItem[] = [
        {
          stockItemId: "s1",
          sku: "DRY-001",
          name: "Item 1",
          category: "DRY_STORE",
          unitOfMeasure: "kg",
          currentStock: 5,
          parLevel: 20,
          quantityRequested: 30,
          estimatedUnitCostLkr: 200,
          estimatedLineTotalLkr: 6000,
        },
        {
          stockItemId: "s2",
          sku: "COLD-002",
          name: "Item 2",
          category: "COLD_ROOM_SEAFOOD",
          unitOfMeasure: "kg",
          currentStock: 0,
          parLevel: 10,
          quantityRequested: 15,
          estimatedUnitCostLkr: 1500,
          estimatedLineTotalLkr: 22500,
        },
      ];

      const totals = calculateRequisitionTotals(sampleLines);
      assert.equal(totals.itemCount, 2);
      assert.equal(totals.totalQuantity, 45);
      assert.equal(totals.totalEstimatedCostLkr, 28500);
    });

    it("generates sequential PR reference numbers", () => {
      assert.equal(generatePrNumber(42, 2026), "PR-2026-0042");
      assert.equal(generatePrNumber(1, 2026), "PR-2026-0001");
      assert.equal(generatePrNumber(9999, 2026), "PR-2026-9999");
    });
  });

  describe("2. Presets & Domain Enums", () => {
    it("defines the 4 operational requisition reasons", () => {
      const expectedReasons: PurchaseRequisitionReason[] = [
        "ROUTINE_PAR_RESTOCK",
        "BANQUET_EVENT_FORECAST",
        "HIGH_OCCUPANCY_SURGE",
        "EMERGENCY_REPAIR",
      ];

      for (const r of expectedReasons) {
        assert.ok(
          REQUISITION_REASONS.some((reason) => reason.id === r),
          `Reason ${r} must be defined in REQUISITION_REASONS`,
        );
      }
    });
  });

  describe("3. Trilingual Localization Integrity", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      const keys = [
        "title",
        "subtitle",
        "autoFillLowStock",
        "clearLines",
        "department",
        "reason",
        "requiredBy",
        "addItem",
        "lineTableSku",
        "lineTableItem",
        "lineTableOnHand",
        "lineTableQty",
        "lineTableUnitCost",
        "lineTableTotal",
        "summaryEstTotal",
        "submitPr",
        "cancel",
        "noLinesNotice",
      ] as const;

      for (const lang of languages) {
        const dict = PR_TRANSLATIONS[lang];
        assert.ok(dict, `Missing translations for ${lang}`);
        for (const key of keys) {
          assert.ok(dict[key] && dict[key].length > 0, `Missing key ${key} in ${lang}`);
        }
      }
    });
  });

  describe("4. React 19 Component Rendering", () => {
    it("renders modal when open with auto-filled lines and estimated totals", () => {
      const html = renderToStaticMarkup(
        React.createElement(PurchaseRequisitionModal, {
          isOpen: true,
          onClose: () => undefined,
          availableStockItems: DEFAULT_STOCK_ITEMS,
          initialDepartment: "KITCHEN",
        }),
      );

      assert.ok(html.includes("New Purchase Requisition (PR)"));
      assert.ok(html.includes("Auto-Fill Low Stock"));
      assert.ok(html.includes("Total Estimated Cost"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("Submit Requisition"));
    });

    it("does not render modal contents when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(PurchaseRequisitionModal, {
          isOpen: false,
          onClose: () => undefined,
          availableStockItems: DEFAULT_STOCK_ITEMS,
        }),
      );

      assert.ok(!html.includes("New Purchase Requisition (PR)"));
    });
  });
});
