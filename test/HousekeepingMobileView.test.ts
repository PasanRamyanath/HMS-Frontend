/**
 * Unit Tests for Step 301: Housekeeping Smartphone Room Status Grid (HousekeepingMobileView.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HOUSEKEEPING_ROOMS,
  HousekeepingMobileView,
  computeSummaryCounts,
  extractDistinctFloors,
  filterAndSortRooms,
  getStatusStyle,
} from "../src/staff/housekeeping/index.js";

describe("Step 301: Housekeeping Smartphone Room Status Grid (HousekeepingMobileView.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Domain & Filter Helpers", () => {
    it("computeSummaryCounts calculates metrics across all room states", () => {
      const summary = computeSummaryCounts(DEFAULT_HOUSEKEEPING_ROOMS);
      assert.strictEqual(summary.totalRooms, 7);
      assert.strictEqual(summary.dirtyCount, 2);
      assert.strictEqual(summary.arrivalTodayDirtyCount, 2);
      assert.strictEqual(summary.cleanCount, 1);
      assert.strictEqual(summary.inspectedCount, 1);
      assert.strictEqual(summary.dndCount, 1);
      assert.strictEqual(summary.oooCount, 1);
    });

    it("extractDistinctFloors extracts sorted unique floor names", () => {
      const floors = extractDistinctFloors(DEFAULT_HOUSEKEEPING_ROOMS);
      assert.ok(floors.includes("Ground Floor"));
      assert.ok(floors.includes("First Floor"));
      assert.ok(floors.includes("Top Floor"));
      assert.strictEqual(floors.length, 3);
    });

    it("filterAndSortRooms prioritizes Arrival Today Dirty rooms at top", () => {
      const sorted = filterAndSortRooms(DEFAULT_HOUSEKEEPING_ROOMS, "ALL", "ALL", "");
      // First two rooms must be arrival today dirty (101 and 102)
      assert.strictEqual(sorted[0]?.priority, "ARRIVAL_TODAY_DIRTY");
      assert.strictEqual(sorted[0]?.status, "DIRTY");
      assert.strictEqual(sorted[1]?.priority, "ARRIVAL_TODAY_DIRTY");
      assert.strictEqual(sorted[1]?.status, "DIRTY");
    });

    it("filterAndSortRooms filters by floor accurately", () => {
      const groundFloorRooms = filterAndSortRooms(
        DEFAULT_HOUSEKEEPING_ROOMS,
        "Ground Floor",
        "ALL",
        "",
      );
      assert.strictEqual(groundFloorRooms.length, 3);
      for (const r of groundFloorRooms) {
        assert.strictEqual(r.floor, "Ground Floor");
      }
    });

    it("filterAndSortRooms filters by status tab", () => {
      const cleanRooms = filterAndSortRooms(DEFAULT_HOUSEKEEPING_ROOMS, "ALL", "CLEAN", "");
      assert.strictEqual(cleanRooms.length, 1);
      assert.strictEqual(cleanRooms[0]?.roomNumber, "104");

      const blockedRooms = filterAndSortRooms(DEFAULT_HOUSEKEEPING_ROOMS, "ALL", "BLOCKED", "");
      assert.strictEqual(blockedRooms.length, 2); // 202 (DND), 301 (OUT_OF_ORDER)
    });

    it("filterAndSortRooms searches by room number, guest name, or room type", () => {
      const byNumber = filterAndSortRooms(DEFAULT_HOUSEKEEPING_ROOMS, "ALL", "ALL", "204");
      assert.strictEqual(byNumber.length, 1);
      assert.strictEqual(byNumber[0]?.roomNumber, "204");

      const byGuest = filterAndSortRooms(DEFAULT_HOUSEKEEPING_ROOMS, "ALL", "ALL", "Schmidt");
      assert.strictEqual(byGuest.length, 1);
      assert.strictEqual(byGuest[0]?.roomNumber, "102");

      const byType = filterAndSortRooms(
        DEFAULT_HOUSEKEEPING_ROOMS,
        "ALL",
        "ALL",
        "Ocean View Suite",
      );
      assert.strictEqual(byType.length, 2);
    });

    it("getStatusStyle maps statuses to Apple HIG theme tokens", () => {
      const clean = getStatusStyle("CLEAN");
      assert.ok(clean.badgeBg.includes("emerald"));
      assert.strictEqual(clean.icon, "✓");

      const inspected = getStatusStyle("INSPECTED");
      assert.ok(inspected.badgeBg.includes("sky"));
      assert.strictEqual(inspected.icon, "★");

      const dirty = getStatusStyle("DIRTY");
      assert.ok(dirty.badgeBg.includes("rose"));
      assert.strictEqual(dirty.icon, "🧹");

      const dnd = getStatusStyle("DO_NOT_DISTURB");
      assert.ok(dnd.badgeBg.includes("purple"));

      const ooo = getStatusStyle("OUT_OF_ORDER");
      assert.ok(ooo.badgeBg.includes("slate"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Static Markup & HIG Accessibility
  // --------------------------------------------------------------------------
  describe("2. React Static Markup & Apple HIG Touch Ergonomics", () => {
    it("renders HousekeepingMobileView with header, metrics, and room cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(HousekeepingMobileView, {
          tenantId: "cinnamon-wild-yala",
          staffName: "Chaminda Rajapaksha",
          language: "en",
        }),
      );

      assert.ok(html.includes('data-testid="housekeeping-mobile-view"'));
      assert.ok(html.includes("Housekeeping Room Runner"));
      assert.ok(html.includes("Chaminda Rajapaksha"));
      assert.ok(html.includes("cinnamon-wild-yala"));

      // Metric counters
      assert.ok(html.includes('data-testid="hk-room-card-101"'));
      assert.ok(html.includes('data-testid="arrival-today-alert-banner"'));
      assert.ok(html.includes("ARRIVAL TODAY • HIGH PRIORITY"));
    });

    it("renders 1-tap action buttons with minimum 44x44pt touch targets", () => {
      const html = renderToStaticMarkup(
        React.createElement(HousekeepingMobileView, {
          initialRooms: [
            {
              id: "rm-test-1",
              tenantId: "t-1",
              roomNumber: "501",
              roomTypeName: "Deluxe Villa",
              floor: "Floor 5",
              buildingWing: "East Wing",
              status: "DIRTY",
              priority: "STANDARD",
              isOccupied: false,
              updatedAtIso: "2026-10-20T10:00:00Z",
            },
            {
              id: "rm-test-2",
              tenantId: "t-1",
              roomNumber: "502",
              roomTypeName: "Deluxe Villa",
              floor: "Floor 5",
              buildingWing: "East Wing",
              status: "CLEAN",
              priority: "STANDARD",
              isOccupied: false,
              updatedAtIso: "2026-10-20T10:00:00Z",
            },
          ],
        }),
      );

      // Dirty room has Mark Clean button
      assert.ok(html.includes('data-testid="action-mark-clean-501"'));
      assert.ok(html.includes("Mark Clean"));
      assert.ok(html.includes("min-h-[44px]"));

      // Clean room has Mark Inspected button
      assert.ok(html.includes('data-testid="action-mark-inspected-502"'));
      assert.ok(html.includes("Mark Inspected"));
    });

    it("renders trilingual interface labels in Sinhala and Tamil", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(HousekeepingMobileView, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("කාමර පිරිසිදු කිරීම් පද්ධතිය"));
      assert.ok(htmlSi.includes("අද පැමිණේ • අධි ප්‍රමුඛතාව"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(HousekeepingMobileView, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("அறை பராமரிப்பு அமைப்பு"));
      assert.ok(htmlTa.includes("இன்று வருகை • உயர் முன்னுரிமை"));
    });
  });
});
