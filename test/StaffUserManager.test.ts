import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_STAFF_USERS,
  type EpfEtfBreakdown,
  STAFF_DEPARTMENT_LABELS,
  STAFF_ROLE_LABELS,
  type StaffDepartment,
  type StaffUser,
  StaffUserManager,
  type StaffUserManagerProps,
  type StaffValidationErrors,
  buildStaffCandidate,
  computeEpfEtf,
  estimateScPoolShare,
  filterStaffList,
  getScWeightTierDescription,
  updateStaffRoster,
  validateStaffUser,
} from "../src/admin/settings/StaffUserManager.js";

describe("Staff User, Role & Service Charge Point Weight Manager (StaffUserManager.tsx)", () => {
  describe("Statutory EPF / ETF Calculations (computeEpfEtf)", () => {
    it("accurately computes 8% employee EPF, 12% employer EPF, and 3% employer ETF", () => {
      const basicSalaryLkr = 100000;
      const result: EpfEtfBreakdown = computeEpfEtf(basicSalaryLkr);

      assert.strictEqual(result.employeeEpfLkr, 8000);
      assert.strictEqual(result.employerEpfLkr, 12000);
      assert.strictEqual(result.employerEtfLkr, 3000);
      assert.strictEqual(result.totalStatutoryLkr, 23000);
      assert.strictEqual(result.netSalaryAfterEpfLkr, 92000);
    });

    it("safely handles zero or negative salaries without producing NaN", () => {
      const zeroResult = computeEpfEtf(0);
      assert.strictEqual(zeroResult.employeeEpfLkr, 0);
      assert.strictEqual(zeroResult.totalStatutoryLkr, 0);

      const negativeResult = computeEpfEtf(-50000);
      assert.strictEqual(negativeResult.employeeEpfLkr, 0);
      assert.strictEqual(negativeResult.netSalaryAfterEpfLkr, 0);
    });
  });

  describe("Service Charge Share Estimation (estimateScPoolShare)", () => {
    it("computes estimated monthly SC share based on weighted points and 26 standard work days", () => {
      // 1.0 weight * 26 days * 850 LKR/pt = 22,100 LKR
      const shareJunior = estimateScPoolShare(1.0, 26, 850);
      assert.strictEqual(shareJunior, 22100);

      // 2.5 weight * 26 days * 850 LKR/pt = 55,250 LKR
      const shareHeadChef = estimateScPoolShare(2.5, 26, 850);
      assert.strictEqual(shareHeadChef, 55250);
    });

    it("clamps weights to the valid [1.0, 5.0] range", () => {
      const belowRange = estimateScPoolShare(0.2, 26, 850);
      assert.strictEqual(belowRange, 22100);

      const aboveRange = estimateScPoolShare(10.0, 26, 850);
      // 5.0 * 26 * 850 = 110,500 LKR
      assert.strictEqual(aboveRange, 110500);
    });
  });

  describe("Tier Descriptions & Labels", () => {
    it("returns descriptive titles for various weight tiers", () => {
      assert.ok(getScWeightTierDescription(1.0).includes("Line Staff"));
      assert.ok(getScWeightTierDescription(1.5).includes("Senior Line"));
      assert.ok(getScWeightTierDescription(2.0).includes("Supervisor"));
      assert.ok(getScWeightTierDescription(2.5).includes("Department Head"));
      assert.ok(getScWeightTierDescription(4.0).includes("Executive Management"));
    });

    it("maps all departments and roles to readable strings", () => {
      const dept: StaffDepartment = "FRONT_OFFICE";
      assert.strictEqual(STAFF_DEPARTMENT_LABELS[dept], "Front Office & Concierge");
      assert.strictEqual(STAFF_ROLE_LABELS.FRONT_DESK, "Front Desk Receptionist");
    });
  });

  describe("Validation (validateStaffUser)", () => {
    it("passes validation for complete valid staff user draft", () => {
      const validDraft: Partial<StaffUser> = {
        fullName: "Nimal Perera",
        email: "nimal@resort.lk",
        epfNumber: "EPF-8821",
        basicSalaryLkr: 75000,
        scPointWeight: 1.5,
      };

      const result = validateStaffUser(validDraft);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(Object.keys(result.errors).length, 0);
    });

    it("flags errors for short name, invalid email, missing EPF, negative salary, and invalid SC weight", () => {
      const invalidDraft: Partial<StaffUser> = {
        fullName: "A",
        email: "invalid-email-address",
        epfNumber: "",
        basicSalaryLkr: -100,
        scPointWeight: 6.5,
      };

      const result = validateStaffUser(invalidDraft);
      assert.strictEqual(result.isValid, false);
      const errors: StaffValidationErrors = result.errors;
      assert.ok(errors.fullName);
      assert.ok(errors.email);
      assert.ok(errors.epfNumber);
      assert.ok(errors.basicSalaryLkr);
      assert.ok(errors.scPointWeight);
    });
  });

  describe("Candidate Construction & Roster Helpers", () => {
    it("builds a clean StaffUser from partial draft with fallback id", () => {
      const draft: Partial<StaffUser> = {
        fullName: "Anura Kumara",
        email: "anura@resort.lk",
        epfNumber: "EPF-9901",
        basicSalaryLkr: 80000,
        scPointWeight: 1.8,
      };

      const user = buildStaffCandidate(draft, "fallback-id-1");
      assert.strictEqual(user.id, "fallback-id-1");
      assert.strictEqual(user.fullName, "Anura Kumara");
      assert.strictEqual(user.email, "anura@resort.lk");
      assert.strictEqual(user.basicSalaryLkr, 80000);
      assert.strictEqual(user.scPointWeight, 1.8);
      assert.strictEqual(user.isActive, true);
    });

    it("appends new user on add, and replaces existing on edit", () => {
      const initial = DEFAULT_STAFF_USERS.slice(0, 2);
      const newUser: StaffUser = {
        id: "staff-new",
        fullName: "New Staff",
        email: "new@hotel.lk",
        phone: "+94 77 000 0000",
        role: "FRONT_DESK",
        department: "FRONT_OFFICE",
        epfNumber: "EPF-9999",
        basicSalaryLkr: 60000,
        scPointWeight: 1.0,
        isActive: true,
        joinedDate: "2026-01-01",
      };

      const added = updateStaffRoster(initial, newUser, false);
      assert.strictEqual(added.length, 3);
      assert.strictEqual(added[2]?.id, "staff-new");

      const modifiedUser: StaffUser = {
        ...newUser,
        fullName: "Modified Staff",
      };
      const edited = updateStaffRoster(added, modifiedUser, true);
      assert.strictEqual(edited.length, 3);
      assert.strictEqual(edited[2]?.fullName, "Modified Staff");
    });

    it("filters staff list by search query and department", () => {
      const list = DEFAULT_STAFF_USERS;
      const filteredByName = filterStaffList(list, "kavinda", "ALL");
      assert.strictEqual(filteredByName.length, 1);
      assert.strictEqual(filteredByName[0]?.fullName, "Kavinda Fernando");

      const filteredByDept = filterStaffList(list, "", "KITCHEN");
      assert.strictEqual(filteredByDept.length, 1);
      assert.strictEqual(filteredByDept[0]?.department, "KITCHEN");

      const filteredNone = filterStaffList(list, "nonexistent", "ALL");
      assert.strictEqual(filteredNone.length, 0);
    });
  });

  describe("Component Rendering (StaffUserManager)", () => {
    it("renders staff manager UI with KPI cards, roster table, and default employees", () => {
      const props: StaffUserManagerProps = {
        initialStaff: DEFAULT_STAFF_USERS,
      };

      const html = renderToStaticMarkup(React.createElement(StaffUserManager, props));
      assert.ok(html.includes("Staff User, Role &amp; Service Charge Point Manager"));
      assert.ok(html.includes("Active Personnel"));
      assert.ok(html.includes("Monthly Basic Payroll"));
      assert.ok(html.includes("10% SC Pool Points"));
      assert.ok(html.includes("Est. Statutory EPF/ETF (23%)"));
      assert.ok(html.includes("Kavinda Fernando"));
      assert.ok(html.includes("Sunethra Perera"));
      assert.ok(html.includes("Mahinda Rajapakse"));
      assert.ok(html.includes("EPF-1041"));
      assert.ok(html.includes("Add Staff Member"));
    });

    it("handles empty initial staff gracefully", () => {
      const props: StaffUserManagerProps = {
        initialStaff: [],
      };

      const html = renderToStaticMarkup(React.createElement(StaffUserManager, props));
      assert.ok(html.includes("No staff members match the current search or department filter."));
    });
  });
});
