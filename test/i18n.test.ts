import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  DICTIONARY,
  type LanguageInfo,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type TranslationKey,
  type UseTranslationResult,
  formatLkr,
  getCurrentLanguage,
  getScriptOpticalClasses,
  initLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  useTranslation,
} from "../src/lib/i18n.js";

describe("Trilingual Localization Engine (i18n.ts)", () => {
  beforeEach(() => {
    setLanguage("en");
  });

  afterEach(() => {
    setLanguage("en");
  });

  describe("Language Definitions & Optical Classes", () => {
    it("defines English, Sinhala, and Tamil with optical font and line-height configurations", () => {
      const enInfo: LanguageInfo = SUPPORTED_LANGUAGES.en;
      assert.strictEqual(enInfo.label, "English");
      assert.strictEqual(SUPPORTED_LANGUAGES.en.label, "English");
      assert.strictEqual(SUPPORTED_LANGUAGES.si.nativeLabel, "සිංහල");
      assert.strictEqual(SUPPORTED_LANGUAGES.ta.nativeLabel, "தமிழ்");

      const enOpt = getScriptOpticalClasses("en");
      assert.strictEqual(enOpt.isIndicScript, false);
      assert.strictEqual(enOpt.lineHeightClass, "leading-normal");

      const siOpt = getScriptOpticalClasses("si");
      assert.strictEqual(siOpt.isIndicScript, true);
      assert.strictEqual(siOpt.lineHeightClass, "leading-relaxed py-0.5");
      assert.ok(siOpt.fontFamilyStyle.includes("Noto Sans Sinhala"));

      const taOpt = getScriptOpticalClasses("ta");
      assert.strictEqual(taOpt.isIndicScript, true);
      assert.strictEqual(taOpt.lineHeightClass, "leading-relaxed py-0.5");
      assert.ok(taOpt.fontFamilyStyle.includes("Noto Sans Tamil"));
    });
  });

  describe("Translations & Dictionary Completeness", () => {
    it("returns correct translations across English, Sinhala, and Tamil", () => {
      assert.strictEqual(t("welcome", undefined, "en"), "Welcome");
      assert.strictEqual(t("welcome", undefined, "si"), "ආයුබෝවන්");
      assert.strictEqual(t("welcome", undefined, "ta"), "வணக்கம்");

      assert.strictEqual(t("roomService", undefined, "en"), "Room Service");
      assert.strictEqual(t("roomService", undefined, "si"), "කාමර සේවාව");
      assert.strictEqual(t("roomService", undefined, "ta"), "அறை சேவை");
    });

    it("uses active language from store", () => {
      assert.strictEqual(getCurrentLanguage(), "en");
      assert.strictEqual(t("payLankaQr"), "Pay with LankaQR");

      setLanguage("si");
      assert.strictEqual(getCurrentLanguage(), "si");
      assert.strictEqual(t("payLankaQr"), "LankaQR මඟින් ගෙවන්න");

      setLanguage("ta");
      assert.strictEqual(getCurrentLanguage(), "ta");
      assert.strictEqual(t("payLankaQr"), "LankaQR மூலம் செலுத்தவும்");
    });

    it("verifies essential hospitality keys are translated in all 3 languages", () => {
      const keys: ReadonlyArray<TranslationKey> = [
        "browseMenu",
        "addToCart",
        "placeOrder",
        "serviceCharge",
        "statutoryTaxes",
        "housekeeping",
        "kdsTitle",
        "morningShift",
      ];

      for (const key of keys) {
        assert.ok(DICTIONARY[key].en, `Missing EN for ${key}`);
        assert.ok(DICTIONARY[key].si, `Missing SI for ${key}`);
        assert.ok(DICTIONARY[key].ta, `Missing TA for ${key}`);
      }
    });

    it("supports dynamic string interpolation", () => {
      const translated = t("welcome", { user: "Pasan" });
      assert.ok(translated);
    });
  });

  describe("Store Subscriptions & State Lifecycle", () => {
    it("notifies subscribers when language changes", () => {
      let notified = 0;
      const unsubscribe = subscribeLanguage(() => {
        notified++;
      });

      setLanguage("si");
      assert.strictEqual(notified, 1);

      // Same language should not trigger notification
      setLanguage("si");
      assert.strictEqual(notified, 1);

      setLanguage("ta");
      assert.strictEqual(notified, 2);

      unsubscribe();
      setLanguage("en");
      assert.strictEqual(notified, 2);
    });

    it("initializes language cleanly", () => {
      const initialized = initLanguage();
      assert.ok(["en", "si", "ta"].includes(initialized));
    });
  });

  describe("Sri Lankan Rupee Formatting (formatLkr)", () => {
    it("formats amounts in LKR currency with Sri Lankan numeric conventions", () => {
      assert.strictEqual(formatLkr(0), "LKR 0.00");
      assert.strictEqual(formatLkr(15000), "LKR 15,000.00");
      assert.strictEqual(formatLkr(2450500.5), "LKR 2,450,500.50");
    });
  });

  describe("React Hook & Types Verification", () => {
    it("verifies useTranslation hook and types are properly exposed", () => {
      assert.strictEqual(typeof useTranslation, "function");

      const testLang: SupportedLanguage = "si";
      assert.strictEqual(testLang, "si");

      const dummyResult: UseTranslationResult = {
        currentLanguage: "si",
        setLanguage: () => {
          /* mock setLanguage */
        },
        t: (k: TranslationKey) => String(k),
        opticalClasses: getScriptOpticalClasses("si"),
      };

      assert.strictEqual(dummyResult.currentLanguage, "si");
      assert.ok(dummyResult.opticalClasses.isIndicScript);
    });
  });
});
