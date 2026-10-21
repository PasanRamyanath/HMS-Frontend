/**
 * Unit Test Suite for Step 430: AttendanceManagerView
 * (`test/AttendanceManagerView.test.ts`)
 *
 * Implements Step 430 (Phase 18.05) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build Smartphone Staff QR Clock-In / Clock-Out & Attendance Sheet (`AttendanceManagerView.tsx`).
 *
 * Validates:
 * 1. Attendance status definitions and Service Charge pool factor mapping.
 * 2. Late arrival calculation with grace period thresholding.
 * 3. Overtime hours computation with breaks and shift thresholds.
 * 4. GPS geofence distance calculation via Haversine formula.
 * 5. Aggregate attendance summary metrics (Present, Late, Leaves, OT, SC days).
 * 6. React 19 SSR rendering of the attendance register table and summary cards.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ATTENDANCE_STATUS_DEFINITIONS,
  AttendanceManagerView,
  DEFAULT_ATTENDANCE_RECORDS,
  DEPARTMENT_FILTER_OPTIONS,
  HOTEL_GEOFENCE_COORDINATES,
  STATUS_FILTER_OPTIONS,
  calculateAttendanceSummary,
  calculateGpsDistanceMeters,
  calculateLateArrival,
  calculateOvertimeHours,
  calculateServiceChargeEligibleDays,
  isWithinGeofence,
} from "../src/admin/hr/AttendanceManagerView.js";

describe("Step 430: Staff QR Clock-In / Clock-Out & Attendance Register (AttendanceManagerView.tsx)", () => {
  describe("1. Attendance Status & Service Charge Pool Factors", () => {
    it("maps statutory attendance statuses to exact Service Charge pool factors", () => {
      assert.equal(calculateServiceChargeEligibleDays("PRESENT"), 1.0);
      assert.equal(calculateServiceChargeEligibleDays("HALF_DAY"), 0.5);
      assert.equal(calculateServiceChargeEligibleDays("PAID_LEAVE"), 1.0);
      assert.equal(calculateServiceChargeEligibleDays("NO_PAY_LEAVE"), 0.0);
      assert.equal(calculateServiceChargeEligibleDays("POYA_HOLIDAY"), 1.0);
      assert.equal(calculateServiceChargeEligibleDays("MERCANTILE_HOLIDAY"), 1.0);
    });

    it("defines comprehensive status metadata with Apple HIG badge variants", () => {
      const presentDef = ATTENDANCE_STATUS_DEFINITIONS.PRESENT;
      assert.equal(presentDef.label, "Present");
      assert.equal(presentDef.color, "green");
      assert.equal(presentDef.scEligibleFactor, 1.0);

      const halfDayDef = ATTENDANCE_STATUS_DEFINITIONS.HALF_DAY;
      assert.equal(halfDayDef.label, "Half-Day");
      assert.equal(halfDayDef.color, "amber");
      assert.equal(halfDayDef.scEligibleFactor, 0.5);

      const noPayDef = ATTENDANCE_STATUS_DEFINITIONS.NO_PAY_LEAVE;
      assert.equal(noPayDef.label, "No-Pay Leave");
      assert.equal(noPayDef.color, "red");
      assert.equal(noPayDef.scEligibleFactor, 0.0);
    });
  });

  describe("2. Late Arrival Calculation Logic", () => {
    it("detects on-time arrival within 15-minute grace period", () => {
      // Shift starts at 06:00, clocked in at 05:55 -> on-time
      const early = calculateLateArrival("05:55", "06:00", 15);
      assert.equal(early.isLate, false);
      assert.equal(early.lateMinutes, 0);

      // Shift starts at 06:00, clocked in at 06:12 -> within 15m grace -> on-time
      const withinGrace = calculateLateArrival("06:12", "06:00", 15);
      assert.equal(withinGrace.isLate, false);
      assert.equal(withinGrace.lateMinutes, 0);
    });

    it("flags late arrival exceeding the 15-minute grace threshold", () => {
      // Shift starts at 06:00, clocked in at 06:22 -> 22 min late
      const late = calculateLateArrival("06:22", "06:00", 15);
      assert.equal(late.isLate, true);
      assert.equal(late.lateMinutes, 22);
    });

    it("handles missing or invalid time inputs gracefully", () => {
      assert.deepEqual(calculateLateArrival("", "06:00"), { isLate: false, lateMinutes: 0 });
      assert.deepEqual(calculateLateArrival("06:00", ""), { isLate: false, lateMinutes: 0 });
    });
  });

  describe("3. Overtime Hours Calculation Logic", () => {
    it("computes exact overtime hours beyond standard 8-hour shift deducting break", () => {
      // 06:00 to 16:00 = 10 hrs elapsed - 1 hr break = 9 hrs worked. 9 - 8 = 1.0 hr overtime
      const ot1 = calculateOvertimeHours("06:00", "16:00", 60, 8);
      assert.equal(ot1, 1.0);

      // 06:00 to 17:30 = 11.5 hrs - 1 hr break = 10.5 hrs worked. 10.5 - 8 = 2.5 hrs overtime
      const ot2 = calculateOvertimeHours("06:00", "17:30", 60, 8);
      assert.equal(ot2, 2.5);
    });

    it("returns 0.0 overtime for standard 8-hour or shorter work durations", () => {
      // 06:00 to 15:00 = 9 hrs - 1 hr break = 8 hrs worked -> 0 overtime
      const ot = calculateOvertimeHours("06:00", "15:00", 60, 8);
      assert.equal(ot, 0);
    });

    it("calculates overnight shifts spanning across midnight correctly", () => {
      // 22:00 to 07:30 next day = 9.5 hrs - 1 hr break = 8.5 hrs worked -> 0.5 hr overtime
      const otOvernight = calculateOvertimeHours("22:00", "07:30", 60, 8);
      assert.equal(otOvernight, 0.5);
    });
  });

  describe("4. GPS Geofencing Distance Verification", () => {
    it("accurately calculates GPS distance between coordinates using Haversine formula", () => {
      // Same point = 0 meters
      const distanceSame = calculateGpsDistanceMeters(6.9271, 79.8612, 6.9271, 79.8612);
      assert.equal(distanceSame, 0);

      // Small offset in Colombo (~111 meters for 0.001 deg lat)
      const distanceSmall = calculateGpsDistanceMeters(6.9271, 79.8612, 6.9281, 79.8612);
      assert.ok(distanceSmall > 90 && distanceSmall < 130);
    });

    it("verifies staff smartphone is within the 250m hotel perimeter", () => {
      const inside = isWithinGeofence(
        6.9275,
        79.8615,
        HOTEL_GEOFENCE_COORDINATES.latitude,
        HOTEL_GEOFENCE_COORDINATES.longitude,
        250,
      );
      assert.equal(inside, true);

      // Far outside hotel (Kandy coordinates vs Colombo hotel)
      const outside = isWithinGeofence(
        7.2906,
        80.6337,
        HOTEL_GEOFENCE_COORDINATES.latitude,
        HOTEL_GEOFENCE_COORDINATES.longitude,
        250,
      );
      assert.equal(outside, false);
    });
  });

  describe("5. Aggregate Attendance Summary Calculation", () => {
    it("computes totals for Present, Leaves, Late arrivals, Overtime and SC days", () => {
      const summary = calculateAttendanceSummary(DEFAULT_ATTENDANCE_RECORDS);

      assert.equal(summary.totalScheduled, 9);
      assert.equal(summary.presentCount, 6); // 5 PRESENT + 1 POYA_HOLIDAY
      assert.equal(summary.halfDayCount, 1);
      assert.equal(summary.onLeaveCount, 2); // 1 PAID_LEAVE + 1 NO_PAY_LEAVE
      assert.equal(summary.lateCount, 1); // Dilani Fernando (+22m late)
      assert.ok(summary.totalOvertimeHours > 0);
      assert.ok(summary.totalScEligibleDays > 0);
      assert.ok(summary.onTimeRatePercent > 0 && summary.onTimeRatePercent <= 100);
    });
  });

  describe("6. React 19 SSR Component Rendering", () => {
    it("renders AttendanceManagerView without crashing", () => {
      const html = renderToStaticMarkup(
        React.createElement(AttendanceManagerView, {
          initialRecords: DEFAULT_ATTENDANCE_RECORDS,
          currentDate: "2026-10-21",
        }),
      );

      assert.ok(html.includes("Staff Attendance &amp; Time Register"));
      assert.ok(html.includes("Phase 18.05"));
      assert.ok(html.includes("Present on Duty"));
      assert.ok(html.includes("Late Arrivals"));
      assert.ok(html.includes("SC Pool Eligible"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Chef Nuwan Gunasekara"));
      assert.ok(html.includes("Scan Staff QR"));
    });

    it("renders filter controls for department and status", () => {
      assert.ok(DEPARTMENT_FILTER_OPTIONS.length >= 5);
      assert.ok(STATUS_FILTER_OPTIONS.length >= 4);

      const html = renderToStaticMarkup(
        React.createElement(AttendanceManagerView, {
          initialRecords: DEFAULT_ATTENDANCE_RECORDS,
        }),
      );

      assert.ok(html.includes("Front Desk"));
      assert.ok(html.includes("Kitchen"));
      assert.ok(html.includes("Restaurant"));
      assert.ok(html.includes("Housekeeping"));
      assert.ok(html.includes("Maintenance"));
    });
  });
});
