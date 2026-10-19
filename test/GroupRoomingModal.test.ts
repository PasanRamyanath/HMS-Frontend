import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AvailableRoomOption,
  type FolioRoutingMode,
  type GroupRoomingImportResult,
  GroupRoomingModal,
  type GroupRoomingModalProps,
  type RoomingListEntry,
  SAMPLE_15_ROOM_TOUR_ROSTER,
  parseRoomingListText,
} from "../src/admin/frontdesk/GroupRoomingModal.js";

describe("Multi-Room Group & Round-Tour Rooming List Importer (GroupRoomingModal.tsx)", () => {
  describe("Rooming List Parser (parseRoomingListText)", () => {
    it("parses the standard 15-room tour bus sample roster completely", () => {
      const res = parseRoomingListText(SAMPLE_15_ROOM_TOUR_ROSTER);

      assert.strictEqual(res.totalRooms, 15);
      assert.strictEqual(res.validCount, 15);
      assert.strictEqual(res.invalidCount, 0);
      assert.ok(res.totalGuests >= 26); // Combination of double and single occupancy

      // Verify row 1 (Arthur & Clara Pendelton)
      const row1 = res.entries[0];
      assert.ok(row1);
      assert.strictEqual(row1.roomNumber, "101");
      assert.strictEqual(row1.primaryGuestName, "Arthur Pendelton");
      assert.strictEqual(row1.secondaryGuestName, "Clara Pendelton");
      assert.strictEqual(row1.identityDocument, "GB-9841204");
      assert.strictEqual(row1.nationality, "British");
      assert.strictEqual(row1.mealPlan, "HB");
      assert.strictEqual(row1.specialRequests, "Twin beds requested");
      assert.strictEqual(row1.isValid, true);

      // Verify single occupancy row (Pierre Moreau)
      const singleRow = res.entries.find((e) => e.roomNumber === "106");
      assert.ok(singleRow);
      assert.strictEqual(singleRow.primaryGuestName, "Pierre Moreau");
      assert.strictEqual(singleRow.secondaryGuestName, undefined);
      assert.strictEqual(singleRow.mealPlan, "HB");
    });

    it("parses tab-separated values pasted directly from Excel", () => {
      const tsv = [
        "Room\tPrimary Guest\tSecondary Guest\tPassport\tNationality\tMeal Plan\tNotes",
        "201\tKlaus Mueller\tHelga Mueller\tDE-123456\tGerman\tFB\tGround floor",
        "202\tJean Dupont\t\tFR-987654\tFrench\tBB\tLate arrival",
      ].join("\n");

      const res = parseRoomingListText(tsv);
      assert.strictEqual(res.totalRooms, 2);
      assert.strictEqual(res.validCount, 2);
      assert.strictEqual(res.totalGuests, 3); // 201 has 2, 202 has 1

      assert.strictEqual(res.entries[0]?.roomNumber, "201");
      assert.strictEqual(res.entries[0]?.mealPlan, "FB");
      assert.strictEqual(res.entries[1]?.roomNumber, "202");
      assert.strictEqual(res.entries[1]?.mealPlan, "BB");
    });

    it("flags missing room numbers or missing primary guest names as invalid", () => {
      const badData = [",No Room Number,,,German,HB,", "301,,,,British,HB,"].join("\n");

      const res = parseRoomingListText(badData);
      assert.strictEqual(res.validCount, 0);
      assert.strictEqual(res.invalidCount, 2);
      assert.strictEqual(res.entries[0]?.isValid, false);
      assert.strictEqual(res.entries[0]?.validationError, "Missing room number");
      assert.strictEqual(res.entries[1]?.isValid, false);
      assert.strictEqual(res.entries[1]?.validationError, "Missing primary guest name");
    });

    it("handles empty or whitespace-only input safely", () => {
      const res = parseRoomingListText("   \n\n  ");
      assert.strictEqual(res.totalRooms, 0);
      assert.strictEqual(res.validCount, 0);
      assert.strictEqual(res.invalidCount, 0);
      assert.strictEqual(res.entries.length, 0);
    });
  });

  describe("Type Definitions & Models Verification", () => {
    it("ensures all interfaces are constructible and strongly typed", () => {
      const mode: FolioRoutingMode = "DMC_MASTER_SPLIT";
      const entry: RoomingListEntry = {
        id: "entry-1",
        rowNumber: 1,
        roomNumber: "101",
        primaryGuestName: "John Doe",
        nationality: "British",
        mealPlan: "HB",
        isValid: true,
      };

      const roomOpt: AvailableRoomOption = {
        id: "room-101",
        roomNumber: "101",
        roomTypeName: "Deluxe Ocean Villa",
        isAvailable: true,
      };

      const result: GroupRoomingImportResult = {
        groupName: "Test Group",
        groupReference: "GRP-001",
        folioRouting: mode,
        entries: [entry],
        validCount: 1,
        invalidCount: 0,
        totalRooms: 1,
        totalGuests: 1,
      };

      const modalProps: GroupRoomingModalProps = {
        isOpen: true,
        onClose: () => undefined,
      };

      assert.strictEqual(result.folioRouting, "DMC_MASTER_SPLIT");
      assert.strictEqual(roomOpt.roomNumber, "101");
      assert.strictEqual(modalProps.isOpen, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders modal header, group metadata inputs, and folio routing selector", () => {
      const html = renderToStaticMarkup(
        React.createElement(GroupRoomingModal, {
          isOpen: true,
          onClose: () => undefined,
          initialGroupName: "Kuoni Sri Lanka Highlights Tour",
          initialGroupReference: "KUONI-SL-2026-NOV",
        }),
      );

      assert.ok(
        html.includes("Multi-Room Group &amp; Round-Tour Rooming List Importer") ||
          html.includes("Multi-Room Group & Round-Tour Rooming List Importer"),
      );
      assert.ok(html.includes("Kuoni Sri Lanka Highlights Tour"));
      assert.ok(html.includes("KUONI-SL-2026-NOV"));
      assert.ok(html.includes("Folio Billing Architecture"));
      assert.ok(html.includes("DMC Master + Guest Personal Extras"));
    });

    it("renders preview table with parsed rows from sample roster", () => {
      const html = renderToStaticMarkup(
        React.createElement(GroupRoomingModal, {
          isOpen: true,
          onClose: () => undefined,
        }),
      );

      assert.ok(html.includes("Arthur Pendelton"));
      assert.ok(html.includes("Clara Pendelton"));
      assert.ok(html.includes("101"));
      assert.ok(html.includes("GB-9841204"));
      assert.ok(html.includes("Twin beds requested"));
      assert.ok(html.includes("Pierre Moreau"));
      assert.ok(html.includes("15 Rooms"));
    });

    it("renders disabled button and controls when disabled is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(GroupRoomingModal, {
          isOpen: true,
          onClose: () => undefined,
          disabled: true,
        }),
      );

      assert.ok(html.includes("disabled"));
    });
  });
});
