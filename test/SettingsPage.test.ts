import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SETTINGS_SEGMENTED_OPTIONS,
  SETTINGS_TABS,
  SettingsPage,
  type SettingsPageProps,
  type SettingsTab,
  type SettingsTabId,
} from "../src/admin/settings/SettingsPage.js";

describe("Settings Tab Router & Unified Configuration View (SettingsPage.tsx)", () => {
  describe("Tab Definitions & Segmented Options", () => {
    it("defines exactly 6 core hotel management configuration tabs", () => {
      assert.equal(SETTINGS_TABS.length, 6);
      const tabIds: SettingsTabId[] = SETTINGS_TABS.map((t) => t.id);
      assert.deepEqual(tabIds, ["PROFILE", "TAXES", "PAYMENTS", "SMS", "STAFF", "BILLING"]);
    });

    it("ensures each tab has descriptive labels and metadata", () => {
      for (const tab of SETTINGS_TABS) {
        assert.ok(tab.label.length > 0);
        assert.ok(tab.shortLabel.length > 0);
        assert.ok(tab.description.length > 10);
      }
    });

    it("exports 6 segmented control options matching tab IDs", () => {
      assert.equal(SETTINGS_SEGMENTED_OPTIONS.length, 6);
      const optionIds = SETTINGS_SEGMENTED_OPTIONS.map((o) => o.id);
      assert.deepEqual(optionIds, ["PROFILE", "TAXES", "PAYMENTS", "SMS", "STAFF", "BILLING"]);
    });
  });

  describe("Component Static Markup & Tab Switching", () => {
    it("renders default Profile tab with PropertyProfileForm", () => {
      const props: SettingsPageProps = {
        propertyTitle: "Galle Fort Lighthouse Villa",
        initialTab: "PROFILE",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("Galle Fort Lighthouse Villa — Property Profile"));
      assert.ok(html.includes("SLTDA"));
    });

    it("renders Taxes tab with Statutory Tax Configurator", () => {
      const props: SettingsPageProps = {
        initialTab: "TAXES",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("Taxes &amp; Compliance"));
      assert.ok(html.includes("Service Charge"));
      assert.ok(html.includes("TDL"));
      assert.ok(html.includes("SSCL"));
      assert.ok(html.includes("VAT"));
    });

    it("renders Payments tab with Payment Settings and CBSL Exchange Rate Card", () => {
      const props: SettingsPageProps = {
        initialTab: "PAYMENTS",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("Payments &amp; Currency"));
      assert.ok(html.includes("LankaQR") || html.includes("PayHere"));
      assert.ok(html.includes("CBSL") || html.includes("Exchange"));
    });

    it("renders SMS Notifications tab with SMS settings form", () => {
      const props: SettingsPageProps = {
        initialTab: "SMS",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("SMS Notifications"));
      assert.ok(html.includes("SMSGo.lk") || html.includes("Notify.lk"));
    });

    it("renders Staff & Service Charge tab with StaffUserManager", () => {
      const props: SettingsPageProps = {
        initialTab: "STAFF",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("Staff &amp; Service Charge"));
      assert.ok(html.includes("Kavinda Fernando") || html.includes("Staff"));
    });

    it("renders SaaS Billing tab with SaasBillingCard", () => {
      const props: SettingsPageProps = {
        initialTab: "BILLING",
      };

      const html = renderToStaticMarkup(React.createElement(SettingsPage, props));
      assert.ok(html.includes("SaaS Subscription"));
      assert.ok(html.includes("Cloud HMS Plan") || html.includes("Pro Resort"));
    });

    it("toggles onboarding banner visibility via showOnboardingBanner prop", () => {
      const withBanner = renderToStaticMarkup(
        React.createElement(SettingsPage, {
          initialTab: "PROFILE",
          showOnboardingBanner: true,
        }),
      );
      assert.ok(withBanner.includes("Setup Checklist") || withBanner.includes("Readiness"));

      const withoutBanner = renderToStaticMarkup(
        React.createElement(SettingsPage, {
          initialTab: "PROFILE",
          showOnboardingBanner: false,
        }),
      );
      assert.equal(withoutBanner.includes("Setup Checklist"), false);
    });
  });

  describe("Type Definitions & Verification", () => {
    it("verifies SettingsTab and SettingsPageProps interfaces are constructible", () => {
      const sampleTab: SettingsTab = {
        id: "PROFILE",
        label: "Profile",
        shortLabel: "Prof",
        description: "Test description",
        badge: "Test Badge",
      };
      assert.equal(sampleTab.id, "PROFILE");
    });
  });
});
