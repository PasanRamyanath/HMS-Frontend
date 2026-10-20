import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PrintableStoreVoucher,
  STORE_VOUCHER_TRANSLATIONS,
  type StoreVoucherLineItem,
  calculateVoucherTotals,
  formatVoucherLkr as formatLkr,
} from "../src/admin/inventory/PrintableStoreVoucher.js";

describe("Step 395: Printable A4 GRN, GIN & Purchase Order Voucher Template", () => {
  describe("1. Pure Financial Math & Tax Calculations", () => {
    it("calculates voucher subtotal without taxes when tax flags are false", () => {
      const items: StoreVoucherLineItem[] = [
        {
          itemNumber: 1,
          sku: "DRY-BASMATI-001",
          name: "Basmati Rice 50kg",
          unitOfMeasure: "kg",
          quantity: 10,
          unitPriceLkr: 350,
          lineTotalLkr: 3500,
        },
        {
          itemNumber: 2,
          sku: "SPICE-CINNAMON-002",
          name: "Ceylon Cinnamon ALBA",
          unitOfMeasure: "kg",
          quantity: 2,
          unitPriceLkr: 6000,
          lineTotalLkr: 12000,
        },
      ];

      const res = calculateVoucherTotals(items, {
        applyVat: false,
        applySscl: false,
      });

      assert.strictEqual(res.subtotalLkr, 15500);
      assert.strictEqual(res.ssclLkr, 0);
      assert.strictEqual(res.vatLkr, 0);
      assert.strictEqual(res.totalGrossLkr, 15500);
    });

    it("calculates statutory SSCL (2.5%) and compounding VAT (18%) for commercial purchase orders", () => {
      const items: StoreVoucherLineItem[] = [
        {
          itemNumber: 1,
          sku: "LIQ-ARRACK-0750",
          name: "Rockland Arrack 750ml",
          unitOfMeasure: "bottles",
          quantity: 10,
          unitPriceLkr: 10000,
          lineTotalLkr: 100000,
        },
      ];

      // Subtotal = 100,000 LKR
      // SSCL (2.5%) = 2,500 LKR
      // VAT Base = 100,000 + 2,500 = 102,500 LKR
      // VAT (18%) = 102,500 * 0.18 = 18,450 LKR
      // Total Gross = 102,500 + 18,450 = 120,950 LKR
      const res = calculateVoucherTotals(items, {
        applyVat: true,
        applySscl: true,
      });

      assert.strictEqual(res.subtotalLkr, 100000);
      assert.strictEqual(res.ssclLkr, 2500);
      assert.strictEqual(res.vatLkr, 18450);
      assert.strictEqual(res.totalGrossLkr, 120950);
    });

    it("formats LKR currency strings with Rs. prefix and exact decimals", () => {
      assert.strictEqual(formatLkr(468000), "Rs. 468,000.00");
      assert.strictEqual(formatLkr(0), "Rs. 0.00");
      assert.strictEqual(formatLkr(123456.78), "Rs. 123,456.78");
    });
  });

  describe("2. Trilingual Localization Coverage", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      for (const lang of languages) {
        const dict = STORE_VOUCHER_TRANSLATIONS[lang];
        assert.ok(dict.titles.GRN, `Missing GRN title in ${lang}`);
        assert.ok(dict.titles.GIN, `Missing GIN title in ${lang}`);
        assert.ok(dict.titles.PO, `Missing PO title in ${lang}`);
        assert.ok(dict.buttons.printA4, `Missing printA4 button in ${lang}`);
        assert.ok(dict.labels.voucherNo, `Missing voucherNo label in ${lang}`);
        assert.ok(dict.labels.tin, `Missing TIN label in ${lang}`);
        assert.ok(dict.table.description, `Missing description in ${lang}`);
        assert.ok(dict.totals.grandTotal, `Missing grandTotal in ${lang}`);
        assert.ok(dict.signatures.storekeeper, `Missing storekeeper in ${lang}`);
        assert.ok(dict.signatures.receivingOfficer, `Missing receivingOfficer in ${lang}`);
        assert.ok(dict.signatures.financialController, `Missing financialController in ${lang}`);
      }
    });
  });

  describe("3. React 19 Static Rendering", () => {
    it("renders default Goods Received Note (GRN) voucher with hotel header and line items", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          initialVoucherType: "GRN",
        }),
      );

      assert.ok(html.includes("GOODS RECEIVED NOTE (GRN)"));
      assert.ok(
        html.includes("Amanwella Resort &amp; Ayurveda Sanctuary") ||
          html.includes("Amanwella Resort & Ayurveda Sanctuary"),
      );
      assert.ok(html.includes("GRN-20261020-0084"));
      assert.ok(
        html.includes("Lanka Fresh Seafoods &amp; Lagoon Supplies") ||
          html.includes("Lanka Fresh Seafoods & Lagoon Supplies"),
      );
      assert.ok(html.includes("Negombo Lagoon Tiger Prawns"));
      assert.ok(html.includes("Gamini Wijesinghe"));
      assert.ok(html.includes("Kasun Jayasuriya"));
      assert.ok(html.includes("Sunil Rathnayake"));
      assert.ok(html.includes("Print A4 Voucher"));
    });

    it("renders Goods Issue Note (GIN) voucher when voucherType is GIN", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          initialVoucherType: "GIN",
        }),
      );

      assert.ok(html.includes("GOODS ISSUE NOTE (GIN)"));
      assert.ok(html.includes("GIN-20261020-0112"));
      assert.ok(
        html.includes("The Ocean Breeze Restaurant &amp; Hot Kitchen Line") ||
          html.includes("The Ocean Breeze Restaurant & Hot Kitchen Line"),
      );
      assert.ok(html.includes("Pure Ceylon Cinnamon Quills Grade ALBA"));
      assert.ok(html.includes("Anura Bandara"));
    });

    it("renders Purchase Order (PO) voucher with compounding statutory taxes", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          initialVoucherType: "PO",
        }),
      );

      assert.ok(html.includes("PURCHASE ORDER (PO)"));
      assert.ok(html.includes("PO-2026-0158"));
      assert.ok(html.includes("Rockland Distilleries (Pvt) Ltd"));
      assert.ok(html.includes("SSCL (2.5%):"));
      assert.ok(html.includes("VAT (18%):"));
      assert.ok(html.includes("Rs. 472,119.00"));
      assert.ok(html.includes("Dinesh Fernando"));
    });

    it("renders the 3 official sign-off lines: Storekeeper, Receiving Chef, and Financial Controller", () => {
      const html = renderToStaticMarkup(React.createElement(PrintableStoreVoucher, {}));

      assert.ok(html.includes("Storekeeper / Issued By"));
      assert.ok(html.includes("Receiving Chef / HOD"));
      assert.ok(html.includes("Financial Controller / GM"));
      assert.ok(
        html.includes("VERIFIED &amp; ENTERED INTO ERP") ||
          html.includes("VERIFIED & ENTERED INTO ERP"),
      );
    });

    it("renders draft watermark when showWatermark is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          showWatermark: true,
        }),
      );

      assert.ok(html.includes("DRAFT / FOR INTERNAL REVIEW ONLY"));
    });

    it("renders correctly in Sinhala localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          language: "si",
          initialVoucherType: "GRN",
        }),
      );

      assert.ok(html.includes("භාණ්ඩ ලැබීමේ සටහන (GRN)"));
      assert.ok(html.includes("ගබඩා භාරකරු / නිකුත් කළේ"));
      assert.ok(html.includes("භාරගත් විධායක චෙෆ් / ප්‍රධානී"));
      assert.ok(html.includes("මූල්‍ය පාලක / සාමාන්‍යාධිකාරී"));
    });

    it("renders correctly in Tamil localization", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableStoreVoucher, {
          language: "ta",
          initialVoucherType: "PO",
        }),
      );

      assert.ok(html.includes("கொள்முதல் ஆணை (PO)"));
      assert.ok(html.includes("களஞ்சிய காப்பாளர் / வழங்கியவர்"));
      assert.ok(html.includes("பெறும் தலைமை செஃப் / துறைத் தலைவர்"));
      assert.ok(html.includes("நிதி கட்டுப்பாட்டாளர் / பொது மேலாளர்"));
    });
  });
});
