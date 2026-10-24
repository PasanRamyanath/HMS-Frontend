/**
 * Unit Tests for Step 335: Printable A4 Banquet Event Order (PrintableBeoSheet.test.ts)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_BEO_DATA,
  PrintableBeoSheet,
  filterBeoInstructions,
  filterBeoTimeline,
  getDepartmentLabel,
} from "../src/admin/banquets/index.js";

const noop = (): void => {
  /* no-op for tests */
};

describe("Step 335: Printable A4 Banquet Event Order (PrintableBeoSheet.tsx)", () => {
  // --------------------------------------------------------------------------
  // 1. Pure Filtering & Data Helpers
  // --------------------------------------------------------------------------
  describe("1. Pure Filtering & Data Helpers", () => {
    it("filterBeoTimeline returns all items when department is ALL", () => {
      const filtered = filterBeoTimeline(DEFAULT_BEO_DATA.timeline, "ALL");
      assert.strictEqual(filtered.length, DEFAULT_BEO_DATA.timeline.length);
    });

    it("filterBeoTimeline includes department items and general BANQUETS items", () => {
      const kitchenItems = filterBeoTimeline(DEFAULT_BEO_DATA.timeline, "KITCHEN");
      assert.ok(kitchenItems.length > 0);
      for (const item of kitchenItems) {
        assert.ok(item.department === "KITCHEN" || item.department === "BANQUETS");
      }
    });

    it("filterBeoInstructions filters directives by department accurately", () => {
      const allDirectives = filterBeoInstructions(DEFAULT_BEO_DATA.departmentInstructions, "ALL");
      assert.strictEqual(allDirectives.length, 6);

      const kitchenDirectives = filterBeoInstructions(
        DEFAULT_BEO_DATA.departmentInstructions,
        "KITCHEN",
      );
      assert.strictEqual(kitchenDirectives.length, 1);
      assert.strictEqual(kitchenDirectives[0]?.department, "KITCHEN");
      assert.strictEqual(kitchenDirectives[0]?.leadOfficer, "Chef Sunimal Perera");

      const engDirectives = filterBeoInstructions(
        DEFAULT_BEO_DATA.departmentInstructions,
        "ENGINEERING",
      );
      assert.strictEqual(engDirectives.length, 1);
      assert.strictEqual(engDirectives[0]?.department, "ENGINEERING");
    });

    it("getDepartmentLabel returns localized strings across English, Sinhala, and Tamil", () => {
      assert.strictEqual(getDepartmentLabel("KITCHEN", "en"), "Kitchen & Food");
      assert.strictEqual(getDepartmentLabel("KITCHEN", "si"), "මුළුතැන්ගෙය");
      assert.strictEqual(getDepartmentLabel("KITCHEN", "ta"), "சமையலறை");

      assert.strictEqual(getDepartmentLabel("ENGINEERING", "en"), "Engineering & AC");
      assert.strictEqual(getDepartmentLabel("ENGINEERING", "si"), "ඉංජිනේරු සහ AC");
      assert.strictEqual(getDepartmentLabel("ENGINEERING", "ta"), "பொறியியல் & ஏசி");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Default BEO Data Integrity
  // --------------------------------------------------------------------------
  describe("2. Default BEO Data Integrity", () => {
    it("contains complete Sri Lankan wedding operational specifications", () => {
      assert.strictEqual(DEFAULT_BEO_DATA.beoNumber, "BEO-2026-11-0428");
      assert.strictEqual(DEFAULT_BEO_DATA.guaranteedPax, 250);
      assert.strictEqual(DEFAULT_BEO_DATA.expectedPax, 275);
      assert.ok(DEFAULT_BEO_DATA.honeymoonSuiteNumber?.includes("Suite #402"));

      // Astrological Poruwa Nekath exists in timeline
      const nekathItem = DEFAULT_BEO_DATA.timeline.find((item) => item.isAuspiciousNekath);
      assert.ok(nekathItem);
      assert.strictEqual(nekathItem?.time, "08:35");

      // 3-Phase power requirement
      assert.strictEqual(DEFAULT_BEO_DATA.threePhaseRequired, true);
      assert.strictEqual(DEFAULT_BEO_DATA.threePhaseAmperage, 63);

      // Bar config
      assert.strictEqual(DEFAULT_BEO_DATA.barConfig.clientBottlesCount, 30);
      assert.strictEqual(DEFAULT_BEO_DATA.barConfig.freeCorkageCount, 20);
      assert.strictEqual(DEFAULT_BEO_DATA.barConfig.excessCorkageRateLkr, 2500);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Static React Rendering & Integration
  // --------------------------------------------------------------------------
  describe("3. Static React Rendering & Integration", () => {
    it("renders PrintableBeoSheet in English cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableBeoSheet, {
          beoData: DEFAULT_BEO_DATA,
          language: "en",
          onPrint: noop,
          onSignOffToggle: noop,
        }),
      );

      assert.ok(html.includes("Banquet Event Order (BEO) / Function Prospectus"));
      assert.ok(html.includes("BEO-2026-11-0428"));
      assert.ok(html.includes("Kasun &amp; Sanduni&#x27;s Traditional Wedding Reception"));
      assert.ok(html.includes("250 Pax"));
      assert.ok(html.includes("Subha Nekatha"));
      assert.ok(html.includes("Negombo Lagoon Jumbo Devilled Prawns"));
      assert.ok(html.includes("Executive Chef Directives"));
      assert.ok(html.includes("Chief Engineer &amp; AV Directives"));
      assert.ok(html.includes("Hotel Management Department Sign-Offs"));
      assert.ok(html.includes("print:hidden"));
    });

    it("renders PrintableBeoSheet in Sinhala cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableBeoSheet, {
          beoData: DEFAULT_BEO_DATA,
          language: "si",
          onPrint: noop,
        }),
      );

      assert.ok(html.includes("මංගල සහ උත්සව නියෝග පත්රිකාව (BEO)"));
      assert.ok(html.includes("සුබ නැකත් සහ උත්සව කාලසටහන"));
      assert.ok(html.includes("මුළුතැන්ගෙය"));
    });

    it("renders PrintableBeoSheet in Tamil cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(PrintableBeoSheet, {
          beoData: DEFAULT_BEO_DATA,
          language: "ta",
          onPrint: noop,
        }),
      );

      assert.ok(html.includes("விருந்து நிகழ்வு ஆணை (BEO) / விழா அறிக்கை"));
      assert.ok(html.includes("சுப நேர திருமண நிகழ்வு அட்டவணை"));
      assert.ok(html.includes("சமையலறை"));
    });
  });
});
