import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SAMPLE_GUEST_LINES,
  DEFAULT_SAMPLE_GUEST_PAYMENTS,
  DEFAULT_SAMPLE_GUEST_STAY,
  DEFAULT_USD_EXCHANGE_RATE,
  type GuestFolioFinancialSummary,
  type GuestFolioLineItem,
  type GuestFolioPaymentRecord,
  type GuestFolioStayContext,
  GuestLiveFolioTab,
  type GuestLiveFolioTabProps,
  QUICK_DISPUTE_REASONS,
  calculateGuestFolioSummary,
  filterGuestFolioLines,
  formatDisplayCurrency,
  getDepartmentLabel,
  getPaymentMethodName,
} from "../src/qr/GuestLiveFolioTab.js";

describe("Step 221: GuestLiveFolioTab & Guest QR Live Folio View", () => {
  describe("1. Constants & Default Sample Data", () => {
    it("exports default stay context for Sri Lankan luxury resort stay", () => {
      const stay: GuestFolioStayContext = DEFAULT_SAMPLE_GUEST_STAY;
      const props: GuestLiveFolioTabProps = { stayContext: stay };
      assert.strictEqual(props.stayContext?.tenantId, "TENANT-LIGHTHOUSE");
      assert.strictEqual(stay.tenantId, "TENANT-LIGHTHOUSE");
      assert.strictEqual(stay.hotelName, "Jetwing Lighthouse Galle");
      assert.strictEqual(stay.roomNumber, "Ocean Villa 204");
      assert.strictEqual(stay.guestFullName, "Alexander von Bergmann");
      assert.strictEqual(stay.reservationCode, "BK-2026-JL-0941");
      assert.strictEqual(stay.nights, 3);
      assert.strictEqual(stay.usdExchangeRate, DEFAULT_USD_EXCHANGE_RATE);
    });

    it("exports realistic sample line items across multiple hotel departments", () => {
      assert.strictEqual(DEFAULT_SAMPLE_GUEST_LINES.length, 6);
      const departments = DEFAULT_SAMPLE_GUEST_LINES.map((l) => l.department);
      assert.ok(departments.includes("ROOM"));
      assert.ok(departments.includes("DINING"));
      assert.ok(departments.includes("SPA"));
      assert.ok(departments.includes("ACTIVITIES"));
      assert.ok(departments.includes("MINIBAR"));
    });

    it("exports initial advance deposit payments", () => {
      assert.strictEqual(DEFAULT_SAMPLE_GUEST_PAYMENTS.length, 1);
      const payment = DEFAULT_SAMPLE_GUEST_PAYMENTS[0];
      assert.ok(payment !== undefined);
      assert.strictEqual(payment.method, "ADVANCE_DEPOSIT");
      assert.strictEqual(payment.amountLkr, 100000);
    });
  });

  describe("2. Financial & Statutory Compounding Calculations", () => {
    it("calculates accurate folio totals, payments deduction, and balance due", () => {
      const summary: GuestFolioFinancialSummary = calculateGuestFolioSummary(
        DEFAULT_SAMPLE_GUEST_LINES,
        DEFAULT_SAMPLE_GUEST_PAYMENTS,
        300,
      );

      // Verify gross sum is sum of individual gross line items
      const expectedGross = DEFAULT_SAMPLE_GUEST_LINES.reduce((acc, l) => acc + l.grossTotalLkr, 0);
      assert.ok(Math.abs(summary.grandTotalGrossLkr - expectedGross) < 0.1);

      // Verify paid sum
      assert.strictEqual(summary.totalPaidLkr, 100000);

      // Verify balance due = gross - paid
      const expectedBalance = Math.round((expectedGross - 100000) * 100) / 100;
      assert.strictEqual(summary.balanceDueLkr, expectedBalance);
      assert.strictEqual(summary.isFullySettled, false);

      // Verify USD conversions at 300 LKR/USD
      assert.strictEqual(summary.grandTotalGrossUsd, Math.round((expectedGross / 300) * 100) / 100);
      assert.strictEqual(summary.balanceDueUsd, Math.round((expectedBalance / 300) * 100) / 100);
    });

    it("marks folio as fully settled when payments equal or exceed gross charges", () => {
      const mockLines: GuestFolioLineItem[] = [
        {
          id: "L1",
          date: "2026-10-18",
          time: "12:00",
          department: "ROOM",
          description: "One Night Stay",
          quantity: 1,
          unitPriceLkr: 50000,
          baseAmountLkr: 50000,
          serviceChargeLkr: 5000,
          tdlLkr: 500,
          ssclLkr: 1387.5,
          vatLkr: 10239.75,
          grossTotalLkr: 67127.25,
        },
      ];

      const mockPayments: GuestFolioPaymentRecord[] = [
        {
          id: "P1",
          date: "2026-10-18",
          time: "12:05",
          method: "LANKA_QR",
          amountLkr: 67127.25,
          reference: "QR-TEST-001",
        },
      ];

      const summary = calculateGuestFolioSummary(mockLines, mockPayments);
      assert.strictEqual(summary.balanceDueLkr, 0);
      assert.strictEqual(summary.isFullySettled, true);
    });

    it("counts disputed items correctly in summary", () => {
      const mockLines: GuestFolioLineItem[] = [
        {
          id: "L1",
          date: "2026-10-18",
          time: "12:00",
          department: "DINING",
          description: "Wine bottle",
          quantity: 1,
          unitPriceLkr: 10000,
          baseAmountLkr: 10000,
          serviceChargeLkr: 1000,
          tdlLkr: 100,
          ssclLkr: 277.5,
          vatLkr: 2047.95,
          grossTotalLkr: 13425.45,
          isDisputed: true,
          disputeNote: "Not ordered by room guest",
          disputeStatus: "PENDING",
        },
      ];

      const summary = calculateGuestFolioSummary(mockLines, []);
      assert.strictEqual(summary.disputedCount, 1);
    });
  });

  describe("3. Line Filtering & Search Logic", () => {
    it("filters line items by department category", () => {
      const diningOnly = filterGuestFolioLines(DEFAULT_SAMPLE_GUEST_LINES, "DINING", "");
      assert.strictEqual(diningOnly.length, 1);
      assert.strictEqual(diningOnly[0]?.department, "DINING");

      const allItems = filterGuestFolioLines(DEFAULT_SAMPLE_GUEST_LINES, "ALL", "");
      assert.strictEqual(allItems.length, DEFAULT_SAMPLE_GUEST_LINES.length);
    });

    it("filters lines by case-insensitive keyword search", () => {
      const spaMatches = filterGuestFolioLines(DEFAULT_SAMPLE_GUEST_LINES, "ALL", "ayurveda");
      assert.strictEqual(spaMatches.length, 1);
      assert.ok(spaMatches[0]?.description.toLowerCase().includes("ayurveda"));

      const orderMatches = filterGuestFolioLines(DEFAULT_SAMPLE_GUEST_LINES, "ALL", "KDS-8812");
      assert.strictEqual(orderMatches.length, 1);
      assert.strictEqual(orderMatches[0]?.referenceOrderNo, "KDS-8812");
    });
  });

  describe("4. Formatters & Labels", () => {
    it("formats LKR and USD currency amounts properly", () => {
      const lkrStr = formatDisplayCurrency(50000, "LKR");
      assert.ok(lkrStr.includes("50,000") || lkrStr.includes("Rs"));

      const usdStr = formatDisplayCurrency(30850, "USD", 308.5);
      assert.strictEqual(usdStr, "$100.00");
    });

    it("returns correct labels for department categories", () => {
      assert.strictEqual(getDepartmentLabel("ROOM"), "Room & Stay");
      assert.strictEqual(getDepartmentLabel("DINING"), "Dining & Bar");
      assert.strictEqual(getDepartmentLabel("SPA"), "Spa & Wellness");
      assert.strictEqual(getDepartmentLabel("ALL"), "All Charges");
    });

    it("returns correct human-readable payment method names", () => {
      assert.strictEqual(getPaymentMethodName("LANKA_QR"), "LankaQR (CBSL App)");
      assert.strictEqual(getPaymentMethodName("PAYHERE_ONLINE"), "PayHere Online (Card/Bank)");
      assert.strictEqual(getPaymentMethodName("ADVANCE_DEPOSIT"), "Advance Deposit");
    });
  });

  describe("5. SSR Component Markup & Accessibility", () => {
    it("renders live folio tab with header, stay details, and charges list", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestLiveFolioTab, {
          stayContext: DEFAULT_SAMPLE_GUEST_STAY,
          initialLines: DEFAULT_SAMPLE_GUEST_LINES,
          initialPayments: DEFAULT_SAMPLE_GUEST_PAYMENTS,
        }),
      );

      // Verify guest and room header
      assert.ok(html.includes("Ocean Villa 204"));
      assert.ok(html.includes("Jetwing Lighthouse Galle"));
      assert.ok(html.includes("Alexander von Bergmann"));
      assert.ok(html.includes("BK-2026-JL-0941"));

      // Verify financial bento and action button
      assert.ok(html.includes("Outstanding Balance Due"));
      assert.ok(html.includes("Pay Online"));

      // Verify statutory tax accordion toggle exists
      assert.ok(html.includes("Statutory Tax &amp; Service Charge Breakdown"));

      // Verify itemized charges rendered
      assert.ok(html.includes("Cinnamon Room"));
      assert.ok(html.includes("Ayurveda Samadhi Herbal"));
      assert.ok(html.includes("Query This Item"));
    });

    it("renders express check-out banner when balance is zero", () => {
      const settledPayments: GuestFolioPaymentRecord[] = [
        {
          id: "P-SETTLED",
          date: "2026-10-20",
          time: "09:00",
          method: "PAYHERE_ONLINE",
          amountLkr: 500000,
          reference: "PAYHERE-SETTLED",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(GuestLiveFolioTab, {
          stayContext: DEFAULT_SAMPLE_GUEST_STAY,
          initialLines: DEFAULT_SAMPLE_GUEST_LINES,
          initialPayments: settledPayments,
        }),
      );

      assert.ok(html.includes("Ready for Express Check-Out"));
      assert.ok(html.includes("1-Tap Departure Notification to Front Desk"));
    });
  });

  describe("6. Step 222: Disputed Charge Flagging & Query Handling", () => {
    it("exports standard quick dispute preset reasons for guests", () => {
      assert.ok(QUICK_DISPUTE_REASONS.length >= 4);
      assert.ok(QUICK_DISPUTE_REASONS.includes("Item not consumed / received"));
      assert.ok(QUICK_DISPUTE_REASONS.includes("Incorrect quantity billed"));
      assert.ok(QUICK_DISPUTE_REASONS.includes("Wrong room / not our charge"));
      assert.ok(QUICK_DISPUTE_REASONS.includes("Meal plan discount omitted"));
    });

    it("renders disputed line items with warning indicator and guest note", () => {
      const disputedLines: GuestFolioLineItem[] = [
        {
          id: "FOL-LINE-DISPUTED-01",
          date: "2026-10-19",
          time: "14:00",
          department: "MINIBAR",
          description: "Mini-bar Ceylon Cashews & Arrack",
          quantity: 2,
          unitPriceLkr: 2400,
          baseAmountLkr: 4800,
          serviceChargeLkr: 480,
          tdlLkr: 48,
          ssclLkr: 133.2,
          vatLkr: 981.88,
          grossTotalLkr: 6443.08,
          isDisputed: true,
          disputeNote: "We did not unlock the mini-bar",
          disputeStatus: "PENDING",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(GuestLiveFolioTab, {
          stayContext: DEFAULT_SAMPLE_GUEST_STAY,
          initialLines: disputedLines,
          initialPayments: [],
        }),
      );

      // Verify header dispute count pill is rendered
      assert.ok(html.includes("1 Query under review"));

      // Verify disputed line has warning badge and note instead of 'Query This Item' button
      assert.ok(html.includes("Query Sent:"));
      assert.ok(html.includes("We did not unlock the mini-bar"));
      assert.strictEqual(html.includes("Query This Item"), false);
    });
  });
});
