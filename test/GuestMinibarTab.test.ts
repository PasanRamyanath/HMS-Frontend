import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type GuestMinibarConsumedItem,
  type GuestMinibarSummary,
  GuestMinibarTab,
  type GuestMinibarTabProps,
  type MinibarDeclarationResult,
  type MinibarTabAction,
  buildConsumedItem,
  calculateMinibarSummary,
  getMinibarText,
} from "../src/qr/GuestMinibarTab.js";

describe("Step 265: In-Room Minibar Self-Declaration & Refill Tab (GuestMinibarTab.tsx)", () => {
  describe("1. Pure Financial & 4-Stage Statutory Tax Calculation", () => {
    it("calculates billable subtotal while zeroing complimentary items and computes compounding taxes", () => {
      const consumed: GuestMinibarConsumedItem[] = [
        {
          itemId: "mb-csh-01",
          name: "Salted Ceylon Cashew Nuts",
          quantity: 2,
          unitPriceLkr: 950,
          totalLkr: 1900,
          isComplimentary: false,
        },
        {
          itemId: "mb-water-free",
          name: "Complimentary Spring Water",
          quantity: 2,
          unitPriceLkr: 0,
          totalLkr: 0,
          isComplimentary: true,
        },
      ];

      const summary = calculateMinibarSummary(consumed);
      assert.strictEqual(summary.totalPieces, 4);
      assert.strictEqual(summary.netBaseLkr, 1900);

      // 10% SC = 190.00
      assert.strictEqual(summary.scLkr, 190);
      // Base + SC = 2090.00
      // 1% TDL = 20.90
      assert.strictEqual(summary.tdlLkr, 20.9);
      // 2.5% SSCL = 52.25
      assert.strictEqual(summary.ssclLkr, 52.25);
      // VAT Base = 2090 + 52.25 = 2142.25
      // 18% VAT = 385.6
      assert.strictEqual(summary.vatLkr, 385.6);
      // Grand Total = 2090 + 20.9 + 52.25 + 385.6 = 2548.75
      assert.strictEqual(summary.grandTotalLkr, 2548.75);
    });

    it("builds consumed item model with localized name and zeroed complimentary prices", () => {
      const mockItem = {
        id: "item-test-1",
        code: "TEST-01",
        title: { en: "Soda Can", si: "සෝඩා", ta: "சோடா" },
        category: "SOFT_DRINKS" as const,
        defaultParStock: 2,
        sellingPriceLkr: 350,
        costPriceLkr: 100,
        sku: "SKU-01",
        isComplimentary: false,
        isAlcoholic: false,
        isActive: true,
      };

      const built = buildConsumedItem(mockItem, 2, "si");
      assert.strictEqual(built.name, "සෝඩා");
      assert.strictEqual(built.totalLkr, 700);

      const complimentaryMock = { ...mockItem, isComplimentary: true };
      const builtComp = buildConsumedItem(complimentaryMock, 2, "en");
      assert.strictEqual(builtComp.unitPriceLkr, 0);
      assert.strictEqual(builtComp.totalLkr, 0);
    });
  });

  describe("2. Trilingual Localization Catalog", () => {
    it("returns correct translations across English, Sinhala, and Tamil", () => {
      const en = getMinibarText("en");
      assert.strictEqual(en.title, "In-Room Minibar & Refreshments");
      assert.strictEqual(en.declareTab, "Self-Declare & Settle");
      assert.strictEqual(en.refillTab, "Request Refill / Ice");

      const si = getMinibarText("si");
      assert.strictEqual(si.title, "කාමරයේ ඇති මිනි-බාර් පහසුකම");
      assert.strictEqual(si.declareTab, "භාවිතා කළ ද්‍රව්‍ය ගෙවීම");

      const ta = getMinibarText("ta");
      assert.strictEqual(ta.title, "அறை மினிபார் & புத்துணர்ச்சி பானங்கள்");
      assert.strictEqual(ta.declareTab, "சுய அறிவிப்பு & கட்டணம்");
    });
  });

  describe("3. Static Markup Rendering", () => {
    it("renders minibar checklist with room number, catalog items, and folio action", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestMinibarTab, {
          roomNumber: "Room 104",
          language: "en",
          allowFolioPost: true,
        }),
      );

      // Root testid
      assert.ok(html.includes('data-testid="guest-minibar-tab"'));

      // Header & Room context
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("In-Room Minibar &amp; Refreshments"));

      // Workflows
      assert.ok(html.includes("Self-Declare &amp; Settle"));
      assert.ok(html.includes("Request Refill / Ice"));

      // Items from default catalog
      assert.ok(html.includes("Salted Ceylon Cashew Nuts (50g)"));
      assert.ok(html.includes("Elephant House Ginger Beer"));

      // Action buttons
      assert.ok(html.includes("Charge to Room Folio"));
      assert.ok(html.includes("Pay via LankaQR"));
    });

    it("renders Sinhala localized view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestMinibarTab, {
          roomNumber: "Villa 2",
          language: "si",
        }),
      );

      assert.ok(html.includes("කාමරයේ ඇති මිනි-බාර් පහසුකම"));
      assert.ok(html.includes("භාවිතා කළ ද්‍රව්‍ය ගෙවීම"));
      assert.ok(html.includes("කාමර ගිණුමට එක් කරන්න"));
    });
  });

  describe("4. TypeScript Interface Constructibility", () => {
    it("constructs type-safe minibar declaration result and props", () => {
      const action: MinibarTabAction = "SELF_DECLARATION";
      const summary: GuestMinibarSummary = {
        totalPieces: 2,
        netBaseLkr: 950,
        scLkr: 95,
        tdlLkr: 10.45,
        ssclLkr: 26.13,
        vatLkr: 192.8,
        grandTotalLkr: 1274.38,
      };

      const result: MinibarDeclarationResult = {
        id: "MB-DEC-01",
        roomNumber: "Room 201",
        action,
        consumedItems: [],
        summary,
        paymentMethod: "ROOM_FOLIO",
        declaredAt: "2026-10-19T10:00:00Z",
        notes: "Restocked morning",
      };

      assert.strictEqual(result.paymentMethod, "ROOM_FOLIO");
      assert.strictEqual(result.summary.grandTotalLkr, 1274.38);

      const props: GuestMinibarTabProps = {
        roomNumber: "Room 201",
        language: "ta",
        usdExchangeRate: 310,
        allowFolioPost: true,
        onDeclarationSubmitted: () => {
          /* noop */
        },
        onOpenLankaQrPay: () => {
          /* noop */
        },
        testId: "custom-mb-test",
      };

      assert.strictEqual(props.roomNumber, "Room 201");
      assert.strictEqual(props.testId, "custom-mb-test");
    });
  });
});
