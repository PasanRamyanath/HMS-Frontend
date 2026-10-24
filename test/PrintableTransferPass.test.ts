import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_TRANSFER_PASS,
  type PassDisplayMode,
  type PassTranslations,
  PrintableTransferPass,
  type PrintableTransferPassProps,
  type TransferPassData,
  getPassTranslations,
} from "../src/admin/activities/PrintableTransferPass.js";

describe("Step 361: Printable Airport Paging Board & Excursion Gate Pass (PrintableTransferPass.tsx)", () => {
  describe("1. Pure Seed Integrity & Trilingual Localization", () => {
    it("provides complete default transfer pass data", () => {
      assert.strictEqual(DEFAULT_TRANSFER_PASS.guestFullName, "ANANYA SHARMA");
      assert.strictEqual(DEFAULT_TRANSFER_PASS.flightNumber, "UL 504");
      assert.strictEqual(DEFAULT_TRANSFER_PASS.chauffeurName, "Chaminda Silva");
      assert.strictEqual(DEFAULT_TRANSFER_PASS.vehiclePlateNumber, "WP CAC-7890");
      assert.ok(DEFAULT_TRANSFER_PASS.packedBreakfastBoxesCount > 0);
      assert.ok(DEFAULT_TRANSFER_PASS.dwcPermitNumber?.includes("DWC"));
    });

    it("returns complete trilingual translations in en, si, and ta", () => {
      const en: PassTranslations = getPassTranslations("en");
      assert.strictEqual(en.modePaging, "Airport Paging Sign (Landscape)");
      assert.strictEqual(en.modeTripSheet, "Chauffeur Trip & Gate Pass");
      assert.strictEqual(en.modeExcursionPass, "Wildlife Excursion Gate Pass");
      assert.strictEqual(en.welcomeEn, "WELCOME TO SRI LANKA");
      assert.strictEqual(en.welcomeSi, "ආයුබෝවන්");

      const si: PassTranslations = getPassTranslations("si");
      assert.strictEqual(si.modePaging, "ගුවන් තොටුපළ නාම පුවරුව (තිරස්)");
      assert.strictEqual(si.modeTripSheet, "රියදුරු ගමන් හා ගේට්ටු බලපත්රය");
      assert.strictEqual(si.printAction, "මුද්රණය කරන්න");

      const ta: PassTranslations = getPassTranslations("ta");
      assert.strictEqual(ta.modePaging, "விமான நிலைய பெயர் பலகை (கிடைமட்டம்)");
      assert.strictEqual(ta.printAction, "அச்சிடுக");
    });
  });

  describe("2. Static React Markup & Display Modes", () => {
    it("renders Airport Paging Board (Landscape) mode by default", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTransferPass, {
          passData: DEFAULT_TRANSFER_PASS,
          initialMode: "PAGING_BOARD",
          language: "en",
          testId: "custom-pass-test",
        }),
      );

      // Root container
      assert.ok(html.includes('data-testid="custom-pass-test"'));

      // Paging board view
      assert.ok(html.includes('data-testid="paging-board-view"'));
      assert.ok(html.includes("CEYLON HERITAGE LUXURY RESORTS &amp; SPA"));
      assert.ok(html.includes("DR. ANANYA SHARMA"));
      assert.ok(html.includes("UL 504"));
      assert.ok(html.includes("Chaminda Silva"));
      assert.ok(html.includes("WP CAC-7890"));

      // Trilingual greetings
      assert.ok(html.includes("WELCOME TO SRI LANKA"));
      assert.ok(html.includes("ආයුබෝවන්"));
    });

    it("renders Chauffeur Trip Sheet & Security Gate Pass mode", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTransferPass, {
          passData: DEFAULT_TRANSFER_PASS,
          initialMode: "DRIVER_TRIP_SHEET",
          language: "en",
        }),
      );

      // Trip sheet view
      assert.ok(html.includes('data-testid="trip-sheet-view"'));
      assert.ok(html.includes("Chauffeur Trip Sheet &amp; Security Clearance"));
      assert.ok(html.includes("TRF-20261021-0842"));
      assert.ok(html.includes("E03 Katunayake Expressway"));
      assert.ok(html.includes("2 Boxes Handed Over"));
      assert.ok(html.includes("Exit Odometer (km)"));
      assert.ok(html.includes("Return Odometer (km)"));
      assert.ok(html.includes("Sgt. Sunil Bandara (Resort Security)"));
    });

    it("renders Wildlife Excursion & Safari Gate Pass mode", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTransferPass, {
          passData: DEFAULT_TRANSFER_PASS,
          initialMode: "EXCURSION_GATE_PASS",
          language: "en",
        }),
      );

      // Excursion pass view
      assert.ok(html.includes('data-testid="excursion-pass-view"'));
      assert.ok(html.includes("Wildlife Excursion &amp; Field Tracker Pass"));
      assert.ok(html.includes("DWC-YAL-2026-9912"));
      assert.ok(html.includes("Kumara Wickramasinghe"));
      assert.ok(html.includes("Ch 14 (156.700 MHz)"));
      assert.ok(html.includes("DWC Ranger Station Seal"));
    });

    it("renders localized Sinhala view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTransferPass, {
          passData: DEFAULT_TRANSFER_PASS,
          initialMode: "PAGING_BOARD",
          language: "si",
        }),
      );

      assert.ok(html.includes("ගුවන් තොටුපළ නාම පුවරුව (තිරස්)"));
      assert.ok(html.includes("මුද්රණය කරන්න"));
    });

    it("renders localized Tamil view correctly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableTransferPass, {
          passData: DEFAULT_TRANSFER_PASS,
          initialMode: "PAGING_BOARD",
          language: "ta",
        }),
      );

      assert.ok(html.includes("விமான நிலைய பெயர் பலகை (கிடைமட்டம்)"));
      assert.ok(html.includes("அச்சிடுக"));
    });
  });

  describe("3. TypeScript Interface Constructibility", () => {
    it("constructs type-safe TransferPassData and PrintableTransferPassProps", () => {
      const mode: PassDisplayMode = "DRIVER_TRIP_SHEET";

      const customPass: TransferPassData = {
        passId: "PASS-CUSTOM-11",
        transferType: "SAFARI_EXCURSION",
        hotelBrandName: "YALA SAFARI LODGE",
        hotelSubBrand: "Luxury Cabanas",
        guestSalutation: "MR.",
        guestFullName: "JAMES BOND",
        guestRoomNumber: "Cabana 07",
        passengerCount: 2,
        luggagePiecesCount: 2,
        airportHub: "BIA_KATUNAYAKE",
        terminalText: "Lobby",
        pickupDateTime: "2026-10-21 05:00 AM",
        destinationText: "Yala Block 1",
        routeExpressway: "Tissamaharama Highway",
        vehicleModel: "Land Cruiser 4x4",
        vehiclePlateNumber: "SP LF-5544",
        chauffeurName: "Ruwan Silva",
        chauffeurMobile: "+94 71 999 8888",
        fuelLevelIndicator: "Full",
        packedBreakfastBoxesCount: 2,
        specialInstructions: "Tracker needed",
      };

      assert.strictEqual(customPass.passId, "PASS-CUSTOM-11");
      assert.strictEqual(mode, "DRIVER_TRIP_SHEET");

      const props: PrintableTransferPassProps = {
        passData: customPass,
        initialMode: mode,
        language: "en",
        onPrint: () => {
          /* noop */
        },
      };

      assert.strictEqual(props.language, "en");
    });
  });
});
