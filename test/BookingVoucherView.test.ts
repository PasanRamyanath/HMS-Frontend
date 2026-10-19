import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BookingVoucherView,
  type BookingVoucherViewProps,
  type ConfirmedBookingVoucher,
  DEFAULT_BOOKING_VOUCHER,
  type PaymentStatus,
  type ResidencyTier,
  buildPreCheckInUrl,
  buildWhatsAppShareText,
  formatUsd,
  getPaymentBadgeStatus,
} from "../src/qr/booking/BookingVoucherView.js";

describe("Direct Booking Confirmation & Printable E-Voucher (BookingVoucherView.tsx)", () => {
  describe("1. Default Constants & Configurations", () => {
    it("provides complete default booking voucher for Sri Lankan hospitality", () => {
      const customProps: BookingVoucherViewProps = {
        voucher: DEFAULT_BOOKING_VOUCHER,
      };
      assert.ok(customProps.voucher);
      const v = DEFAULT_BOOKING_VOUCHER;
      assert.strictEqual(v.bookingReference, "SL-BKG-2026-89412");
      assert.strictEqual(v.tenantId, "tenant-galle-fort");
      assert.strictEqual(v.hotelName, "Galle Fort Lighthouse Villa");
      assert.strictEqual(v.hotelCity, "Galle");
      assert.strictEqual(v.guestName, "Kasun Jayasuriya");
      assert.strictEqual(v.residencyTier, "RESIDENT_LKR");
      assert.strictEqual(v.nights, 3);
      assert.strictEqual(v.paymentStatus, "DEPOSIT_30_PAID");
      assert.strictEqual(v.driverBedAllocated, true);
      assert.strictEqual(v.addons.length, 2);
      assert.ok(v.taxesBreakdown.vatLkr > 0);
      assert.ok(v.taxesBreakdown.serviceChargeLkr > 0);
    });
  });

  describe("2. Helper Functions & Formatting", () => {
    it("formatUsd formats numerical amounts with 2 decimals and prefix", () => {
      assert.strictEqual(formatUsd(700), "USD 700.00");
      assert.strictEqual(formatUsd(1250.5), "USD 1,250.50");
      assert.strictEqual(formatUsd(0), "USD 0.00");
    });

    it("buildPreCheckInUrl constructs safe URI encoded route", () => {
      const url = buildPreCheckInUrl("tenant 123", "BKG#456");
      assert.strictEqual(url, "/pre-checkin/tenant%20123/BKG%23456");
    });

    it("buildWhatsAppShareText generates URI-encoded share text with LKR formatting for residents", () => {
      const encoded = buildWhatsAppShareText(DEFAULT_BOOKING_VOUCHER);
      const decoded = decodeURIComponent(encoded);
      assert.ok(decoded.includes("Galle Fort Lighthouse Villa"));
      assert.ok(decoded.includes("SL-BKG-2026-89412"));
      assert.ok(decoded.includes("LKR"));
      assert.ok(decoded.includes("Half Board (HB)"));
      assert.ok(decoded.includes("+94 91 223 4567"));
    });

    it("buildWhatsAppShareText generates URI-encoded share text with USD formatting for foreign guests", () => {
      const foreignVoucher: ConfirmedBookingVoucher = {
        ...DEFAULT_BOOKING_VOUCHER,
        residencyTier: "FOREIGN_USD" as ResidencyTier,
        grandTotalUsd: 850,
      };
      const encoded = buildWhatsAppShareText(foreignVoucher);
      const decoded = decodeURIComponent(encoded);
      assert.ok(decoded.includes("USD 850.00"));
      assert.ok(!decoded.includes("LKR 210,000"));
    });

    it("getPaymentBadgeStatus maps PAID_IN_FULL and DEPOSIT_30_PAID to badges", () => {
      const full = getPaymentBadgeStatus("PAID_IN_FULL");
      assert.strictEqual(full.label, "PAID IN FULL (100%)");
      assert.strictEqual(full.color, "green");

      const deposit = getPaymentBadgeStatus("DEPOSIT_30_PAID");
      assert.strictEqual(deposit.label, "30% ADVANCE DEPOSIT PAID");
      assert.strictEqual(deposit.color, "amber");
    });
  });

  describe("3. Static Markup & Component Rendering", () => {
    it("renders default voucher successfully with all sections", () => {
      const html = renderToStaticMarkup(React.createElement(BookingVoucherView));
      assert.ok(html.includes("SL-BKG-2026-89412"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("You&#x27;re Heading to Galle!"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Deluxe Ocean View Villa"));
      assert.ok(html.includes("Half Board (HB)"));
      assert.ok(html.includes("30% ADVANCE DEPOSIT PAID"));
      assert.ok(html.includes("Driver / Chauffeur Quarters"));
      assert.ok(html.includes("BIA Katunayake Private Transfer"));
      assert.ok(html.includes("Print / Save E-Voucher"));
      assert.ok(html.includes("Share via WhatsApp"));
    });

    it("renders full payment state with zero balance due badge", () => {
      const paidVoucher: ConfirmedBookingVoucher = {
        ...DEFAULT_BOOKING_VOUCHER,
        paymentStatus: "PAID_IN_FULL" as PaymentStatus,
        paidAmountLkr: 210000,
        balanceDueLkr: 0,
      };
      const html = renderToStaticMarkup(
        React.createElement(BookingVoucherView, { voucher: paidVoucher }),
      );
      assert.ok(html.includes("PAID IN FULL (100%)"));
      assert.ok(html.includes("Zero balance due on arrival"));
    });

    it("renders foreign guest voucher with USD rates", () => {
      const foreignVoucher: ConfirmedBookingVoucher = {
        ...DEFAULT_BOOKING_VOUCHER,
        guestName: "Emma Watson",
        guestNicOrPassport: "PA9876543",
        residencyTier: "FOREIGN_USD" as ResidencyTier,
        paidAmountUsd: 210,
        balanceDueUsd: 490,
        grandTotalUsd: 700,
      };
      const html = renderToStaticMarkup(
        React.createElement(BookingVoucherView, { voucher: foreignVoucher }),
      );
      assert.ok(html.includes("Emma Watson"));
      assert.ok(html.includes("Foreign Guest (USD Rates)"));
      assert.ok(html.includes("USD 700.00"));
      assert.ok(html.includes("USD 210.00"));
      assert.ok(html.includes("USD 490.00"));
    });

    it("handles pre-check-in link with custom callback", () => {
      let clickedUrl = "";
      const html = renderToStaticMarkup(
        React.createElement(BookingVoucherView, {
          onPreCheckInClick: (url: string) => {
            clickedUrl = url;
          },
        }),
      );
      assert.ok(html.includes("Start Pre-Check-In"));
      assert.strictEqual(clickedUrl, ""); // static markup does not trigger clicks
    });
  });
});
