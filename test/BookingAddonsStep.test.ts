import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type AddonCategory,
  type AddonItem,
  type AddonsState,
  type AirportTransferDetails,
  type AyurvedicSpaDetails,
  BookingAddonsStep,
  type BookingAddonsStepProps,
  type BookingAddonsSummary,
  DEFAULT_ADDONS,
  DEFAULT_ADDONS_STATE,
  DEFAULT_AIRPORT_TRANSFER_DETAILS,
  DEFAULT_AYURVEDIC_SPA_DETAILS,
  DEFAULT_DRIVER_QUARTERS_DETAILS,
  DEFAULT_SAFARI_JEEP_DETAILS,
  type DriverQuartersDetails,
  type SafariJeepDetails,
  type SafariPark,
  type SafariSlot,
  type SelectedAddonDetail,
  type SpaSlot,
  type TransferType,
  buildAirportTransferDetail,
  buildAyurvedicSpaDetail,
  buildDriverQuartersDetail,
  buildSafariJeepDetail,
  calculateAddonsSummary,
} from "../src/qr/booking/BookingAddonsStep.js";

describe("Direct Booking Add-Ons Step (BookingAddonsStep.tsx)", () => {
  describe("1. Catalog & Default Configuration", () => {
    it("defines the 4 authentic Sri Lankan curated add-on items", () => {
      assert.strictEqual(DEFAULT_ADDONS.length, 4);

      const [transfer, safari, driver, spa] = DEFAULT_ADDONS;
      assert.ok(transfer && safari && driver && spa);

      // 1. BIA Airport Transfer
      assert.strictEqual(transfer.id, "addon-bia-transfer");
      const transferCat: AddonCategory = transfer.category;
      assert.strictEqual(transferCat, "AIRPORT_TRANSFER");
      assert.strictEqual(transfer.priceResidentLkr, 24000);
      assert.strictEqual(transfer.priceForeignUsd, 80);
      assert.strictEqual(transfer.isComplimentary, false);

      // 2. Wildlife Safari
      assert.strictEqual(safari.id, "addon-wildlife-safari");
      const safariCat: AddonCategory = safari.category;
      assert.strictEqual(safariCat, "WILDLIFE_SAFARI");
      assert.strictEqual(safari.priceResidentLkr, 36000);
      assert.strictEqual(safari.priceForeignUsd, 120);

      // 3. Driver Quarters (Free courtesy)
      assert.strictEqual(driver.id, "addon-driver-quarters");
      const driverCat: AddonCategory = driver.category;
      assert.strictEqual(driverCat, "DRIVER_QUARTERS");
      assert.strictEqual(driver.priceResidentLkr, 0);
      assert.strictEqual(driver.priceForeignUsd, 0);
      assert.strictEqual(driver.isComplimentary, true);

      // 4. Ayurvedic Spa
      assert.strictEqual(spa.id, "addon-ayurvedic-spa");
      const spaCat: AddonCategory = spa.category;
      assert.strictEqual(spaCat, "WELLNESS_EXPERIENCE");
      assert.strictEqual(spa.priceResidentLkr, 12000);
      assert.strictEqual(spa.priceForeignUsd, 40);
    });

    it("verifies all default detail structures and state", () => {
      const transferDetails: AirportTransferDetails = DEFAULT_AIRPORT_TRANSFER_DETAILS;
      const tType: TransferType = transferDetails.transferType;
      assert.strictEqual(tType, "ONE_WAY_PICKUP");
      assert.strictEqual(transferDetails.flightNumber, "UL 504");
      assert.strictEqual(transferDetails.passengerCount, 2);

      const safariDetails: SafariJeepDetails = DEFAULT_SAFARI_JEEP_DETAILS;
      const park: SafariPark = safariDetails.park;
      const slot: SafariSlot = safariDetails.slot;
      assert.strictEqual(park, "YALA");
      assert.strictEqual(slot, "DAWN_0530");
      assert.strictEqual(safariDetails.binocularsRequested, true);

      const driverDetails: DriverQuartersDetails = DEFAULT_DRIVER_QUARTERS_DETAILS;
      assert.strictEqual(driverDetails.driverName, "Sunil Shantha");
      assert.strictEqual(driverDetails.vehiclePlateNumber, "WP CAA-4821");
      assert.strictEqual(driverDetails.dormBedConfirmed, true);

      const spaDetails: AyurvedicSpaDetails = DEFAULT_AYURVEDIC_SPA_DETAILS;
      const spaSlot: SpaSlot = spaDetails.preferredSlot;
      assert.strictEqual(spaSlot, "AFTERNOON");
      assert.strictEqual(spaDetails.personsCount, 2);

      const defaultState: AddonsState = DEFAULT_ADDONS_STATE;
      assert.strictEqual(defaultState.airportTransferSelected, false);
      assert.strictEqual(defaultState.safariJeepSelected, false);
      assert.strictEqual(defaultState.driverQuartersSelected, false);
      assert.strictEqual(defaultState.ayurvedicSpaSelected, false);
    });
  });

  describe("2. Add-Ons Pricing & 4-Stage Compounding Tax Calculations", () => {
    it("computes empty add-ons summary cleanly with only room total", () => {
      const summary: BookingAddonsSummary = calculateAddonsSummary(
        DEFAULT_ADDONS_STATE,
        "RESIDENT_LKR",
        42000,
        300,
      );

      assert.strictEqual(summary.addonsNetLkr, 0);
      assert.strictEqual(summary.addonsNetUsd, 0);
      assert.strictEqual(summary.selectedAddons.length, 0);
      assert.strictEqual(summary.driverBedRequested, false);
      assert.strictEqual(summary.addonsTaxBreakdown.grandTotalLkr, 0);

      // Room tariff: 42,000 * 1.34343 (with 4-stage tax compounding)
      // SC (10%): 4,200 -> 46,200
      // TDL (1%): 462
      // SSCL (2.5%): 1,155
      // VAT Base: 47,817
      // VAT (18%): 8,607
      // Grand: 46,200 + 462 + 1,155 + 8,607 = 56,424
      assert.strictEqual(summary.roomTotalLkr, 56424);
      assert.strictEqual(summary.grandTotalLkr, 56424);
    });

    it("computes one-way vs round-trip airport transfer", () => {
      const oneWayState: AddonsState = {
        ...DEFAULT_ADDONS_STATE,
        airportTransferSelected: true,
        airportTransferDetails: {
          ...DEFAULT_AIRPORT_TRANSFER_DETAILS,
          transferType: "ONE_WAY_PICKUP",
        },
      };

      const oneWaySummary = calculateAddonsSummary(oneWayState, "RESIDENT_LKR", 0, 300);
      assert.strictEqual(oneWaySummary.addonsNetLkr, 24000);
      assert.strictEqual(oneWaySummary.addonsNetUsd, 80);
      assert.strictEqual(oneWaySummary.selectedAddons[0]?.quantity, 1);

      const roundTripState: AddonsState = {
        ...DEFAULT_ADDONS_STATE,
        airportTransferSelected: true,
        airportTransferDetails: {
          ...DEFAULT_AIRPORT_TRANSFER_DETAILS,
          transferType: "ROUND_TRIP",
        },
      };

      const roundTripSummary = calculateAddonsSummary(roundTripState, "RESIDENT_LKR", 0, 300);
      assert.strictEqual(roundTripSummary.addonsNetLkr, 48000);
      assert.strictEqual(roundTripSummary.addonsNetUsd, 160);
      assert.strictEqual(roundTripSummary.selectedAddons[0]?.quantity, 2);
    });

    it("handles complimentary chauffeur bed without adding monetary charge", () => {
      const driverOnlyState: AddonsState = {
        ...DEFAULT_ADDONS_STATE,
        driverQuartersSelected: true,
      };

      const summary = calculateAddonsSummary(driverOnlyState, "RESIDENT_LKR", 50000, 300);
      assert.strictEqual(summary.addonsNetLkr, 0);
      assert.strictEqual(summary.addonsNetUsd, 0);
      assert.strictEqual(summary.driverBedRequested, true);
      assert.strictEqual(summary.selectedAddons.length, 1);

      const item: SelectedAddonDetail | undefined = summary.selectedAddons[0];
      assert.ok(item);
      assert.strictEqual(item.isComplimentary, true);
      assert.strictEqual(item.totalLkr, 0);
      assert.strictEqual(item.totalUsd, 0);
    });

    it("correctly compounds multi-item add-ons with 4-stage tax", () => {
      const multiState: AddonsState = {
        ...DEFAULT_ADDONS_STATE,
        safariJeepSelected: true, // 36,000 LKR
        ayurvedicSpaSelected: true, // 12,000 * 2 = 24,000 LKR
        driverQuartersSelected: true, // 0 LKR
      };

      const summary = calculateAddonsSummary(multiState, "RESIDENT_LKR", 0, 300);
      assert.strictEqual(summary.addonsNetLkr, 60000); // 36k + 24k
      assert.strictEqual(summary.addonsNetUsd, 200); // 120 + 80
      assert.strictEqual(summary.driverBedRequested, true);
      assert.strictEqual(summary.selectedAddons.length, 3);

      // Verify 4-stage tax compounding on 60,000:
      // SC (10%): 6,000 -> 66,000
      // TDL (1%): 660
      // SSCL (2.5%): 1,650
      // VAT Base: 66,000 + 660 + 1,650 = 68,310
      // VAT (18%): 12,296
      // Grand Total = 66,000 + 660 + 1,650 + 12,296 = 80,606
      const tax = summary.addonsTaxBreakdown;
      assert.strictEqual(tax.baseAmountLkr, 60000);
      assert.strictEqual(tax.serviceChargeLkr, 6000);
      assert.strictEqual(tax.subtotalAfterScLkr, 66000);
      assert.strictEqual(tax.tdlLkr, 660);
      assert.strictEqual(tax.ssclLkr, 1650);
      assert.strictEqual(tax.vatBaseLkr, 68310);
      assert.strictEqual(tax.vatLkr, 12296);
      assert.strictEqual(tax.grandTotalLkr, 80606);
      assert.strictEqual(summary.grandTotalLkr, 80606);
    });

    it("converts amounts to Foreign USD when residencyTier is FOREIGN_USD", () => {
      const safariState: AddonsState = {
        ...DEFAULT_ADDONS_STATE,
        safariJeepSelected: true,
      };

      const summary = calculateAddonsSummary(safariState, "FOREIGN_USD", 0, 300);
      assert.strictEqual(summary.addonsNetUsd, 120);
      assert.strictEqual(summary.grandTotalUsd, 161.21); // Taxed USD
    });
  });

  describe("3. Static UI Markup & Apple HIG Design (renderToStaticMarkup)", () => {
    it("renders step header with Step 2 of 3, title, and residency badge", () => {
      const props: BookingAddonsStepProps = {
        tenantId: "tenant-ceylon-heritage",
        residencyTier: "RESIDENT_LKR",
      };

      const html = renderToStaticMarkup(React.createElement(BookingAddonsStep, props));

      assert.ok(html.includes("Step 2 of 3"));
      assert.ok(html.includes("Curated Island Add-Ons"));
      assert.ok(html.includes("Enhance Your Ceylon Journey"));
      assert.ok(html.includes("(Tariffs displayed in LKR)"));
      assert.ok(html.includes('data-tenant="tenant-ceylon-heritage"'));
    });

    it("renders all 4 curated add-ons cards with titles, pricing, and badges", () => {
      const html = renderToStaticMarkup(React.createElement(BookingAddonsStep, {}));

      // BIA Transfer
      assert.ok(html.includes("Bandaranaike Int&#x27;l Airport (BIA) Private Transfer"));
      assert.ok(html.includes("Most Convenient"));
      assert.ok(html.includes("LKR 24,000.00"));

      // Safari Jeep
      assert.ok(html.includes("Private 4x4 Wildlife Safari Jeep Expedition"));
      assert.ok(html.includes("Signature Island Tour"));
      assert.ok(html.includes("LKR 36,000.00"));

      // Driver Quarters (Free)
      assert.ok(html.includes("Complimentary Chauffeur &amp; Guide Quarters"));
      assert.ok(html.includes("Complimentary Courtesy"));
      assert.ok(html.includes("FREE COURTESY"));
      assert.ok(html.includes("Request Bed (Free)"));

      // Ayurvedic Spa
      assert.ok(html.includes("Authentic Ceylon Ayurvedic Herbal Massage &amp; Steam Bath"));
      assert.ok(html.includes("Holistic Wellness"));
      assert.ok(html.includes("LKR 12,000.00"));
    });

    it("renders USD pricing when residencyTier is FOREIGN_USD", () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingAddonsStep, { residencyTier: "FOREIGN_USD" }),
      );

      assert.ok(html.includes("USD 80.00"));
      assert.ok(html.includes("USD 120.00"));
      assert.ok(html.includes("USD 40.00"));
      assert.ok(html.includes("FREE COURTESY"));
    });

    it("renders expandable subforms when options are pre-selected in state", () => {
      const preSelected: Partial<AddonsState> = {
        airportTransferSelected: true,
        safariJeepSelected: true,
        driverQuartersSelected: true,
        ayurvedicSpaSelected: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(BookingAddonsStep, { initialAddonsState: preSelected }),
      );

      // Airport transfer subform elements
      assert.ok(html.includes("Transfer Direction &amp; Service Type"));
      assert.ok(html.includes("Flight Number"));
      assert.ok(html.includes("Flight Date &amp; Arrival Time"));

      // Safari subform elements
      assert.ok(html.includes("National Park Destination"));
      assert.ok(html.includes("Yala National Park"));
      assert.ok(html.includes("Game Drive Time Slot"));
      assert.ok(html.includes("professional Bushnell 10x42 wildlife binoculars"));

      // Driver quarters subform elements
      assert.ok(html.includes("Chauffeur / Driver Full Name"));
      assert.ok(html.includes("Vehicle License Plate Number"));
      assert.ok(html.includes("Sri Lankan Driver Hospitality Commitment"));

      // Ayurvedic spa subform elements
      assert.ok(html.includes("Number of Persons for Therapy"));
      assert.ok(html.includes("Preferred Time of Day"));
    });

    it("renders floating liquid glass bottom bar with actions and summary count", () => {
      const preSelected: Partial<AddonsState> = {
        safariJeepSelected: true,
        driverQuartersSelected: true,
      };

      const html = renderToStaticMarkup(
        React.createElement(BookingAddonsStep, { initialAddonsState: preSelected }),
      );

      assert.ok(html.includes("Total Stay &amp; Add-Ons:"));
      assert.ok(html.includes("+2 Add-Ons"));
      assert.ok(html.includes("Includes 4-Stage Taxes"));
      assert.ok(html.includes("Skip Add-Ons"));
      assert.ok(html.includes("Proceed to Checkout"));
    });

    it("renders back button when onBack callback is supplied", () => {
      const html = renderToStaticMarkup(
        React.createElement(BookingAddonsStep, {
          onBack: () => {
            /* No-op callback for test */
          },
        }),
      );

      assert.ok(html.includes("Back to Room Selection"));
    });

    it("verifies single-responsibility detail builder helper functions directly", () => {
      const transferDetail = buildAirportTransferDetail({
        transferType: "ROUND_TRIP",
        flightNumber: "EK 652",
        dateTime: "2026-11-20T10:00",
        passengerCount: 4,
        specialRequests: "VIP lounge pickup",
      });
      assert.strictEqual(transferDetail.quantity, 2);
      assert.strictEqual(transferDetail.totalLkr, 48000);
      assert.strictEqual(transferDetail.totalUsd, 160);

      const safariDetail = buildSafariJeepDetail(DEFAULT_SAFARI_JEEP_DETAILS);
      assert.strictEqual(safariDetail.totalLkr, 36000);
      assert.strictEqual(safariDetail.category, "WILDLIFE_SAFARI");

      const driverDetail = buildDriverQuartersDetail(DEFAULT_DRIVER_QUARTERS_DETAILS);
      assert.strictEqual(driverDetail.isComplimentary, true);
      assert.strictEqual(driverDetail.totalLkr, 0);

      const spaDetail = buildAyurvedicSpaDetail({
        personsCount: 3,
        preferredSlot: "EVENING",
        treatmentType: "Full Body Massage",
      });
      assert.strictEqual(spaDetail.quantity, 3);
      assert.strictEqual(spaDetail.totalLkr, 36000);
      assert.strictEqual(spaDetail.totalUsd, 120);
    });

    it("renders custom initial addons if supplied", () => {
      const customAddons: ReadonlyArray<AddonItem> = [
        {
          id: "custom-whale-watching",
          category: "WILDLIFE_SAFARI",
          title: "Mirissa Blue Whale Watching Catamaran",
          sinhalaTitle: "මිරිස්ස තල්මසුන් නැරඹීම",
          tamilTitle: "திமிங்கலம் பார்த்தல்",
          description: "Morning oceanic cruise into the Dondra canyon.",
          badge: "Deep Sea",
          priceResidentLkr: 18000,
          priceForeignUsd: 60,
          unitText: "per person",
          isComplimentary: false,
          imageUrl: "https://example.com/whale.jpg",
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(BookingAddonsStep, { initialAddons: customAddons }),
      );

      assert.ok(html.includes("Mirissa Blue Whale Watching Catamaran"));
      assert.ok(html.includes("Deep Sea"));
    });
  });
});
