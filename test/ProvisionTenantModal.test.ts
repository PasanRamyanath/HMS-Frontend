/**
 * Unit Test Suite for Step 452: ProvisionTenantModal
 * (`test/ProvisionTenantModal.test.ts`)
 *
 * Implements Step 452 (Phase 19.02) / Rung 2 of the Sri Lanka HMS Master Architecture Plan:
 * Build 1-Click New Hotel Tenant Provisioning & Demo Data Seeder (`ProvisionTenantModal.tsx`).
 *
 * Validates:
 * 1. Sri Lankan 4-stage compounding tax preset defaults (10% SC, 1% TDL, 2.5% SSCL, 18% VAT).
 * 2. Room templates and generateSeedRooms generator.
 * 3. Trilingual menu templates and generateSeedMenuItems generator.
 * 4. Tenant slug generation, password generation, and QR stand URL mapping.
 * 5. Input form validation (hotel name, city, email, phone).
 * 6. Pure provisionNewHotelTenant execution engine.
 * 7. React 19 SSR static markup rendering for closed and open modal states.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_SRI_LANKA_TAX_PRESET,
  type NewTenantProvisionRequest,
  PROVINCES_LIST,
  ProvisionTenantModal,
  SEED_MENU_TEMPLATES,
  SEED_ROOM_TEMPLATES,
  generateQrStands,
  generateSeedMenuItems,
  generateSeedRooms,
  generateTemporaryPassword,
  generateTenantSlug,
  provisionNewHotelTenant,
  validateTenantProvisionForm,
} from "../src/admin/superadmin/ProvisionTenantModal.js";

describe("Step 452: 1-Click New Hotel Tenant Provisioning & Demo Data Seeder (ProvisionTenantModal.tsx)", () => {
  describe("1. Sri Lankan Statutory Tax Presets", () => {
    it("matches Sri Lankan statutory 4-stage tax compounding rates exactly", () => {
      assert.equal(DEFAULT_SRI_LANKA_TAX_PRESET.serviceChargeRate, 0.1);
      assert.equal(DEFAULT_SRI_LANKA_TAX_PRESET.tdlRate, 0.01);
      assert.equal(DEFAULT_SRI_LANKA_TAX_PRESET.ssclRate, 0.025);
      assert.equal(DEFAULT_SRI_LANKA_TAX_PRESET.vatRate, 0.18);
      assert.equal(DEFAULT_SRI_LANKA_TAX_PRESET.compoundingOrder, "SC -> TDL -> SSCL -> VAT");
    });

    it("includes all 9 official Sri Lankan provinces", () => {
      assert.equal(PROVINCES_LIST.length, 9);
      assert.ok(PROVINCES_LIST.includes("Western"));
      assert.ok(PROVINCES_LIST.includes("Central"));
      assert.ok(PROVINCES_LIST.includes("Southern"));
      assert.ok(PROVINCES_LIST.includes("Uva"));
      assert.ok(PROVINCES_LIST.includes("Sabaragamuwa"));
      assert.ok(PROVINCES_LIST.includes("North Western"));
      assert.ok(PROVINCES_LIST.includes("North Central"));
      assert.ok(PROVINCES_LIST.includes("Northern"));
      assert.ok(PROVINCES_LIST.includes("Eastern"));
    });
  });

  describe("2. Seed Room Inventory Generator", () => {
    it("contains 10 diverse pre-configured room templates", () => {
      assert.equal(SEED_ROOM_TEMPLATES.length, 10);
      for (const room of SEED_ROOM_TEMPLATES) {
        assert.ok(room.roomNumber.length >= 3);
        assert.ok(room.category.length > 0);
        assert.ok(room.baseRateLkr > 0);
        assert.ok(room.maxGuests >= 1);
      }
    });

    it("generates exact room count clamped to template bounds", () => {
      const rooms5 = generateSeedRooms("tenant-demo", 5);
      assert.equal(rooms5.length, 5);
      assert.equal(rooms5[0]?.roomNumber, "101");
      assert.equal(rooms5[4]?.roomNumber, "105");

      const roomsClampedMax = generateSeedRooms("tenant-demo", 50);
      assert.equal(roomsClampedMax.length, 10);

      const roomsClampedMin = generateSeedRooms("tenant-demo", 0);
      assert.equal(roomsClampedMin.length, 1);
    });
  });

  describe("3. Trilingual Menu Items Generator", () => {
    it("contains authentic Sri Lankan culinary dishes with Sinhala & Tamil translations", () => {
      assert.ok(SEED_MENU_TEMPLATES.length >= 14);
      for (const item of SEED_MENU_TEMPLATES) {
        assert.ok(item.code.length > 0);
        assert.ok(item.titleEn.length > 0);
        assert.ok(item.titleSi.length > 0);
        assert.ok(item.titleTa.length > 0);
        assert.ok(item.basePriceLkr > 0);
        assert.ok(item.department === "KITCHEN" || item.department === "BAR");
      }
    });

    it("generates exact count of menu dishes requested", () => {
      const menu8 = generateSeedMenuItems("tenant-demo", 8);
      assert.equal(menu8.length, 8);
      assert.equal(menu8[0]?.code, "BF-01");
    });
  });

  describe("4. Pure Generators: Slug, Password, and QR Stands", () => {
    it("generates valid URL-safe tenant slugs", () => {
      const slug = generateTenantSlug("Ahangama Boutique Villa & Spa", "Southern");
      assert.equal(slug, "tenant-ahangama-boutique-villa-spa-sou");
    });

    it("generates temporary passwords meeting AWS Cognito complexity policies", () => {
      const password = generateTemporaryPassword();
      assert.ok(password.startsWith("Hms@Welcome"));
      assert.ok(password.endsWith("!"));
      assert.ok(/[A-Z]/.test(password));
      assert.ok(/[a-z]/.test(password));
      assert.ok(/[0-9]/.test(password));
      assert.ok(/[^A-Za-z0-9]/.test(password));
      assert.ok(password.length >= 8);
    });

    it("generates contactless QR stand URLs for each room", () => {
      const rooms = generateSeedRooms("tenant-tangalle", 3);
      const urls = generateQrStands("tenant-tangalle", rooms);
      assert.equal(urls.length, 3);
      assert.equal(urls[0], "/qr/tenant-tangalle/room-101");
      assert.equal(urls[1], "/qr/tenant-tangalle/room-102");
      assert.equal(urls[2], "/qr/tenant-tangalle/room-103");
    });
  });

  describe("5. Tenant Provision Form Validation", () => {
    const validRequest: NewTenantProvisionRequest = {
      hotelName: "Mirissa Surf Beach Villa",
      legalEntityName: "Mirissa Hospitality Partners (Pvt) Ltd",
      propertyType: "BOUTIQUE_VILLA",
      city: "Mirissa",
      province: "Southern",
      sltdaRegistrationNumber: "SLTDA/SQA/VIL/04198",
      ownerFullName: "Suresh Gunasekara",
      ownerEmail: "suresh@mirissavilla.lk",
      ownerPhone: "+94 77 345 6789",
      planTier: "PROFESSIONAL",
      seedRoomsCount: 10,
      seedMenuItemsCount: 25,
      seedTaxPresets: true,
      generateDemoQrStands: true,
    };

    it("validates a complete and correct provision payload without errors", () => {
      const result = validateTenantProvisionForm(validRequest);
      assert.equal(result.isValid, true);
      assert.equal(Object.keys(result.errors).length, 0);
    });

    it("flags error when hotel name is too short or missing", () => {
      const result = validateTenantProvisionForm({ ...validRequest, hotelName: "A" });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.hotelName);
    });

    it("flags error when city is empty", () => {
      const result = validateTenantProvisionForm({ ...validRequest, city: " " });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.city);
    });

    it("flags error when owner email format is invalid", () => {
      const result = validateTenantProvisionForm({ ...validRequest, ownerEmail: "not-an-email" });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.ownerEmail);
    });

    it("flags error when owner phone is missing or incomplete", () => {
      const result = validateTenantProvisionForm({ ...validRequest, ownerPhone: "123" });
      assert.equal(result.isValid, false);
      assert.ok(result.errors.ownerPhone);
    });
  });

  describe("6. Pure provisionNewHotelTenant Execution Engine", () => {
    it("successfully creates a full tenant dossier with rooms, dishes, and temporary password", () => {
      const request: NewTenantProvisionRequest = {
        hotelName: "Tangalle Ocean Villa",
        legalEntityName: "Tangalle Bay Tourism (Pvt) Ltd",
        propertyType: "BOUTIQUE_VILLA",
        city: "Tangalle",
        province: "Southern",
        sltdaRegistrationNumber: "SLTDA/SQA/VIL/09123",
        ownerFullName: "Rohan Fernando",
        ownerEmail: "rohan@tangallevilla.lk",
        ownerPhone: "+94 71 889 1234",
        planTier: "ENTERPRISE",
        seedRoomsCount: 8,
        seedMenuItemsCount: 12,
        seedTaxPresets: true,
        generateDemoQrStands: true,
      };

      const startTime = Date.now() - 500;
      const result = provisionNewHotelTenant(request, startTime);

      assert.equal(result.tenantId, "tenant-tangalle-ocean-villa-sou");
      assert.equal(result.hotelName, "Tangalle Ocean Villa");
      assert.equal(result.city, "Tangalle");
      assert.equal(result.seededRooms, 8);
      assert.equal(result.seededMenuItems, 12);
      assert.equal(result.taxPresetsConfigured, true);
      assert.equal(result.qrStandUrls.length, 8);
      assert.ok(result.temporaryPassword.length >= 8);
      assert.ok(result.provisionDurationMs >= 120);
    });
  });

  describe("7. React 19 SSR Static Markup Rendering", () => {
    it("renders null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(ProvisionTenantModal, {
          isOpen: false,
          onClose: () => {
            /* noop */
          },
        }),
      );
      assert.equal(html, "");
    });

    it("renders modal dialog with form fields, tax presets, and seeder controls when open", () => {
      const html = renderToStaticMarkup(
        React.createElement(ProvisionTenantModal, {
          isOpen: true,
          onClose: () => {
            /* noop */
          },
        }),
      );

      assert.ok(html.includes("1-Click New Hotel Tenant Provisioning"));
      assert.ok(html.includes("Hotel Trade Name"));
      assert.ok(html.includes("City Location"));
      assert.ok(html.includes("Owner Full Name"));
      assert.ok(html.includes("Instant Demo Data Seeder Options"));
      assert.ok(html.includes("10% SC, 1% TDL, 2.5% SSCL, 18% VAT"));
      assert.ok(html.includes("Provision Hotel Tenant Now"));
    });

    it("pre-populates form controls when initialData is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(ProvisionTenantModal, {
          isOpen: true,
          onClose: () => {
            /* noop */
          },
          initialData: {
            hotelName: "Bentota Lagoon Bungalow",
            city: "Bentota",
            ownerEmail: "admin@bentotalagoon.lk",
          },
        }),
      );

      assert.ok(html.includes("Bentota Lagoon Bungalow"));
      assert.ok(html.includes("Bentota"));
      assert.ok(html.includes("admin@bentotalagoon.lk"));
    });
  });
});
