import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DRIVER_BEDS,
  DEFAULT_DRIVER_POLICY,
  type DriverBed,
  type DriverBedStatus,
  type DriverCostBreakdown,
  DriverDormManager,
  type DriverDormManagerProps,
  calculateDriverCost,
  getBedStatusBadgeColor,
  validateDriverBed,
  validateDriverPolicy,
} from "../src/admin/rooms/DriverDormManager.js";

describe("Chauffeur & Driver Quarters Dormitory Configuration (DriverDormManager.tsx)", () => {
  describe("Policy Validation (validateDriverPolicy)", () => {
    it("accepts default Sri Lankan driver policy settings", () => {
      const res = validateDriverPolicy(DEFAULT_DRIVER_POLICY);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it("rejects negative rates and allowances", () => {
      assert.strictEqual(
        validateDriverPolicy({ ...DEFAULT_DRIVER_POLICY, bedRatePerNightLkr: -1 }).isValid,
        false,
      );
      assert.strictEqual(
        validateDriverPolicy({ ...DEFAULT_DRIVER_POLICY, driverMealVoucherLkrPerDay: -500 })
          .isValid,
        false,
      );
      assert.strictEqual(
        validateDriverPolicy({ ...DEFAULT_DRIVER_POLICY, outsideAllowanceLkrPerNight: -1000 })
          .isValid,
        false,
      );
      assert.strictEqual(
        validateDriverPolicy({ ...DEFAULT_DRIVER_POLICY, maxParkingBays: -2 }).isValid,
        false,
      );
    });
  });

  describe("Bed Validation (validateDriverBed)", () => {
    it("rejects empty bed number or missing dorm block", () => {
      const res1 = validateDriverBed(
        { bedNumber: "  ", dormBlock: "Annex A" },
        DEFAULT_DRIVER_BEDS,
      );
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error ?? "", /bed number or designation is required/i);

      const res2 = validateDriverBed({ bedNumber: "Bed D-99", dormBlock: "" }, DEFAULT_DRIVER_BEDS);
      assert.strictEqual(res2.isValid, false);
      assert.match(res2.error ?? "", /dormitory block designation is required/i);
    });

    it("rejects duplicate bed numbers case-insensitively", () => {
      const res = validateDriverBed(
        { bedNumber: "bed d-01", dormBlock: "Annex A" },
        DEFAULT_DRIVER_BEDS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /already exists/i);
    });

    it("allows updating an existing bed", () => {
      const res = validateDriverBed(
        { bedNumber: "Bed D-01", dormBlock: "Renovated Annex" },
        DEFAULT_DRIVER_BEDS,
        "bed-d01",
      );
      assert.strictEqual(res.isValid, true);
    });
  });

  describe("Cost Calculations (calculateDriverCost)", () => {
    it("calculates cost when dorm bed is available (on-site complimentary lodging)", () => {
      // 3 nights, Bed: 0, Voucher: 1500 * 3 = 4500
      const cost: DriverCostBreakdown = calculateDriverCost(3, false, DEFAULT_DRIVER_POLICY);
      assert.strictEqual(cost.isOutsideLodging, false);
      assert.strictEqual(cost.onSiteBedCostLkr, 0);
      assert.strictEqual(cost.outsideAllowanceLkr, 0);
      assert.strictEqual(cost.mealVoucherCostLkr, 4500);
      assert.strictEqual(cost.totalDriverCostLkr, 4500);
    });

    it("calculates cost when dorm is full with automatic outside allowance fallback", () => {
      // 2 nights, Dorm Full: Outside Allowance = 3500 * 2 = 7000, Vouchers = 1500 * 2 = 3000 -> Total = 10,000
      const cost: DriverCostBreakdown = calculateDriverCost(2, true, DEFAULT_DRIVER_POLICY);
      assert.strictEqual(cost.isOutsideLodging, true);
      assert.strictEqual(cost.onSiteBedCostLkr, 0);
      assert.strictEqual(cost.outsideAllowanceLkr, 7000);
      assert.strictEqual(cost.mealVoucherCostLkr, 3000);
      assert.strictEqual(cost.totalDriverCostLkr, 10000);
    });
  });

  describe("Badge Colors (getBedStatusBadgeColor)", () => {
    it("maps all bed statuses properly", () => {
      const statuses: DriverBedStatus[] = ["CLEAN", "INSPECTED", "DIRTY", "OUT_OF_ORDER"];
      for (const s of statuses) {
        assert.ok(getBedStatusBadgeColor(s));
      }
    });
  });

  describe("Component Static Rendering & Contract", () => {
    it("renders DriverDormManager with default beds and overview", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverDormManager, {} as DriverDormManagerProps),
      );
      assert.ok(html.includes("Chauffeur &amp; Driver Quarters Dormitory Configuration"));
      assert.ok(html.includes("Total Dorm Beds"));
      assert.ok(html.includes("Coach Parking Bays"));
      assert.ok(html.includes("Bed D-01"));
      assert.ok(html.includes("Sunil Perera"));
      assert.ok(html.includes("+ Add Driver Bed"));
    });

    it("renders full dorm warning banner when all beds are occupied", () => {
      const allOccupiedBeds: ReadonlyArray<DriverBed> = DEFAULT_DRIVER_BEDS.map((b) => ({
        ...b,
        isOccupied: true,
      }));
      const html = renderToStaticMarkup(
        React.createElement(DriverDormManager, {
          initialBeds: allOccupiedBeds,
        } as DriverDormManagerProps),
      );
      assert.ok(html.includes("Driver Dormitory Full"));
      assert.ok(html.includes("Outside Allowance Fallback Active"));
    });

    it("renders in readOnly mode without edit/delete buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverDormManager, {
          readOnly: true,
        } as DriverDormManagerProps),
      );
      assert.ok(!html.includes("+ Add Driver Bed"));
      assert.ok(!html.includes("Save Quarters"));
    });
  });
});
