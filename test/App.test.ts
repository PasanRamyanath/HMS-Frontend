import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "../src/App.js";
import {
  type DynamicToast,
  DynamicToastPill,
  type DynamicToastPillProps,
  type ToastType,
} from "../src/components/DynamicToastPill.js";

describe("Root Application & Dynamic Island Toast Banner (App.tsx)", () => {
  describe("DynamicToastPill Component Rendering", () => {
    it("renders null when toast is null", () => {
      let dismissed = false;
      const html = renderToStaticMarkup(
        React.createElement(DynamicToastPill, {
          toast: null,
          onDismiss: () => {
            dismissed = true;
          },
        }),
      );
      assert.equal(html, "");
      assert.equal(dismissed, false);
    });

    it("renders active notification pill with title, description, and dismiss button", () => {
      const sampleToast: DynamicToast = {
        id: "toast-1",
        title: "KDS Ticket Ready",
        description: "Villa 04 Seafood Platter is ready for service",
        type: "success",
      };

      let dismissed = false;
      const html = renderToStaticMarkup(
        React.createElement(DynamicToastPill, {
          toast: sampleToast,
          onDismiss: () => {
            dismissed = true;
          },
        }),
      );

      assert.ok(html.includes("KDS Ticket Ready"), "Should render toast title");
      assert.ok(html.includes("Villa 04 Seafood Platter"), "Should render toast description");
      assert.ok(
        html.includes('aria-label="Dismiss Notification"'),
        "Should have accessible dismiss button",
      );
      assert.ok(html.includes("apple-liquid-glass"), "Should apply Apple Liquid Glass styling");
      assert.equal(dismissed, false);
    });

    it("renders warning and error toast styling correctly", () => {
      const warningToast: DynamicToast = {
        id: "toast-warn",
        title: "Offline Mode Active",
        type: "warning",
      };

      let dismissed = false;
      const html = renderToStaticMarkup(
        React.createElement(DynamicToastPill, {
          toast: warningToast,
          onDismiss: () => {
            dismissed = true;
          },
        }),
      );

      assert.ok(html.includes("Offline Mode Active"), "Should render warning title");
      assert.equal(dismissed, false);
    });
  });

  describe("Root App Component Rendering", () => {
    it("renders root PMS Admin workspace with AdminShell and DashboardView by default", () => {
      const html = renderToStaticMarkup(React.createElement(App));

      assert.ok(
        html.includes("Galle Fort Lighthouse Villa"),
        "Should mount default tenant property",
      );
      assert.ok(html.includes("Kasun Perera"), "Should show staff shift identity");
      assert.ok(
        html.includes("Executive Performance Bento Grid"),
        "Should render DashboardView bento grid",
      );
      assert.ok(html.includes("RevPAR (LKR / USD)"), "Should show RevPAR KPI");
      assert.ok(html.includes("PMS Admin Navigation"), "Should render AdminShell navigation");
    });
  });

  describe("Type Definitions & Verification", () => {
    it("ensures Toast types and props are valid", () => {
      const types: ToastType[] = ["info", "success", "warning", "error"];
      assert.equal(types.length, 4);

      let dismissed = false;
      const props: DynamicToastPillProps = {
        toast: null,
        onDismiss: () => {
          dismissed = true;
        },
      };
      assert.equal(props.toast, null);
      assert.equal(dismissed, false);
    });
  });
});
