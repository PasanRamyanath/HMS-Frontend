import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ADMIN_NAV_ITEMS,
  AdminShell,
  type AdminShellProps,
  DEFAULT_PROPERTIES,
  type HotelPropertyOption,
  type NavItem,
  filterNavItemsForRole,
} from "../src/admin/layout/AdminShell.js";
import type { StaffRole } from "../src/lib/auth.js";

describe("macOS/iPadOS-Style Translucent Vibrancy Sidebar & Top Toolbar (AdminShell.tsx)", () => {
  describe("Navigation RBAC Role Filtering (filterNavItemsForRole)", () => {
    it("SUPER_ADMIN role receives full unfiltered access to all 13 modules", () => {
      const items = filterNavItemsForRole(ADMIN_NAV_ITEMS, "SUPER_ADMIN");
      assert.strictEqual(items.length, 13);
      assert.strictEqual(items.length, ADMIN_NAV_ITEMS.length);
    });

    it("HOTEL_ADMIN role receives managerial modules including tax, payroll, audit, and settings", () => {
      const items = filterNavItemsForRole(ADMIN_NAV_ITEMS, "HOTEL_ADMIN");
      const ids = items.map((i) => i.id);

      assert.ok(ids.includes("dashboard"));
      assert.ok(ids.includes("front-desk"));
      assert.ok(ids.includes("tax"));
      assert.ok(ids.includes("payroll"));
      assert.ok(ids.includes("settings"));
      assert.ok(ids.includes("audit"));
    });

    it("FRONT_DESK role receives operational modules but excludes tax, payroll, stores, menus, audit, settings", () => {
      const items = filterNavItemsForRole(ADMIN_NAV_ITEMS, "FRONT_DESK");
      const ids = items.map((i) => i.id);

      assert.ok(ids.includes("front-desk"));
      assert.ok(ids.includes("folios"));
      assert.ok(ids.includes("kds"));
      assert.ok(ids.includes("housekeeping"));
      assert.ok(ids.includes("banquets"));
      assert.ok(ids.includes("spa"));

      assert.strictEqual(ids.includes("tax"), false);
      assert.strictEqual(ids.includes("payroll"), false);
      assert.strictEqual(ids.includes("stores"), false);
      assert.strictEqual(ids.includes("settings"), false);
      assert.strictEqual(ids.includes("audit"), false);
    });

    it("KITCHEN_KDS and HOUSEKEEPING roles receive strictly scoped operational modules", () => {
      const kitchenItems = filterNavItemsForRole(ADMIN_NAV_ITEMS, "KITCHEN_KDS");
      assert.strictEqual(kitchenItems.length, 1);
      assert.strictEqual(kitchenItems[0]?.id, "kds");

      const hkItems = filterNavItemsForRole(ADMIN_NAV_ITEMS, "HOUSEKEEPING");
      assert.strictEqual(hkItems.length, 1);
      assert.strictEqual(hkItems[0]?.id, "housekeeping");
    });
  });

  describe("Constants & Default Configurations", () => {
    it("contains 13 standard PMS/ERP modules in ADMIN_NAV_ITEMS", () => {
      assert.strictEqual(ADMIN_NAV_ITEMS.length, 13);
      const labels = ADMIN_NAV_ITEMS.map((item) => item.label);
      assert.ok(labels.includes("Dashboard"));
      assert.ok(labels.includes("Front Desk & Tape Chart"));
      assert.ok(labels.includes("Folios & Cashier"));
      assert.ok(labels.includes("QR Orders & KDS"));
      assert.ok(labels.includes("SLTDA & IRD Tax"));
      assert.ok(labels.includes("HR & EPF/ETF Payroll"));
    });

    it("contains default Sri Lankan hotel properties", () => {
      assert.strictEqual(DEFAULT_PROPERTIES.length, 3);
      assert.strictEqual(DEFAULT_PROPERTIES[0]?.city, "Galle");
      assert.strictEqual(DEFAULT_PROPERTIES[1]?.city, "Kandy");
      assert.strictEqual(DEFAULT_PROPERTIES[2]?.city, "Mirissa");
    });
  });

  describe("Component Static Rendering (AdminShell)", () => {
    it("renders desktop sidebar, top operations toolbar, and workspace children", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          AdminShell,
          {
            currentModule: "front-desk",
            userRole: "HOTEL_ADMIN",
            staffName: "Kasun Perera",
            activeTenantName: "Galle Fort Lighthouse Villa",
          },
          React.createElement("div", { id: "tape-chart-view" }, "Tape Chart Workspace"),
        ),
      );

      assert.ok(html.includes("Sri Lanka HMS"));
      assert.ok(html.includes("Desktop Navigation Sidebar"));
      assert.ok(html.includes("Top Operations Toolbar"));
      assert.ok(html.includes("Front Desk &amp; Tape Chart"));
      assert.ok(html.includes("Kasun Perera"));
      assert.ok(html.includes("HOTEL_ADMIN"));
      assert.ok(html.includes("Select Active Hotel Property"));
      assert.ok(html.includes("⌘K"));
      assert.ok(html.includes("Toggle Dark/Light Appearance"));
      assert.ok(html.includes("Tape Chart Workspace"));
    });

    it("renders fallback placeholder when children are omitted", () => {
      const html = renderToStaticMarkup(
        React.createElement(AdminShell, {
          currentModule: "dashboard",
          activeTenantName: "Kandy Mountain Bungalow",
        }),
      );

      assert.ok(html.includes("Kandy Mountain Bungalow"));
      assert.ok(html.includes("Active Module:"));
      assert.ok(html.includes("dashboard"));
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies NavItem, HotelPropertyOption, and AdminShellProps are constructible", () => {
      const prop: HotelPropertyOption = {
        id: "tenant-1",
        name: "Bentota Lagoon Villa",
        city: "Bentota",
      };

      const nav: NavItem = {
        id: "test",
        label: "Test Module",
        path: "/admin/test",
        iconName: "chart-bar",
        allowedRoles: ["HOTEL_ADMIN"],
      };

      const shellProps: AdminShellProps = {
        currentModule: "dashboard",
        userRole: "SUPER_ADMIN" as StaffRole,
        properties: [prop],
        children: null,
      };

      assert.strictEqual(prop.city, "Bentota");
      assert.strictEqual(nav.id, "test");
      assert.strictEqual(shellProps.userRole, "SUPER_ADMIN");
    });
  });
});
