import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_ROOM_TYPES,
  RoomTypeManager,
  type RoomTypeManagerProps,
  type RoomTypeModel,
  SRI_LANKAN_HOTEL_AMENITIES,
  validateRoomType,
} from "../src/admin/rooms/RoomTypeManager.js";

describe("Room Category Master Editor (RoomTypeManager.tsx)", () => {
  describe("Validation Logic (validateRoomType)", () => {
    const baseSample: RoomTypeModel = DEFAULT_ROOM_TYPES[0] ?? {
      id: "rt-sample",
      code: "DLX-OCN",
      name: "Deluxe Ocean View",
      description: "Sample",
      baseRateResidentLkr: 40000,
      baseRateForeignUsd: 130,
      maxOccupancyAdults: 2,
      maxOccupancyChildren: 0,
      extraBedMax: 0,
      totalRoomCount: 5,
      amenities: [],
      photos: [],
      isActive: true,
    };

    it("returns zero errors for valid room type model", () => {
      const errors = validateRoomType(baseSample);
      assert.equal(Object.keys(errors).length, 0);
    });

    it("flags error when room category code or name is missing", () => {
      const invalid: RoomTypeModel = {
        ...baseSample,
        code: " ",
        name: "A",
      };
      const errors = validateRoomType(invalid);
      assert.ok(errors.code, "Should require code >= 2 chars");
      assert.ok(errors.name, "Should require name >= 2 chars");
    });

    it("flags error when resident or foreign pricing is non-positive", () => {
      const invalidPricing: RoomTypeModel = {
        ...baseSample,
        baseRateResidentLkr: 0,
        baseRateForeignUsd: -5,
      };
      const errors = validateRoomType(invalidPricing);
      assert.ok(errors.baseRateResidentLkr, "Should reject non-positive resident rate");
      assert.ok(errors.baseRateForeignUsd, "Should reject non-positive USD rate");
    });

    it("flags error when adult occupancy or total room count is zero", () => {
      const invalidCapacity: RoomTypeModel = {
        ...baseSample,
        maxOccupancyAdults: 0,
        totalRoomCount: 0,
      };
      const errors = validateRoomType(invalidCapacity);
      assert.ok(errors.maxOccupancyAdults, "Adults must be >= 1");
      assert.ok(errors.totalRoomCount, "Room inventory must be >= 1");
    });
  });

  describe("Defaults & Amenity Constants", () => {
    it("provides the 3 standard Sri Lankan room categories in DEFAULT_ROOM_TYPES", () => {
      assert.equal(DEFAULT_ROOM_TYPES.length, 3);
      assert.ok(DEFAULT_ROOM_TYPES.some((rt) => rt.name === "Deluxe Ocean View"));
      assert.ok(DEFAULT_ROOM_TYPES.some((rt) => rt.name === "Family Chalet"));
      assert.ok(DEFAULT_ROOM_TYPES.some((rt) => rt.name === "Standard Double"));
    });

    it("contains essential Sri Lankan hospitality amenities", () => {
      assert.ok(SRI_LANKAN_HOTEL_AMENITIES.includes("Ocean View"));
      assert.ok(SRI_LANKAN_HOTEL_AMENITIES.includes("Ceylon Tea Bar"));
      assert.ok(SRI_LANKAN_HOTEL_AMENITIES.includes("Air Conditioning"));
      assert.ok(SRI_LANKAN_HOTEL_AMENITIES.includes("Plunge Pool"));
    });
  });

  describe("Static Markup Rendering", () => {
    it("renders room category grid with dual-tier pricing and amenities", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomTypeManager, {
          initialRoomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes("Room Category Master Editor"));
      assert.ok(html.includes("Deluxe Ocean View"));
      assert.ok(html.includes("Family Chalet"));
      assert.ok(html.includes("Standard Double"));
      assert.ok(html.includes("DLX-OCN"));
      assert.ok(html.includes("FAM-CHL"));
      assert.ok(html.includes("STD-DBL"));
      assert.ok(html.includes("$140 USD"));
      assert.ok(html.includes("Ocean View"));
      assert.ok(html.includes("+ Add Room Type"));
    });

    it("constructs props conforming to RoomTypeManagerProps cleanly", () => {
      const props: RoomTypeManagerProps = {
        initialRoomTypes: DEFAULT_ROOM_TYPES,
        readOnly: true,
      };
      assert.equal(props.readOnly, true);
    });
  });
});
