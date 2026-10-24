/**
 * Unit Tests for Step 283: Visual Restaurant Floor & Table Status Map (PosTableMap.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_RESTAURANT_TABLES,
  type PosTableData,
  PosTableMap,
  type PosTableMapProps,
  type TableMapSummary,
  computeTableMapSummary,
  filterTablesByZone,
} from "../src/staff/pos/index.js";

describe("Step 283: Visual Restaurant Floor & Table Status Map (PosTableMap.tsx)", () => {
  const noop = () => {
    // test no-op
  };

  // --------------------------------------------------------------------------
  // 1. Pure Helper Functions & Summary Aggregations
  // --------------------------------------------------------------------------
  describe("1. Summary Aggregations & Zone Filtering", () => {
    it("aggregates floor plan metrics across 20 resort tables", () => {
      const summary = computeTableMapSummary(DEFAULT_RESTAURANT_TABLES);

      assert.strictEqual(summary.totalTables, 20);
      assert.ok(summary.vacantCount > 0);
      assert.ok(summary.occupiedCount > 0);
      assert.strictEqual(summary.vacantCount + summary.occupiedCount, 20);

      // Active revenue check
      assert.ok(summary.totalActiveRevenueLkr > 0);
      assert.ok(summary.waiterCallCount >= 3);
      assert.ok(summary.billRequestedCount >= 3);
    });

    it("filters tables cleanly by resort zones", () => {
      const all = filterTablesByZone(DEFAULT_RESTAURANT_TABLES, "ALL");
      assert.strictEqual(all.length, 20);

      const terrace = filterTablesByZone(DEFAULT_RESTAURANT_TABLES, "OCEAN_TERRACE");
      assert.strictEqual(terrace.length, 5);
      assert.strictEqual(terrace[0]?.tableNumber, "Table 01");

      const dining = filterTablesByZone(DEFAULT_RESTAURANT_TABLES, "MAIN_DINING");
      assert.strictEqual(dining.length, 5);

      const pool = filterTablesByZone(DEFAULT_RESTAURANT_TABLES, "POOL_CABANA");
      assert.strictEqual(pool.length, 5);

      const garden = filterTablesByZone(DEFAULT_RESTAURANT_TABLES, "GARDEN_VERANDAH");
      assert.strictEqual(garden.length, 5);
    });

    it("handles an empty tables array gracefully", () => {
      const summary = computeTableMapSummary([]);
      assert.strictEqual(summary.totalTables, 0);
      assert.strictEqual(summary.vacantCount, 0);
      assert.strictEqual(summary.occupiedCount, 0);
      assert.strictEqual(summary.totalActiveRevenueLkr, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Rendering & Apple HIG Component Tree
  // --------------------------------------------------------------------------
  describe("2. React Static Rendering & Floor Layout", () => {
    it("renders the master floor plan header and live KPI bar", () => {
      const html = renderToStaticMarkup(
        React.createElement(PosTableMap, {
          tables: DEFAULT_RESTAURANT_TABLES,
          isLiveSyncing: true,
        }),
      );

      assert.ok(html.includes('data-testid="pos-table-map"'));
      assert.ok(html.includes("Restaurant Floor Plan &amp; Table Status"));
      assert.ok(html.includes("REALTIME SYNC"));
      assert.ok(html.includes("Seated"));
      assert.ok(html.includes("Vacant"));
      assert.ok(html.includes("Calls"));
      assert.ok(html.includes("Bills"));
    });

    it("renders zone navigation tabs", () => {
      const html = renderToStaticMarkup(React.createElement(PosTableMap));

      assert.ok(html.includes("All Zones (20)"));
      assert.ok(html.includes("Ocean Terrace (5)"));
      assert.ok(html.includes("Main Dining Room (5)"));
      assert.ok(html.includes("Poolside Cabanas (5)"));
      assert.ok(html.includes("Garden Verandah (5)"));
    });

    it("renders table cards with status tags, bill totals, and order sources", () => {
      const html = renderToStaticMarkup(React.createElement(PosTableMap));

      // Table 01
      assert.ok(html.includes('data-testid="table-card-tbl-01"'));
      assert.ok(html.includes("Table 01"));
      assert.ok(html.includes("Cooking in KDS/BOT"));
      assert.ok(html.includes("Bill Total:"));
      assert.ok(html.includes("QR Self-Order"));
      assert.ok(html.includes("Waiter POS"));

      // Table 02 with alert
      assert.ok(html.includes('data-testid="table-card-tbl-02"'));
      assert.ok(html.includes("WAITER CALL"));
      assert.ok(html.includes("Dismiss Bell"));

      // Table 03 (Vacant)
      assert.ok(html.includes('data-testid="table-card-tbl-03"'));
      assert.ok(html.includes("Vacant"));
    });

    it("renders in Sinhala and Tamil localization", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(PosTableMap, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("ආපනශාලා මේස සැලැස්ම සහ තත්ත්වය"));
      assert.ok(htmlSi.includes("මුහුදු බැල්කනිය (5)"));
      assert.ok(htmlSi.includes("සේවා ඇමතුම"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(PosTableMap, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("உணவக தரைத்தளம் &amp; மேசை நிலை"));
      assert.ok(htmlTa.includes("கடல் பால்கனி (5)"));
      assert.ok(htmlTa.includes("பணியாளர் அழைப்பு"));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Constructible Domain Types & Callback Prop Contracts
  // --------------------------------------------------------------------------
  describe("3. Constructible Types & Interfaces", () => {
    it("validates constructible PosTableData and callback props", () => {
      const customTable: PosTableData = {
        tableId: "custom-tbl-99",
        tableNumber: "VIP Verandah 01",
        zone: "GARDEN_VERANDAH",
        capacity: 10,
        status: "COOKING",
        currentPax: 8,
        serverName: "Chaminda V.",
        activeBillTotalLkr: 45000,
        seatedElapsedMinutes: 50,
        hasWaiterCall: false,
        hasBillRequest: false,
        qrGuestCount: 6,
        orderSources: ["QR_GUEST", "WAITER_POS"],
        activeItemsCount: 12,
      };

      const props: PosTableMapProps = {
        tables: [customTable],
        onSelectTable: noop,
        onOpenPos: noop,
        onDismissWaiterCall: noop,
        onVacateTable: noop,
      };

      const summary: TableMapSummary = computeTableMapSummary(props.tables ?? []);
      assert.strictEqual(summary.totalTables, 1);
      assert.strictEqual(summary.occupiedCount, 1);
      assert.strictEqual(summary.totalActiveRevenueLkr, 45000);
    });
  });
});
