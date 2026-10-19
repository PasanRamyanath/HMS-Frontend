import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BulkCreateRoomConfig,
  DEFAULT_PHYSICAL_ROOMS,
  RoomInventoryGrid,
  type RoomInventoryGridProps,
  generateBulkRooms,
  getHousekeepingBadgeColor,
  validateRoom,
} from "../src/admin/rooms/RoomInventoryGrid.js";
import { HousekeepingStatus } from "../src/generated/graphql.js";

describe("Physical Room & Villa Inventory Grid (RoomInventoryGrid.tsx)", () => {
  describe("Bulk Room Generator (generateBulkRooms)", () => {
    it("generates sequential rooms accurately from 101 to 105", () => {
      const config: BulkCreateRoomConfig = {
        prefix: "",
        startNumber: 101,
        endNumber: 105,
        roomTypeId: "rt-deluxe-ocean",
        building: "Ocean Wing",
        floor: "1",
        isSmokingAllowed: false,
        isAccessible: true,
      };

      const rooms = generateBulkRooms(config, "Deluxe Ocean View");
      assert.strictEqual(rooms.length, 5);
      const first = rooms[0];
      const last = rooms[4];
      assert.ok(first);
      assert.ok(last);
      assert.strictEqual(first.roomNumber, "101");
      assert.strictEqual(first.building, "Ocean Wing");
      assert.strictEqual(first.floor, "1");
      assert.strictEqual(first.isAccessible, true);
      assert.strictEqual(first.isOccupied, false);
      assert.strictEqual(first.housekeepingStatus, HousekeepingStatus.Clean);
      assert.strictEqual(last.roomNumber, "105");
    });

    it("generates prefixed rooms (e.g. Cabana 1 to 4)", () => {
      const config: BulkCreateRoomConfig = {
        prefix: "Cabana ",
        startNumber: 1,
        endNumber: 4,
        roomTypeId: "rt-pool-cabana",
        building: "Beachfront",
        floor: "Ground",
        isSmokingAllowed: true,
        isAccessible: false,
      };

      const rooms = generateBulkRooms(config, "Pool Cabana");
      assert.strictEqual(rooms.length, 4);
      const first = rooms[0];
      const last = rooms[3];
      assert.ok(first);
      assert.ok(last);
      assert.strictEqual(first.roomNumber, "Cabana 1");
      assert.strictEqual(first.isSmokingAllowed, true);
      assert.strictEqual(last.roomNumber, "Cabana 4");
    });

    it("handles inverted ranges safely (e.g. 105 down to 101)", () => {
      const config: BulkCreateRoomConfig = {
        prefix: "",
        startNumber: 105,
        endNumber: 101,
        roomTypeId: "rt-std",
        building: "Main",
        floor: "1",
        isSmokingAllowed: false,
        isAccessible: false,
      };

      const rooms = generateBulkRooms(config, "Standard");
      assert.strictEqual(rooms.length, 5);
      const first = rooms[0];
      assert.ok(first);
      assert.strictEqual(first.roomNumber, "101");
    });
  });

  describe("Room Validation (validateRoom)", () => {
    it("rejects empty room numbers", () => {
      const res = validateRoom(
        { roomNumber: "  ", building: "Main", floor: "1", roomTypeId: "rt-1" },
        DEFAULT_PHYSICAL_ROOMS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /room or villa number is required/i);
    });

    it("rejects duplicate room numbers case-insensitively", () => {
      const res = validateRoom(
        { roomNumber: "101", building: "Main", floor: "1", roomTypeId: "rt-1" },
        DEFAULT_PHYSICAL_ROOMS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /already exists/i);
    });

    it("allows updating an existing room without reporting duplicate of itself", () => {
      const res = validateRoom(
        { roomNumber: "101", building: "Ocean Wing Updated", floor: "1", roomTypeId: "rt-1" },
        DEFAULT_PHYSICAL_ROOMS,
        "room-101",
      );
      assert.strictEqual(res.isValid, true);
    });

    it("rejects missing building or floor", () => {
      const res1 = validateRoom(
        { roomNumber: "999", building: "", floor: "1", roomTypeId: "rt-1" },
        DEFAULT_PHYSICAL_ROOMS,
      );
      assert.strictEqual(res1.isValid, false);
      assert.match(res1.error ?? "", /building or wing is required/i);

      const res2 = validateRoom(
        { roomNumber: "999", building: "Wing", floor: "", roomTypeId: "rt-1" },
        DEFAULT_PHYSICAL_ROOMS,
      );
      assert.strictEqual(res2.isValid, false);
      assert.match(res2.error ?? "", /floor number is required/i);
    });

    it("rejects missing room category", () => {
      const res = validateRoom(
        { roomNumber: "999", building: "Wing", floor: "1", roomTypeId: "" },
        DEFAULT_PHYSICAL_ROOMS,
      );
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /assigned room category is required/i);
    });
  });

  describe("Housekeeping Status Colors (getHousekeepingBadgeColor)", () => {
    it("maps all HousekeepingStatus values to valid status colors", () => {
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Clean), "green");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Inspected), "blue");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Dirty), "amber");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.TouchUp), "amber");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.OutOfOrder), "red");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.OutOfService), "red");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.DoNotDisturb), "indigo");
    });
  });

  describe("Component Static Rendering & Contract", () => {
    it("renders RoomInventoryGrid with default rooms and stats bar", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomInventoryGrid, {} as RoomInventoryGridProps),
      );
      assert.ok(html.includes("Physical Room &amp; Villa Inventory Grid"));
      assert.ok(html.includes("Total Rooms"));
      assert.ok(html.includes("Vacant Clean"));
      assert.ok(html.includes("101"));
      assert.ok(html.includes("102"));
      assert.ok(html.includes("Cabana 1"));
      assert.ok(html.includes("+ Bulk Create"));
      assert.ok(html.includes("+ Add Room"));
    });

    it("renders readOnly mode suppressing mutating controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoomInventoryGrid, {
          readOnly: true,
        } as RoomInventoryGridProps),
      );
      assert.ok(!html.includes("+ Bulk Create"));
      assert.ok(!html.includes("+ Add Room"));
      assert.ok(!html.includes("Save Rooms"));
    });
  });
});
