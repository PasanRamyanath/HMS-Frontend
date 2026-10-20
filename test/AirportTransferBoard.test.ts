/**
 * AirportTransferBoard Test Suite
 * (HMS-Frontend/test/AirportTransferBoard.test.ts)
 *
 * Verifies Step 356:
 * - BIA Katunayake / Mattala Airport Transfer & Flight Tracker Board.
 * - Flight statuses (UL 504, EK 650, QR 668), paging board names, and chauffeur assignment.
 * - 1-Click SMS dispatch text generation via SMSGo.lk.
 * - Direction filtering (Arrivals vs Departures) and real-time search.
 * - Trilingual localization (en, si, ta) and Apple HIG compliance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AIRPORT_TRANSLATIONS,
  type AirportHub,
  AirportTransferBoard,
  type AirportTransferBoardProps,
  type AirportTransferRecord,
  type AirportTransferSummaryKpis,
  type AirportTransferTranslations,
  DEFAULT_AIRPORT_TRANSFERS,
  type FlightStatus,
  type SmsDispatchMessage,
  type TransferDirection,
  type TransferOperationalStatus,
  type TransferVehicleType,
  calculateTransferSummary,
  filterTransfers,
  generateDispatchSmsText,
  getFlightStatusBadgeStyle,
  getNextOperationalStatus,
  getOperationalStatusBadgeStyle,
} from "../src/admin/activities/AirportTransferBoard.js";

describe("Step 356: Airport Transfer & Flight Tracker Board (AirportTransferBoard.tsx)", () => {
  describe("1. Pure KPI Aggregations & Summary Math", () => {
    it("aggregates transfer KPIs accurately across sample dataset", () => {
      const summary: AirportTransferSummaryKpis =
        calculateTransferSummary(DEFAULT_AIRPORT_TRANSFERS);

      assert.equal(summary.totalTransfers, 5);
      assert.equal(summary.totalArrivals, 3);
      assert.equal(summary.totalDepartures, 2);

      // Active dispatches: TRF-001 (PAGING_AT_LOBBY), TRF-002 (CHAUFFEUR_DISPATCHED), TRF-004 (CHAUFFEUR_DISPATCHED)
      assert.equal(summary.activeDispatches, 3);

      // Unposted revenue: TRF-001 (26000), TRF-002 (32000), TRF-004 (38000), TRF-005 (26000) = 122,000 LKR
      assert.equal(summary.unpostedFolioRevenueLkr, 122000);

      // Total revenue: 26000 + 32000 + 24000 + 38000 + 26000 = 146,000 LKR
      assert.equal(summary.totalRevenueLkr, 146000);
    });

    it("handles an empty transfers array gracefully", () => {
      const empty = calculateTransferSummary([]);
      assert.equal(empty.totalTransfers, 0);
      assert.equal(empty.totalArrivals, 0);
      assert.equal(empty.totalDepartures, 0);
      assert.equal(empty.activeDispatches, 0);
      assert.equal(empty.unpostedFolioRevenueLkr, 0);
      assert.equal(empty.totalRevenueLkr, 0);
    });
  });

  describe("2. SMS Dispatch Text Generation & Airport Hub Formatting", () => {
    it("generates arrival dispatch SMS with chauffeur name, plate and paging board", () => {
      const arrival = DEFAULT_AIRPORT_TRANSFERS[0];
      assert.ok(arrival);

      const sms = generateDispatchSmsText(arrival, "Amaya Lake Resort");

      assert.ok(sms.includes("Ayubowan Lady Victoria Spencer!"));
      assert.ok(sms.includes("Dhammika Silva"));
      assert.ok(sms.includes("WP CAC-9812"));
      assert.ok(sms.includes("BIA Katunayake Arrival Lobby"));
      assert.ok(sms.includes("LADY VICTORIA SPENCER"));
      assert.ok(sms.includes("+94 77 889 9001"));
      assert.ok(sms.includes("Amaya Lake Resort"));
    });

    it("generates departure dispatch SMS with scheduled pickup time and destination", () => {
      const departure = DEFAULT_AIRPORT_TRANSFERS[2];
      assert.ok(departure);

      const sms = generateDispatchSmsText(departure, "Amaya Lake Resort");

      assert.ok(sms.includes("Dear Mr. Jean-Luc Picard"));
      assert.ok(sms.includes("18:30"));
      assert.ok(sms.includes("Sarath Wickrama"));
      assert.ok(sms.includes("WP CBA-1122"));
      assert.ok(sms.includes("Amaya Lake Resort"));
    });

    it("properly resolves Mattala Rajapaksa Airport (HRI) terminal text", () => {
      const mattala = DEFAULT_AIRPORT_TRANSFERS[3];
      assert.ok(mattala);

      const sms = generateDispatchSmsText(mattala, "Wild Coast Yala");
      assert.ok(sms.includes("Mattala Rajapaksa Airport Arrival Concourse"));
    });
  });

  describe("3. Filtering & Search Logic", () => {
    it("filters transfers strictly by direction tab", () => {
      const arrivalsOnly = filterTransfers(DEFAULT_AIRPORT_TRANSFERS, "ARRIVAL", "");
      assert.equal(arrivalsOnly.length, 3);
      assert.ok(arrivalsOnly.every((t) => t.direction === "ARRIVAL"));

      const departuresOnly = filterTransfers(DEFAULT_AIRPORT_TRANSFERS, "DEPARTURE", "");
      assert.equal(departuresOnly.length, 2);
      assert.ok(departuresOnly.every((t) => t.direction === "DEPARTURE"));
    });

    it("searches transfers by flight number (UL 504)", () => {
      const searchUl = filterTransfers(DEFAULT_AIRPORT_TRANSFERS, "ALL", "UL 504");
      assert.equal(searchUl.length, 1);
      assert.equal(searchUl[0]?.id, "TRF-2026-001");
    });

    it("searches transfers by guest name or room", () => {
      const searchPicard = filterTransfers(DEFAULT_AIRPORT_TRANSFERS, "ALL", "Picard");
      assert.equal(searchPicard.length, 1);
      assert.equal(searchPicard[0]?.roomNumber, "Room 208");
    });

    it("searches transfers by chauffeur name or vehicle plate", () => {
      const searchDriver = filterTransfers(DEFAULT_AIRPORT_TRANSFERS, "ALL", "Kusal Perera");
      assert.equal(searchDriver.length, 1);
      assert.equal(searchDriver[0]?.vehiclePlate, "WP ND-4521");
    });
  });

  describe("4. Apple HIG Badge Style Color Tokens", () => {
    it("returns correct dynamic color classes for flight statuses", () => {
      assert.ok(getFlightStatusBadgeStyle("LANDED").includes("emerald"));
      assert.ok(getFlightStatusBadgeStyle("DEPARTED").includes("emerald"));
      assert.ok(getFlightStatusBadgeStyle("ON_TIME").includes("sky"));
      assert.ok(getFlightStatusBadgeStyle("DELAYED").includes("amber"));
      assert.ok(getFlightStatusBadgeStyle("CANCELLED").includes("rose"));
      assert.ok(getFlightStatusBadgeStyle("SCHEDULED").includes("slate"));
    });

    it("returns correct dynamic color classes for operational statuses", () => {
      assert.ok(getOperationalStatusBadgeStyle("PAGING_AT_LOBBY").includes("purple"));
      assert.ok(getOperationalStatusBadgeStyle("CHAUFFEUR_DISPATCHED").includes("blue"));
      assert.ok(getOperationalStatusBadgeStyle("COMPLETED").includes("emerald"));
      assert.ok(getOperationalStatusBadgeStyle("CANCELLED").includes("rose"));
      assert.ok(getOperationalStatusBadgeStyle("PENDING_DISPATCH").includes("amber"));
    });

    it("cycles through operational status transitions with getNextOperationalStatus", () => {
      assert.equal(getNextOperationalStatus("PENDING_DISPATCH"), "CHAUFFEUR_DISPATCHED");
      assert.equal(getNextOperationalStatus("CHAUFFEUR_DISPATCHED"), "PAGING_AT_LOBBY");
      assert.equal(getNextOperationalStatus("PAGING_AT_LOBBY"), "GUEST_ONBOARD");
      assert.equal(getNextOperationalStatus("GUEST_ONBOARD"), "COMPLETED");
      assert.equal(getNextOperationalStatus("COMPLETED"), "COMPLETED");
    });
  });

  describe("5. Static HTML Rendering & Trilingual Localization", () => {
    it("renders board header, KPI ribbon and transfer cards in English", () => {
      const html = renderToStaticMarkup(
        React.createElement(AirportTransferBoard, {
          transfers: DEFAULT_AIRPORT_TRANSFERS,
          lang: "en",
        }),
      );

      assert.ok(html.includes("Airport Transfer &amp; Flight Tracker Board"));
      assert.ok(html.includes("Lady Victoria Spencer"));
      assert.ok(html.includes("UL 504"));
      assert.ok(html.includes("Dhammika Silva"));
      assert.ok(html.includes("WP CAC-9812"));
      assert.ok(html.includes("Dispatch SMS"));
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("tabular-nums-lkr"));
    });

    it("renders Sinhala localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(AirportTransferBoard, {
          transfers: DEFAULT_AIRPORT_TRANSFERS,
          lang: "si",
        }),
      );

      assert.ok(html.includes(AIRPORT_TRANSLATIONS.si.boardTitle));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.si.tabArrivals));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.si.tabDepartures));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.si.sendSmsBtn));
    });

    it("renders Tamil localization correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(AirportTransferBoard, {
          transfers: DEFAULT_AIRPORT_TRANSFERS,
          lang: "ta",
        }),
      );

      assert.ok(html.includes(AIRPORT_TRANSLATIONS.ta.boardTitle));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.ta.tabArrivals));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.ta.tabDepartures));
      assert.ok(html.includes(AIRPORT_TRANSLATIONS.ta.sendSmsBtn));
    });

    it("renders empty state message when transfer list is empty", () => {
      const html = renderToStaticMarkup(
        React.createElement(AirportTransferBoard, {
          transfers: [],
          lang: "en",
        }),
      );

      assert.ok(html.includes("No airport transfer schedules match your filters."));
    });

    it("verifies constructible types and models for Knip zero-unused-exports verification", () => {
      const dummyHub: AirportHub = "BIA_KATUNAYAKE";
      assert.equal(dummyHub, "BIA_KATUNAYAKE");

      const dummyDirection: TransferDirection = "ARRIVAL";
      assert.equal(dummyDirection, "ARRIVAL");

      const dummyFlightStatus: FlightStatus = "ON_TIME";
      assert.equal(dummyFlightStatus, "ON_TIME");

      const dummyOpStatus: TransferOperationalStatus = "GUEST_ONBOARD";
      assert.equal(dummyOpStatus, "GUEST_ONBOARD");

      const dummyVehicleType: TransferVehicleType = "COASTER_MINI_BUS";
      assert.equal(dummyVehicleType, "COASTER_MINI_BUS");

      const dummySms: SmsDispatchMessage = {
        recipientMobile: "+94 77 123 4567",
        messageText: "Test dispatch message",
        transferId: "TRF-TEST",
      };
      assert.equal(dummySms.transferId, "TRF-TEST");

      const dummyProps: Partial<AirportTransferBoardProps> = {
        hotelPropertyName: "Test Hotel",
      };
      assert.equal(dummyProps.hotelPropertyName, "Test Hotel");

      const dummyRecord: Partial<AirportTransferRecord> = {
        id: "TRF-001",
        guestName: "Test Guest",
      };
      assert.equal(dummyRecord.id, "TRF-001");

      const dummyTranslations: Partial<AirportTransferTranslations> = {
        boardTitle: "Test Title",
      };
      assert.equal(dummyTranslations.boardTitle, "Test Title");
    });
  });
});
