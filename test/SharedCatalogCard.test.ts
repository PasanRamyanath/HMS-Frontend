import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppleToggleSwitch,
  type AppleToggleSwitchProps,
  CatalogBadge,
  type CatalogBadgeProps,
  CatalogCardSurface,
  type CatalogCardSurfaceProps,
  CatalogPriceDisplay,
  type CatalogPriceDisplayProps,
  type TrilingualText,
  computeGrossMarginPct,
  formatCatalogPriceLkr,
  resolveCatalogTrilingual,
} from "../src/admin/menus/SharedCatalogCard.js";

describe("Step 250: Shared Apple HIG Catalog Card Primitives & Simplification (SharedCatalogCard.tsx)", () => {
  describe("1. Pure Utility Resolvers (formatCatalogPriceLkr, computeGrossMarginPct, resolveCatalogTrilingual)", () => {
    it("formats integer and decimal LKR amounts with correct decimal places", () => {
      assert.strictEqual(formatCatalogPriceLkr(1650), "LKR 1,650");
      assert.strictEqual(formatCatalogPriceLkr(2450.5), "LKR 2,450.50");
      assert.strictEqual(formatCatalogPriceLkr(0), "LKR 0");
      assert.strictEqual(formatCatalogPriceLkr(999999.99), "LKR 999,999.99");
    });

    it("computes accurate gross profit margin percentage", () => {
      // Selling: 1000, Cost: 400 -> Margin: 60%
      assert.strictEqual(computeGrossMarginPct(1000, 400), 60);
      // Selling: 1200, Cost: 450 -> Margin: 62.5%
      assert.strictEqual(computeGrossMarginPct(1200, 450), 62.5);
      // Selling 0 -> 0% safe guard
      assert.strictEqual(computeGrossMarginPct(0, 50), 0);
      // Selling less than cost (loss) -> negative percentage
      assert.strictEqual(computeGrossMarginPct(100, 150), -50);
    });

    it("resolves trilingual text with localized fallbacks", () => {
      const sample: TrilingualText = {
        en: "Ceylon Spiced Tea",
        si: "සිලෝන් කුළුබඩු තේ",
        ta: "சிலோன் மசாலா தேநீர்",
      };

      assert.strictEqual(resolveCatalogTrilingual(sample, "en"), "Ceylon Spiced Tea");
      assert.strictEqual(resolveCatalogTrilingual(sample, "si"), "සිලෝන් කුළුබඩු තේ");
      assert.strictEqual(resolveCatalogTrilingual(sample, "ta"), "சிலோன் மசாலா தேநீர்");

      const partial: TrilingualText = {
        en: "Only English Name",
      };
      assert.strictEqual(resolveCatalogTrilingual(partial, "si"), "Only English Name");
      assert.strictEqual(resolveCatalogTrilingual(partial, "ta"), "Only English Name");
    });
  });

  describe("2. Apple HIG Toggle Switch (AppleToggleSwitch)", () => {
    it("renders accessible role='switch' with >= 44x44pt touch area", () => {
      const html = renderToStaticMarkup(
        React.createElement(AppleToggleSwitch, {
          checked: true,
          onChange: () => {
            /* no-op */
          },
          ariaLabel: "Toggle stock status",
          testId: "apple-toggle-active",
        }),
      );

      assert.ok(html.includes('role="switch"'));
      assert.ok(html.includes('aria-checked="true"'));
      assert.ok(html.includes('aria-label="Toggle stock status"'));
      assert.ok(html.includes("min-h-[44px]"));
      assert.ok(html.includes("min-w-[44px]"));
      assert.ok(html.includes("translate-x-5"));
      assert.ok(html.includes('data-testid="apple-toggle-active"'));
    });

    it("renders unchecked state with translate-x-0 thumb transition", () => {
      const html = renderToStaticMarkup(
        React.createElement(AppleToggleSwitch, {
          checked: false,
          onChange: () => {
            /* no-op */
          },
          ariaLabel: "Toggle inactive status",
        }),
      );

      assert.ok(html.includes('aria-checked="false"'));
      assert.ok(html.includes("translate-x-0"));
      assert.ok(html.includes("bg-apple-gray-300"));
    });

    it("supports disabled attribute cleanly", () => {
      const html = renderToStaticMarkup(
        React.createElement(AppleToggleSwitch, {
          checked: true,
          disabled: true,
          onChange: () => {
            /* no-op */
          },
          ariaLabel: "Disabled switch",
        }),
      );

      assert.ok(html.includes("disabled"));
      assert.ok(html.includes("disabled:cursor-not-allowed"));
    });
  });

  describe("3. Liquid Glass Surface Card Container (CatalogCardSurface)", () => {
    it("renders standard active card with apple-liquid-glass and hover shadow", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          CatalogCardSurface,
          {
            isActive: true,
            isAvailable: true,
            testId: "test-card-active",
          },
          React.createElement("span", null, "Card Content"),
        ),
      );

      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes("rounded-2xl"));
      assert.ok(html.includes("border-white/50"));
      assert.ok(html.includes("hover:shadow-xl"));
      assert.ok(html.includes('data-testid="test-card-active"'));
      assert.ok(html.includes("Card Content"));
    });

    it("renders 86'd out-of-stock card with rose border and tinted background", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          CatalogCardSurface,
          {
            isActive: true,
            isAvailable: false,
            testId: "test-card-86d",
          },
          React.createElement("span", null, "86'd Dish"),
        ),
      );

      assert.ok(html.includes("border-rose-400/40"));
      assert.ok(html.includes("bg-rose-50/20"));
    });

    it("renders inactive/deactivated item with muted opacity-60", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          CatalogCardSurface,
          {
            isActive: false,
            testId: "test-card-inactive",
          },
          React.createElement("span", null, "Deactivated Item"),
        ),
      );

      assert.ok(html.includes("opacity-60"));
    });

    it("supports clickable role='button' when onClick is passed", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          CatalogCardSurface,
          {
            onClick: () => {
              /* no-op */
            },
          },
          React.createElement("span", null, "Clickable Card"),
        ),
      );

      assert.ok(html.includes('role="button"'));
      assert.ok(html.includes("cursor-pointer"));
      assert.ok(html.includes('tabindex="0"'));
    });
  });

  describe("4. Status Badges & Price Display (CatalogBadge & CatalogPriceDisplay)", () => {
    it("renders various badge variants correctly", () => {
      const compHtml = renderToStaticMarkup(
        React.createElement(CatalogBadge, {
          label: "Complimentary",
          variant: "complimentary",
        }),
      );
      assert.ok(compHtml.includes("Complimentary"));
      assert.ok(compHtml.includes("text-emerald-700"));

      const alcHtml = renderToStaticMarkup(
        React.createElement(CatalogBadge, {
          label: "21+ Liquor",
          variant: "alcoholic",
        }),
      );
      assert.ok(alcHtml.includes("21+ Liquor"));
      assert.ok(alcHtml.includes("text-purple-700"));

      const deptHtml = renderToStaticMarkup(
        React.createElement(CatalogBadge, {
          label: "Kitchen Station",
          variant: "station",
        }),
      );
      assert.ok(deptHtml.includes("Kitchen Station"));
      assert.ok(deptHtml.includes("text-indigo-700"));
    });

    it("renders CatalogPriceDisplay with tabular figures and optional margin pill", () => {
      const html = renderToStaticMarkup(
        React.createElement(CatalogPriceDisplay, {
          priceLkr: 2200,
          label: "Selling Price",
          marginPct: 65.4,
          testId: "price-display-test",
        }),
      );

      assert.ok(html.includes("Selling Price"));
      assert.ok(html.includes("LKR 2,200"));
      assert.ok(html.includes("tabular-nums"));
      assert.ok(html.includes("tabular-nums-lkr"));
      assert.ok(html.includes("65.4% margin"));
      assert.ok(html.includes('data-testid="price-display-test"'));
    });

    it("renders CatalogPriceDisplay with FREE when isComplimentary is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(CatalogPriceDisplay, {
          priceLkr: 0,
          isComplimentary: true,
        }),
      );

      assert.ok(html.includes("FREE"));
    });
  });

  describe("5. Type Definitions & Constructibility Verification", () => {
    it("verifies all exported interfaces and types are constructible", () => {
      const trilingual: TrilingualText = { en: "Test", si: "ටෙස්ට්", ta: "பரிசோதனை" };
      const toggleProps: AppleToggleSwitchProps = {
        checked: true,
        onChange: () => {
          /* no-op */
        },
        ariaLabel: "Test Switch",
      };
      const surfaceProps: CatalogCardSurfaceProps = {
        isActive: true,
        children: React.createElement("div"),
      };
      const priceProps: CatalogPriceDisplayProps = {
        priceLkr: 1000,
      };
      const badgeProps: CatalogBadgeProps = {
        label: "Pill",
      };

      assert.ok(trilingual && toggleProps && surfaceProps && priceProps && badgeProps);
    });
  });
});
