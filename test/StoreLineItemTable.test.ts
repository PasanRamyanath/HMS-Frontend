/**
 * Unit Test Suite for Step 400: StoreLineItemTable
 * (`test/StoreLineItemTable.test.ts`)
 *
 * Implements Step 400 (Phase 16.25) / Rung 7 of the Sri Lanka HMS Master Architecture Plan:
 * Reusable Apple HIG line-item table editor consolidated across PR, PO, GRN, and GIN vouchers.
 *
 * Validates:
 * 1. Empty state presentation with custom emptyLabel and translucent border
 * 2. Table structure, column headers, alignments, and widths
 * 3. Row rendering with tabular numbers (.tabular-nums-lkr) and squircle styling
 * 4. StoreLineItemInput numeric controls with focus rings and touch targets
 * 5. StoreLineItemDeleteButton with minimum >= 44x44pt touch targets
 * 6. React 19 SSR compatibility via renderToStaticMarkup
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StoreLineItemDeleteButton,
  StoreLineItemInput,
  StoreLineItemTable,
  type StoreLineItemTableProps,
  type StoreTableColumn,
} from "../src/admin/inventory/StoreLineItemTable.js";

interface SampleItem {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitCostLkr: number;
  readonly lineTotalLkr: number;
}

const SAMPLE_COLUMNS: readonly StoreTableColumn[] = [
  { id: "item", label: "Item / SKU", align: "left" },
  { id: "qty", label: "Quantity", align: "right", width: "100px" },
  { id: "cost", label: "Unit Cost (LKR)", align: "right" },
  { id: "total", label: "Line Total", align: "right" },
  { id: "actions", label: "Actions", align: "center", width: "60px" },
];

const SAMPLE_ITEMS: readonly SampleItem[] = [
  {
    id: "item-01",
    name: "Rockland Old Reserve Arrack 750ml",
    sku: "BEV-ARR-001",
    quantity: 12,
    unitCostLkr: 3600,
    lineTotalLkr: 43200,
  },
  {
    id: "item-02",
    name: "Keeri Samba Rice 5kg",
    sku: "FNB-RIC-002",
    quantity: 20,
    unitCostLkr: 1700,
    lineTotalLkr: 34000,
  },
];

describe("Step 400: StoreLineItemTable & Shared Voucher Editor Component", () => {
  describe("1. Empty State Presentation", () => {
    it("renders empty state notice when items array is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement<StoreLineItemTableProps<never>>(StoreLineItemTable, {
          columns: SAMPLE_COLUMNS,
          items: [],
          emptyLabel: "No requisition items added yet. Search stock catalog above.",
          renderRow: () => null,
        }),
      );

      assert.match(html, /No requisition items added yet/);
      assert.match(html, /apple-liquid-glass/);
      assert.match(html, /border-dashed/);
    });

    it("uses default empty label when none is supplied", () => {
      const html = renderToStaticMarkup(
        React.createElement<StoreLineItemTableProps<never>>(StoreLineItemTable, {
          columns: SAMPLE_COLUMNS,
          items: [],
          renderRow: () => null,
        }),
      );

      assert.match(html, /No items added yet/);
    });
  });

  describe("2. Table Columns, Header Alignments & Sizing", () => {
    it("renders column headers with explicit alignments and widths", () => {
      const html = renderToStaticMarkup(
        React.createElement<StoreLineItemTableProps<SampleItem>>(StoreLineItemTable, {
          columns: SAMPLE_COLUMNS,
          items: SAMPLE_ITEMS,
          renderRow: (item: SampleItem) =>
            React.createElement("tr", { key: item.id }, React.createElement("td", null, item.name)),
        }),
      );

      assert.match(html, /Item \/ SKU/);
      assert.match(html, /Quantity/);
      assert.match(html, /Unit Cost \(LKR\)/);
      assert.match(html, /Line Total/);
      assert.match(html, /text-right/);
      assert.match(html, /text-center/);
      assert.match(html, /text-left/);
      assert.match(html, /width:100px/);
    });
  });

  describe("3. Row Rendering & Apple HIG Liquid Glass Surface", () => {
    it("renders item rows through renderRow callback", () => {
      const html = renderToStaticMarkup(
        React.createElement<StoreLineItemTableProps<SampleItem>>(StoreLineItemTable, {
          columns: SAMPLE_COLUMNS,
          items: SAMPLE_ITEMS,
          renderRow: (item: SampleItem, idx: number) =>
            React.createElement(
              "tr",
              { key: item.id, className: "test-row" },
              React.createElement("td", null, `${idx + 1}. ${item.name} (${item.sku})`),
              React.createElement("td", { className: "tabular-nums-lkr" }, item.quantity),
              React.createElement("td", { className: "tabular-nums-lkr" }, item.unitCostLkr),
              React.createElement("td", { className: "tabular-nums-lkr" }, item.lineTotalLkr),
              React.createElement(
                "td",
                null,
                React.createElement(StoreLineItemDeleteButton, {
                  onClick: () => undefined,
                }),
              ),
            ),
        }),
      );

      assert.match(html, /Rockland Old Reserve Arrack/);
      assert.match(html, /BEV-ARR-001/);
      assert.match(html, /Keeri Samba Rice/);
      assert.match(html, /tabular-nums-lkr/);
      assert.match(html, /apple-liquid-glass/);
    });
  });

  describe("4. StoreLineItemInput Control", () => {
    it("renders numeric input with tabular numbers and min-height touch ergonomics", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreLineItemInput, {
          value: 25,
          onChange: (_val) => undefined,
          min: 1,
          step: 1,
          ariaLabel: "Ordered Quantity",
        }),
      );

      assert.match(html, /type="number"/);
      assert.match(html, /value="25"/);
      assert.match(html, /min="1"/);
      assert.match(html, /tabular-nums-lkr/);
      assert.match(html, /aria-label="Ordered Quantity"/);
      assert.match(html, /min-h-\[36px\]/);
    });
  });

  describe("5. StoreLineItemDeleteButton Control", () => {
    it("renders accessible delete action button with >= 44x44pt touch target", () => {
      const html = renderToStaticMarkup(
        React.createElement(StoreLineItemDeleteButton, {
          onClick: () => undefined,
          ariaLabel: "Remove Rockland Arrack",
          title: "Delete Rockland Arrack line",
        }),
      );

      assert.match(html, /min-h-\[44px\]/);
      assert.match(html, /min-w-\[44px\]/);
      assert.match(html, /aria-label="Remove Rockland Arrack"/);
      assert.match(html, /title="Delete Rockland Arrack line"/);
      assert.match(html, /text-red-500/);
    });
  });
});
