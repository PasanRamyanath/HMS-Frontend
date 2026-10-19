import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type GuestGender,
  type GuestIdentityData,
  GuestIdentityField,
  type GuestIdentityFieldProps,
  type IdentityDocumentType,
  POPULAR_TOURIST_COUNTRIES,
  type ParsedNicResult,
  type ResidencyTier,
  computeAgeFromDob,
  dayOfYearToMonthDay,
  parseSriLankaNic,
} from "../src/admin/frontdesk/GuestIdentityField.js";

const noop = () => undefined;

describe("Instant Sri Lankan NIC & Foreign Passport Scanner/Field (GuestIdentityField.tsx)", () => {
  describe("DRP 366-Day Calendar Math (dayOfYearToMonthDay)", () => {
    it("converts day-of-year to month and day correctly", () => {
      // Day 1 -> Jan 1
      assert.deepStrictEqual(dayOfYearToMonthDay(1), { month: 1, day: 1 });
      // Day 31 -> Jan 31
      assert.deepStrictEqual(dayOfYearToMonthDay(31), { month: 1, day: 31 });
      // Day 32 -> Feb 1
      assert.deepStrictEqual(dayOfYearToMonthDay(32), { month: 2, day: 1 });
      // Day 60 -> Feb 29 (DRP leap calendar basis)
      assert.deepStrictEqual(dayOfYearToMonthDay(60), { month: 2, day: 29 });
      // Day 61 -> Mar 1
      assert.deepStrictEqual(dayOfYearToMonthDay(61), { month: 3, day: 1 });
      // Day 366 -> Dec 31
      assert.deepStrictEqual(dayOfYearToMonthDay(366), { month: 12, day: 31 });
    });
  });

  describe("Sri Lankan NIC Parsing (parseSriLankaNic)", () => {
    it("parses valid Old 9-digit + V Male NIC (853401234V)", () => {
      const parsed = parseSriLankaNic("853401234V");
      assert.ok(parsed);
      assert.strictEqual(parsed.format, "OLD_9_DIGIT");
      assert.strictEqual(parsed.birthYear, 1985);
      assert.strictEqual(parsed.gender, "MALE");
      assert.strictEqual(parsed.dayOfYear, 340);
      assert.strictEqual(parsed.isVoterEligible, true);
      assert.strictEqual(parsed.residencyTier, "RESIDENT_LKR");
      assert.strictEqual(parsed.canonicalNic, "853401234V");
      assert.match(parsed.dateOfBirthIso, /^1985-\d{2}-\d{2}$/);
    });

    it("parses valid Old 9-digit + X Female NIC (926234567X)", () => {
      // 623 - 500 = day 123 of year
      const parsed = parseSriLankaNic("926234567X");
      assert.ok(parsed);
      assert.strictEqual(parsed.format, "OLD_9_DIGIT");
      assert.strictEqual(parsed.birthYear, 1992);
      assert.strictEqual(parsed.gender, "FEMALE");
      assert.strictEqual(parsed.dayOfYear, 123);
      assert.strictEqual(parsed.isVoterEligible, false); // 'X' is non-voter
      assert.strictEqual(parsed.residencyTier, "RESIDENT_LKR");
    });

    it("parses valid New 12-digit Male NIC (198534012345)", () => {
      const parsed = parseSriLankaNic("198534012345");
      assert.ok(parsed);
      assert.strictEqual(parsed.format, "NEW_12_DIGIT");
      assert.strictEqual(parsed.birthYear, 1985);
      assert.strictEqual(parsed.gender, "MALE");
      assert.strictEqual(parsed.dayOfYear, 340);
      assert.strictEqual(parsed.isVoterEligible, true);
      assert.strictEqual(parsed.residencyTier, "RESIDENT_LKR");
    });

    it("parses valid New 12-digit Female NIC (200162312345)", () => {
      const parsed = parseSriLankaNic("200162312345");
      assert.ok(parsed);
      assert.strictEqual(parsed.format, "NEW_12_DIGIT");
      assert.strictEqual(parsed.birthYear, 2001);
      assert.strictEqual(parsed.gender, "FEMALE");
      assert.strictEqual(parsed.dayOfYear, 123);
      assert.strictEqual(parsed.residencyTier, "RESIDENT_LKR");
    });

    it("returns null for invalid day codes or malformed formats", () => {
      // Day code 000 is invalid
      assert.strictEqual(parseSriLankaNic("850001234V"), null);
      // Day code 500 is invalid (500 - 500 = 0)
      assert.strictEqual(parseSriLankaNic("855001234V"), null);
      // Day code > 866 (e.g. 999 - 500 = 499 > 366)
      assert.strictEqual(parseSriLankaNic("859991234V"), null);
      // Malformed inputs
      assert.strictEqual(parseSriLankaNic(""), null);
      assert.strictEqual(parseSriLankaNic("123"), null);
      assert.strictEqual(parseSriLankaNic("not-a-nic"), null);
    });
  });

  describe("Age Derivation (computeAgeFromDob)", () => {
    it("computes accurate non-negative age from ISO birth date", () => {
      const age = computeAgeFromDob("1990-05-15");
      assert.ok(age >= 34);
      assert.strictEqual(computeAgeFromDob("invalid-date"), 0);
    });
  });

  describe("Type Definitions & Tourist Countries Catalog", () => {
    it("verifies POPULAR_TOURIST_COUNTRIES contains Sri Lanka and key inbound origins", () => {
      const codes = POPULAR_TOURIST_COUNTRIES.map((c) => c.code);
      assert.ok(codes.includes("LK"));
      assert.ok(codes.includes("GB"));
      assert.ok(codes.includes("DE"));
      assert.ok(codes.includes("FR"));
      assert.ok(codes.includes("AU"));
      assert.ok(codes.includes("IN"));
      assert.ok(codes.includes("RU"));
    });

    it("constructs strongly typed GuestIdentityData and Props", () => {
      const docType: IdentityDocumentType = "SRI_LANKAN_NIC";
      const gender: GuestGender = "MALE";
      const tier: ResidencyTier = "RESIDENT_LKR";

      const data: GuestIdentityData = {
        documentType: docType,
        documentNumber: "853401234V",
        canonicalNumber: "853401234V",
        dateOfBirth: "1985-12-05",
        gender,
        nationality: "Sri Lankan",
        countryCode: "LK",
        residencyTier: tier,
        isVoterEligible: true,
        isValid: true,
      };

      assert.strictEqual(data.documentType, "SRI_LANKAN_NIC");
      assert.strictEqual(data.residencyTier, "RESIDENT_LKR");

      const props: GuestIdentityFieldProps = {
        value: data,
        onChange: noop,
        onBlur: noop,
        disabled: false,
      };
      assert.strictEqual(props.disabled, false);

      const parsedSample: ParsedNicResult = {
        canonicalNic: "853401234V",
        format: "OLD_9_DIGIT",
        birthYear: 1985,
        birthMonth: 12,
        birthDay: 5,
        dateOfBirthIso: "1985-12-05",
        gender: "MALE",
        dayOfYear: 340,
        isVoterEligible: true,
        residencyTier: "RESIDENT_LKR",
      };
      assert.strictEqual(parsedSample.birthYear, 1985);
    });
  });

  describe("Component Static Markup & DOM Structure", () => {
    it("renders default Sri Lankan NIC mode input field", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestIdentityField, {
          onChange: noop,
          onBlur: noop,
        }),
      );

      assert.ok(html.includes("Guest Identification &amp; Demographics"));
      assert.ok(html.includes("Sri Lankan NIC"));
      assert.ok(html.includes("Foreign Passport"));
      assert.ok(html.includes("National Identity Card (NIC)"));
      assert.ok(html.includes("853401234V or 198534012345"));
    });

    it("renders auto-detected DRP demographics card when valid NIC is provided in value", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestIdentityField, {
          value: {
            documentType: "SRI_LANKAN_NIC",
            documentNumber: "853401234V",
            canonicalNumber: "853401234V",
            dateOfBirth: "1985-12-05",
            gender: "MALE",
            nationality: "Sri Lankan",
            countryCode: "LK",
            residencyTier: "RESIDENT_LKR",
            isValid: true,
          },
          onChange: noop,
          onBlur: noop,
        }),
      );

      assert.ok(html.includes("Auto-Detected Demographics (DRP Registry)"));
      assert.ok(html.includes("Old 10-char Format"));
      assert.ok(html.includes("1985-12-05"));
      assert.ok(html.includes("Male"));
      assert.ok(html.includes("Sri Lankan (LK)"));
      assert.ok(html.includes("Resident LKR"));
    });

    it("renders Foreign Passport fields when documentType is FOREIGN_PASSPORT", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestIdentityField, {
          value: {
            documentType: "FOREIGN_PASSPORT",
            documentNumber: "PA9876543",
            canonicalNumber: "PA9876543",
            nationality: "United Kingdom",
            countryCode: "GB",
            residencyTier: "FOREIGN_USD",
            passportExpiryDate: "2030-05-20",
            visaExpiryDate: "2026-11-20",
            isValid: true,
          },
          onChange: noop,
          onBlur: noop,
        }),
      );

      assert.ok(html.includes("Tourist Police B-Card &amp; Immigration Details"));
      assert.ok(html.includes("Foreign Tourist USD Tier"));
      assert.ok(html.includes("Issuing Country"));
      assert.ok(html.includes("Passport Expiry Date"));
      assert.ok(html.includes("Sri Lankan Visa Expiry (ETA)"));
      assert.ok(html.includes("United Kingdom (GB)"));
    });

    it("renders disabled state on controls when disabled prop is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestIdentityField, {
          disabled: true,
          onChange: noop,
          onBlur: noop,
        }),
      );

      assert.ok(html.includes("disabled"));
    });
  });
});
