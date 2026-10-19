import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AMENITY_PRESETS,
  type AmenityPreset,
  ExpressHousekeepingTab,
  type ExpressHousekeepingTabProps,
  type HousekeepingRequest,
  type HousekeepingRequestType,
  type HousekeepingUrgency,
  type RequestStatus,
  createHousekeepingRequest,
  getHousekeepingText,
  getStatusBadgeClass,
} from "../src/qr/ExpressHousekeepingTab.js";

describe("Step 263: 1-Tap Express Housekeeping & Room Amenity Request Panel (ExpressHousekeepingTab.tsx)", () => {
  describe("1. Pure Helper Utilities", () => {
    it("creates structured housekeeping request object", () => {
      const req = createHousekeepingRequest(
        "Room 104",
        "EXTRA_TOWELS",
        "URGENT",
        "Please hurry",
        2,
      );
      assert.match(req.id, /^HK-EXTRA_TOWELS-[A-Z0-9]+$/);
      assert.strictEqual(req.roomNumber, "Room 104");
      assert.strictEqual(req.type, "EXTRA_TOWELS");
      assert.strictEqual(req.urgency, "URGENT");
      assert.strictEqual(req.status, "PENDING");
      assert.strictEqual(req.notes, "Please hurry");
      assert.strictEqual(req.quantity, 2);
      assert.ok(req.requestedAt);
    });

    it("returns distinct badge styling classes for request statuses", () => {
      assert.ok(getStatusBadgeClass("PENDING").includes("amber"));
      assert.ok(getStatusBadgeClass("DISPATCHED").includes("sky"));
      assert.ok(getStatusBadgeClass("COMPLETED").includes("emerald"));
    });
  });

  describe("2. Trilingual Localization Catalog", () => {
    it("returns correct translations across English, Sinhala, and Tamil", () => {
      const en = getHousekeepingText("en");
      assert.strictEqual(en.headerTitle, "Express Housekeeping & Amenities");
      assert.strictEqual(en.presets.MAKE_UP_ROOM.title, "Make Up Room");
      assert.strictEqual(en.presets.MOSQUITO_SHIELD.title, "Mosquito Shield");
      assert.strictEqual(en.presets.DO_NOT_DISTURB.title, "Do Not Disturb");

      const si = getHousekeepingText("si");
      assert.strictEqual(si.headerTitle, "ක්ෂණික කාමර සේවා සහ පහසුකම්");
      assert.strictEqual(si.presets.MAKE_UP_ROOM.title, "කාමරය පිරිසිදු කරන්න");
      assert.strictEqual(si.presets.MOSQUITO_SHIELD.title, "මදුරු දඟර / වාෂ්පකාරක");

      const ta = getHousekeepingText("ta");
      assert.strictEqual(ta.headerTitle, "துரித அறை பராமரிப்பு & வசதிகள்");
      assert.strictEqual(ta.presets.MAKE_UP_ROOM.title, "அறையை சுத்தம் செய்க");
      assert.strictEqual(ta.presets.MOSQUITO_SHIELD.title, "கொசு விரட்டி");
    });
  });

  describe("3. Amenity Presets Catalog", () => {
    it("defines 8 essential hotel & villa amenity presets", () => {
      assert.strictEqual(AMENITY_PRESETS.length, 8);
      const types = AMENITY_PRESETS.map((p: AmenityPreset) => p.type);
      assert.ok(types.includes("MAKE_UP_ROOM"));
      assert.ok(types.includes("DO_NOT_DISTURB"));
      assert.ok(types.includes("EXTRA_TOWELS"));
      assert.ok(types.includes("BOTTLED_WATER"));
      assert.ok(types.includes("MOSQUITO_SHIELD"));
      assert.ok(types.includes("LUGGAGE_PICKUP"));
      assert.ok(types.includes("EXTRA_PILLOWS"));
      assert.ok(types.includes("TOILETRIES_KIT"));
    });
  });

  describe("4. Static Markup Rendering", () => {
    it("renders express housekeeping panel with room number and presets", () => {
      const sampleRequests: HousekeepingRequest[] = [
        {
          id: "HK-WATER-001",
          roomNumber: "Villa 3",
          type: "BOTTLED_WATER",
          urgency: "NORMAL",
          status: "DISPATCHED",
          requestedAt: "2026-10-19T10:00:00Z",
          quantity: 2,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ExpressHousekeepingTab, {
          roomNumber: "Villa 3",
          language: "en",
          initialRequests: sampleRequests,
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="express-housekeeping-tab"'));

      // Room name & header
      assert.ok(html.includes("Villa 3"));
      assert.ok(html.includes("Express Housekeeping &amp; Amenities"));

      // Presets
      assert.ok(html.includes("Make Up Room"));
      assert.ok(html.includes("Fresh Towels"));
      assert.ok(html.includes("Mineral Water"));
      assert.ok(html.includes("Mosquito Shield"));

      // Active request item
      assert.ok(html.includes("Mineral Water (×2)"));
      assert.ok(html.includes("Runner on the Way"));
    });

    it("renders Sinhala view correctly with empty requests notice", () => {
      const html = renderToStaticMarkup(
        React.createElement(ExpressHousekeepingTab, {
          roomNumber: "Room 205",
          language: "si",
          initialRequests: [],
        }),
      );

      assert.ok(html.includes("ක්ෂණික කාමර සේවා සහ පහසුකම්"));
      assert.ok(html.includes("කාමරය පිරිසිදු කරන්න"));
      assert.ok(html.includes("පොරොත්තු ඉල්ලීම් නොමැත."));
    });
  });

  describe("5. TypeScript Interface Constructibility", () => {
    it("constructs type-safe housekeeping request and props", () => {
      const status: RequestStatus = "COMPLETED";
      const urgency: HousekeepingUrgency = "NORMAL";
      const type: HousekeepingRequestType = "EXTRA_PILLOWS";

      const req: HousekeepingRequest = {
        id: "HK-12345",
        roomNumber: "Room 102",
        type,
        urgency,
        status,
        requestedAt: "2026-10-19T11:00:00Z",
        notes: "Soft pillows please",
        quantity: 2,
      };

      assert.strictEqual(req.type, "EXTRA_PILLOWS");
      assert.strictEqual(req.status, "COMPLETED");

      const props: ExpressHousekeepingTabProps = {
        roomNumber: "Room 102",
        language: "ta",
        onRequestSubmitted: () => {
          /* noop */
        },
        initialRequests: [req],
        testId: "custom-hk-test",
      };

      assert.strictEqual(props.roomNumber, "Room 102");
      assert.strictEqual(props.testId, "custom-hk-test");
    });
  });
});
