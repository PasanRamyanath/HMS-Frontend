/**
 * Unit Tests for Step 298: Unified Staff Smartphone Launcher & Hub (StaffMobileHub.tsx)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HUB_BADGES,
  DEFAULT_STAFF_USER,
  HUB_TRANSLATIONS,
  type HubBadgeCounts,
  StaffMobileHub,
  type StaffRole,
  type StaffToolId,
  type StaffUserProfile,
  type ToolTileConfig,
  formatShiftDuration,
  getRoleDefaultTool,
  getToolAccentBorder,
  getToolBadgeBg,
} from "../src/staff/StaffMobileHub.js";

describe("Step 298: Unified Staff Smartphone Launcher & Hub (StaffMobileHub.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Role-to-Tool Mapping & Shift Durations
  // --------------------------------------------------------------------------
  describe("1. Role-to-Tool Mapping & Shift Timers", () => {
    it("maps culinary roles to Kitchen KDS", () => {
      assert.strictEqual(getRoleDefaultTool("HEAD_CHEF"), "KITCHEN_KDS");
      assert.strictEqual(getRoleDefaultTool("SOUS_CHEF"), "KITCHEN_KDS");
      assert.strictEqual(getRoleDefaultTool("LINE_COOK"), "KITCHEN_KDS");
    });

    it("maps bar, service, runner, buffet and housekeeping roles accurately", () => {
      assert.strictEqual(getRoleDefaultTool("BARTENDER"), "BAR_BOT");
      assert.strictEqual(getRoleDefaultTool("WAITER"), "WAITER_POS");
      assert.strictEqual(getRoleDefaultTool("CAPTAIN"), "WAITER_POS");
      assert.strictEqual(getRoleDefaultTool("ROOM_SERVICE_RUNNER"), "ORDER_RUNNER");
      assert.strictEqual(getRoleDefaultTool("BUFFET_HOST"), "BUFFET_HOST");
      assert.strictEqual(getRoleDefaultTool("HOUSEKEEPING"), "HOUSEKEEPING");
    });

    it("computes formatted shift duration in HH:MM:SS format", () => {
      const fixedNow = 1770000000000;
      // 2 hours, 15 minutes, 30 seconds before fixedNow
      const startMs = fixedNow - (2 * 3600 + 15 * 60 + 30) * 1000;
      const startIso = new Date(startMs).toISOString();

      const duration = formatShiftDuration(startIso, fixedNow);
      assert.strictEqual(duration, "02:15:30");
    });

    it("returns 00:00:00 fallback when timestamp is invalid or in the future", () => {
      assert.strictEqual(formatShiftDuration("invalid-iso-date"), "00:00:00");
      // Future timestamp
      const futureIso = new Date(Date.now() + 100000).toISOString();
      assert.strictEqual(formatShiftDuration(futureIso), "00:00:00");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Styling Tokens & Apple HIG Dynamic Colors
  // --------------------------------------------------------------------------
  describe("2. Styling Tokens & Apple Dynamic Colors", () => {
    it("returns correct accent border classes per tool", () => {
      assert.strictEqual(
        getToolAccentBorder("KITCHEN_KDS"),
        "border-[#FF9500]/40 hover:border-[#FF9500]",
      );
      assert.strictEqual(
        getToolAccentBorder("BAR_BOT"),
        "border-[#AF52DE]/40 hover:border-[#AF52DE]",
      );
      assert.strictEqual(
        getToolAccentBorder("WAITER_POS"),
        "border-[#007AFF]/40 hover:border-[#007AFF]",
      );
      assert.strictEqual(
        getToolAccentBorder("ORDER_RUNNER"),
        "border-[#34C759]/40 hover:border-[#34C759]",
      );
      assert.strictEqual(
        getToolAccentBorder("BUFFET_HOST"),
        "border-[#30B0C7]/40 hover:border-[#30B0C7]",
      );
      assert.strictEqual(
        getToolAccentBorder("HOUSEKEEPING"),
        "border-[#FF9500]/40 hover:border-[#FF9500]",
      );
    });

    it("returns high-contrast badge backgrounds per tool", () => {
      assert.strictEqual(getToolBadgeBg("KITCHEN_KDS"), "bg-[#FF9500] text-black");
      assert.strictEqual(getToolBadgeBg("BAR_BOT"), "bg-[#AF52DE] text-white");
      assert.strictEqual(getToolBadgeBg("WAITER_POS"), "bg-[#007AFF] text-white");
      assert.strictEqual(getToolBadgeBg("ORDER_RUNNER"), "bg-[#34C759] text-black");
      assert.strictEqual(getToolBadgeBg("BUFFET_HOST"), "bg-[#30B0C7] text-black");
      assert.strictEqual(getToolBadgeBg("HOUSEKEEPING"), "bg-[#FF9500] text-black");
    });
  });

  // --------------------------------------------------------------------------
  // 3. Trilingual Localization Bundles
  // --------------------------------------------------------------------------
  describe("3. Trilingual Localization Bundles", () => {
    it("provides complete trilingual titles and subtitles for all 6 tools", () => {
      const tools: StaffToolId[] = [
        "KITCHEN_KDS",
        "BAR_BOT",
        "WAITER_POS",
        "ORDER_RUNNER",
        "BUFFET_HOST",
        "HOUSEKEEPING",
      ];

      for (const lng of ["en", "si", "ta"] as const) {
        const bundle = HUB_TRANSLATIONS[lng];
        assert.ok(bundle.staffHubTitle.length > 0);
        assert.ok(bundle.driverVouchers.length > 0);
        assert.ok(bundle.shiftZRead.length > 0);
        assert.ok(bundle.chef86Stock.length > 0);

        for (const tool of tools) {
          assert.ok(bundle.tools[tool].title.length > 0);
          assert.ok(bundle.tools[tool].subtitle.length > 0);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 4. React Component Rendering (Server / Static Markup)
  // --------------------------------------------------------------------------
  describe("4. React Component Rendering & Apple HIG Layout", () => {
    it("renders default staff hub launcher cleanly with all 6 tools and quick actions", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          hotelName: "CEYLON HERITAGE RESORT & SPA",
          user: DEFAULT_STAFF_USER,
        }),
      );

      // Verifies property header & staff name
      assert.ok(markup.includes("CEYLON HERITAGE RESORT &amp; SPA"));
      assert.ok(markup.includes("Chaminda Rajapaksha"));
      assert.ok(markup.includes("LINE_COOK"));

      // Verifies tools in DOM
      assert.ok(markup.includes("Kitchen KDS"));
      assert.ok(markup.includes("Bar BOT"));
      assert.ok(markup.includes("Waiter POS"));
      assert.ok(markup.includes("Order Runner"));
      assert.ok(markup.includes("Buffet Host"));
      assert.ok(markup.includes("Housekeeping"));

      // Verifies quick actions
      assert.ok(markup.includes("Driver Meal Vouchers"));
      assert.ok(markup.includes("Daily Z-Read Register"));
      assert.ok(markup.includes("Chef &#x27;86 Item&#x27; Drawer"));

      // Verifies Apple HIG classes
      assert.ok(markup.includes("apple-liquid-glass"));
      assert.ok(markup.includes("tabular-nums-lkr"));
    });

    it("renders trilingual localized staff hub in Sinhala", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          language: "si",
          hotelName: "යාල වනජීවී නිවාඩු නිකේතනය",
        }),
      );

      assert.ok(markup.includes("කාර්ය මණ්ඩල මෙහෙයුම් කේන්ද්රය"));
      assert.ok(markup.includes("කුස්සිය (KDS)"));
      assert.ok(markup.includes("පානයන් (BOT)"));
      assert.ok(markup.includes("වේටර් POS"));
      assert.ok(markup.includes("රියදුරු ආහාර වවුචර්"));
    });

    it("renders trilingual localized staff hub in Tamil", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          language: "ta",
          hotelName: "சிலோன் ஹெரிடேஜ் ரிசார்ட்",
        }),
      );

      assert.ok(markup.includes("ஊழியர் மொபைல் மையம்"));
      assert.ok(markup.includes("சமையலறை (KDS)"));
      assert.ok(markup.includes("பானங்கள் (BOT)"));
      assert.ok(markup.includes("ஓட்டுநர் உணவு வவுச்சர்கள்"));
    });

    it("renders urgent SLA alert banner when alerts count is greater than zero", () => {
      const markupWithAlerts = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          badgeCounts: { urgentSlaAlertsCount: 5 },
        }),
      );
      assert.ok(markupWithAlerts.includes("5 Urgent Alerts"));

      const markupWithoutAlerts = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          badgeCounts: { urgentSlaAlertsCount: 0 },
        }),
      );
      assert.ok(!markupWithoutAlerts.includes("Urgent Alerts"));
    });

    it("renders embedded full-screen tool with return bar when initialView is specified", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StaffMobileHub, {
          initialView: "BAR_BOT",
        }),
      );

      assert.ok(markup.includes("Return to Hub"));
      assert.ok(markup.includes("Bar BOT"));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Type Contract Verification
  // --------------------------------------------------------------------------
  describe("5. Type Contract Verification", () => {
    it("ensures all exported interfaces and types are structurally sound", () => {
      const profile: StaffUserProfile = {
        id: "usr-01",
        name: "Sunil Silva",
        role: "HEAD_CHEF" as StaffRole,
        department: "Kitchen",
        tenantId: "cinnamon-wild-yala",
        shiftStartTimeIso: "2026-10-20T08:00:00Z",
        avatarInitials: "SS",
      };
      assert.strictEqual(profile.role, "HEAD_CHEF");

      const badges: HubBadgeCounts = DEFAULT_HUB_BADGES;
      assert.strictEqual(badges.activeKitchenKotCount, 6);

      const tileConfig: ToolTileConfig = {
        id: "KITCHEN_KDS",
        title: "Kitchen KDS",
        subtitle: "Cooking queue",
        badgeCount: 5,
        accentColor: "#FF9500",
        iconSvg: "Kitchen",
      };
      assert.strictEqual(tileConfig.id, "KITCHEN_KDS");
    });
  });
});
