import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_EXPERIENCES,
  type ExperienceBooking,
  type ExperienceCategory,
  type ExperienceItem,
  GuestSpaAndExcursionsTab,
  type GuestSpaAndExcursionsTabProps,
  calculateExperiencePricing,
  getBookingStatusBadgeClass,
  getTabTranslations,
  isEarlyMorningSlot,
  roundLkr,
} from "../src/qr/GuestSpaAndExcursionsTab.js";

describe("Step 359: Contactless Guest QR Ayurveda Spa & Excursion Self-Booking Tab", () => {
  describe("1. Pure Financial & Statutory 4-Stage Compounding Tax Math", () => {
    it("correctly rounds numbers to 2 decimal places with roundLkr", () => {
      assert.strictEqual(roundLkr(1234.567), 1234.57);
      assert.strictEqual(roundLkr(100.004), 100);
      assert.strictEqual(roundLkr(0), 0);
    });

    it("identifies early morning slots before 07:30 AM", () => {
      assert.strictEqual(isEarlyMorningSlot("05:00 AM"), true);
      assert.strictEqual(isEarlyMorningSlot("05:30 AM"), true);
      assert.strictEqual(isEarlyMorningSlot("06:30 AM"), true);
      assert.strictEqual(isEarlyMorningSlot("07:15 AM"), true);

      assert.strictEqual(isEarlyMorningSlot("07:30 AM"), false);
      assert.strictEqual(isEarlyMorningSlot("08:00 AM"), false);
      assert.strictEqual(isEarlyMorningSlot("09:00 AM"), false);
      assert.strictEqual(isEarlyMorningSlot("01:30 PM"), false);
      assert.strictEqual(isEarlyMorningSlot(""), false);
    });

    it("calculates 4-stage compounding Sri Lankan statutory taxes on spa treatments (zero pass-through)", () => {
      const shirodhara = DEFAULT_EXPERIENCES.find((e) => e.id === "exp-shirodhara");
      assert.ok(shirodhara);

      // Single guest: base 14,500 LKR
      const pricing = calculateExperiencePricing(shirodhara, 1);
      assert.strictEqual(pricing.baseHotelLkr, 14500);
      assert.strictEqual(pricing.passThroughLkr, 0);

      // Stage 1: SC 10% = 1450
      assert.strictEqual(pricing.serviceChargeLkr, 1450);
      // Base + SC = 15950

      // Stage 2: TDL 1% = 159.50
      assert.strictEqual(pricing.tdlLkr, 159.5);

      // Stage 3: SSCL 2.5% = 398.75
      assert.strictEqual(pricing.ssclLkr, 398.75);

      // Stage 4: VAT 18% on (15950 + 398.75 = 16348.75) = 2942.78
      assert.strictEqual(pricing.vatLkr, 2942.78);

      // Total Hotel Taxes = 1450 + 159.5 + 398.75 + 2942.78 = 4951.03
      assert.strictEqual(pricing.totalHotelTaxesLkr, 4951.03);

      // Hotel Total = 14500 + 4951.03 = 19451.03
      assert.strictEqual(pricing.hotelTotalPayableLkr, 19451.03);

      // Grand Total = 19451.03
      assert.strictEqual(pricing.grandTotalLkr, 19451.03);
    });

    it("calculates excursion pricing with SC-exempt government park ticket pass-through", () => {
      const yala = DEFAULT_EXPERIENCES.find((e) => e.id === "exp-yala-safari");
      assert.ok(yala);

      // 2 guests: base 22,000 * 2 = 44,000 LKR; pass-through 14,500 * 2 = 29,000 LKR
      const pricing = calculateExperiencePricing(yala, 2);
      assert.strictEqual(pricing.baseHotelLkr, 44000);
      assert.strictEqual(pricing.passThroughLkr, 29000);

      // 10% SC on 44,000 = 4,400
      assert.strictEqual(pricing.serviceChargeLkr, 4400);

      // 1% TDL on 48,400 = 484.00
      assert.strictEqual(pricing.tdlLkr, 484);

      // 2.5% SSCL on 48,400 = 1210.00
      assert.strictEqual(pricing.ssclLkr, 1210);

      // 18% VAT on (48400 + 1210 = 49610) = 8929.80
      assert.strictEqual(pricing.vatLkr, 8929.8);

      // Total taxes on hotel portion: 4400 + 484 + 1210 + 8929.80 = 15023.80
      assert.strictEqual(pricing.totalHotelTaxesLkr, 15023.8);

      // Hotel total: 44000 + 15023.80 = 59023.80
      assert.strictEqual(pricing.hotelTotalPayableLkr, 59023.8);

      // Grand total with 29,000 pass-through: 59023.80 + 29000 = 88023.80
      assert.strictEqual(pricing.grandTotalLkr, 88023.8);
    });

    it("returns correct status badge CSS classes", () => {
      assert.ok(getBookingStatusBadgeClass("CONFIRMED").includes("emerald"));
      assert.ok(getBookingStatusBadgeClass("IN_PROGRESS").includes("sky"));
      assert.ok(getBookingStatusBadgeClass("COMPLETED").includes("slate"));
      assert.ok(getBookingStatusBadgeClass("CANCELLED").includes("rose"));
    });
  });

  describe("2. Trilingual Localization & Translations", () => {
    it("provides complete translations in English, Sinhala, and Tamil", () => {
      const en = getTabTranslations("en");
      assert.strictEqual(en.pageTitle, "Spa & Island Excursions");
      assert.strictEqual(en.tabSpa, "Ayurveda Spa");
      assert.strictEqual(en.tabExcursions, "Safaris & Tours");
      assert.ok(en.earlyMorningAlert.includes("Early Morning Departure"));

      const si = getTabTranslations("si");
      assert.strictEqual(si.pageTitle, "ස්පා සහ සංචාරක අත්දැකීම්");
      assert.strictEqual(si.tabSpa, "ආයුර්වේද ස්පා");
      assert.ok(si.earlyMorningAlert.includes("අලුයම පිටත්වීම"));

      const ta = getTabTranslations("ta");
      assert.strictEqual(ta.pageTitle, "ஸ்பா & தீவு உலாக்கள்");
      assert.strictEqual(ta.tabExcursions, "சவாரி & உலாக்கள்");
      assert.ok(ta.earlyMorningAlert.includes("அதிகாலை புறப்பாடு"));
    });
  });

  describe("3. Static Markup & Component Rendering", () => {
    const sampleBooking: ExperienceBooking = {
      id: "BK-1001",
      bookingRef: "SL-SPA-7B9A2F",
      experienceId: "exp-shirodhara",
      experienceName: "Shirodhara Calming Mind Therapy",
      category: "AYURVEDA_SPA",
      roomNumber: "Villa 08",
      guestName: "Mr. David Miller",
      date: "2026-10-21",
      timeSlot: "11:00 AM",
      guestCount: 2,
      packedBreakfastRequested: false,
      pricing: {
        baseHotelLkr: 29000,
        passThroughLkr: 0,
        serviceChargeLkr: 2900,
        tdlLkr: 319,
        ssclLkr: 797.5,
        vatLkr: 5885.55,
        totalHotelTaxesLkr: 9902.05,
        hotelTotalPayableLkr: 38902.05,
        grandTotalLkr: 38902.05,
      },
      status: "CONFIRMED",
      bookedAt: "2026-10-20T10:00:00Z",
    };

    it("renders GuestSpaAndExcursionsTab with room context, tabs, and curated experiences", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestSpaAndExcursionsTab, {
          roomNumber: "Villa 08",
          guestName: "Mr. David Miller",
          language: "en",
          initialBookings: [sampleBooking],
          testId: "guest-spa-tab-test",
        }),
      );

      // Root container & Room number
      assert.ok(html.includes('data-testid="guest-spa-tab-test"'));
      assert.ok(html.includes("Room Villa 08"));
      assert.ok(html.includes("Spa &amp; Island Excursions"));

      // Category filters
      assert.ok(html.includes("All Experiences"));
      assert.ok(html.includes("Ayurveda Spa"));
      assert.ok(html.includes("Safaris &amp; Tours"));

      // Experiences rendered
      assert.ok(html.includes("Shirodhara Calming Mind Therapy"));
      assert.ok(html.includes("Yala National Park Leopard Safari"));
      assert.ok(html.includes("Mirissa Blue Whale &amp; Dolphin Cruise"));
      assert.ok(html.includes("Sinharaja UNESCO Rainforest Trek"));

      // Active booking rendered
      assert.ok(html.includes('data-testid="active-bookings-list"'));
      assert.ok(html.includes("SL-SPA-7B9A2F"));
      assert.ok(html.includes("2 Guests"));
    });

    it("renders localized Sinhala version with Sinhala titles and labels", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestSpaAndExcursionsTab, {
          roomNumber: "Room 205",
          language: "si",
          initialBookings: [],
        }),
      );

      assert.ok(html.includes("ස්පා සහ සංචාරක අත්දැකීම්"));
      assert.ok(html.includes("ආයුර්වේද ස්පා"));
      assert.ok(html.includes("ශිරෝධාරා සන්සුන් ප්රතිකාරය"));
      assert.ok(html.includes("යාල ජාතික වනෝද්යාන දිවි සෆාරි"));
      assert.ok(html.includes("මෙම කාමරය සඳහා තවමත් වෙන්කිරීම් සිදුකර නොමැත."));
    });

    it("renders localized Tamil version with Tamil titles and labels", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestSpaAndExcursionsTab, {
          roomNumber: "Suite 12",
          language: "ta",
          initialBookings: [],
        }),
      );

      assert.ok(html.includes("ஸ்பா &amp; தீவு உலாக்கள்"));
      assert.ok(html.includes("ஆயுர்வேத ஸ்பா"));
      assert.ok(html.includes("சவாரி &amp; உலாக்கள்"));
      assert.ok(html.includes("சிரோதாரா அமைதி சிகிச்சை"));
    });
  });

  describe("4. TypeScript Domain Constructibility & Types", () => {
    it("constructs type-safe ExperienceItem and ExperienceBooking objects", () => {
      const cat: ExperienceCategory = "AYURVEDA_SPA";
      const item: ExperienceItem = {
        id: "exp-custom",
        category: cat,
        name: "Custom Herbal Bath",
        trilingualName: { en: "Custom Herbal Bath", si: "විශේෂ නානය", ta: "சிறப்பு குளியல்" },
        description: "Bespoke bath",
        trilingualDesc: { en: "Bespoke bath", si: "විශේෂ නානය", ta: "சிறப்பு குளியல்" },
        duration: "30 Mins",
        basePriceLkr: 8000,
        vendorPassThroughLkr: 0,
        badge: "Specialty",
        timeSlots: ["10:00 AM"],
        location: "Garden Pavilion",
        earlyMorning: false,
        iconEmoji: "Flower",
      };

      assert.strictEqual(item.category, "AYURVEDA_SPA");
      assert.strictEqual(item.basePriceLkr, 8000);

      const props: GuestSpaAndExcursionsTabProps = {
        roomNumber: "Villa 01",
        guestName: "Pasan",
        language: "en",
        usdExchangeRate: 310,
        onBookExperience: () => {
          /* noop */
        },
      };

      assert.strictEqual(props.roomNumber, "Villa 01");
    });
  });
});
