import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_DRIVER_ENTRIES,
  type DriverOccupancyStatus,
  DriverQuartersBoard,
  type DriverQuartersBoardProps,
  type DriverQuartersEntry,
  type GuestRoomReadiness,
  composeGuestReadySms,
  computeDormSummary,
  filterDriverEntries,
  formatSriLankanPlate,
  generateGatePassSerial,
} from "../src/admin/frontdesk/DriverQuartersBoard.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_ENTRIES: readonly DriverQuartersEntry[] = [
  {
    id: "test-drv-1",
    driverName: "Anura Bandara",
    driverPhone: "+94771122334",
    vehiclePlate: "wp cab-9988",
    assignedBedNumber: "Bed D-01",
    dormBlock: "Chauffeur Annex Block A",
    associatedGuestName: "Samantha Miller",
    associatedRoomNumber: "105",
    tourAgency: "Ceylon Trails DMC",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-22",
    status: "CHECKED_IN",
    roomStatus: "ROOM_READY",
    mealVouchers: { total: 4, redeemed: 1 },
    gatePassIssued: true,
    gatePassNumber: "GP-2026-0101",
    gatePassIssuedAt: "2026-10-19 14:00",
  },
  {
    id: "test-drv-2",
    driverName: "Gamini Wijeratne",
    driverPhone: "+94715566778",
    vehiclePlate: "sp ka-4433",
    assignedBedNumber: "Outside Allowance",
    dormBlock: "Off-Site Lodging",
    associatedGuestName: "Robert Davis",
    associatedRoomNumber: "208",
    tourAgency: "Walkers Tours",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-21",
    status: "CHECKED_IN",
    roomStatus: "OCCUPIED",
    mealVouchers: { total: 3, redeemed: 2 },
    gatePassIssued: false,
  },
  {
    id: "test-drv-3",
    driverName: "Mahinda Siriwardena",
    driverPhone: "+94769988776",
    vehiclePlate: "CP NC-1234",
    assignedBedNumber: "Bed D-03",
    dormBlock: "Chauffeur Annex Block A",
    associatedGuestName: "Fiona Gallagher",
    associatedRoomNumber: "310",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-19",
    status: "DEPARTED",
    roomStatus: "CLEANING",
    mealVouchers: { total: 4, redeemed: 4 },
    gatePassIssued: true,
    gatePassNumber: "GP-2026-0099",
  },
];

describe("Chauffeur / Driver Quarters Live Occupancy & Gate Pass Board (DriverQuartersBoard.tsx)", () => {
  describe("Sri Lankan Vehicle Plate Formatter (formatSriLankanPlate)", () => {
    it("converts lowercase plates with erratic spacing to clean uppercase", () => {
      assert.strictEqual(formatSriLankanPlate("wp  cab-1234 "), "WP CAB-1234");
      assert.strictEqual(formatSriLankanPlate("cp   ga-5678"), "CP GA-5678");
    });

    it("handles empty or whitespace string safely", () => {
      assert.strictEqual(formatSriLankanPlate(""), "N/A");
      assert.strictEqual(formatSriLankanPlate("   "), "N/A");
    });
  });

  describe("Dorm Occupancy Summary Computation (computeDormSummary)", () => {
    it("accurately tallies checked-in chauffeurs, occupied beds, outside allowance, and ready rooms", () => {
      const summary = computeDormSummary(SAMPLE_ENTRIES, 10);
      assert.strictEqual(summary.totalDrivers, 3);
      assert.strictEqual(summary.checkedInDrivers, 2);
      assert.strictEqual(summary.dormBedsOccupied, 1); // Anura in Bed D-01 (Mahinda is DEPARTED)
      assert.strictEqual(summary.outsideAllowanceCount, 1); // Gamini on Outside Allowance
      assert.strictEqual(summary.availableBeds, 9); // 10 total - 1 occupied
      assert.strictEqual(summary.guestRoomsReadyCount, 1); // Samantha Miller in 105
    });

    it("handles zero total beds without negative availability", () => {
      const summary = computeDormSummary(SAMPLE_ENTRIES, 0);
      assert.strictEqual(summary.availableBeds, 0);
    });

    it("handles empty driver entries safely", () => {
      const summary = computeDormSummary([], 8);
      assert.strictEqual(summary.totalDrivers, 0);
      assert.strictEqual(summary.checkedInDrivers, 0);
      assert.strictEqual(summary.dormBedsOccupied, 0);
      assert.strictEqual(summary.outsideAllowanceCount, 0);
      assert.strictEqual(summary.availableBeds, 8);
      assert.strictEqual(summary.guestRoomsReadyCount, 0);
    });
  });

  describe("Transactional SMS Template Generator (composeGuestReadySms)", () => {
    it("formats dispatch SMS with hotel, guest name, room, and vehicle plate", () => {
      const entry = SAMPLE_ENTRIES[0] as DriverQuartersEntry;
      const sms = composeGuestReadySms("Heritance Kandalama", entry);
      assert.ok(sms.includes("Heritance Kandalama:"));
      assert.ok(sms.includes("Guest Samantha Miller"));
      assert.ok(sms.includes("Room 105"));
      assert.ok(sms.includes("WP CAB-9988"));
      assert.ok(sms.includes("Main Porch"));
    });
  });

  describe("Filtering & Search (filterDriverEntries)", () => {
    it("returns all entries when query is empty and statusFilter is ALL", () => {
      const results = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "ALL",
      });
      assert.strictEqual(results.length, 3);
    });

    it("filters by driver name, vehicle plate, or room number", () => {
      const byName = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "anura",
        statusFilter: "ALL",
      });
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0]?.id, "test-drv-1");

      const byPlate = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "ka-4433",
        statusFilter: "ALL",
      });
      assert.strictEqual(byPlate.length, 1);
      assert.strictEqual(byPlate[0]?.id, "test-drv-2");

      const byRoom = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "310",
        statusFilter: "ALL",
      });
      assert.strictEqual(byRoom.length, 1);
      assert.strictEqual(byRoom[0]?.id, "test-drv-3");
    });

    it("filters by status (CHECKED_IN, ROOM_READY, DEPARTED)", () => {
      const inHouse = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "CHECKED_IN",
      });
      assert.strictEqual(inHouse.length, 2);

      const roomReady = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "ROOM_READY",
      });
      assert.strictEqual(roomReady.length, 1);
      assert.strictEqual(roomReady[0]?.id, "test-drv-1");

      const departed = filterDriverEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "DEPARTED",
      });
      assert.strictEqual(departed.length, 1);
      assert.strictEqual(departed[0]?.id, "test-drv-3");
    });
  });

  describe("Gate Pass Serial Generation (generateGatePassSerial)", () => {
    it("formats 4-digit zero-padded gate pass numbers", () => {
      assert.strictEqual(generateGatePassSerial(42, 2026), "GP-2026-0042");
      assert.strictEqual(generateGatePassSerial(1045, 2026), "GP-2026-1045");
    });
  });

  describe("Component Static Rendering & Contract (DriverQuartersBoard)", () => {
    it("renders default board without throwing errors", () => {
      const html = renderToStaticMarkup(React.createElement(DriverQuartersBoard, {}));
      assert.ok(html.includes("Chauffeur / Driver Quarters Live Occupancy &amp; Gate Pass Board"));
      assert.ok(html.includes("Chauffeurs In-House"));
      assert.ok(html.includes("Dorm Beds Occupied"));
      assert.ok(html.includes("Guests Ready for Tour"));
      assert.ok(html.includes("Live Porch Dispatch"));
    });

    it("renders custom property details and custom driver records", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersBoard, {
          hotelName: "Cinnamon Citadel Kandy",
          totalDormBeds: 16,
          entries: SAMPLE_ENTRIES,
          onSendSms: noop,
          onIssueGatePass: noop,
          onUpdateStatus: noop,
          onRedeemMealVoucher: noop,
        }),
      );
      assert.ok(html.includes("Cinnamon Citadel Kandy"));
      assert.ok(html.includes("Anura Bandara"));
      assert.ok(html.includes("WP CAB-9988"));
      assert.ok(html.includes("Gamini Wijeratne"));
      assert.ok(html.includes("SP KA-4433"));
      assert.ok(html.includes("Mahinda Siriwardena"));
      assert.ok(html.includes("CP NC-1234"));
      assert.ok(html.includes("Samantha Miller"));
      assert.ok(html.includes("Ceylon Trails DMC"));
    });

    it("renders disabled state attributes appropriately", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersBoard, {
          disabled: true,
          entries: SAMPLE_ENTRIES,
        }),
      );
      assert.ok(html.includes("disabled"));
    });

    it("renders empty table state when entries are empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(DriverQuartersBoard, {
          entries: [],
        }),
      );
      assert.ok(html.includes("No driver quarters records match the selected filter."));
    });

    it("DEFAULT_DRIVER_ENTRIES is pre-populated with realistic Sri Lankan driver records", () => {
      assert.ok(DEFAULT_DRIVER_ENTRIES.length >= 2);
      const first = DEFAULT_DRIVER_ENTRIES[0] as DriverQuartersEntry;
      assert.ok(first.vehiclePlate.startsWith("WP "));
      assert.ok(first.driverPhone.startsWith("+94"));
    });
  });

  describe("Contract & Type Invariants", () => {
    it("DriverOccupancyStatus adheres to valid literal unions", () => {
      const checkedIn: DriverOccupancyStatus = "CHECKED_IN";
      const departed: DriverOccupancyStatus = "DEPARTED";
      const offSite: DriverOccupancyStatus = "OFF_SITE";
      assert.strictEqual(checkedIn, "CHECKED_IN");
      assert.strictEqual(departed, "DEPARTED");
      assert.strictEqual(offSite, "OFF_SITE");
    });

    it("GuestRoomReadiness adheres to valid literal unions", () => {
      const ready: GuestRoomReadiness = "ROOM_READY";
      const occupied: GuestRoomReadiness = "OCCUPIED";
      const cleaning: GuestRoomReadiness = "CLEANING";
      const expected: GuestRoomReadiness = "EXPECTED";
      assert.strictEqual(ready, "ROOM_READY");
      assert.strictEqual(occupied, "OCCUPIED");
      assert.strictEqual(cleaning, "CLEANING");
      assert.strictEqual(expected, "EXPECTED");
    });

    it("DriverQuartersBoardProps is cleanly constructible", () => {
      const props: DriverQuartersBoardProps = {
        hotelName: "Amangalla",
        totalDormBeds: 8,
      };
      assert.strictEqual(props.hotelName, "Amangalla");
      assert.strictEqual(props.totalDormBeds, 8);
    });
  });
});
