import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type BentoSpan,
  GlassCard,
  type GlassCardClassOptions,
  GlassCardContent,
  type GlassCardContentProps,
  GlassCardDescription,
  type GlassCardDescriptionProps,
  type GlassCardElement,
  GlassCardFooter,
  type GlassCardFooterProps,
  GlassCardHeader,
  type GlassCardHeaderProps,
  type GlassCardProps,
  GlassCardTitle,
  type GlassCardTitleProps,
  type GlassMaterial,
  type GlassRadius,
  getColSpanClass,
  getGlassCardClasses,
  getMaterialClass,
  getRadiusClass,
  getRowSpanClass,
} from "../src/components/GlassCard.js";

describe("Apple HIG Liquid Glass Card & Bento Surface Primitive (GlassCard.tsx)", () => {
  describe("Material Classes (getMaterialClass)", () => {
    it("returns correct CSS class for all Apple HIG materials", () => {
      assert.strictEqual(getMaterialClass("ultraThin"), "apple-material-ultra-thin");
      assert.strictEqual(getMaterialClass("thin"), "apple-material-thin");
      assert.strictEqual(getMaterialClass("regular"), "apple-material-regular");
      assert.strictEqual(getMaterialClass("thick"), "apple-material-thick");
      assert.strictEqual(getMaterialClass("elevated"), "apple-material-elevated");
      assert.strictEqual(getMaterialClass(undefined), "apple-material-regular");
    });
  });

  describe("Squircle Radius Classes (getRadiusClass)", () => {
    it("returns correct CSS class for all squircle radii", () => {
      assert.strictEqual(getRadiusClass("none"), "rounded-none");
      assert.strictEqual(getRadiusClass("sm"), "squircle-sm");
      assert.strictEqual(getRadiusClass("md"), "squircle-md");
      assert.strictEqual(getRadiusClass("lg"), "squircle-lg");
      assert.strictEqual(getRadiusClass("xl"), "squircle-xl");
      assert.strictEqual(getRadiusClass(undefined), "squircle-lg");
    });
  });

  describe("Bento Grid Spans (getColSpanClass & getRowSpanClass)", () => {
    it("returns correct col-span classes for bento layouts", () => {
      assert.strictEqual(getColSpanClass(1), "col-span-1");
      assert.strictEqual(getColSpanClass(2), "col-span-1 md:col-span-2");
      assert.strictEqual(getColSpanClass(3), "col-span-1 md:col-span-3");
      assert.strictEqual(getColSpanClass(4), "col-span-1 md:col-span-4");
      assert.strictEqual(getColSpanClass("full"), "col-span-full");
      assert.strictEqual(getColSpanClass(undefined), "");
    });

    it("returns correct row-span classes for bento layouts", () => {
      assert.strictEqual(getRowSpanClass(1), "row-span-1");
      assert.strictEqual(getRowSpanClass(2), "row-span-2");
      assert.strictEqual(getRowSpanClass(3), "row-span-3");
      assert.strictEqual(getRowSpanClass(4), "row-span-4");
      assert.strictEqual(getRowSpanClass("full"), "row-span-full");
      assert.strictEqual(getRowSpanClass(undefined), "");
    });
  });

  describe("Class Aggregation (getGlassCardClasses)", () => {
    it("combines default options into cohesive class list", () => {
      const classes = getGlassCardClasses({});
      assert.ok(classes.includes("relative"));
      assert.ok(classes.includes("apple-material-regular"));
      assert.ok(classes.includes("squircle-lg"));
    });

    it("applies interactive and tabular-nums tokens when specified", () => {
      const classes = getGlassCardClasses({
        material: "elevated",
        radius: "xl",
        interactive: true,
        tabularNums: true,
        colSpan: 2,
        rowSpan: 1,
        className: "custom-class",
      });
      assert.ok(classes.includes("apple-material-elevated"));
      assert.ok(classes.includes("squircle-xl"));
      assert.ok(classes.includes("cursor-pointer"));
      assert.ok(classes.includes("apple-touch-target"));
      assert.ok(classes.includes("tabular-nums-lkr"));
      assert.ok(classes.includes("col-span-1 md:col-span-2"));
      assert.ok(classes.includes("row-span-1"));
      assert.ok(classes.includes("custom-class"));
    });

    it("applies disabled classes when disabled is true", () => {
      const classes = getGlassCardClasses({ disabled: true });
      assert.ok(classes.includes("opacity-50"));
      assert.ok(classes.includes("cursor-not-allowed"));
    });
  });

  describe("HTML Rendering with Static Markup", () => {
    it("renders basic GlassCard div with children", () => {
      const markup = renderToStaticMarkup(
        React.createElement(GlassCard, null, React.createElement("span", null, "Sri Lanka HMS")),
      );
      assert.ok(markup.startsWith("<div"));
      assert.ok(markup.includes("apple-material-regular"));
      assert.ok(markup.includes("Sri Lanka HMS"));
    });

    it("renders polymorphic tags like article and section", () => {
      const articleMarkup = renderToStaticMarkup(
        React.createElement(
          GlassCard,
          { as: "article" },
          React.createElement("p", null, "Article Card"),
        ),
      );
      assert.ok(articleMarkup.startsWith("<article"));

      const sectionMarkup = renderToStaticMarkup(
        React.createElement(
          GlassCard,
          { as: "section" },
          React.createElement("p", null, "Section Card"),
        ),
      );
      assert.ok(sectionMarkup.startsWith("<section"));
    });

    it("renders interactive card with accessibility role and tabIndex", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          GlassCard,
          { interactive: true, as: "div" },
          React.createElement("span", null, "Clickable Card"),
        ),
      );
      assert.ok(markup.includes('role="button"'));
      assert.ok(markup.includes('tabindex="0"'));
      assert.ok(markup.includes("apple-touch-target"));
    });

    it("renders button without duplicate role='button'", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          GlassCard,
          { as: "button", interactive: true },
          React.createElement("span", null, "Action Button"),
        ),
      );
      assert.ok(markup.startsWith("<button"));
      assert.ok(!markup.includes('role="button"'));
    });

    it("renders complete Bento Card structure with compound subcomponents", () => {
      const markup = renderToStaticMarkup(
        React.createElement(
          GlassCard,
          { material: "elevated", radius: "xl", colSpan: 2, tabularNums: true },
          React.createElement(
            GlassCard.Header,
            null,
            React.createElement(GlassCard.Title, { as: "h2" }, "Mirissa Deluxe Suite 301"),
            React.createElement(GlassCard.Description, null, "Ocean View • Check-in Active"),
          ),
          React.createElement(
            GlassCard.Content,
            null,
            React.createElement("span", { className: "rate" }, "LKR 42,500.00"),
          ),
          React.createElement(
            GlassCard.Footer,
            null,
            React.createElement("button", { type: "button" }, "Manage Folio"),
          ),
        ),
      );

      assert.ok(markup.includes("apple-material-elevated"));
      assert.ok(markup.includes("squircle-xl"));
      assert.ok(markup.includes("<h2"));
      assert.ok(markup.includes("Mirissa Deluxe Suite 301"));
      assert.ok(markup.includes("Ocean View • Check-in Active"));
      assert.ok(markup.includes("LKR 42,500.00"));
      assert.ok(markup.includes("Manage Folio"));
    });

    it("renders standalone subcomponents independently", () => {
      const headerMarkup = renderToStaticMarkup(
        React.createElement(GlassCardHeader, null, "Header"),
      );
      assert.ok(headerMarkup.includes("Header"));

      const titleMarkup = renderToStaticMarkup(
        React.createElement(GlassCardTitle, { as: "h1" }, "Title"),
      );
      assert.ok(titleMarkup.startsWith("<h1"));

      const descMarkup = renderToStaticMarkup(
        React.createElement(GlassCardDescription, null, "Desc"),
      );
      assert.ok(descMarkup.startsWith("<p"));

      const contentMarkup = renderToStaticMarkup(
        React.createElement(GlassCardContent, null, "Content"),
      );
      assert.ok(contentMarkup.includes("Content"));

      const footerMarkup = renderToStaticMarkup(
        React.createElement(GlassCardFooter, null, "Footer"),
      );
      assert.ok(footerMarkup.includes("Footer"));
    });
  });

  describe("Type Checking & Verification", () => {
    it("validates all exported types are constructible", () => {
      const _mat: GlassMaterial = "thick";
      const _rad: GlassRadius = "md";
      const _span: BentoSpan = "full";
      const _elem: GlassCardElement = "article";
      const _cardProps: GlassCardProps = {
        material: _mat,
        radius: _rad,
        colSpan: _span,
        as: _elem,
      };
      const _classOptions: GlassCardClassOptions = {
        material: _mat,
        radius: _rad,
        colSpan: _span,
      };
      const _headerProps: GlassCardHeaderProps = {};
      const _titleProps: GlassCardTitleProps = { as: "h3" };
      const _descProps: GlassCardDescriptionProps = {};
      const _contentProps: GlassCardContentProps = {};
      const _footerProps: GlassCardFooterProps = {};

      assert.strictEqual(_cardProps.material, "thick");
      assert.strictEqual(_cardProps.radius, "md");
      assert.strictEqual(_classOptions.material, "thick");
      assert.strictEqual(_titleProps.as, "h3");
      assert.ok(_headerProps !== undefined);
      assert.ok(_descProps !== undefined);
      assert.ok(_contentProps !== undefined);
      assert.ok(_footerProps !== undefined);
    });
  });
});
