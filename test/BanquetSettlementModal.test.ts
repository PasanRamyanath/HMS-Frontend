import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BanquetBillingConfig,
  BanquetSettlementModal,
  DEFAULT_BANQUET_BILLING_CONFIG,
  computeBanquetSettlementFinancials,
  formatSettlementCurrency,
} from "../src/admin/banquets/BanquetSettlementModal.js";

describe("Step 342: BanquetSettlementModal — Final Banquet Tax Invoice & Deposit Deduction Settlement View", () => {
  describe("1. Pure Financial Calculation & 4-Stage Compounding Taxes", () => {
    it("calculates accurate wedding final bill with extra pax, bites, corkage, and overtime", () => {
      const financials = computeBanquetSettlementFinancials(DEFAULT_BANQUET_BILLING_CONFIG);

      // 1. Guaranteed Pax: 200 pax * 8,500 LKR = 1,700,000 LKR
      assert.strictEqual(financials.guaranteedPaxTotalLkr, 1700000);

      // 2. Extra Pax: 215 actual - 200 guaranteed = 15 extra pax * 8,800 LKR = 132,000 LKR
      assert.strictEqual(financials.extraPaxCount, 15);
      assert.strictEqual(financials.extraPaxTotalLkr, 132000);

      // Total Pax Revenue: 1,700,000 + 132,000 = 1,832,000 LKR
      assert.strictEqual(financials.totalPaxRevenueLkr, 1832000);

      // 3. Bites: 54,000 (HBC) + 38,000 (Devilled Chicken) + 33,600 (Pork) + 14,000 (Cutlets) = 139,600 LKR
      assert.strictEqual(financials.bitesTotalLkr, 139600);

      // 4. Corkage: 18 bottles * 2,500 LKR = 45,000 LKR
      assert.strictEqual(financials.corkageTotalLkr, 45000);

      // 5. AC Overtime: 2.0 hrs * 25,000 LKR = 50,000 LKR
      assert.strictEqual(financials.acOvertimeTotalLkr, 50000);

      // 6. Sundry: 35,000 LKR
      assert.strictEqual(financials.sundryChargesLkr, 35000);

      // Gross Subtotal = 1,832,000 + 139,600 + 45,000 + 50,000 + 35,000 = 2,101,600 LKR
      assert.strictEqual(financials.grossSubtotalLkr, 2101600);

      // Stage 1: 10% Service Charge = 210,160 LKR
      assert.strictEqual(financials.serviceChargeLkr, 210160);
      const subtotalAfterSc = 2101600 + 210160; // 2,311,760 LKR
      assert.strictEqual(financials.subtotalAfterScLkr, subtotalAfterSc);

      // Stage 2: 1% TDL on subtotalAfterSc = 23,118 LKR
      assert.strictEqual(financials.tdlLkr, 23118);

      // Stage 3: 2.5% SSCL on subtotalAfterSc = 57,794 LKR
      assert.strictEqual(financials.ssclLkr, 57794);

      // Stage 4: 18% VAT on (subtotalAfterSc + TDL + SSCL) = (2,311,760 + 23,118 + 57,794) = 2,392,672 * 0.18 = 430,681 LKR
      assert.strictEqual(financials.vatBaseLkr, 2392672);
      assert.strictEqual(financials.vatLkr, 430681);

      // Grand Total = 2,392,672 + 430,681 = 2,823,353 LKR
      assert.strictEqual(financials.grandTotalLkr, 2823353);

      // Advance Deposits: 450,000 (25%) + 900,000 (50%) + 450,000 (25%) = 1,800,000 LKR
      assert.strictEqual(financials.totalDepositsPaidLkr, 1800000);

      // Net Balance Due = 2,823,353 - 1,800,000 = 1,023,353 LKR
      assert.strictEqual(financials.netBalanceDueLkr, 1023353);
      assert.strictEqual(financials.isRefundDue, false);
      assert.strictEqual(financials.refundAmountLkr, 0);
    });

    it("handles deposit refund scenario when staged deposits exceed final bill", () => {
      const refundConfig: BanquetBillingConfig = {
        ...DEFAULT_BANQUET_BILLING_CONFIG,
        guaranteedPax: 50,
        perPaxRateLkr: 6000, // 300,000 base
        actualPaxCount: 50,
        biteOrders: [],
        corkageBottleCount: 0,
        acOvertimeHours: 0,
        sundryChargesLkr: 0,
        stagedDeposits: [
          {
            receiptNumber: "REC-TEST-001",
            milestoneStage: "BOOKING_ADVANCE",
            stageLabelEn: "Advance",
            stageLabelSi: "අත්තිකාරම",
            stageLabelTa: "முற்பணம்",
            paidDate: "2026-01-01",
            paymentMethod: "CASH",
            referenceNumber: "CASH-01",
            amountLkr: 500000, // Deposited 500,000 LKR
          },
        ],
      };

      const financials = computeBanquetSettlementFinancials(refundConfig);

      // Gross = 300,000
      assert.strictEqual(financials.grossSubtotalLkr, 300000);
      // SC 10% = 30,000 -> 330,000
      // TDL 1% = 3,300, SSCL 2.5% = 8,250 -> Base = 341,550
      // VAT 18% = 61,479 -> Grand Total = 403,029 LKR
      assert.strictEqual(financials.grandTotalLkr, 403029);

      // Deposit = 500,000 > Grand Total 403,029
      assert.strictEqual(financials.isRefundDue, true);
      assert.strictEqual(financials.netBalanceDueLkr, 0);
      assert.strictEqual(financials.refundAmountLkr, 500000 - 403029); // 96,971 LKR
    });

    it("correctly handles zero extra pax and empty bite orders", () => {
      const minimalConfig: BanquetBillingConfig = {
        ...DEFAULT_BANQUET_BILLING_CONFIG,
        guaranteedPax: 100,
        actualPaxCount: 95, // Below guaranteed pax -> billed on guaranteed pax
        perPaxRateLkr: 7500,
        biteOrders: [],
        corkageBottleCount: 0,
        acOvertimeHours: 0,
        sundryChargesLkr: 0,
        damageDeductionLkr: 0,
        stagedDeposits: [],
      };

      const financials = computeBanquetSettlementFinancials(minimalConfig);

      assert.strictEqual(financials.extraPaxCount, 0);
      assert.strictEqual(financials.extraPaxTotalLkr, 0);
      assert.strictEqual(financials.grossSubtotalLkr, 750000);
      assert.strictEqual(financials.totalDepositsPaidLkr, 0);
      assert.strictEqual(financials.netBalanceDueLkr, financials.grandTotalLkr);
    });
  });

  describe("2. formatSettlementCurrency Helper", () => {
    it("formats standard LKR currency strings with 2 decimal places", () => {
      assert.strictEqual(formatSettlementCurrency(1500000), "LKR 1,500,000.00");
      assert.strictEqual(formatSettlementCurrency(850.5), "LKR 850.50");
      assert.strictEqual(formatSettlementCurrency(0), "LKR 0.00");
      assert.strictEqual(formatSettlementCurrency(Number.NaN), "LKR 0.00");
    });
  });

  describe("3. Static HTML Markup Rendering & Apple HIG Verification", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetSettlementModal, {
          isOpen: false,
          onClose: () => undefined,
        }),
      );

      assert.strictEqual(html, "");
    });

    it("renders modal shell with Liquid Glass and SF Pro typography when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(BanquetSettlementModal, {
          isOpen: true,
          config: DEFAULT_BANQUET_BILLING_CONFIG,
          onClose: () => undefined,
        }),
      );

      assert.match(html, /apple-liquid-glass/);
      assert.match(html, /Final Banquet Tax Invoice &amp; Settlement/);
      assert.match(html, /BALANCE OUTSTANDING/);
      assert.match(html, /Dr\. Asitha Jayasinghe/);
      assert.match(html, /Grand Sapphire Ballroom/);
      assert.match(html, /Crispy Hot Butter Cuttlefish/);
      assert.match(html, /LKR 2,823,353\.00/);
    });

    it("renders trilingual Sinhala and Tamil translations accurately", () => {
      const htmlSi = renderToStaticMarkup(
        React.createElement(BanquetSettlementModal, {
          isOpen: true,
          config: DEFAULT_BANQUET_BILLING_CONFIG,
          language: "si",
          onClose: () => undefined,
        }),
      );
      assert.match(htmlSi, /අවසාන උත්සව බදු ඉන්වොයිසිය සහ බේරුම්කරණය/);
      assert.match(htmlSi, /ගෙවීමට ශේෂයක් පවතී/);

      const htmlTa = renderToStaticMarkup(
        React.createElement(BanquetSettlementModal, {
          isOpen: true,
          config: DEFAULT_BANQUET_BILLING_CONFIG,
          language: "ta",
          onClose: () => undefined,
        }),
      );
      assert.match(htmlTa, /இறுதி விருந்து வரி விலைப்பட்டியல் &amp; தீர்வு/);
      assert.match(htmlTa, /நிலுவை தொகை உள்ளது/);
    });

    it("renders fully settled pill when net balance due is 0", () => {
      const settledConfig: BanquetBillingConfig = {
        ...DEFAULT_BANQUET_BILLING_CONFIG,
        stagedDeposits: [
          {
            receiptNumber: "REC-FULL-01",
            milestoneStage: "FULL_PREPAYMENT",
            stageLabelEn: "Full 100% Prepayment",
            stageLabelSi: "සම්පූර්ණ පෙරගෙවුම",
            stageLabelTa: "முழு முற்பணம்",
            paidDate: "2026-10-20",
            paymentMethod: "BANK_TRANSFER",
            referenceNumber: "TX-FULL-999",
            amountLkr: 2823353,
          },
        ],
      };

      const html = renderToStaticMarkup(
        React.createElement(BanquetSettlementModal, {
          isOpen: true,
          config: settledConfig,
          onClose: () => undefined,
        }),
      );

      assert.match(html, /FULLY SETTLED/);
    });
  });
});
