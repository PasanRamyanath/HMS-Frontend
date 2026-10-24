import assert from "node:assert";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type CorporateMiceConfig,
  CorporateMiceForm,
  DEFAULT_AV_CATALOG,
  DEFAULT_MICE_CONFIG,
  DEFAULT_RECREATION_CATALOG,
  MICE_TRANSLATIONS,
  computeMiceFinancials,
  formatMiceCurrency,
  generateMiceProposalSummary,
} from "../src/admin/banquets/CorporateMiceForm.js";

describe("Step 339: CorporateMiceForm — Corporate Conference, MICE & Day-Outing Package Builder", () => {
  describe("1. Pure Financial Calculation & Compounding Taxes", () => {
    it("calculates accurate day-outing financials with AV and recreation add-ons", () => {
      const summary = computeMiceFinancials(
        DEFAULT_MICE_CONFIG,
        DEFAULT_AV_CATALOG,
        DEFAULT_RECREATION_CATALOG,
      );

      // 80 delegates * 6500 LKR = 520,000 LKR
      assert.strictEqual(summary.delegatesTotalLkr, 520000);
      assert.strictEqual(summary.residentialRoomsTotalLkr, 0);

      // Selected AV: Projector (15,000) + Cordless Mics (6,000) + Podium (5,000) = 26,000 LKR
      assert.strictEqual(summary.avEquipmentTotalLkr, 26000);

      // Recreation: Pool (80 * 1200 = 96,000) + Cricket Ground (25,000) + DJ (45,000) = 166,000 LKR
      assert.strictEqual(summary.recreationTotalLkr, 166000);

      // Gross = 520,000 + 0 + 26,000 + 166,000 = 712,000 LKR
      assert.strictEqual(summary.grossSubtotalLkr, 712000);

      // 10% SC = 71,200
      assert.strictEqual(summary.serviceChargeLkr, 71200);

      // 1% TDL = 7,832
      assert.strictEqual(summary.tdlLkr, 7832);

      // 2.5% SSCL = 19,580
      assert.strictEqual(summary.ssclLkr, 19580);

      // 18% VAT on (783,200 + 7,832 + 19,580) = 810,612 * 0.18 = 145,910
      assert.strictEqual(summary.vatLkr, 145910);

      // Grand total = 810,612 + 145,910 = 956,522
      assert.strictEqual(summary.grandTotalLkr, 956522);
    });

    it("calculates residential conference with overnight deluxe room accommodation", () => {
      const residentialConfig: CorporateMiceConfig = {
        ...DEFAULT_MICE_CONFIG,
        packageType: "RESIDENTIAL_CONFERENCE",
        delegateCount: 40,
        ratePerDelegateLkr: 8500,
        residentialRoomCount: 20, // Twin share
        roomRateLkr: 25000,
        selectedAvIds: ["av-projector", "av-podium"],
        recreationOrders: {},
      };

      const summary = computeMiceFinancials(
        residentialConfig,
        DEFAULT_AV_CATALOG,
        DEFAULT_RECREATION_CATALOG,
      );

      // 40 delegates * 8500 = 340,000
      assert.strictEqual(summary.delegatesTotalLkr, 340000);
      // 20 rooms * 25000 = 500,000
      assert.strictEqual(summary.residentialRoomsTotalLkr, 500000);
      // AV = 15000 + 5000 = 20,000
      assert.strictEqual(summary.avEquipmentTotalLkr, 20000);
      assert.strictEqual(summary.recreationTotalLkr, 0);

      const expectedGross = 340000 + 500000 + 20000; // 860,000
      assert.strictEqual(summary.grossSubtotalLkr, expectedGross);
      assert.ok(summary.grandTotalLkr > expectedGross);
    });
  });

  describe("2. String Formatter & Proposal Generator", () => {
    it("formats MICE currency in LKR with two decimals", () => {
      assert.strictEqual(formatMiceCurrency(6500), "LKR 6,500.00");
      assert.strictEqual(formatMiceCurrency(956522), "LKR 956,522.00");
      assert.strictEqual(formatMiceCurrency(0), "LKR 0.00");
    });

    it("generates structured proposal summary with all details", () => {
      const summary = computeMiceFinancials(
        DEFAULT_MICE_CONFIG,
        DEFAULT_AV_CATALOG,
        DEFAULT_RECREATION_CATALOG,
      );
      const proposal = generateMiceProposalSummary(DEFAULT_MICE_CONFIG, summary);

      assert.ok(proposal.includes("CORPORATE MICE PROPOSAL"));
      assert.ok(proposal.includes("Dialog Axiata PLC (Enterprise Solutions)"));
      assert.ok(proposal.includes("Dharshana Senanayake"));
      assert.ok(proposal.includes("DAY OUTING"));
      assert.ok(proposal.includes("80 pax"));
      assert.ok(proposal.includes("CLUSTER ROUND TABLES"));
      assert.ok(proposal.includes("Delegates Package Base:"));
      assert.ok(proposal.includes("AV Equipment Rental:"));
      assert.ok(proposal.includes("Team-Building & Recreation:"));
      assert.ok(proposal.includes("10% Service Charge:"));
      assert.ok(proposal.includes("TOTAL ESTIMATED PROPOSAL:"));
    });
  });

  describe("3. Trilingual Localization & Catalogs Integrity", () => {
    it("provides complete translations across en, si, and ta without missing keys", () => {
      const languages = ["en", "si", "ta"] as const;
      const expectedKeys = [
        "title",
        "subtitle",
        "packageType",
        "companyName",
        "contactPerson",
        "contactPhone",
        "eventDate",
        "delegateCount",
        "ratePerDelegate",
        "seatingLayout",
        "residentialRooms",
        "avEquipment",
        "teamBuilding",
        "financialSummary",
        "grossSubtotal",
        "serviceCharge",
        "grandTotal",
        "saveProposal",
        "viewProposalText",
      ] as const;

      for (const lang of languages) {
        const dict = MICE_TRANSLATIONS[lang];
        assert.ok(dict, `Dictionary for ${lang} must exist`);
        for (const key of expectedKeys) {
          assert.ok(
            dict[key] && dict[key].length > 0,
            `Key '${key}' in language '${lang}' must be non-empty`,
          );
        }
      }
    });

    it("verifies AV and recreation catalogs have valid items and daily rates", () => {
      assert.ok(DEFAULT_AV_CATALOG.length >= 5);
      for (const av of DEFAULT_AV_CATALOG) {
        assert.ok(av.dailyRateLkr > 0);
        assert.ok(av.name.length > 0);
        assert.ok(av.nameSi.length > 0);
        assert.ok(av.nameTa.length > 0);
      }

      assert.ok(DEFAULT_RECREATION_CATALOG.length >= 4);
      for (const rec of DEFAULT_RECREATION_CATALOG) {
        assert.ok(rec.unitRateLkr > 0);
        assert.ok(rec.name.length > 0);
        assert.ok(rec.nameSi.length > 0);
        assert.ok(rec.nameTa.length > 0);
      }
    });
  });

  describe("4. React Component Static Markup Rendering", () => {
    it("renders CorporateMiceForm with default props in dark mode", () => {
      const html = renderToStaticMarkup(React.createElement(CorporateMiceForm, {}));

      assert.ok(html.includes("Corporate Conference, MICE &amp; Day-Outing Package Builder"));
      assert.ok(html.includes("Dialog Axiata PLC (Enterprise Solutions)"));
      assert.ok(html.includes("Day-Outing Package"));
      assert.ok(html.includes("Half-Day Corporate Seminar"));
      assert.ok(html.includes("Full-Day Executive Conference"));
      assert.ok(html.includes("Residential Conference"));
      assert.ok(html.includes("Cluster Round Tables"));
      assert.ok(html.includes("4K Laser Projector"));
      assert.ok(html.includes("Cricket Ground with Mats"));
      assert.ok(html.includes("Save MICE Proposal"));
    });

    it("renders Sinhala localization properly", () => {
      const html = renderToStaticMarkup(React.createElement(CorporateMiceForm, { language: "si" }));

      assert.ok(html.includes("ආයතනික සම්මන්ත්රණ"));
      assert.ok(html.includes("පැකේජ වර්ගය"));
      assert.ok(html.includes("ආයතනයේ / සමාගමේ නම"));
      assert.ok(html.includes("ශ්රව්ය දෘශ්ය (AV) උපකරණ"));
      assert.ok(html.includes("කණ්ඩායම් ක්රීඩා"));
    });

    it("renders Tamil localization properly", () => {
      const html = renderToStaticMarkup(React.createElement(CorporateMiceForm, { language: "ta" }));

      assert.ok(html.includes("நிறுவன மாநாடு"));
      assert.ok(html.includes("தொகுப்பு வகை"));
      assert.ok(html.includes("நிறுவனத்தின் பெயர்"));
      assert.ok(html.includes("ஒலி-ஒளி சாதனங்கள் (AV)"));
    });

    it("renders in light mode with custom initial config", () => {
      const html = renderToStaticMarkup(
        React.createElement(CorporateMiceForm, {
          isDarkMode: false,
          initialConfig: {
            companyName: "MAS Holdings Corporate Retreat",
            delegateCount: 150,
          },
        }),
      );

      assert.ok(html.includes("MAS Holdings Corporate Retreat"));
      assert.ok(html.includes("150"));
    });
  });
});
