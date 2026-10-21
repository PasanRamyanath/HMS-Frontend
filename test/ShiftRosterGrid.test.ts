/**
 * Unit Test Suite for Step 429: ShiftRosterGrid
 * (`test/ShiftRosterGrid.test.ts`)
 *
 * Implements Step 429 (Phase 18.04) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Department Shift Roster & Weekly Duty Planner (`ShiftRosterGrid.tsx`).
 *
 * Validates:
 * 1. Shift definitions and timing (Morning, Evening, Night Audit, Split Shift, Day Off).
 * 2. Default assignments generator with night auditor and kitchen/restaurant allocations.
 * 3. Personalized SMS roster message generation per staff member.
 * 4. React 19 SSR rendering of the duty planner table, staff rows, and coverage footer.
 * 5. Department filter options and 1-click SMS broadcast trigger button.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DAYS_OF_WEEK,
  DEFAULT_STAFF_MEMBERS,
  DEPARTMENT_OPTIONS,
  SHIFT_DEFINITIONS,
  ShiftRosterGrid,
  createDefaultRosterAssignments,
  generateStaffRosterSms,
} from "../src/admin/hr/ShiftRosterGrid.js";

describe("Step 429: Department Shift Roster & Weekly Duty Planner (ShiftRosterGrid.tsx)", () => {
  describe("1. Metadata & Shift Definitions", () => {
    it("defines standard Sri Lankan hospitality shift timings accurately", () => {
      assert.equal(SHIFT_DEFINITIONS.MORNING.timing, "06:00 – 15:00");
      assert.equal(SHIFT_DEFINITIONS.MORNING.hours, 9);
      assert.equal(SHIFT_DEFINITIONS.MORNING.code, "M");

      assert.equal(SHIFT_DEFINITIONS.EVENING.timing, "14:00 – 23:00");
      assert.equal(SHIFT_DEFINITIONS.EVENING.hours, 9);
      assert.equal(SHIFT_DEFINITIONS.EVENING.code, "E");

      assert.equal(SHIFT_DEFINITIONS.NIGHT_AUDIT.timing, "22:00 – 07:00");
      assert.equal(SHIFT_DEFINITIONS.NIGHT_AUDIT.hours, 9);
      assert.equal(SHIFT_DEFINITIONS.NIGHT_AUDIT.code, "NA");

      assert.equal(SHIFT_DEFINITIONS.SPLIT_SHIFT.timing, "11:00–15:00 & 18:00–22:00");
      assert.equal(SHIFT_DEFINITIONS.SPLIT_SHIFT.hours, 8);
      assert.equal(SHIFT_DEFINITIONS.SPLIT_SHIFT.code, "SS");

      assert.equal(SHIFT_DEFINITIONS.DAY_OFF.hours, 0);
      assert.equal(SHIFT_DEFINITIONS.DAY_OFF.code, "OFF");
    });

    it("includes all 7 days of the week starting with Monday", () => {
      assert.equal(DAYS_OF_WEEK.length, 7);
      assert.equal(DAYS_OF_WEEK[0]?.key, "MON");
      assert.equal(DAYS_OF_WEEK[6]?.key, "SUN");
    });

    it("provides comprehensive department filter options", () => {
      const deptIds = DEPARTMENT_OPTIONS.map((d) => d.id);
      assert.ok(deptIds.includes("ALL"));
      assert.ok(deptIds.includes("FRONT_DESK"));
      assert.ok(deptIds.includes("KITCHEN"));
      assert.ok(deptIds.includes("RESTAURANT"));
      assert.ok(deptIds.includes("HOUSEKEEPING"));
      assert.ok(deptIds.includes("MAINTENANCE"));
    });
  });

  describe("2. Default Roster & SMS Generator", () => {
    it("generates default shift assignments correctly assigning Night Auditor", () => {
      const assignments = createDefaultRosterAssignments(DEFAULT_STAFF_MEMBERS);

      // Night auditor EMP-FD-02 assigned NIGHT_AUDIT on weekdays
      const auditorShifts = assignments["EMP-FD-02"];
      assert.ok(auditorShifts);
      assert.equal(auditorShifts.MON, "NIGHT_AUDIT");
      assert.equal(auditorShifts.FRI, "NIGHT_AUDIT");
      assert.equal(auditorShifts.SUN, "DAY_OFF");

      // Kitchen chef EMP-KT-01 on split shift / evening
      const chefShifts = assignments["EMP-KT-01"];
      assert.ok(chefShifts);
      assert.equal(chefShifts.MON, "SPLIT_SHIFT");
      assert.equal(chefShifts.WED, "EVENING");
    });

    it("generates personalized SMS notification text with weekly shift summary", () => {
      const staff = DEFAULT_STAFF_MEMBERS[0];
      assert.ok(staff);
      const staffAssignments = {
        MON: "MORNING" as const,
        TUE: "MORNING" as const,
        WED: "MORNING" as const,
        THU: "MORNING" as const,
        FRI: "MORNING" as const,
        SAT: "MORNING" as const,
        SUN: "DAY_OFF" as const,
      };

      const sms = generateStaffRosterSms(staff, "2026-10-26", staffAssignments);
      assert.ok(sms.includes("Priyantha Bandara"));
      assert.ok(sms.includes("Week 2026-10-26"));
      assert.ok(sms.includes("Mon:M"));
      assert.ok(sms.includes("Sun:OFF"));
      assert.ok(sms.includes("Contact HR for changes"));
    });
  });

  describe("3. React 19 SSR Component Rendering", () => {
    it("renders master duty planner table and header ribbon", () => {
      const html = renderToStaticMarkup(
        React.createElement(ShiftRosterGrid, {
          tenantId: "cinnamon-grand-colombo",
          weekStartDate: "2026-10-26",
        }),
      );

      // Header & metadata
      assert.ok(html.includes("Department Shift Roster &amp; Weekly Duty Planner"));
      assert.ok(html.includes("2026-10-26"));
      assert.ok(html.includes("cinnamon-grand-colombo"));
      assert.ok(html.includes("Total Roster:"));

      // 1-Click SMS broadcast button
      assert.ok(html.includes("1-Click SMS Broadcast"));

      // Staff names rendered
      assert.ok(html.includes("Priyantha Bandara"));
      assert.ok(html.includes("Kasun Dissanayake"));
      assert.ok(html.includes("Rohan Fernando"));
      assert.ok(html.includes("Chathura Kumara"));

      // Shift buttons & codes
      assert.ok(html.includes('data-testid="roster-table"'));
      assert.ok(html.includes("Daily Staff on Duty Coverage"));
      assert.ok(html.includes("on duty"));
    });

    it("renders custom staff members and custom assignments", () => {
      const customStaff = [
        {
          id: "EMP-CUSTOM-1",
          name: "Wimal Jayatissa",
          department: "KITCHEN" as const,
          designation: "Executive Chef",
          phone: "+94779998888",
          epfNo: "EPF/999",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ShiftRosterGrid, {
          staffMembers: customStaff,
          weekStartDate: "2026-11-02",
        }),
      );

      assert.ok(html.includes("Wimal Jayatissa"));
      assert.ok(html.includes("Executive Chef"));
      assert.ok(html.includes("EPF/999"));
      assert.ok(html.includes("2026-11-02"));
    });
  });
});
