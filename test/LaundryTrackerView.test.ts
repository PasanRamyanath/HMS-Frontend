import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LAUNDRY_JOBS,
  type LaundryJobGarmentLine,
  LaundryTrackerView,
  calculateLaundryTaxes,
  formatLaundryLkr,
  getLaundryTrackerText,
  getNextLaundryStage,
  isJobMatchingSearch,
  isJobMatchingTab,
  resolveStageBadge,
} from "../src/admin/housekeeping/LaundryTrackerView.js";

const noop = () => undefined;

describe("Step 308: Guest Laundry Job Tracker & Folio Auto-Poster (LaundryTrackerView.tsx)", () => {
  describe("1. Pure Statutory Tax & Surcharge Calculations", () => {
    it("calculates accurate standard 4-stage compounding taxes without express surcharge", () => {
      const items: readonly LaundryJobGarmentLine[] = [
        {
          id: "item-1",
          garmentName: "Cotton Shirt",
          serviceType: "WASH_AND_IRON",
          quantity: 2,
          unitPriceLkr: 1000,
          lineTotalLkr: 2000,
        },
      ];

      const res = calculateLaundryTaxes(items, false);
      assert.equal(res.piecesCount, 2);
      assert.equal(res.standardSubtotalLkr, 2000);
      assert.equal(res.isExpress, false);
      assert.equal(res.expressSurchargeLkr, 0);
      assert.equal(res.netBaseLkr, 2000);

      // SC 10% = 200
      assert.equal(res.scLkr, 200);

      // TDL 1% = 22
      assert.equal(res.tdlLkr, 22);

      // SSCL 2.5% = 55
      assert.equal(res.ssclLkr, 55);

      // VAT 18% on (afterSc + SSCL = 2255) = 405.90
      assert.equal(res.vatLkr, 405.9);

      // Grand total = 2200 + 22 + 55 + 405.9 = 2682.90
      assert.equal(res.grandTotalLkr, 2682.9);
    });

    it("applies +50% express turnaround surcharge and compounds taxes on enhanced base", () => {
      const items: readonly LaundryJobGarmentLine[] = [
        {
          id: "item-2",
          garmentName: "Silk Saree",
          serviceType: "DRY_CLEAN",
          quantity: 1,
          unitPriceLkr: 4000,
          lineTotalLkr: 4000,
        },
      ];

      const res = calculateLaundryTaxes(items, true);
      assert.equal(res.piecesCount, 1);
      assert.equal(res.standardSubtotalLkr, 4000);
      assert.equal(res.isExpress, true);
      assert.equal(res.expressSurchargeLkr, 2000); // 50% of 4000
      assert.equal(res.netBaseLkr, 6000);

      // SC 10% = 600 -> afterSc = 6600
      assert.equal(res.scLkr, 600);

      // TDL 1% on 6600 = 66
      assert.equal(res.tdlLkr, 66);

      // SSCL 2.5% on 6600 = 165
      assert.equal(res.ssclLkr, 165);

      // VAT 18% on (6600 + 165 = 6765) = 1217.70
      assert.equal(res.vatLkr, 1217.7);

      // Grand total = 6600 + 66 + 165 + 1217.7 = 8048.70
      assert.equal(res.grandTotalLkr, 8048.7);
    });

    it("formats LKR currency strings cleanly", () => {
      assert.equal(formatLaundryLkr(1250), "LKR 1,250.00");
      assert.equal(formatLaundryLkr(5332.26), "LKR 5,332.26");
    });
  });

  describe("2. Pipeline Stages & Filtering Helpers", () => {
    it("advances sequentially through the 4 laundry lifecycle stages", () => {
      assert.equal(getNextLaundryStage("PICKED_UP"), "WASHING");
      assert.equal(getNextLaundryStage("WASHING"), "IRONING");
      assert.equal(getNextLaundryStage("IRONING"), "RETURNED_TO_ROOM");
      assert.equal(getNextLaundryStage("RETURNED_TO_ROOM"), "RETURNED_TO_ROOM");
    });

    it("resolves distinct Apple HIG badge styles and icons per stage", () => {
      assert.ok(resolveStageBadge("PICKED_UP").style.includes("blue"));
      assert.ok(resolveStageBadge("WASHING").style.includes("amber"));
      assert.ok(resolveStageBadge("IRONING").style.includes("purple"));
      assert.ok(resolveStageBadge("RETURNED_TO_ROOM").style.includes("emerald"));
    });

    it("filters jobs accurately across stage tabs and express criteria", () => {
      const sampleJob = DEFAULT_LAUNDRY_JOBS[0]; // WASHING, isExpress = true
      assert.ok(sampleJob);

      assert.equal(isJobMatchingTab(sampleJob, "ALL"), true);
      assert.equal(isJobMatchingTab(sampleJob, "WASHING"), true);
      assert.equal(isJobMatchingTab(sampleJob, "IRONING"), false);
      assert.equal(isJobMatchingTab(sampleJob, "EXPRESS_ONLY"), true);

      const standardJob = DEFAULT_LAUNDRY_JOBS[1]; // IRONING, isExpress = false
      assert.ok(standardJob);
      assert.equal(isJobMatchingTab(standardJob, "EXPRESS_ONLY"), false);
      assert.equal(isJobMatchingTab(standardJob, "IRONING"), true);
    });

    it("matches search queries against room number, guest name, and bag tag number", () => {
      const job = DEFAULT_LAUNDRY_JOBS[0];
      assert.ok(job);

      assert.equal(isJobMatchingSearch(job, "101"), true);
      assert.equal(isJobMatchingSearch(job, "Pasan"), true);
      assert.equal(isJobMatchingSearch(job, "LND-101-08"), true);
      assert.equal(isJobMatchingSearch(job, "NonExistent"), false);
      assert.equal(isJobMatchingSearch(job, ""), true);
    });
  });

  describe("3. React Static Markup & Apple HIG UI Standard", () => {
    it("renders tracker header, metrics bar, and filter tabs", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaundryTrackerView, {
          propertyName: "Cinnamon Wild Yala",
          onPostToFolio: noop,
          onStageChange: noop,
        }),
      );

      assert.ok(html.includes("Cinnamon Wild Yala"));
      assert.ok(html.includes("Guest Laundry &amp; Dry Cleaning Tracker"));
      assert.ok(html.includes("Active Jobs"));
      assert.ok(html.includes("In Wash"));
      assert.ok(html.includes("In Ironing"));
      assert.ok(html.includes("Ready to Return"));
      assert.ok(html.includes("Folio Billed Revenue"));
      assert.ok(html.includes("All Jobs"));
      assert.ok(html.includes("⚡ Express Only"));
    });

    it("renders job cards with room badges, express badges, and action buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(LaundryTrackerView, {
          initialJobs: DEFAULT_LAUNDRY_JOBS,
        }),
      );

      assert.ok(html.includes("Room #101"));
      assert.ok(html.includes("LND-101-08"));
      assert.ok(html.includes("⚡ Express 4h"));
      assert.ok(html.includes("Advance Stage"));
      assert.ok(html.includes("Post to Folio"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("apple-liquid-glass"));
    });

    it("renders trilingual localized text in Sinhala and Tamil", () => {
      const textSi = getLaundryTrackerText("si");
      assert.equal(textSi.title, "අමුත්තන්ගේ රෙදි සේදීමේ කළමනාකරණය");
      assert.equal(textSi.postToFolioAction, "ගිණුමට එක් කරන්න");
      assert.equal(textSi.advanceStageAction, "ඊළඟ පියවර");

      const textTa = getLaundryTrackerText("ta");
      assert.equal(textTa.title, "விருந்தினர் சலவை & உலர் சலவை கண்காணிப்பு");
      assert.equal(textTa.postToFolioAction, "பில்லில் சேர்க்க");
      assert.equal(textTa.advanceStageAction, "அடுத்த நிலை");

      const htmlSi = renderToStaticMarkup(
        React.createElement(LaundryTrackerView, {
          language: "si",
        }),
      );
      assert.ok(htmlSi.includes("අමුත්තන්ගේ රෙදි සේදීමේ කළමනාකරණය"));
      assert.ok(htmlSi.includes("ඊළඟ පියවර"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(LaundryTrackerView, {
          language: "ta",
        }),
      );
      assert.ok(htmlTa.includes("விருந்தினர் சலவை &amp; உலர் சலவை கண்காணிப்பு"));
      assert.ok(htmlTa.includes("அடுத்த நிலை"));
    });
  });
});
