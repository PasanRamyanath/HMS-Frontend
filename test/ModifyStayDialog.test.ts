import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AvailableRoomOption,
  type CurrentStayDetails,
  ModifyStayDialog,
  type ModifyStayDialogProps,
  type ModifyStayMode,
  type ModifyStayPayload,
  type RoomMoveReason,
  computeExtensionCharge,
  computeUpgradeDifferential,
  generateReboundQrHmac,
  validateModifyStay,
} from "../src/admin/frontdesk/ModifyStayDialog.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_CURRENT_STAY: CurrentStayDetails = {
  reservationId: "res-gal-102",
  bookingReference: "GAL-RES-102",
  guestName: "Samantha Wickramasinghe",
  currentRoomNumber: "102",
  currentRoomTypeName: "Superior Garden Room",
  currentRateLkr: 25000,
  checkInDate: "2026-10-18",
  checkOutDate: "2026-10-22",
  remainingNights: 3,
  totalFolioLkr: 75000,
  tenantId: "tenant-amangalla",
};

const SAMPLE_AVAILABLE_ROOMS: readonly AvailableRoomOption[] = [
  {
    roomNumber: "205",
    roomTypeName: "Deluxe Ocean Villa",
    rateLkr: 35000,
    status: "INSPECTED",
  },
  {
    roomNumber: "301",
    roomTypeName: "Presidential Fortress Suite",
    rateLkr: 55000,
    status: "CLEAN",
  },
];

describe("Room Move / Upgrade / Stay Extension Action Dialog (ModifyStayDialog.tsx)", () => {
  describe("Upgrade Differential Calculator (computeUpgradeDifferential)", () => {
    it("computes additional rate differential for remaining nights", () => {
      const res = computeUpgradeDifferential({
        currentRateLkr: 25000,
        newRateLkr: 35000,
        remainingNights: 3,
        complimentary: false,
      });
      assert.strictEqual(res.diffPerNightLkr, 10000);
      assert.strictEqual(res.totalDiffLkr, 30000);
    });

    it("returns zero extra charge when complimentary upgrade is enabled", () => {
      const res = computeUpgradeDifferential({
        currentRateLkr: 25000,
        newRateLkr: 55000,
        remainingNights: 2,
        complimentary: true,
      });
      assert.strictEqual(res.diffPerNightLkr, 0);
      assert.strictEqual(res.totalDiffLkr, 0);
    });
  });

  describe("Stay Extension Calculator (computeExtensionCharge)", () => {
    it("computes additional nights charge accurately", () => {
      const charge = computeExtensionCharge({
        dailyRateLkr: 25000,
        additionalNights: 2,
      });
      assert.strictEqual(charge, 50000);
    });

    it("handles zero or negative additional nights safely", () => {
      const charge = computeExtensionCharge({
        dailyRateLkr: 25000,
        additionalNights: 0,
      });
      assert.strictEqual(charge, 0);
    });
  });

  describe("QR Rebound Generator (generateReboundQrHmac)", () => {
    it("generates deterministic HMAC for rebound room QR session", () => {
      const hmac1 = generateReboundQrHmac("tenant-1", "205", "res-1");
      const hmac2 = generateReboundQrHmac("tenant-1", "205", "res-1");
      assert.strictEqual(hmac1, hmac2);
      assert.match(hmac1, /^hmac_[0-9a-f]+/);
    });
  });

  describe("Payload Validator (validateModifyStay)", () => {
    it("passes validation for valid room move", () => {
      const payload: ModifyStayPayload = {
        mode: "ROOM_MOVE",
        reservationId: "res-1",
        currentRoomNumber: "102",
        targetRoomNumber: "205",
        targetRoomTypeName: "Deluxe Ocean Villa",
        previousRoomMarkedDirty: true,
        reboundQrTokenHmac: "hmac_123",
        complimentaryUpgrade: false,
        rateDifferentialLkr: 30000,
        moveReason: "GUEST_UPGRADE",
      };
      const res = validateModifyStay(payload, SAMPLE_AVAILABLE_ROOMS);
      assert.strictEqual(res.isValid, true);
    });

    it("fails when target room is missing", () => {
      const payload: ModifyStayPayload = {
        mode: "ROOM_MOVE",
        reservationId: "res-1",
        currentRoomNumber: "102",
        targetRoomNumber: undefined,
        previousRoomMarkedDirty: true,
        complimentaryUpgrade: false,
        rateDifferentialLkr: 0,
        moveReason: "MAINTENANCE_ISSUE",
      };
      const res = validateModifyStay(payload, SAMPLE_AVAILABLE_ROOMS);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /select a target room/i);
    });

    it("fails when target room is same as current room", () => {
      const payload: ModifyStayPayload = {
        mode: "ROOM_MOVE",
        reservationId: "res-1",
        currentRoomNumber: "102",
        targetRoomNumber: "102",
        previousRoomMarkedDirty: true,
        complimentaryUpgrade: false,
        rateDifferentialLkr: 0,
        moveReason: "MAINTENANCE_ISSUE",
      };
      const res = validateModifyStay(payload, SAMPLE_AVAILABLE_ROOMS);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /cannot be the same/i);
    });

    it("passes validation for valid stay extension", () => {
      const payload: ModifyStayPayload = {
        mode: "EXTEND_STAY",
        reservationId: "res-1",
        currentRoomNumber: "102",
        previousRoomMarkedDirty: false,
        complimentaryUpgrade: false,
        rateDifferentialLkr: 0,
        newCheckOutDate: "2026-10-25",
        additionalNights: 3,
        additionalExtensionChargeLkr: 75000,
      };
      const res = validateModifyStay(payload, SAMPLE_AVAILABLE_ROOMS);
      assert.strictEqual(res.isValid, true);
    });

    it("fails stay extension when additional nights is zero or invalid", () => {
      const payload: ModifyStayPayload = {
        mode: "EXTEND_STAY",
        reservationId: "res-1",
        currentRoomNumber: "102",
        previousRoomMarkedDirty: false,
        complimentaryUpgrade: false,
        rateDifferentialLkr: 0,
        newCheckOutDate: "2026-10-22",
        additionalNights: 0,
      };
      const res = validateModifyStay(payload, SAMPLE_AVAILABLE_ROOMS);
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /at least 1 day/i);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const mode: ModifyStayMode = "ROOM_MOVE";
      const reason: RoomMoveReason = "MAINTENANCE_ISSUE";
      const room: AvailableRoomOption = {
        roomNumber: "205",
        roomTypeName: "Deluxe",
        rateLkr: 35000,
        status: "INSPECTED",
      };
      const props: ModifyStayDialogProps = {
        isOpen: true,
        onClose: noop,
        stay: SAMPLE_CURRENT_STAY,
        availableRooms: SAMPLE_AVAILABLE_ROOMS,
        onConfirmModify: noop,
      };

      assert.strictEqual(mode, "ROOM_MOVE");
      assert.strictEqual(reason, "MAINTENANCE_ISSUE");
      assert.strictEqual(room.roomNumber, "205");
      assert.strictEqual(props.isOpen, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("returns null when isOpen is false", () => {
      const markup = renderToStaticMarkup(
        React.createElement(ModifyStayDialog, {
          isOpen: false,
          onClose: noop,
          stay: SAMPLE_CURRENT_STAY,
          availableRooms: SAMPLE_AVAILABLE_ROOMS,
          onConfirmModify: noop,
        }),
      );
      assert.strictEqual(markup, "");
    });

    it("renders dialog, current stay snapshot, segmented control, room selector, and action button", () => {
      const markup = renderToStaticMarkup(
        React.createElement(ModifyStayDialog, {
          isOpen: true,
          onClose: noop,
          stay: SAMPLE_CURRENT_STAY,
          availableRooms: SAMPLE_AVAILABLE_ROOMS,
          onConfirmModify: noop,
        }),
      );

      assert.match(markup, /Modify Stay/);
      assert.match(markup, /GAL-RES-102/);
      assert.match(markup, /Samantha Wickramasinghe/);
      assert.match(markup, /Room 102/);
      assert.match(markup, /Superior Garden Room/);
      assert.match(markup, /Room Move \/ Upgrade/);
      assert.match(markup, /Extend Stay Dates/);
      assert.match(markup, /Select Target Room for Move/);
      assert.match(markup, /Room 205/);
      assert.match(markup, /Room 301/);
      assert.match(markup, /Complimentary Upgrade/);
      assert.match(markup, /DIRTY/);
      assert.match(markup, /Execute Room Move &amp; Rebind QR →/);
    });
  });
});
