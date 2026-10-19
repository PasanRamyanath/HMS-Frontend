import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BankRemittanceDetails,
  DEFAULT_GUEST_PROFILE,
  DEFAULT_HOTEL_PROFILE,
  DEFAULT_INVOICE_METADATA,
  DEFAULT_STAY_CONTEXT,
  type InvoiceDocumentType,
  PrintableTaxInvoice,
  type PrintableTaxInvoiceProps,
  SAMPLE_PAYMENTS,
  SAMPLE_TAX_INVOICE_LINES,
  type TaxInvoiceCalculatedTotals,
  type TaxInvoiceGuestProfile,
  type TaxInvoiceHotelProfile,
  type TaxInvoiceLineItem,
  type TaxInvoiceMetadata,
  type TaxInvoicePaymentRecord,
  type TaxInvoiceStayContext,
  calculateInvoiceTaxTotals,
  calculateUsdIndicative,
  resolveInvoiceDocumentTitle,
  roundLkr,
} from "../src/admin/folios/PrintableTaxInvoice.js";

describe("Step 208: PrintableTaxInvoice & Official IRD / SLTDA Statutory Invoicing", () => {
  describe("1. Pure Number Rounding Helper (roundLkr)", () => {
    it("handles non-finite values safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(1234.564), 1234.56);
      assert.strictEqual(roundLkr(1234.565), 1234.57);
      assert.strictEqual(roundLkr(50000), 50000);
    });
  });

  describe("2. Indicative Forex Converter (calculateUsdIndicative)", () => {
    it("converts LKR to USD at specified CBSL locked indicative rate", () => {
      // 30,550 LKR at 305.50 rate = 100 USD
      const usd = calculateUsdIndicative(30550, 305.5);
      assert.strictEqual(usd, 100);
    });

    it("handles zero, negative, and invalid values safely", () => {
      assert.strictEqual(calculateUsdIndicative(0, 305.5), 0);
      assert.strictEqual(calculateUsdIndicative(-1000, 305.5), 0);
      assert.strictEqual(calculateUsdIndicative(1000, 0), 0);
      assert.strictEqual(calculateUsdIndicative(1000, -300), 0);
      assert.strictEqual(calculateUsdIndicative(Number.NaN, 305.5), 0);
    });
  });

  describe("3. IRD Document Title Resolver (resolveInvoiceDocumentTitle)", () => {
    it("returns TAX INVOICE with Section 20 citation when VAT registered", () => {
      const doc = resolveInvoiceDocumentTitle(true);
      assert.strictEqual(doc.title, "TAX INVOICE");
      assert.ok(doc.citation.includes("Section 20"));
      assert.ok(doc.citation.includes("Value Added Tax Act"));
    });

    it("returns COMMERCIAL INVOICE when non-VAT registered", () => {
      const doc = resolveInvoiceDocumentTitle(false);
      assert.strictEqual(doc.title, "COMMERCIAL INVOICE");
      assert.ok(doc.citation.includes("Inland Revenue Act"));
      assert.ok(doc.subtitle.includes("Non-VAT Registered"));
    });
  });

  describe("4. 4-Stage Statutory Tax Compounding Walk (calculateInvoiceTaxTotals)", () => {
    it("calculates exact totals from sample lines and payments", () => {
      const totals: TaxInvoiceCalculatedTotals = calculateInvoiceTaxTotals(
        SAMPLE_TAX_INVOICE_LINES,
        SAMPLE_PAYMENTS,
        305.5,
      );

      // Base supply = 65000 * 3 + 24000 + 30000 = 249,000 LKR
      assert.strictEqual(totals.totalBaseSupplyLkr, 249000);

      // 10% Service Charge = 24,900 LKR
      assert.strictEqual(totals.totalServiceChargeLkr, 24900);

      // Subtotal A = 249000 + 24900 = 273,900 LKR
      assert.strictEqual(totals.subtotalAfterScLkr, 273900);

      // 1% TDL = 2,739 LKR
      assert.strictEqual(totals.totalTdlLkr, 2739);

      // 2.5% SSCL = 6,847.50 LKR
      assert.strictEqual(totals.totalSsclLkr, 6847.5);

      // VAT Base = 273900 + 2739 + 6847.50 = 283,486.50 LKR
      assert.strictEqual(totals.vatBaseLkr, 283486.5);

      // 18% VAT = 51,027.57 LKR
      assert.strictEqual(totals.totalVatLkr, 51027.57);

      // Grand Total = 334,514.07 LKR
      assert.strictEqual(totals.grandTotalLkr, 334514.07);

      // Payments total = 87322.95 + 150000 + 97191.12 = 334,514.07 LKR
      assert.strictEqual(totals.totalPaidLkr, 334514.07);

      // Balance due should be exactly 0
      assert.strictEqual(totals.balanceDueLkr, 0);

      // Indicative USD
      assert.ok(totals.indicativeUsdTotal > 0);
    });

    it("handles empty lines and payments safely", () => {
      const emptyTotals = calculateInvoiceTaxTotals([], []);
      assert.strictEqual(emptyTotals.totalBaseSupplyLkr, 0);
      assert.strictEqual(emptyTotals.grandTotalLkr, 0);
      assert.strictEqual(emptyTotals.balanceDueLkr, 0);
      assert.strictEqual(emptyTotals.indicativeUsdTotal, 0);
    });
  });

  describe("5. Preset Defaults & Configurations", () => {
    it("verifies hotel default profile contains statutory registrations", () => {
      assert.strictEqual(DEFAULT_HOTEL_PROFILE.isVatRegistered, true);
      assert.ok(DEFAULT_HOTEL_PROFILE.tin.length > 0);
      assert.ok(DEFAULT_HOTEL_PROFILE.vatRegNo?.includes("-7000"));
      assert.ok(DEFAULT_HOTEL_PROFILE.ssclRegNo?.includes("-9000"));
      assert.ok(DEFAULT_HOTEL_PROFILE.sltdaRegNo?.startsWith("SLTDA"));
      assert.ok((DEFAULT_HOTEL_PROFILE.bankRemittance?.accountNumber.length ?? 0) > 0);
    });

    it("verifies sample lines and payments structure", () => {
      assert.ok(SAMPLE_TAX_INVOICE_LINES.length >= 5);
      assert.ok(SAMPLE_PAYMENTS.length >= 3);
      assert.strictEqual(DEFAULT_STAY_CONTEXT.roomNumber, "Villa 104");
      assert.strictEqual(DEFAULT_GUEST_PROFILE.guestFullName, "Alexander James Wright");
      assert.strictEqual(DEFAULT_INVOICE_METADATA.invoiceNumber, "INV-2026-00492");
    });
  });

  describe("6. React Component Static Markup Rendering (PrintableTaxInvoice)", () => {
    it("renders official TAX INVOICE for VAT-registered hotel", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTaxInvoice, {
          hotel: DEFAULT_HOTEL_PROFILE,
          guest: DEFAULT_GUEST_PROFILE,
          stay: DEFAULT_STAY_CONTEXT,
          lines: SAMPLE_TAX_INVOICE_LINES,
          payments: SAMPLE_PAYMENTS,
          metadata: DEFAULT_INVOICE_METADATA,
          onPrint: () => undefined,
          onClose: () => undefined,
        }),
      );

      // Document Title
      assert.ok(html.includes("TAX INVOICE"));
      assert.ok(html.includes("Section 20 of Value Added Tax Act"));

      // Hotel Legal Info
      assert.ok(html.includes("Tangalle Breeze Resort"));
      assert.ok(html.includes(DEFAULT_HOTEL_PROFILE.legalEntityName));
      assert.ok(html.includes(DEFAULT_HOTEL_PROFILE.tin));
      assert.ok(html.includes("109847261-7000"));
      assert.ok(html.includes("SLTDA/SQA/PRO/00492"));

      // Guest & Stay Info
      assert.ok(html.includes(DEFAULT_GUEST_PROFILE.guestFullName));
      assert.ok(html.includes("GB98451234"));
      assert.ok(html.includes("Aitken Spence Travels"));
      assert.ok(html.includes("101928374-7000"));
      assert.ok(html.includes(DEFAULT_STAY_CONTEXT.roomNumber));
      assert.ok(html.includes(DEFAULT_STAY_CONTEXT.bookingReference));

      // Line items
      assert.ok(html.includes("Ocean View Plunge Pool Villa"));
      assert.ok(html.includes("Lagoon Catch Lobster Dinner"));
      assert.ok(html.includes("Ayurvedic Herbal Compress"));

      // 4-Stage Tax Table
      assert.ok(html.includes("Base Value of Supply (B)"));
      assert.ok(html.includes("10% Service Charge (SC)"));
      assert.ok(html.includes("1% Tourism Development Levy (TDL)"));
      assert.ok(html.includes("2.5% Social Security Levy (SSCL)"));
      assert.ok(html.includes("18% Value Added Tax (VAT)"));
      assert.ok(html.includes("Grand Total (LKR)"));

      // Remittance & Signatures
      assert.ok(html.includes("Commercial Bank of Ceylon"));
      assert.ok(html.includes("Guest / Authorized Customer Signature"));
      assert.ok(html.includes("Front Office Cashier"));
    });

    it("renders COMMERCIAL INVOICE for non-VAT registered hotel", () => {
      const nonVatHotel: TaxInvoiceHotelProfile = {
        ...DEFAULT_HOTEL_PROFILE,
        isVatRegistered: false,
        vatRegNo: undefined,
      };

      const html = renderToStaticMarkup(
        React.createElement(PrintableTaxInvoice, {
          hotel: nonVatHotel,
          guest: DEFAULT_GUEST_PROFILE,
          stay: DEFAULT_STAY_CONTEXT,
          lines: SAMPLE_TAX_INVOICE_LINES,
          payments: SAMPLE_PAYMENTS,
          metadata: DEFAULT_INVOICE_METADATA,
        }),
      );

      assert.ok(html.includes("COMMERCIAL INVOICE"));
      assert.ok(html.includes("Non-VAT Registered Enterprise"));
    });

    it("exercises typescript interfaces and types safely", () => {
      const docType: InvoiceDocumentType = "TAX_INVOICE";
      const remittance: BankRemittanceDetails = {
        bankName: "Sampath Bank",
        accountName: "Tangalle Resort Ltd",
        accountNumber: "0012345678",
        branchName: "Tangalle",
        swiftBicCode: "BSAMLKLX",
      };
      const customHotel: TaxInvoiceHotelProfile = {
        hotelName: "Mirissa Heritage Villa",
        legalEntityName: "Mirissa Heritage (Pvt) Ltd",
        address: "Galle Road",
        city: "Mirissa",
        phone: "+94 41 225 1100",
        email: "info@mirissaheritage.lk",
        tin: "109988776",
        isVatRegistered: true,
        bankRemittance: remittance,
      };
      const customGuest: TaxInvoiceGuestProfile = {
        guestFullName: "Elena Petrova",
      };
      const customStay: TaxInvoiceStayContext = {
        bookingReference: "BK-MIRISSA-01",
        roomNumber: "Suite 1",
        roomTypeName: "Deluxe Suite",
        checkInDate: "2026-10-18",
        checkOutDate: "2026-10-20",
        nightsCount: 2,
        adultsCount: 2,
        mealPlan: "BB",
        billingType: "DIRECT_GUEST",
      };
      const customLine: TaxInvoiceLineItem = {
        id: "L1",
        date: "2026-10-18",
        department: "ROOM",
        description: "Room Night",
        quantity: 1,
        unitPriceLkr: 50000,
        baseSupplyLkr: 50000,
        serviceChargeLkr: 5000,
        tdlLkr: 550,
        ssclLkr: 1375,
        vatLkr: 10246.5,
        totalGrossLkr: 67171.5,
      };
      const customPayment: TaxInvoicePaymentRecord = {
        id: "P1",
        tenderType: "CASH_LKR",
        amountLkr: 67171.5,
        settledAt: "2026-10-20 10:00",
      };
      const customMeta: TaxInvoiceMetadata = {
        invoiceNumber: "INV-MIRISSA-001",
        invoiceDate: "2026-10-20 10:00",
        folioNumber: "FOLIO-001",
        cashierName: "Sunil",
        partition: "GUEST_PERSONAL",
      };

      const props: PrintableTaxInvoiceProps = {
        hotel: customHotel,
        guest: customGuest,
        stay: customStay,
        lines: [customLine],
        payments: [customPayment],
        metadata: customMeta,
      };

      assert.strictEqual(docType, "TAX_INVOICE");
      assert.strictEqual(props.hotel?.hotelName, "Mirissa Heritage Villa");
    });
  });
});
