import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_RESTRICTIONS,
  QuickRestrictionsBar,
  type QuickRestrictionsBarProps,
  type RestrictionRule,
  SCOPE_OPTIONS,
  SRI_LANKAN_PEAK_PRESETS,
  type SriLankanPeakPreset,
  getEffectiveMinStay,
  isDateWithinRange,
  isStopSellActive,
  validateRestrictionRule,
} from "../src/admin/channels/QuickRestrictionsBar.js";

describe("Instant Stop-Sell & MinLOS Quick Toggle Bar (QuickRestrictionsBar.tsx)", () => {
  describe("1. Default Constants & Sri Lankan Presets", () => {
    it("provides Sri Lankan peak presets with MinLOS and season tags", () => {
      assert.strictEqual(SRI_LANKAN_PEAK_PRESETS.length, 5);

      const perahera: SriLankanPeakPreset | undefined = SRI_LANKAN_PEAK_PRESETS.find(
        (p) => p.id === "preset-perahera",
      );
      assert.ok(perahera);
      assert.strictEqual(perahera.defaultMinStay, 3);
      assert.strictEqual(perahera.defaultStopSellOta, true);
      assert.strictEqual(perahera.seasonTag, "Cultural Peak");

      const nye = SRI_LANKAN_PEAK_PRESETS.find((p) => p.id === "preset-nye-galle");
      assert.ok(nye);
      assert.strictEqual(nye.defaultMinStay, 3);
      assert.strictEqual(nye.defaultStopSellOta, false);

      const avurudu = SRI_LANKAN_PEAK_PRESETS.find((p) => p.id === "preset-avurudu");
      assert.ok(avurudu);
      assert.strictEqual(avurudu.defaultMinStay, 2);
      assert.strictEqual(avurudu.defaultStopSellOta, true);
    });

    it("provides default restrictions with active rules", () => {
      assert.strictEqual(DEFAULT_RESTRICTIONS.length, 3);
      const nye = DEFAULT_RESTRICTIONS[0];
      assert.ok(nye);
      assert.strictEqual(nye.minStayArrival, 3);
      assert.strictEqual(nye.scope, "ALL_CHANNELS");
      assert.strictEqual(nye.closedToDeparture, true);

      const avurudu = DEFAULT_RESTRICTIONS[1];
      assert.ok(avurudu);
      assert.strictEqual(avurudu.stopSell, true);
      assert.strictEqual(avurudu.scope, "OTA_ONLY");
    });

    it("provides 3 channel scope options", () => {
      assert.strictEqual(SCOPE_OPTIONS.length, 3);
      assert.deepStrictEqual(
        SCOPE_OPTIONS.map((o) => o.id),
        ["ALL_CHANNELS", "OTA_ONLY", "DIRECT_ONLY"],
      );
    });
  });

  describe("2. Pure Calculation Helpers", () => {
    it("isDateWithinRange correctly checks date boundaries", () => {
      assert.strictEqual(isDateWithinRange("2026-12-31", "2026-12-30", "2027-01-02"), true);
      assert.strictEqual(isDateWithinRange("2026-12-30", "2026-12-30", "2027-01-02"), true);
      assert.strictEqual(isDateWithinRange("2027-01-02", "2026-12-30", "2027-01-02"), true);
      assert.strictEqual(isDateWithinRange("2026-12-29", "2026-12-30", "2027-01-02"), false);
      assert.strictEqual(isDateWithinRange("2027-01-03", "2026-12-30", "2027-01-02"), false);
    });

    it("isStopSellActive determines stop-sell based on dates, room, and channel scope", () => {
      // Avurudu rule (2027-04-12 to 2027-04-16) is active stop-sell on OTA_ONLY
      assert.strictEqual(
        isStopSellActive("2027-04-14", "room-deluxe", "OTA", DEFAULT_RESTRICTIONS),
        true,
      );
      assert.strictEqual(
        isStopSellActive("2027-04-14", "room-deluxe", "DIRECT", DEFAULT_RESTRICTIONS),
        false,
      );

      // Outside Avurudu dates
      assert.strictEqual(
        isStopSellActive("2027-04-20", "room-deluxe", "OTA", DEFAULT_RESTRICTIONS),
        false,
      );

      // Inactive rule (Il Poya is inactive)
      assert.strictEqual(
        isStopSellActive("2026-11-24", "room-deluxe", "OTA", DEFAULT_RESTRICTIONS),
        false,
      );
    });

    it("getEffectiveMinStay resolves highest applicable MinLOS", () => {
      // During NYE (2026-12-30 to 2027-01-02), MinLOS is 3
      assert.strictEqual(getEffectiveMinStay("2026-12-31", "room-deluxe", DEFAULT_RESTRICTIONS), 3);

      // During Avurudu (2027-04-12 to 2027-04-16), MinLOS is 2
      assert.strictEqual(getEffectiveMinStay("2027-04-14", "room-deluxe", DEFAULT_RESTRICTIONS), 2);

      // Non-restricted date defaults to 1
      assert.strictEqual(getEffectiveMinStay("2027-06-01", "room-deluxe", DEFAULT_RESTRICTIONS), 1);
    });

    it("validateRestrictionRule validates title, dates, and MinLOS", () => {
      // Invalid name
      const res1 = validateRestrictionRule({ name: "ab" });
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.error?.includes("descriptive name"));

      // Missing dates
      const res2 = validateRestrictionRule({ name: "Valid Title", startDate: "2026-12-30" });
      assert.strictEqual(res2.isValid, false);
      assert.ok(res2.error?.includes("both start and end dates"));

      // End date before start date
      const res3 = validateRestrictionRule({
        name: "Valid Title",
        startDate: "2026-12-30",
        endDate: "2026-12-25",
      });
      assert.strictEqual(res3.isValid, false);
      assert.ok(res3.error?.includes("End date must be greater"));

      // Negative min stay
      const res4 = validateRestrictionRule({
        name: "Valid Title",
        startDate: "2026-12-25",
        endDate: "2026-12-30",
        minStayArrival: 0,
      });
      assert.strictEqual(res4.isValid, false);
      assert.ok(res4.error?.includes("at least 1 night"));

      // Valid configuration
      const res5 = validateRestrictionRule({
        name: "Valid Title",
        startDate: "2026-12-25",
        endDate: "2026-12-30",
        minStayArrival: 3,
      });
      assert.strictEqual(res5.isValid, true);
    });
  });

  describe("3. Static HTML Rendering", () => {
    it("renders QuickRestrictionsBar with default preset buttons and restrictions list", () => {
      const html = renderToStaticMarkup(React.createElement(QuickRestrictionsBar));

      assert.ok(html.includes("Instant Stop-Sell &amp; MinLOS Quick Bar"));
      assert.ok(html.includes("Active Rules"));
      assert.ok(html.includes("Emergency Stop-Sell All"));
      assert.ok(html.includes("Add Restriction"));
      assert.ok(html.includes("Kandy Esala Perahera Festival"));
      assert.ok(html.includes("New Year&#x27;s Eve Festive Gala Peak"));
      assert.ok(html.includes("Sinhala &amp; Tamil Avurudu Direct Resident Priority"));
      assert.ok(html.includes("All Channels"));
      assert.ok(html.includes("OTAs (Channex)"));
    });

    it("renders with custom restrictions and custom class name", () => {
      const customRules: ReadonlyArray<RestrictionRule> = [
        {
          id: "custom-restr-1",
          name: "Whale Season Weligama Minimum Stay",
          startDate: "2027-01-15",
          endDate: "2027-01-20",
          roomTypeIds: ["suite-ocean"],
          stopSell: false,
          closedToArrival: false,
          closedToDeparture: false,
          minStayArrival: 4,
          minStayThrough: 4,
          scope: "DIRECT_ONLY",
          isActive: true,
          syncedToChannex: false,
          syncedToDirect: true,
          updatedAtIso: "2026-10-19T09:00:00Z",
        },
      ];

      const props: QuickRestrictionsBarProps = {
        restrictions: customRules,
        className: "custom-quick-bar",
      };

      const html = renderToStaticMarkup(React.createElement(QuickRestrictionsBar, props));
      assert.ok(html.includes("custom-quick-bar"));
      assert.ok(html.includes("Whale Season Weligama Minimum Stay"));
      assert.ok(html.includes("MinLOS 4N"));
      assert.ok(html.includes("Direct Engine"));
    });
  });
});
