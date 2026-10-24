import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CurrencySegmentedControl,
  type CurrencySegmentedControlProps,
  DEFAULT_USD_EXCHANGE_RATE,
  type DisplayCurrency,
  GuestHeaderBar,
  type GuestHeaderBarProps,
  LanguageSegmentedControl,
  type LanguageSegmentedControlProps,
  convertLkrToUsd,
  formatDisplayPrice,
  getLanguageShortLabel,
} from "../src/qr/GuestHeaderBar.js";

describe("Step 252: Trilingual Language & Currency Header Bar (GuestHeaderBar.tsx)", () => {
  describe("1. Pure Currency & Conversion Helpers", () => {
    it("converts LKR to USD accurately with default exchange rate", () => {
      // 3100 LKR @ 310 = $10.00
      assert.strictEqual(convertLkrToUsd(3100), 10);
      // 1550 LKR @ 310 = $5.00
      assert.strictEqual(convertLkrToUsd(1550), 5);
      // 2250 LKR @ 310 = $7.26
      assert.strictEqual(convertLkrToUsd(2250), 7.26);
      // 0 or negative
      assert.strictEqual(convertLkrToUsd(0), 0);
      assert.strictEqual(convertLkrToUsd(-100), 0);
    });

    it("respects custom USD exchange rates", () => {
      // 3000 LKR @ 300 = $10.00
      assert.strictEqual(convertLkrToUsd(3000, 300), 10);
      // Rate <= 0 safe guard
      assert.strictEqual(convertLkrToUsd(3000, 0), 0);
    });

    it("formats display prices based on selected currency", () => {
      const lkrPrice = formatDisplayPrice(2500, "LKR");
      assert.ok(lkrPrice.includes("LKR") && lkrPrice.includes("2,500.00"));

      const usdPrice = formatDisplayPrice(3100, "USD", 310);
      assert.strictEqual(usdPrice, "~$10.00 USD");
    });

    it("maps languages to compact pill labels", () => {
      assert.strictEqual(getLanguageShortLabel("en"), "EN");
      assert.strictEqual(getLanguageShortLabel("si"), "සිං");
      assert.strictEqual(getLanguageShortLabel("ta"), "தமிழ்");
    });
  });

  describe("2. LanguageSegmentedControl (EN / සිං / தமிழ்)", () => {
    it("renders all 3 language options with >= 44x44pt touch area", () => {
      const html = renderToStaticMarkup(
        React.createElement(LanguageSegmentedControl, {
          currentLanguage: "en",
          onSelectLanguage: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes('aria-label="Language Selector"'));
      assert.ok(html.includes("EN"));
      assert.ok(html.includes("සිං"));
      assert.ok(html.includes("தமிழ்"));
      assert.ok(html.includes('aria-pressed="true"'));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-w-[44px]"));
    });

    it("marks Sinhala as active when currentLanguage is si", () => {
      const html = renderToStaticMarkup(
        React.createElement(LanguageSegmentedControl, {
          currentLanguage: "si",
          onSelectLanguage: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("text-sky-700 dark:text-sky-300"));
      assert.ok(html.includes("සිං"));
    });
  });

  describe("3. CurrencySegmentedControl (LKR / ~USD)", () => {
    it("renders LKR and ~USD switcher buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(CurrencySegmentedControl, {
          activeCurrency: "LKR",
          onSelectCurrency: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes('aria-label="Currency Selector"'));
      assert.ok(html.includes("LKR"));
      assert.ok(html.includes("~USD"));
      assert.ok(html.includes('aria-pressed="true"'));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-w-[44px]"));
    });

    it("highlights ~USD when activeCurrency is USD", () => {
      const html = renderToStaticMarkup(
        React.createElement(CurrencySegmentedControl, {
          activeCurrency: "USD",
          onSelectCurrency: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("text-emerald-700 dark:text-emerald-400"));
    });
  });

  describe("4. Full GuestHeaderBar Component Integration", () => {
    it("renders full header with hotel title and room location", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestHeaderBar, {
          hotelName: "Galle Fort Lighthouse Villa",
          locationDisplayName: "Room 104",
          isRoomSession: true,
          activeCurrency: "LKR",
        }),
      );

      assert.ok(html.includes('data-testid="guest-header-bar"'));
      assert.ok(html.includes("Galle Fort Lighthouse Villa"));
      assert.ok(html.includes("Room 104"));
      assert.ok(html.includes("Key"));
      assert.ok(html.includes("LKR"));
      assert.ok(html.includes("~USD"));
    });

    it("renders cart button with item count and formatted price when cart is openable", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestHeaderBar, {
          hotelName: "Galle Fort Lighthouse Villa",
          locationDisplayName: "Room 104",
          cartItemCount: 3,
          cartTotalLkr: 6200,
          onOpenCart: () => {
            /* no-op */
          },
        }),
      );

      assert.ok(html.includes("Cart"));
      assert.ok(html.includes("3"));
      assert.ok(html.includes("LKR") && html.includes("6,200.00"));
      assert.ok(html.includes('aria-label="View Cart (3 items, LKR 6,200.00)"'));
    });

    it("supports search toggle button when onSearchToggle is passed", () => {
      const html = renderToStaticMarkup(
        React.createElement(GuestHeaderBar, {
          onSearchToggle: () => {
            /* no-op */
          },
          isSearchOpen: true,
        }),
      );

      assert.ok(html.includes("Search"));
      assert.ok(html.includes('aria-label="Close menu search"'));
    });

    it("verifies all exported interfaces and types are constructible", () => {
      const currency: DisplayCurrency = "LKR";
      const langProps: LanguageSegmentedControlProps = {
        currentLanguage: "en",
        onSelectLanguage: () => {
          /* no-op */
        },
      };
      const currProps: CurrencySegmentedControlProps = {
        activeCurrency: "USD",
        onSelectCurrency: () => {
          /* no-op */
        },
      };
      const barProps: GuestHeaderBarProps = {
        hotelName: "Villa",
      };

      assert.ok(currency && langProps && currProps && barProps);
      assert.strictEqual(DEFAULT_USD_EXCHANGE_RATE, 310.0);
    });
  });
});
