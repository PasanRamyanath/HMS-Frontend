import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AuditStatus,
  CHANNEL_FILTER_OPTIONS,
  CURRENCY_OPTIONS,
  type CommissionSummaryMetrics,
  type CurrencyMode,
  DEFAULT_BOOKING_LINE_ITEMS,
  DEFAULT_COMMISSION_INVOICES,
  type OtaBookingLineItem,
  type OtaCommissionInvoice,
  OtaCommissionTable,
  type OtaCommissionTableProps,
  type ReconciliationFilter,
  calculateCommissionSummary,
  getAuditStatusColor,
} from "../src/admin/channels/OtaCommissionTable.js";

const noop = () => {
  // no-op for tests
};

describe("OTA Commission & Net Revenue Reconciliation Table (OtaCommissionTable.tsx)", () => {
  describe("1. Configurations & Constants", () => {
    it("configures monthly invoices for all 4 major OTAs", () => {
      assert.strictEqual(DEFAULT_COMMISSION_INVOICES.length, 4);
      const channels = DEFAULT_COMMISSION_INVOICES.map((i) => i.channelId);
      assert.deepStrictEqual(channels, ["BOOKING_COM", "AGODA", "EXPEDIA", "AIRBNB"]);
    });

    it("verifies realistic 15%-18% commission rates across OTAs", () => {
      const bkg = DEFAULT_COMMISSION_INVOICES.find((i) => i.channelId === "BOOKING_COM");
      const agd = DEFAULT_COMMISSION_INVOICES.find((i) => i.channelId === "AGODA");
      const exp = DEFAULT_COMMISSION_INVOICES.find((i) => i.channelId === "EXPEDIA");
      const abnb = DEFAULT_COMMISSION_INVOICES.find((i) => i.channelId === "AIRBNB");

      assert.ok(bkg);
      assert.strictEqual(bkg.effectiveCommissionPercent, 18.0);

      assert.ok(agd);
      assert.strictEqual(agd.effectiveCommissionPercent, 15.0);

      assert.ok(exp);
      assert.strictEqual(exp.effectiveCommissionPercent, 15.0);

      assert.ok(abnb);
      assert.strictEqual(abnb.effectiveCommissionPercent, 3.0);
    });

    it("configures booking line items with direct booking savings", () => {
      assert.ok(DEFAULT_BOOKING_LINE_ITEMS.length >= 5);
      for (const item of DEFAULT_BOOKING_LINE_ITEMS) {
        const typedItem: OtaBookingLineItem = item;
        assert.ok(typedItem.grossLkr > 0);
        assert.ok(typedItem.commissionAmountLkr > 0);
        assert.ok(typedItem.netRevenueLkr > 0);
        assert.ok(typedItem.directBookingSavingsLkr > 0);
      }
    });

    it("verifies filter and currency options", () => {
      assert.strictEqual(CHANNEL_FILTER_OPTIONS.length, 5);
      const filters: ReconciliationFilter[] = CHANNEL_FILTER_OPTIONS.map((f) => f.id);
      assert.deepStrictEqual(filters, ["ALL", "BOOKING_COM", "AGODA", "EXPEDIA", "AIRBNB"]);

      assert.strictEqual(CURRENCY_OPTIONS.length, 2);
      const currencies: CurrencyMode[] = CURRENCY_OPTIONS.map((c) => c.id);
      assert.deepStrictEqual(currencies, ["LKR", "USD"]);
    });
  });

  describe("2. Helper Functions & Financial Math", () => {
    it("calculates accurate commission summaries and direct booking savings", () => {
      const summary: CommissionSummaryMetrics = calculateCommissionSummary(
        DEFAULT_COMMISSION_INVOICES,
        DEFAULT_BOOKING_LINE_ITEMS,
      );

      assert.strictEqual(summary.totalGrossLkr, 15390000);
      assert.strictEqual(summary.totalCommissionLkr, 2295300);
      assert.strictEqual(summary.totalBookingsCount, 62);
      assert.strictEqual(summary.discrepancyCount, 1);
      assert.ok(summary.effectiveCommissionRate >= 14 && summary.effectiveCommissionRate <= 16);
      assert.ok(summary.totalDirectSavingsLkr > 1000000);
    });

    it("maps audit statuses to Apple semantic colors", () => {
      const cases: Array<[AuditStatus, string]> = [
        ["RECONCILED", "green"],
        ["PAID", "green"],
        ["DISCREPANCY", "red"],
        ["PENDING_AUDIT", "amber"],
      ];

      for (const [status, expectedColor] of cases) {
        assert.strictEqual(getAuditStatusColor(status), expectedColor);
      }
    });
  });

  describe("3. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders master reconciliation header, property title, and billing period", () => {
      const props: OtaCommissionTableProps = {
        propertyTitle: "Galle Fort Lighthouse Villa",
        billingMonth: "October 2026",
        onActionNotify: noop,
      };

      const html = renderToStaticMarkup(React.createElement(OtaCommissionTable, props));

      assert.ok(html.includes("OTA Commission &amp; Net Revenue Reconciliation"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Billing Period: October 2026"));
      assert.ok(html.includes("Print Audit Sheet"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-touch-target"));
    });

    it("renders top executive metrics cards with LKR amounts", () => {
      const html = renderToStaticMarkup(React.createElement(OtaCommissionTable, {}));

      assert.ok(html.includes("OTA Gross Bookings"));
      assert.ok(html.includes("OTA Commission Billed"));
      assert.ok(html.includes("Direct Booking Savings Potential"));
      assert.ok(html.includes("Audit Discrepancies"));
      assert.ok(html.includes("Dispute Required"));
    });

    it("renders monthly invoice summary cards for Booking.com, Agoda, Expedia, Airbnb", () => {
      const html = renderToStaticMarkup(React.createElement(OtaCommissionTable, {}));

      assert.ok(html.includes("Booking.com"));
      assert.ok(html.includes("BKG-INV-2026-10-8841"));
      assert.ok(html.includes("Agoda"));
      assert.ok(html.includes("Expedia Partner Central"));
      assert.ok(html.includes("Airbnb"));
      assert.ok(html.includes("Approve Invoice"));
    });

    it("renders booking-level commission ledger table with line items", () => {
      const html = renderToStaticMarkup(React.createElement(OtaCommissionTable, {}));

      assert.ok(html.includes("BKG-449102-LK"));
      assert.ok(html.includes("Sir Malcolm Campbell"));
      assert.ok(html.includes("Helena Rostova"));
      assert.ok(html.includes("Takeshi Yamada"));
      assert.ok(html.includes("Review Dispute"));
    });

    it("renders with custom className", () => {
      const html = renderToStaticMarkup(
        React.createElement(OtaCommissionTable, {
          className: "custom-reconciliation-root",
        }),
      );

      assert.ok(html.includes("custom-reconciliation-root"));
    });
  });

  describe("4. Lifecycle Callbacks & Handlers", () => {
    it("handles onDisputeBooking callback without error", async () => {
      let disputedId = "";
      let disputeNote = "";
      const onDispute = async (id: string, note: string) => {
        disputedId = id;
        disputeNote = note;
      };

      await onDispute("line-002", "Cancellation fee wrongfully charged");
      assert.strictEqual(disputedId, "line-002");
      assert.strictEqual(disputeNote, "Cancellation fee wrongfully charged");
    });

    it("handles onMarkReconciled callback without error", async () => {
      let approvedId = "";
      const onApprove = async (id: string) => {
        approvedId = id;
      };

      const baseInvoice: OtaCommissionInvoice | undefined = DEFAULT_COMMISSION_INVOICES[0];
      assert.ok(baseInvoice);
      await onApprove(baseInvoice.id);
      assert.strictEqual(approvedId, "inv-bkg-2026-10");
    });
  });
});
