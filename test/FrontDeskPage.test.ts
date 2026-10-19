import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FRONT_DESK_SEGMENTED_OPTIONS,
  FRONT_DESK_TABS,
  FrontDeskPage,
  type FrontDeskPageProps,
  type FrontDeskTab,
  type FrontDeskTabId,
} from "../src/admin/frontdesk/FrontDeskPage.js";

const noop = () => {
  // no-op for tests
};

describe("Master Front-Desk Workspace Page (FrontDeskPage.tsx)", () => {
  describe("1. Tab Configurations & Segmented Control Options", () => {
    it("defines all 6 primary front-desk workspace tabs", () => {
      assert.strictEqual(FRONT_DESK_TABS.length, 6);
      const tabIds = FRONT_DESK_TABS.map((t) => t.id);
      assert.deepStrictEqual(tabIds, [
        "TAPE_CHART",
        "DAILY_BOARD",
        "DRIVER_QUARTERS",
        "MEAL_FORECAST",
        "POLICE_REGISTER",
        "DMC_CONTRACTS",
      ]);
    });

    it("maps 1-to-1 with segmented control options", () => {
      assert.strictEqual(FRONT_DESK_SEGMENTED_OPTIONS.length, 6);
      for (const tab of FRONT_DESK_TABS) {
        const option = FRONT_DESK_SEGMENTED_OPTIONS.find((o) => o.id === tab.id);
        assert.ok(option, `Option for tab ${tab.id} should exist`);
      }
    });

    it("verifies shortcut keys assigned 1 through 6", () => {
      const keys = FRONT_DESK_TABS.map((t) => t.shortcutKey);
      assert.deepStrictEqual(keys, ["1", "2", "3", "4", "5", "6"]);
    });
  });

  describe("2. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders master header, metrics strip, and default Tape Chart tab", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Heritance Kandalama Resort",
          initialTab: "TAPE_CHART",
          onTabChange: noop,
          onActionNotify: noop,
        }),
      );

      assert.ok(html.includes("Heritance Kandalama Resort"));
      assert.ok(html.includes("Front-Desk Command Center"));
      assert.ok(html.includes("Tape Chart &amp; Grid"));
      assert.ok(html.includes("Find Guest"));
      assert.ok(html.includes("New Booking"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("Arrivals Today"));
      assert.ok(html.includes("In-House Stays"));
      assert.ok(html.includes("Driver Dorm Beds"));
    });

    it("renders Daily Arrivals & In-House Board tab when selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Cinnamon Grand Colombo",
          initialTab: "DAILY_BOARD",
        }),
      );

      assert.ok(html.includes("Daily Arrivals &amp; In-House"));
      assert.ok(html.includes("Alice Walker"));
      assert.ok(html.includes("Arrivals (1)"));
      assert.ok(html.includes("In-House (2)"));
    });

    it("renders Driver Quarters Board tab when selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Galle Fort Hotel",
          initialTab: "DRIVER_QUARTERS",
        }),
      );

      assert.ok(html.includes("Chauffeur / Driver Quarters"));
      assert.ok(html.includes("Dorm Bed"));
    });

    it("renders Kitchen Meal-Plan Forecast tab when selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Amangalla",
          initialTab: "MEAL_FORECAST",
        }),
      );

      assert.ok(html.includes("Kitchen Meal Forecast"));
    });

    it("renders Tourist Police B-Card Register tab when selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Jetwing Lighthouse",
          initialTab: "POLICE_REGISTER",
        }),
      );

      assert.ok(html.includes("Tourist Police B-Card Register"));
    });

    it("renders DMC & Tour Operators tab when selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(FrontDeskPage, {
          hotelName: "Cape Weligama",
          initialTab: "DMC_CONTRACTS",
        }),
      );

      assert.ok(html.includes("DMC &amp; Tour Operators"));
    });
  });

  describe("3. Types & Domain Invariants", () => {
    it("ensures all exported interfaces and types are constructible", () => {
      const tabId: FrontDeskTabId = "TAPE_CHART";
      const tab: FrontDeskTab = {
        id: tabId,
        label: "Tape Chart",
        shortLabel: "Chart",
        description: "Test description",
        shortcutKey: "1",
        badge: "Test",
      };

      const props: FrontDeskPageProps = {
        hotelName: "Test Hotel",
        initialTab: "DAILY_BOARD",
        onTabChange: noop,
        onActionNotify: noop,
        disabled: false,
      };

      assert.strictEqual(tab.id, "TAPE_CHART");
      assert.strictEqual(props.hotelName, "Test Hotel");
    });
  });
});
