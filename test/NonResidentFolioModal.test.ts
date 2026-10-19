import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BillingType,
  DAY_PASS_PACKAGES,
  DEFAULT_DESIGNATED_AREAS,
  type DayGuestPassType,
  type DayPassPackageConfig,
  type DepositPaymentMethod,
  type IdType,
  NonResidentFolioModal,
  type NonResidentFolioModalProps,
  type NonResidentFolioPayload,
  calculatePackageTotal,
  generateNonResidentFolioId,
  generatePassCode,
  generateQrLocationId,
  normalizeSriLankanPhone,
  roundLkr,
  validateIdentification,
  validateNonResidentFolioInput,
} from "../src/admin/folios/NonResidentFolioModal.js";

describe("Step 218: NonResidentFolioModal & Day Guest Folio Engine", () => {
  describe("1. Pure Helpers & Calculations", () => {
    it("rounds numbers half-up to exactly 2 decimal cents", () => {
      assert.strictEqual(roundLkr(Number.NaN), 0);
      assert.strictEqual(roundLkr(Number.POSITIVE_INFINITY), 0);
      assert.strictEqual(roundLkr(7500.254), 7500.25);
      assert.strictEqual(roundLkr(7500.255), 7500.26);
    });

    it("calculates package totals based on adults and children counts", () => {
      // 2 adults (7500) + 1 child (3500) = 15000 + 3500 = 18500
      const total = calculatePackageTotal(2, 1, 7500, 3500);
      assert.strictEqual(total, 18500);

      // Edge cases: negative or non-integer
      assert.strictEqual(calculatePackageTotal(-1, 0, 7500, 3500), 0);
      assert.strictEqual(calculatePackageTotal(1.8, 2.2, 5000, 2000), 9000);
    });

    it("normalizes Sri Lankan phone numbers with +94 country code", () => {
      assert.strictEqual(normalizeSriLankanPhone("0771234567"), "+94771234567");
      assert.strictEqual(normalizeSriLankanPhone("94771234567"), "+94771234567");
      assert.strictEqual(normalizeSriLankanPhone("+94771234567"), "+94771234567");
      assert.strictEqual(normalizeSriLankanPhone("771234567"), "+94771234567");
    });

    it("validates Sri Lankan NIC and passport formats", () => {
      // Valid old NIC
      assert.strictEqual(validateIdentification("NIC", "912345678V").isValid, true);
      assert.strictEqual(validateIdentification("NIC", "912345678x").isValid, true);
      // Valid new NIC
      assert.strictEqual(validateIdentification("NIC", "199123456789").isValid, true);
      // Invalid NIC
      assert.strictEqual(validateIdentification("NIC", "1234").isValid, false);
      assert.strictEqual(validateIdentification("NIC", "912345678").isValid, false);

      // Passport
      assert.strictEqual(validateIdentification("PASSPORT", "N1234567").isValid, true);
      assert.strictEqual(validateIdentification("PASSPORT", "AB12").isValid, false);

      // Driving License
      assert.strictEqual(validateIdentification("DRIVING_LICENSE", "B1234567").isValid, true);
      assert.strictEqual(validateIdentification("DRIVING_LICENSE", "").isValid, false);
    });

    it("generates sequential non-resident folio identifiers and pass codes", () => {
      const folioId = generateNonResidentFolioId(2026, 42);
      assert.strictEqual(folioId, "FOLIO-NR-2026-00042");

      const poolPass = generatePassCode("POOL_DAY_PASS", 5);
      assert.strictEqual(poolPass, "DAY-POOL-005");

      const spaPass = generatePassCode("AYURVEDA_SPA_WALK_IN", 12);
      assert.strictEqual(spaPass, "DAY-SPA-012");
    });

    it("generates QR location identifier cleanly", () => {
      const locId = generateQrLocationId("Pool Cabana 04", "DAY-POOL-042");
      assert.strictEqual(locId, "LOC-POOL-CABANA-04-DAY-POOL-042");
    });
  });

  describe("2. Statutory Input & Folio Validation", () => {
    it("rejects guest name shorter than 3 characters", () => {
      const res = validateNonResidentFolioInput(
        "Al",
        "NIC",
        "199012345678",
        "0771234567",
        1,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        5000,
        "1234",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("at least 3 characters"));
    });

    it("rejects invalid identification numbers", () => {
      const res = validateNonResidentFolioInput(
        "Kamal Perera",
        "NIC",
        "invalid-nic",
        "0771234567",
        1,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        5000,
        "1234",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("NIC"));
    });

    it("rejects invalid phone numbers", () => {
      const res = validateNonResidentFolioInput(
        "Kamal Perera",
        "NIC",
        "199012345678",
        "123",
        1,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        5000,
        "1234",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("phone"));
    });

    it("rejects zero adults", () => {
      const res = validateNonResidentFolioInput(
        "Kamal Perera",
        "NIC",
        "199012345678",
        "0771234567",
        0,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        5000,
        "1234",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("adult"));
    });

    it("rejects prepaid deposit of 0 when billingType is PREPAID_DEPOSIT", () => {
      const res = validateNonResidentFolioInput(
        "Kamal Perera",
        "NIC",
        "199012345678",
        "0771234567",
        2,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        0,
        "1234",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("Prepaid deposit amount"));
    });

    it("rejects missing 4-digit PIN when requirePin is true", () => {
      const res = validateNonResidentFolioInput(
        "Kamal Perera",
        "NIC",
        "199012345678",
        "0771234567",
        2,
        "Pool Cabana 01",
        "PREPAID_DEPOSIT",
        5000,
        "12",
        true,
      );
      assert.strictEqual(res.isValid, false);
      assert.ok(res.errorMessage?.includes("4-digit Guest PIN"));
    });

    it("accepts valid day guest folio inputs", () => {
      const res = validateNonResidentFolioInput(
        "Ruwan Jayawardena",
        "NIC",
        "199012345678",
        "0771234567",
        2,
        "Pool Cabana 04",
        "PREPAID_DEPOSIT",
        10000,
        "4321",
        true,
      );
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.errorMessage, undefined);
    });
  });

  describe("3. Static Markup & Type Verification", () => {
    it("renders nothing when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(NonResidentFolioModal, {
          isOpen: false,
          onClose: () => undefined,
          onOpenFolio: async () => undefined,
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders open modal with day pass packages, inputs, and summary card", () => {
      const html = renderToStaticMarkup(
        React.createElement(NonResidentFolioModal, {
          isOpen: true,
          onClose: () => undefined,
          onOpenFolio: async () => undefined,
        }),
      );

      // Title
      assert.ok(html.includes("Open Non-Resident Day Guest Folio"));
      // Packages
      for (const p of DAY_PASS_PACKAGES) {
        assert.ok(html.includes(p.title.replace(/&/g, "&amp;")));
        assert.ok(html.includes(p.icon));
      }
      // Designated areas
      for (const a of DEFAULT_DESIGNATED_AREAS.slice(0, 3)) {
        assert.ok(html.includes(a));
      }
      // Day folio summary
      assert.ok(html.includes("Day Folio Summary"));
      assert.ok(html.includes("Prepaid Deposit"));
      assert.ok(html.includes("QR Spend Limit"));
    });

    it("verifies constructible types and package configurations", () => {
      const pkg: DayPassPackageConfig | undefined = DAY_PASS_PACKAGES[0];
      assert.ok(pkg);
      assert.ok(pkg.inclusions.length > 0);
      assert.strictEqual(pkg.passType, "POOL_DAY_PASS");

      const passType: DayGuestPassType = "BUFFET_WALK_IN";
      const idType: IdType = "PASSPORT";
      const bType: BillingType = "CREDIT_CARD_TAB_HOLD";
      const depMethod: DepositPaymentMethod = "PAYHERE_CARD";

      const payload: NonResidentFolioPayload = {
        folioId: "FOLIO-NR-2026-00001",
        passCode: "DAY-POOL-001",
        passType,
        guestFullName: "Elena Rostova",
        idType,
        idNumber: "N7894561",
        phone94: "+94771234567",
        adultsCount: 2,
        childrenCount: 1,
        designatedArea: "Pool Cabana 01",
        qrLocationId: "LOC-CABANA-01",
        billingType: bType,
        passPackagePriceLkr: 15000,
        prepaidDepositLkr: 10000,
        depositPaymentMethod: depMethod,
        spendingLimitLkr: 30000,
        requirePinForOrdering: true,
        guestPin: "9988",
        validDate: "2026-10-19",
        expiresAt: "2026-10-19T22:00:00Z",
        createdByUserId: "USR-01",
        createdAt: "2026-10-19T10:00:00Z",
      };

      const props: NonResidentFolioModalProps = {
        isOpen: true,
        onClose: () => undefined,
        onOpenFolio: () => undefined,
      };

      assert.ok(payload.folioId);
      assert.ok(props.isOpen);
    });
  });
});
