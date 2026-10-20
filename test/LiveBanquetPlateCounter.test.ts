import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BanquetEventSummary,
  type BanquetExtraOrder,
  DEFAULT_BANQUET_EVENT,
  DEFAULT_BANQUET_EXTRA_CATALOG,
  DEFAULT_BANQUET_ORDERS,
  LIVE_PLATE_TRANSLATIONS,
  LiveBanquetPlateCounter,
  computeBanquetFinancials,
  computeOverflowStatus,
  formatBanquetServiceTimer,
  formatLkrAmount,
  generateBanquetThermalSlip,
} from "../src/staff/pos/LiveBanquetPlateCounter.js";

describe("Step 337: LiveBanquetPlateCounter — Event-Day Live Plate Counter & Extra Pax Tracker", () => {
  describe("1. Pure Domain Logic & Overflow Status Determination", () => {
    it("returns WITHIN_GUARANTEE when issued pax is less than or equal to guaranteed pax", () => {
      assert.strictEqual(computeOverflowStatus(150, 200, 20), "WITHIN_GUARANTEE");
      assert.strictEqual(computeOverflowStatus(200, 200, 20), "WITHIN_GUARANTEE");
      assert.strictEqual(computeOverflowStatus(0, 200, 20), "WITHIN_GUARANTEE");
    });

    it("returns EXTRA_PAX_BUFFER when issued pax exceeds guarantee but is within kitchen buffer", () => {
      assert.strictEqual(computeOverflowStatus(201, 200, 20), "EXTRA_PAX_BUFFER");
      assert.strictEqual(computeOverflowStatus(214, 200, 20), "EXTRA_PAX_BUFFER");
      assert.strictEqual(computeOverflowStatus(220, 200, 20), "EXTRA_PAX_BUFFER");
    });

    it("returns BUFFER_EXCEEDED when issued pax exceeds both guarantee and kitchen buffer", () => {
      assert.strictEqual(computeOverflowStatus(221, 200, 20), "BUFFER_EXCEEDED");
      assert.strictEqual(computeOverflowStatus(250, 200, 20), "BUFFER_EXCEEDED");
    });
  });

  describe("2. Pure Financial Calculation & Compounding Taxes", () => {
    it("calculates exact base plate financials with zero extra pax", () => {
      const summary = computeBanquetFinancials(200, 190, 8500, []);
      assert.strictEqual(summary.guaranteedPax, 200);
      assert.strictEqual(summary.issuedPax, 190);
      assert.strictEqual(summary.extraPax, 0);
      assert.strictEqual(summary.basePlateTotalLkr, 1700000);
      assert.strictEqual(summary.extraPaxAmountLkr, 0);
      assert.strictEqual(summary.extraBitesTotalLkr, 0);
      assert.strictEqual(summary.extraChasersTotalLkr, 0);
      assert.strictEqual(summary.grossSubtotalLkr, 1700000);

      // 10% SC = 170,000
      assert.strictEqual(summary.serviceChargeLkr, 170000);

      // 1% TDL = 18,700
      assert.strictEqual(summary.tdlLkr, 18700);

      // 2.5% SSCL = 46,750
      assert.strictEqual(summary.ssclLkr, 46750);

      // 18% VAT on (1,870,000 + 18,700 + 46,750) = 1,935,450 * 0.18 = 348,381
      assert.strictEqual(summary.vatLkr, 348381);

      // Grand total = 1,935,450 + 348,381 = 2,283,831
      assert.strictEqual(summary.grandTotalLkr, 2283831);
    });

    it("calculates extra pax overflow and extra bites/chasers accurately", () => {
      const extraOrders: readonly BanquetExtraOrder[] = [
        {
          id: "ord-test-1",
          itemId: "bite-hbc",
          itemName: "Hot Butter Cuttlefish",
          category: "BITE",
          quantity: 2,
          unitPriceLkr: 3800,
          totalPriceLkr: 7600,
          tableRef: "Table 05",
          status: "SERVED",
          orderedAtIso: "2026-10-25T20:00:00Z",
        },
        {
          id: "ord-test-2",
          itemId: "chaser-egb",
          itemName: "Elephant House Ginger Beer",
          category: "CHASER",
          quantity: 4,
          unitPriceLkr: 450,
          totalPriceLkr: 1800,
          tableRef: "Table 05",
          status: "SERVED",
          orderedAtIso: "2026-10-25T20:05:00Z",
        },
      ];

      // 214 issued against 200 guaranteed -> +14 extra pax
      const summary = computeBanquetFinancials(200, 214, 8500, extraOrders);
      assert.strictEqual(summary.extraPax, 14);
      assert.strictEqual(summary.extraPaxAmountLkr, 14 * 8500); // 119,000
      assert.strictEqual(summary.extraBitesTotalLkr, 7600);
      assert.strictEqual(summary.extraChasersTotalLkr, 1800);

      const expectedGross = 1700000 + 119000 + 7600 + 1800; // 1,828,400
      assert.strictEqual(summary.grossSubtotalLkr, expectedGross);
      assert.ok(summary.grandTotalLkr > expectedGross);
    });
  });

  describe("3. String Helpers & Thermal Slip Generation", () => {
    it("formats LKR amount properly", () => {
      assert.strictEqual(formatLkrAmount(8500), "LKR 8,500.00");
      assert.strictEqual(formatLkrAmount(1700000), "LKR 1,700,000.00");
      assert.strictEqual(formatLkrAmount(0), "LKR 0.00");
    });

    it("formats elapsed service timer in HH:MM:SS format", () => {
      assert.strictEqual(formatBanquetServiceTimer(0), "00:00:00");
      assert.strictEqual(formatBanquetServiceTimer(65), "00:01:05");
      assert.strictEqual(formatBanquetServiceTimer(3661), "01:01:01");
      assert.strictEqual(formatBanquetServiceTimer(7200), "02:00:00");
    });

    it("generates an 80mm thermal slip containing all key reconciliation elements", () => {
      const financials = computeBanquetFinancials(200, 214, 8500, DEFAULT_BANQUET_ORDERS);
      const slip = generateBanquetThermalSlip(
        DEFAULT_BANQUET_EVENT,
        214,
        DEFAULT_BANQUET_ORDERS,
        financials,
        "2026-10-25T21:30:00.000Z",
      );

      assert.ok(slip.includes("LIVE PLATE RECONCILIATION SLIP"));
      assert.ok(slip.includes("BEO-9842"));
      assert.ok(slip.includes("Samarawickrama & Perera Wedding"));
      assert.ok(slip.includes("Guaranteed Pax:"));
      assert.ok(slip.includes("Actual Plates Issued:"));
      assert.ok(slip.includes("Extra Pax Overflow:"));
      assert.ok(slip.includes("Hot Butter Cuttlefish"));
      assert.ok(slip.includes("GRAND TOTAL SETTLEMENT:"));
      assert.ok(slip.includes("Captain Signature:"));
      assert.ok(slip.includes("Host/Client Sign:"));
    });
  });

  describe("4. Trilingual Localization Dictionary Integrity", () => {
    it("provides complete translations across en, si, and ta without missing keys", () => {
      const languages = ["en", "si", "ta"] as const;
      const expectedKeys = [
        "title",
        "subtitle",
        "guaranteedPax",
        "issuedPax",
        "extraPax",
        "bufferPax",
        "remainingWithinBuffer",
        "addOnePlate",
        "addFivePlates",
        "addTenPlates",
        "minusOnePlate",
        "stationSelect",
        "quickBitesTitle",
        "quickBitesTab",
        "quickChasersTab",
        "tableRefPlaceholder",
        "dispatchOrder",
        "liveOrdersTitle",
        "noOrdersYet",
        "markServed",
        "served",
        "settlementTitle",
        "syncSettlementButton",
        "printThermalSlipButton",
        "auditLogTitle",
        "screenAwakeActive",
        "screenAwakeInactive",
        "soundAlertsActive",
        "soundAlertsMuted",
        "offlinePendingBadge",
        "liveSyncedBadge",
        "withinGuaranteeBadge",
        "extraPaxWarningBadge",
        "bufferExceededAlertBadge",
        "timerRunning",
        "timerPaused",
        "resetTimer",
      ] as const;

      for (const lang of languages) {
        const dict = LIVE_PLATE_TRANSLATIONS[lang];
        assert.ok(dict, `Dictionary for ${lang} must exist`);
        for (const key of expectedKeys) {
          assert.ok(
            dict[key] && dict[key].length > 0,
            `Key '${key}' in language '${lang}' must be non-empty`,
          );
        }
      }
    });

    it("verifies default catalog items have valid prices and units", () => {
      assert.ok(DEFAULT_BANQUET_EXTRA_CATALOG.length >= 8);
      for (const item of DEFAULT_BANQUET_EXTRA_CATALOG) {
        assert.ok(item.unitPriceLkr > 0);
        assert.ok(item.name.length > 0);
        assert.ok(item.nameSi.length > 0);
        assert.ok(item.nameTa.length > 0);
      }
    });
  });

  describe("5. React Component Static Markup Rendering", () => {
    it("renders LiveBanquetPlateCounter with default props in dark mode", () => {
      const html = renderToStaticMarkup(React.createElement(LiveBanquetPlateCounter, {}));

      assert.ok(html.includes("BEO-9842"));
      assert.ok(html.includes("Samarawickrama &amp; Perera Wedding"));
      assert.ok(html.includes("Guaranteed Pax"));
      assert.ok(html.includes("Actual Plates Issued"));
      assert.ok(html.includes("+1 Plate"));
      assert.ok(html.includes("+5 Plates"));
      assert.ok(html.includes("+10 Plates"));
      assert.ok(html.includes("-1 Correction"));
      assert.ok(html.includes("Devilled Bites"));
      assert.ok(html.includes("Chasers &amp; Ice"));
      assert.ok(html.includes("Sync to Final Settlement Invoice"));
      assert.ok(html.includes("Print 80mm Verification Slip"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveBanquetPlateCounter, { language: "si" }),
      );

      assert.ok(html.includes("සහතික කළ අමුත්තන්"));
      assert.ok(html.includes("නිකුත් කළ මුළු පිඟන්"));
      assert.ok(html.includes("+1 පිඟාන"));
      assert.ok(html.includes("+5 පිඟන්"));
      assert.ok(html.includes("+10 පිඟන්"));
      assert.ok(html.includes("ඩෙවිල්ඩ් බයිට්ස්"));
      assert.ok(html.includes("බීම සහ අයිස්"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiveBanquetPlateCounter, { language: "ta" }),
      );

      assert.ok(html.includes("உறுதியளிக்கப்பட்டோர்"));
      assert.ok(html.includes("வழங்கப்பட்ட தட்டுகள்"));
      assert.ok(html.includes("+1 தட்டு"));
      assert.ok(html.includes("+5 தட்டுகள்"));
      assert.ok(html.includes("டெவில்ட் பைட்ஸ்"));
    });

    it("renders with custom event and overflow status badge", () => {
      const customEvent: BanquetEventSummary = {
        eventId: "BNQ-CUSTOM-01",
        functionNumber: "BEO-5544",
        clientName: "Fernando & Silva Homecoming",
        contactPhone: "+94 71 999 8888",
        hallName: "Lotus Grand Ballroom",
        eventDate: "2026-11-15",
        guaranteedPax: 300,
        bufferPax: 30,
        ratePerPlateLkr: 9200,
        initialIssuedPax: 315, // Overflow by 15 pax
        captainName: "Dammika Ranasinghe",
      };

      const html = renderToStaticMarkup(
        React.createElement(LiveBanquetPlateCounter, {
          initialEvent: customEvent,
          isDarkMode: false,
        }),
      );

      assert.ok(html.includes("BEO-5544"));
      assert.ok(html.includes("Fernando &amp; Silva Homecoming"));
      assert.ok(html.includes("Lotus Grand Ballroom"));
      assert.ok(html.includes("Extra Pax Overflow"));
      assert.ok(html.includes("+15"));
    });
  });
});
