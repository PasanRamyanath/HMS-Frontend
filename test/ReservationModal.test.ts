import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BookingMode,
  type DetectedIdentityType,
  type ReservationFormData,
  ReservationModal,
  type ReservationModalProps,
  type ResidencyType,
  detectIdentityType,
  generateConfirmationCode,
} from "../src/admin/frontdesk/ReservationModal.js";
import { DEFAULT_TAPE_CHART_ROOMS } from "../src/admin/frontdesk/TapeChartGrid.js";
import { DEFAULT_ROOM_TYPES } from "../src/admin/rooms/RoomTypeManager.js";
import { MealPlan } from "../src/generated/graphql.js";

const noop = () => undefined;

describe("Reservation & Walk-In Creation Modal (ReservationModal.tsx)", () => {
  describe("Type Contracts & FormData Structure", () => {
    it("verifies strongly-typed ReservationFormData and Modal Props", () => {
      const mode: BookingMode = "ADVANCE_BOOKING";
      const residency: ResidencyType = "SRI_LANKAN_RESIDENT";
      const idType: DetectedIdentityType = "NIC_OLD";

      const sampleFormData: ReservationFormData = {
        bookingMode: mode,
        confirmationCode: "RES-202610-1234",
        checkInDate: "2026-10-20",
        checkOutDate: "2026-10-22",
        roomTypeId: "rt-dlx-ocean",
        roomId: "rm-101",
        guestName: "Pasan Ramyanath",
        guestPhone: "+94771234567",
        guestEmail: "guest@example.com",
        identityType: idType,
        identityNumber: "853401234V",
        nationality: "Sri Lankan",
        residency,
        mealPlan: MealPlan.Bb,
        adultsCount: 2,
        childrenCount: 1,
        extraBedsCount: 0,
        babyCotsCount: 0,
        driverQuartersRequired: false,
        driverMealsRequired: false,
        totalNights: 2,
        netSupplyLkr: 60000,
        serviceChargeLkr: 6000,
        tdlLkr: 600,
        ssclLkr: 1650,
        vatLkr: 12177,
        totalTaxesLkr: 20427,
        grandTotalLkr: 80427,
        grandTotalUsd: 263.69,
      };

      assert.strictEqual(sampleFormData.bookingMode, "ADVANCE_BOOKING");
      assert.strictEqual(sampleFormData.residency, "SRI_LANKAN_RESIDENT");
      assert.strictEqual(sampleFormData.identityType, "NIC_OLD");

      const props: ReservationModalProps = {
        isOpen: true,
        onClose: noop,
        initialBookingMode: mode,
        availableRooms: DEFAULT_TAPE_CHART_ROOMS,
        roomTypes: DEFAULT_ROOM_TYPES,
      };
      assert.strictEqual(props.isOpen, true);
    });
  });

  describe("Identity Auto-Detection (detectIdentityType)", () => {
    it("detects 10-character Sri Lankan Old NIC with 'V' or 'X'", () => {
      assert.strictEqual(detectIdentityType("853401234V"), "NIC_OLD");
      assert.strictEqual(detectIdentityType("921234567x"), "NIC_OLD");
      assert.strictEqual(detectIdentityType(" 751234567v "), "NIC_OLD");
      assert.strictEqual(detectIdentityType("881234567X"), "NIC_OLD");
    });

    it("detects 12-digit Sri Lankan New NIC", () => {
      assert.strictEqual(detectIdentityType("198534012345"), "NIC_NEW");
      assert.strictEqual(detectIdentityType("200112345678"), "NIC_NEW");
      assert.strictEqual(detectIdentityType(" 199012345678 "), "NIC_NEW");
    });

    it("detects Foreign Passport format", () => {
      assert.strictEqual(detectIdentityType("N1234567"), "PASSPORT");
      assert.strictEqual(detectIdentityType("PA9876543"), "PASSPORT");
      assert.strictEqual(detectIdentityType("GB1234567"), "PASSPORT");
      assert.strictEqual(detectIdentityType("Z987654"), "PASSPORT");
    });

    it("returns UNKNOWN for empty or non-matching inputs", () => {
      assert.strictEqual(detectIdentityType(""), "UNKNOWN");
      assert.strictEqual(detectIdentityType("   "), "UNKNOWN");
      assert.strictEqual(detectIdentityType("1234"), "UNKNOWN");
      assert.strictEqual(detectIdentityType("ABCDEFGHIJKLMNO"), "UNKNOWN");
    });
  });

  describe("Confirmation Code Generation (generateConfirmationCode)", () => {
    it("generates correctly formatted codes based on booking mode", () => {
      const advCode = generateConfirmationCode("ADVANCE_BOOKING");
      assert.match(advCode, /^RES-\d{6}-\d{4}$/);

      const walkInCode = generateConfirmationCode("WALK_IN");
      assert.match(walkInCode, /^WLK-\d{6}-\d{4}$/);

      const dmcCode = generateConfirmationCode("DMC_VOUCHER");
      assert.match(dmcCode, /^DMC-\d{6}-\d{4}$/);
    });
  });

  describe("Modal Static Rendering & UI Structure", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: false,
          onClose: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders Advance Booking mode modal with all required form controls", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          initialBookingMode: "ADVANCE_BOOKING",
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      // Verify modal headers and segmented control
      assert.ok(html.includes("New Advance Reservation"));
      assert.ok(html.includes("Advance Booking"));
      assert.ok(html.includes("Walk-In Check-In"));
      assert.ok(html.includes("DMC Voucher"));

      // Verify date inputs
      assert.ok(html.includes('type="date"'));
      assert.ok(html.includes("Check-In Date (from 14:00)"));
      assert.ok(html.includes("Check-Out Date (until 11:00)"));

      // Verify room type dropdown with Ceylon hotel defaults
      assert.ok(html.includes("Deluxe Ocean View"));
      assert.ok(html.includes("Room Allocation"));

      // Verify meal plan options
      assert.ok(html.includes("RO"));
      assert.ok(html.includes("BB"));
      assert.ok(html.includes("HB"));
      assert.ok(html.includes("FB"));
      assert.ok(html.includes("AI"));

      // Verify guest profile fields
      assert.ok(html.includes("Primary Guest Profile"));
      assert.ok(html.includes("NIC or Passport No."));

      // Verify statutory 4-stage tax compounding summary
      assert.ok(html.includes("Service Charge (10% SC)"));
      assert.ok(html.includes("Tourism Dev. Levy (1% TDL)"));
      assert.ok(html.includes("Social Security (2.5% SSCL)"));
      assert.ok(html.includes("Value Added Tax (18% VAT)"));
      assert.ok(html.includes("Grand Total"));

      // Verify action buttons
      assert.ok(html.includes("Create Advance Reservation"));
      assert.ok(html.includes("Cancel"));
    });

    it("renders Walk-In Check-In mode with immediate check-in UI and required room allocation", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          initialBookingMode: "WALK_IN",
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes("Instant Walk-In Check-In"));
      assert.ok(html.includes("Assigned Room (Required)"));
      assert.ok(html.includes("Complete Walk-In Check-In"));
    });

    it("renders DMC Tour Operator Voucher booking mode with partner selection and voucher input", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          initialBookingMode: "DMC_VOUCHER",
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes("DMC Tour Operator Booking"));
      assert.ok(html.includes("DMC / Tour Operator Voucher"));
      assert.ok(html.includes("Aitken Spence Travels"));
      assert.ok(html.includes("Jetwing Travels"));
      assert.ok(html.includes("Voucher / Booking Reference Number"));
      assert.ok(html.includes("Confirm DMC Voucher Booking"));
    });

    it("renders chauffeur dormitory quarters and meal add-ons", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes("Chauffeur Dormitory Bed (+Rs 2,500/night)"));
      assert.ok(html.includes("Chauffeur Meals (+Rs 1,500/night)"));
    });

    it("displays initial pre-selected room when initialRoomId is provided", () => {
      const targetRoom = DEFAULT_TAPE_CHART_ROOMS[0];
      assert.ok(targetRoom);

      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          initialRoomId: targetRoom.id,
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes(`Room ${targetRoom.roomNumber}`));
    });

    it("renders disabled processing state when isSaving is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReservationModal, {
          isOpen: true,
          onClose: noop,
          isSaving: true,
          availableRooms: DEFAULT_TAPE_CHART_ROOMS,
          roomTypes: DEFAULT_ROOM_TYPES,
        }),
      );

      assert.ok(html.includes("Processing..."));
      assert.ok(html.includes("disabled"));
    });
  });
});
