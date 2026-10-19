import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DEPARTMENT_CONFIGS,
  type DepartmentOperatingHours,
  type DepartmentScheduleConfig,
  DepartmentTabs,
  type DepartmentTabsProps,
  type QrDepartment,
  getSlstComponents,
  isDepartmentOpenAt,
  resolveDeptTitle,
  timeStringToMinutes,
} from "../src/qr/DepartmentTabs.js";

describe("Step 253: Multi-Department Service Pill Switcher & SLST Scheduler (DepartmentTabs.tsx)", () => {
  describe("1. Pure SLST Time & Availability Engine", () => {
    it("converts UTC timestamps to Sri Lanka Standard Time (UTC+05:30) accurately", () => {
      // 12:00 UTC -> 17:30 SLST
      const date1200Utc = new Date(Date.UTC(2026, 9, 19, 12, 0, 0));
      const slst1 = getSlstComponents(date1200Utc);
      assert.strictEqual(slst1.hours, 17);
      assert.strictEqual(slst1.minutes, 30);
      assert.strictEqual(slst1.totalMinutes, 1050);
      assert.strictEqual(slst1.timeStr, "17:30");

      // 01:00 UTC -> 06:30 SLST
      const date0100Utc = new Date(Date.UTC(2026, 9, 19, 1, 0, 0));
      const slst2 = getSlstComponents(date0100Utc);
      assert.strictEqual(slst2.hours, 6);
      assert.strictEqual(slst2.minutes, 30);
      assert.strictEqual(slst2.timeStr, "06:30");
    });

    it("parses HH:mm strings to minute of day integers", () => {
      assert.strictEqual(timeStringToMinutes("00:00"), 0);
      assert.strictEqual(timeStringToMinutes("06:30"), 390);
      assert.strictEqual(timeStringToMinutes("12:00"), 720);
      assert.strictEqual(timeStringToMinutes("23:00"), 1380);
      assert.strictEqual(timeStringToMinutes("23:59"), 1439);
    });

    it("evaluates department open/closed status against operating windows", () => {
      const diningHours: DepartmentOperatingHours = {
        startSlst: "06:30",
        endSlst: "23:00",
        is24Hours: false,
      };

      // 12:00 SLST (06:30 UTC) -> Open
      const midDay = new Date(Date.UTC(2026, 9, 19, 6, 30, 0));
      assert.strictEqual(isDepartmentOpenAt(diningHours, midDay), true);

      // 03:00 SLST (21:30 UTC previous day) -> Closed
      const lateNight = new Date(Date.UTC(2026, 9, 18, 21, 30, 0));
      assert.strictEqual(isDepartmentOpenAt(diningHours, lateNight), false);

      // 24-hour department (Housekeeping) -> Always open
      const hkHours: DepartmentOperatingHours = {
        startSlst: "00:00",
        endSlst: "23:59",
        is24Hours: true,
      };
      assert.strictEqual(isDepartmentOpenAt(hkHours, lateNight), true);
    });

    it("resolves trilingual department titles with fallbacks", () => {
      const cfg = DEFAULT_DEPARTMENT_CONFIGS.DINING;
      assert.strictEqual(resolveDeptTitle(cfg, "en"), "In-Room Dining");
      assert.strictEqual(resolveDeptTitle(cfg, "si"), "කාමර ආහාර සේවා");
      assert.strictEqual(resolveDeptTitle(cfg, "ta"), "அறை உணவு சேவை");

      const partial: DepartmentScheduleConfig = {
        ...cfg,
        title: { en: "Only English Title", si: "", ta: "" },
      };
      assert.strictEqual(resolveDeptTitle(partial, "si"), "Only English Title");
      assert.strictEqual(resolveDeptTitle(partial, "ta"), "Only English Title");
    });
  });

  describe("2. Static Markup & Component Verification", () => {
    it("renders all 5 departments for in-room guest sessions", () => {
      const html = renderToStaticMarkup(
        React.createElement(DepartmentTabs, {
          activeDepartment: "DINING",
          onSelectDepartment: () => {
            /* no-op */
          },
          isRoomSession: true,
        }),
      );

      assert.ok(html.includes('data-testid="department-tabs-nav"'));
      assert.ok(html.includes("In-Room Dining"));
      assert.ok(html.includes("Drinks &amp; Bar") || html.includes("Drinks & Bar"));
      assert.ok(html.includes("Room Amenities"));
      assert.ok(html.includes("Laundry &amp; Pressing") || html.includes("Laundry & Pressing"));
      assert.ok(html.includes("Spa &amp; Excursions") || html.includes("Spa & Excursions"));
    });

    it("hides room-only amenities (Housekeeping & Laundry) for table seated dining", () => {
      const html = renderToStaticMarkup(
        React.createElement(DepartmentTabs, {
          activeDepartment: "DINING",
          onSelectDepartment: () => {
            /* no-op */
          },
          isRoomSession: false,
        }),
      );

      assert.ok(html.includes("In-Room Dining"));
      assert.ok(html.includes("Drinks &amp; Bar") || html.includes("Drinks & Bar"));
      assert.ok(html.includes("Spa &amp; Excursions") || html.includes("Spa & Excursions"));
      assert.ok(!html.includes("Room Amenities"));
      assert.ok(!html.includes("Laundry &amp; Pressing"));
    });

    it("marks active department with aria-pressed='true' and highlighted styling", () => {
      const html = renderToStaticMarkup(
        React.createElement(DepartmentTabs, {
          activeDepartment: "BAR",
          onSelectDepartment: () => {
            /* no-op */
          },
          isRoomSession: true,
        }),
      );

      assert.ok(html.includes('data-testid="department-tab-BAR"'));
      assert.ok(html.includes('aria-pressed="true"'));
      assert.ok(html.includes("bg-sky-600 text-white"));
    });

    it("verifies constructible types and configs", () => {
      const dept: QrDepartment = "DINING";
      const config: DepartmentScheduleConfig = DEFAULT_DEPARTMENT_CONFIGS.DINING;
      const props: DepartmentTabsProps = {
        activeDepartment: dept,
        onSelectDepartment: () => {
          /* no-op */
        },
      };

      assert.ok(dept && config && props);
      assert.strictEqual(Object.keys(DEFAULT_DEPARTMENT_CONFIGS).length, 5);
    });
  });
});
