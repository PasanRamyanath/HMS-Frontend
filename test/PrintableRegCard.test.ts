import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_REG_CARD_DATA,
  PrintableRegCard,
  type PrintableRegCardData,
  type PrintableRegCardProps,
  calculateNights,
  formatRegCardDateRange,
} from "../src/admin/frontdesk/PrintableRegCard.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_CUSTOM_DATA: PrintableRegCardData = {
  hotelName: "Amangalla Galle Fort",
  hotelAddress: "10 Church Street, Fort, Galle 80000, Sri Lanka",
  hotelPhone: "+94 91 223 3388",
  sltdaLicenseNo: "SLTDA/HOTEL/1972/0012",
  vatRegistrationNo: "VAT-200987654-7000",
  regCardSerialNo: "RC-GAL-2026-0044",
  bookingReference: "GAL-RES-1122",
  guestName: "Lady Jacqueline Howard",
  identityType: "FOREIGN_PASSPORT",
  identityNumber: "GB44556677",
  nationality: "British",
  countryCode: "GB",
  phone: "+44 20 7946 0991",
  email: "jacqueline@howardestates.co.uk",
  roomNumber: "Suite 5",
  roomCategory: "Historical Amangalla Suite",
  mealPlan: "FB",
  paxAdults: 2,
  paxChildren: 1,
  checkInDate: "2026-11-01",
  checkInTime: "15:00",
  checkOutDate: "2026-11-05",
  checkOutTime: "12:00",
  wifiSsid: "Amangalla-Guest",
  wifiPassword: "DutchFortGalle26",
  roomQrUrl: "https://stay.amangalla.lk/qr/amangalla/suite-5",
  folioPin: "9102",
  roomRateLkr: 145000,
  advanceDepositLkr: 145000,
  verifiedByStaffName: "M. Perera",
  specialRequests: "Afternoon tea served on private veranda daily at 16:00.",
  signatureDataUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
};

const SRI_LANKAN_GUEST_DATA: PrintableRegCardData = {
  hotelName: "Jetwing Lighthouse",
  hotelAddress: "Dadella, Galle, Sri Lanka",
  hotelPhone: "+94 91 222 3744",
  sltdaLicenseNo: "SLTDA/HOTEL/1997/0055",
  regCardSerialNo: "RC-JWL-2026-0888",
  bookingReference: "JWL-2026-5544",
  guestName: "Dr. Rohitha Senaratne",
  identityType: "SRI_LANKAN_NIC",
  identityNumber: "197214502819",
  nationality: "Sri Lankan",
  countryCode: "LK",
  phone: "+94 77 234 5678",
  roomNumber: "302",
  roomCategory: "Deluxe Ocean View",
  mealPlan: "HB",
  paxAdults: 2,
  paxChildren: 0,
  checkInDate: "2026-10-25",
  checkInTime: "14:00",
  checkOutDate: "2026-10-26",
  checkOutTime: "11:00",
  wifiSsid: "Lighthouse-Guest",
  wifiPassword: "BawaLighthouse26",
  roomQrUrl: "https://stay.jetwing.lk/qr/lighthouse/302",
  folioPin: "3311",
  roomRateLkr: 48000,
  advanceDepositLkr: 48000,
  verifiedByStaffName: "D. Jayawardena",
};

describe("Printable A4 Guest Registration Card & Welcome Slip (PrintableRegCard.tsx)", () => {
  describe("Date & Night Calculations", () => {
    it("accurately computes nights between dates", () => {
      assert.strictEqual(calculateNights("2026-10-19", "2026-10-23"), 4);
      assert.strictEqual(calculateNights("2026-10-19", "2026-10-20"), 1);
    });

    it("clamps minimum night to 1 for same-day departure", () => {
      assert.strictEqual(calculateNights("2026-10-19", "2026-10-19"), 1);
    });

    it("formats readable date range with pluralized nights count", () => {
      assert.strictEqual(
        formatRegCardDateRange("2026-10-19", "2026-10-23"),
        "2026-10-19 to 2026-10-23 (4 nights)",
      );
      assert.strictEqual(
        formatRegCardDateRange("2026-10-19", "2026-10-20"),
        "2026-10-19 to 2026-10-20 (1 night)",
      );
    });
  });

  describe("Component Rendering & Structure (PrintableRegCard)", () => {
    it("renders default registration card without crashing", () => {
      const html = renderToStaticMarkup(React.createElement(PrintableRegCard, {}));
      assert.ok(html.includes("Official Guest Registration Card &amp; Welcome Pass"));
      assert.ok(html.includes("Official Registration Card • Form B"));
      assert.ok(html.includes("Earl&#x27;s Regency Kandy"));
      assert.ok(html.includes("Alexander James Wright"));
      assert.ok(html.includes("GB98451234"));
      assert.ok(html.includes("Deluxe Mountain View"));
      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Guest Welcome Slip"));
      assert.ok(html.includes("EarlsRegency-Guest"));
      assert.ok(html.includes("KandyTeaTrails26"));
      assert.ok(html.includes("Folio Security PIN"));
      assert.ok(html.includes("4829"));
      assert.ok(html.includes("<svg")); // Room QR code vector SVG
      assert.ok(html.includes("Statutory Declaration &amp; Hotel Regulations"));
      assert.ok(html.includes("Section 33 of the Immigrants &amp; Emigrants Act"));
    });

    it("renders custom property data and guest details correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableRegCard, {
          data: SAMPLE_CUSTOM_DATA,
          onPrint: noop,
          onClose: noop,
        }),
      );
      assert.ok(html.includes("Amangalla Galle Fort"));
      assert.ok(html.includes("SLTDA/HOTEL/1972/0012"));
      assert.ok(html.includes("VAT-200987654-7000"));
      assert.ok(html.includes("Lady Jacqueline Howard"));
      assert.ok(html.includes("Suite 5"));
      assert.ok(html.includes("DutchFortGalle26"));
      assert.ok(html.includes("9102"));
      assert.ok(html.includes("Afternoon tea served on private veranda"));
      assert.ok(html.includes("data:image/png;base64,"));
      assert.ok(html.includes("Close"));
    });

    it("renders Sri Lankan NIC fields when guest identity is NIC", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableRegCard, {
          data: SRI_LANKAN_GUEST_DATA,
        }),
      );
      assert.ok(html.includes("NIC Number"));
      assert.ok(html.includes("197214502819"));
      assert.ok(html.includes("Jetwing Lighthouse"));
    });

    it("renders print button in screen toolbar and handles disabled state", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableRegCard, {
          disabled: true,
        }),
      );
      assert.ok(html.includes("disabled"));
      assert.ok(html.includes("Print Registration Card (A4)"));
    });

    it("DEFAULT_REG_CARD_DATA is complete and valid", () => {
      assert.strictEqual(DEFAULT_REG_CARD_DATA.hotelName, "Earl's Regency Kandy");
      assert.ok(DEFAULT_REG_CARD_DATA.roomRateLkr > 0);
      assert.ok(DEFAULT_REG_CARD_DATA.roomQrUrl.startsWith("https://"));
    });
  });

  describe("Contract & Type Invariants", () => {
    it("PrintableRegCardData is cleanly constructible", () => {
      const card: PrintableRegCardData = {
        ...DEFAULT_REG_CARD_DATA,
        hotelName: "Heritance Tea Factory",
      };
      assert.strictEqual(card.hotelName, "Heritance Tea Factory");
    });

    it("PrintableRegCardProps is cleanly constructible", () => {
      const props: PrintableRegCardProps = {
        disabled: false,
        onPrint: noop,
      };
      assert.strictEqual(props.disabled, false);
    });
  });
});
