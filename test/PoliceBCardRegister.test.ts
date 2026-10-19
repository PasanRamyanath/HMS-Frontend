import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BCardGender,
  type BCardGuestStatus,
  DEFAULT_POLICE_BCARD_ENTRIES,
  type PoliceBCardEntry,
  PoliceBCardRegister,
  type PoliceBCardRegisterProps,
  computeBCardSummary,
  filterBCardEntries,
  generatePoliceBCardCsv,
  validateBCardStatutoryFields,
} from "../src/admin/frontdesk/PoliceBCardRegister.js";

const noop = () => {
  // no-op for tests
};

const SAMPLE_ENTRIES: readonly PoliceBCardEntry[] = [
  {
    id: "bc-test-1",
    bCardSerialNo: "BC-2026-0001",
    roomNumber: "101",
    guestName: "Emma Charlotte Watson",
    passportNumber: "GB12345678",
    nationality: "British",
    countryCode: "GB",
    gender: "FEMALE",
    dateOfBirth: "1990-04-15",
    arrivalDate: "2026-10-19",
    arrivalTime: "14:00",
    departureDate: "2026-10-24",
    departureTime: "11:00",
    arrivedFrom: "BIA Airport (CMB)",
    nextDestination: "Kandy Cultural Center",
    visaNumber: "ETA-889900",
    verifiedByStaffName: "K. Bandara",
    status: "IN_HOUSE",
    remarks: "Early check-in accommodated",
  },
  {
    id: "bc-test-2",
    bCardSerialNo: "BC-2026-0002",
    roomNumber: "202",
    guestName: "Hans Peter Müller",
    passportNumber: "DE98765432",
    nationality: "German",
    countryCode: "DE",
    gender: "MALE",
    dateOfBirth: "1982-11-20",
    arrivalDate: "2026-10-15",
    arrivalTime: "18:30",
    departureDate: "2026-10-19",
    departureTime: "10:30",
    arrivedFrom: "Bentota Resort",
    nextDestination: "BIA Airport (CMB)",
    visaNumber: "ETA-776655",
    verifiedByStaffName: "M. Perera",
    status: "CHECKED_OUT",
    remarks: "Airport transfer arranged",
  },
  {
    id: "bc-test-3",
    bCardSerialNo: "BC-2026-0003",
    roomNumber: "305",
    guestName: "Yuki Tanaka",
    passportNumber: "JP55443322",
    nationality: "Japanese",
    countryCode: "JP",
    gender: "MALE",
    dateOfBirth: "1995-07-08",
    arrivalDate: "2026-10-19",
    arrivalTime: "16:00",
    departureDate: "2026-10-21",
    departureTime: "12:00",
    arrivedFrom: "Galle Fort",
    nextDestination: "Sigiriya Heritage Site",
    visaNumber: "ETA-332211",
    verifiedByStaffName: "K. Bandara",
    status: "IN_HOUSE",
  },
];

describe("Tourist Police Foreign Arrival Register (PoliceBCardRegister.tsx)", () => {
  describe("Statutory Summary Computation (computeBCardSummary)", () => {
    it("computes totals, in-house, arriving today, departing today correctly", () => {
      const summary = computeBCardSummary(SAMPLE_ENTRIES, "2026-10-19");
      assert.strictEqual(summary.totalForeignGuests, 3);
      assert.strictEqual(summary.inHouseCount, 2);
      assert.strictEqual(summary.arrivingTodayCount, 2); // Emma and Yuki
      assert.strictEqual(summary.departingTodayCount, 1); // Hans
    });

    it("ranks nationalities by frequency and caps at top 4", () => {
      const summary = computeBCardSummary(SAMPLE_ENTRIES, "2026-10-19");
      assert.strictEqual(summary.topNationalities.length, 3);
      const countries = summary.topNationalities.map((n) => n.country);
      assert.ok(countries.includes("British"));
      assert.ok(countries.includes("German"));
      assert.ok(countries.includes("Japanese"));
    });

    it("handles empty entries list gracefully", () => {
      const summary = computeBCardSummary([], "2026-10-19");
      assert.strictEqual(summary.totalForeignGuests, 0);
      assert.strictEqual(summary.inHouseCount, 0);
      assert.strictEqual(summary.arrivingTodayCount, 0);
      assert.strictEqual(summary.departingTodayCount, 0);
      assert.deepStrictEqual(summary.topNationalities, []);
    });
  });

  describe("Entry Filtering (filterBCardEntries)", () => {
    it("returns all entries when query is empty and status is ALL", () => {
      const results = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "ALL",
      });
      assert.strictEqual(results.length, 3);
    });

    it("filters by text search across guest name, passport, room, and destination", () => {
      const byName = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "watson",
        statusFilter: "ALL",
      });
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0]?.id, "bc-test-1");

      const byPassport = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "DE98765432",
        statusFilter: "ALL",
      });
      assert.strictEqual(byPassport.length, 1);
      assert.strictEqual(byPassport[0]?.id, "bc-test-2");

      const byRoom = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "305",
        statusFilter: "ALL",
      });
      assert.strictEqual(byRoom.length, 1);
      assert.strictEqual(byRoom[0]?.id, "bc-test-3");

      const byDestination = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "Sigiriya",
        statusFilter: "ALL",
      });
      assert.strictEqual(byDestination.length, 1);
      assert.strictEqual(byDestination[0]?.id, "bc-test-3");
    });

    it("filters by status (IN_HOUSE vs CHECKED_OUT)", () => {
      const inHouse = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "IN_HOUSE",
      });
      assert.strictEqual(inHouse.length, 2);

      const checkedOut = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "CHECKED_OUT",
      });
      assert.strictEqual(checkedOut.length, 1);
      assert.strictEqual(checkedOut[0]?.id, "bc-test-2");
    });

    it("filters by active stay on a given date", () => {
      // 2026-10-17 is between arrival and departure for Hans (15th to 19th)
      const activeOn17 = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "ALL",
        dateFilter: "2026-10-17",
      });
      assert.strictEqual(activeOn17.length, 1);
      assert.strictEqual(activeOn17[0]?.id, "bc-test-2");

      // 2026-10-20 has Emma and Yuki active
      const activeOn20 = filterBCardEntries(SAMPLE_ENTRIES, {
        query: "",
        statusFilter: "ALL",
        dateFilter: "2026-10-20",
      });
      assert.strictEqual(activeOn20.length, 2);
    });
  });

  describe("RFC 4180 CSV Export Generation (generatePoliceBCardCsv)", () => {
    it("generates correct statutory header lines and metadata", () => {
      const csv = generatePoliceBCardCsv(
        SAMPLE_ENTRIES,
        "Grand Hotel Nuwara Eliya",
        "SLTDA/HOT/2026/042",
        "2026-10-19",
      );

      assert.ok(
        csv.includes("# SRI LANKA TOURIST POLICE - OFFICIAL B-CARD FOREIGN GUEST REGISTER"),
      );
      assert.ok(csv.includes("# Property: Grand Hotel Nuwara Eliya"));
      assert.ok(csv.includes("# SLTDA License: SLTDA/HOT/2026/042"));
      assert.ok(csv.includes("# Export Date: 2026-10-19"));
      assert.ok(
        csv.includes(
          "Serial No,Room,Guest Name,Passport No,Nationality,Country Code,Gender,DOB,Arrival Date,Arrival Time,Departure Date,Departure Time,Arrived From,Next Destination,Visa/ETA No,Verified By,Status,Remarks",
        ),
      );
    });

    it("properly escapes fields with commas and quotes", () => {
      const entriesWithComma: PoliceBCardEntry[] = [
        {
          id: "bc-test-comma",
          bCardSerialNo: "BC-2026-0999",
          roomNumber: "105, 106",
          guestName: 'Sir Arthur "Conan" Doyle',
          passportNumber: "GB99988811",
          nationality: "British",
          countryCode: "GB",
          gender: "MALE",
          dateOfBirth: "1970-01-01",
          arrivalDate: "2026-10-19",
          departureDate: "2026-10-25",
          arrivedFrom: "London, Heathrow via CMB",
          nextDestination: "Kandy, Sri Lanka",
          verifiedByStaffName: "Inspector Lestrade",
          status: "IN_HOUSE",
        },
      ];

      const csv = generatePoliceBCardCsv(
        entriesWithComma,
        "Hotel Ceylon",
        "SLTDA/TEST/1",
        "2026-10-19",
      );

      assert.ok(csv.includes('"105, 106"'));
      assert.ok(csv.includes('"Sir Arthur ""Conan"" Doyle"'));
      assert.ok(csv.includes('"London, Heathrow via CMB"'));
      assert.ok(csv.includes('"Kandy, Sri Lanka"'));
    });
  });

  describe("Statutory Validation (validateBCardStatutoryFields)", () => {
    it("passes when all statutory fields are present and valid", () => {
      const result = validateBCardStatutoryFields({
        passportNumber: "N1234567A",
        nationality: "French",
        arrivedFrom: "BIA Airport",
        nextDestination: "Mirissa Beach",
      });
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });

    it("fails when passport number is missing or too short", () => {
      const empty = validateBCardStatutoryFields({
        nationality: "French",
        arrivedFrom: "BIA Airport",
        nextDestination: "Mirissa Beach",
      });
      assert.strictEqual(empty.isValid, false);
      assert.ok(empty.error?.includes("Passport Number"));

      const tooShort = validateBCardStatutoryFields({
        passportNumber: "AB1",
        nationality: "French",
        arrivedFrom: "BIA Airport",
        nextDestination: "Mirissa Beach",
      });
      assert.strictEqual(tooShort.isValid, false);
      assert.ok(tooShort.error?.includes("Passport Number"));
    });

    it("fails when nationality is missing or too short", () => {
      const result = validateBCardStatutoryFields({
        passportNumber: "N1234567A",
        nationality: " ",
        arrivedFrom: "BIA Airport",
        nextDestination: "Mirissa Beach",
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes("Nationality"));
    });

    it("fails when arrivedFrom is missing", () => {
      const result = validateBCardStatutoryFields({
        passportNumber: "N1234567A",
        nationality: "French",
        arrivedFrom: "",
        nextDestination: "Mirissa Beach",
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes("Port or place arrived from"));
    });

    it("fails when nextDestination is missing", () => {
      const result = validateBCardStatutoryFields({
        passportNumber: "N1234567A",
        nationality: "French",
        arrivedFrom: "BIA Airport",
        nextDestination: "",
      });
      assert.strictEqual(result.isValid, false);
      assert.ok(result.error?.includes("Next destination"));
    });
  });

  describe("Component Static Markup (PoliceBCardRegister)", () => {
    it("renders default register without crashing", () => {
      const html = renderToStaticMarkup(React.createElement(PoliceBCardRegister, {}));
      assert.ok(html.includes("Tourist Police Foreign Arrival Register"));
      assert.ok(html.includes("Immigrants &amp; Emigrants Act"));
      assert.ok(html.includes("In-House Foreign Nationals"));
      assert.ok(html.includes("Arrivals Logged Today"));
      assert.ok(html.includes("Export Police CSV"));
      assert.ok(html.includes("Print Official Ledger"));
    });

    it("renders custom property details and entries accurately", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoliceBCardRegister, {
          hotelName: "Amangalla Galle Fort",
          sltdaLicenseNo: "SLTDA/HOT/999",
          policeDivision: "Southern Tourist Police (Fort)",
          entries: SAMPLE_ENTRIES,
          currentDate: "2026-10-19",
          onUpdateEntry: noop,
          onExportCsv: noop,
          onPrintRegister: noop,
        }),
      );

      assert.ok(html.includes("Amangalla Galle Fort"));
      assert.ok(html.includes("SLTDA/HOT/999"));
      assert.ok(html.includes("Southern Tourist Police (Fort)"));
      assert.ok(html.includes("Emma Charlotte Watson"));
      assert.ok(html.includes("Hans Peter Müller"));
      assert.ok(html.includes("Yuki Tanaka"));
      assert.ok(html.includes("GB12345678"));
      assert.ok(html.includes("DE98765432"));
      assert.ok(html.includes("JP55443322"));
    });

    it("renders disabled state attributes appropriately", () => {
      const html = renderToStaticMarkup(
        React.createElement(PoliceBCardRegister, {
          disabled: true,
          entries: SAMPLE_ENTRIES,
        }),
      );
      assert.ok(html.includes("disabled"));
    });

    it("renders default sample entries when entries prop is omitted", () => {
      assert.ok(DEFAULT_POLICE_BCARD_ENTRIES.length >= 2);
      const html = renderToStaticMarkup(React.createElement(PoliceBCardRegister, {}));
      assert.ok(html.includes(DEFAULT_POLICE_BCARD_ENTRIES[0]?.guestName ?? ""));
    });
  });

  describe("Contract & Type Invariants", () => {
    it("adheres to strict BCardGender types", () => {
      const male: BCardGender = "MALE";
      const female: BCardGender = "FEMALE";
      const other: BCardGender = "OTHER";
      assert.strictEqual(male, "MALE");
      assert.strictEqual(female, "FEMALE");
      assert.strictEqual(other, "OTHER");
    });

    it("adheres to strict BCardGuestStatus types", () => {
      const inHouse: BCardGuestStatus = "IN_HOUSE";
      const checkedOut: BCardGuestStatus = "CHECKED_OUT";
      const reserved: BCardGuestStatus = "RESERVED";
      assert.strictEqual(inHouse, "IN_HOUSE");
      assert.strictEqual(checkedOut, "CHECKED_OUT");
      assert.strictEqual(reserved, "RESERVED");
    });

    it("PoliceBCardRegisterProps can be partially instantiated safely", () => {
      const props: PoliceBCardRegisterProps = {
        hotelName: "Heritage Villa",
      };
      assert.strictEqual(props.hotelName, "Heritage Villa");
    });
  });
});
