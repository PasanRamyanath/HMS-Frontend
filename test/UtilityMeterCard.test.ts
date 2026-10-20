import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_UTILITY_RECORDS,
  DEFAULT_UTILITY_TARIFFS,
  type DailyUtilityRecord,
  UtilityMeterCard,
  type UtilityTariffSettings,
  calculateDailyUtilityFinancials,
  calculateUtilityAggregateSummary,
  formatUtilityLkr,
  getUtilityText,
} from "../src/admin/housekeeping/UtilityMeterCard.js";

const noop = () => undefined;

describe("Step 312: Diesel Generator, CEB Grid Power & Water Tank Daily Utility Meter Log (UtilityMeterCard.tsx)", () => {
  describe("1. Pure Utility Tariff, Solar Mix & PORN Financial Calculations", () => {
    it("calculates accurate daily costs, solar savings, and Cost Per Occupied Room Night (PORN)", () => {
      const record: DailyUtilityRecord = {
        recordId: "utl-test-01",
        dateIso: "2026-10-20",
        occupiedRoomsCount: 40,
        totalRoomsCount: 42,
        cebUnitsKwh: 400,
        solarUnitsKwh: 200,
        dieselLiters: 20,
        dieselRunHours: 2.0,
        waterCubicMeters: 20,
        waterBowserDeliveriesCount: 0,
        loggedByStaff: "Anura",
      };

      const tariffs: UtilityTariffSettings = {
        cebRatePerKwhLkr: 40.0,
        dieselCostPerLiterLkr: 300.0,
        waterCostPerCubicMeterLkr: 350.0,
      };

      const fin = calculateDailyUtilityFinancials(record, tariffs);

      // CEB Cost: 400 kWh * 40 LKR = 16,000 LKR
      assert.equal(fin.cebCostLkr, 16000);

      // Solar Savings: 200 kWh * 40 LKR = 8,000 LKR
      assert.equal(fin.solarSavingsLkr, 8000);

      // Diesel Cost: 20 L * 300 LKR = 6,000 LKR
      assert.equal(fin.dieselCostLkr, 6000);

      // Water Cost: 20 m3 * 350 LKR = 7,000 LKR
      assert.equal(fin.waterCostLkr, 7000);

      // Total Utility Cost: 16,000 + 6,000 + 7,000 = 29,000 LKR
      assert.equal(fin.totalUtilityCostLkr, 29000);

      // Cost per Occupied Room Night (PORN): 29,000 / 40 = 725 LKR
      assert.equal(fin.costPerOccupiedRoomLkr, 725);

      // Solar Ratio: 200 / (400 + 200) = 33.3%
      assert.equal(fin.solarRatioPct, 33.3);

      // Water Liters per Room: (20 * 1000) / 40 = 500 Liters
      assert.equal(fin.waterLitersPerRoom, 500);
    });

    it("handles zero occupancy gracefully without division by zero or NaN", () => {
      const emptyRecord: DailyUtilityRecord = {
        recordId: "utl-test-zero",
        dateIso: "2026-10-20",
        occupiedRoomsCount: 0,
        totalRoomsCount: 42,
        cebUnitsKwh: 100,
        solarUnitsKwh: 0,
        dieselLiters: 0,
        dieselRunHours: 0,
        waterCubicMeters: 5,
        waterBowserDeliveriesCount: 0,
        loggedByStaff: "Anura",
      };

      const fin = calculateDailyUtilityFinancials(emptyRecord, DEFAULT_UTILITY_TARIFFS);
      assert.equal(fin.costPerOccupiedRoomLkr, 0);
      assert.equal(fin.waterLitersPerRoom, 0);
      assert.ok(!Number.isNaN(fin.costPerOccupiedRoomLkr));
    });

    it("aggregates multi-day utility history and overall solar green mix", () => {
      const summary = calculateUtilityAggregateSummary(DEFAULT_UTILITY_RECORDS);
      assert.equal(summary.totalDays, DEFAULT_UTILITY_RECORDS.length);
      assert.ok(summary.totalCostLkr > 0);
      assert.ok(summary.avgCostPerOccupiedRoomLkr > 0);
      assert.ok(summary.totalCebKwh > 0);
      assert.ok(summary.totalSolarKwh > 0);
      assert.ok(summary.overallSolarPct > 0);
    });

    it("formats LKR currency strings cleanly with commas and two decimals", () => {
      assert.equal(formatUtilityLkr(29000), "LKR 29,000.00");
      assert.equal(formatUtilityLkr(725.5), "LKR 725.50");
    });
  });

  describe("2. React Static Markup & Apple HIG Design Standards", () => {
    it("renders utility board header, action button, and overview metrics cards", () => {
      const html = renderToStaticMarkup(
        React.createElement(UtilityMeterCard, {
          propertyName: "Cinnamon Wild Yala",
          onSaveReading: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Resort Utility Meter Log &amp; Cost Auditor"));
      assert.ok(html.includes("+ Log Meter Reading"));
      assert.ok(
        html.includes("Today&#x27;s Utility Expense") || html.includes("Today's Utility Expense"),
      );
      assert.ok(html.includes("Cost Per Occupied Room"));
      assert.ok(html.includes("Solar Green Energy Ratio"));
      assert.ok(html.includes("Solar Cost Offset"));
    });

    it("renders the 4 utility pillar cards with badges, icons, and tabular numbers", () => {
      const html = renderToStaticMarkup(
        React.createElement(UtilityMeterCard, {
          initialRecords: DEFAULT_UTILITY_RECORDS,
        }),
      );

      assert.ok(html.includes("CEB Grid Power"));
      assert.ok(html.includes("Rooftop Solar PV"));
      assert.ok(html.includes("Diesel Generator"));
      assert.ok(html.includes("Fresh Water Supply"));
      assert.ok(html.includes("Commercial"));
      assert.ok(html.includes("Clean Energy"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders historical utility log table with date, occupancy, and cost columns", () => {
      const html = renderToStaticMarkup(
        React.createElement(UtilityMeterCard, {
          initialRecords: DEFAULT_UTILITY_RECORDS,
        }),
      );

      assert.ok(html.includes("Daily Utility Consumption &amp; Cost History"));
      assert.ok(html.includes("2026-10-20"));
      assert.ok(html.includes("36 / 42 rooms"));
    });

    it("renders trilingual localized text in Sinhala and Tamil", () => {
      const textSi = getUtilityText("si");
      assert.equal(textSi.title, "හෝටල් උපයෝගිතා මීටර ලේඛනය සහ පිරිවැය විගණනය");
      assert.equal(textSi.logReadingAction, "+ මීටර සටහනක් ඇතුළත් කරන්න");

      const textTa = getUtilityText("ta");
      assert.equal(textTa.title, "ஹோட்டல் பயன்பாட்டு மீட்டர் பதிவு & செலவு தணிக்கை");
      assert.equal(textTa.logReadingAction, "+ மீட்டர் வாசிப்பு பதிவு");

      const htmlSi = renderToStaticMarkup(
        React.createElement(UtilityMeterCard, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("හෝටල් උපයෝගිතා මීටර ලේඛනය සහ පිරිවැය විගණනය"));
      assert.ok(htmlSi.includes("+ මීටර සටහනක් ඇතුළත් කරන්න"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(UtilityMeterCard, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("ஹோட்டல் பயன்பாட்டு மீட்டர் பதிவு &amp; செலவு தணிக்கை"));
      assert.ok(htmlTa.includes("+ மீட்டர் வாசிப்பு பதிவு"));
    });
  });
});
