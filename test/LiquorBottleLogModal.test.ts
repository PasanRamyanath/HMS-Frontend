import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type ClientLiquorBottleEntry,
  DEFAULT_GATE_PASS_DETAILS,
  DEFAULT_LIQUOR_ENTRIES,
  LIQUOR_TRANSLATIONS,
  LiquorBottleLogModal,
  type LiquorGatePassDetails,
  POPULAR_SRI_LANKAN_BRANDS,
  computeLiquorSummary,
  formatLiquorCurrency,
  formatLiquorGatePassVoucher,
} from "../src/admin/banquets/LiquorBottleLogModal.js";

describe("Step 338: LiquorBottleLogModal — Liquor Bottle Gate-Pass & Empty-Bottle Reconciliation Form", () => {
  describe("1. Pure Domain Logic & Reconciliation Summary Calculations", () => {
    it("computes balanced reconciliation when all received bottles are accounted for", () => {
      const summary = computeLiquorSummary(DEFAULT_LIQUOR_ENTRIES, 12, 2500);

      // 12 + 8 + 4 = 24 received
      assert.strictEqual(summary.totalBottlesReceived, 24);
      // 10 + 6 + 3 = 19 opened
      assert.strictEqual(summary.totalBottlesOpened, 19);
      // 2 + 2 + 1 = 5 returned
      assert.strictEqual(summary.totalBottlesReturned, 5);

      // Accounted = 19 + 5 = 24 -> Balanced!
      assert.strictEqual(summary.isBalanced, true);
      assert.strictEqual(summary.discrepancyCount, 0);

      // Corkage: 19 opened, 12 waiver -> 7 billable @ LKR 2500 = 17,500 LKR
      assert.strictEqual(summary.waivedCorkageCount, 12);
      assert.strictEqual(summary.billableCorkageCount, 7);
      assert.strictEqual(summary.totalCorkageFeeLkr, 17500);
    });

    it("flags discrepancy when bottles are missing/unaccounted for", () => {
      const entriesWithMissing: readonly ClientLiquorBottleEntry[] = [
        {
          id: "m-01",
          brandName: "Johnnie Walker Black Label",
          category: "WHISKEY",
          bottleVolumeMl: 1000,
          quantityReceived: 10,
          quantityOpened: 6,
          quantityReturnedUnopened: 2, // 6 + 2 = 8 (2 missing)
          sealIntact: true,
        },
      ];

      const summary = computeLiquorSummary(entriesWithMissing, 5, 2000);
      assert.strictEqual(summary.totalBottlesReceived, 10);
      assert.strictEqual(summary.totalBottlesOpened, 6);
      assert.strictEqual(summary.totalBottlesReturned, 2);
      assert.strictEqual(summary.isBalanced, false);
      assert.strictEqual(summary.discrepancyCount, 2); // 2 missing

      // Corkage: 6 opened, 5 waiver -> 1 billable @ LKR 2000 = 2000 LKR
      assert.strictEqual(summary.waivedCorkageCount, 5);
      assert.strictEqual(summary.billableCorkageCount, 1);
      assert.strictEqual(summary.totalCorkageFeeLkr, 2000);
    });

    it("handles zero corkage when opened bottles are within complimentary waiver", () => {
      const entriesWithinWaiver: readonly ClientLiquorBottleEntry[] = [
        {
          id: "w-01",
          brandName: "Rockland Old Arrack",
          category: "ARRACK",
          bottleVolumeMl: 750,
          quantityReceived: 6,
          quantityOpened: 5,
          quantityReturnedUnopened: 1,
          sealIntact: true,
        },
      ];

      // 5 opened vs 10 waiver allowance
      const summary = computeLiquorSummary(entriesWithinWaiver, 10, 2500);
      assert.strictEqual(summary.totalBottlesOpened, 5);
      assert.strictEqual(summary.waivedCorkageCount, 5);
      assert.strictEqual(summary.billableCorkageCount, 0);
      assert.strictEqual(summary.totalCorkageFeeLkr, 0);
      assert.strictEqual(summary.isBalanced, true);
    });
  });

  describe("2. String Formatter & Printable Voucher Generator", () => {
    it("formats liquor currency in LKR with commas and two decimals", () => {
      assert.strictEqual(formatLiquorCurrency(2500), "LKR 2,500.00");
      assert.strictEqual(formatLiquorCurrency(17500), "LKR 17,500.00");
      assert.strictEqual(formatLiquorCurrency(0), "LKR 0.00");
    });

    it("generates an official gate-pass voucher text with audit details and dual signatures", () => {
      const summary = computeLiquorSummary(DEFAULT_LIQUOR_ENTRIES, 12, 2500);
      const voucher = formatLiquorGatePassVoucher(
        DEFAULT_GATE_PASS_DETAILS,
        DEFAULT_LIQUOR_ENTRIES,
        summary,
      );

      assert.ok(voucher.includes("LIQUOR GATE-PASS & EMPTY-BOTTLE RECONCILIATION"));
      assert.ok(voucher.includes("GP-BNQ-2026-0889"));
      assert.ok(voucher.includes("Samarawickrama & Perera Wedding"));
      assert.ok(voucher.includes("198824103982"));
      assert.ok(voucher.includes("Johnnie Walker Black Label"));
      assert.ok(voucher.includes("Total Bottles Received:"));
      assert.ok(voucher.includes("Total Bottles Opened:"));
      assert.ok(voucher.includes("Total Bottles Returned:"));
      assert.ok(voucher.includes("FULLY BALANCED & VERIFIED"));
      assert.ok(voucher.includes("TOTAL EXCESS CORKAGE DUE:"));
      assert.ok(voucher.includes("Client Signature:"));
      assert.ok(voucher.includes("Banquet Manager Sign:"));
    });
  });

  describe("3. Trilingual Localization & Presets Integrity", () => {
    it("provides complete translations across en, si, and ta without missing keys", () => {
      const languages = ["en", "si", "ta"] as const;
      const expectedKeys = [
        "title",
        "subtitle",
        "tabIntake",
        "tabReconciliation",
        "tabSignOff",
        "gatePassNumber",
        "clientName",
        "clientNic",
        "brandNamePlaceholder",
        "addBottleButton",
        "quickPresetTitle",
        "category",
        "received",
        "opened",
        "returned",
        "sealIntact",
        "balancedBadge",
        "discrepancyBadge",
        "waiverAllowance",
        "billableCorkage",
        "corkageTotal",
        "clientSignaturePrompt",
        "managerSignaturePrompt",
        "printVoucher",
        "saveAndClose",
        "cancel",
      ] as const;

      for (const lang of languages) {
        const dict = LIQUOR_TRANSLATIONS[lang];
        assert.ok(dict, `Dictionary for ${lang} must exist`);
        for (const key of expectedKeys) {
          assert.ok(
            dict[key] && dict[key].length > 0,
            `Key '${key}' in language '${lang}' must be non-empty`,
          );
        }
      }
    });

    it("verifies popular Sri Lankan liquor brand presets", () => {
      assert.ok(POPULAR_SRI_LANKAN_BRANDS.length >= 8);
      for (const brand of POPULAR_SRI_LANKAN_BRANDS) {
        assert.ok(brand.brandName.length > 0);
        assert.ok(brand.bottleVolumeMl > 0);
        assert.ok(brand.category.length > 0);
      }
    });
  });

  describe("4. React Component Static Markup Rendering", () => {
    const noop = () => {
      /* intentional no-op callback for tests */
    };

    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiquorBottleLogModal, {
          isOpen: false,
          onClose: noop,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders modal with header, tabs, and intake table when isOpen is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiquorBottleLogModal, {
          isOpen: true,
          onClose: noop,
        }),
      );

      assert.ok(html.includes("Client Liquor Gate-Pass &amp; Bottle Reconciliation"));
      assert.ok(html.includes("1. Intake Gate-Pass"));
      assert.ok(html.includes("2. Bottle Reconciliation"));
      assert.ok(html.includes("3. Dual Sign-Off &amp; Corkage"));
      assert.ok(html.includes("GP-BNQ-2026-0889"));
      assert.ok(html.includes("Samarawickrama &amp; Perera Wedding"));
      assert.ok(html.includes("Johnnie Walker Black Label 1L"));
      assert.ok(html.includes("Rockland Old Arrack 750ml"));
      assert.ok(html.includes("Save Reconciliation Log"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiquorBottleLogModal, {
          isOpen: true,
          language: "si",
          onClose: noop,
        }),
      );

      assert.ok(html.includes("මධ්යසාර බෝතල් ඇතුළත් කිරීම"));
      assert.ok(html.includes("1. බෝතල් භාරගැනීමේ අවසරපත්රය"));
      assert.ok(html.includes("2. හිස් බෝතල් පරීක්ෂාව"));
      assert.ok(html.includes("3. අත්සන් කිරීම සහ කෝකේජ් ගාස්තු"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(
        React.createElement(LiquorBottleLogModal, {
          isOpen: true,
          language: "ta",
          onClose: noop,
        }),
      );

      assert.ok(html.includes("மதுபான பாட்டில் நுழைவுச்சீட்டு"));
      assert.ok(html.includes("1. நுழைவு அனுமதிச்சீட்டு"));
      assert.ok(html.includes("2. பாட்டில் சமரசம்"));
    });

    it("renders in light mode with custom gate pass details", () => {
      const customDetails: LiquorGatePassDetails = {
        gatePassNumber: "GP-BNQ-2026-9999",
        eventId: "EVT-CUSTOM",
        functionNumber: "BEO-7777",
        clientName: "Gunasekera Silver Jubilee",
        clientContact: "+94 77 987 6543",
        clientNicOrPassport: "197500123456",
        receivedAtIso: "2026-11-20T10:00:00Z",
        banquetManagerName: "Sarath Fonseka",
        corkageWaiverAllowance: 15,
        excessCorkageRatePerBottleLkr: 3000,
      };

      const html = renderToStaticMarkup(
        React.createElement(LiquorBottleLogModal, {
          isOpen: true,
          isDarkMode: false,
          initialDetails: customDetails,
          onClose: noop,
        }),
      );

      assert.ok(html.includes("GP-BNQ-2026-9999"));
      assert.ok(html.includes("Gunasekera Silver Jubilee"));
      assert.ok(html.includes("BEO-7777"));
    });
  });
});
