/**
 * Unit Tests for Step 366: Smartphone Therapist & Chauffeur Daily Schedule View (StaffActivitySchedule.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ACTIVITY_SCHEDULE,
  type StaffActivityItem,
  StaffActivitySchedule,
  advanceActivityStatus,
  computeScheduleCounts,
  extractDistinctStaff,
  filterAndSortSchedule,
  getActivityStatusBadge,
} from "../src/staff/activities/index.js";

describe("Step 366: Smartphone Therapist & Chauffeur Daily Schedule View (StaffActivitySchedule.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Domain Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Domain & Filter Helpers", () => {
    it("computeScheduleCounts calculates metrics across all activity states", () => {
      const summary = computeScheduleCounts(DEFAULT_ACTIVITY_SCHEDULE);
      assert.strictEqual(summary.total, 5);
      assert.strictEqual(summary.scheduled, 3);
      assert.strictEqual(summary.inProgress, 1);
      assert.strictEqual(summary.completed, 1);
      assert.strictEqual(summary.spaCount, 3);
      assert.strictEqual(summary.excursionCount, 2);
    });

    it("extractDistinctStaff extracts unique sorted staff members", () => {
      const staffList = extractDistinctStaff(DEFAULT_ACTIVITY_SCHEDULE);
      assert.strictEqual(staffList.length, 4);
      const names = staffList.map((s) => s.name);
      assert.ok(names.includes("Niluka Wijesinghe"));
      assert.ok(names.includes("Sunil Bandara"));
      assert.ok(names.includes("Chaminda Perera"));
      assert.ok(names.includes("Dilhani Senanayake"));
    });

    it("filterAndSortSchedule filters by activity type accurately", () => {
      const spaOnly = filterAndSortSchedule(
        DEFAULT_ACTIVITY_SCHEDULE,
        "SPA_TREATMENT",
        "ALL",
        "ALL",
        "",
      );
      assert.strictEqual(spaOnly.length, 3);
      for (const item of spaOnly) {
        assert.strictEqual(item.activityType, "SPA_TREATMENT");
      }

      const excursionsOnly = filterAndSortSchedule(
        DEFAULT_ACTIVITY_SCHEDULE,
        "EXCURSION_TRANSFER",
        "ALL",
        "ALL",
        "",
      );
      assert.strictEqual(excursionsOnly.length, 2);
      for (const item of excursionsOnly) {
        assert.strictEqual(item.activityType, "EXCURSION_TRANSFER");
      }
    });

    it("filterAndSortSchedule filters by status and staff member", () => {
      const scheduledItems = filterAndSortSchedule(
        DEFAULT_ACTIVITY_SCHEDULE,
        "ALL",
        "SCHEDULED",
        "ALL",
        "",
      );
      assert.strictEqual(scheduledItems.length, 3);

      const nilukaItems = filterAndSortSchedule(
        DEFAULT_ACTIVITY_SCHEDULE,
        "ALL",
        "ALL",
        "STF-THERAPIST-01",
        "",
      );
      assert.strictEqual(nilukaItems.length, 2);
      for (const item of nilukaItems) {
        assert.strictEqual(item.staffId, "STF-THERAPIST-01");
      }
    });

    it("filterAndSortSchedule filters by search query matching guest or room", () => {
      const byGuest = filterAndSortSchedule(
        DEFAULT_ACTIVITY_SCHEDULE,
        "ALL",
        "ALL",
        "ALL",
        "Elena",
      );
      assert.strictEqual(byGuest.length, 1);
      assert.ok(byGuest[0]);
      assert.strictEqual(byGuest[0].guestName, "Elena Rostova");

      const byRoom = filterAndSortSchedule(DEFAULT_ACTIVITY_SCHEDULE, "ALL", "ALL", "ALL", "108");
      assert.strictEqual(byRoom.length, 1);
      assert.ok(byRoom[0]);
      assert.strictEqual(byRoom[0].roomNumber, "108");
    });

    it("filterAndSortSchedule sorts IN_PROGRESS items before SCHEDULED and COMPLETED", () => {
      const sorted = filterAndSortSchedule(DEFAULT_ACTIVITY_SCHEDULE, "ALL", "ALL", "ALL", "");
      assert.ok(sorted[0]);
      assert.strictEqual(sorted[0].status, "IN_PROGRESS");
      assert.ok(sorted[1]);
      assert.strictEqual(sorted[1].status, "SCHEDULED");
      const last = sorted[sorted.length - 1];
      assert.ok(last);
      assert.strictEqual(last.status, "COMPLETED");
    });

    it("advanceActivityStatus transitions SCHEDULED to IN_PROGRESS and then to COMPLETED", () => {
      const initialItem: StaffActivityItem = {
        id: "TEST-01",
        tenantId: "t1",
        activityType: "SPA_TREATMENT",
        serviceName: "Shirodhara",
        staffId: "S1",
        staffName: "Niluka",
        staffRole: "THERAPIST",
        guestName: "John",
        roomNumber: "101",
        scheduledTime: "10:00 - 11:00",
        durationMinutes: 60,
        locationOrRoute: "Pavilion 1",
        status: "SCHEDULED",
      };

      const inProgress = advanceActivityStatus(initialItem, "2026-10-20T10:00:00.000Z");
      assert.strictEqual(inProgress.status, "IN_PROGRESS");
      assert.strictEqual(inProgress.startTimeIso, "2026-10-20T10:00:00.000Z");

      const completed = advanceActivityStatus(inProgress, "2026-10-20T11:00:00.000Z");
      assert.strictEqual(completed.status, "COMPLETED");
      assert.strictEqual(completed.completedTimeIso, "2026-10-20T11:00:00.000Z");

      // Once completed, subsequent advance does not mutate status
      const unchanged = advanceActivityStatus(completed);
      assert.strictEqual(unchanged.status, "COMPLETED");
    });

    it("getActivityStatusBadge returns appropriate badge classes", () => {
      const inProg = getActivityStatusBadge("IN_PROGRESS");
      assert.strictEqual(inProg.label, "In Progress");
      assert.ok(inProg.badgeClass.includes("amber"));

      const comp = getActivityStatusBadge("COMPLETED");
      assert.strictEqual(comp.label, "Completed");
      assert.ok(comp.badgeClass.includes("emerald"));

      const sched = getActivityStatusBadge("SCHEDULED");
      assert.strictEqual(sched.label, "Scheduled");
      assert.ok(sched.badgeClass.includes("sky"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. React UI Static Markup Rendering
  // --------------------------------------------------------------------------
  describe("2. React UI Rendering & Apple HIG Compliance", () => {
    it("renders live staff dispatch header and metric counts", () => {
      const html = renderToStaticMarkup(
        React.createElement(StaffActivitySchedule, {
          initialSchedule: DEFAULT_ACTIVITY_SCHEDULE,
          language: "en",
        }),
      );

      assert.ok(html.includes("Live Staff Dispatch"));
      assert.ok(
        html.includes("Therapist &amp; Chauffeur Daily Schedule") ||
          html.includes("Therapist & Chauffeur Daily Schedule"),
      );
      assert.ok(html.includes("Scheduled"));
      assert.ok(html.includes("In Progress"));
      assert.ok(html.includes("Completed"));
    });

    it("renders activity cards with guest details and 1-tap action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(StaffActivitySchedule, {
          initialSchedule: DEFAULT_ACTIVITY_SCHEDULE,
          language: "en",
        }),
      );

      assert.ok(html.includes("Elena Rostova"));
      assert.ok(html.includes("304"));
      assert.ok(html.includes("Shirodhara"));
      assert.ok(html.includes("Dr. Marcus Vance"));
      assert.ok(html.includes("BIA Airport Transfer"));
      assert.ok(html.includes("Start Assignment"));
      assert.ok(html.includes("Mark Completed"));
    });

    it("renders trilingual support for Sinhala and Tamil", () => {
      const siHtml = renderToStaticMarkup(
        React.createElement(StaffActivitySchedule, {
          initialSchedule: DEFAULT_ACTIVITY_SCHEDULE,
          language: "si",
        }),
      );
      assert.ok(siHtml.includes("චිකිත්සක සහ රියදුරු දෛනික කාලසටහන"));

      const taHtml = renderToStaticMarkup(
        React.createElement(StaffActivitySchedule, {
          initialSchedule: DEFAULT_ACTIVITY_SCHEDULE,
          language: "ta",
        }),
      );
      assert.ok(taHtml.includes("சிகிச்சையாளர் மற்றும் சாரதி நாளாந்த அட்டவணை"));
    });
  });
});
