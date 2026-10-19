import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_GUEST_CONTACT,
  DEFAULT_STAY_SUMMARY,
  DEPOSIT_OPTIONS,
  DOMESTIC_GATEWAY_OPTIONS,
  type DepositScheme,
  DirectBookingCheckout,
  type DirectBookingCheckoutProps,
  type DirectCheckoutSummary,
  type DomesticGateway,
  FOREIGN_GATEWAY_OPTIONS,
  type ForeignGateway,
  type GuestContactInfo,
  type PayHereSignedPayload,
  type PaymentGateway,
  type StayReservationSummary,
  calculateCheckoutSummary,
  generateDynamicLankaQrString,
  generatePayHereSignedPayload,
} from "../src/qr/booking/DirectBookingCheckout.js";

describe("Dual-Gateway Direct Booking Checkout (DirectBookingCheckout.tsx)", () => {
  describe("1. Configurations & Constants", () => {
    it("defines domestic and foreign payment gateways correctly", () => {
      assert.strictEqual(DOMESTIC_GATEWAY_OPTIONS.length, 2);
      const domIds: DomesticGateway[] = DOMESTIC_GATEWAY_OPTIONS.map((g) => g.id);
      assert.deepStrictEqual(domIds, ["LANKA_QR", "PAYHERE_LKR"]);

      assert.strictEqual(FOREIGN_GATEWAY_OPTIONS.length, 2);
      const foreignIds: ForeignGateway[] = FOREIGN_GATEWAY_OPTIONS.map((g) => g.id);
      assert.deepStrictEqual(foreignIds, ["PAYHERE_USD", "WEBXPAY_USD"]);
    });

    it("defines deposit schemes (100% full vs 30% advance)", () => {
      assert.strictEqual(DEPOSIT_OPTIONS.length, 2);
      const depositIds: DepositScheme[] = DEPOSIT_OPTIONS.map((d) => d.id);
      assert.deepStrictEqual(depositIds, ["FULL_100", "ADVANCE_30"]);
    });

    it("verifies default guest contact and stay summary structures", () => {
      const contact: GuestContactInfo = DEFAULT_GUEST_CONTACT;
      assert.strictEqual(contact.fullName, "Kasun Jayasuriya");
      assert.strictEqual(contact.phone, "+94772345678");
      assert.strictEqual(contact.agreedToTerms, true);

      const stay: StayReservationSummary = DEFAULT_STAY_SUMMARY;
      assert.strictEqual(stay.roomTypeName, "Deluxe Ocean View Room");
      assert.strictEqual(stay.nights, 3);
      assert.strictEqual(stay.driverBedRequested, true);
      assert.strictEqual(stay.roomTotalLkr, 150000);
      assert.strictEqual(stay.addonsTotalLkr, 60000);
    });
  });

  describe("2. Financial Calculators & PayHere / LankaQR Encoders", () => {
    it("calculates 100% full prepayment with 4-stage tax compounding", () => {
      // Subtotal = 150k room + 60k addons = 210,000 LKR
      // SC (10%): 21,000 -> 231,000
      // TDL (1%): 2,310
      // SSCL (2.5%): 5,775
      // VAT Base: 231,000 + 2,310 + 5,775 = 239,085
      // VAT (18%): 43,035
      // Grand Total: 231,000 + 2,310 + 5,775 + 43,035 = 282,120
      const summary: DirectCheckoutSummary = calculateCheckoutSummary(
        DEFAULT_STAY_SUMMARY,
        "FULL_100",
        300,
      );

      assert.strictEqual(summary.subtotalLkr, 210000);
      assert.strictEqual(summary.grandTotalLkr, 282120);
      assert.strictEqual(summary.payableNowLkr, 282120);
      assert.strictEqual(summary.payableAtCheckInLkr, 0);
      assert.strictEqual(summary.depositScheme, "FULL_100");
    });

    it("calculates 30% advance deposit correctly with remaining 70% due at check-in", () => {
      const summary: DirectCheckoutSummary = calculateCheckoutSummary(
        DEFAULT_STAY_SUMMARY,
        "ADVANCE_30",
        300,
      );

      assert.strictEqual(summary.grandTotalLkr, 282120);
      // 30% of 282,120 = 84,636
      assert.strictEqual(summary.payableNowLkr, 84636);
      // Remaining 70% = 282,120 - 84,636 = 197,484
      assert.strictEqual(summary.payableAtCheckInLkr, 197484);
      assert.strictEqual(summary.depositScheme, "ADVANCE_30");
    });

    it("generates signed PayHere form payload with valid attributes", () => {
      const payload: PayHereSignedPayload = generatePayHereSignedPayload(
        "tenant-galle-fort",
        "DIR-GALL-123456",
        84636,
        "LKR",
        DEFAULT_GUEST_CONTACT,
        "Deluxe Ocean View Room",
      );

      assert.strictEqual(payload.merchantId, "MERCHANT_TENANT-GALLE-FORT");
      assert.strictEqual(payload.orderId, "DIR-GALL-123456");
      assert.strictEqual(payload.currency, "LKR");
      assert.strictEqual(payload.amount, 84636);
      assert.strictEqual(payload.firstName, "Kasun");
      assert.strictEqual(payload.lastName, "Jayasuriya");
      assert.strictEqual(payload.email, "kasun.j@example.lk");
      assert.strictEqual(payload.country, "Sri Lanka");
      assert.ok(payload.hash.startsWith("ph_sig_"));
      assert.ok(payload.returnUrl.includes("receipt?ref="));
    });

    it("generates dynamic EMVCo LankaQR payload with currency 144 (LKR) and amount tag", () => {
      const qrString = generateDynamicLankaQrString("tenant-galle-fort", "DIR-GALL-123456", 84636);

      assert.ok(qrString.startsWith("000201010212"));
      assert.ok(qrString.includes("5303144")); // LKR currency code
      assert.ok(qrString.includes("540884636.00")); // Amount tag 54 length 08
      assert.ok(qrString.includes("5802LK")); // Sri Lanka country code
      assert.ok(qrString.includes("DIR-GALL-123456")); // Invoice reference
    });
  });

  describe("3. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders progress header and title with direct booking guarantee", () => {
      const props: DirectBookingCheckoutProps = {
        tenantId: "tenant-bentota-resort",
        hotelName: "Bentota River Safari Villa",
        residencyTier: "RESIDENT_LKR",
      };

      const html = renderToStaticMarkup(React.createElement(DirectBookingCheckout, props));

      assert.ok(html.includes("Step 3 of 3"));
      assert.ok(html.includes("Guaranteed Direct Checkout"));
      assert.ok(html.includes("Confirm &amp; Secure Direct Reservation"));
      assert.ok(html.includes('data-tenant="tenant-bentota-resort"'));
    });

    it("renders Guest Details form with Sri Lankan NIC for resident guests", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, { residencyTier: "RESIDENT_LKR" }),
      );

      assert.ok(html.includes("Full Name (as in Passport/NIC) *"));
      assert.ok(html.includes("Confirmation Email Address *"));
      assert.ok(html.includes("Mobile WhatsApp Number *"));
      assert.ok(html.includes("Sri Lankan National Identity Card (NIC) *"));
      assert.ok(html.includes("Special Requests &amp; Dietary Preferences"));
    });

    it("renders Passport field for Foreign Visitor guests", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, { residencyTier: "FOREIGN_USD" }),
      );

      assert.ok(html.includes("Passport Number (Foreign Guest) *"));
      assert.ok(html.includes("Payment Method (USD International)"));
    });

    it("renders Deposit Policy Selector (100% full vs 30% advance)", () => {
      const html = renderToStaticMarkup(React.createElement(DirectBookingCheckout, {}));

      assert.ok(html.includes("Deposit &amp; Payment Terms"));
      assert.ok(html.includes("Zero Commission Booking"));
      assert.ok(html.includes("Pay 100% Total Online"));
      assert.ok(html.includes("All taxes &amp; charges settled"));
    });

    it("renders LankaQR panel with timer, SVG container, and certified bank list", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, {
          residencyTier: "RESIDENT_LKR",
          initialGateway: "LANKA_QR",
        }),
      );

      assert.ok(html.includes("Dynamic Rate Hold Expires In:"));
      assert.ok(html.includes("CBSL LankaQR"));
      assert.ok(html.includes("Scan using any LankaPay / CBSL certified banking app:"));
      assert.ok(html.includes("ComBank Q+ • HNB SOLO • Sampath WePay"));
      assert.ok(html.includes("I Have Completed Payment"));
    });

    it("renders PayHere form with hidden fields when PayHere is selected", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, {
          residencyTier: "RESIDENT_LKR",
          initialGateway: "PAYHERE_LKR",
        }),
      );

      assert.ok(html.includes("PayHere Sri Lanka 256-Bit SSL Redirect"));
      assert.ok(html.includes("Secure 3D-Secure 2.0"));
      assert.ok(html.includes('action="https://sandbox.payhere.lk/pay/checkout"'));
      assert.ok(html.includes('name="merchant_id"'));
      assert.ok(html.includes('name="hash"'));
      assert.ok(html.includes("Proceed to PayHere Sri Lanka Gateway"));
    });

    it("renders WebXPay gateway option for foreign USD guests", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, {
          residencyTier: "FOREIGN_USD",
          initialGateway: "WEBXPAY_USD",
        }),
      );

      assert.ok(html.includes("WebXPay Global IPG 256-Bit SSL Redirect"));
      assert.ok(html.includes("Proceed to WebXPay Global IPG Gateway"));
    });

    it("renders Order Summary Sidebar with room nights, add-ons, and statutory tax breakdown", () => {
      const html = renderToStaticMarkup(React.createElement(DirectBookingCheckout, {}));

      assert.ok(html.includes("Reservation Summary"));
      assert.ok(html.includes("Deluxe Ocean View Room"));
      assert.ok(html.includes("Half Board (HB) • 3 Nights"));
      assert.ok(html.includes("Driver Quarters &amp; Meals Confirmed (Complimentary)"));
      assert.ok(html.includes("Service Charge (10% to Staff Pool):"));
      assert.ok(html.includes("Tourism Levy (1% TDL to SLTDA):"));
      assert.ok(html.includes("SSCL (2.5% to IRD):"));
      assert.ok(html.includes("VAT (18% Statutory):"));
      assert.ok(html.includes("Grand Total:"));
    });

    it("renders back button when onBack callback is supplied", () => {
      const html = renderToStaticMarkup(
        React.createElement(DirectBookingCheckout, {
          onBack: () => {
            /* No-op callback */
          },
        }),
      );

      assert.ok(html.includes("Back to Island Add-Ons"));
    });

    it("verifies PaymentGateway union type constructibility", () => {
      const p1: PaymentGateway = "LANKA_QR";
      const p2: PaymentGateway = "PAYHERE_LKR";
      const p3: PaymentGateway = "PAYHERE_USD";
      const p4: PaymentGateway = "WEBXPAY_USD";
      assert.ok(p1 && p2 && p3 && p4);
    });
  });
});
