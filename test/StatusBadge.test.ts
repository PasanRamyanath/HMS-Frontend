import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StatusBadge,
  type StatusBadgeProps,
  type StatusBadgeSize,
  type StatusColor,
  formatStatusLabel,
  getFolioStatusColor,
  getHousekeepingStatusColor,
  getOrderStatusColor,
  getSaasPlanTierColor,
  getStatusBadgeClasses,
  getStatusColorClasses,
  getStatusSizeClasses,
  resolveStatusColor,
} from "../src/components/StatusBadge.js";

describe("Apple Semantic Vibrancy Status Pill Component (StatusBadge.tsx)", () => {
  describe("Order Status Color Mapping (getOrderStatusColor)", () => {
    it("maps delivery and payment confirmed states to green", () => {
      assert.strictEqual(getOrderStatusColor("PAID"), "green");
      assert.strictEqual(getOrderStatusColor("DELIVERED"), "green");
      assert.strictEqual(getOrderStatusColor("SERVED"), "green");
    });

    it("maps ready states to blue", () => {
      assert.strictEqual(getOrderStatusColor("READY_FOR_PICKUP"), "blue");
      assert.strictEqual(getOrderStatusColor("READY"), "blue");
    });

    it("maps transit and confirmed states to indigo", () => {
      assert.strictEqual(getOrderStatusColor("IN_TRANSIT"), "indigo");
      assert.strictEqual(getOrderStatusColor("CONFIRMED"), "indigo");
    });

    it("maps kitchen preparation and submission to amber", () => {
      assert.strictEqual(getOrderStatusColor("SUBMITTED"), "amber");
      assert.strictEqual(getOrderStatusColor("PENDING"), "amber");
      assert.strictEqual(getOrderStatusColor("ACKNOWLEDGED"), "amber");
      assert.strictEqual(getOrderStatusColor("IN_PREPARATION"), "amber");
    });

    it("maps cancelled state to red and unknown to gray", () => {
      assert.strictEqual(getOrderStatusColor("CANCELLED"), "red");
      assert.strictEqual(getOrderStatusColor("UNKNOWN_STATUS"), "gray");
    });
  });

  describe("Housekeeping Status Color Mapping (getHousekeepingStatusColor)", () => {
    it("maps CLEAN to green and INSPECTED to blue", () => {
      assert.strictEqual(getHousekeepingStatusColor("CLEAN"), "green");
      assert.strictEqual(getHousekeepingStatusColor("INSPECTED"), "blue");
    });

    it("maps TOUCH_UP and IN_PROGRESS to amber", () => {
      assert.strictEqual(getHousekeepingStatusColor("TOUCH_UP"), "amber");
      assert.strictEqual(getHousekeepingStatusColor("IN_PROGRESS"), "amber");
    });

    it("maps DIRTY and OUT_OF_ORDER to red", () => {
      assert.strictEqual(getHousekeepingStatusColor("DIRTY"), "red");
      assert.strictEqual(getHousekeepingStatusColor("OUT_OF_ORDER"), "red");
      assert.strictEqual(getHousekeepingStatusColor("OUT_OF_SERVICE"), "red");
    });

    it("maps DO_NOT_DISTURB to gray", () => {
      assert.strictEqual(getHousekeepingStatusColor("DO_NOT_DISTURB"), "gray");
    });
  });

  describe("Folio Status Color Mapping (getFolioStatusColor)", () => {
    it("maps SETTLED to green, OPEN to amber, and VOIDED to red", () => {
      assert.strictEqual(getFolioStatusColor("SETTLED"), "green");
      assert.strictEqual(getFolioStatusColor("OPEN"), "amber");
      assert.strictEqual(getFolioStatusColor("TRANSFERRED"), "indigo");
      assert.strictEqual(getFolioStatusColor("VOIDED"), "red");
      assert.strictEqual(getFolioStatusColor("VOID"), "red");
      assert.strictEqual(getFolioStatusColor("CLOSED"), "gray");
    });
  });

  describe("SaaS Plan Tier Color Mapping (getSaasPlanTierColor)", () => {
    it("maps enterprise tiers to green, pro to blue, starter to amber", () => {
      assert.strictEqual(getSaasPlanTierColor("ENTERPRISE_CHAIN"), "green");
      assert.strictEqual(getSaasPlanTierColor("ENTERPRISE"), "green");
      assert.strictEqual(getSaasPlanTierColor("PRO_RESORT"), "blue");
      assert.strictEqual(getSaasPlanTierColor("PROFESSIONAL"), "blue");
      assert.strictEqual(getSaasPlanTierColor("STARTER_VILLA"), "amber");
      assert.strictEqual(getSaasPlanTierColor("STANDARD"), "amber");
      assert.strictEqual(getSaasPlanTierColor("FREE_FOREVER"), "gray");
    });
  });

  describe("Auto Resolution & Formatting", () => {
    it("resolves status color dynamically across hospitality entities", () => {
      assert.strictEqual(resolveStatusColor("CLEAN"), "green");
      assert.strictEqual(resolveStatusColor("DIRTY"), "red");
      assert.strictEqual(resolveStatusColor("SETTLED"), "green");
      assert.strictEqual(resolveStatusColor("PRO_RESORT"), "blue");
      assert.strictEqual(resolveStatusColor("READY_FOR_PICKUP"), "blue");
    });

    it("formats SNAKE_CASE string into Title Case label", () => {
      assert.strictEqual(formatStatusLabel("READY_FOR_PICKUP"), "Ready For Pickup");
      assert.strictEqual(formatStatusLabel("IN_PREPARATION"), "In Preparation");
      assert.strictEqual(formatStatusLabel("CLEAN"), "Clean");
    });
  });

  describe("CSS Class Utilities", () => {
    it("returns appropriate color tokens for all colors", () => {
      assert.ok(getStatusColorClasses("green").includes("bg-emerald-500/15"));
      assert.ok(getStatusColorClasses("blue").includes("bg-sky-500/15"));
      assert.ok(getStatusColorClasses("amber").includes("bg-amber-500/15"));
      assert.ok(getStatusColorClasses("red").includes("bg-rose-500/15"));
      assert.ok(getStatusColorClasses("indigo").includes("bg-indigo-500/15"));
      assert.ok(getStatusColorClasses("gray").includes("bg-slate-500/15"));
    });

    it("returns appropriate sizing tokens", () => {
      assert.ok(getStatusSizeClasses("sm").includes("text-[11px]"));
      assert.ok(getStatusSizeClasses("md").includes("text-xs"));
      assert.ok(getStatusSizeClasses("lg").includes("text-sm"));
    });

    it("aggregates full badge classes", () => {
      const classes = getStatusBadgeClasses("green", "lg", "custom-class");
      assert.ok(classes.includes("rounded-full"));
      assert.ok(classes.includes("bg-emerald-500/15"));
      assert.ok(classes.includes("text-sm"));
      assert.ok(classes.includes("custom-class"));
    });
  });

  describe("Static HTML Markup Rendering", () => {
    it("renders status badge with indicator dot and auto-formatted label", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StatusBadge, {
          status: "IN_PREPARATION",
        }),
      );

      assert.ok(markup.startsWith("<span"));
      assert.ok(markup.includes("bg-amber-500/15"));
      assert.ok(markup.includes("In Preparation"));
      assert.ok(markup.includes("rounded-full shrink-0 bg-current"));
    });

    it("renders pulse animation when pulse is true", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StatusBadge, {
          status: "READY_FOR_PICKUP",
          pulse: true,
        }),
      );

      assert.ok(markup.includes("animate-pulse"));
      assert.ok(markup.includes("Ready For Pickup"));
      assert.ok(markup.includes("bg-sky-500/15"));
    });

    it("omits indicator dot when showDot is false", () => {
      const markup = renderToStaticMarkup(
        React.createElement(StatusBadge, {
          status: "CLEAN",
          showDot: false,
          label: "Sanitized & Inspected",
        }),
      );

      assert.ok(!markup.includes("rounded-full shrink-0 bg-current"));
      assert.ok(markup.includes("Sanitized &amp; Inspected"));
      assert.ok(markup.includes("bg-emerald-500/15"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("validates all exported types are constructible", () => {
      const _color: StatusColor = "indigo";
      const _size: StatusBadgeSize = "sm";
      const _props: StatusBadgeProps = {
        status: "DELIVERED",
        label: "Delivered to Cabana",
        color: _color,
        size: _size,
        showDot: true,
        pulse: false,
        className: "badge-test",
      };

      assert.strictEqual(_props.color, "indigo");
      assert.strictEqual(_props.size, "sm");
      assert.strictEqual(_props.status, "DELIVERED");
    });
  });
});
