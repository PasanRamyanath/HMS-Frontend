import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PAYOUT_LEDGER,
  type PaymentMethod,
  type PayoutLineItem,
  type PayoutRecipientType,
  type PayoutStatus,
  TherapistAndDriverPayouts,
  type TherapistAndDriverPayoutsProps,
  calculatePayoutKpiSummary,
  getPayoutStatusBadgeClass,
  getPayoutTranslations,
} from "../src/admin/activities/TherapistAndDriverPayouts.js";

describe("Step 360: Spa Therapist & Chauffeur Commission Ledger (TherapistAndDriverPayouts.tsx)", () => {
  describe("1. Pure KPI Summary & Financial Aggregations", () => {
    it("aggregates KPI metrics accurately across sample ledger", () => {
      const summary = calculatePayoutKpiSummary(DEFAULT_PAYOUT_LEDGER);

      // Total records
      assert.strictEqual(summary.totalRecordsCount, 6);

      // Pending settlements: PAY-001 (4,175) + PAY-003 (32,000) = 36,175
      assert.strictEqual(summary.totalPendingLkr, 36175);
      assert.strictEqual(summary.therapistPendingLkr, 4175);
      assert.strictEqual(summary.driverPendingLkr, 32000);

      // Approved: PAY-002 (3,660)
      assert.strictEqual(summary.totalApprovedLkr, 3660);

      // Disbursed: PAY-004 (19,500) + PAY-005 (2,150) = 21,650
      assert.strictEqual(summary.totalDisbursedLkr, 21650);

      // On Hold: PAY-006 (19,000)
      assert.strictEqual(summary.totalOnHoldLkr, 19000);

      // Distinct counts
      assert.strictEqual(summary.distinctTherapistsCount, 3);
      assert.strictEqual(summary.distinctDriversCount, 3);
    });

    it("handles an empty ledger cleanly with all zeroes", () => {
      const emptySummary = calculatePayoutKpiSummary([]);
      assert.strictEqual(emptySummary.totalPendingLkr, 0);
      assert.strictEqual(emptySummary.totalApprovedLkr, 0);
      assert.strictEqual(emptySummary.totalDisbursedLkr, 0);
      assert.strictEqual(emptySummary.totalOnHoldLkr, 0);
      assert.strictEqual(emptySummary.therapistPendingLkr, 0);
      assert.strictEqual(emptySummary.driverPendingLkr, 0);
      assert.strictEqual(emptySummary.distinctTherapistsCount, 0);
      assert.strictEqual(emptySummary.distinctDriversCount, 0);
      assert.strictEqual(emptySummary.totalRecordsCount, 0);
    });

    it("returns correct CSS badge classes for payout statuses", () => {
      assert.ok(getPayoutStatusBadgeClass("PENDING_SETTLEMENT").includes("amber"));
      assert.ok(getPayoutStatusBadgeClass("APPROVED").includes("blue"));
      assert.ok(getPayoutStatusBadgeClass("DISBURSED").includes("emerald"));
      assert.ok(getPayoutStatusBadgeClass("ON_HOLD").includes("rose"));
    });
  });

  describe("2. Trilingual Localization & Translations", () => {
    it("returns full translations in English, Sinhala, and Tamil", () => {
      const en = getPayoutTranslations("en");
      assert.strictEqual(en.title, "Therapist & Chauffeur Commission Ledger");
      assert.strictEqual(en.tabTherapists, "Spa Therapists");
      assert.strictEqual(en.tabDrivers, "Chauffeurs & Safari Drivers");
      assert.strictEqual(en.statusLabels.PENDING_SETTLEMENT, "Pending Settlement");

      const si = getPayoutTranslations("si");
      assert.strictEqual(si.title, "තෙරපිවරුන් සහ රියදුරන්ගේ කොමිස් ලෙජරය");
      assert.strictEqual(si.tabTherapists, "ස්පා තෙරපිවරුන්");
      assert.strictEqual(si.statusLabels.DISBURSED, "ගෙවා නිමකළ");

      const ta = getPayoutTranslations("ta");
      assert.strictEqual(ta.title, "சிகிச்சையாளர் & சாரதி தரகு கணக்கு");
      assert.strictEqual(ta.tabDrivers, "சவாரி & பயண சாரதிகள்");
      assert.strictEqual(ta.statusLabels.APPROVED, "அங்கீகரிக்கப்பட்டது");
    });
  });

  describe("3. Static React Markup & Component Rendering", () => {
    it("renders TherapistAndDriverPayouts table, headers, KPI summary cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(TherapistAndDriverPayouts, {
          initialItems: DEFAULT_PAYOUT_LEDGER,
          language: "en",
          testId: "custom-payouts-test",
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="custom-payouts-test"'));
      assert.ok(html.includes("Therapist &amp; Chauffeur Commission Ledger"));

      // Table & Headings
      assert.ok(html.includes('data-testid="payouts-table"'));
      assert.ok(html.includes("Gross Folio Billed"));
      assert.ok(html.includes("Net Payable LKR"));

      // Sample recipients
      assert.ok(html.includes("Dr. Priyantha Weerasinghe"));
      assert.ok(html.includes("Head Ayurvedic Doctor (Vaidya)"));
      assert.ok(html.includes("Kumara Wickramasinghe"));
      assert.ok(html.includes("Safari 4x4 Jeep Chauffeur &amp; Naturalist"));
      assert.ok(html.includes("Chaminda Silva"));

      // Actions
      assert.ok(html.includes("Disburse Payment"));
      assert.ok(html.includes("Approve Payout"));
    });

    it("renders Sinhala localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(TherapistAndDriverPayouts, {
          initialItems: DEFAULT_PAYOUT_LEDGER,
          language: "si",
        }),
      );

      assert.ok(html.includes("තෙරපිවරුන් සහ රියදුරන්ගේ කොමිස් ලෙජරය"));
      assert.ok(html.includes("ස්පා තෙරපිවරුන්"));
      assert.ok(html.includes("සෆාරි සහ ප්‍රවාහන රියදුරන්"));
      assert.ok(html.includes("පියවීමට ඇති මුදල"));
    });

    it("renders Tamil localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(TherapistAndDriverPayouts, {
          initialItems: DEFAULT_PAYOUT_LEDGER,
          language: "ta",
        }),
      );

      assert.ok(html.includes("சிகிச்சையாளர் &amp; சாரதி தரகு கணக்கு"));
      assert.ok(html.includes("ஸ்பா சிகிச்சையாளர்கள்"));
      assert.ok(html.includes("சவாரி &amp; பயண சாரதிகள்"));
    });
  });

  describe("4. TypeScript Domain Constructibility & Types", () => {
    it("constructs type-safe PayoutLineItem and TherapistAndDriverPayoutsProps", () => {
      const type: PayoutRecipientType = "THERAPIST";
      const status: PayoutStatus = "DISBURSED";
      const method: PaymentMethod = "BANK_TRANSFER";

      const item: PayoutLineItem = {
        id: "PAY-TEST-99",
        recipientId: "ST-888",
        recipientName: "Dilshan Bandara",
        recipientRole: "Senior Masseuse",
        recipientType: type,
        serviceDate: "2026-10-21",
        referenceBookingId: "SL-SPA-001122",
        serviceName: "Ayurvedic Pinda Sweda",
        guestName: "Lady Sarah",
        roomNumber: "Villa 02",
        grossBilledLkr: 20000,
        commissionRatePercent: 12,
        baseIncentiveLkr: 2400,
        passThroughPayableLkr: 0,
        guestGratuityTipLkr: 1000,
        hotelWithholdingDeductionLkr: 0,
        netPayableLkr: 3400,
        status,
        disbursementMethod: method,
        disbursementRef: "CEFT-99120",
      };

      assert.strictEqual(item.recipientType, "THERAPIST");
      assert.strictEqual(item.status, "DISBURSED");
      assert.strictEqual(item.netPayableLkr, 3400);

      const props: TherapistAndDriverPayoutsProps = {
        initialItems: [item],
        language: "en",
        usdExchangeRate: 310,
        onDisbursePayout: () => {
          /* noop */
        },
      };

      assert.strictEqual(props.usdExchangeRate, 310);
    });
  });
});
