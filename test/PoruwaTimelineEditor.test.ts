/**
 * Unit Tests for Step 331: Auspicious Nekath / Poruwa Ceremony & Event Timeline Builder (PoruwaTimelineEditor.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PORUWA_MILESTONES,
  PoruwaTimelineEditor,
  addMinutesToTimeString,
  getDepartmentBadge,
  getMilestoneStatusBadge,
  getNextMilestoneStatus,
  shiftAllMilestones,
} from "../src/admin/banquets/index.js";

describe("Step 331: Auspicious Nekath / Poruwa Ceremony & Event Timeline Builder (PoruwaTimelineEditor.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Helper Functions
  // --------------------------------------------------------------------------
  describe("1. Pure Time Shift & State Transition Helpers", () => {
    it("addMinutesToTimeString adds and subtracts minutes with hour rollover", () => {
      assert.strictEqual(addMinutesToTimeString("09:18", 15), "09:33");
      assert.strictEqual(addMinutesToTimeString("09:45", 30), "10:15");
      assert.strictEqual(addMinutesToTimeString("10:00", -15), "09:45");
      assert.strictEqual(addMinutesToTimeString("00:10", -30), "00:00"); // clamped
    });

    it("shiftAllMilestones shifts all items by minutes delta", () => {
      const shifted = shiftAllMilestones(DEFAULT_PORUWA_MILESTONES, 15);
      assert.strictEqual(shifted[0]?.time, "08:15");
      assert.strictEqual(shifted[3]?.time, "09:33"); // 09:18 + 15m = 09:33
    });

    it("getNextMilestoneStatus cycles through PENDING -> IN_PROGRESS -> COMPLETED -> PENDING", () => {
      assert.strictEqual(getNextMilestoneStatus("PENDING"), "IN_PROGRESS");
      assert.strictEqual(getNextMilestoneStatus("IN_PROGRESS"), "COMPLETED");
      assert.strictEqual(getNextMilestoneStatus("COMPLETED"), "PENDING");
      assert.strictEqual(getNextMilestoneStatus("DELAYED"), "PENDING");
    });

    it("getDepartmentBadge provides Apple HIG badge classes for all departments", () => {
      const poruwa = getDepartmentBadge("PORUWA_ASHTAKA_TEAM");
      assert.strictEqual(poruwa.label, "Poruwa & Ashtaka");
      assert.ok(poruwa.badgeClass.includes("purple"));

      const chef = getDepartmentBadge("KITCHEN_CHEF");
      assert.strictEqual(chef.label, "Kitchen & Chef");
      assert.ok(chef.badgeClass.includes("emerald"));

      const ac = getDepartmentBadge("AC_ENGINEER");
      assert.strictEqual(ac.label, "AC & Facilities");
      assert.ok(ac.badgeClass.includes("cyan"));
    });

    it("getMilestoneStatusBadge returns status pill styling", () => {
      assert.ok(getMilestoneStatusBadge("COMPLETED").badgeClass.includes("emerald"));
      assert.ok(getMilestoneStatusBadge("IN_PROGRESS").badgeClass.includes("amber"));
      assert.ok(getMilestoneStatusBadge("DELAYED").badgeClass.includes("red"));
      assert.ok(getMilestoneStatusBadge("PENDING").badgeClass.includes("zinc"));
    });
  });

  // --------------------------------------------------------------------------
  // 2. React Server-Side Component Rendering & Apple HIG Verification
  // --------------------------------------------------------------------------
  describe("2. React Component Static Rendering", () => {
    it("renders default Poruwa timeline view with event title, couple names, and hall name", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          eventTitle: "Kavinda & Tharushi Poruwa Wedding",
          eventDate: "2026-10-24",
          hallName: "Grand Ballroom",
          coupleNames: "Kavinda Senaratne & Tharushi Wickramasinghe",
          language: "en",
        }),
      );

      assert.ok(
        html.includes("Auspicious Poruwa &amp; Wedding Event Timeline") ||
          html.includes("Auspicious Poruwa & Wedding Event Timeline"),
      );
      assert.ok(html.includes("Grand Ballroom"));
      assert.ok(
        html.includes("Kavinda &amp; Tharushi Poruwa Wedding") ||
          html.includes("Kavinda & Tharushi Poruwa Wedding"),
      );
      assert.ok(
        html.includes("Kavinda Senaratne &amp; Tharushi Wickramasinghe") ||
          html.includes("Kavinda Senaratne & Tharushi Wickramasinghe"),
      );
    });

    it("renders crucial Astrological Nekath badge for auspicious milestones", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          language: "en",
        }),
      );

      assert.ok(html.includes("AUSPICIOUS NEKATH (නැකත)"));
      assert.ok(html.includes("09:18")); // Nekath ascending
      assert.ok(html.includes("09:45")); // Nekath descending
      assert.ok(html.includes("15:15")); // Going away
    });

    it("renders schedule shift utility buttons (+10m, +15m, -15m)", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          language: "en",
        }),
      );

      assert.ok(html.includes("+10 Mins Shift"));
      assert.ok(html.includes("+15 Mins Shift"));
      assert.ok(html.includes("-15 Mins Shift"));
    });

    it("renders department filter tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          language: "en",
        }),
      );

      assert.ok(html.includes("All Departments"));
      assert.ok(html.includes("Auspicious Nekath Only"));
      assert.ok(html.includes("Banquet Captain"));
      assert.ok(html.includes("Kitchen &amp; Buffet") || html.includes("Kitchen & Buffet"));
      assert.ok(html.includes("AC &amp; Facilities") || html.includes("AC & Facilities"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          language: "si",
        }),
      );

      assert.ok(html.includes("සුබ නැකත් සහ මංගල උත්සව කාලසටහන"));
      assert.ok(html.includes("අලුත් වේලාවක් එක්කරන්න"));
      assert.ok(html.includes("කාලසටහන සුරකින්න"));
      assert.ok(html.includes("සුබ නැකත් පමණක්"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoruwaTimelineEditor, {
          language: "ta",
        }),
      );

      assert.ok(html.includes("சுப முகூர்த்தம் மற்றும் திருமண நிகழ்வு காலவரிசை"));
      assert.ok(html.includes("புதிய நிகழ்வைச் சேர்க்கவும்"));
      assert.ok(html.includes("காலவரிசையைச் சேமி"));
    });
  });
});
