import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AirportTransferStatus,
  type DailyBoardMetrics,
  type DailyBoardTab,
  type DailyGuestEntry,
  type DailyMealPlan,
  FrontDeskDailyBoard,
  type FrontDeskDailyBoardProps,
  type RoomReadiness,
  type VipStatus,
  computeDailyBoardMetrics,
  filterDailyGuestEntries,
  getTransferBadgeClasses,
  getVipBadgeClasses,
} from "../src/admin/frontdesk/FrontDeskDailyBoard.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_ENTRIES: readonly DailyGuestEntry[] = [
  {
    reservationId: "res-arr-1",
    bookingReference: "ARR-001",
    guestName: "Alice Walker",
    nationality: "British",
    identityType: "PASSPORT",
    identityNumber: "P998877",
    identityVerified: true,
    vipStatus: "VIP",
    vipNotes: "High floor requested, welcome basket",
    roomNumber: "101",
    roomTypeName: "Deluxe Ocean Villa",
    roomStatus: "INSPECTED",
    checkInDate: "2026-10-19",
    checkOutDate: "2026-10-24",
    numberOfNights: 5,
    numberOfGuests: 2,
    mealPlan: "HB",
    airportTransfer: "DRIVER_ASSIGNED",
    flightNumber: "UL 504",
    transferEta: "14:30",
    folioBalanceLkr: 45000,
    folioBalanceUsd: 150,
    checkedIn: false,
    checkedOut: false,
    chauffeurAccompanied: true,
  },
  {
    reservationId: "res-inh-1",
    bookingReference: "INH-002",
    guestName: "Sunil Bandara",
    nationality: "Sri Lankan",
    identityType: "NIC",
    identityNumber: "198512345678",
    identityVerified: true,
    vipStatus: "REPEAT_GUEST",
    roomNumber: "202",
    roomTypeName: "Garden Suite",
    roomStatus: "CLEAN",
    checkInDate: "2026-10-18",
    checkOutDate: "2026-10-21",
    numberOfNights: 3,
    numberOfGuests: 3,
    mealPlan: "FB",
    airportTransfer: "COMPLETED",
    folioBalanceLkr: 12000,
    checkedIn: true,
    checkedOut: false,
  },
  {
    reservationId: "res-dep-1",
    bookingReference: "DEP-003",
    guestName: "Jean Dupont",
    nationality: "French",
    identityType: "PASSPORT",
    identityNumber: "FRA445566",
    identityVerified: true,
    vipStatus: "HONEYMOON",
    vipNotes: "Sparkling wine complimentary",
    roomNumber: "305",
    roomTypeName: "Presidential Water Villa",
    roomStatus: "CLEAN",
    checkInDate: "2026-10-15",
    checkOutDate: "2026-10-19",
    numberOfNights: 4,
    numberOfGuests: 2,
    mealPlan: "AI",
    airportTransfer: "SCHEDULED",
    transferEta: "11:00",
    folioBalanceLkr: 85000,
    checkedIn: true,
    checkedOut: false,
  },
];

describe("Today's Arrivals, Departures & In-House Guests Operational Board (FrontDeskDailyBoard.tsx)", () => {
  describe("Metrics Computation (computeDailyBoardMetrics)", () => {
    it("computes totals for arrivals, in-house guests, departures, and balances", () => {
      const metrics = computeDailyBoardMetrics(SAMPLE_ENTRIES);
      assert.strictEqual(metrics.totalArrivals, 1);
      assert.strictEqual(metrics.checkedInArrivals, 2);
      assert.strictEqual(metrics.totalInHouse, 5); // 3 (Sunil) + 2 (Jean)
      assert.strictEqual(metrics.totalInHouseRooms, 2);
      assert.strictEqual(metrics.totalOutstandingLkr, 142000); // 45k + 12k + 85k
    });

    it("handles empty entries safely", () => {
      const metrics = computeDailyBoardMetrics([]);
      assert.strictEqual(metrics.totalArrivals, 0);
      assert.strictEqual(metrics.checkedInArrivals, 0);
      assert.strictEqual(metrics.totalInHouse, 0);
      assert.strictEqual(metrics.totalOutstandingLkr, 0);
    });
  });

  describe("Queue Filtering & Searching (filterDailyGuestEntries)", () => {
    it("filters arrivals tab accurately", () => {
      const arrivals = filterDailyGuestEntries(SAMPLE_ENTRIES, "ARRIVALS", "", "ALL", "ALL");
      assert.strictEqual(arrivals.length, 1);
      assert.strictEqual(arrivals[0]?.guestName, "Alice Walker");
    });

    it("filters in-house tab accurately", () => {
      const inHouse = filterDailyGuestEntries(SAMPLE_ENTRIES, "IN_HOUSE", "", "ALL", "ALL");
      assert.strictEqual(inHouse.length, 2);
    });

    it("filters by meal plan accurately", () => {
      const fbEntries = filterDailyGuestEntries(SAMPLE_ENTRIES, "IN_HOUSE", "", "FB", "ALL");
      assert.strictEqual(fbEntries.length, 1);
      assert.strictEqual(fbEntries[0]?.guestName, "Sunil Bandara");
    });

    it("filters by room status accurately", () => {
      const inspected = filterDailyGuestEntries(SAMPLE_ENTRIES, "ARRIVALS", "", "ALL", "INSPECTED");
      assert.strictEqual(inspected.length, 1);
      assert.strictEqual(inspected[0]?.roomNumber, "101");
    });

    it("searches by guest name or room number", () => {
      const byName = filterDailyGuestEntries(SAMPLE_ENTRIES, "ARRIVALS", "walker", "ALL", "ALL");
      assert.strictEqual(byName.length, 1);

      const byRoom = filterDailyGuestEntries(SAMPLE_ENTRIES, "IN_HOUSE", "202", "ALL", "ALL");
      assert.strictEqual(byRoom.length, 1);
    });
  });

  describe("Badge Style Classes", () => {
    it("returns appropriate VIP badge styles", () => {
      const vip = getVipBadgeClasses("VIP");
      assert.strictEqual(vip.label, "VIP");
      assert.match(vip.className, /amber/);

      const standard = getVipBadgeClasses("STANDARD");
      assert.strictEqual(standard.label, "Standard");

      const honeymoon = getVipBadgeClasses("HONEYMOON");
      assert.strictEqual(honeymoon.label, "Honeymoon");

      const repeat = getVipBadgeClasses("REPEAT_GUEST");
      assert.strictEqual(repeat.label, "Repeat Guest");
    });

    it("returns appropriate Airport Transfer badge styles", () => {
      const driver = getTransferBadgeClasses("DRIVER_ASSIGNED");
      assert.strictEqual(driver.label, "Driver Assigned");
      assert.match(driver.className, /blue/);

      const sched = getTransferBadgeClasses("SCHEDULED");
      assert.strictEqual(sched.label, "Pickup Scheduled");

      const comp = getTransferBadgeClasses("COMPLETED");
      assert.strictEqual(comp.label, "Completed");

      const none = getTransferBadgeClasses("NOT_REQUESTED");
      assert.strictEqual(none.label, "None");
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types and models are constructible", () => {
      const tab: DailyBoardTab = "ARRIVALS";
      const vip: VipStatus = "VIP";
      const transfer: AirportTransferStatus = "SCHEDULED";
      const readiness: RoomReadiness = "INSPECTED";
      const meal: DailyMealPlan = "HB";
      const metrics: DailyBoardMetrics = {
        totalArrivals: 1,
        checkedInArrivals: 0,
        totalDepartures: 1,
        checkedOutDepartures: 0,
        totalInHouse: 2,
        totalInHouseRooms: 1,
        totalOutstandingLkr: 5000,
      };
      const props: FrontDeskDailyBoardProps = {
        hotelName: "Sample Resort",
        entries: SAMPLE_ENTRIES,
        onTabChange: noop,
      };

      assert.strictEqual(tab, "ARRIVALS");
      assert.strictEqual(vip, "VIP");
      assert.strictEqual(transfer, "SCHEDULED");
      assert.strictEqual(readiness, "INSPECTED");
      assert.strictEqual(meal, "HB");
      assert.strictEqual(metrics.totalArrivals, 1);
      assert.strictEqual(props.hotelName, "Sample Resort");
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders board header, segmented control tabs, metrics banner, and search filters", () => {
      const markup = renderToStaticMarkup(
        React.createElement(FrontDeskDailyBoard, {
          hotelName: "Amangalla Fortress Resort",
          entries: SAMPLE_ENTRIES,
          activeTab: "ARRIVALS",
          onTabChange: noop,
          onCheckInClick: noop,
        }),
      );

      assert.match(markup, /Front Desk Operational Board/);
      assert.match(markup, /Amangalla Fortress Resort/);
      assert.match(markup, /Arrivals/);
      assert.match(markup, /In-House/);
      assert.match(markup, /Departures/);
      assert.match(markup, /Arrivals Today/);
      assert.match(markup, /Outstanding Folios/);
      assert.match(markup, /Alice Walker/);
      assert.match(markup, /Deluxe Ocean Villa/);
      assert.match(markup, /RM 101/);
      assert.match(markup, /Check In Guest →/);
      assert.match(markup, /Driver Quarters/);
    });

    it("renders in-house guest cards with action buttons", () => {
      const markup = renderToStaticMarkup(
        React.createElement(FrontDeskDailyBoard, {
          hotelName: "Amangalla Fortress Resort",
          entries: SAMPLE_ENTRIES,
          activeTab: "IN_HOUSE",
          onTabChange: noop,
          onModifyStayClick: noop,
          onViewFolioClick: noop,
        }),
      );

      assert.match(markup, /Sunil Bandara/);
      assert.match(markup, /RM 202/);
      assert.match(markup, /Modify Stay \/ Room Move/);
      assert.match(markup, /View Folio/);
    });

    it("renders departures cards with checkout button", () => {
      const markup = renderToStaticMarkup(
        React.createElement(FrontDeskDailyBoard, {
          hotelName: "Amangalla Fortress Resort",
          entries: SAMPLE_ENTRIES,
          activeTab: "DEPARTURES",
          onTabChange: noop,
          onCheckOutClick: noop,
          onViewFolioClick: noop,
        }),
      );

      assert.match(markup, /Jean Dupont/);
      assert.match(markup, /RM 305/);
      assert.match(markup, /Check Out &amp; Settle →/);
      assert.match(markup, /Review Folio/);
    });

    it("renders empty state when queue has no matching guests", () => {
      const markup = renderToStaticMarkup(
        React.createElement(FrontDeskDailyBoard, {
          hotelName: "Amangalla Fortress Resort",
          entries: [],
          activeTab: "ARRIVALS",
        }),
      );

      assert.match(markup, /No guests found in arrivals queue/);
    });
  });
});
