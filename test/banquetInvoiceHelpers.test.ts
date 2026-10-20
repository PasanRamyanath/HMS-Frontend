import assert from "node:assert";
import { describe, it } from "node:test";
import {
  DEFAULT_BANQUET_BILLING_CONFIG,
  computeBanquetSettlementFinancials,
} from "../src/admin/banquets/BanquetSettlementModal.js";
import {
  computeBanquetLineItems,
  computeBanquetPaymentRecords,
  getBanquetTaxComplianceNotice,
  mapBanquetBillingToTaxInvoice,
} from "../src/admin/banquets/banquetInvoiceHelpers.js";

describe("Step 350: banquetInvoiceHelpers — Canonical Tax Invoice Adapter for Banquets", () => {
  const config = DEFAULT_BANQUET_BILLING_CONFIG;
  const financials = computeBanquetSettlementFinancials(config);

  describe("1. computeBanquetLineItems", () => {
    it("generates structured line items for all banquet billing components", () => {
      const lines = computeBanquetLineItems(config, financials);
      assert.ok(lines.length >= 6, "Expected at least 6 line items");

      // Check Guaranteed Package line
      const pkgLine = lines.find((l) => l.id === "LINE-PKG-MAIN");
      assert.ok(pkgLine, "Guaranteed package line should exist");
      assert.strictEqual(pkgLine.quantity, 200);
      assert.strictEqual(pkgLine.unitPriceLkr, 8500);
      assert.strictEqual(pkgLine.baseSupplyLkr, 1700000);
      assert.strictEqual(pkgLine.serviceChargeLkr, 170000); // 10%
      assert.strictEqual(pkgLine.department, "BANQUETS");

      // Check Extra Pax line
      const extraLine = lines.find((l) => l.id === "LINE-PKG-EXTRA");
      assert.ok(extraLine, "Extra pax line should exist");
      assert.strictEqual(extraLine.quantity, 15);
      assert.strictEqual(extraLine.unitPriceLkr, 8800);
      assert.strictEqual(extraLine.baseSupplyLkr, 132000);

      // Check Corkage line
      const corkageLine = lines.find((l) => l.id === "LINE-CORKAGE");
      assert.ok(corkageLine, "Corkage line should exist");
      assert.strictEqual(corkageLine.quantity, 18);
      assert.strictEqual(corkageLine.unitPriceLkr, 2500);

      // Check Overtime line
      const overtimeLine = lines.find((l) => l.id === "LINE-OVERTIME");
      assert.ok(overtimeLine, "Overtime line should exist");
      assert.strictEqual(overtimeLine.quantity, 2);
      assert.strictEqual(overtimeLine.unitPriceLkr, 25000);

      // Check Sundry line
      const sundryLine = lines.find((l) => l.id === "LINE-SUNDRY");
      assert.ok(sundryLine, "Sundry line should exist");
      assert.strictEqual(sundryLine.baseSupplyLkr, 35000);
    });

    it("handles zero extra pax and zero overtime gracefully", () => {
      const minimalConfig = {
        ...config,
        actualPaxCount: 200,
        acOvertimeHours: 0,
        corkageBottleCount: 0,
        sundryChargesLkr: 0,
        biteOrders: [],
      };
      const minimalFinancials = computeBanquetSettlementFinancials(minimalConfig);
      const lines = computeBanquetLineItems(minimalConfig, minimalFinancials);

      assert.strictEqual(lines.length, 1);
      assert.strictEqual(lines[0]?.id, "LINE-PKG-MAIN");
    });
  });

  describe("2. computeBanquetPaymentRecords", () => {
    it("maps staged deposits to TaxInvoicePaymentRecord entries", () => {
      const payments = computeBanquetPaymentRecords(config.stagedDeposits);
      assert.strictEqual(payments.length, config.stagedDeposits.length);

      const firstDeposit = payments[0];
      assert.ok(firstDeposit);
      assert.strictEqual(firstDeposit.amountLkr, 450000);
      assert.ok(firstDeposit.tenderType.includes("BOOKING_ADVANCE"));
      assert.strictEqual(firstDeposit.referenceOrAuth, "COMM-TX-984210");
    });
  });

  describe("3. getBanquetTaxComplianceNotice", () => {
    it("provides trilingual compliance notices conforming to Inland Revenue Act", () => {
      const enNotice = getBanquetTaxComplianceNotice("en");
      const siNotice = getBanquetTaxComplianceNotice("si");
      const taNotice = getBanquetTaxComplianceNotice("ta");

      assert.ok(enNotice.includes("Inland Revenue Act"));
      assert.ok(enNotice.includes("18% VAT"));
      assert.ok(siNotice.includes("දේශීය ආදායම් පනත"));
      assert.ok(taNotice.includes("உள்நாட்டு வருமானச்"));
    });
  });

  describe("4. mapBanquetBillingToTaxInvoice", () => {
    it("creates a complete PrintableTaxInvoiceProps bundle", () => {
      const invoiceProps = mapBanquetBillingToTaxInvoice(config, financials, "en");

      // Verify hotel profile
      assert.strictEqual(invoiceProps.hotel.tin, "102938475");
      assert.strictEqual(invoiceProps.hotel.vatRegNo, "102938475-7000");
      assert.strictEqual(invoiceProps.hotel.ssclRegNo, "102938475-9000");
      assert.strictEqual(invoiceProps.hotel.sltdaRegNo, "SLTDA/SQA/HOT/00142");
      assert.strictEqual(invoiceProps.hotel.isVatRegistered, true);

      // Verify guest profile
      assert.strictEqual(invoiceProps.guest.guestFullName, config.clientName);
      assert.strictEqual(invoiceProps.guest.passportOrNic, config.clientNicPassport);
      assert.strictEqual(invoiceProps.guest.phone, config.clientPhone);

      // Verify stay context
      assert.strictEqual(invoiceProps.stay.bookingReference, config.beoNumber);
      assert.strictEqual(invoiceProps.stay.roomTypeName, config.hallName);
      assert.strictEqual(invoiceProps.stay.adultsCount, financials.totalPaxCount);

      // Verify metadata
      assert.strictEqual(invoiceProps.metadata.invoiceNumber, config.invoiceNumber);
      assert.strictEqual(invoiceProps.metadata.folioNumber, config.beoNumber);
      assert.ok(invoiceProps.metadata.notes?.includes("Inland Revenue Act"));

      // Verify line items and payments are populated
      assert.ok(invoiceProps.lines.length > 0);
      assert.ok(invoiceProps.payments.length > 0);
    });
  });
});
