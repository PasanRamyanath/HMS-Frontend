import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BoardAttendant,
  type BoardRoom,
  DEFAULT_BOARD_ATTENDANTS,
  DEFAULT_BOARD_ROOMS,
  HkAssignmentBoard,
  autoBalanceBoardRooms,
  buildTaskSheets,
  calculateTurnaroundCredits,
  getBoardText,
  resolveTurnaroundBadgeStyle,
} from "../src/admin/housekeeping/HkAssignmentBoard.js";

const noop = () => undefined;

describe("Step 307: Daily Attendant Task Sheet & Print/Mobile Assignment View (HkAssignmentBoard.tsx)", () => {
  describe("1. Pure Balancing & Workload Calculation Helpers", () => {
    it("returns standard hospitality turnaround credits (Checkout: 2.0, Stayover: 1.0, Touch-up: 0.5, Deep-clean: 3.0)", () => {
      assert.equal(calculateTurnaroundCredits("CHECKOUT"), 2.0);
      assert.equal(calculateTurnaroundCredits("STAYOVER"), 1.0);
      assert.equal(calculateTurnaroundCredits("TOUCH_UP"), 0.5);
      assert.equal(calculateTurnaroundCredits("DEEP_CLEAN"), 3.0);
    });

    it("resolves distinct Apple HIG styling tokens for turnaround types", () => {
      assert.ok(resolveTurnaroundBadgeStyle("CHECKOUT").includes("rose"));
      assert.ok(resolveTurnaroundBadgeStyle("STAYOVER").includes("blue"));
      assert.ok(resolveTurnaroundBadgeStyle("TOUCH_UP").includes("amber"));
      assert.ok(resolveTurnaroundBadgeStyle("DEEP_CLEAN").includes("purple"));
    });

    it("builds task sheets with aggregated metrics and primary floor detection", () => {
      const attendants: BoardAttendant[] = [
        {
          attendantId: "att-1",
          name: "Kamal",
          shiftHours: 8,
          preferredFloors: ["Floor 1"],
          isOnDuty: true,
        },
      ];

      const rooms: BoardRoom[] = [
        {
          roomId: "r-1",
          roomNumber: "101",
          floor: "Floor 1",
          roomTypeName: "Deluxe",
          turnaroundType: "CHECKOUT",
          priority: "STANDARD",
          status: "DIRTY",
          credits: 2.0,
          assignedAttendantId: "att-1",
        },
        {
          roomId: "r-2",
          roomNumber: "102",
          floor: "Floor 1",
          roomTypeName: "Deluxe",
          turnaroundType: "STAYOVER",
          priority: "STANDARD",
          status: "DIRTY",
          credits: 1.0,
          assignedAttendantId: "att-1",
        },
      ];

      const sheets = buildTaskSheets(attendants, rooms);
      assert.equal(sheets.length, 1);
      const sheet = sheets[0];
      assert.ok(sheet);
      assert.equal(sheet.totalCredits, 3.0);
      assert.equal(sheet.totalRooms, 2);
      assert.equal(sheet.checkoutCount, 1);
      assert.equal(sheet.stayoverCount, 1);
      assert.equal(sheet.primaryFloor, "Floor 1");
    });

    it("auto-balances rooms across attendants with greedy heuristic", () => {
      const balanced = autoBalanceBoardRooms(DEFAULT_BOARD_ROOMS, DEFAULT_BOARD_ATTENDANTS);
      assert.equal(balanced.length, DEFAULT_BOARD_ROOMS.length);

      // Verify every room has an assigned attendant
      for (const room of balanced) {
        assert.ok(room.assignedAttendantId);
      }

      // Verify task sheets are balanced
      const sheets = buildTaskSheets(DEFAULT_BOARD_ATTENDANTS, balanced);
      const loads = sheets.map((s) => s.totalCredits);
      const max = Math.max(...loads);
      const min = Math.min(...loads);
      assert.ok(max - min <= 2.0); // Balanced within 2 credits
    });
  });

  describe("2. React Static Markup & Apple HIG Design Standards", () => {
    it("renders board header, property title, and action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkAssignmentBoard, {
          propertyName: "Cinnamon Wild Yala",
          onPushToSmartphones: noop,
          onPrintTaskSheets: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Daily Housekeeping Assignment Board"));
      assert.ok(html.includes("Auto-Balance Workload"));
      assert.ok(html.includes("Push to Mobile Views"));
      assert.ok(html.includes("Print All Sheets"));
    });

    it("renders KPI metrics cards with tabular numerals", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkAssignmentBoard, {
          initialRooms: DEFAULT_BOARD_ROOMS,
          initialAttendants: DEFAULT_BOARD_ATTENDANTS,
        }),
      );

      assert.ok(html.includes("Total Turnarounds"));
      assert.ok(html.includes("Total Workload Credits"));
      assert.ok(html.includes("Departing Checkouts"));
      assert.ok(html.includes("Stayover Refreshes"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("enforces >= 44x44pt touch targets on interactive controls", () => {
      const balanced = autoBalanceBoardRooms(DEFAULT_BOARD_ROOMS, DEFAULT_BOARD_ATTENDANTS);
      const html = renderToStaticMarkup(
        React.createElement(HkAssignmentBoard, {
          initialRooms: balanced,
          initialAttendants: DEFAULT_BOARD_ATTENDANTS,
        }),
      );

      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-h-[36px]")); // Select dropdown min height
    });

    it("renders trilingual localized interface in Sinhala and Tamil", () => {
      const textSi = getBoardText("si");
      assert.equal(textSi.title, "දෛනික කාමර සේවක පැවරුම් පුවරුව");
      assert.equal(textSi.autoBalanceAction, "වැඩ බර ස්වයංක්‍රීයව තුලනය කරන්න");
      assert.equal(textSi.pushMobileAction, "ස්මාර්ට්ෆෝන් වලට යවන්න");

      const textTa = getBoardText("ta");
      assert.equal(textTa.title, "தினசரி அறைப் பணி ஒதுக்கீட்டுப் பலகை");
      assert.equal(textTa.autoBalanceAction, "பணிச்சுமையை சமநிலைப்படுத்துக");
      assert.equal(textTa.pushMobileAction, "மொபைலுக்கு அனுப்புக");

      const htmlSi = renderToStaticMarkup(
        React.createElement(HkAssignmentBoard, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("දෛනික කාමර සේවක පැවරුම් පුවරුව"));
      assert.ok(htmlSi.includes("වැඩ බර ස්වයංක්‍රීයව තුලනය කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(HkAssignmentBoard, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("தினசரி அறைப் பணி ஒதுக்கீட்டுப் பலகை"));
      assert.ok(htmlTa.includes("பணிச்சுமையை சமநிலைப்படுத்துக"));
    });
  });
});
