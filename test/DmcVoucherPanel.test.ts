import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type DmcVoucherData,
  DmcVoucherPanel,
  type DmcVoucherPanelProps,
  type DmcVoucherStatus,
  buildSplitFolioSummary,
  validateDmcVoucher,
} from "../src/admin/frontdesk/DmcVoucherPanel.js";

describe("Tour Operator Exchange Voucher Panel (DmcVoucherPanel.tsx)", () => {
  describe("Voucher Validation (validateDmcVoucher)", () => {
    it("passes validation for complete DMC voucher data", () => {
      const valid: Partial<DmcVoucherData> = {
        contractId: "dmc-aitken",
        voucherNumber: "AST-2026-VCH-88219",
        tourReference: "KUONI-UK-RT-4029",
        guideName: "Sunil Jayawardena",
      };
      const res = validateDmcVoucher(valid);
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it("fails when DMC contract is not selected", () => {
      const res = validateDmcVoucher({
        voucherNumber: "AST-VCH-1",
        tourReference: "REF-1",
        guideName: "Sunil",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /Destination Management Company/i);
    });

    it("fails when physical voucher number is missing or too short", () => {
      const res = validateDmcVoucher({
        contractId: "dmc-walkers",
        voucherNumber: "V",
        tourReference: "REF-1",
        guideName: "Sunil",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /voucher number/i);
    });

    it("fails when tour reference is missing", () => {
      const res = validateDmcVoucher({
        contractId: "dmc-walkers",
        voucherNumber: "VCH-1234",
        tourReference: "",
        guideName: "Sunil",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /tour booking reference/i);
    });

    it("fails when guide name is missing", () => {
      const res = validateDmcVoucher({
        contractId: "dmc-walkers",
        voucherNumber: "VCH-1234",
        tourReference: "REF-123",
        guideName: "",
      });
      assert.strictEqual(res.isValid, false);
      assert.match(res.error ?? "", /guide or chauffeur/i);
    });
  });

  describe("Split-Folio Summary Generator (buildSplitFolioSummary)", () => {
    it("generates correct split-folio routing summary for Aitken Spence HB", () => {
      const summary = buildSplitFolioSummary("Aitken Spence Travels", "HB");
      assert.ok(summary.includes("100% Room & HB board basis"));
      assert.ok(summary.includes("Aitken Spence Travels City Ledger"));
      assert.ok(summary.includes("All extras, minibar & spa to Guest"));
    });

    it("handles empty company name gracefully with fallback", () => {
      const summary = buildSplitFolioSummary("", "BB");
      assert.ok(summary.includes("Tour Operator City Ledger"));
      assert.ok(summary.includes("BB board basis"));
    });
  });

  describe("Type Definitions & Status Verification", () => {
    it("ensures voucher data packet interface is constructible", () => {
      const status: DmcVoucherStatus = "VERIFIED";
      const data: DmcVoucherData = {
        contractId: "dmc-jetwing",
        contractCode: "DMC-JETWING-2026",
        companyName: "Jetwing Travels",
        voucherNumber: "JET-9821",
        tourReference: "DERTOUR-SL-88",
        guideName: "Kamal Perera",
        paxCount: 2,
        mealPlanVoucher: "FB",
        masterFolioTarget: "DMC_CITY_LEDGER",
        guestFolioTarget: "GUEST_EXTRAS",
        splitFolioConfigured: true,
        verificationStatus: status,
        isValid: true,
      };

      assert.strictEqual(data.verificationStatus, "VERIFIED");
      assert.strictEqual(data.mealPlanVoucher, "FB");
      assert.strictEqual(data.masterFolioTarget, "DMC_CITY_LEDGER");

      const props: DmcVoucherPanelProps = {
        value: data,
        disabled: true,
      };
      assert.strictEqual(props.disabled, true);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders default voucher panel with DMC picker and core inputs", () => {
      const html = renderToStaticMarkup(
        React.createElement(DmcVoucherPanel, {
          value: {
            voucherNumber: "AST-2026-VCH-88219",
            tourReference: "KUONI-UK-RT-4029",
            guideName: "Sunil Jayawardena",
            verificationStatus: "PENDING_VERIFICATION",
          },
        }),
      );

      assert.ok(html.includes("DMC Exchange Voucher"));
      assert.ok(html.includes("AST-2026-VCH-88219"));
      assert.ok(html.includes("Tour Operator / DMC Contract"));
      assert.ok(html.includes("Aitken Spence Travels"));
      assert.ok(html.includes("KUONI-UK-RT-4029"));
      assert.ok(html.includes("Sunil Jayawardena"));
      assert.ok(html.includes("Physical Voucher Scan Attachment"));
      assert.ok(html.includes("Automated Split-Folio Routing Active"));
    });

    it("renders verification action buttons when not disabled", () => {
      const html = renderToStaticMarkup(
        React.createElement(DmcVoucherPanel, {
          value: {
            contractId: "dmc-aitken",
            voucherNumber: "AST-1234",
          },
        }),
      );

      assert.ok(
        html.includes("Verify &amp; Approve Voucher") || html.includes("Verify & Approve Voucher"),
      );
      assert.ok(html.includes("Flag Discrepancy"));
    });

    it("hides action buttons and disables inputs when disabled is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(DmcVoucherPanel, {
          disabled: true,
        }),
      );

      assert.ok(html.includes("disabled"));
      assert.ok(!html.includes("Flag Discrepancy"));
    });
  });
});
