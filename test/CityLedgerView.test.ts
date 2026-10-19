import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AgingBucketKey,
  type CityLedgerAgingSummary,
  type CityLedgerInvoice,
  CityLedgerView,
  type CityLedgerViewProps,
  DEFAULT_CITY_LEDGER_INVOICES,
  DEFAULT_DMC_ACCOUNTS,
  type InvoicePaymentStatus,
  buildWebXPayPaymentUrl,
  computeAgingSummary,
  filterInvoices,
  getAgingBadgeClass,
  roundLkr,
} from "../src/admin/folios/CityLedgerView.js";

describe("Step 211: CityLedgerView & B2B DMC Accounts Receivable Aging", () => {
  describe("1. Currency Rounding Helper (roundLkr)", () => {
    it("handles non-finite values safely returning 0", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(Number.NEGATIVE_INFINITY), 0);
    });

    it("rounds half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(54321.124), 54321.12);
      assert.strictEqual(roundLkr(54321.125), 54321.13);
      assert.strictEqual(roundLkr(1000000), 1000000);
    });
  });

  describe("2. Aging Summary Computation (computeAgingSummary)", () => {
    it("aggregates unpaid balances into exact aging buckets", () => {
      const summary: CityLedgerAgingSummary = computeAgingSummary(DEFAULT_CITY_LEDGER_INVOICES);

      // Default invoices balances:
      // INV-1: 345,000 (0-30)
      // INV-2: 520,000 (0-30)
      // INV-3: 480,000 (31-60)
      // INV-4: 740,000 (61-90)
      // INV-5: 890,000 (90+)
      // Total = 345000 + 520000 + 480000 + 740000 + 890000 = 2,975,000 LKR
      assert.strictEqual(summary.totalOutstandingLkr, 2975000);
      assert.strictEqual(summary.current0To30Lkr, 865000);
      assert.strictEqual(summary.aged31To60Lkr, 480000);
      assert.strictEqual(summary.aged61To90Lkr, 740000);
      assert.strictEqual(summary.overdue90PlusLkr, 890000);
      assert.strictEqual(summary.overdueCount, 3);
      assert.strictEqual(summary.totalInvoiceCount, 5);
    });

    it("ignores settled invoices when summing outstanding balances", () => {
      const invoicesWithSettled: ReadonlyArray<CityLedgerInvoice> = [
        ...DEFAULT_CITY_LEDGER_INVOICES,
        {
          invoiceId: "INV-SETTLED",
          invoiceNumber: "INV-PAID-01",
          dmcId: "DMC-01",
          dmcName: "Aitken Spence",
          bookingReference: "BK-PAID",
          voucherNumber: "VCH-PAID",
          guestFullName: "John Doe",
          roomNumber: "101",
          checkInDate: "2026-09-01",
          checkOutDate: "2026-09-05",
          invoiceDate: "2026-09-05",
          dueDate: "2026-10-05",
          daysOverdue: 0,
          grossAmountLkr: 500000,
          paidAmountLkr: 500000,
          balanceLkr: 0,
          agingBucket: "CURRENT_0_30",
          status: "SETTLED",
        },
      ];

      const summary = computeAgingSummary(invoicesWithSettled);
      assert.strictEqual(summary.totalOutstandingLkr, 2975000);
      assert.strictEqual(summary.totalInvoiceCount, 6);
    });
  });

  describe("3. WebXPay Payment URL Builder (buildWebXPayPaymentUrl)", () => {
    it("generates checkout URL with amount, currency, order reference, and customer name", () => {
      const account = DEFAULT_DMC_ACCOUNTS[0];
      assert.ok(account);
      const url = buildWebXPayPaymentUrl(account, 345000, "INV-2026-00410");

      assert.ok(url.startsWith("https://pay.webxpay.com/checkout"));
      assert.ok(url.includes("amount=345000.00"));
      assert.ok(url.includes("currency=LKR"));
      assert.ok(url.includes("order_id=INV-2026-00410"));
      assert.ok(url.includes("customer_name="));
    });
  });

  describe("4. Invoice Filtering Helper (filterInvoices)", () => {
    it("filters by dmcId accurately", () => {
      const astInvoices = filterInvoices(DEFAULT_CITY_LEDGER_INVOICES, "DMC-01");
      assert.strictEqual(astInvoices.length, 2);
      assert.ok(astInvoices.every((inv) => inv.dmcId === "DMC-01"));
    });

    it("filters by aging bucket", () => {
      const overdue90 = filterInvoices(DEFAULT_CITY_LEDGER_INVOICES, undefined, "OVERDUE_90_PLUS");
      assert.strictEqual(overdue90.length, 1);
      assert.strictEqual(overdue90[0]?.invoiceNumber, "INV-2026-00204");
    });

    it("filters by search query across guest, voucher, and dmc", () => {
      const matchGuest = filterInvoices(
        DEFAULT_CITY_LEDGER_INVOICES,
        undefined,
        "ALL",
        "Lindqvist",
      );
      assert.strictEqual(matchGuest.length, 1);
      assert.strictEqual(matchGuest[0]?.guestFullName, "Marcus Lindqvist");

      const matchVoucher = filterInvoices(
        DEFAULT_CITY_LEDGER_INVOICES,
        undefined,
        "ALL",
        "EXO-88912",
      );
      assert.strictEqual(matchVoucher.length, 1);
      assert.strictEqual(matchVoucher[0]?.dmcName, "Exotic Holidays International");
    });
  });

  describe("5. Aging Badge Classes (getAgingBadgeClass)", () => {
    it("returns correct color tokens for each bucket", () => {
      assert.ok(getAgingBadgeClass("OVERDUE_90_PLUS").includes("rose"));
      assert.ok(getAgingBadgeClass("AGED_61_90").includes("amber"));
      assert.ok(getAgingBadgeClass("AGED_31_60").includes("blue"));
      assert.ok(getAgingBadgeClass("CURRENT_0_30").includes("emerald"));
    });
  });

  describe("6. Preset Defaults & DMC Accounts Integrity", () => {
    it("verifies default tour operator accounts have credit limits and terms", () => {
      assert.strictEqual(DEFAULT_DMC_ACCOUNTS.length, 4);
      assert.ok(DEFAULT_DMC_ACCOUNTS.some((a) => a.name.includes("Aitken Spence")));
      assert.ok(DEFAULT_DMC_ACCOUNTS.some((a) => a.name.includes("Walkers Tours")));
      assert.ok(DEFAULT_DMC_ACCOUNTS.some((a) => a.name.includes("Jetwing")));
      assert.ok(DEFAULT_DMC_ACCOUNTS.some((a) => a.isStopCredit === true));
    });
  });

  describe("6. React Component Static Markup Rendering (CityLedgerView)", () => {
    it("renders CityLedgerView with bento cards, DMC accounts, and invoices table", () => {
      const html = renderToStaticMarkup(
        React.createElement(CityLedgerView, {
          accounts: DEFAULT_DMC_ACCOUNTS,
          invoices: DEFAULT_CITY_LEDGER_INVOICES,
          onGenerateStatementPdf: () => undefined,
          onGenerateWebXPayLink: () => "https://pay.webxpay.com/test",
          onRecordPayment: () => undefined,
        }),
      );

      // Header
      assert.ok(html.includes("Accounts Receivable &amp; DMC City Ledger"));
      assert.ok(html.includes("B2B Tour Operator Ledger &amp; Aging"));

      // Bento cards
      assert.ok(html.includes("Total Outstanding AR"));
      assert.ok(html.includes("Current (0-30 Days)"));
      assert.ok(html.includes("31-60 Days"));
      assert.ok(html.includes("61-90 Days"));
      assert.ok(html.includes("90+ Days (Critical)"));

      // DMC accounts sidebar
      assert.ok(html.includes("Aitken Spence Travels"));
      assert.ok(html.includes("Walkers Tours / John Keells"));
      assert.ok(html.includes("Jetwing Travels"));
      assert.ok(html.includes("Exotic Holidays International"));
      assert.ok(html.includes("STOP-CREDIT"));

      // Table columns & rows
      assert.ok(html.includes("INV-2026-00410"));
      assert.ok(html.includes("AST-VCH-98124"));
      assert.ok(html.includes("Marcus Lindqvist"));
      assert.ok(html.includes("345,000.00"));

      // Actions
      assert.ok(html.includes("Pay Link"));
      assert.ok(html.includes("Settle"));
    });

    it("renders with a pre-selected DMC account", () => {
      const html = renderToStaticMarkup(
        React.createElement(CityLedgerView, {
          accounts: DEFAULT_DMC_ACCOUNTS,
          invoices: DEFAULT_CITY_LEDGER_INVOICES,
          initialSelectedDmcId: "DMC-01",
          onGenerateStatementPdf: () => undefined,
        }),
      );

      assert.ok(html.includes("Generate Monthly Statement (PDF)"));
    });

    it("exercises typescript interfaces and types safely", () => {
      const bucket: AgingBucketKey = "AGED_61_90";
      const status: InvoicePaymentStatus = "PARTIALLY_PAID";
      const invoice: CityLedgerInvoice = {
        invoiceId: "INV-T1",
        invoiceNumber: "INV-001",
        dmcId: "DMC-01",
        dmcName: "Test DMC",
        bookingReference: "BK-01",
        voucherNumber: "VCH-01",
        guestFullName: "Test Guest",
        roomNumber: "101",
        checkInDate: "2026-10-01",
        checkOutDate: "2026-10-05",
        invoiceDate: "2026-10-05",
        dueDate: "2026-11-05",
        daysOverdue: 0,
        grossAmountLkr: 100000,
        paidAmountLkr: 50000,
        balanceLkr: 50000,
        agingBucket: bucket,
        status,
      };

      const props: CityLedgerViewProps = {
        accounts: DEFAULT_DMC_ACCOUNTS,
        invoices: [invoice],
      };

      assert.strictEqual(invoice.agingBucket, "AGED_61_90");
      assert.strictEqual(props.invoices?.length, 1);
    });
  });
});
