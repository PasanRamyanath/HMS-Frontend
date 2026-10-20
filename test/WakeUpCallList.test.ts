/**
 * Unit Tests for Step 367: Wake-Up Call & Early Safari Reminder Scheduler (WakeUpCallList.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_WAKE_UP_CALLS,
  WakeUpCallList,
  type WakeUpCallRecord,
  advanceWakeUpStatus,
  calculateAutoWakeUpTime,
  computeWakeUpSummary,
  filterWakeUpCalls,
  getWakeUpStatusBadge,
  snoozeWakeUpCall,
  toggleBreakfastBoxCollection,
} from "../src/admin/activities/index.js";

describe("Step 367: Wake-Up Call & Early Safari Reminder Scheduler (WakeUpCallList.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Domain & Filter Helpers", () => {
    it("calculateAutoWakeUpTime calculates exact wake-up time 45 min before departure", () => {
      assert.strictEqual(calculateAutoWakeUpTime("05:00", 45), "04:15");
      assert.strictEqual(calculateAutoWakeUpTime("06:30", 60), "05:30");
      assert.strictEqual(calculateAutoWakeUpTime("07:15", 45), "06:30");
      // Midnight boundary wrap-around
      assert.strictEqual(calculateAutoWakeUpTime("00:15", 30), "23:45");
    });

    it("computeWakeUpSummary calculates metrics across all call states", () => {
      const summary = computeWakeUpSummary(DEFAULT_WAKE_UP_CALLS);
      assert.strictEqual(summary.total, 5);
      assert.strictEqual(summary.pending, 3);
      assert.strictEqual(summary.knockRequired, 1);
      assert.strictEqual(summary.answered, 1);
      assert.strictEqual(summary.breakfastBoxesCount, 6); // 2 + 1 + 2 + 1
      assert.strictEqual(summary.breakfastBoxesHandedOver, 2); // Room 304 (2 boxes)
    });

    it("filterWakeUpCalls filters by status accurately", () => {
      const knockOnly = filterWakeUpCalls(
        DEFAULT_WAKE_UP_CALLS,
        "NO_ANSWER_KNOCK_REQUIRED",
        "ALL",
        "",
      );
      assert.strictEqual(knockOnly.length, 1);
      assert.ok(knockOnly[0]);
      assert.strictEqual(knockOnly[0].roomNumber, "108");

      const answeredOnly = filterWakeUpCalls(DEFAULT_WAKE_UP_CALLS, "ANSWERED", "ALL", "");
      assert.strictEqual(answeredOnly.length, 1);
      assert.ok(answeredOnly[0]);
      assert.strictEqual(answeredOnly[0].roomNumber, "304");
    });

    it("filterWakeUpCalls filters by early safari and morning time slots", () => {
      const earlySafari = filterWakeUpCalls(
        DEFAULT_WAKE_UP_CALLS,
        "ALL",
        "EARLY_SAFARI", // 04:00 - 06:00
        "",
      );
      assert.strictEqual(earlySafari.length, 3); // 04:15, 04:30, 05:00
      for (const call of earlySafari) {
        assert.ok(call.wakeUpTime >= "04:00" && call.wakeUpTime < "06:00");
      }

      const morning = filterWakeUpCalls(
        DEFAULT_WAKE_UP_CALLS,
        "ALL",
        "MORNING", // 06:00 - 08:00
        "",
      );
      assert.strictEqual(morning.length, 2); // 06:15, 07:00
    });

    it("filterWakeUpCalls filters by search query matching room, guest, or tour reason", () => {
      const byRoom = filterWakeUpCalls(DEFAULT_WAKE_UP_CALLS, "ALL", "ALL", "402");
      assert.strictEqual(byRoom.length, 1);
      assert.ok(byRoom[0]);
      assert.strictEqual(byRoom[0].guestName, "Ananya Sharma");

      const bySafari = filterWakeUpCalls(DEFAULT_WAKE_UP_CALLS, "ALL", "ALL", "Yala");
      assert.strictEqual(bySafari.length, 1);
      assert.ok(bySafari[0]);
      assert.ok(bySafari[0].reason.includes("Yala"));
    });

    it("filterWakeUpCalls sorts urgent knock required calls first before pending calls", () => {
      const sorted = filterWakeUpCalls(DEFAULT_WAKE_UP_CALLS, "ALL", "ALL", "");
      assert.ok(sorted[0]);
      assert.strictEqual(sorted[0].status, "NO_ANSWER_KNOCK_REQUIRED");
      assert.strictEqual(sorted[0].roomNumber, "108");

      assert.ok(sorted[1]);
      assert.strictEqual(sorted[1].status, "PENDING");
      assert.strictEqual(sorted[1].wakeUpTime, "04:15");
    });

    it("advanceWakeUpStatus updates status and records timestamp and operator ID", () => {
      const call = DEFAULT_WAKE_UP_CALLS[0];
      assert.ok(call);

      const answered = advanceWakeUpStatus(
        call,
        "ANSWERED",
        "STF-NIGHTMGR-01",
        "2026-10-20T04:15:30.000Z",
      );
      assert.strictEqual(answered.status, "ANSWERED");
      assert.strictEqual(answered.operatorStaffId, "STF-NIGHTMGR-01");
      assert.strictEqual(answered.calledAtIso, "2026-10-20T04:15:30.000Z");

      const knockReq = advanceWakeUpStatus(call, "NO_ANSWER_KNOCK_REQUIRED");
      assert.strictEqual(knockReq.status, "NO_ANSWER_KNOCK_REQUIRED");
    });

    it("toggleBreakfastBoxCollection toggles breakfastBoxCollected flag", () => {
      const call = DEFAULT_WAKE_UP_CALLS[0];
      assert.ok(call);
      assert.strictEqual(call.breakfastBoxCollected, false);

      const toggled = toggleBreakfastBoxCollection(call);
      assert.strictEqual(toggled.breakfastBoxCollected, true);

      const untoggled = toggleBreakfastBoxCollection(toggled);
      assert.strictEqual(untoggled.breakfastBoxCollected, false);
    });

    it("snoozeWakeUpCall advances wakeUpTime by 5 minutes and logs snooze note", () => {
      const call: WakeUpCallRecord = {
        id: "TEST-01",
        tenantId: "t1",
        roomNumber: "201",
        guestName: "Guest",
        wakeUpTime: "05:10",
        reason: "Safari",
        requiresBreakfastBox: false,
        status: "PENDING",
      };

      const snoozed = snoozeWakeUpCall(call, 5);
      assert.strictEqual(snoozed.wakeUpTime, "05:15");
      assert.strictEqual(snoozed.status, "PENDING");
      assert.ok(snoozed.notes?.includes("Snoozed 5m"));
    });

    it("getWakeUpStatusBadge returns correct badges for all statuses", () => {
      const knock = getWakeUpStatusBadge("NO_ANSWER_KNOCK_REQUIRED");
      assert.strictEqual(knock.label, "No Answer — Knock Required");
      assert.ok(knock.badgeClass.includes("red"));

      const answered = getWakeUpStatusBadge("ANSWERED");
      assert.strictEqual(answered.label, "Answered & Awake");
      assert.ok(answered.badgeClass.includes("emerald"));

      const pending = getWakeUpStatusBadge("PENDING");
      assert.strictEqual(pending.label, "Call Pending");
      assert.ok(pending.badgeClass.includes("amber"));

      const cancelled = getWakeUpStatusBadge("CANCELLED");
      assert.strictEqual(cancelled.label, "Cancelled");
    });
  });

  // --------------------------------------------------------------------------
  // 2. React UI Rendering & Apple HIG Compliance
  // --------------------------------------------------------------------------
  describe("2. React UI Static Markup Rendering", () => {
    it("renders early dispatch header and metric summary cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(WakeUpCallList, {
          initialCalls: DEFAULT_WAKE_UP_CALLS,
          language: "en",
        }),
      );

      assert.ok(html.includes("Front Desk Early Dispatch"));
      assert.ok(
        html.includes("Morning Wake-Up Call &amp; Safari Scheduler") ||
          html.includes("Morning Wake-Up Call & Safari Scheduler"),
      );
      assert.ok(html.includes("Pending Calls"));
      assert.ok(html.includes("Door Knocks Needed"));
      assert.ok(html.includes("Completed &amp; Awake") || html.includes("Completed & Awake"));
      assert.ok(html.includes("Breakfast Boxes Handed"));
    });

    it("renders call cards with room numbers, guest names, and action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(WakeUpCallList, {
          initialCalls: DEFAULT_WAKE_UP_CALLS,
          language: "en",
        }),
      );

      assert.ok(html.includes("Room 402"));
      assert.ok(html.includes("Ananya Sharma"));
      assert.ok(html.includes("Yala National Park Morning Safari"));
      assert.ok(html.includes("Room 108"));
      assert.ok(html.includes("Dr. Marcus Vance"));
      assert.ok(html.includes("No Answer — Knock Required"));
      assert.ok(html.includes("Mark Answered"));
      assert.ok(html.includes("Snooze 5m"));
      assert.ok(html.includes("Packed Breakfast Box"));
    });

    it("renders trilingual support for Sinhala and Tamil", () => {
      const siHtml = renderToStaticMarkup(
        React.createElement(WakeUpCallList, {
          initialCalls: DEFAULT_WAKE_UP_CALLS,
          language: "si",
        }),
      );
      assert.ok(siHtml.includes("උදෑසන අවදි කිරීම් සහ සෆාරි මතක්කිරීම්"));

      const taHtml = renderToStaticMarkup(
        React.createElement(WakeUpCallList, {
          initialCalls: DEFAULT_WAKE_UP_CALLS,
          language: "ta",
        }),
      );
      assert.ok(taHtml.includes("காலை விழிப்பு அழைப்புகள் மற்றும் சவாரி நினைவூட்டல்"));
    });
  });
});
