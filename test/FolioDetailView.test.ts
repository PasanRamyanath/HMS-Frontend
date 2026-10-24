import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SAMPLE_FOLIO_LINES,
  DEFAULT_SAMPLE_RESERVATION,
  type FolioDetailReservationContext,
  FolioDetailView,
  type FolioDetailViewProps,
  type FolioFinancialSummary,
  type FolioItemView,
  type FolioPartition,
  computeFolioFinancialSummary,
  getDepartmentBadge,
} from "../src/admin/folios/FolioDetailView.js";
import { Department } from "../src/generated/graphql.js";

describe("Interactive Guest Folio Workspace (FolioDetailView.tsx)", () => {
  describe("1. Default Constants & Domain Models", () => {
    it("provides standard Sri Lankan DMC voucher reservation fixtures", () => {
      assert.strictEqual(DEFAULT_SAMPLE_RESERVATION.reservationId, "RES-2026-GALLE-09412");
      assert.strictEqual(DEFAULT_SAMPLE_RESERVATION.roomNumber, "Villa 104");
      assert.strictEqual(DEFAULT_SAMPLE_RESERVATION.billingType, "DMC_VOUCHER");
      assert.strictEqual(
        DEFAULT_SAMPLE_RESERVATION.dmcContractName,
        "Aitken Spence Travels Sri Lanka",
      );
      assert.strictEqual(DEFAULT_SAMPLE_RESERVATION.nightsCount, 3);
      assert.strictEqual(DEFAULT_SAMPLE_RESERVATION.mealPlan, "HB");
    });

    it("partitions sample lines between MASTER_DMC and GUEST_PERSONAL", () => {
      const masterLines = DEFAULT_SAMPLE_FOLIO_LINES.filter((l) => l.partition === "MASTER_DMC");
      const guestLines = DEFAULT_SAMPLE_FOLIO_LINES.filter((l) => l.partition === "GUEST_PERSONAL");

      assert.strictEqual(masterLines.length, 2);
      assert.strictEqual(guestLines.length, 4);

      // Master covers Room & Meal plan
      assert.ok(masterLines.some((l) => l.description.includes("Ocean View Heritage Villa")));
      assert.ok(masterLines.some((l) => l.description.includes("Half-Board")));

      // Guest covers Crab curry, Spa, Bar, Laundry
      assert.ok(guestLines.some((l) => l.description.includes("Crab Curry")));
      assert.ok(guestLines.some((l) => l.description.includes("Shirodhara")));
      assert.ok(guestLines.some((l) => l.description.includes("Arrack Sour")));
      assert.ok(guestLines.some((l) => l.description.includes("Linen Pressing")));
    });

    it("verifies exported types and shapes are constructible", () => {
      const partition: FolioPartition = "MASTER_DMC";
      assert.strictEqual(partition, "MASTER_DMC");

      const resContext: FolioDetailReservationContext = DEFAULT_SAMPLE_RESERVATION;
      assert.ok(resContext.reservationId);

      const props: FolioDetailViewProps = {
        reservation: DEFAULT_SAMPLE_RESERVATION,
      };
      assert.ok(props.reservation);
    });
  });

  describe("2. Pure Calculation Helpers (computeFolioFinancialSummary)", () => {
    it("aggregates base, compounding taxes, and gross across active lines", () => {
      const masterLines = DEFAULT_SAMPLE_FOLIO_LINES.filter((l) => l.partition === "MASTER_DMC");
      const summary: FolioFinancialSummary = computeFolioFinancialSummary(masterLines);

      // Base: 135,000 + 30,000 = 165,000 LKR
      assert.strictEqual(summary.totalBaseSupplyLkr, 165000);
      // SC: 13,500 + 3,000 = 16,500 LKR
      assert.strictEqual(summary.totalServiceChargeLkr, 16500);
      // TDL: 1,485 + 330 = 1,815 LKR
      assert.strictEqual(summary.totalTdlLkr, 1815);
      // SSCL: 3,712.5 + 825 = 4,538 LKR (rounded)
      assert.strictEqual(summary.totalSsclLkr, 4538);
      // Total Gross: 181,363.05 + 40,302.9 = 221,666 LKR (rounded)
      assert.strictEqual(summary.totalGrossLkr, 221666);
      assert.strictEqual(summary.balanceDueLkr, 221666);
      assert.strictEqual(summary.activeLineCount, 2);
    });

    it("correctly excludes voided lines from billable totals", () => {
      const sampleLinesWithVoid: FolioItemView[] = [
        {
          id: "line-active",
          department: Department.Restaurant,
          description: "Active Lunch",
          quantity: 1,
          unitPriceLkr: 5000,
          baseSupplyLkr: 5000,
          serviceChargeLkr: 500,
          tdlLkr: 55,
          ssclLkr: 137.5,
          vatLkr: 1024.65,
          totalGrossLkr: 6717.15,
          isVoided: false,
          partition: "GUEST_PERSONAL",
          createdAt: "2026-10-20T12:00:00.000Z",
        },
        {
          id: "line-voided",
          department: Department.Bar,
          description: "Mistaken Cocktail Charge",
          quantity: 2,
          unitPriceLkr: 2000,
          baseSupplyLkr: 4000,
          serviceChargeLkr: 400,
          tdlLkr: 44,
          ssclLkr: 110,
          vatLkr: 819.72,
          totalGrossLkr: 5373.72,
          isVoided: true,
          voidReason: "Posted to wrong room",
          partition: "GUEST_PERSONAL",
          createdAt: "2026-10-20T13:00:00.000Z",
        },
      ];

      const summary = computeFolioFinancialSummary(sampleLinesWithVoid);
      assert.strictEqual(summary.activeLineCount, 1);
      assert.strictEqual(summary.totalBaseSupplyLkr, 5000);
      assert.strictEqual(summary.totalGrossLkr, 6717);
    });

    it("deducts paid amounts accurately from balance due", () => {
      const guestLines = DEFAULT_SAMPLE_FOLIO_LINES.filter((l) => l.partition === "GUEST_PERSONAL");
      // Paid 20,000 LKR in advance
      const summary = computeFolioFinancialSummary(guestLines, 20000);
      assert.strictEqual(summary.totalPaidLkr, 20000);
      assert.strictEqual(summary.balanceDueLkr, summary.totalGrossLkr - 20000);
    });
  });

  describe("3. Department Badge Resolution (getDepartmentBadge)", () => {
    it("maps operational departments to standard Apple semantic colors", () => {
      assert.deepStrictEqual(getDepartmentBadge(Department.FrontOffice), {
        label: "FRONT OFFICE",
        color: "blue",
      });
      assert.deepStrictEqual(getDepartmentBadge(Department.Restaurant), {
        label: "RESTAURANT",
        color: "green",
      });
      assert.deepStrictEqual(getDepartmentBadge(Department.Bar), {
        label: "BAR & LOUNGE",
        color: "amber",
      });
      assert.deepStrictEqual(getDepartmentBadge(Department.Spa), {
        label: "AYURVEDA SPA",
        color: "indigo",
      });
      assert.deepStrictEqual(getDepartmentBadge(Department.Housekeeping), {
        label: "HOUSEKEEPING",
        color: "gray",
      });
    });
  });

  describe("4. React Static DOM Markup & Apple HIG Verification", () => {
    it("renders dual-folio workspace with reservation context and tables", () => {
      const html = renderToStaticMarkup(
        React.createElement(FolioDetailView, {
          reservation: DEFAULT_SAMPLE_RESERVATION,
          initialLines: DEFAULT_SAMPLE_FOLIO_LINES,
        }),
      );

      // Reservation context
      assert.ok(html.includes("Alexander von Bergmann"));
      assert.ok(html.includes("Villa 104"));
      assert.ok(html.includes("HB MEAL PLAN"));
      assert.ok(html.includes("Aitken Spence Travels Sri Lanka"));
      assert.ok(html.includes("AST-2026-VCH-88319"));

      // Sub-folio headers
      assert.ok(html.includes("DMC / Corporate Master Folio"));
      assert.ok(html.includes("Guest Personal Incidental Folio"));

      // Action triggers
      assert.ok(html.includes("+ Add Charge"));
      assert.ok(html.includes("Settle Guest Folio (IRD)"));
      assert.ok(html.includes("Generate City Ledger Invoice"));

      // Apple HIG styling classes
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("rounded-2xl"));
      assert.ok(html.includes("min-h-[44px]"));
    });
  });
});
