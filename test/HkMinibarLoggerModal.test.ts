import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_MINIBAR_CATALOG } from "../src/lib/minibarCatalog.js";
import {
  HkMinibarLoggerModal,
  type MinibarLoggedItem,
  buildLoggedItemsList,
  calculateMinibarTaxSummary,
  formatMinibarLkr,
  getItemIcon,
  getModalText,
} from "../src/staff/housekeeping/HkMinibarLoggerModal.js";

const noop = () => undefined;

describe("Step 303: Attendant In-Room Minibar Consumption 1-Tap Logger (HkMinibarLoggerModal.tsx)", () => {
  describe("1. Pure Statutory 4-Stage Tax Engine & Math Helpers", () => {
    it("returns zero taxes when consumed list is empty", () => {
      const summary = calculateMinibarTaxSummary([]);
      assert.equal(summary.totalPieces, 0);
      assert.equal(summary.netBaseLkr, 0);
      assert.equal(summary.scLkr, 0);
      assert.equal(summary.tdlLkr, 0);
      assert.equal(summary.ssclLkr, 0);
      assert.equal(summary.vatLkr, 0);
      assert.equal(summary.grandTotalLkr, 0);
    });

    it("calculates exact 4-stage compounding Sri Lankan statutory taxes (SC 10% -> TDL 1% -> SSCL 2.5% -> VAT 18%)", () => {
      // 1x Lion Lager Beer (LKR 1,100) + 1x Salted Cashews (LKR 950) = LKR 2,050 Net
      const items: MinibarLoggedItem[] = [
        {
          itemId: "mb-lion-03",
          code: "MB-LION-330",
          name: "Lion Lager Beer (330ml Can)",
          category: "BEER_WINE",
          quantity: 1,
          parStock: 2,
          unitPriceLkr: 1100,
          lineTotalLkr: 1100,
          isComplimentary: false,
        },
        {
          itemId: "mb-csh-01",
          code: "MB-CSH-50G",
          name: "Salted Ceylon Cashew Nuts (50g)",
          category: "SNACKS",
          quantity: 1,
          parStock: 2,
          unitPriceLkr: 950,
          lineTotalLkr: 950,
          isComplimentary: false,
        },
      ];

      const summary = calculateMinibarTaxSummary(items);
      assert.equal(summary.totalPieces, 2);
      assert.equal(summary.netBaseLkr, 2050);

      // Stage 1: SC 10% = 205.00
      assert.equal(summary.scLkr, 205);
      const afterSc = summary.netBaseLkr + summary.scLkr;
      assert.equal(afterSc, 2255);

      // Stage 2: TDL 1% on (Net + SC) = 22.55
      assert.equal(summary.tdlLkr, 22.55);

      // Stage 3: SSCL 2.5% on (Net + SC) = 56.38
      assert.equal(summary.ssclLkr, 56.38);

      // Stage 4: VAT 18% on (Net + SC + SSCL) = (2255 + 56.38) * 0.18 = 2311.38 * 0.18 = 416.05
      assert.equal(summary.vatLkr, 416.05);

      // Grand Total = 2255 + 22.55 + 56.38 + 416.05 = 2749.98
      assert.equal(summary.grandTotalLkr, 2749.98);
    });

    it("ignores complimentary welcome items in tax calculations", () => {
      const items: MinibarLoggedItem[] = [
        {
          itemId: "mb-wtr-06",
          code: "MB-WTR-500",
          name: "Spring Artesian Bottled Water",
          category: "WELLNESS_MINERAL",
          quantity: 4,
          parStock: 4,
          unitPriceLkr: 0,
          lineTotalLkr: 0,
          isComplimentary: true,
        },
      ];

      const summary = calculateMinibarTaxSummary(items);
      assert.equal(summary.totalPieces, 4);
      assert.equal(summary.netBaseLkr, 0);
      assert.equal(summary.grandTotalLkr, 0);
    });

    it("formats LKR currency strings with precision", () => {
      assert.match(formatMinibarLkr(2749.98), /LKR\s*2,749\.98/);
      assert.match(formatMinibarLkr(0), /LKR\s*0\.00/);
    });

    it("returns appropriate emoji icon for each minibar item category", () => {
      assert.equal(getItemIcon("BEER_WINE"), "Beer");
      assert.equal(getItemIcon("SPIRITS_MINIATURES"), "Spirit");
      assert.equal(getItemIcon("SNACKS"), "Nuts");
      assert.equal(getItemIcon("SOFT_DRINKS"), "Drink");
      assert.equal(getItemIcon("WELLNESS_MINERAL"), "Water");
    });

    it("builds logged item list correctly from catalog and tally map", () => {
      const tally = {
        "mb-lion-03": 2,
        "mb-csh-01": 1,
      };

      const logged = buildLoggedItemsList(DEFAULT_MINIBAR_CATALOG, tally, "en");
      assert.equal(logged.length, 2);

      const lion = logged.find((i) => i.itemId === "mb-lion-03");
      assert.ok(lion);
      assert.equal(lion.quantity, 2);
      assert.equal(lion.lineTotalLkr, 2200);

      const cashew = logged.find((i) => i.itemId === "mb-csh-01");
      assert.ok(cashew);
      assert.equal(cashew.quantity, 1);
      assert.equal(cashew.lineTotalLkr, 950);
    });
  });

  describe("2. React Static Markup & Apple HIG Design Tokens", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkMinibarLoggerModal, {
          isOpen: false,
          onClose: noop,
          roomNumber: "101",
          onPostToFolio: noop,
        }),
      );
      assert.equal(html, "");
    });

    it("renders modal structure with room number, folio ID, and departing banner", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkMinibarLoggerModal, {
          isOpen: true,
          onClose: noop,
          roomNumber: "101",
          guestName: "Pasan Ramyanath",
          folioId: "FOL-2026-101",
          roomTypeName: "Deluxe Ocean Villa",
          attendantName: "Kamal Silva",
          onPostToFolio: noop,
        }),
      );

      assert.ok(html.includes("Room 101"));
      assert.ok(html.includes("Pasan Ramyanath"));
      assert.ok(html.includes("FOL-2026-101"));
      assert.ok(html.includes("Deluxe Ocean Villa"));
      assert.ok(html.includes("DEPARTING • FOLIO CLEARANCE"));
      assert.ok(html.includes("Minibar Intact (Nil Consumed)"));
    });

    it("enforces >= 44x44pt touch targets on interactive steppers and buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(HkMinibarLoggerModal, {
          isOpen: true,
          onClose: noop,
          roomNumber: "204",
          onPostToFolio: noop,
        }),
      );

      // Verify presence of min-w-[44px] and min-h-[44px]
      assert.ok(html.includes("min-w-[44px]"));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-h-[48px]"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders trilingual localized labels in Sinhala and Tamil", () => {
      const textSi = getModalText("si");
      assert.equal(textSi.title, "කාමරයේ මිනි-බාර් පරිභෝජනය");
      assert.equal(textSi.departingBadge, "පිටවීම • ගිණුම් පියවීම");
      assert.equal(textSi.nilConsumedAction, "කිසිවක් භාවිතා කර නොමැත (සම්පූර්ණයි)");

      const textTa = getModalText("ta");
      assert.equal(textTa.title, "அறை மினிபார் நுகர்வுப் பதிவு");
      assert.equal(textTa.departingBadge, "வெளியேறுதல் • கட்டண அனுமதி");
      assert.equal(textTa.nilConsumedAction, "எதுவும் பயன்படுத்தப்படவில்லை (முழுமையானது)");

      const htmlSi = renderToStaticMarkup(
        React.createElement(HkMinibarLoggerModal, {
          isOpen: true,
          onClose: noop,
          roomNumber: "305",
          language: "si",
          onPostToFolio: noop,
        }),
      );
      assert.ok(htmlSi.includes("පිටවීම • ගිණුම් පියවීම"));
      assert.ok(htmlSi.includes("කිසිවක් භාවිතා කර නොමැත (සම්පූර්ණයි)"));

      const htmlTa = renderToStaticMarkup(
        React.createElement(HkMinibarLoggerModal, {
          isOpen: true,
          onClose: noop,
          roomNumber: "305",
          language: "ta",
          onPostToFolio: noop,
        }),
      );
      assert.ok(htmlTa.includes("வெளியேறுதல் • கட்டண அனுமதி"));
      assert.ok(htmlTa.includes("எதுவும் பயன்படுத்தப்படவில்லை (முழுமையானது)"));
    });
  });
});
