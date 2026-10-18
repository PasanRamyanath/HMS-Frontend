import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type AdminParams,
  type AdminRoute,
  type AppRoute,
  type BookingParams,
  type BookingRoute,
  Link,
  type LinkProps,
  type NavigateOptions,
  type QrStayParams,
  type QrStayRoute,
  type RouteKind,
  type RouteState,
  type SimpleRoute,
  type StaffParams,
  type StaffRoute,
  executeViewTransition,
  getCurrentPath,
  navigateTo,
  parseRoute,
  subscribeToRoute,
  useRoute,
} from "../src/lib/router.js";

describe("URL-Based Router & Apple Spring Transitions (router.ts)", () => {
  describe("Route Parsing (parseRoute)", () => {
    it("parses home route on '/' or empty path", () => {
      assert.deepStrictEqual(parseRoute("/"), { kind: "HOME", path: "/", params: {} });
      assert.deepStrictEqual(parseRoute(""), { kind: "HOME", path: "", params: {} });
      assert.deepStrictEqual(parseRoute("/?ref=qr"), { kind: "HOME", path: "/", params: {} });
    });

    it("parses static auth routes (/login, /register)", () => {
      assert.deepStrictEqual(parseRoute("/login"), { kind: "LOGIN", path: "/login", params: {} });
      assert.deepStrictEqual(parseRoute("/login/"), { kind: "LOGIN", path: "/login", params: {} });
      assert.deepStrictEqual(parseRoute("/register"), {
        kind: "REGISTER",
        path: "/register",
        params: {},
      });
      assert.deepStrictEqual(parseRoute("/register/"), {
        kind: "REGISTER",
        path: "/register",
        params: {},
      });
    });

    it("parses guest QR stay route (/qr/:tenantId/:locationId)", () => {
      const parsed = parseRoute("/qr/mirissa-resort/room-301");
      assert.strictEqual(parsed.kind, "QR_STAY");
      if (parsed.kind === "QR_STAY") {
        assert.strictEqual(parsed.params.tenantId, "mirissa-resort");
        assert.strictEqual(parsed.params.locationId, "room-301");
        assert.strictEqual(parsed.path, "/qr/mirissa-resort/room-301");
      }
    });

    it("parses booking portal route (/book/:tenantId)", () => {
      const parsed = parseRoute("/book/nuwara-eliya-heritage");
      assert.strictEqual(parsed.kind, "BOOKING");
      if (parsed.kind === "BOOKING") {
        assert.strictEqual(parsed.params.tenantId, "nuwara-eliya-heritage");
        assert.strictEqual(parsed.path, "/book/nuwara-eliya-heritage");
      }
    });

    it("parses staff portal route (/staff and /staff/:view)", () => {
      const defaultStaff = parseRoute("/staff");
      assert.strictEqual(defaultStaff.kind, "STAFF");
      if (defaultStaff.kind === "STAFF") {
        assert.strictEqual(defaultStaff.params.view, "dashboard");
      }

      const kdsStaff = parseRoute("/staff/kds");
      assert.strictEqual(kdsStaff.kind, "STAFF");
      if (kdsStaff.kind === "STAFF") {
        assert.strictEqual(kdsStaff.params.view, "kds");
      }

      const posStaff = parseRoute("/staff/pos/");
      assert.strictEqual(posStaff.kind, "STAFF");
      if (posStaff.kind === "STAFF") {
        assert.strictEqual(posStaff.params.view, "pos");
      }
    });

    it("parses admin PMS portal route (/admin and /admin/:module)", () => {
      const defaultAdmin = parseRoute("/admin");
      assert.strictEqual(defaultAdmin.kind, "ADMIN");
      if (defaultAdmin.kind === "ADMIN") {
        assert.strictEqual(defaultAdmin.params.module, "dashboard");
      }

      const tapeChart = parseRoute("/admin/tape-chart");
      assert.strictEqual(tapeChart.kind, "ADMIN");
      if (tapeChart.kind === "ADMIN") {
        assert.strictEqual(tapeChart.params.module, "tape-chart");
      }

      const folios = parseRoute("/admin/folios?currency=LKR#tab-settled");
      assert.strictEqual(folios.kind, "ADMIN");
      if (folios.kind === "ADMIN") {
        assert.strictEqual(folios.params.module, "folios");
      }
    });

    it("returns NOT_FOUND for unknown routes", () => {
      assert.deepStrictEqual(parseRoute("/invalid/unknown/route"), {
        kind: "NOT_FOUND",
        path: "/invalid/unknown/route",
        params: {},
      });
    });
  });

  describe("View Transitions Execution (executeViewTransition)", () => {
    it("executes update callback directly when document.startViewTransition is absent", () => {
      let executed = false;
      executeViewTransition(() => {
        executed = true;
      });
      assert.strictEqual(executed, true);
    });

    it("calls document.startViewTransition when available", () => {
      let transitionCalled = false;
      let callbackExecuted = false;

      const mockDoc = {
        startViewTransition: (cb: () => void) => {
          transitionCalled = true;
          cb();
        },
      };

      (globalThis as unknown as { document: unknown }).document = mockDoc;

      executeViewTransition(() => {
        callbackExecuted = true;
      });

      assert.strictEqual(transitionCalled, true);
      assert.strictEqual(callbackExecuted, true);

      (globalThis as unknown as { document?: unknown }).document = undefined;
    });
  });

  describe("Navigation & Route Subscriptions (navigateTo & subscribeToRoute)", () => {
    it("notifies registered subscribers on navigateTo", () => {
      let callCount = 0;
      const unsubscribe = subscribeToRoute(() => {
        callCount++;
      });

      const mockHistory = {
        pushState: (_state: unknown, _title: string, _url: string) => {
          /* mock pushState */
        },
        replaceState: (_state: unknown, _title: string, _url: string) => {
          /* mock replaceState */
        },
      };

      (globalThis as unknown as { window: unknown }).window = {
        history: mockHistory,
        location: { pathname: "/", search: "", hash: "" },
        addEventListener: (_event: string, _cb: unknown) => {
          /* mock addEventListener */
        },
        removeEventListener: (_event: string, _cb: unknown) => {
          /* mock removeEventListener */
        },
      };

      navigateTo("/admin/tape-chart", { skipTransition: true });
      assert.strictEqual(callCount, 1);

      navigateTo("/staff/kds", { replace: true, skipTransition: true });
      assert.strictEqual(callCount, 2);

      unsubscribe();
      navigateTo("/login", { skipTransition: true });
      assert.strictEqual(callCount, 2);

      (globalThis as unknown as { window?: unknown }).window = undefined;
    });

    it("getCurrentPath returns / when window is undefined", () => {
      assert.strictEqual(getCurrentPath(), "/");
    });
  });

  describe("Type Checking & Component Exports", () => {
    it("ensures all route types, params, and components are validly typed", () => {
      const qrParams: QrStayParams = { tenantId: "t1", locationId: "l1" };
      const bookParams: BookingParams = { tenantId: "t1" };
      const staffParams: StaffParams = { view: "kds" };
      const adminParams: AdminParams = { module: "folios" };

      const qrRoute: QrStayRoute = { kind: "QR_STAY", path: "/qr/t1/l1", params: qrParams };
      const bookRoute: BookingRoute = { kind: "BOOKING", path: "/book/t1", params: bookParams };
      const staffRoute: StaffRoute = { kind: "STAFF", path: "/staff/kds", params: staffParams };
      const adminRoute: AdminRoute = { kind: "ADMIN", path: "/admin/folios", params: adminParams };
      const simpleRoute: SimpleRoute = { kind: "HOME", path: "/", params: {} };

      const allRoutes: ReadonlyArray<AppRoute> = [
        qrRoute,
        bookRoute,
        staffRoute,
        adminRoute,
        simpleRoute,
      ];

      const testKind: RouteKind = "QR_STAY";
      assert.strictEqual(testKind, "QR_STAY");
      assert.strictEqual(allRoutes.length, 5);

      const navOpts: NavigateOptions = { replace: true, skipTransition: false };
      assert.strictEqual(navOpts.replace, true);

      const routeState: RouteState = {
        route: simpleRoute,
        path: "/",
        searchParams: new URLSearchParams(),
        navigate: () => {
          /* mock navigate */
        },
      };
      assert.ok(routeState);

      const linkProps: LinkProps = {
        href: "/admin",
        children: "Admin Portal",
      };
      assert.ok(linkProps.children);
      assert.ok(typeof Link === "function");
      assert.ok(typeof useRoute === "function");
    });
  });
});
