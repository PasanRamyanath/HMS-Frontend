import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_HOTEL_BRAND,
  GuestHeroBanner,
  type GuestHeroBannerProps,
  GuestLocationBadge,
  type GuestLocationBadgeProps,
  type GuestLocationInfo,
  GuestQrApp,
  type GuestQrAppProps,
  type GuestSessionStatus,
  GuestSessionStatusBar,
  type GuestSessionStatusBarProps,
  type HotelBrandProfile,
  type LocationType,
  type TrilingualBrandText,
  parseGuestToken,
  parseLocationInfo,
  resolveTrilingualBrand,
  verifyGuestSession,
} from "../src/qr/GuestQrApp.js";

describe("Step 251: Contactless QR Entrypoint & HMAC Session Loader (GuestQrApp.tsx)", () => {
  describe("1. Pure URL & Token Parsing Resolvers", () => {
    it("extracts ?t=<hmac> parameter accurately from URL strings", () => {
      const urlWithT = "https://gallefort.lk/qr/tenant-galle-fort/room-104?t=e3b0c44298fc1c14";
      assert.strictEqual(parseGuestToken(urlWithT), "e3b0c44298fc1c14");

      const queryOnly = "?t=secret_hmac_room_token";
      assert.strictEqual(parseGuestToken(queryOnly), "secret_hmac_room_token");

      const urlWithToken = "https://gallefort.lk/qr/t1/r1?token=legacy_token_1234";
      assert.strictEqual(parseGuestToken(urlWithToken), "legacy_token_1234");
    });

    it("returns null when token parameter is absent, empty, or whitespace", () => {
      assert.strictEqual(parseGuestToken("https://gallefort.lk/qr/t1/r1"), null);
      assert.strictEqual(parseGuestToken("?other=value"), null);
      assert.strictEqual(parseGuestToken("?t="), null);
      assert.strictEqual(parseGuestToken("?t=   "), null);
    });

    it("resolves trilingual brand text with fallback to English", () => {
      const brandText: TrilingualBrandText = {
        en: "Galle Fort Lighthouse Villa",
        si: "ගාල්ල කොටුව ලයිට්හවුස් විලා",
        ta: "காலி கோட்டை கலங்கரை விளக்கம் வில்லா",
      };

      assert.strictEqual(resolveTrilingualBrand(brandText, "en"), "Galle Fort Lighthouse Villa");
      assert.strictEqual(resolveTrilingualBrand(brandText, "si"), "ගාල්ල කොටුව ලයිට්හවුස් විලා");
      assert.strictEqual(resolveTrilingualBrand(brandText, "ta"), "காலி கோட்டை கலங்கரை விளக்கம் வில்லா");

      const partial: TrilingualBrandText = {
        en: "English Only Hotel",
        si: "",
        ta: "",
      };
      assert.strictEqual(resolveTrilingualBrand(partial, "si"), "English Only Hotel");
      assert.strictEqual(resolveTrilingualBrand(partial, "ta"), "English Only Hotel");
    });
  });

  describe("2. Location Context & HMAC Verification Engine", () => {
    it("parses room numbers and marks folio posting allowed", () => {
      const room104 = parseLocationInfo("room-104");
      assert.strictEqual(room104.type, "IN_ROOM");
      assert.strictEqual(room104.displayName, "Room 104");
      assert.strictEqual(room104.folioPostingAllowed, true);

      const villa02 = parseLocationInfo("villa-02");
      assert.strictEqual(villa02.type, "IN_ROOM");
      assert.strictEqual(villa02.displayName, "Villa 02");
      assert.strictEqual(villa02.folioPostingAllowed, true);

      const numericOnly = parseLocationInfo("305");
      assert.strictEqual(numericOnly.type, "IN_ROOM");
      assert.strictEqual(numericOnly.displayName, "Room 305");
    });

    it("parses restaurant and bar tables and denies folio posting", () => {
      const table04 = parseLocationInfo("table-04");
      assert.strictEqual(table04.type, "SEATED_TABLE");
      assert.strictEqual(table04.displayName, "Table 04");
      assert.strictEqual(table04.folioPostingAllowed, false);

      const bar01 = parseLocationInfo("bar-01");
      assert.strictEqual(bar01.type, "SEATED_TABLE");
      assert.strictEqual(bar01.displayName, "Bar Counter 01");
      assert.strictEqual(bar01.folioPostingAllowed, false);
    });

    it("parses poolside cabana locations", () => {
      const cabana = parseLocationInfo("pool-02");
      assert.strictEqual(cabana.type, "POOLSIDE_CABANA");
      assert.strictEqual(cabana.displayName, "Pool Cabana 02");
      assert.strictEqual(cabana.badgeSubtitle, "Poolside Lounger");
    });

    it("verifies guest session status based on location and token presence", () => {
      const room = parseLocationInfo("room-104");
      const validHmac = "a8f3b92c1094d3e2";
      assert.strictEqual(verifyGuestSession(validHmac, room), "VERIFIED_IN_ROOM");

      // Without HMAC token, room session falls back to unverified
      assert.strictEqual(verifyGuestSession(null, room), "UNVERIFIED_ROOM");
      assert.strictEqual(verifyGuestSession("short", room), "UNVERIFIED_ROOM");

      // Table orders are seated diners regardless of token
      const table = parseLocationInfo("table-04");
      assert.strictEqual(verifyGuestSession(null, table), "SEATED_TABLE");
      assert.strictEqual(verifyGuestSession(validHmac, table), "SEATED_TABLE");
    });
  });

  describe("3. Visual Subcomponents SSR Static Markup", () => {
    const defaultLocation = parseLocationInfo("room-104");

    it("renders GuestLocationBadge with verified checked-in guest badge", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestLocationBadge, {
          location: defaultLocation,
          sessionStatus: "VERIFIED_IN_ROOM",
        }),
      );

      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Checked-In Guest • Folio Active"));
      assert.ok(html.includes("bg-emerald-500/15"));
      assert.ok(html.includes('data-testid="guest-location-badge"'));
    });

    it("renders GuestLocationBadge with seated diner styling for restaurant tables", () => {
      const tableLoc = parseLocationInfo("table-07");
      const html = renderToStaticMarkup(
        React.createElement(GuestLocationBadge, {
          location: tableLoc,
          sessionStatus: "SEATED_TABLE",
        }),
      );

      assert.ok(html.includes("Table 07"));
      assert.ok(html.includes("Seated Diner • Instant Digital Pay"));
      assert.ok(html.includes("bg-indigo-500/15"));
    });

    it("renders GuestHeroBanner with 3:1 cinematic hero header and star rating", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestHeroBanner, {
          brand: DEFAULT_HOTEL_BRAND,
          location: defaultLocation,
          sessionStatus: "VERIFIED_IN_ROOM",
          lang: "en",
        }),
      );

      assert.ok(html.includes("aspect-[3/1]"));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Galle Fort, Sri Lanka"));
      assert.ok(html.includes("★★★★★"));
      assert.ok(html.includes("Room 104"));
    });

    it("renders GuestSessionStatusBar with kitchen hours and live folio indicator", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestSessionStatusBar, {
          sessionStatus: "VERIFIED_IN_ROOM",
          hours: "06:30 – 23:00 SLST",
          allowFolio: true,
        }),
      );

      assert.ok(html.includes("06:30 – 23:00 SLST"));
      assert.ok(html.includes("Post to Room Folio Enabled"));
      assert.ok(html.includes('data-testid="guest-session-status-bar"'));
    });
  });

  describe("4. Full GuestQrApp Container Integration", () => {
    it("renders full GuestQrApp container with default Galle Fort presets", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestQrApp, {
          tenantId: "tenant-galle-fort",
          locationId: "room-104",
          hmacToken: "verified_hmac_token_12345",
        }),
      );

      assert.ok(html.includes('data-testid="guest-qr-app-root"'));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Checked-In Guest • Folio Active"));
      assert.ok(html.includes("In-Room Dining"));
      assert.ok(html.includes("Drinks &amp; Bar") || html.includes("Drinks & Bar"));
      assert.ok(html.includes("Live Folio"));
      assert.ok(html.includes('data-testid="guest-qr-active-view"'));
    });

    it("renders GuestQrApp for restaurant table with seated dining context", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestQrApp, {
          tenantId: "tenant-galle-fort",
          locationId: "table-04",
        }),
      );

      assert.ok(html.includes("Table 04"));
      assert.ok(html.includes("Seated Diner • Instant Digital Pay"));
      // Folio tab button should be hidden for table guests without room attachment
      assert.ok(!html.includes("<span>🧾</span> Live Folio"));
    });

    it("verifies all exported interfaces and types are constructible", () => {
      const brand: HotelBrandProfile = DEFAULT_HOTEL_BRAND;
      const loc: GuestLocationInfo = {
        rawId: "room-202",
        type: "IN_ROOM",
        displayName: "Room 202",
        badgeSubtitle: "Guest",
        folioPostingAllowed: true,
      };
      const status: GuestSessionStatus = "VERIFIED_IN_ROOM";
      const locType: LocationType = "IN_ROOM";
      const badgeProps: GuestLocationBadgeProps = { location: loc, sessionStatus: status };
      const heroProps: GuestHeroBannerProps = {
        brand,
        location: loc,
        sessionStatus: status,
        lang: "en",
      };
      const barProps: GuestSessionStatusBarProps = {
        sessionStatus: status,
        hours: "07:00 - 22:00",
        allowFolio: true,
      };
      const appProps: GuestQrAppProps = {
        tenantId: "tenant-test",
        locationId: "room-101",
      };

      assert.ok(brand && loc && status && locType);
      assert.ok(badgeProps && heroProps && barProps && appProps);
    });
  });
});
