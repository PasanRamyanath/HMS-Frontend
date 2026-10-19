import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ROOMS_SEGMENTED_OPTIONS,
  ROOMS_TABS,
  RoomsAndRatesPage,
  type RoomsAndRatesPageProps,
  type RoomsTab,
  type RoomsTabId,
} from "../src/admin/rooms/RoomsAndRatesPage.js";

describe("Rooms & Rates Master Page (RoomsAndRatesPage.tsx)", () => {
  describe("Tab Constants & Options", () => {
    it("defines the 5 core room and inventory management tabs", () => {
      assert.equal(ROOMS_TABS.length, 5);
      const tabIds: RoomsTabId[] = ROOMS_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, [
        "PHYSICAL_ROOMS",
        "ROOM_TYPES",
        "RATE_MATRIX",
        "DRIVER_DORM",
        "QR_PRINT",
      ]);
    });

    it("defines 5 segmented control navigation options", () => {
      assert.equal(ROOMS_SEGMENTED_OPTIONS.length, 5);
      const optionIds = ROOMS_SEGMENTED_OPTIONS.map((o) => o.id);
      assert.deepEqual(optionIds, [
        "PHYSICAL_ROOMS",
        "ROOM_TYPES",
        "RATE_MATRIX",
        "DRIVER_DORM",
        "QR_PRINT",
      ]);
    });

    it("contains valid metadata and descriptions across all tabs", () => {
      for (const tab of ROOMS_TABS) {
        assert.ok(tab.label.length > 0);
        assert.ok(tab.shortLabel.length > 0);
        assert.ok(tab.description.length > 10);
      }
    });
  });

  describe("Component Static Markup & Sub-Module Rendering", () => {
    it("renders default Physical Rooms tab with RoomInventoryGrid", () => {
      const props: RoomsAndRatesPageProps = {
        propertyTitle: "Galle Fort Lighthouse Villa",
        initialTab: "PHYSICAL_ROOMS",
      };

      const html = renderToStaticMarkup(React.createElement(RoomsAndRatesPage, props));
      assert.ok(html.includes("Physical Rooms &amp; Inventory"));
      assert.ok(html.includes("Rate Quote Simulator"));
      assert.ok(html.includes("Print QR Sheets"));
      // RoomInventoryGrid markers
      assert.ok(
        html.includes("Room Number") || html.includes("Housekeeping") || html.includes("101"),
      );
    });

    it("renders Room Categories tab with RoomTypeManager", () => {
      const props: RoomsAndRatesPageProps = {
        initialTab: "ROOM_TYPES",
      };

      const html = renderToStaticMarkup(React.createElement(RoomsAndRatesPage, props));
      assert.ok(html.includes("Room Categories &amp; Capacities"));
      assert.ok(html.includes("Deluxe") || html.includes("Suite") || html.includes("Villa"));
    });

    it("renders Rate Matrix tab with dual-currency tariff grid", () => {
      const props: RoomsAndRatesPageProps = {
        initialTab: "RATE_MATRIX",
      };

      const html = renderToStaticMarkup(React.createElement(RoomsAndRatesPage, props));
      assert.ok(html.includes("Dual-Currency Rates &amp; Meal Plans"));
      assert.ok(
        html.includes("Room Only") || html.includes("Bed &amp; Breakfast") || html.includes("LKR"),
      );
    });

    it("renders Driver Dorms tab with DriverDormManager", () => {
      const props: RoomsAndRatesPageProps = {
        initialTab: "DRIVER_DORM",
      };

      const html = renderToStaticMarkup(React.createElement(RoomsAndRatesPage, props));
      assert.ok(html.includes("Driver Dorms &amp; Chauffeur Quarters"));
      assert.ok(html.includes("Driver Quarters") || html.includes("Bunk"));
    });

    it("renders QR Print tab with QrLocationManager", () => {
      const props: RoomsAndRatesPageProps = {
        initialTab: "QR_PRINT",
      };

      const html = renderToStaticMarkup(React.createElement(RoomsAndRatesPage, props));
      assert.ok(html.includes("Contactless QR Standees &amp; Tents"));
      assert.ok(html.includes("QR Locations") || html.includes("Location"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies RoomsTab and RoomsAndRatesPageProps are constructible", () => {
      const tab: RoomsTab = {
        id: "PHYSICAL_ROOMS",
        label: "Physical Rooms",
        shortLabel: "Rooms",
        description: "Test description",
        badge: "Test Badge",
      };
      assert.equal(tab.id, "PHYSICAL_ROOMS");
    });
  });
});
