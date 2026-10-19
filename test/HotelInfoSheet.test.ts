import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HOTEL_INFO,
  type EmergencyHotline,
  type FacilitySchedule,
  HotelInfoSheet,
  type HotelInfoSheetProps,
  type PropertyRule,
  copyToClipboardSafe,
  getHotelInfoText,
} from "../src/qr/HotelInfoSheet.js";

describe("HotelInfoSheet (Step 267)", () => {
  it("provides complete trilingual translations for en, si, ta", () => {
    const en = getHotelInfoText("en");
    const si = getHotelInfoText("si");
    const ta = getHotelInfoText("ta");

    assert.ok(en.title.includes("Directory"));
    assert.ok(si.title.includes("නාමාවලිය"));
    assert.ok(ta.title.includes("அடைவு"));

    assert.strictEqual(typeof en.copyPassword, "string");
    assert.strictEqual(typeof si.copyPassword, "string");
    assert.strictEqual(typeof ta.copyPassword, "string");

    assert.ok(en.emergencyHeading.includes("Emergency"));
    assert.ok(si.emergencyHeading.includes("හදිසි"));
    assert.ok(ta.emergencyHeading.includes("அவசர"));
  });

  it("defines default Sri Lankan emergency hotlines & facilities", () => {
    assert.ok(DEFAULT_HOTEL_INFO.wifiSsid.length > 0);
    assert.ok(DEFAULT_HOTEL_INFO.wifiPassword.length > 0);

    const ambulance = DEFAULT_HOTEL_INFO.emergencyContacts?.find((c) => c.number === "1990");
    assert.ok(ambulance);
    assert.ok(ambulance.name.includes("Suwasariya"));

    const touristPolice = DEFAULT_HOTEL_INFO.emergencyContacts?.find((c) => c.number === "1912");
    assert.ok(touristPolice);
    assert.ok(touristPolice.name.includes("Tourist Police"));

    const pool = DEFAULT_HOTEL_INFO.facilities?.find((f) => f.id === "fac-pool");
    assert.ok(pool);
    assert.ok(pool.hours.includes("07:00 AM"));
  });

  it("renders null when isOpen is false", () => {
    const props: HotelInfoSheetProps = {
      isOpen: false,
      roomNumber: "Ocean Suite 101",
      onClose: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(HotelInfoSheet, props));
    assert.strictEqual(html, "");
  });

  it("renders modal dialog sheet when open with default compendium items", () => {
    const props: HotelInfoSheetProps = {
      isOpen: true,
      roomNumber: "Ocean Villa 202",
      language: "en",
      onClose: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(HotelInfoSheet, props));
    assert.ok(html.includes("Ocean Villa 202"));
    assert.ok(html.includes("Galle Fort Lighthouse Villa"));
    assert.ok(html.includes("Lighthouse_Villa_Guest_5G"));
    assert.ok(html.includes("CeylonBreeze@2026"));
    assert.ok(html.includes("tel:1990"));
    assert.ok(html.includes("tel:1912"));
    assert.ok(html.includes("tel:119"));
    assert.ok(html.includes("wa.me"));
    assert.ok(html.includes("Saltwater Infinity Pool"));
    assert.ok(html.includes("100% Smoke-Free Rooms"));
  });

  it("renders in Sinhala language correctly", () => {
    const props: HotelInfoSheetProps = {
      isOpen: true,
      roomNumber: "Room 105",
      language: "si",
      onClose: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(HotelInfoSheet, props));
    assert.ok(html.includes("හෝටල් තොරතුරු සහ නාමාවලිය"));
    assert.ok(html.includes("නොමිලේ අධිවේගී Wi-Fi"));
    assert.ok(html.includes("ශ්‍රී ලංකා හදිසි ඇමතුම් සේවා"));
  });

  it("renders in Tamil language correctly", () => {
    const props: HotelInfoSheetProps = {
      isOpen: true,
      roomNumber: "Room 304",
      language: "ta",
      onClose: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(HotelInfoSheet, props));
    assert.ok(html.includes("ஹோட்டல் தகவல் மற்றும் அடைவு"));
    assert.ok(html.includes("இலவச அதிவேக வைஃபை"));
    assert.ok(html.includes("இலங்கை அவசர உதவி எண்கள்"));
  });

  it("handles custom hotel info overrides", () => {
    const customProps: HotelInfoSheetProps = {
      isOpen: true,
      roomNumber: "Presidential Villa",
      language: "en",
      infoConfig: {
        hotelName: "Mirissa Ocean Sanctuary",
        wifiSsid: "Mirissa_Sanctuary_VIP",
        wifiPassword: "WhaleWatching2026",
      },
      onClose: () => undefined,
    };

    const html = renderToStaticMarkup(React.createElement(HotelInfoSheet, customProps));
    assert.ok(html.includes("Mirissa Ocean Sanctuary"));
    assert.ok(html.includes("Mirissa_Sanctuary_VIP"));
    assert.ok(html.includes("WhaleWatching2026"));
  });

  it("safely handles copyToClipboardSafe in non-browser environments", async () => {
    const result = await copyToClipboardSafe("TestText");
    assert.strictEqual(typeof result, "boolean");
  });

  it("validates type interfaces are constructible", () => {
    const contact: EmergencyHotline = {
      id: "test-c",
      name: "Local Doctor",
      number: "+94770000000",
      description: "On-call physician",
      icon: "🩺",
    };
    const fac: FacilitySchedule = {
      id: "test-f",
      name: "Tennis Court",
      hours: "06:00 - 18:00",
      location: "East Wing",
      icon: "🎾",
    };
    const rule: PropertyRule = {
      id: "test-r",
      title: "Quiet Hours",
      detail: "22:00 to 07:00",
      icon: "🌙",
    };

    assert.strictEqual(contact.number, "+94770000000");
    assert.strictEqual(fac.hours, "06:00 - 18:00");
    assert.strictEqual(rule.title, "Quiet Hours");
  });
});
