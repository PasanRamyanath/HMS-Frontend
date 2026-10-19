import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TAPE_CHART_RESERVATIONS,
  DEFAULT_TAPE_CHART_ROOMS,
  type MealPlanBadgeTokens,
  type ReservationColorTokens,
  type ReservationSpanResult,
  type TapeChartDateColumn,
  TapeChartGrid,
  type TapeChartGridProps,
  type TapeChartReservation,
  type TapeChartRoom,
  type TapeChartStats,
  addDays,
  calculateTapeChartStats,
  computeReservationSpan,
  filterTapeChartRooms,
  generateDateColumns,
  getDaysDifference,
  getHousekeepingBadgeColor,
  getMealPlanBadgeColor,
  getReservationStatusColor,
  toIsoDateString,
} from "../src/admin/frontdesk/TapeChartGrid.js";
import { HousekeepingStatus, MealPlan, ReservationStatus } from "../src/generated/graphql.js";

describe("Horizontal 14/30-Day Front-Desk Room Tape Chart Grid (TapeChartGrid.tsx)", () => {
  describe("Pure Date Calculations", () => {
    it("toIsoDateString formats date correctly to YYYY-MM-DD", () => {
      const d = new Date(Date.UTC(2026, 9, 19)); // 2026-10-19
      assert.strictEqual(toIsoDateString(d), "2026-10-19");
    });

    it("addDays adds positive and negative days across month boundaries", () => {
      assert.strictEqual(addDays("2026-10-19", 1), "2026-10-20");
      assert.strictEqual(addDays("2026-10-31", 1), "2026-11-01");
      assert.strictEqual(addDays("2026-10-01", -1), "2026-09-30");
      assert.strictEqual(addDays("2026-12-31", 1), "2027-01-01");
    });

    it("getDaysDifference returns exact nights between two dates", () => {
      assert.strictEqual(getDaysDifference("2026-10-19", "2026-10-22"), 3);
      assert.strictEqual(getDaysDifference("2026-10-22", "2026-10-19"), -3);
      assert.strictEqual(getDaysDifference("2026-10-19", "2026-10-19"), 0);
    });

    it("generateDateColumns creates 14 sequential columns and flags weekends", () => {
      const columns = generateDateColumns("2026-10-19", 14);
      assert.strictEqual(columns.length, 14);

      const first = columns[0];
      const last = columns[13];
      assert.ok(first);
      assert.ok(last);
      assert.strictEqual(first.dateStr, "2026-10-19");
      assert.strictEqual(first.dayOfWeek, "Mon");
      assert.strictEqual(first.isWeekend, false);

      assert.strictEqual(last.dateStr, "2026-11-01");
      assert.strictEqual(last.dayOfWeek, "Sun");
      assert.strictEqual(last.isWeekend, true);
    });

    it("generateDateColumns creates 30 sequential columns for monthly view", () => {
      const columns = generateDateColumns("2026-10-01", 30);
      assert.strictEqual(columns.length, 30);
      const first = columns[0];
      const last = columns[29];
      assert.ok(first);
      assert.ok(last);
      assert.strictEqual(first.dateStr, "2026-10-01");
      assert.strictEqual(last.dateStr, "2026-10-30");
    });
  });

  describe("Reservation Timeline Spanning (computeReservationSpan)", () => {
    const columns = generateDateColumns("2026-10-19", 14); // 2026-10-19 to 2026-11-01

    it("calculates span for reservation completely within chart range", () => {
      const res: TapeChartReservation = {
        id: "res-1",
        confirmationCode: "RES-001",
        guestName: "Alice Smith",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-20",
        checkOutDate: "2026-10-23", // 3 nights
        status: ReservationStatus.Confirmed,
        mealPlan: MealPlan.Bb,
        adultsCount: 2,
        childrenCount: 0,
      };

      const span: ReservationSpanResult = computeReservationSpan(res, columns);
      assert.strictEqual(span.isVisible, true);
      assert.strictEqual(span.startColumn, 2); // 2026-10-20 is column 2
      assert.strictEqual(span.span, 3); // 3 nights (20, 21, 22)
      assert.strictEqual(span.startsBeforeChart, false);
      assert.strictEqual(span.endsAfterChart, false);
    });

    it("clamps reservation that starts before chart start date", () => {
      const res: TapeChartReservation = {
        id: "res-2",
        confirmationCode: "RES-002",
        guestName: "Bob Jones",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-17",
        checkOutDate: "2026-10-21",
        status: ReservationStatus.CheckedIn,
        mealPlan: MealPlan.Hb,
        adultsCount: 1,
        childrenCount: 0,
      };

      const span = computeReservationSpan(res, columns);
      assert.strictEqual(span.isVisible, true);
      assert.strictEqual(span.startColumn, 1);
      assert.strictEqual(span.span, 2); // Oct 19 and Oct 20 nights
      assert.strictEqual(span.startsBeforeChart, true);
      assert.strictEqual(span.endsAfterChart, false);
    });

    it("clamps reservation that extends after chart end date", () => {
      const res: TapeChartReservation = {
        id: "res-3",
        confirmationCode: "RES-003",
        guestName: "Charlie Brown",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-31",
        checkOutDate: "2026-11-04",
        status: ReservationStatus.Confirmed,
        mealPlan: MealPlan.Fb,
        adultsCount: 2,
        childrenCount: 1,
      };

      const span = computeReservationSpan(res, columns);
      assert.strictEqual(span.isVisible, true);
      assert.strictEqual(span.startColumn, 13); // Oct 31 is column 13
      assert.strictEqual(span.span, 2); // Oct 31 and Nov 01 nights
      assert.strictEqual(span.startsBeforeChart, false);
      assert.strictEqual(span.endsAfterChart, true);
    });

    it("returns isVisible=false for reservation outside chart date range", () => {
      const pastRes: TapeChartReservation = {
        id: "res-past",
        confirmationCode: "RES-PAST",
        guestName: "Past Guest",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-10",
        checkOutDate: "2026-10-15",
        status: ReservationStatus.CheckedOut,
        mealPlan: MealPlan.Ro,
        adultsCount: 1,
        childrenCount: 0,
      };

      const futureRes: TapeChartReservation = {
        id: "res-future",
        confirmationCode: "RES-FUTURE",
        guestName: "Future Guest",
        assignedRoomId: "rm-101",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-15",
        status: ReservationStatus.Confirmed,
        mealPlan: MealPlan.Ro,
        adultsCount: 1,
        childrenCount: 0,
      };

      assert.strictEqual(computeReservationSpan(pastRes, columns).isVisible, false);
      assert.strictEqual(computeReservationSpan(futureRes, columns).isVisible, false);
    });

    it("supports back-to-back same-day room turnaround without column collision", () => {
      // Guest A checks out 2026-10-22
      const guestA: TapeChartReservation = {
        id: "res-a",
        confirmationCode: "RES-A",
        guestName: "Departing Guest",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-19",
        checkOutDate: "2026-10-22",
        status: ReservationStatus.CheckedIn,
        mealPlan: MealPlan.Bb,
        adultsCount: 2,
        childrenCount: 0,
      };

      // Guest B checks in 2026-10-22
      const guestB: TapeChartReservation = {
        id: "res-b",
        confirmationCode: "RES-B",
        guestName: "Arriving Guest",
        assignedRoomId: "rm-101",
        checkInDate: "2026-10-22",
        checkOutDate: "2026-10-25",
        status: ReservationStatus.Confirmed,
        mealPlan: MealPlan.Hb,
        adultsCount: 2,
        childrenCount: 0,
      };

      const spanA = computeReservationSpan(guestA, columns);
      const spanB = computeReservationSpan(guestB, columns);

      assert.strictEqual(spanA.startColumn, 1);
      assert.strictEqual(spanA.span, 3); // cols 1, 2, 3 (Oct 19, 20, 21)

      assert.strictEqual(spanB.startColumn, 4); // col 4 (Oct 22)
      assert.strictEqual(spanB.span, 3); // cols 4, 5, 6 (Oct 22, 23, 24)

      // Columns are strictly non-overlapping
      assert.strictEqual(spanA.startColumn + spanA.span, spanB.startColumn);
    });
  });

  describe("Color Tokens & Badges", () => {
    it("returns correct color tokens for each reservation status", () => {
      const inHouse = getReservationStatusColor(ReservationStatus.CheckedIn);
      assert.strictEqual(inHouse.label, "In-House");
      assert.ok(inHouse.bg.includes("emerald"));

      const confirmed = getReservationStatusColor(ReservationStatus.Confirmed);
      assert.strictEqual(confirmed.label, "Confirmed");
      assert.ok(confirmed.bg.includes("blue"));

      const checkedOut = getReservationStatusColor(ReservationStatus.CheckedOut);
      assert.strictEqual(checkedOut.label, "Checked Out");
      assert.ok(checkedOut.bg.includes("slate"));

      const ooo = getReservationStatusColor("OUT_OF_ORDER");
      assert.strictEqual(ooo.label, "Out of Order");
      assert.ok(ooo.bg.includes("rose"));

      const inquiry = getReservationStatusColor(ReservationStatus.Inquiry);
      assert.strictEqual(inquiry.label, "Inquiry");
      assert.ok(inquiry.bg.includes("amber"));

      const cancelled = getReservationStatusColor(ReservationStatus.Cancelled);
      assert.strictEqual(cancelled.label, "Cancelled");
    });

    it("returns correct badge tokens for each meal plan", () => {
      assert.ok(getMealPlanBadgeColor(MealPlan.Ai).fullLabel.includes("All Inclusive"));
      assert.ok(getMealPlanBadgeColor(MealPlan.Fb).fullLabel.includes("Full Board"));
      assert.ok(getMealPlanBadgeColor(MealPlan.Hb).fullLabel.includes("Half Board"));
      assert.ok(getMealPlanBadgeColor(MealPlan.Bb).fullLabel.includes("Bed & Breakfast"));
      assert.ok(getMealPlanBadgeColor(MealPlan.Ro).fullLabel.includes("Room Only"));
    });

    it("returns correct status color for housekeeping states", () => {
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Clean), "green");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Inspected), "blue");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.Dirty), "amber");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.OutOfOrder), "red");
      assert.strictEqual(getHousekeepingBadgeColor(HousekeepingStatus.DoNotDisturb), "indigo");
    });
  });

  describe("Statistics & Room Filtering", () => {
    const rooms: ReadonlyArray<TapeChartRoom> = [
      {
        id: "r1",
        roomNumber: "101",
        roomTypeName: "Deluxe",
        roomTypeCode: "DLX",
        building: "Ocean Wing",
        floor: "1",
        housekeepingStatus: HousekeepingStatus.Clean,
      },
      {
        id: "r2",
        roomNumber: "102",
        roomTypeName: "Deluxe",
        roomTypeCode: "DLX",
        building: "Ocean Wing",
        floor: "1",
        housekeepingStatus: HousekeepingStatus.Clean,
      },
      {
        id: "r3",
        roomNumber: "201",
        roomTypeName: "Suite",
        roomTypeCode: "STE",
        building: "Hilltop",
        floor: "2",
        housekeepingStatus: HousekeepingStatus.OutOfOrder,
      },
    ];

    const reservations: ReadonlyArray<TapeChartReservation> = [
      {
        id: "res-1",
        confirmationCode: "RES-1",
        guestName: "Active Guest",
        assignedRoomId: "r1",
        checkInDate: "2026-10-18",
        checkOutDate: "2026-10-22",
        status: ReservationStatus.CheckedIn,
        mealPlan: MealPlan.Hb,
        adultsCount: 2,
        childrenCount: 0,
      },
      {
        id: "res-2",
        confirmationCode: "RES-2",
        guestName: "Arriving Guest",
        assignedRoomId: "r2",
        checkInDate: "2026-10-19",
        checkOutDate: "2026-10-21",
        status: ReservationStatus.Confirmed,
        mealPlan: MealPlan.Bb,
        adultsCount: 1,
        childrenCount: 0,
      },
      {
        id: "res-3",
        confirmationCode: "RES-3",
        guestName: "Departing Guest",
        assignedRoomId: "r2",
        checkInDate: "2026-10-16",
        checkOutDate: "2026-10-19",
        status: ReservationStatus.CheckedOut,
        mealPlan: MealPlan.Ro,
        adultsCount: 1,
        childrenCount: 0,
      },
    ];

    it("calculateTapeChartStats accurately computes occupancy and turnover", () => {
      const stats = calculateTapeChartStats(rooms, reservations, "2026-10-19");
      assert.strictEqual(stats.totalRooms, 3);
      assert.strictEqual(stats.occupiedRoomsToday, 1); // r1
      assert.strictEqual(stats.arrivalsToday, 1); // r2
      assert.strictEqual(stats.departuresToday, 1); // r2
      assert.strictEqual(stats.outOfOrderRooms, 1); // r3
      assert.strictEqual(stats.occupancyPercentage, 33); // 1 / 3 = 33%
    });

    it("filterTapeChartRooms filters by wing and search text", () => {
      const all = filterTapeChartRooms(rooms, "ALL", "");
      assert.strictEqual(all.length, 3);

      const oceanOnly = filterTapeChartRooms(rooms, "Ocean Wing", "");
      assert.strictEqual(oceanOnly.length, 2);

      const search101 = filterTapeChartRooms(rooms, "ALL", "101");
      assert.strictEqual(search101.length, 1);
      assert.strictEqual(search101[0]?.roomNumber, "101");

      const searchSuite = filterTapeChartRooms(rooms, "ALL", "suite");
      assert.strictEqual(searchSuite.length, 1);
      assert.strictEqual(searchSuite[0]?.roomNumber, "201");
    });
  });

  describe("Component Static Markup (TapeChartGrid)", () => {
    it("renders default tape chart with header, KPI strip, filter bar, and rooms", () => {
      const props: TapeChartGridProps = {
        propertyTitle: "Galle Fort Lighthouse Villa",
        initialStartDate: "2026-10-19",
        initialViewMode: 14,
      };

      const html = renderToStaticMarkup(React.createElement(TapeChartGrid, props));

      // Header & Navigation
      assert.ok(html.includes("Front-Desk Room Tape Chart"));
      assert.ok(html.includes("Live Visual Rack"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("14 Days"));
      assert.ok(html.includes("30 Days"));

      // KPI Strip
      assert.ok(html.includes("Total Rooms"));
      assert.ok(html.includes("In-House Today"));
      assert.ok(html.includes("Arrivals Today"));
      assert.ok(html.includes("Today&#x27;s Occupancy"));

      // Default preset rooms
      assert.ok(html.includes("101"));
      assert.ok(html.includes("102"));
      assert.ok(html.includes("DOV"));
      assert.ok(html.includes("Ocean Wing"));

      // Default preset reservations
      assert.ok(html.includes("Alexander Wright"));
      assert.ok(html.includes("RES-78102"));
    });

    it("renders 30-day timeline view mode when initialViewMode is 30", () => {
      const props: TapeChartGridProps = {
        initialStartDate: "2026-10-01",
        initialViewMode: 30,
      };

      const html = renderToStaticMarkup(React.createElement(TapeChartGrid, props));
      assert.ok(html.includes("repeat(30, minmax(48px, 1fr))"));
    });

    it("renders custom rooms and reservations accurately", () => {
      const customRooms: TapeChartRoom[] = [
        {
          id: "c1",
          roomNumber: "901",
          roomTypeName: "Presidential Penthouse",
          roomTypeCode: "PPH",
          building: "Penthouse Tower",
          floor: "9",
          housekeepingStatus: HousekeepingStatus.Clean,
        },
      ];

      const customRes: TapeChartReservation[] = [
        {
          id: "cr1",
          confirmationCode: "VIP-999",
          guestName: "Lady Sarah Jenkins",
          assignedRoomId: "c1",
          checkInDate: "2026-10-19",
          checkOutDate: "2026-10-24",
          status: ReservationStatus.CheckedIn,
          mealPlan: MealPlan.Ai,
          adultsCount: 2,
          childrenCount: 0,
          totalAmountLkr: 1500000,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TapeChartGrid, {
          rooms: customRooms,
          reservations: customRes,
          initialStartDate: "2026-10-19",
        }),
      );

      assert.ok(html.includes("901"));
      assert.ok(html.includes("PPH"));
      assert.ok(html.includes("Presidential Penthouse"));
      assert.ok(html.includes("Lady Sarah Jenkins"));
      assert.ok(html.includes("VIP-999"));
      assert.ok(html.includes("AI"));
    });

    it("verifies default constants have expected items", () => {
      assert.ok(DEFAULT_TAPE_CHART_ROOMS.length >= 8);
      assert.ok(DEFAULT_TAPE_CHART_RESERVATIONS.length >= 4);
    });

    it("verifies exported type definitions are constructible", () => {
      const col: TapeChartDateColumn = {
        dateStr: "2026-10-19",
        dayOfMonth: 19,
        dayOfWeek: "Mon",
        monthName: "Oct",
        isWeekend: false,
        isToday: true,
      };
      assert.strictEqual(col.dateStr, "2026-10-19");

      const stats: TapeChartStats = {
        totalRooms: 10,
        occupiedRoomsToday: 5,
        arrivalsToday: 2,
        departuresToday: 1,
        outOfOrderRooms: 0,
        occupancyPercentage: 50,
      };
      assert.strictEqual(stats.occupancyPercentage, 50);

      const colorTokens: ReservationColorTokens = {
        bg: "bg-blue",
        border: "border-blue",
        text: "text-blue",
        badgeBg: "badge-blue",
        label: "Confirmed",
      };
      assert.strictEqual(colorTokens.label, "Confirmed");

      const mealTokens: MealPlanBadgeTokens = {
        bg: "bg-amber",
        text: "text-amber",
        fullLabel: "Bed & Breakfast (BB)",
      };
      assert.strictEqual(mealTokens.fullLabel, "Bed & Breakfast (BB)");
    });
  });
});
