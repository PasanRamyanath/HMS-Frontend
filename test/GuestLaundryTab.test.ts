import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type GuestLaundryFinancialSummary,
  type GuestLaundryLine,
  type GuestLaundryPickupRequest,
  GuestLaundryTab,
  type GuestLaundryTabProps,
  type LaundryPickupSlot,
  type LaundryRequestStatus,
  type LaundrySpeed,
  calculateLaundrySummary,
  getLaundryStatusBadgeClass,
  getLaundryText,
} from "../src/qr/GuestLaundryTab.js";

describe("Step 264: Digital Laundry Pickup Request Form (GuestLaundryTab.tsx)", () => {
  describe("1. Pure Financial & 4-Stage Statutory Tax Calculation", () => {
    it("calculates standard subtotal and 4-stage Sri Lankan statutory compounding taxes", () => {
      const sampleLines: GuestLaundryLine[] = [
        {
          itemId: "lnd-shirt-01",
          name: "Men's Shirt",
          serviceType: "WASH_AND_IRON",
          quantity: 2,
          unitPriceLkr: 650,
          totalLkr: 1300,
        },
        {
          itemId: "lnd-trouser-02",
          name: "Trousers",
          serviceType: "WASH_AND_IRON",
          quantity: 1,
          unitPriceLkr: 750,
          totalLkr: 750,
        },
      ];

      // Standard speed
      const standardSummary = calculateLaundrySummary(sampleLines, "STANDARD");
      assert.strictEqual(standardSummary.totalPieces, 3);
      assert.strictEqual(standardSummary.standardSubtotalLkr, 2050);
      assert.strictEqual(standardSummary.expressSurchargeLkr, 0);
      assert.strictEqual(standardSummary.netBaseLkr, 2050);

      // 10% SC = 205.00
      assert.strictEqual(standardSummary.scLkr, 205);
      // Base + SC = 2255.00
      // 1% TDL = 22.55
      assert.strictEqual(standardSummary.tdlLkr, 22.55);
      // 2.5% SSCL = 56.38
      assert.strictEqual(standardSummary.ssclLkr, 56.38);
      // VAT Base = 2255 + 56.38 = 2311.38
      // 18% VAT = 416.05
      assert.strictEqual(standardSummary.vatLkr, 416.05);
      // Grand Total = 2255 + 22.55 + 56.38 + 416.05 = 2749.98
      assert.strictEqual(standardSummary.grandTotalLkr, 2749.98);

      // Express speed (+50% surcharge)
      const expressSummary = calculateLaundrySummary(sampleLines, "EXPRESS");
      assert.strictEqual(expressSummary.standardSubtotalLkr, 2050);
      assert.strictEqual(expressSummary.expressSurchargeLkr, 1025);
      assert.strictEqual(expressSummary.netBaseLkr, 3075);
      assert.ok(expressSummary.grandTotalLkr > standardSummary.grandTotalLkr);
    });

    it("returns distinct badge styling classes for laundry request statuses", () => {
      assert.ok(getLaundryStatusBadgeClass("PENDING_PICKUP").includes("amber"));
      assert.ok(getLaundryStatusBadgeClass("PICKED_UP").includes("sky"));
      assert.ok(getLaundryStatusBadgeClass("IN_WASH").includes("indigo"));
      assert.ok(getLaundryStatusBadgeClass("COMPLETED").includes("emerald"));
    });
  });

  describe("2. Trilingual Localization Catalog", () => {
    it("returns complete translations for English, Sinhala, and Tamil", () => {
      const en = getLaundryText("en");
      assert.strictEqual(en.title, "Digital Laundry & Dry Cleaning");
      assert.strictEqual(en.standardSpeed, "Standard Next-Day");
      assert.strictEqual(en.serviceTypeLabels.WASH_AND_IRON, "Wash & Iron");

      const si = getLaundryText("si");
      assert.strictEqual(si.title, "රෙදි සේදීම සහ වියළි පිරිසිදු කිරීම");
      assert.strictEqual(si.serviceTypeLabels.DRY_CLEAN, "ඩ්‍රයි ක්ලීනින්");

      const ta = getLaundryText("ta");
      assert.strictEqual(ta.title, "டிஜிட்டல் சலவை & உலர் சுத்தம்");
      assert.strictEqual(ta.serviceTypeLabels.PRESS_ONLY, "அயர்ன் மட்டும்");
    });
  });

  describe("3. Static Markup Rendering", () => {
    it("renders laundry tab with room number, speed options, and garment catalog", () => {
      const sampleRequests: GuestLaundryPickupRequest[] = [
        {
          id: "LND-001",
          roomNumber: "Villa 10",
          speed: "EXPRESS",
          pickupSlot: "IMMEDIATE",
          items: [
            {
              itemId: "lnd-shirt-01",
              name: "Men's Shirt / Ceylon Batik Shirt",
              serviceType: "WASH_AND_IRON",
              quantity: 2,
              unitPriceLkr: 650,
              totalLkr: 1300,
            },
          ],
          summary: {
            totalPieces: 2,
            standardSubtotalLkr: 1300,
            expressSurchargeLkr: 650,
            netBaseLkr: 1950,
            scLkr: 195,
            tdlLkr: 21.45,
            ssclLkr: 53.63,
            vatLkr: 395.75,
            grandTotalLkr: 2615.83,
          },
          requestedAt: "2026-10-19T10:00:00Z",
          status: "PICKED_UP",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(GuestLaundryTab, {
          roomNumber: "Villa 10",
          language: "en",
          initialRequests: sampleRequests,
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="guest-laundry-tab"'));

      // Header & Room context
      assert.ok(html.includes("Villa 10"));
      assert.ok(html.includes("Digital Laundry &amp; Dry Cleaning"));

      // Speed options
      assert.ok(html.includes("Standard Next-Day"));
      assert.ok(html.includes("Express 4-Hour (+50%)"));

      // Pickup time slots
      assert.ok(html.includes("Pickup Immediately"));
      assert.ok(html.includes("Within 1 Hour"));

      // Garment items from catalog
      assert.ok(html.includes("Men&#x27;s Shirt / Ceylon Batik Shirt"));
      assert.ok(html.includes("Trousers / Linen Chinos"));

      // Active request item
      assert.ok(html.includes("2 pieces (EXPRESS)"));
      assert.ok(html.includes("Bag Picked Up by Housekeeping"));
    });

    it("renders Sinhala localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestLaundryTab, {
          roomNumber: "Room 104",
          language: "si",
          initialRequests: [],
        }),
      );

      assert.ok(html.includes("රෙදි සේදීම සහ වියළි පිරිසිදු කිරීම"));
      assert.ok(html.includes("සාමාන්‍ය (පසුදා වන විට)"));
      assert.ok(html.includes("මෙම කාමරය සඳහා රෙදි සේදීමේ ඉල්ලීම් නොමැත."));
    });
  });

  describe("4. TypeScript Interface Constructibility", () => {
    it("constructs type-safe laundry financial summary and pickup requests", () => {
      const speed: LaundrySpeed = "EXPRESS";
      const slot: LaundryPickupSlot = "EVENING";
      const status: LaundryRequestStatus = "IN_WASH";

      const summary: GuestLaundryFinancialSummary = {
        totalPieces: 4,
        standardSubtotalLkr: 2800,
        expressSurchargeLkr: 1400,
        netBaseLkr: 4200,
        scLkr: 420,
        tdlLkr: 46.2,
        ssclLkr: 115.5,
        vatLkr: 852.39,
        grandTotalLkr: 5634.09,
      };

      const req: GuestLaundryPickupRequest = {
        id: "LND-12345",
        roomNumber: "Room 302",
        speed,
        pickupSlot: slot,
        items: [],
        summary,
        specialInstructions: "Handle silk with care",
        requestedAt: "2026-10-19T10:00:00Z",
        status,
      };

      assert.strictEqual(req.speed, "EXPRESS");
      assert.strictEqual(req.status, "IN_WASH");
      assert.strictEqual(req.summary.grandTotalLkr, 5634.09);

      const props: GuestLaundryTabProps = {
        roomNumber: "Room 302",
        language: "ta",
        usdExchangeRate: 310,
        onPickupRequested: () => {
          /* noop */
        },
        initialRequests: [req],
        testId: "custom-laundry-test",
      };

      assert.strictEqual(props.roomNumber, "Room 302");
      assert.strictEqual(props.testId, "custom-laundry-test");
    });
  });
});
