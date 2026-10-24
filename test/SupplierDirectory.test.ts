/**
 * Unit Test Suite for Step 377: SupplierDirectory
 *
 * Validates:
 * 1. Pure calculation & formatting helpers:
 *    - computeSupplierDirectorySummary
 *    - filterSuppliers (category, credit terms, search query, VAT registered flag)
 *    - generateWhatsAppOrderLink
 * 2. Sri Lankan vendor presets & banking constants:
 *    - DEFAULT_SUPPLIERS (covers 6 categories, BR/TIN/VAT, bank account details)
 *    - SRI_LANKAN_BANKS
 *    - CREDIT_TERMS_CONFIG (CASH, 14_DAYS, 30_DAYS, 60_DAYS)
 * 3. Trilingual localization integrity (en, si, ta)
 * 4. React 19 component rendering via renderToStaticMarkup.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CREDIT_TERMS_CONFIG,
  DEFAULT_SUPPLIERS,
  SRI_LANKAN_BANKS,
  SUPPLIER_TRANSLATIONS,
  type SupplierCreditTerms,
  SupplierDirectory,
  computeSupplierDirectorySummary,
  filterSuppliers,
  generateWhatsAppOrderLink,
} from "../src/admin/inventory/SupplierDirectory.js";

describe("Step 377: SupplierDirectory & Local Market Vendor Registry", () => {
  describe("1. Pure Calculation & Filter Helpers", () => {
    it("computes supplier directory summary metrics accurately", () => {
      const summary = computeSupplierDirectorySummary(DEFAULT_SUPPLIERS);

      assert.equal(summary.totalSuppliers, DEFAULT_SUPPLIERS.length);
      assert.equal(summary.activeSuppliers, DEFAULT_SUPPLIERS.length);
      assert.ok(summary.vatRegisteredCount >= 3, "At least 3 VAT vendors expected in defaults");

      assert.ok(summary.creditTermsDistribution.CASH >= 1);
      assert.ok(summary.creditTermsDistribution["14_DAYS"] >= 1);
      assert.ok(summary.creditTermsDistribution["30_DAYS"] >= 1);
      assert.ok(summary.creditTermsDistribution["60_DAYS"] >= 1);

      assert.ok(summary.categoryDistribution.DRY_STORE >= 1);
      assert.ok(summary.categoryDistribution.COLD_ROOM_SEAFOOD >= 1);
      assert.ok(summary.categoryDistribution.VEGETABLE_MARKET >= 1);
      assert.ok(summary.categoryDistribution.LIQUOR_BAR >= 1);
      assert.ok(summary.categoryDistribution.HOUSEKEEPING_CHEMICALS >= 1);
      assert.ok(summary.categoryDistribution.DIESEL_FUEL >= 1);
    });

    it("filters suppliers by storage category", () => {
      const drySuppliers = filterSuppliers(DEFAULT_SUPPLIERS, { category: "DRY_STORE" });
      assert.ok(drySuppliers.length >= 1);
      assert.ok(drySuppliers.every((s) => s.category === "DRY_STORE"));

      const allSuppliers = filterSuppliers(DEFAULT_SUPPLIERS, { category: "ALL" });
      assert.equal(allSuppliers.length, DEFAULT_SUPPLIERS.length);
    });

    it("filters suppliers by credit terms", () => {
      const cashSuppliers = filterSuppliers(DEFAULT_SUPPLIERS, { creditTerms: "CASH" });
      assert.ok(cashSuppliers.length >= 1);
      assert.ok(cashSuppliers.every((s) => s.creditTerms === "CASH"));

      const monthlySuppliers = filterSuppliers(DEFAULT_SUPPLIERS, { creditTerms: "30_DAYS" });
      assert.ok(monthlySuppliers.length >= 1);
      assert.ok(monthlySuppliers.every((s) => s.creditTerms === "30_DAYS"));
    });

    it("filters suppliers by VAT registration status", () => {
      const vatOnly = filterSuppliers(DEFAULT_SUPPLIERS, { vatRegisteredOnly: true });
      assert.ok(vatOnly.length >= 1);
      assert.ok(
        vatOnly.every((s) => s.vatRegistrationNumber && s.vatRegistrationNumber.length > 0),
      );
    });

    it("filters suppliers by free-text search across name, contact, BR/TIN, and bank", () => {
      const searchRice = filterSuppliers(DEFAULT_SUPPLIERS, { searchQuery: "Araliya" });
      assert.equal(searchRice.length, 1);
      assert.equal(searchRice[0]?.name, "Araliya Rice Mills Polonnaruwa");

      const searchPerson = filterSuppliers(DEFAULT_SUPPLIERS, { searchQuery: "Lalith" });
      assert.equal(searchPerson.length, 1);
      assert.equal(searchPerson[0]?.contactPerson, "Lalith Wickramasinghe");

      const searchBr = filterSuppliers(DEFAULT_SUPPLIERS, { searchQuery: "10984" });
      assert.ok(searchBr.length >= 1);

      const searchBank = filterSuppliers(DEFAULT_SUPPLIERS, { searchQuery: "Commercial Bank" });
      assert.ok(searchBank.length >= 1);
    });

    it("generates WhatsApp direct click-to-chat order links", () => {
      const link = generateWhatsAppOrderLink(
        "+94772345678",
        "Galle Fort Lighthouse Villa",
        "Order 25kg Keeri Samba",
      );
      assert.ok(link.startsWith("https://wa.me/94772345678?text="));
      assert.ok(link.includes("Galle%20Fort%20Lighthouse%20Villa"));
      assert.ok(link.includes("Keeri%20Samba"));
    });
  });

  describe("2. Presets & Domain Metadata", () => {
    it("validates all default suppliers meet Sri Lankan banking and tax contracts", () => {
      for (const s of DEFAULT_SUPPLIERS) {
        assert.ok(s.id.length > 0);
        assert.ok(s.name.length > 0);
        assert.ok(s.businessRegNo.length > 0, "All vendors must have a Business Reg (BR) No");
        assert.ok(s.contactPerson.length > 0);
        assert.ok(s.phone.length > 0);
        assert.ok(s.whatsappNumber.startsWith("+94"), "WhatsApp must be Sri Lankan format");
        assert.ok(s.bankAccountDetails.bankName.length > 0);
        assert.ok(s.bankAccountDetails.accountNumber.length > 0);
        assert.ok(s.bankAccountDetails.accountHolderName.length > 0);
        assert.ok(s.leadTimeDays >= 1);
      }
    });

    it("verifies major Sri Lankan commercial banks are listed", () => {
      assert.ok(SRI_LANKAN_BANKS.includes("Bank of Ceylon (BOC)"));
      assert.ok(SRI_LANKAN_BANKS.includes("Commercial Bank of Ceylon"));
      assert.ok(SRI_LANKAN_BANKS.includes("Hatton National Bank (HNB)"));
      assert.ok(SRI_LANKAN_BANKS.includes("Sampath Bank"));
    });

    it("provides the 4 statutory credit terms configurations", () => {
      const terms: SupplierCreditTerms[] = ["CASH", "14_DAYS", "30_DAYS", "60_DAYS"];
      for (const t of terms) {
        assert.ok(CREDIT_TERMS_CONFIG[t]);
        assert.ok(CREDIT_TERMS_CONFIG[t].label.length > 0);
      }
    });
  });

  describe("3. Trilingual Localization Integrity", () => {
    it("provides complete translations across English, Sinhala, and Tamil", () => {
      const languages = ["en", "si", "ta"] as const;
      const keys = [
        "title",
        "subtitle",
        "addSupplier",
        "editSupplier",
        "allCategories",
        "vatOnlyFilter",
        "searchPlaceholder",
        "supplierName",
        "category",
        "brTinVat",
        "creditTerms",
        "bankDetails",
        "contact",
        "whatsapp",
        "leadTime",
        "actions",
      ] as const;

      for (const lang of languages) {
        const dict = SUPPLIER_TRANSLATIONS[lang];
        assert.ok(dict, `Missing translations for ${lang}`);
        for (const key of keys) {
          assert.ok(dict[key] && dict[key].length > 0, `Missing key ${key} in ${lang}`);
        }
      }
    });
  });

  describe("4. React 19 Component Rendering", () => {
    it("renders SupplierDirectory with default vendors without error", () => {
      const html = renderToStaticMarkup(React.createElement(SupplierDirectory));

      assert.ok(html.includes("Supplier &amp; Local Market Vendor Directory"));
      assert.ok(html.includes("Araliya Rice Mills Polonnaruwa"));
      assert.ok(html.includes("Mirissa Harbor Fisheries Co-Operative"));
      assert.ok(html.includes("Ceylon Petroleum Corporation (CPC)"));
      assert.ok(html.includes("Order via WA"));
    });

    it("renders in readOnly mode without add and edit buttons", () => {
      const html = renderToStaticMarkup(React.createElement(SupplierDirectory, { readOnly: true }));

      assert.ok(html.includes("Supplier &amp; Local Market Vendor Directory"));
      assert.ok(!html.includes("+</span><span>Register Supplier"));
      assert.ok(!html.includes("Edit"));
      assert.ok(!html.includes("Delete"));
    });

    it("renders empty state gracefully when supplier list is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(SupplierDirectory, { initialSuppliers: [] }),
      );

      assert.ok(html.includes("No suppliers found"));
      assert.ok(html.includes("Try clearing search filters or register a new vendor"));
    });
  });
});
