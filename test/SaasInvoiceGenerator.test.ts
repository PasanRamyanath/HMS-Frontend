import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_PLATFORM_MERCHANT,
  MOCK_TENANTS,
  PLAN_BASE_PRICES,
  PLAN_ROOM_ALLOWANCES,
  SAAS_VAT_RATE_PCT,
  SaasInvoiceGenerator,
  buildInitialInvoices,
  buildLankaQrForInvoice,
  buildWebXPayRecurringLink,
  computeExtraRoomFee,
  formatInvoicePriceLkr,
  generateMonthlyInvoice,
} from "../src/admin/superadmin/SaasInvoiceGenerator.js";

describe("Step 459 (Phase 19.09): Automated Monthly SaaS Invoice & WebXPay / LankaQR Generator (SaasInvoiceGenerator.tsx)", () => {
  describe("1. SaaS Tier Pricing & Room Allowance Invariants", () => {
    it("configures base prices: STARTER (4,500), GROWTH (12,500), ENTERPRISE (24,500)", () => {
      assert.strictEqual(PLAN_BASE_PRICES.STARTER_QR_ONLY, 4500);
      assert.strictEqual(PLAN_BASE_PRICES.GROWTH_PMS_PLUS_QR, 12500);
      assert.strictEqual(PLAN_BASE_PRICES.ENTERPRISE_RESORT_ERP, 24500);
    });

    it("configures standard room quotas: STARTER (15), GROWTH (40), ENTERPRISE (UNLIMITED)", () => {
      assert.strictEqual(PLAN_ROOM_ALLOWANCES.STARTER_QR_ONLY, 15);
      assert.strictEqual(PLAN_ROOM_ALLOWANCES.GROWTH_PMS_PLUS_QR, 40);
      assert.strictEqual(PLAN_ROOM_ALLOWANCES.ENTERPRISE_RESORT_ERP, "UNLIMITED");
    });

    it("applies statutory 18% VAT rate on Sri Lankan B2B SaaS software services", () => {
      assert.strictEqual(SAAS_VAT_RATE_PCT, 18);
    });
  });

  describe("2. Extra Room Fee Computations", () => {
    it("computes 0 extra fee when room count is within tier quota", () => {
      assert.strictEqual(computeExtraRoomFee("STARTER_QR_ONLY", 12), 0);
      assert.strictEqual(computeExtraRoomFee("GROWTH_PMS_PLUS_QR", 40), 0);
      assert.strictEqual(computeExtraRoomFee("ENTERPRISE_RESORT_ERP", 250), 0);
    });

    it("computes LKR 150/room for rooms exceeding allowance on GROWTH tier", () => {
      // 44 rooms - 40 allowance = 4 extra rooms * 150 = 600 LKR
      const fee = computeExtraRoomFee("GROWTH_PMS_PLUS_QR", 44);
      assert.strictEqual(fee, 600);
    });

    it("computes extra fee on STARTER tier if rooms exceed 15", () => {
      // 18 rooms - 15 allowance = 3 * 150 = 450 LKR
      const fee = computeExtraRoomFee("STARTER_QR_ONLY", 18);
      assert.strictEqual(fee, 450);
    });
  });

  describe("3. Invoice Total & Tax Calculations", () => {
    it("generates invoice with exact base fee and 18% VAT calculation", () => {
      const tenant = MOCK_TENANTS[1]; // Ella Cloud Mist: STARTER_QR_ONLY, 12 rooms, no add-ons
      assert.ok(tenant);
      const invoice = generateMonthlyInvoice(tenant, "October 2026");

      assert.strictEqual(invoice.baseFeeLkr, 4500);
      assert.strictEqual(invoice.extraRoomFeeLkr, 0);
      assert.strictEqual(invoice.subtotalLkr, 4500);
      // 4500 * 0.18 = 810 LKR VAT
      assert.strictEqual(invoice.vatAmountLkr, 810);
      assert.strictEqual(invoice.totalDueLkr, 5310);
      assert.strictEqual(invoice.status, "ISSUED");
    });

    it("generates invoice including active modular add-ons", () => {
      const tenant = MOCK_TENANTS[0]; // Galle Fort Boutique: GROWTH + Banquets add-on (3500)
      assert.ok(tenant);
      const invoice = generateMonthlyInvoice(tenant, "October 2026");

      assert.strictEqual(invoice.baseFeeLkr, 12500);
      assert.strictEqual(invoice.addOns.length, 1);
      const firstAddOn = invoice.addOns[0];
      assert.ok(firstAddOn);
      assert.strictEqual(firstAddOn.feeLkr, 3500);
      // Subtotal = 12500 + 3500 = 16000
      assert.strictEqual(invoice.subtotalLkr, 16000);
      // VAT = 16000 * 0.18 = 2880
      assert.strictEqual(invoice.vatAmountLkr, 2880);
      assert.strictEqual(invoice.totalDueLkr, 18880);
    });

    it("generates invoice including extra room capacity surcharges", () => {
      const tenant = MOCK_TENANTS[3]; // Pelmadulla Gem Villa: GROWTH with 44 rooms (+600 LKR)
      assert.ok(tenant);
      const invoice = generateMonthlyInvoice(tenant, "October 2026");

      assert.strictEqual(invoice.baseFeeLkr, 12500);
      assert.strictEqual(invoice.extraRoomFeeLkr, 600);
      // Subtotal = 12500 + 600 = 13100
      assert.strictEqual(invoice.subtotalLkr, 13100);
      // VAT = 13100 * 0.18 = 2358
      assert.strictEqual(invoice.vatAmountLkr, 2358);
      assert.strictEqual(invoice.totalDueLkr, 15458);
    });
  });

  describe("4. WebXPay 1-Click Hosted Recurring Payment Links", () => {
    it("generates valid WebXPay checkout link with required merchant parameters", () => {
      const link = buildWebXPayRecurringLink({
        invoiceNumber: "INV-2026-10-GAL-0042",
        totalDueLkr: 18880,
        hotelName: "Galle Fort Boutique & Heritage Spa",
        ownerEmail: "gm@gallefortboutique.lk",
      });

      assert.ok(link.startsWith("https://gateway.webxpay.com/payment/checkout?"));
      assert.ok(link.includes(`mid=${DEFAULT_PLATFORM_MERCHANT.merchantId}`));
      assert.ok(link.includes("order_id=INV-2026-10-GAL-0042"));
      assert.ok(link.includes("amount=18880.00"));
      assert.ok(link.includes("currency=LKR"));
      assert.ok(link.includes("recurring=1"));
      assert.ok(link.includes("auto_renew_interval=MONTHLY"));
    });
  });

  describe("5. Central Bank LankaQR EMVCo Payload Generation", () => {
    it("produces compliant LankaQR EMVCo payload with dynamic amount and CRC-16", () => {
      const qrPayload = buildLankaQrForInvoice({
        invoiceNumber: "INV-2026-10-GAL-0042",
        totalDueLkr: 18880,
        hotelName: "Galle Fort Boutique & Heritage Spa",
      });

      // Tag 00: Payload Format Indicator (01)
      assert.ok(qrPayload.startsWith("000201"));
      // Tag 01: Point of Initiation Method -> Dynamic (12)
      assert.ok(qrPayload.includes("010212"));
      // Tag 53: Transaction Currency (144 = LKR)
      assert.ok(qrPayload.includes("5303144"));
      // Tag 54: Transaction Amount
      assert.ok(qrPayload.includes("540818880.00") || qrPayload.includes("18880"));
      // Tag 63: CRC-16 checksum at end
      assert.ok(qrPayload.includes("6304"));
      assert.strictEqual(qrPayload.length >= 70, true);
    });
  });

  describe("6. React UI Static Rendering (Apple HIG Standard)", () => {
    it("renders SaasInvoiceGenerator dashboard with KPI metrics and invoice cards", () => {
      const html = renderToStaticMarkup(React.createElement(SaasInvoiceGenerator));

      assert.ok(html.includes("SaaS Billing &amp; Invoicing Engine"));
      assert.ok(html.includes("Total Invoiced"));
      assert.ok(html.includes("Collected / Paid"));
      assert.ok(html.includes("Outstanding / Due"));
      assert.ok(html.includes("Invoiced Hotel Clients"));
      assert.ok(html.includes("Galle Fort Boutique &amp; Heritage Spa"));
      assert.ok(html.includes("Ella Cloud Mist Resort &amp; Eco Lodge"));
      assert.ok(html.includes("Kandy Lakeview Sanctuary"));
      assert.ok(html.includes("WebXPay Link"));
      assert.ok(html.includes("LankaQR"));
    });

    it("formats amounts with tabular numerals and currency prefix", () => {
      const formatted = formatInvoicePriceLkr(18880);
      assert.ok(formatted.startsWith("LKR"));
      assert.ok(formatted.includes("18,880.00"));
    });

    it("builds initial mock invoices correctly", () => {
      const initialInvoices = buildInitialInvoices();
      assert.strictEqual(initialInvoices.length, 4);
      const inv0 = initialInvoices[0];
      const inv1 = initialInvoices[1];
      const inv2 = initialInvoices[2];
      const inv3 = initialInvoices[3];
      assert.ok(inv0);
      assert.ok(inv1);
      assert.ok(inv2);
      assert.ok(inv3);
      assert.strictEqual(inv0.status, "PAID");
      assert.strictEqual(inv1.status, "ISSUED");
      assert.strictEqual(inv2.status, "OVERDUE");
      assert.strictEqual(inv3.status, "DRAFT");
    });
  });
});
