import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HELP_TOPICS,
  HelpDrawer,
  type HelpDrawerProps,
  type HelpTopic,
  LANGUAGE_OPTIONS,
  type NicParseResult,
  type TaxBreakdownResult,
  computeSriLankanTaxBreakdown,
  parseSriLankanNicInfo,
} from "../src/components/HelpDrawer.js";

describe("Step 466: Contextual Bilingual Help & Sri Lankan Tax Tooltip Drawer (HelpDrawer.tsx)", () => {
  describe("1. Sri Lankan 4-Stage Compounding Statutory Tax Engine", () => {
    it("computes accurate 4-stage tax compounding on LKR 10,000 base amount", () => {
      const breakdown = computeSriLankanTaxBreakdown(10000);

      assert.strictEqual(breakdown.baseAmount, 10000);
      assert.strictEqual(breakdown.serviceCharge, 1000); // 10% on 10,000
      assert.strictEqual(breakdown.tdl, 110); // 1% on (10,000 + 1,000)
      assert.strictEqual(breakdown.sscl, 282.05); // 2.5641% on 11,000
      assert.strictEqual(breakdown.vat, 2030.77); // 18% on (11,000 + 282.05)
      assert.strictEqual(breakdown.totalAmount, 13422.82);
      assert.ok(breakdown.effectiveTaxPercentage >= 34 && breakdown.effectiveTaxPercentage <= 35);
    });

    it("handles zero and negative base amounts safely", () => {
      const zeroBreakdown = computeSriLankanTaxBreakdown(0);
      assert.strictEqual(zeroBreakdown.baseAmount, 0);
      assert.strictEqual(zeroBreakdown.totalAmount, 0);
      assert.strictEqual(zeroBreakdown.effectiveTaxPercentage, 0);

      const negativeBreakdown = computeSriLankanTaxBreakdown(-500);
      assert.strictEqual(negativeBreakdown.baseAmount, 0);
      assert.strictEqual(negativeBreakdown.totalAmount, 0);
    });
  });

  describe("2. Sri Lankan NIC & Passport Verification Parser", () => {
    it("decodes old 9-digit male NIC correctly", () => {
      const result = parseSriLankanNicInfo("952341234V");
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.format, "OLD_9_DIGIT");
      assert.strictEqual(result.birthYear, 1995);
      assert.strictEqual(result.dayOfYear, 234);
      assert.strictEqual(result.gender, "MALE");
    });

    it("decodes old 9-digit female NIC with 500-day offset", () => {
      const result = parseSriLankanNicInfo("927341234X");
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.format, "OLD_9_DIGIT");
      assert.strictEqual(result.birthYear, 1992);
      assert.strictEqual(result.dayOfYear, 234); // 734 - 500
      assert.strictEqual(result.gender, "FEMALE");
    });

    it("decodes new 12-digit male NIC correctly", () => {
      const result = parseSriLankanNicInfo("199823412345");
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.format, "NEW_12_DIGIT");
      assert.strictEqual(result.birthYear, 1998);
      assert.strictEqual(result.dayOfYear, 234);
      assert.strictEqual(result.gender, "MALE");
    });

    it("decodes new 12-digit female NIC correctly", () => {
      const result = parseSriLankanNicInfo("200273412345");
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.format, "NEW_12_DIGIT");
      assert.strictEqual(result.birthYear, 2002);
      assert.strictEqual(result.dayOfYear, 234); // 734 - 500
      assert.strictEqual(result.gender, "FEMALE");
    });

    it("rejects invalid NIC strings gracefully with informative error", () => {
      const invalidChars = parseSriLankanNicInfo("invalid-nic-number");
      assert.strictEqual(invalidChars.isValid, false);
      assert.strictEqual(invalidChars.format, "INVALID");

      const invalidDay = parseSriLankanNicInfo("959991234V");
      assert.strictEqual(invalidDay.isValid, false);
      assert.ok(invalidDay.error?.includes("between 1 and 366"));
    });
  });

  describe("3. Trilingual Topic Catalog Integrity", () => {
    it("contains 4 comprehensive front-desk topics", () => {
      assert.strictEqual(HELP_TOPICS.length, 4);
      const topicIds = HELP_TOPICS.map((t) => t.id);
      assert.ok(topicIds.includes("TAX_MATH"));
      assert.ok(topicIds.includes("NIC_PARSER"));
      assert.ok(topicIds.includes("QR_TROUBLE"));
      assert.ok(topicIds.includes("SHORTCUTS"));
    });

    it("provides trilingual translations across EN, SI, and TA for all topics", () => {
      for (const topic of HELP_TOPICS) {
        assert.ok(topic.title.en.length > 0);
        assert.ok(topic.title.si.length > 0);
        assert.ok(topic.title.ta.length > 0);
        assert.ok(topic.subtitle.en.length > 0);
        assert.ok(topic.subtitle.si.length > 0);
        assert.ok(topic.subtitle.ta.length > 0);
      }
    });

    it("defines 3 primary Sri Lankan languages in LANGUAGE_OPTIONS", () => {
      assert.strictEqual(LANGUAGE_OPTIONS.length, 3);
      assert.strictEqual(LANGUAGE_OPTIONS[0]?.id, "en");
      assert.strictEqual(LANGUAGE_OPTIONS[1]?.id, "si");
      assert.strictEqual(LANGUAGE_OPTIONS[2]?.id, "ta");
    });
  });

  describe("4. React 19 Static Markup & Apple HIG Design Compliance", () => {
    it("returns null when isOpen is false", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: false,
          onClose: () => {
            /* test */
          },
        }),
      );
      assert.strictEqual(html, "");
    });

    it("renders HelpDrawer in open state with Apple HIG liquid glass and tax guide", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
        }),
      );

      // Apple HIG liquid glass surface
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes('aria-label="Contextual Help Drawer"'));

      // Header and trilingual title
      assert.ok(html.includes("Front Desk Reference &amp; Tax Guide"));

      // Statutory tax breakdown stages
      assert.ok(html.includes("Stage 1: Service Charge (10%)"));
      assert.ok(html.includes("Stage 2: Tourism Dev. Levy / TDL (1%)"));
      assert.ok(html.includes("Stage 3: Social Security / SSCL (2.56%)"));
      assert.ok(html.includes("Stage 4: Value Added Tax / VAT (18%)"));
      assert.ok(html.includes("Gross Total (LKR)"));

      // Minimum 44x44pt touch target on interactive elements
      assert.ok(html.includes("min-h-[44px]"));

      // Tabular numerals for LKR amounts and percentages
      assert.ok(html.includes("tabular-nums-lkr"));

      // Close hint
      assert.ok(html.includes("ESC to close"));
    });

    it("renders NIC parser when initialTopic is NIC_PARSER", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
          initialTopic: "NIC_PARSER",
        }),
      );

      assert.ok(html.includes("Sri Lankan Identity Verification Standards"));
      assert.ok(html.includes("Test Guest NIC (Old or New Format):"));
      assert.ok(html.includes("OLD_9_DIGIT"));
      assert.ok(html.includes("Birth Year:"));
    });

    it("renders QR troubleshooting when initialTopic is QR_TROUBLE", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
          initialTopic: "QR_TROUBLE",
        }),
      );

      assert.ok(html.includes("Common QR Menu &amp; Contactless Ordering Solutions"));
      assert.ok(html.includes("Token Expired / Check-out Conflict"));
      assert.ok(html.includes("LankaQR CEFT Dynamic Payment Timed Out"));
    });

    it("renders keyboard shortcuts when initialTopic is SHORTCUTS", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
          initialTopic: "SHORTCUTS",
        }),
      );

      assert.ok(html.includes("Hotkeys available across the entire Cloud PMS platform:"));
      assert.ok(html.includes("⌘K / Ctrl+K"));
      assert.ok(html.includes("⌘N"));
      assert.ok(html.includes("⌘F"));
    });

    it("renders Sinhala localization when defaultLanguage is si", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
          defaultLanguage: "si",
        }),
      );

      assert.ok(html.includes("සත්කාරක සහ බදු මාර්ගෝපදේශය"));
      assert.ok(html.includes("සේවා ගාස්තුව"));
    });

    it("renders Tamil localization when defaultLanguage is ta", () => {
      const html = renderToStaticMarkup(
        React.createElement(HelpDrawer, {
          isOpen: true,
          onClose: () => {
            /* test */
          },
          defaultLanguage: "ta",
        }),
      );

      assert.ok(html.includes("முன் பணியக வரி வழிகாட்டி"));
      assert.ok(html.includes("சேவைக் கட்டணம்"));
    });

    it("verifies HelpDrawerProps interface is constructible", () => {
      const props: HelpDrawerProps = {
        isOpen: true,
        onClose: () => {
          /* test */
        },
        initialTopic: "TAX_MATH",
        defaultLanguage: "en",
        className: "custom-class",
      };
      assert.strictEqual(props.isOpen, true);
      assert.strictEqual(props.defaultLanguage, "en");

      const taxResult: TaxBreakdownResult = {
        baseAmount: 1000,
        serviceCharge: 100,
        tdl: 11,
        sscl: 28.2,
        vat: 203,
        totalAmount: 1342.2,
        effectiveTaxPercentage: 34.22,
      };
      assert.strictEqual(taxResult.baseAmount, 1000);

      const nicResult: NicParseResult = {
        isValid: true,
        format: "OLD_9_DIGIT",
        birthYear: 1995,
        dayOfYear: 234,
        gender: "MALE",
      };
      assert.strictEqual(nicResult.isValid, true);

      const topic: HelpTopic = {
        id: "TAX_MATH",
        title: { en: "T", si: "T", ta: "T" },
        subtitle: { en: "S", si: "S", ta: "S" },
        badge: "B",
      };
      assert.strictEqual(topic.id, "TAX_MATH");
    });
  });
});
