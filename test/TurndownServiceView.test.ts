import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_CHECKLIST_CLEAN,
  DEFAULT_CHECKLIST_COMPLETE,
  DEFAULT_TURNDOWN_ROOMS,
  type TurndownChecklistState,
  type TurndownRoomRecord,
  TurndownServiceView,
  areAllChecklistItemsDone,
  calculateTurndownMetrics,
  countChecklistItems,
  getTurndownText,
  isRoomMatchingSearch,
  isRoomMatchingTab,
  resolveTurndownBadge,
} from "../src/staff/housekeeping/TurndownServiceView.js";

const noop = () => undefined;

describe("Step 313: Turndown Service Evening Checklist Mode (TurndownServiceView.tsx)", () => {
  describe("1. Pure Checklist Counting & Validation Logic", () => {
    it("returns 0 for clean checklist and 6 for complete checklist", () => {
      assert.equal(countChecklistItems(DEFAULT_CHECKLIST_CLEAN), 0);
      assert.equal(countChecklistItems(DEFAULT_CHECKLIST_COMPLETE), 6);
      assert.equal(areAllChecklistItemsDone(DEFAULT_CHECKLIST_CLEAN), false);
      assert.equal(areAllChecklistItemsDone(DEFAULT_CHECKLIST_COMPLETE), true);
    });

    it("correctly counts partially checked items", () => {
      const partial: TurndownChecklistState = {
        ...DEFAULT_CHECKLIST_CLEAN,
        MOSQUITO_NET: true,
        BED_TURNDOWN: true,
        AMBIENT_LIGHTING: true,
      };
      assert.equal(countChecklistItems(partial), 3);
      assert.equal(areAllChecklistItemsDone(partial), false);
    });
  });

  describe("2. Turndown Operations Metrics Resolver", () => {
    it("computes accurate counts and completion percentage for mock rooms", () => {
      const metrics = calculateTurndownMetrics(DEFAULT_TURNDOWN_ROOMS);
      assert.equal(metrics.totalRooms, 5);
      assert.equal(metrics.completedCount, 1);
      assert.equal(metrics.dndSkippedCount, 1);
      assert.equal(metrics.pendingCount, 3);
      // (1 completed + 1 dnd) / 5 = 40.0%
      assert.equal(metrics.completionRatePct, 40);
    });

    it("returns zero metrics when room array is empty", () => {
      const metrics = calculateTurndownMetrics([]);
      assert.equal(metrics.totalRooms, 0);
      assert.equal(metrics.completedCount, 0);
      assert.equal(metrics.dndSkippedCount, 0);
      assert.equal(metrics.pendingCount, 0);
      assert.equal(metrics.completionRatePct, 0);
    });
  });

  describe("3. Status Badges & Filtering Logic", () => {
    it("resolves distinct badge style and emoji for each turndown status", () => {
      const pendingBadge = resolveTurndownBadge("PENDING");
      assert.match(pendingBadge.label, /Pending/i);
      assert.equal(pendingBadge.icon, "🌙");

      const completedBadge = resolveTurndownBadge("COMPLETED");
      assert.match(completedBadge.label, /Turned Down/i);
      assert.equal(completedBadge.icon, "✨");

      const dndBadge = resolveTurndownBadge("DND_SKIPPED");
      assert.match(dndBadge.label, /Do Not Disturb/i);
      assert.equal(dndBadge.icon, "🛑");

      const refusedBadge = resolveTurndownBadge("REFUSED_BY_GUEST");
      assert.match(refusedBadge.label, /Declined/i);
      assert.equal(refusedBadge.icon, "🙅");
    });

    it("filters rooms by active tab selection", () => {
      const testRoom: TurndownRoomRecord = {
        roomId: "room-99",
        roomNumber: "99",
        guestName: "Nimal Perera",
        status: "COMPLETED",
        checklist: DEFAULT_CHECKLIST_COMPLETE,
        attendantName: "Kamal",
      };

      assert.equal(isRoomMatchingTab(testRoom, "ALL"), true);
      assert.equal(isRoomMatchingTab(testRoom, "COMPLETED"), true);
      assert.equal(isRoomMatchingTab(testRoom, "PENDING"), false);
      assert.equal(isRoomMatchingTab(testRoom, "DND_SKIPPED"), false);
    });

    it("matches room searches by room number, guest name, or VIP tier", () => {
      const testRoom: TurndownRoomRecord = {
        roomId: "room-202",
        roomNumber: "Villa-202",
        guestName: "Sunil de Silva",
        vipTier: "VIP Emerald",
        status: "PENDING",
        checklist: DEFAULT_CHECKLIST_CLEAN,
        attendantName: "Kamal",
        specialRequests: "Organic cinnamon tea bag",
      };

      assert.equal(isRoomMatchingSearch(testRoom, ""), true);
      assert.equal(isRoomMatchingSearch(testRoom, "Villa"), true);
      assert.equal(isRoomMatchingSearch(testRoom, "202"), true);
      assert.equal(isRoomMatchingSearch(testRoom, "Sunil"), true);
      assert.equal(isRoomMatchingSearch(testRoom, "Emerald"), true);
      assert.equal(isRoomMatchingSearch(testRoom, "cinnamon"), true);
      assert.equal(isRoomMatchingSearch(testRoom, "NonExistent"), false);
    });
  });

  describe("4. Trilingual Localization Catalog", () => {
    it("returns correct translations for en, si, and ta", () => {
      const en = getTurndownText("en");
      const si = getTurndownText("si");
      const ta = getTurndownText("ta");

      assert.match(en.title, /Evening Turndown/i);
      assert.match(si.title, /සන්ධ්‍යා ඇඳ/);
      assert.match(ta.title, /மாலை படுக்கை/);
    });
  });

  describe("5. React Component Static Markup Rendering", () => {
    it("renders TurndownServiceView with metrics bar, tabs, and room cards", () => {
      const markup = renderToStaticMarkup(
        React.createElement(TurndownServiceView, {
          propertyName: "Sigiriya Heritage Villa & Safari Resort",
          attendantName: "Ruwan Wijesinghe",
          language: "en",
          initialRooms: DEFAULT_TURNDOWN_ROOMS,
          onStatusChange: noop,
        }),
      );

      // Verify header and property branding
      assert.match(markup, /Sigiriya Heritage Villa/);
      assert.match(markup, /Ruwan Wijesinghe/);
      assert.match(markup, /Tropical Resort Dusk Protocol/);

      // Verify metrics
      assert.match(markup, /Allocated Rooms/);
      assert.match(markup, /Turned Down/);
      assert.match(markup, /Completion Rate/);

      // Verify room numbers
      assert.match(markup, /101/);
      assert.match(markup, /Pasan Ramyanath/);
      assert.match(markup, /102/);
      assert.match(markup, /Lady Sarah Jenkins/);

      // Verify touch targets and accessibility
      assert.match(markup, /min-h-\[44px\]/);
      assert.match(markup, /tabular-nums-lkr/);
      assert.match(markup, /apple-liquid-glass/);
    });

    it("renders Sinhala localization correctly in static markup", () => {
      const markup = renderToStaticMarkup(
        React.createElement(TurndownServiceView, {
          propertyName: "Kandy Hillside Villa",
          attendantName: "කමල්",
          language: "si",
          initialRooms: DEFAULT_TURNDOWN_ROOMS,
          onStatusChange: noop,
        }),
      );

      assert.match(markup, /සන්ධ්‍යා ඇඳ පිළියෙළ කිරීමේ පිරික්සුම් ලැයිස්තුව/);
      assert.match(markup, /පැවරූ කාමර/);
      assert.match(markup, /පිළියෙළ කළ/);
    });
  });
});
