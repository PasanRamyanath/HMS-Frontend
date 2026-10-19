import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ActiveRoomQrCard,
  CbslRateLockCard,
  CheckInConfirmDialog,
  type CheckInConfirmDialogProps,
  type CheckInConfirmPayload,
  CheckInHeader,
  type CheckInReservationDetails,
  type DriverStayDetails,
  GuestVerificationCard,
  type IdentityType,
  type MealPlanCode,
  type RoomReadinessStatus,
  SmsToggles,
  buildDriverWelcomeSms,
  buildGuestWelcomeSms,
  generateGuestFolioPin,
  generateRoomQrHmac,
  validateCheckInReadiness,
} from "../src/admin/frontdesk/CheckInConfirmDialog.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_CHECK_IN: CheckInReservationDetails = {
  reservationId: "res-cinnamon-2026-104",
  bookingReference: "CIN-RES-104",
  guestName: "Pasan Ramyanath",
  identityType: "NIC",
  identityNumber: "199012345678",
  identityVerified: true,
  nationality: "Sri Lankan",
  mobileNumber: "+94 77 987 6543",
  roomNumber: "204",
  roomTypeName: "Deluxe Ocean View",
  roomStatus: "INSPECTED",
  checkInDate: "2026-10-19",
  checkOutDate: "2026-10-22",
  numberOfNights: 3,
  mealPlan: "HB",
  lockedExchangeRateUsd: 305.5,
  lockedExchangeRateEur: 332.8,
  cbslRateTimestamp: "2026-10-19 09:00 CBSL",
  totalLkr: 90000,
  advancePaidLkr: 30000,
  outstandingLkr: 60000,
  hotelName: "Cinnamon Bentota Beach",
  hotelHotline: "+94 34 227 5000",
  tenantId: "tenant-cinnamon-bentota",
  driverDetails: {
    name: "Sunil Silva",
    mobile: "+94 71 234 5678",
    dormBedNumber: "D-03",
    mealVoucherIssued: true,
  },
};

describe("One-Click Guest Check-In Dialog (CheckInConfirmDialog.tsx)", () => {
  describe("Security PIN & HMAC Generators", () => {
    it("generates a 4-digit random folio PIN", () => {
      const pin = generateGuestFolioPin();
      assert.strictEqual(pin.length, 4);
      assert.match(pin, /^\d{4}$/);
    });

    it("generates a deterministic 4-digit folio PIN with seed", () => {
      const pin = generateGuestFolioPin(782);
      assert.strictEqual(pin, "0782");
    });

    it("generates room QR HMAC token", () => {
      const token = generateRoomQrHmac("tenant-1", "101", "res-1", "2026-10-19");
      assert.match(token, /^hmac_[0-9a-f]+/);
    });
  });

  describe("Welcome SMS Generators", () => {
    it("builds guest welcome SMS text with QR link and PIN", () => {
      const sms = buildGuestWelcomeSms({
        hotelName: "Cinnamon Bentota Beach",
        guestName: "Pasan Ramyanath",
        roomNumber: "204",
        qrUrl: "https://stay.ceylonhms.com/qr/cbb/204",
        folioPin: "8492",
        hotline: "+94 34 227 5000",
      });
      assert.match(sms, /Ayubowan Pasan Ramyanath!/);
      assert.match(sms, /Room 204 is active/);
      assert.match(sms, /PIN: 8492/);
      assert.match(sms, /\+94 34 227 5000/);
    });

    it("builds driver welcome SMS text with dorm bed allocation", () => {
      const sms = buildDriverWelcomeSms({
        hotelName: "Cinnamon Bentota Beach",
        driverName: "Sunil",
        dormBedNumber: "D-03",
        hotline: "+94 34 227 5000",
      });
      assert.match(sms, /Ayubowan Sunil!/);
      assert.match(sms, /Driver quarters bed D-03 & canteen meal vouchers/);
    });

    it("builds driver welcome SMS text for rest house allowance when dorm bed is omitted", () => {
      const sms = buildDriverWelcomeSms({
        hotelName: "Amangalla",
        driverName: "Kamal",
        dormBedNumber: undefined,
        hotline: "+94 91 223 3333",
      });
      assert.match(sms, /Driver rest-house allowance voucher issued/);
    });
  });

  describe("Check-In Readiness Validator (validateCheckInReadiness)", () => {
    it("approves INSPECTED room with verified guest identity", () => {
      const readiness = validateCheckInReadiness(SAMPLE_CHECK_IN);
      assert.strictEqual(readiness.isReady, true);
      assert.strictEqual(readiness.error, undefined);
      assert.strictEqual(readiness.warning, undefined);
    });

    it("approves CLEAN room with inspection warning", () => {
      const cleanStay: CheckInReservationDetails = {
        ...SAMPLE_CHECK_IN,
        roomStatus: "CLEAN",
      };
      const readiness = validateCheckInReadiness(cleanStay);
      assert.strictEqual(readiness.isReady, true);
      assert.match(readiness.warning ?? "", /pending final supervisor inspection/i);
    });

    it("rejects check-in when guest identity is unverified", () => {
      const unverified: CheckInReservationDetails = {
        ...SAMPLE_CHECK_IN,
        identityVerified: false,
      };
      const readiness = validateCheckInReadiness(unverified);
      assert.strictEqual(readiness.isReady, false);
      assert.match(readiness.error ?? "", /must be verified before check-in/i);
    });

    it("rejects check-in when room is DIRTY", () => {
      const dirtyStay: CheckInReservationDetails = {
        ...SAMPLE_CHECK_IN,
        roomStatus: "DIRTY",
      };
      const readiness = validateCheckInReadiness(dirtyStay);
      assert.strictEqual(readiness.isReady, false);
      assert.match(readiness.error ?? "", /DIRTY/);
    });

    it("rejects check-in when room is unallocated", () => {
      const noRoom: CheckInReservationDetails = {
        ...SAMPLE_CHECK_IN,
        roomNumber: "",
      };
      const readiness = validateCheckInReadiness(noRoom);
      assert.strictEqual(readiness.isReady, false);
      assert.match(readiness.error ?? "", /valid room must be allocated/i);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const idType: IdentityType = "PASSPORT";
      const readiness: RoomReadinessStatus = "INSPECTED";
      const meal: MealPlanCode = "AI";
      const driver: DriverStayDetails = {
        name: "Saman",
        mobile: "+94 77 111 2222",
      };
      const payload: CheckInConfirmPayload = {
        reservationId: "res-1",
        folioPin: "1234",
        qrTokenHmac: "hmac_123",
        sendGuestSms: true,
        sendDriverSms: false,
        keyCardsIssued: 2,
        lockedExchangeRateUsd: 305.5,
      };
      const props: CheckInConfirmDialogProps = {
        isOpen: true,
        onClose: noop,
        details: SAMPLE_CHECK_IN,
        onConfirmCheckIn: noop,
      };

      assert.strictEqual(idType, "PASSPORT");
      assert.strictEqual(readiness, "INSPECTED");
      assert.strictEqual(meal, "AI");
      assert.strictEqual(driver.name, "Saman");
      assert.strictEqual(payload.folioPin, "1234");
      assert.strictEqual(props.isOpen, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("returns null when isOpen is false", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CheckInConfirmDialog, {
          isOpen: false,
          onClose: noop,
          details: SAMPLE_CHECK_IN,
          onConfirmCheckIn: noop,
        }),
      );
      assert.strictEqual(markup, "");
    });

    it("renders dialog, guest profile, CBSL rate lock, QR card, and buttons", () => {
      const markup = renderToStaticMarkup(
        React.createElement(CheckInConfirmDialog, {
          isOpen: true,
          onClose: noop,
          details: SAMPLE_CHECK_IN,
          onConfirmCheckIn: noop,
        }),
      );
      assert.match(markup, /Activate Stay &amp; Room 204/);
      assert.match(markup, /Cinnamon Bentota Beach/);
      assert.match(markup, /CIN-RES-104/);
      assert.match(markup, /Pasan Ramyanath/);
      assert.match(markup, /199012345678/);
      assert.match(markup, /Identity Verified/);
      assert.match(markup, /Central Bank of Sri Lanka \(CBSL\) Locked Exchange Rate/);
      assert.match(markup, /1 USD = LKR 305\.50/);
      assert.match(markup, /1 EUR = LKR 332\.80/);
      assert.match(markup, /Contactless Room QR Activated/);
      assert.match(markup, /Keycards \/ RFID Keys Issued/);
      assert.match(markup, /Initial Check-In Deposit/);
      assert.match(markup, /Send Welcome SMS with Room QR link/);
      assert.match(markup, /Send Dorm Bed assignment &amp; Meal Voucher SMS to Driver/);
      assert.match(markup, /Confirm Check-In &amp; Activate Stay/);
    });

    it("renders subcomponents individually", () => {
      const headerMarkup = renderToStaticMarkup(
        React.createElement(CheckInHeader, {
          hotelName: "Heritance Kandalama",
          bookingReference: "HK-2026-1",
          roomNumber: "302",
          onClose: noop,
        }),
      );
      assert.match(headerMarkup, /Heritance Kandalama/);
      assert.match(headerMarkup, /HK-2026-1/);
      assert.match(headerMarkup, /Room 302/);

      const guestCardMarkup = renderToStaticMarkup(
        React.createElement(GuestVerificationCard, {
          details: SAMPLE_CHECK_IN,
        }),
      );
      assert.match(guestCardMarkup, /Guest Identity &amp; Verification/);
      assert.match(guestCardMarkup, /Identity Verified/);

      const rateMarkup = renderToStaticMarkup(
        React.createElement(CbslRateLockCard, {
          usdRate: 305.5,
          eurRate: 332.8,
          timestamp: "2026-10-19 09:00",
          outstandingLkr: 60000,
        }),
      );
      assert.match(rateMarkup, /1 USD = LKR 305\.50/);
      assert.match(rateMarkup, /LKR 60,000/);

      const qrMarkup = renderToStaticMarkup(
        React.createElement(ActiveRoomQrCard, {
          qrUrl: "https://stay.ceylonhms.com/qr/tenant/204",
          folioPin: "9912",
          roomNumber: "204",
        }),
      );
      assert.match(qrMarkup, /Contactless Room QR Activated/);
      assert.match(qrMarkup, /9912/);

      const togglesMarkup = renderToStaticMarkup(
        React.createElement(SmsToggles, {
          sendGuestSms: true,
          sendDriverSms: false,
          guestMobile: "+94 77 123 4567",
          driverDetails: SAMPLE_CHECK_IN.driverDetails,
          onGuestSmsChange: noop,
          onDriverSmsChange: noop,
        }),
      );
      assert.match(togglesMarkup, /Instant SMS Welcome Dispatch/);
      assert.match(togglesMarkup, /\+94 77 123 4567/);
    });
  });
});
