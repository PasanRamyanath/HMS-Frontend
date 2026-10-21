import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RoleSimulatorBar,
  type RoleSimulatorBarProps,
  SIMULATOR_ROLES,
  type SimulatorRole,
  type SimulatorRoleConfig,
  getSimulatorRoleConfig,
} from "../src/components/RoleSimulatorBar.js";

describe("Step 468: Role-Switcher Simulator Bar for Local Demo & Training (RoleSimulatorBar.tsx)", () => {
  describe("1. Simulator Roles Catalog Integrity", () => {
    it("contains 6 standard operational roles for hospitality simulation", () => {
      assert.strictEqual(SIMULATOR_ROLES.length, 6);
      const roleIds = SIMULATOR_ROLES.map((r) => r.id);
      assert.ok(roleIds.includes("GUEST_QR"));
      assert.ok(roleIds.includes("KITCHEN_KDS"));
      assert.ok(roleIds.includes("WAITER_POS"));
      assert.ok(roleIds.includes("HOUSEKEEPING_RUNNER"));
      assert.ok(roleIds.includes("HOTEL_GM_ADMIN"));
      assert.ok(roleIds.includes("SUPER_ADMIN"));
    });

    it("verifies Guest QR role routes to Room 104 in Ceylon Sapphire Resort", () => {
      const guestQr = SIMULATOR_ROLES.find((r) => r.id === "GUEST_QR");
      assert.ok(guestQr !== undefined);
      assert.strictEqual(guestQr?.shortLabel, "QR");
      assert.ok(guestQr?.defaultRoute.includes("/qr/demo-ceylon-sapphire/104"));
      assert.ok(guestQr?.staffName.includes("Kasun Perera"));
    });

    it("verifies staff and admin personas have realistic titles and routes", () => {
      const kds = SIMULATOR_ROLES.find((r) => r.id === "KITCHEN_KDS");
      assert.strictEqual(kds?.defaultRoute, "/staff/kds");
      assert.ok(kds?.staffName.includes("Nuwan Kumara"));

      const pos = SIMULATOR_ROLES.find((r) => r.id === "WAITER_POS");
      assert.strictEqual(pos?.defaultRoute, "/staff/pos");

      const hk = SIMULATOR_ROLES.find((r) => r.id === "HOUSEKEEPING_RUNNER");
      assert.strictEqual(hk?.defaultRoute, "/staff/housekeeping");

      const gm = SIMULATOR_ROLES.find((r) => r.id === "HOTEL_GM_ADMIN");
      assert.strictEqual(gm?.defaultRoute, "/admin/dashboard");

      const sa = SIMULATOR_ROLES.find((r) => r.id === "SUPER_ADMIN");
      assert.strictEqual(sa?.defaultRoute, "/admin/super-admin");
    });
  });

  describe("2. Pure Role Configuration Resolver (getSimulatorRoleConfig)", () => {
    it("resolves config for each role accurately", () => {
      for (const r of SIMULATOR_ROLES) {
        const config = getSimulatorRoleConfig(r.id);
        assert.strictEqual(config.id, r.id);
        assert.strictEqual(config.title, r.title);
      }
    });

    it("falls back to default GUEST_QR config if given unmapped role", () => {
      const fallback = getSimulatorRoleConfig("UNKNOWN_ROLE" as SimulatorRole);
      assert.strictEqual(fallback.id, "GUEST_QR");
    });
  });

  describe("3. React 19 Static Markup & Apple HIG Design Compliance", () => {
    it("renders expanded simulator bar with liquid glass and all 6 role buttons", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoleSimulatorBar, {
          currentRole: "HOTEL_GM_ADMIN",
          onRoleChange: () => {
            /* test */
          },
        }),
      );

      // Apple HIG liquid glass styling
      assert.ok(html.includes("apple-liquid-glass"));
      assert.ok(html.includes('aria-label="Demo Role Simulator Bar"'));

      // Active persona details
      assert.ok(html.includes("Pasan Ramyanath (General Manager)"));

      // All 6 role buttons present
      assert.ok(html.includes("Guest QR (Room 104)"));
      assert.ok(html.includes("Kitchen KDS"));
      assert.ok(html.includes("Waiter POS"));
      assert.ok(html.includes("Housekeeping"));
      assert.ok(html.includes("Hotel GM Admin"));
      assert.ok(html.includes("Super Admin"));

      // Active role button pressed
      assert.ok(html.includes('aria-pressed="true"'));

      // Minimum 44x44pt touch targets
      assert.ok(html.includes("min-h-[44px]"));
    });

    it("renders Reset Demo Data button when callback is provided", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoleSimulatorBar, {
          currentRole: "GUEST_QR",
          onRoleChange: () => {
            /* test */
          },
          onResetDemoData: () => {
            /* test reset */
          },
        }),
      );

      assert.ok(html.includes('aria-label="Reset Demo Sandbox Data"'));
      assert.ok(html.includes("Reset"));
    });

    it("omits Reset button when onResetDemoData callback is undefined", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoleSimulatorBar, {
          currentRole: "GUEST_QR",
          onRoleChange: () => {
            /* test */
          },
        }),
      );

      assert.strictEqual(html.includes('aria-label="Reset Demo Sandbox Data"'), false);
    });

    it("renders collapsed compact floating pill when isCollapsedDefault is true", () => {
      const html = renderToStaticMarkup(
        React.createElement(RoleSimulatorBar, {
          currentRole: "KITCHEN_KDS",
          onRoleChange: () => {
            /* test */
          },
          isCollapsedDefault: true,
        }),
      );

      assert.ok(html.includes('aria-label="Expand Demo Role Simulator Bar"'));
      assert.ok(html.includes("Demo: KDS"));
      assert.ok(html.includes("rounded-full"));
    });

    it("verifies RoleSimulatorBarProps and SimulatorRoleConfig types are constructible", () => {
      const props: RoleSimulatorBarProps = {
        currentRole: "WAITER_POS",
        onRoleChange: () => {
          /* test */
        },
        isCollapsedDefault: false,
        className: "custom-simulator",
      };
      assert.strictEqual(props.currentRole, "WAITER_POS");

      const config: SimulatorRoleConfig = SIMULATOR_ROLES[0] as SimulatorRoleConfig;
      assert.strictEqual(config.id, "GUEST_QR");
    });
  });
});
