/**
 * Unit Tests for Staff Leave Request & Manager Approval Modal (`LeaveRequestModal.test.ts`)
 *
 * Validates Step 441 (Phase 18.16):
 * 1. Statutory Leave Calculators & Validators (Shop & Office Employees Act)
 * 2. Balance Ledger & Mock Entitlements
 * 3. React 19 Component Rendering & Apple HIG Modal Layout
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LEAVE_BALANCE,
  DEFAULT_PAST_LEAVES,
  LEAVE_I18N,
  LeaveRequestModal,
  SAMPLE_RELIEVER_STAFF,
  calculateLeaveDays,
  getAvailableBalance,
  getLeaveStatusColor,
  getLeaveTypeColor,
  resolveLeaveLabel,
  validateLeaveRequest,
} from "../src/staff/hr/LeaveRequestModal.js";

describe("Step 441: Staff Leave Request & Manager Approval Workflow (LeaveRequestModal.tsx)", () => {
  describe("1. Statutory Leave Calculations & Validators", () => {
    it("calculates leave day durations accurately for full days and half days", () => {
      // 1 day (same date)
      assert.equal(calculateLeaveDays("2026-10-25", "2026-10-25", false), 1);
      // 4 days inclusive (25, 26, 27, 28)
      assert.equal(calculateLeaveDays("2026-10-25", "2026-10-28", false), 4);
      // Half-day request
      assert.equal(calculateLeaveDays("2026-10-25", "2026-10-25", true), 0.5);
      // Reversed dates return 0
      assert.equal(calculateLeaveDays("2026-10-28", "2026-10-25", false), 0);
      // Empty inputs return 0
      assert.equal(calculateLeaveDays("", "", false), 0);
    });

    it("retrieves available balance correctly across statutory categories", () => {
      assert.equal(getAvailableBalance("ANNUAL", DEFAULT_LEAVE_BALANCE), 8);
      assert.equal(getAvailableBalance("CASUAL", DEFAULT_LEAVE_BALANCE), 4);
      assert.equal(getAvailableBalance("MEDICAL", DEFAULT_LEAVE_BALANCE), 12);
      assert.equal(getAvailableBalance("LIEU", DEFAULT_LEAVE_BALANCE), 2);
      assert.equal(getAvailableBalance("MATERNITY", DEFAULT_LEAVE_BALANCE), 84);
      assert.equal(getAvailableBalance("NO_PAY", DEFAULT_LEAVE_BALANCE), 999);
    });

    it("validates compliant leave requests successfully", () => {
      const valid = validateLeaveRequest(
        {
          leaveType: "CASUAL",
          startDate: "2026-10-25",
          endDate: "2026-10-26",
          isHalfDay: false,
          reason: "Attending religious ceremony at Kandy Temple of the Tooth",
          relieverStaffId: "st-002",
        },
        DEFAULT_LEAVE_BALANCE,
      );

      assert.equal(valid.isValid, true);
      assert.equal(valid.errors.length, 0);
    });

    it("flags validation errors when request exceeds available statutory balance", () => {
      // Kasun has 4 casual days left, but requests 5
      const invalid = validateLeaveRequest(
        {
          leaveType: "CASUAL",
          startDate: "2026-10-20",
          endDate: "2026-10-24", // 5 days
          isHalfDay: false,
          reason: "Urgent affairs",
          relieverStaffId: "st-002",
        },
        DEFAULT_LEAVE_BALANCE,
      );

      assert.equal(invalid.isValid, false);
      assert.ok(invalid.errors.some((e) => e.includes("Insufficient balance")));
    });

    it("flags validation errors for missing dates and reasons", () => {
      const empty = validateLeaveRequest(
        {
          leaveType: "ANNUAL",
          startDate: "",
          endDate: "",
          isHalfDay: false,
          reason: "",
          relieverStaffId: "st-002",
        },
        DEFAULT_LEAVE_BALANCE,
      );

      assert.equal(empty.isValid, false);
      assert.ok(empty.errors.some((e) => e.includes("Start date is required")));
      assert.ok(empty.errors.some((e) => e.includes("Reason for leave is required")));
    });

    it("allows NO_PAY leave without statutory balance capping", () => {
      const noPay = validateLeaveRequest(
        {
          leaveType: "NO_PAY",
          startDate: "2026-11-01",
          endDate: "2026-11-20", // 20 days
          isHalfDay: false,
          reason: "Personal study break",
          relieverStaffId: "st-002",
        },
        DEFAULT_LEAVE_BALANCE,
      );

      assert.equal(noPay.isValid, true);
    });

    it("maps statutory leave types and request statuses to Apple dynamic colors", () => {
      assert.equal(getLeaveTypeColor("ANNUAL"), "blue");
      assert.equal(getLeaveTypeColor("CASUAL"), "amber");
      assert.equal(getLeaveTypeColor("MEDICAL"), "red");
      assert.equal(getLeaveTypeColor("LIEU"), "green");
      assert.equal(getLeaveTypeColor("MATERNITY"), "indigo");
      assert.equal(getLeaveTypeColor("NO_PAY"), "gray");

      assert.equal(getLeaveStatusColor("APPROVED"), "green");
      assert.equal(getLeaveStatusColor("PENDING_APPROVAL"), "amber");
      assert.equal(getLeaveStatusColor("REJECTED"), "red");
    });

    it("resolves English and Sinhala localization labels cleanly", () => {
      const en = resolveLeaveLabel("annualLeave", "EN");
      assert.equal(en.primary, "Annual Leave (14d)");

      const si = resolveLeaveLabel("annualLeave", "SI");
      assert.equal(si.primary, "වාර්ෂික නිවාඩු (දින 14)");

      const bi = resolveLeaveLabel("annualLeave", "BILINGUAL");
      assert.equal(bi.primary, "Annual Leave (14d)");
      assert.equal(bi.secondary, "වාර්ෂික නිවාඩු (දින 14)");
    });

    it("verifies dictionary completeness for all leave keys", () => {
      const keys = Object.keys(LEAVE_I18N) as (keyof typeof LEAVE_I18N)[];
      assert.ok(keys.length >= 15);
      for (const key of keys) {
        assert.ok(LEAVE_I18N[key].en.length > 0);
        assert.ok(LEAVE_I18N[key].si.length > 0);
      }
    });
  });

  describe("2. Default Mock Balances & Reliever Staff Integrity", () => {
    it("verifies standard Sri Lankan Shop & Office statutory balances", () => {
      assert.equal(DEFAULT_LEAVE_BALANCE.annualLeaveTotal, 14);
      assert.equal(DEFAULT_LEAVE_BALANCE.casualLeaveTotal, 7);
      assert.equal(DEFAULT_LEAVE_BALANCE.medicalLeaveTotal, 14);
      assert.equal(DEFAULT_LEAVE_BALANCE.lieuLeaveAccrued, 2); // 2 Poya shifts worked
      assert.equal(DEFAULT_LEAVE_BALANCE.annualLeaveRemaining, 8);
      assert.equal(DEFAULT_LEAVE_BALANCE.casualLeaveRemaining, 4);
    });

    it("verifies reliever staff list contains valid colleagues", () => {
      assert.ok(SAMPLE_RELIEVER_STAFF.length >= 3);
      assert.equal(SAMPLE_RELIEVER_STAFF[0]?.staffName, "Ruwan Fernando");
    });

    it("verifies past leave records have complete audit and reliever data", () => {
      assert.ok(DEFAULT_PAST_LEAVES.length >= 3);
      const past = DEFAULT_PAST_LEAVES[0];
      assert.ok(past);
      assert.equal(past.status, "APPROVED");
      assert.ok(past.approvedByName?.includes("Sunil Wickramasinghe"));
    });
  });

  describe("3. React Component Rendering & Apple HIG Modal Layout", () => {
    it("renders accessible modal with form inputs and entitlement balance cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(LeaveRequestModal, {
          isOpen: true,
          onClose: () => {
            /* no-op for tests */
          },
        }),
      );

      // Dialog accessibility
      assert.ok(html.includes("<dialog"));
      assert.ok(html.includes('aria-modal="true"'));
      assert.ok(html.includes("Close leave modal"));

      // Statutory title
      assert.ok(
        html.includes("Staff Leave Request &amp; Entitlement") ||
          html.includes("Staff Leave Request & Entitlement"),
      );
      assert.ok(
        html.includes("Shop &amp; Office Employees Act") ||
          html.includes("Shop & Office Employees Act"),
      );

      // Entitlement cards
      assert.ok(html.includes("8")); // Annual leave remaining
      assert.ok(html.includes("4")); // Casual leave remaining
      assert.ok(html.includes("2")); // Lieu leave remaining

      // Form Elements
      assert.ok(html.includes("Start Date"));
      assert.ok(html.includes("End Date"));
      assert.ok(html.includes("Half-Day Request"));
      assert.ok(html.includes("Ruwan Fernando (Bartender)"));
      assert.ok(html.includes("Submit Leave Application"));
    });

    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(LeaveRequestModal, {
          isOpen: false,
          onClose: () => {
            /* no-op for tests */
          },
        }),
      );

      assert.equal(html, "");
    });
  });
});
