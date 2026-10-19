import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_THERMAL_GUEST,
  DEFAULT_THERMAL_HOTEL,
  DEFAULT_THERMAL_LINES,
  DEFAULT_THERMAL_PAYMENTS,
  PrintableThermalFolio,
  type PrintableThermalFolioProps,
  type ThermalFolioGuestInfo,
  type ThermalFolioHotelInfo,
  type ThermalFolioItemLine,
  type ThermalFolioPaymentLine,
  type ThermalFolioTaxSummary,
  type ThermalPaperWidth,
  computeThermalTaxTotals,
  generateThermalLankaQrPayload,
  roundLkr,
} from "../src/admin/folios/PrintableThermalFolio.js";

describe("Step 209: PrintableThermalFolio & 80mm Express Check-Out Slip", () => {
  describe("1. Rounding and Currency Math (roundLkr)", () => {
    it("handles non-finite values safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(1234.564), 1234.56);
      assert.strictEqual(roundLkr(1234.565), 1234.57);
      assert.strictEqual(roundLkr(100), 100);
    });
  });

  describe("2. Thermal Tax & Levies Compounding Engine (computeThermalTaxTotals)", () => {
    it("computes exact Sri Lankan 4-stage tax compounding on thermal lines", () => {
      const summary: ThermalFolioTaxSummary = computeThermalTaxTotals(
        DEFAULT_THERMAL_LINES,
        DEFAULT_THERMAL_PAYMENTS,
        305.5,
      );

      // Base supply = 65000*3 + 24000 + 30000 = 249,000 LKR
      assert.strictEqual(summary.baseSupplyLkr, 249000);

      // 10% Service Charge = 24,900 LKR
      assert.strictEqual(summary.serviceChargeLkr, 24900);

      // 1% TDL = 2,739 LKR
      assert.strictEqual(summary.tdlLkr, 2739);

      // 2.5% SSCL = 6,847.50 LKR
      assert.strictEqual(summary.ssclLkr, 6847.5);

      // 18% VAT = 51,027.57 LKR
      assert.strictEqual(summary.vatLkr, 51027.57);

      // Grand Total = 334,514.07 LKR
      assert.strictEqual(summary.grandTotalLkr, 334514.07);

      // Paid Total = 87322.95 + 150000 = 237,322.95 LKR
      assert.strictEqual(summary.totalPaidLkr, 237322.95);

      // Net Balance Due = 334,514.07 - 237,322.95 = 97,191.12 LKR
      assert.strictEqual(summary.balanceDueLkr, 97191.12);

      // Indicative USD Balance = 97191.12 / 305.50 = 318.14 USD
      assert.strictEqual(summary.indicativeUsdBalance, 318.14);
    });

    it("handles zero charges or payments safely", () => {
      const emptySummary = computeThermalTaxTotals([], []);
      assert.strictEqual(emptySummary.baseSupplyLkr, 0);
      assert.strictEqual(emptySummary.grandTotalLkr, 0);
      assert.strictEqual(emptySummary.totalPaidLkr, 0);
      assert.strictEqual(emptySummary.balanceDueLkr, 0);
      assert.strictEqual(emptySummary.indicativeUsdBalance, 0);
    });
  });

  describe("3. LankaQR Dynamic Payload Generation (generateThermalLankaQrPayload)", () => {
    it("generates compliant EMVCo string for thermal slip", () => {
      const payload = generateThermalLankaQrPayload(DEFAULT_THERMAL_HOTEL, 97191.12, "FOLIO-0991");

      // EMVCo format indicator
      assert.ok(payload.startsWith("000201"), "Must start with Tag 00=01");

      // Dynamic QR Tag 01=12
      assert.ok(payload.includes("010212"), "Must include dynamic Tag 01=12");

      // Tag 26 LankaQR
      assert.ok(payload.includes("COM.LANKAQR"), "Must contain COM.LANKAQR");
      assert.ok(
        payload.includes(DEFAULT_THERMAL_HOTEL.lankaQrMerchantId ?? "000000000012345"),
        "Must contain merchant ID",
      );

      // Currency 144 (LKR)
      assert.ok(payload.includes("5303144"), "Must contain LKR currency 144");

      // Amount Tag 54
      assert.ok(payload.includes("540897191.12"), "Must include formatted amount");

      // Reference Tag 62
      assert.ok(payload.includes("FOLIO-0991"), "Must include folio reference");

      // CRC-16 Checksum Tag 63
      assert.ok(payload.includes("6304"), "Must include checksum tag 6304");
    });
  });

  describe("4. Presets and Metadata Integrity", () => {
    it("verifies default hotel, guest, lines, and payments structures", () => {
      assert.strictEqual(DEFAULT_THERMAL_HOTEL.hotelName, "Tangalle Breeze Resort & Spa");
      assert.strictEqual(DEFAULT_THERMAL_GUEST.roomNumber, "104");
      assert.strictEqual(DEFAULT_THERMAL_GUEST.guestFullName, "Alexander James Wright");
      assert.ok(DEFAULT_THERMAL_LINES.length >= 5);
      assert.ok(DEFAULT_THERMAL_PAYMENTS.length >= 2);
    });
  });

  describe("5. React Component Static Markup Rendering (PrintableThermalFolio)", () => {
    it("renders 80mm thermal slip with embedded LankaQR code", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableThermalFolio, {
          hotel: DEFAULT_THERMAL_HOTEL,
          guest: DEFAULT_THERMAL_GUEST,
          lines: DEFAULT_THERMAL_LINES,
          payments: DEFAULT_THERMAL_PAYMENTS,
          initialPaperWidth: 80,
          cashierName: "Dinesh P.",
          printTimestamp: "2026-10-19 11:45",
          onPrint: () => undefined,
          onClose: () => undefined,
        }),
      );

      // Slip Title & Hotel
      assert.ok(html.includes("INTERIM BILL / EXPRESS CHECK-OUT"));
      assert.ok(html.includes("Tangalle Breeze Resort"));
      assert.ok(html.includes("42 Beach Road, Tangalle"));
      assert.ok(html.includes("Tel: +94 47 224 8900"));

      // Stay & Room Context
      assert.ok(html.includes("ROOM: 104"));
      assert.ok(html.includes("FOLIO: FOLIO-2026-0991"));
      assert.ok(html.includes("Alexander James Wright"));
      assert.ok(html.includes("STAY: 2026-10-16 to 2026-10-19"));
      assert.ok(html.includes("CASHIER: Dinesh P."));

      // Itemized lines
      assert.ok(html.includes("Ocean Plunge Villa (Night 1)"));
      assert.ok(html.includes("Lagoon Catch Lobster Dinner"));
      assert.ok(html.includes("Ayurvedic Compress Ritual (x2)"));

      // Compounding Taxes & Levies
      assert.ok(html.includes("Base Value of Supply:"));
      assert.ok(html.includes("Service Charge (10%):"));
      assert.ok(html.includes("TDL (1%):"));
      assert.ok(html.includes("SSCL (2.5%):"));
      assert.ok(html.includes("VAT (18%):"));
      assert.ok(html.includes("TOTAL CHARGES:"));

      // Net Balance Due
      assert.ok(html.includes("BALANCE DUE:"));
      assert.ok(html.includes("97,191.12"));
      assert.ok(html.includes("USD @ CBSL 305.50"));

      // Embedded LankaQR vector SVG
      assert.ok(html.includes("SCAN &amp; PAY FROM YOUR ROOM"));
      assert.ok(html.includes("<svg"));
      assert.ok(html.includes("CBSL LankaQR"));
      assert.ok(html.includes("ස්කෑන් කර ගෙවා පිටවන්න"));

      // Toolbar buttons
      assert.ok(html.includes("Print Thermal Slip"));
      assert.ok(html.includes("80mm Standard POS"));
      assert.ok(html.includes("58mm Pocket"));
    });

    it("renders zero balance settled message when fully paid", () => {
      const settledTax: ThermalFolioTaxSummary = {
        baseSupplyLkr: 249000,
        serviceChargeLkr: 24900,
        tdlLkr: 2739,
        ssclLkr: 6847.5,
        vatLkr: 51027.57,
        grandTotalLkr: 334514.07,
        totalPaidLkr: 334514.07,
        balanceDueLkr: 0,
        indicativeUsdBalance: 0,
      };

      const html = renderToStaticMarkup(
        React.createElement(PrintableThermalFolio, {
          hotel: DEFAULT_THERMAL_HOTEL,
          guest: DEFAULT_THERMAL_GUEST,
          lines: DEFAULT_THERMAL_LINES,
          payments: DEFAULT_THERMAL_PAYMENTS,
          taxSummary: settledTax,
        }),
      );

      assert.ok(html.includes("FOLIO FULLY SETTLED"));
      assert.ok(html.includes("leave your key in the express drop box"));
    });

    it("exercises typescript interfaces and types safely", () => {
      const width: ThermalPaperWidth = 58;
      const hotel: ThermalFolioHotelInfo = {
        hotelName: "Kandy View",
        address: "Peradeniya Road",
        phone: "+94 81 222 3344",
      };
      const guest: ThermalFolioGuestInfo = {
        guestFullName: "Sarah Jenkins",
        roomNumber: "201",
        bookingReference: "BK-KDY-01",
        checkInDate: "2026-10-18",
        checkOutDate: "2026-10-20",
        nightsCount: 2,
        adultsCount: 1,
        mealPlan: "BB",
        folioId: "FOLIO-201",
      };
      const line: ThermalFolioItemLine = {
        id: "L1",
        date: "10/18",
        description: "Room Night",
        quantity: 1,
        amountLkr: 40000,
      };
      const payment: ThermalFolioPaymentLine = {
        id: "P1",
        method: "Cash LKR",
        amountLkr: 40000,
        date: "10/19",
      };

      const props: PrintableThermalFolioProps = {
        hotel,
        guest,
        lines: [line],
        payments: [payment],
        initialPaperWidth: width,
      };

      assert.strictEqual(width, 58);
      assert.strictEqual(props.hotel?.hotelName, "Kandy View");
    });
  });
});
