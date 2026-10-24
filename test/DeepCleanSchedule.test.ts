import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DEEP_CLEAN_RECORDS,
  DeepCleanSchedule,
  type RoomDeepCleanRecord,
  calculateDeepCleanSummary,
  evaluateDeepCleanStatus,
  formatDeepCleanLkr,
  getDeepCleanText,
  isRecordMatchingFilter,
  resolveDeepCleanStatusBadge,
  resolveServiceTypeBadge,
} from "../src/admin/housekeeping/DeepCleanSchedule.js";

const noop = () => undefined;

describe("Step 317: Room Deep-Cleaning & Monsoon Mold Tracker (DeepCleanSchedule.tsx)", () => {
  describe("1. Pure Maintenance Cycle & Status Evaluator", () => {
    it("evaluates overdue status when elapsed days exceed 75", () => {
      assert.equal(evaluateDeepCleanStatus(76), "OVERDUE");
      assert.equal(evaluateDeepCleanStatus(110), "OVERDUE");
    });

    it("evaluates due-soon status between 45 and 75 elapsed days", () => {
      assert.equal(evaluateDeepCleanStatus(45), "DUE_SOON");
      assert.equal(evaluateDeepCleanStatus(60), "DUE_SOON");
      assert.equal(evaluateDeepCleanStatus(75), "DUE_SOON");
    });

    it("evaluates healthy status below 45 days", () => {
      assert.equal(evaluateDeepCleanStatus(0), "HEALTHY");
      assert.equal(evaluateDeepCleanStatus(20), "HEALTHY");
      assert.equal(evaluateDeepCleanStatus(44), "HEALTHY");
    });

    it("formats LKR currency amounts with integer rounding and commas", () => {
      assert.equal(formatDeepCleanLkr(18500), "Rs. 18,500");
      assert.equal(formatDeepCleanLkr(0), "Rs. 0");
      assert.equal(formatDeepCleanLkr(Number.NaN), "Rs. 0");
    });
  });

  describe("2. Summary Metrics & Compliance Calculations", () => {
    it("aggregates room counts and calculates compliance percentage", () => {
      const summary = calculateDeepCleanSummary(DEFAULT_DEEP_CLEAN_RECORDS);
      assert.equal(summary.totalRooms, 5);
      assert.equal(summary.overdueCount, 2); // Villa 101, Room 104
      assert.equal(summary.dueSoonCount, 1); // Room 102
      assert.equal(summary.inProgressCount, 1); // Villa 105
      assert.equal(summary.healthyCount, 1); // Villa 103
      // (1 healthy + 1 in_progress) / 5 = 40.0%
      assert.equal(summary.complianceRatePct, 40);
      // 18500 + 12000 + 8500 + 14000 + 16500 = 69500
      assert.equal(summary.totalMaintenanceCostLkr, 69500);
    });

    it("returns zero metrics when inventory is empty", () => {
      const summary = calculateDeepCleanSummary([]);
      assert.equal(summary.totalRooms, 0);
      assert.equal(summary.overdueCount, 0);
      assert.equal(summary.complianceRatePct, 0);
      assert.equal(summary.totalMaintenanceCostLkr, 0);
    });
  });

  describe("3. Service Badges, Status Badges & Filtering", () => {
    it("resolves distinct icons and styles for all 5 tropical maintenance services", () => {
      const ac = resolveServiceTypeBadge("AC_CHEMICAL_FLUSH");
      assert.equal(ac.icon, "AC");
      assert.match(ac.style, /cyan/);

      const mold = resolveServiceTypeBadge("MOLD_FOLIAGE_FOGGING");
      assert.equal(mold.icon, "Eco");
      assert.match(mold.style, /emerald/);

      const mattress = resolveServiceTypeBadge("MATTRESS_STEAM_UV");
      assert.equal(mattress.icon, "Room");

      const grout = resolveServiceTypeBadge("GROUT_DESCALING");
      assert.equal(grout.icon, "Shower");

      const pest = resolveServiceTypeBadge("PEST_FUMIGATION");
      assert.equal(pest.icon, "Pest");
    });

    it("resolves status badges with pulsing indicators for overdue records", () => {
      const overdue = resolveDeepCleanStatusBadge("OVERDUE");
      assert.match(overdue.style, /animate-pulse/);

      const dueSoon = resolveDeepCleanStatusBadge("DUE_SOON");
      assert.match(dueSoon.style, /amber/);

      const healthy = resolveDeepCleanStatusBadge("HEALTHY");
      assert.match(healthy.style, /emerald/);
    });

    it("filters records by tab and multi-field search query", () => {
      const record: RoomDeepCleanRecord = {
        roomId: "dc-999",
        roomNumber: "Ocean Cabana 9",
        roomCategory: "Overwater Bungalow",
        floor: "Lagoon",
        lastServiceDateIso: "2026-06-01T00:00:00Z",
        daysSinceLastService: 120,
        serviceType: "MOLD_FOLIAGE_FOGGING",
        status: "OVERDUE",
        technicianName: "Mirissa Marine Woods",
        notes: "Salt spray on teak deck and railings.",
        serviceCostLkr: 25000,
      };

      assert.equal(isRecordMatchingFilter(record, "ALL", ""), true);
      assert.equal(isRecordMatchingFilter(record, "OVERDUE", ""), true);
      assert.equal(isRecordMatchingFilter(record, "HEALTHY", ""), false);
      assert.equal(isRecordMatchingFilter(record, "ALL", "Cabana"), true);
      assert.equal(isRecordMatchingFilter(record, "ALL", "Overwater"), true);
      assert.equal(isRecordMatchingFilter(record, "ALL", "Mirissa"), true);
      assert.equal(isRecordMatchingFilter(record, "ALL", "Salt spray"), true);
      assert.equal(isRecordMatchingFilter(record, "ALL", "NonExistent"), false);
    });
  });

  describe("4. Trilingual Localization Catalog", () => {
    it("returns correct translations for en, si, and ta", () => {
      const en = getDeepCleanText("en");
      const si = getDeepCleanText("si");
      const ta = getDeepCleanText("ta");

      assert.match(en.title, /Deep-Cleaning/i);
      assert.match(si.title, /ගැඹුරු පිරිසිදු කිරීම්/);
      assert.match(ta.title, /ஆழமான தூய்மைப்படுத்தல்/);
    });
  });

  describe("5. React Static Markup Rendering", () => {
    it("renders DeepCleanSchedule with header, metrics, tabs, and room cards", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DeepCleanSchedule, {
          propertyTitle: "Bentota Ocean Pavilion & Spa",
          language: "en",
          initialRecords: DEFAULT_DEEP_CLEAN_RECORDS,
          onSaveTreatment: noop,
        }),
      );

      // Verify header branding
      assert.match(markup, /Bentota Ocean Pavilion/);
      assert.match(markup, /Deep-Cleaning &amp; Monsoon Maintenance/);

      // Verify metrics
      assert.match(markup, /Tracked Rooms/);
      assert.match(markup, /Overdue Attention/);
      assert.match(markup, /Cycle Compliance/);

      // Verify room numbers
      assert.match(markup, /Villa 101/);
      assert.match(markup, /Oceanfront Private Pool Villa/);
      assert.match(markup, /Room 102/);

      // Verify Apple HIG accessibility & typography
      assert.match(markup, /min-h-\[44px\]/);
      assert.match(markup, /tabular-nums-lkr/);
      assert.match(markup, /apple-liquid-glass/);
    });

    it("renders Sinhala localization correctly in static markup", () => {
      const markup = renderToStaticMarkup(
        React.createElement(DeepCleanSchedule, {
          propertyTitle: "සීගිරිය විලා",
          language: "si",
          initialRecords: DEFAULT_DEEP_CLEAN_RECORDS,
          onSaveTreatment: noop,
        }),
      );

      assert.match(markup, /ගැඹුරු පිරිසිදු කිරීම් සහ මෝසම් නඩත්තු සටහන/);
      assert.match(markup, /මුළු කාමර/);
      assert.match(markup, /නඩත්තුව සටහන් කරන්න/);
    });
  });
});
